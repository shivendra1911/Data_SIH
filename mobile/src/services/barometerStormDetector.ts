import { Barometer } from 'expo-sensors';

export type StormAlertSeverity = 'NORMAL' | 'SQUALL_WARNING' | 'CLOUDBURST_CRITICAL';

export interface StormAlert {
  severity: StormAlertSeverity;
  pressureDeltaHpa: number;
  currentPressureHpa: number;
  baselinePressureHpa: number;
  timeWindowHours: number;
  title: string;
  message: string;
  timestamp: number;
}

export interface BarometerSample {
  pressure: number;
  timestamp: number;
}

export interface StormDetectorCallbacks {
  onStormAlert?: (alert: StormAlert) => void;
  onPressureUpdate?: (currentHpa: number, delta3h: number, severity: StormAlertSeverity) => void;
}

class BarometerStormDetector {
  private subscription: any = null;
  private isMonitoring: boolean = false;
  private samples: BarometerSample[] = [];
  private callbacks: StormDetectorCallbacks = {};
  private currentAlertSeverity: StormAlertSeverity = 'NORMAL';
  private lastAlertTime: number = 0;

  /**
   * Start 3-Hour Sliding Window Barometric Pressure Monitoring
   */
  public async startMonitoring(callbacks?: StormDetectorCallbacks): Promise<boolean> {
    if (callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks };
    }
    if (this.isMonitoring) return true;

    try {
      const isAvail = await Barometer.isAvailableAsync().catch(() => false);
      if (!isAvail) {
        console.warn('[BarometerStormDetector] Barometer sensor not available on this device.');
        return false;
      }

      // Check barometric pressure every 10 seconds (ultra-low power)
      try { Barometer.setUpdateInterval(10000); } catch {}

      this.subscription = Barometer.addListener(({ pressure }) => {
        // pressure is reported in hectopascals (hPa) / millibars (mbar)
        this.processPressureSample(pressure);
      });

      this.isMonitoring = true;
      console.log('[BarometerStormDetector] In-Device Barometric Pressure Storm Sentinel ACTIVE');
      return true;
    } catch (e) {
      console.error('[BarometerStormDetector] Failed to start Barometer:', e);
      return false;
    }
  }

  public stopMonitoring() {
    if (this.subscription) {
      try { this.subscription.remove(); } catch {}
      this.subscription = null;
    }
    this.isMonitoring = false;
  }

  public setCallbacks(callbacks: StormDetectorCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getCurrentSeverity(): StormAlertSeverity {
    return this.currentAlertSeverity;
  }

  public getLatestPressure(): number | null {
    if (this.samples.length === 0) return null;
    return this.samples[this.samples.length - 1].pressure;
  }

  private processPressureSample(currentHpa: number) {
    const now = Date.now();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

    // Prune entries older than 3 hours
    this.samples = this.samples.filter((s) => now - s.timestamp <= THREE_HOURS_MS);
    this.samples.push({ pressure: currentHpa, timestamp: now });

    if (this.samples.length < 2) return;

    // Compute maximum pressure drop within the 3-hour window
    // delta_P = max(historic_P) - current_P
    let maxHistoric = this.samples[0].pressure;
    for (const s of this.samples) {
      if (s.pressure > maxHistoric) {
        maxHistoric = s.pressure;
      }
    }

    const deltaP = Number((maxHistoric - currentHpa).toFixed(2));
    let severity: StormAlertSeverity = 'NORMAL';

    if (deltaP >= 6.0) {
      severity = 'CLOUDBURST_CRITICAL';
    } else if (deltaP >= 3.0) {
      severity = 'SQUALL_WARNING';
    }

    this.currentAlertSeverity = severity;

    if (this.callbacks.onPressureUpdate) {
      this.callbacks.onPressureUpdate(currentHpa, deltaP, severity);
    }

    // Trigger alert if threshold crossed and at least 15 minutes since last alert
    if (severity !== 'NORMAL' && now - this.lastAlertTime > 15 * 60 * 1000) {
      this.lastAlertTime = now;
      const alert: StormAlert = {
        severity,
        pressureDeltaHpa: deltaP,
        currentPressureHpa: currentHpa,
        baselinePressureHpa: maxHistoric,
        timeWindowHours: 3,
        title: severity === 'CLOUDBURST_CRITICAL'
          ? '⛈️ RAPID CYCLONIC PRESSURE COLLAPSE'
          : '⚠️ SEVERE SQUALL / MONSOON DROP DETECTED',
        message: severity === 'CLOUDBURST_CRITICAL'
          ? `Atmospheric pressure dropped by ${deltaP} hPa in <=3h! Extreme cloudburst or cyclonic front imminent within 15km.`
          : `Atmospheric pressure dropped by ${deltaP} hPa in <=3h. Severe convective thunderstorm and heavy gusts approaching.`,
        timestamp: now,
      };

      if (this.callbacks.onStormAlert) {
        this.callbacks.onStormAlert(alert);
      }
    }
  }

  /**
   * Simulation / Testing hook for ADB
   */
  public simulatePressureDrop(dropHpa: number = 4.5) {
    const baseline = 1013.25;
    const now = Date.now();
    this.samples = [
      { pressure: baseline, timestamp: now - (2.5 * 60 * 60 * 1000) },
      { pressure: baseline - dropHpa, timestamp: now },
    ];
    this.processPressureSample(baseline - dropHpa);
  }
}

export const barometerStormDetector = new BarometerStormDetector();
