import { setLowPowerBeaconMode } from './gattServerBridge';

export interface BatteryPreservationCallbacks {
  onLowPowerModeChanged?: (isLowPower: boolean, batteryLevel: number) => void;
  onWarningIssued?: (batteryLevel: number) => void;
}

class BatteryPreservationManager {
  private isLowPowerMode: boolean = false;
  private currentBatteryLevel: number = 100;
  private isCharging: boolean = false;
  private checkInterval: any = null;
  private callbacks: BatteryPreservationCallbacks = {};

  /**
   * Start Battery Level Monitoring (Checks every 60 seconds)
   */
  public startMonitoring(callbacks?: BatteryPreservationCallbacks) {
    if (callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks };
    }

    this.checkBatteryStatus();
    clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => {
      this.checkBatteryStatus();
    }, 60000);
  }

  public stopMonitoring() {
    clearInterval(this.checkInterval);
  }

  public setCallbacks(callbacks: BatteryPreservationCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getIsLowPowerMode(): boolean {
    return this.isLowPowerMode;
  }

  public getBatteryLevel(): number {
    return this.currentBatteryLevel;
  }

  /**
   * Check battery state and activate 100+ hour USAR beacon if <= 15%
   */
  private async checkBatteryStatus() {
    try {
      // In web or environments without expo-battery, simulate or use fallback
      let level = this.currentBatteryLevel;
      let charging = this.isCharging;

      // Check if navigator.getBattery is available (for web)
      if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
        try {
          const b = await (navigator as any).getBattery();
          level = Math.round(b.level * 100);
          charging = Boolean(b.charging);
        } catch {}
      }

      this.updateState(level, charging);
    } catch (e) {
      console.warn('[BatteryPreservationManager] Status check error:', e);
    }
  }

  public updateState(level: number, charging: boolean = false) {
    this.currentBatteryLevel = level;
    this.isCharging = charging;

    const shouldBeLowPower = level <= 15 && !charging;

    if (shouldBeLowPower && !this.isLowPowerMode) {
      this.isLowPowerMode = true;
      console.warn(`[BatteryPreservationManager] 🪫 CRITICAL BATTERY (${level}%): Entering Ultra-Low-Power USAR Beacon Mode (100+ hours).`);
      // Switch native Bluetooth advertising to raw 16-byte ultra-low power beacon
      setLowPowerBeaconMode(true).catch(() => {});

      if (this.callbacks.onLowPowerModeChanged) {
        this.callbacks.onLowPowerModeChanged(true, level);
      }
      if (this.callbacks.onWarningIssued) {
        this.callbacks.onWarningIssued(level);
      }
    } else if (!shouldBeLowPower && this.isLowPowerMode) {
      this.isLowPowerMode = false;
      console.log(`[BatteryPreservationManager] 🔋 Battery recovered (${level}%): Restoring full-mesh operational mode.`);
      setLowPowerBeaconMode(false).catch(() => {});

      if (this.callbacks.onLowPowerModeChanged) {
        this.callbacks.onLowPowerModeChanged(false, level);
      }
    }
  }

  /**
   * Simulation hook for ADB / testing
   */
  public simulateCriticalBattery(level: number = 12) {
    this.updateState(level, false);
  }

  public simulateBatteryRestored() {
    this.updateState(85, false);
  }
}

export const batteryPreservationManager = new BatteryPreservationManager();
