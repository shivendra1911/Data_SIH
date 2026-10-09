import { Accelerometer, Gyroscope } from 'expo-sensors';
import { Vibration } from 'react-native';
import * as Speech from 'expo-speech';
import { meshManager } from './bluetoothMesh';
import { getCurrentDeviceLocation } from './locationService';
import { saveSOSToOfflineQueue } from './offlineStorage';

const CANDIDATE_URLS = [
  'http://127.0.0.1:8000',
  'http://localhost:8000',
  'http://10.0.2.2:8000',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
];

async function postCollapseApi(endpoint: string, bodyObj: any) {
  const jsonBody = JSON.stringify(bodyObj);
  for (const base of CANDIDATE_URLS) {
    try {
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${base}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonBody,
        signal: controller.signal,
      });
      clearTimeout(tId);
      if (res.ok) return res;
    } catch {}
  }
}

export type CollapsePhase = 'IDLE' | 'FREE_FALL' | 'IMPACT' | 'RUBBLE_STILLNESS' | 'COUNTDOWN_ACTIVE' | 'DISPATCHED';

export interface CollapseEventData {
  confidence: number;
  peakG: number;
  rubbleDurationMs: number;
  freeFallDurationMs: number;
  timestamp: number;
  location?: { lat: number; lng: number };
}

export interface PeerCollapseReport {
  deviceId: string;
  lat: number;
  lng: number;
  timestamp: number;
  peakG?: number;
}

export interface BuildingCollapseCallbacks {
  onPhaseChange?: (phase: CollapsePhase) => void;
  onCollapseTriggered?: (data: CollapseEventData) => void;
  onCountdownTick?: (secondsRemaining: number) => void;
  onAlarmCancelled?: () => void;
  onEmergencyDispatched?: (data: CollapseEventData) => void;
  onQuorumConfirmed?: (peerCount: number, peerIds: string[]) => void;
}

class BuildingCollapseDetector {
  private phase: CollapsePhase = 'IDLE';
  private accelSub: any = null;
  private gyroSub: any = null;
  private isMonitoring: boolean = false;

  // Kinetic state thresholds
  private freeFallStartTime: number = 0;
  private freeFallDurationMs: number = 0;
  private impactDetectedTime: number = 0;
  private peakG: number = 0;
  private stillnessStartTime: number = 0;
  private currentGyroOmega: number = 0;

  // 60-Second Inverted Countdown
  private countdownTimer: any = null;
  private secondsRemaining: number = 60;
  private lastTriggeredData: CollapseEventData | null = null;

  // Spatiotemporal Quorum Consensus (3+ phones within 100m and 15s)
  private recentPeerReports: PeerCollapseReport[] = [];

  // Callbacks
  private callbacks: BuildingCollapseCallbacks = {};

  /**
   * Start listening to high-frequency Accelerometer & Gyroscope
   */
  public async startMonitoring(callbacks?: BuildingCollapseCallbacks): Promise<boolean> {
    if (callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks };
    }
    if (this.isMonitoring) return true;

    try {
      const [accelAvail, gyroAvail] = await Promise.all([
        Accelerometer.isAvailableAsync().catch(() => false),
        Gyroscope.isAvailableAsync().catch(() => false),
      ]);

      if (!accelAvail) {
        console.warn('[CollapseDetector] Accelerometer unavailable on this hardware.');
        return false;
      }

      // 50Hz sampling for accurate free-fall (<0.35g >= 280ms) and shock impact
      try { Accelerometer.setUpdateInterval(20); } catch {}
      try { Gyroscope.setUpdateInterval(20); } catch {}

      if (gyroAvail) {
        try {
          this.gyroSub = Gyroscope.addListener(({ x, y, z }) => {
            // Angular velocity magnitude omega = sqrt(x^2 + y^2 + z^2) in rad/s
            this.currentGyroOmega = Math.sqrt(x * x + y * y + z * z);
          });
        } catch {
          this.gyroSub = null;
        }
      }

      this.accelSub = Accelerometer.addListener(({ x, y, z }) => {
        // Vector magnitude VM = sqrt(x^2 + y^2 + z^2) in g units (1.0g = earth baseline)
        const vm = Math.sqrt(x * x + y * y + z * z);
        this.processKineticSample(vm);
      });

      this.isMonitoring = true;
      console.log('[CollapseDetector] Structural Collapse Kinetic Sentinel ACTIVE (50Hz)');
      return true;
    } catch (e) {
      console.error('[CollapseDetector] Failed to start sensors:', e);
      return false;
    }
  }

  public stopMonitoring() {
    if (this.accelSub) {
      try { this.accelSub.remove(); } catch {}
      this.accelSub = null;
    }
    if (this.gyroSub) {
      try { this.gyroSub.remove(); } catch {}
      this.gyroSub = null;
    }
    this.isMonitoring = false;
    this.resetStateMachine('IDLE');
  }

  public setCallbacks(callbacks: BuildingCollapseCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getPhase(): CollapsePhase {
    return this.phase;
  }

  public getSecondsRemaining(): number {
    return this.secondsRemaining;
  }

  public getLastTriggeredData(): CollapseEventData | null {
    return this.lastTriggeredData;
  }

  /**
   * Core 3-Phase State Machine
   * Phase 1: Free-fall (VM < 0.35g for >= 280ms)
   * Phase 2: Impact shock (VM >= 3.5g within 2200ms)
   * Phase 3: Rubble stillness (|VM - 1.0g| < 0.08g AND omega < 0.15 rad/s for >= 8000ms)
   */
  private processKineticSample(vm: number) {
    if (this.phase === 'COUNTDOWN_ACTIVE' || this.phase === 'DISPATCHED') {
      return;
    }

    const now = Date.now();

    switch (this.phase) {
      case 'IDLE':
        // Check for Free-fall onset
        if (vm < 0.35) {
          this.phase = 'FREE_FALL';
          this.freeFallStartTime = now;
          this.emitPhaseChange();
        }
        break;

      case 'FREE_FALL':
        if (vm < 0.35) {
          this.freeFallDurationMs = now - this.freeFallStartTime;
          // Free fall ongoing
        } else {
          // Free fall ended - did it last >= 280ms?
          if (this.freeFallDurationMs >= 280) {
            // Free-fall qualified! Transition to expect Impact Spike
            this.phase = 'IMPACT';
            this.impactDetectedTime = now;
            this.peakG = vm;
            this.emitPhaseChange();
          } else {
            // False drop/normal motion, reset
            this.resetStateMachine('IDLE');
          }
        }
        break;

      case 'IMPACT':
        const timeSinceFreeFall = now - this.freeFallStartTime;
        if (vm > this.peakG) {
          this.peakG = vm;
        }

        // Did we hit shock impact >= 3.5g within 2200ms?
        if (this.peakG >= 3.5 && timeSinceFreeFall <= 2200) {
          // Impact confirmed, transition to Phase 3: Rubble Stillness
          this.phase = 'RUBBLE_STILLNESS';
          this.stillnessStartTime = now;
          this.emitPhaseChange();
        } else if (timeSinceFreeFall > 2200) {
          // Timeout without reaching 3.5g
          this.resetStateMachine('IDLE');
        }
        break;

      case 'RUBBLE_STILLNESS':
        const deltaFrom1G = Math.abs(vm - 1.0);
        const isStill = deltaFrom1G < 0.08 && this.currentGyroOmega < 0.15;

        if (isStill) {
          const stillnessDuration = now - this.stillnessStartTime;
          if (stillnessDuration >= 8000) {
            // All 3 physical phases verified! Trigger inverted 60-second safety triage
            this.triggerInvertedSafetyCountdown();
          }
        } else {
          // Heavy movement or continuous tumbling: reset stillness timer
          // If excessive motion persists (> 1.5g or omega > 1.0 rad/s), person is walking/moving safely
          if (deltaFrom1G > 0.4 || this.currentGyroOmega > 1.0) {
            this.resetStateMachine('IDLE');
          } else {
            this.stillnessStartTime = now;
          }
        }
        break;
    }
  }

  /**
   * Triggers the 60-second inverted safety confirmation modal and alarms
   */
  public async triggerInvertedSafetyCountdown(simulatedPeakG?: number) {
    if (this.phase === 'COUNTDOWN_ACTIVE' || this.phase === 'DISPATCHED') return;

    const peak = simulatedPeakG || Math.max(3.5, this.peakG);
    // Confidence formula: C = min(0.98, 0.70 + (Peak_g / 15.0))
    const confidence = Math.min(0.98, Number((0.70 + peak / 15.0).toFixed(3)));

    let coords = { lat: 30.5573, lng: 79.5642 };
    try {
      coords = await getCurrentDeviceLocation();
    } catch {}

    const eventData: CollapseEventData = {
      confidence,
      peakG: Number(peak.toFixed(2)),
      rubbleDurationMs: 8000,
      freeFallDurationMs: Math.max(280, this.freeFallDurationMs),
      timestamp: Date.now(),
      location: coords,
    };

    this.lastTriggeredData = eventData;
    this.phase = 'COUNTDOWN_ACTIVE';
    this.secondsRemaining = 60;
    this.emitPhaseChange();

    if (this.callbacks.onCollapseTriggered) {
      this.callbacks.onCollapseTriggered(eventData);
    }

    // Trigger SOS Haptic pulse: S.O.S (... --- ...)
    try {
      Vibration.vibrate([0, 400, 200, 400, 200, 400, 400, 900, 300, 900, 300, 900, 400, 400, 200, 400, 200, 400], true);
    } catch {}

    // Audible TTS alert
    try {
      Speech.speak('Possible building collapse detected. Confirm you are safe, or rescue will be dispatched in sixty seconds.', {
        rate: 1.0,
        pitch: 1.0,
      });
    } catch {}

    // Start 60-second countdown interval
    clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      this.secondsRemaining -= 1;
      if (this.callbacks.onCountdownTick) {
        this.callbacks.onCountdownTick(this.secondsRemaining);
      }

      if (this.secondsRemaining <= 0) {
        clearInterval(this.countdownTimer);
        this.autoDispatchRescue();
      }
    }, 1000);
  }

  /**
   * User confirms "I AM SAFE": Immediately cancels alarm, sends cancellation to cloud,
   * broadcasts SAFE on mesh, and resets.
   */
  public async confirmUserSafe(): Promise<void> {
    clearInterval(this.countdownTimer);
    try { Vibration.cancel(); } catch {}
    try { Speech.stop(); } catch {}

    const deviceId = meshManager.getMyDeviceId();
    const loc = this.lastTriggeredData?.location;

    // 1. Broadcast "I AM SAFE" across offline BLE mesh
    meshManager.broadcastSafe().catch(() => {});

    // 2. Transmit cancellation to Backend API
    postCollapseApi('/api/collapse/cancel', {
      device_uuid: deviceId,
      lat: loc?.lat,
      lng: loc?.lng,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    if (this.callbacks.onAlarmCancelled) {
      this.callbacks.onAlarmCancelled();
    }

    this.resetStateMachine('IDLE');
    console.log('[CollapseDetector] User verified SAFE. Alarm disarmed and cancelled.');
  }

  /**
   * 60s Expires or User taps "I NEED HELP": Auto-dispatches COLLAPSE_SOS
   */
  public async autoDispatchRescue(): Promise<void> {
    clearInterval(this.countdownTimer);
    try { Vibration.cancel(); } catch {}
    this.phase = 'DISPATCHED';
    this.emitPhaseChange();

    const deviceId = meshManager.getMyDeviceId();
    const loc = this.lastTriggeredData?.location || { lat: 30.5573, lng: 79.5642 };
    const peak = this.lastTriggeredData?.peakG || 4.2;
    const conf = this.lastTriggeredData?.confidence || 0.92;

    const collapsePayload = {
      device_uuid: deviceId,
      lat: loc.lat,
      lng: loc.lng,
      status: 'SOS' as const,
      sos_type: 'COLLAPSE' as any,
      notes: `AUTO-COLLAPSE TRIGGER: Peak ${peak}g, Conf ${Math.round(conf * 100)}%, Trapped under rubble.`,
      is_mesh_relayed: true,
      timestamp: new Date().toISOString(),
    };

    // 1. Save locally to offline queue
    await saveSOSToOfflineQueue(collapsePayload).catch(() => {});

    // 2. Broadcast via BLE Mesh across all 32 hops
    meshManager.broadcastMultiHopSOS(collapsePayload).catch(() => {});

    // 3. Post to backend collapse cluster API
    postCollapseApi('/api/collapse/event', {
      device_uuid: deviceId,
      lat: loc.lat,
      lng: loc.lng,
      confidence: conf,
      peak_g: peak,
      rubble_duration_s: 8.0,
      timestamp: new Date().toISOString(),
      notes: collapsePayload.notes,
    }).catch(() => {});

    if (this.callbacks.onEmergencyDispatched && this.lastTriggeredData) {
      this.callbacks.onEmergencyDispatched(this.lastTriggeredData);
    }

    console.warn('[CollapseDetector] 🚨 DISPATCHED AUTONOMOUS STRUCTURAL COLLAPSE SOS!');
  }

  /**
   * Quorum Consensus: Ingest peer collapse reports from mesh
   * If >= 3 phones report within 100m and 15 seconds, quorum is reached.
   */
  public handlePeerCollapseReport(report: PeerCollapseReport) {
    const now = Date.now();
    // Prune reports older than 15 seconds
    this.recentPeerReports = this.recentPeerReports.filter((r) => now - r.timestamp <= 15000);
    this.recentPeerReports.push(report);

    // Compute spatial clustering: find peers within 100m
    const cluster = this.recentPeerReports.filter((r) => {
      const distM = this.haversineMeters(report.lat, report.lng, r.lat, r.lng);
      return distM <= 100;
    });

    // Unique devices
    const uniqueIds = Array.from(new Set(cluster.map((c) => c.deviceId)));
    if (uniqueIds.length >= 3) {
      console.warn(`[CollapseDetector] 🏛️ MESH QUORUM CONSENSUS REACHED: ${uniqueIds.length} phones confirmed collapse!`);
      if (this.callbacks.onQuorumConfirmed) {
        this.callbacks.onQuorumConfirmed(uniqueIds.length, uniqueIds);
      }
    }
  }

  /**
   * ADB / Testing Simulator Hook
   */
  public simulateCollapseEvent(peakG: number = 4.8) {
    this.peakG = peakG;
    this.freeFallDurationMs = 350;
    this.triggerInvertedSafetyCountdown(peakG);
  }

  public simulateQuorumConsensus(peerCount: number = 3, peakG: number = 4.8) {
    this.peakG = peakG;
    this.freeFallDurationMs = 350;
    const now = Date.now();
    this.recentPeerReports = [
      { deviceId: 'NODE_ALPHA', lat: 30.5573, lng: 79.5642, timestamp: now - 1000, peakG: 4.5 },
      { deviceId: 'NODE_BETA', lat: 30.5574, lng: 79.5643, timestamp: now - 2000, peakG: 4.2 },
      { deviceId: 'NODE_GAMMA', lat: 30.5572, lng: 79.5641, timestamp: now - 500, peakG: 4.9 },
    ];
    if (this.callbacks.onQuorumConfirmed) {
      this.callbacks.onQuorumConfirmed(peerCount, ['NODE_ALPHA', 'NODE_BETA', 'NODE_GAMMA']);
    }
    this.triggerInvertedSafetyCountdown(peakG);
  }

  private resetStateMachine(targetPhase: CollapsePhase = 'IDLE') {
    this.phase = targetPhase;
    this.freeFallStartTime = 0;
    this.freeFallDurationMs = 0;
    this.impactDetectedTime = 0;
    this.peakG = 0;
    this.stillnessStartTime = 0;
    clearInterval(this.countdownTimer);
    this.emitPhaseChange();
  }

  private emitPhaseChange() {
    if (this.callbacks.onPhaseChange) {
      this.callbacks.onPhaseChange(this.phase);
    }
  }

  private haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const buildingCollapseDetector = new BuildingCollapseDetector();
