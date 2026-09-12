import { Accelerometer, Gyroscope } from 'expo-sensors';
import { Vibration } from 'react-native';
import * as Speech from 'expo-speech';

export interface MotionSafetyOptions {
  onMotionConfirmed: () => void;
  onMovementEnergy?: (energy: number) => void;
  requiredStrikes?: number;
  timeWindowMs?: number;
}

class MotionSafetyDetector {
  private accelSubscription: any = null;
  private gyroSubscription: any = null;
  private isMonitoring: boolean = false;
  private recentStrikes: number[] = [];
  private lastTriggerTime: number = 0;
  private currentGyroVelocity: number = 0;
  private callbacks: MotionSafetyOptions | null = null;

  /**
   * Start monitoring Accelerometer & Gyroscope for deliberate human motion/lifting.
   * Only active during emergency safety check to preserve battery.
   */
  public async startMonitoring(options: MotionSafetyOptions): Promise<boolean> {
    if (this.isMonitoring) {
      this.callbacks = options;
      return true;
    }

    this.callbacks = options;
    this.recentStrikes = [];

    try {
      const [accelAvailable, gyroAvailable] = await Promise.all([
        Accelerometer.isAvailableAsync().catch(() => false),
        Gyroscope.isAvailableAsync().catch(() => false),
      ]);

      if (!accelAvailable && !gyroAvailable) {
        console.warn('[MotionSafetyDetector] Neither Accelerometer nor Gyroscope available on this device.');
        return false;
      }

      // Set update intervals individually — may fail on web/emulator, that's fine
      try { Accelerometer.setUpdateInterval(100); } catch {}
      try { Gyroscope.setUpdateInterval(100); } catch {}

      // Attach Gyroscope listener independently — failure here won't break accelerometer
      if (gyroAvailable) {
        try {
          this.gyroSubscription = Gyroscope.addListener(({ x, y, z }) => {
            this.currentGyroVelocity = Math.sqrt(x * x + y * y + z * z);
          });
        } catch (gyroErr) {
          console.warn('[MotionSafetyDetector] Gyroscope unavailable on this device, falling back to accelerometer only:', gyroErr);
          this.gyroSubscription = null;
        }
      }

      // Attach Accelerometer listener independently — primary sensor
      if (accelAvailable) {
        try {
          this.accelSubscription = Accelerometer.addListener(({ x, y, z }) => {
            const rawMag = Math.sqrt(x * x + y * y + z * z);
            const deltaA = Math.abs(rawMag - 1.0);

            const energy = Math.min(1.0, deltaA * 0.7 + (this.currentGyroVelocity / 3.0) * 0.3);
            if (this.callbacks?.onMovementEnergy) {
              this.callbacks.onMovementEnergy(energy);
            }

            const isHumanMotion =
              (deltaA >= 0.42 && this.currentGyroVelocity >= 1.0) ||
              deltaA >= 0.75;

            if (isHumanMotion) {
              this.handleMotionStrike();
            }
          });
        } catch (accelErr) {
          console.warn('[MotionSafetyDetector] Accelerometer listener failed:', accelErr);
          this.accelSubscription = null;
        }
      }

      this.isMonitoring = true;
      console.log('[MotionSafetyDetector] Touch-Free Human Motion & Gyro Monitoring ACTIVE.');
      return true;
    } catch (err) {
      console.error('[MotionSafetyDetector] Error starting motion sensors:', err);
      return false;
    }
  }

  private handleMotionStrike() {
    const now = Date.now();

    // Prevent re-trigger within 10 seconds of an already confirmed safe gesture
    if (now - this.lastTriggerTime < 10000) return;

    const timeWindow = this.callbacks?.timeWindowMs || 1800; // 1.8 second window
    const requiredStrikes = this.callbacks?.requiredStrikes || 2; // 2 deliberate pulses

    // Prune expired strikes
    this.recentStrikes = this.recentStrikes.filter((t) => now - t <= timeWindow);
    this.recentStrikes.push(now);

    console.log('[MotionSafetyDetector] Motion strike registered: ' + this.recentStrikes.length + '/' + requiredStrikes);

    if (this.recentStrikes.length >= requiredStrikes) {
      this.lastTriggerTime = now;
      this.recentStrikes = [];

      console.log('[MotionSafetyDetector] 🎯 DELIBERATE HUMAN MOTION / LIFT CONFIRMED! Triggering Touch-Free Safety.');

      // 1. Double-pulse haptic vibration confirmation
      try {
        Vibration.vibrate([0, 150, 100, 250]);
      } catch {}

      // 2. Clear voice confirmation via Text-to-Speech
      try {
        Speech.stop();
        Speech.speak('Safety confirmed via device movement. Emergency command notified.', {
          language: 'en',
          pitch: 1.05,
          rate: 0.95,
        });
      } catch {}

      // 3. Fire safety confirmation callback
      if (this.callbacks?.onMotionConfirmed) {
        this.callbacks.onMotionConfirmed();
      }
    }
  }

  /**
   * Stop motion monitoring to conserve battery
   */
  public stopMonitoring() {
    if (!this.isMonitoring) return;

    if (this.accelSubscription) {
      this.accelSubscription.remove();
      this.accelSubscription = null;
    }
    if (this.gyroSubscription) {
      this.gyroSubscription.remove();
      this.gyroSubscription = null;
    }

    this.isMonitoring = false;
    this.callbacks = null;
    this.recentStrikes = [];
    console.log('[MotionSafetyDetector] Motion monitoring stopped.');
  }

  public getIsMonitoring(): boolean {
    return this.isMonitoring;
  }
}

export const motionSafetyDetector = new MotionSafetyDetector();
