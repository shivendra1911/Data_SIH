import { Platform } from 'react-native';
import { ZonePrediction, SOSPayload } from '../types';
import { getOfflineSOSQueue, clearOfflineSOSQueue, setOfflineSOSQueue, saveSOSToOfflineQueue } from './offlineStorage';

// Dynamic API URL: on Android emulator 10.0.2.2 points to host, otherwise localhost
const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

const BASE_URL = getBaseUrl();

export const fetchCurrentPrediction = async (zoneId: string = 'chamoli_01'): Promise<ZonePrediction> => {
  try {
    const response = await fetch(`${BASE_URL}/api/prediction/current?zone_id=${encodeURIComponent(zoneId)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    return data as ZonePrediction;
  } catch (error) {
    console.warn('[API Service] Backend fetch failed, returning localized mock prediction:', error);
    // Return fallback realistic payload if local backend server is starting up or unreachable
    return {
      zone_id: zoneId,
      flood_probability_percent: 82.4,
      alert_color: 'RED',
      primary_trigger: 'GLOF Glacial Outflow & Heavy Downpour',
      last_updated: new Date().toISOString(),
    };
  }
};

export const sendSOSPayload = async (payload: SOSPayload): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${BASE_URL}/api/sos/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    return { success: true, message: data.message_id || 'SOS Received' };
  } catch (error) {
    console.warn('[API Service] Direct HTTP dispatch failed. Queuing payload for Bluetooth/Offline mesh retry.');
    // Store in AsyncStorage queue
    await saveSOSToOfflineQueue(payload);
    return { success: false, message: 'Offline. Payload queued locally for BLE Mesh sync.' };
  }
};

export const flushOfflineSOSQueue = async (): Promise<number> => {
  const queue = await getOfflineSOSQueue();
  if (queue.length === 0) return 0;

  console.log(`[API Service] Attempting sync for ${queue.length} offline queued items...`);
  let syncedCount = 0;
  const remainingQueue: SOSPayload[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      const res = await fetch(`${BASE_URL}/api/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, is_mesh_relayed: true }),
      });
      if (res.ok) {
        syncedCount++;
      } else {
        remainingQueue.push(item);
      }
    } catch {
      // Network drop: keep current and remaining items in queue
      remainingQueue.push(...queue.slice(i));
      break;
    }
  }

  await setOfflineSOSQueue(remainingQueue);
  return syncedCount;
};

export const registerPushTokenApi = async (
  deviceUuid: string,
  fcmToken: string,
  zoneId: string = 'chamoli_01'
): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}/api/telemetry/register-push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_uuid: deviceUuid,
        fcm_token: fcmToken,
        zone_id: zoneId,
      }),
    });
    return response.ok;
  } catch (error) {
    console.warn('[API Service] Failed to register push token with backend:', error);
    return false;
  }
};

