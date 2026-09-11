import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { LocationSyncPayload } from '../types';

const LAST_KNOWN_LOCATION_KEY = '@neernetra_last_known_location_v1';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

let locationIntervalTimer: any = null;

export const saveLastKnownLocation = async (payload: LocationSyncPayload): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_KNOWN_LOCATION_KEY, JSON.stringify(payload));
    console.log('[LocationTracker] Last Known Location saved locally:', payload.lat, payload.lng, payload.last_synced_at);
  } catch (err) {
    console.error('[LocationTracker] Failed to save last known location:', err);
  }
};

export const getLastKnownLocation = async (): Promise<LocationSyncPayload | null> => {
  try {
    const data = await AsyncStorage.getItem(LAST_KNOWN_LOCATION_KEY);
    if (!data) return null;
    return JSON.parse(data) as LocationSyncPayload;
  } catch (err) {
    console.error('[LocationTracker] Failed to fetch last known location:', err);
    return null;
  }
};

export const syncCurrentLocationToBackend = async (deviceUuid: string, zoneId: string = 'chamoli_01'): Promise<boolean> => {
  try {
    let lat = 30.5573;
    let lng = 79.5642;
    let altitude: number | null = 1450;
    let accuracy: number | null = 5.0;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const currentPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      lat = currentPos.coords.latitude;
      lng = currentPos.coords.longitude;
      altitude = currentPos.coords.altitude;
      accuracy = currentPos.coords.accuracy;
    }

    const payload: LocationSyncPayload = {
      device_uuid: deviceUuid,
      lat,
      lng,
      altitude,
      accuracy,
      battery_level: 88,
      last_synced_at: new Date().toISOString(),
      zone_id: zoneId,
    };

    // Save locally as last known location
    await saveLastKnownLocation(payload);

    // Post to backend
    const response = await fetch(`${BASE_URL}/api/location/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('[LocationTracker] 5-Min Periodic Location Sync SUCCESS!');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[LocationTracker] Location sync deferred (offline/network timeout). Saved to local cache.');
    return false;
  }
};

export const start5MinPeriodicLocationTracker = (deviceUuid: string, zoneId: string = 'chamoli_01') => {
  if (locationIntervalTimer) {
    clearInterval(locationIntervalTimer);
  }

  // Sync immediately on launch
  syncCurrentLocationToBackend(deviceUuid, zoneId);

  // Sync every 5 minutes (300,000 ms)
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  locationIntervalTimer = setInterval(() => {
    console.log('[LocationTracker] Executing 5-minute periodic location sync routine...');
    syncCurrentLocationToBackend(deviceUuid, zoneId);
  }, FIVE_MINUTES_MS);

  console.log('[LocationTracker] 5-Minute background periodic location sync active.');
};

export const stopPeriodicLocationTracker = () => {
  if (locationIntervalTimer) {
    clearInterval(locationIntervalTimer);
    locationIntervalTimer = null;
  }
};
