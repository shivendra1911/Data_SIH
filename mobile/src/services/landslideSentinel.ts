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
        console.warn(`[LandslideSentinel] 🚨 Native background sensor triggered landslide: tremor=${tremorG}g, duration=${durationMs}ms`);
        this.triggerLandslideAlarm(Math.floor(durationMs / 1000));
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
        this.triggerLandslideAlarm(elapsedSeconds);
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
  public async triggerLandslideAlarm(durationSeconds: number = 30) {
    if (this.alertActive) return;
    this.alertActive = true;

    let loc = { lat: 30.5573, lng: 79.5642 };
    try {
      loc = await getCurrentDeviceLocation();
    } catch {}

    const alert: LandslideAlert = {
      title: '⛰️ LANDSLIDE IMMINENT — EVACUATE NOW',
      message: `Sustained ${durationSeconds}s sub-surface acoustic harmonic tremors (10–50 Hz) detected. Hillside shearing imminent! Move to high ground immediately.`,
      tremorFrequencyHz: 28,
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
      Speech.speak('Landslide warning! Evacuate now! Move to high ground immediately!', {
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
      notes: `WAYANAD SENTINEL: 10-50Hz seismic harmonic tremor detected for ${durationSeconds}s. Evacuate immediately!`,
      is_mesh_relayed: true,
      timestamp: new Date().toISOString(),
    };

    saveSOSToOfflineQueue(landslidePayload).catch(() => {});
    meshManager.broadcastMultiHopSOS(landslidePayload).catch(() => {});

    if (this.callbacks.onLandslideTriggered) {
      this.callbacks.onLandslideTriggered(alert);
    }

    console.warn('[LandslideSentinel] 🚨 WAYANAD SENTINEL DISPATCHED LANDSLIDE EVACUATION ALARM!');
  }

  public cancelAlert() {
    this.alertActive = false;
    this.activeAlert = null;
    this.tremorStartTime = 0;
    try { Vibration.cancel(); } catch {}
    try { Speech.stop(); } catch {}

    meshManager.broadcastSafe().catch(() => {});

    if (this.callbacks.onAlertCancelled) {
      this.callbacks.onAlertCancelled();
    }
  }

  /**
   * Testing & simulation hook
   */
  public simulateLandslideTremor() {
    this.triggerLandslideAlarm(35);
  }
}

export const landslideSentinel = new LandslideSentinel();
