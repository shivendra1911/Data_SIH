import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendSOSPayload } from './api';
import { meshEngine } from './bluetoothMesh';
import { getLastKnownLocation } from './locationTracker';
import { triggerEmergencyVoiceAudio, stopEmergencyVoiceAudio } from './emergencyVoice';
import { motionSafetyDetector } from './motionSafetyDetector';

const SAFE_CONFIRMED_KEY = '@neernetra_safe_confirmed_v1';
const DANGER_TIMER_KEY = '@neernetra_danger_timer_start_v1';

let countdownInterval: any = null;

export const markUserAsSafeConfirmed = async (deviceUuid: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(SAFE_CONFIRMED_KEY, new Date().toISOString());
    await AsyncStorage.removeItem(DANGER_TIMER_KEY);
    stopDangerTimer();
    console.log('[DangerEscalation] Citizen confirmed SAFE. Automatic danger escalation cancelled.');
  } catch (err) {
    console.error('[DangerEscalation] Error saving safe status:', err);
  }
};

export const isUserSafeConfirmed = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(SAFE_CONFIRMED_KEY);
    if (!data) return false;
    // Safe confirmation valid for 6 hours
    const confirmedTime = new Date(data).getTime();
    const now = new Date().getTime();
    return now - confirmedTime < 6 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

export const startRedZoneDangerTimer = async (
  deviceUuid: string,
  timeoutSeconds: number = 300, // 5-minute timeout
  onTick?: (remainingSeconds: number) => void,
  onAutoEscalate?: () => void,
  onMotionSafeConfirmed?: () => void,
  force: boolean = false
) => {
  if (!force) {
    const isSafe = await isUserSafeConfirmed();
    if (isSafe) {
      console.log('[DangerEscalation] User already confirmed SAFE. Skipping danger countdown.');
      return;
    }
  } else {
    // Clear prior safe confirmation when force triggered by Command Siren
    await AsyncStorage.removeItem(SAFE_CONFIRMED_KEY);
  }

  // Trigger loud audio immediately when Red Zone is detected!
  triggerEmergencyVoiceAudio();

  // Start touch-free motion & gyroscope monitoring for damaged/submerged screens
  motionSafetyDetector.startMonitoring({
    onMotionConfirmed: async () => {
      console.log('[DangerEscalation] Motion safety detector triggered touch-free safe confirmation!');
      await markUserAsSafeConfirmed(deviceUuid);
      if (onMotionSafeConfirmed) {
        onMotionSafeConfirmed();
      }
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

      console.warn('[DangerEscalation] 🚨 5-MINUTE UNRESPONSIVE TIMEOUT ELAPSED! Escalating to CRITICAL DANGER SOS!');

      // Get last known location
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
        notes: 'AUTOMATIC DANGER ESCALATION: Citizen unresponsive after 5 min RED ZONE alert.',
        timestamp: new Date().toISOString(),
      };

      // Broadcast over BLE Mesh & direct HTTP
      await meshEngine.broadcastMultiHopSOS(autoSosPayload);
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
  stopEmergencyVoiceAudio();
  motionSafetyDetector.stopMonitoring();
};
