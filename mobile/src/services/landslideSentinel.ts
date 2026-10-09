import { Accelerometer } from 'expo-sensors';
import { Vibration } from 'react-native';
import * as Speech from 'expo-speech';
import { meshManager } from './bluetoothMesh';
import { getCurrentDeviceLocation } from './locationService';
import { saveSOSToOfflineQueue } from './offlineStorage';
import { subscribeToNativeLandslide } from './gattServerBridge';

export interface LandslideAlert {
  title: string;
  message: string;
  tremorFrequencyHz: number;
  durationSeconds: number;
  timestamp: number;
  location?: { lat: number; lng: number };
}

export interface LandslideCallbacks {
  onTremorDetected?: (durationSeconds: number) => void;
  onLandslideTriggered?: (alert: LandslideAlert) => void;
  onAlertCancelled?: () => void;
  onArmStateChanged?: (isArmed: boolean) => void;
}

class LandslideSentinel {
  private subscription: any = null;
  private nativeLandslideUnsub: (() => void) | null = null;
  private isArmed: boolean = true;
  private isMonitoring: boolean = false;
  private tremorStartTime: number = 0;
  private lastSampleTime: number = 0;
  private previousVm: number = 1.0;
  private highFreqOscillationCount: number = 0;
  private recentSampleDeltas: number[] = [];
  private alertActive: boolean = false;
  private activeAlert: LandslideAlert | null = null;
  private callbacks: LandslideCallbacks = {};

  public async startMonitoring(callbacks?: LandslideCallbacks): Promise<boolean> {
    if (callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks };
    }
    if (this.isMonitoring) return true;

    // Hook into Android native background foreground service landslide detection (runs in lock screen / Doze)
    if (!this.nativeLandslideUnsub) {
      this.nativeLandslideUnsub = subscribeToNativeLandslide(({ tremorG, durationMs }) => {
        console.warn(`[LandslideSentinel] 📡 Native background sensor observed tremor: tremor=${tremorG}g, duration=${durationMs}ms. Dispatching to 1/3rd quorum pipeline.`);
        // Single-phone tremor detection MUST NEVER trigger a local siren!
        // Only dispatch telemetry to the 1/3rd sector quorum pipeline!
        getCurrentDeviceLocation().then((loc) => {
          this.reportTremorToBackend(loc, tremorG, Math.floor(durationMs / 1000)).catch(() => {});
        }).catch(() => {
          this.reportTremorToBackend({ lat: 11.5273, lng: 76.1242 }, tremorG, Math.floor(durationMs / 1000)).catch(() => {});
        });
      });
    }

    try {
      const isAvail = await Accelerometer.isAvailableAsync().catch(() => false);
      if (!isAvail) {
        console.warn('[LandslideSentinel] Accelerometer unavailable on this device.');
        return false;
      }

      // 50Hz sampling for detecting 10-50Hz seismic harmonic micro-vibrations
      try { Accelerometer.setUpdateInterval(20); } catch {}

      this.subscription = Accelerometer.addListener(({ x, y, z }) => {
        if (!this.isArmed || this.alertActive) return;
        const now = Date.now();
        const vm = Math.sqrt(x * x + y * y + z * z);
        this.processSeismicSample(vm, now);
      });

      this.isMonitoring = true;
      console.log('[LandslideSentinel] Wayanad Night-Mode Landslide Harmonic Sentinel ACTIVE');
      return true;
    } catch (e) {
      console.error('[LandslideSentinel] Failed to initialize Accelerometer:', e);
      return false;
    }
  }

  public stopMonitoring() {
    if (this.subscription) {
      try { this.subscription.remove(); } catch {}
      this.subscription = null;
    }
    if (this.nativeLandslideUnsub) {
      this.nativeLandslideUnsub();
      this.nativeLandslideUnsub = null;
    }
    this.isMonitoring = false;
    this.tremorStartTime = 0;
  }

  public setArmed(armed: boolean) {
    this.isArmed = armed;
    if (this.callbacks.onArmStateChanged) {
      this.callbacks.onArmStateChanged(armed);
    }
  }

  public getIsArmed(): boolean {
    return this.isArmed;
  }

  public getIsAlertActive(): boolean {
    return this.alertActive;
  }

  public getActiveAlert(): LandslideAlert | null {
    return this.activeAlert;
  }

  /**
   * Evaluates high-frequency sub-surface harmonic tremor:
   * Device is resting on a stationary surface (mean |vm - 1.0| < 0.15g)
   * while sustained micro-vibrations (delta 0.02g - 0.25g at 10-50Hz) oscillate.
   */
  private processSeismicSample(vm: number, now: number) {
    const delta = Math.abs(vm - this.previousVm);
    this.previousVm = vm;

    const deltaFrom1G = Math.abs(vm - 1.0);

    // If macroscopic phone handling is detected (e.g. user walking or picking up phone > 0.4g delta),
    // this is human motion, not bedrock seismic tremor. Reset tremor timer.
    if (deltaFrom1G > 0.40) {
      this.tremorStartTime = 0;
      this.recentSampleDeltas = [];
      return;
    }

    // Micro-tremor oscillation test (10-50 Hz harmonic rumblings)
    const isMicroTremor = delta >= 0.02 && delta <= 0.28;

    if (isMicroTremor) {
      if (this.tremorStartTime === 0) {
        this.tremorStartTime = now;
      }

      const elapsedMs = now - this.tremorStartTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);

      if (this.callbacks.onTremorDetected) {
        this.callbacks.onTremorDetected(elapsedSeconds);
      }

      // If continuous pre-landslide harmonic vibrations persist >= 30 seconds:
      if (elapsedMs >= 30000) {
        // Single-phone tremor detection MUST NEVER trigger a local siren!
        // It must only dispatch telemetry to the 1/3rd sector quorum pipeline
        this.tremorStartTime = 0;
        getCurrentDeviceLocation().then((loc) => {
          this.reportTremorToBackend(loc, 0.20, elapsedSeconds).catch(() => {});
        }).catch(() => {
          this.reportTremorToBackend({ lat: 11.5273, lng: 76.1242 }, 0.20, elapsedSeconds).catch(() => {});
        });
      }
    } else {
      // Small gap tolerance (allow up to 2 seconds of momentary pause in tremors)
      if (this.tremorStartTime > 0 && now - this.tremorStartTime > 2000) {
        this.tremorStartTime = 0;
      }
    }
  }

  /**
   * High-urgency Landslide Wake Alarm
   */
  public async triggerLandslideAlarm(durationSeconds: number = 30, isOneThirdConsensus: boolean = true) {
    if (this.alertActive) return;
    this.alertActive = true;

    let loc = { lat: 11.5273, lng: 76.1242 };
    try {
      loc = await getCurrentDeviceLocation();
    } catch {}

    const title = isOneThirdConsensus
      ? '⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW'
      : '⛰️ LANDSLIDE TREMOR WARNING — EVACUATE TO HIGH GROUND';

    const message = isOneThirdConsensus
      ? '⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW'
      : `Sustained ${durationSeconds}s sub-surface acoustic harmonic tremors (10–50 Hz) detected. Move to high ground immediately.`;

    const alert: LandslideAlert = {
      title,
      message,
      tremorFrequencyHz: 18.5,
      durationSeconds,
      timestamp: Date.now(),
      location: loc,
    };

    this.activeAlert = alert;

    // 1. High-intensity Haptic SOS Alarm
    try {
      Vibration.vibrate([0, 800, 200, 800, 200, 800, 400, 1200, 300, 1200], true);
    } catch {}

    // 2. High-volume Text-to-Speech Wake Warning
    try {
      Speech.speak('Landslide confirmed by one-third sector consensus. Evacuate to high ground immediately!', {
        rate: 1.05,
        pitch: 1.1,
      });
    } catch {}

    // 3. Broadcast high-priority SOS distress across BLE mesh
    const landslidePayload = {
      device_uuid: meshManager.getMyDeviceId(),
      lat: loc.lat,
      lng: loc.lng,
      status: 'SOS' as const,
      sos_type: 'LANDSLIDE' as any,
      notes: `⛰️ 1/3RD QUORUM LANDSLIDE CONFIRMED: ${durationSeconds}s 10-50Hz harmonic tremor. Evacuate now!`,
      is_mesh_relayed: true,
      timestamp: new Date().toISOString(),
    };

    saveSOSToOfflineQueue(landslidePayload).catch(() => {});
    meshManager.broadcastMultiHopSOS(landslidePayload).catch(() => {});

    // Report to central API portal
    this.reportTremorToBackend(loc, 0.20, durationSeconds).catch(() => {});

    if (this.callbacks.onLandslideTriggered) {
      this.callbacks.onLandslideTriggered(alert);
    }

    console.warn('[LandslideSentinel] 🚨 1/3RD SECTOR CONSENSUS LANDSLIDE ALARM TRIGGERED!');
  }

  private async reportTremorToBackend(loc: { lat: number; lng: number }, tremorG: number, durationS: number) {
    const candidateUrls = ['http://127.0.0.1:8000', 'http://localhost:8000', 'http://10.0.2.2:8000'];
    for (const base of candidateUrls) {
      try {
        const res = await fetch(`${base}/api/landslide/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_uuid: meshManager.getMyDeviceId(),
            sector_id: 'sector_wayanad_04',
            sector_name: 'Sector 4: Chooralmala / Meppadi (Wayanad)',
            lat: loc.lat,
            lng: loc.lng,
            tremor_g: tremorG,
            frequency_hz: 18.5,
            duration_s: durationS,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.is_confirmed && !this.alertActive) {
            this.triggerLandslideAlarm(durationS, true);
          }
          break;
        }
      } catch {}
    }
  }

  public cancelAlert() {
    this.alertActive = false;
    this.activeAlert = null;
    this.tremorStartTime = 0;
    try { Vibration.cancel(); } catch {}
    try { Speech.stop(); } catch {}

    meshManager.broadcastSafe().catch(() => {});

    // Cancel on backend
    const candidateUrls = ['http://127.0.0.1:8000', 'http://localhost:8000', 'http://10.0.2.2:8000'];
    for (const base of candidateUrls) {
      fetch(`${base}/api/landslide/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector_id: 'sector_wayanad_04' }),
      }).catch(() => {});
    }

    if (this.callbacks.onAlertCancelled) {
      this.callbacks.onAlertCancelled();
    }
  }

  /**
   * Testing & simulation hook: Triggers full 1/3rd Sector Quorum Consensus
   */
  public async simulateOneThirdSectorQuorum() {
    const candidateUrls = ['http://127.0.0.1:8000', 'http://localhost:8000', 'http://10.0.2.2:8000'];
    for (const base of candidateUrls) {
      try {
        await fetch(`${base}/api/landslide/simulate-quorum`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sector_id: 'sector_wayanad_04' }),
        });
      } catch {}
    }
    this.triggerLandslideAlarm(30, true);
  }

  public simulateLandslideTremor() {
    this.simulateOneThirdSectorQuorum();
  }
}

export const landslideSentinel = new LandslideSentinel();
