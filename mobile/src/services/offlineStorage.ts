import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOSPayload } from '../types';

const QUEUE_KEY = '@neernetra_sos_queue_v1';

export const saveSOSToOfflineQueue = async (payload: SOSPayload): Promise<void> => {
  try {
    const existingQueue = await getOfflineSOSQueue();
    // Add unique timestamp if missing
    const enrichedPayload: SOSPayload = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };
    existingQueue.push(enrichedPayload);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existingQueue));
    console.log('[OfflineStorage] SOS payload queued locally:', enrichedPayload.timestamp);
  } catch (error) {
    console.error('[OfflineStorage] Failed to save SOS to queue:', error);
  }
};

export const getOfflineSOSQueue = async (): Promise<SOSPayload[]> => {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    if (!data) return [];
    return JSON.parse(data) as SOSPayload[];
  } catch (error) {
    console.error('[OfflineStorage] Failed to read SOS queue:', error);
    return [];
  }
};

export const clearOfflineSOSQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
    console.log('[OfflineStorage] SOS Queue cleared after successful sync');
  } catch (error) {
    console.error('[OfflineStorage] Failed to clear SOS queue:', error);
  }
};
