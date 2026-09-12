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

export const syncCurrentLocationToBackend = async (deviceUuid: string, zoneId: string = 'local_sector'): Promise<boolean> => {
  try {
    let lat = 27.6015;
    let lng = 77.5975;
    let altitude: number | null = 180;
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

    // Direct parallel push to Supabase Cloud Realtime (<100ms)
    const SUPABASE_REST_URL = 'https://nratutjgjodkbysxyxem.supabase.co/rest/v1';
    const SUPABASE_ANON_KEY = 'sb_publishable_sqCaR-QnTPSE2PVW3FmCtg_AKwBWJpN';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      await fetch(`${SUPABASE_REST_URL}/sos_alerts`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        signal: controller.signal,
        body: JSON.stringify([{
          device_id: deviceUuid,
          lat,
          lng,
          sos_type: 'CHECKIN',
          status: 'SAFE',
          battery_level: payload.battery_level || 88,
          notes: 'Periodic live GPS location check-in',
        }]),
      });
      clearTimeout(timeoutId);
    } catch {}

    // Post to local web dashboard and NDRF gateway
    const syncEndpoints = [
      'http://127.0.0.1:3000/api/location/sync',
      'http://localhost:3000/api/location/sync',
      `${BASE_URL}/api/location/sync`,
    ];
    for (const url of syncEndpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          console.log('[LocationTracker] Location sync reached gateway:', url);
          break;
        }
      } catch {}
    }

    return true;
  } catch (err) {
    console.warn('[LocationTracker] Location sync deferred (offline/network timeout). Saved to local cache.');
    return false;
  }
};

export const start5MinPeriodicLocationTracker = (deviceUuid: string, zoneId: string = 'local_sector') => {
  if (locationIntervalTimer) {
    clearInterval(locationIntervalTimer);
  }

  // Sync immediately on launch
  syncCurrentLocationToBackend(deviceUuid, zoneId);

  // Sync every 60 seconds (1 minute) for live active citizen presence
  const ONE_MINUTE_MS = 60 * 1000;
  locationIntervalTimer = setInterval(() => {
    console.log('[LocationTracker] Executing 60-second periodic location sync routine...');
    syncCurrentLocationToBackend(deviceUuid, zoneId);
  }, ONE_MINUTE_MS);

  console.log('[LocationTracker] 60-Second background periodic location sync active.');
};

export const stopPeriodicLocationTracker = () => {
  if (locationIntervalTimer) {
    clearInterval(locationIntervalTimer);
    locationIntervalTimer = null;
  }
};
