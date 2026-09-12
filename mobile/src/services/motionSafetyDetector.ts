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

      // 100ms interval (10Hz) is optimal for human gesture detection with minimal battery impact
      Accelerometer.setUpdateInterval(100);
      Gyroscope.setUpdateInterval(100);

      if (gyroAvailable) {
        this.gyroSubscription = Gyroscope.addListener(({ x, y, z }) => {
          // Angular velocity magnitude in rad/s
          this.currentGyroVelocity = Math.sqrt(x * x + y * y + z * z);
        });
      }

      if (accelAvailable) {
        this.accelSubscription = Accelerometer.addListener(({ x, y, z }) => {
          // Linear acceleration magnitude in g
          const rawMag = Math.sqrt(x * x + y * y + z * z);
          // Delta acceleration subtracting 1.0g baseline gravity
          const deltaA = Math.abs(rawMag - 1.0);

          // Combined energy metric (normalized 0 to 1)
          const energy = Math.min(1.0, deltaA * 0.7 + (this.currentGyroVelocity / 3.0) * 0.3);
          if (this.callbacks?.onMovementEnergy) {
            this.callbacks.onMovementEnergy(energy);
          }

          // Human deliberate motion threshold:
          // Either significant dynamic acceleration + rotational wrist tilt
          // OR a decisive shake/lift pulse
          const isHumanMotion =
            (deltaA >= 0.42 && this.currentGyroVelocity >= 1.0) ||
            deltaA >= 0.75;

          if (isHumanMotion) {
            this.handleMotionStrike();
          }
        });
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
