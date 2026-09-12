import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendSOSPayload } from './api';
import { meshEngine } from './bluetoothMesh';
import { getLastKnownLocation } from './locationTracker';
import { triggerEmergencyVoiceAudio, stopEmergencyVoiceAudio } from './emergencyVoice';
import { motionSafetyDetector } from './motionSafetyDetector';

const SAFE_CONFIRMED_KEY = '@neernetra_safe_confirmed_v1';
const DANGER_TIMER_KEY = '@neernetra_danger_timer_start_v1';

let countdownInterval: any = null;
let recurringCheckTimeout: any = null;

export const markUserAsSafeConfirmed = async (deviceUuid: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(SAFE_CONFIRMED_KEY, new Date().toISOString());
    await AsyncStorage.removeItem(DANGER_TIMER_KEY);
    stopDangerTimer();
    console.log('[DangerEscalation] Citizen confirmed SAFE ("YES I AM OKAY"). Next safety check in 1 minute.');
  } catch (err) {
    console.error('[DangerEscalation] Error saving safe status:', err);
  }
};

export const isUserSafeConfirmed = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(SAFE_CONFIRMED_KEY);
    if (!data) return false;
    // Safe confirmation valid for 60 seconds during active disaster check
    const confirmedTime = new Date(data).getTime();
    const now = new Date().getTime();
    return now - confirmedTime < 60 * 1000;
  } catch {
    return false;
  }
};

export const startRedZoneDangerTimer = async (
  deviceUuid: string,
  timeoutSeconds: number = 60, // 1-minute (60 seconds) recurring safety check
  onTick?: (remainingSeconds: number) => void,
  onAutoEscalate?: () => void,
  onMotionSafeConfirmed?: () => void,
  force: boolean = false
) => {
  if (!force) {
    const isSafe = await isUserSafeConfirmed();
    if (isSafe) {
      console.log('[DangerEscalation] User recently confirmed SAFE. Scheduling next 1-minute check.');
      if (recurringCheckTimeout) clearTimeout(recurringCheckTimeout);
      recurringCheckTimeout = setTimeout(() => {
        startRedZoneDangerTimer(deviceUuid, 60, onTick, onAutoEscalate, onMotionSafeConfirmed, true);
      }, 60000);
      return;
    }
  } else {
    await AsyncStorage.removeItem(SAFE_CONFIRMED_KEY);
  }

  // Trigger audio cue when Red Zone check activates
  triggerEmergencyVoiceAudio();

  // Start touch-free motion & gyroscope monitoring
  motionSafetyDetector.startMonitoring({
    onMotionConfirmed: async () => {
      console.log('[DangerEscalation] Gyro/Motion sensor detected device move/shake — Auto-confirming "YES, I AM OKAY"!');
      await markUserAsSafeConfirmed(deviceUuid);
      if (onMotionSafeConfirmed) {
        onMotionSafeConfirmed();
      }
      // Re-schedule next check after 60 seconds if danger continues
      if (recurringCheckTimeout) clearTimeout(recurringCheckTimeout);
      recurringCheckTimeout = setTimeout(() => {
        startRedZoneDangerTimer(deviceUuid, 60, onTick, onAutoEscalate, onMotionSafeConfirmed, true);
      }, 60000);
    },
  });

  let startTime = Date.now();
  await AsyncStorage.setItem(DANGER_TIMER_KEY, startTime.toString());

  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(async () => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const remaining = timeoutSeconds - elapsedSeconds;

    if (onTick) onTick(Math.max(0, remaining));

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;

      console.warn('[DangerEscalation] 🚨 1-MINUTE UNRESPONSIVE TIMEOUT ELAPSED! Escalating to CRITICAL DANGER SOS!');

      const lastLoc = await getLastKnownLocation();
      const lat = lastLoc ? lastLoc.lat : 27.6015;
      const lng = lastLoc ? lastLoc.lng : 77.5975;

      const autoSosPayload = {
        device_uuid: deviceUuid,
        lat,
        lng,
        status: 'SOS' as const,
        sos_type: 'TRAPPED' as const,
        is_mesh_relayed: true,
        notes: 'AUTOMATIC DANGER ESCALATION: Citizen unresponsive after 1-min RED ZONE safety check.',
        timestamp: new Date().toISOString(),
      };

      try {
        await (meshEngine as any).broadcastSOS(autoSosPayload);
      } catch {}
      await sendSOSPayload(autoSosPayload);

      if (onAutoEscalate) onAutoEscalate();
    }
  }, 1000);
};

export const stopDangerTimer = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (recurringCheckTimeout) {
    clearTimeout(recurringCheckTimeout);
    recurringCheckTimeout = null;
  }
  stopEmergencyVoiceAudio();
  motionSafetyDetector.stopMonitoring();
};
