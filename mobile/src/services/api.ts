import { Platform } from 'react-native';
import { ZonePrediction, SOSPayload } from '../types';
import { getOfflineSOSQueue, clearOfflineSOSQueue, setOfflineSOSQueue, saveSOSToOfflineQueue } from './offlineStorage';

// Dynamic API URL: environment override -> deployed live Vercel cloud backend
const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Live Cloud Command Center on Vercel (connects any APK on 4G, 5G, or Wi-Fi)
  return 'https://data-sih.vercel.app';
};

const BASE_URL = getBaseUrl();

export const fetchCurrentPrediction = async (zoneId: string = 'chamoli_01'): Promise<ZonePrediction> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(`${BASE_URL}/api/prediction/current?zone_id=${encodeURIComponent(zoneId)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    return data as ZonePrediction;
  } catch (error) {
    console.warn('[API Service] Backend fetch unreachable, maintaining offline safe baseline:', error);
    // Return offline safe baseline (avoids false-alarm sirens when out of range)
    return {
      zone_id: zoneId,
      flood_probability_percent: 0.0,
      alert_color: 'SAFE',
      primary_trigger: 'Offline Mesh Node (Awaiting Telemetry)',
      last_updated: new Date().toISOString(),
    };
  }
};

export const sendSOSPayload = async (payload: SOSPayload): Promise<{ success: boolean; message: string }> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(`${BASE_URL}/api/sos/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

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

let isFlushingQueue = false;

export const flushOfflineSOSQueue = async (): Promise<number> => {
  if (isFlushingQueue) return 0;
  isFlushingQueue = true;

  try {
    const queue = await getOfflineSOSQueue();
    if (queue.length === 0) return 0;

    console.log(`[API Service] Attempting sync for ${queue.length} offline queued items...`);
    let syncedCount = 0;
    const syncedIndices = new Set<number>();

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`${BASE_URL}/api/sos/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, is_mesh_relayed: true }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          syncedCount++;
          syncedIndices.add(i);
        }
      } catch {
        // Network drop: stop processing current batch
        break;
      }
    }

    // Read current queue again to avoid dropping items queued during async flush
    const latestQueue = await getOfflineSOSQueue();
    const remainingQueue = latestQueue.filter((_, idx) => !syncedIndices.has(idx));
    await setOfflineSOSQueue(remainingQueue);

    return syncedCount;
  } finally {
    isFlushingQueue = false;
  }
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

