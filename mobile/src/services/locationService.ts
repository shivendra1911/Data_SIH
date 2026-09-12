import * as Location from 'expo-location';

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
}

export const getCurrentDeviceLocation = async (): Promise<GeoLocation> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[LocationService] Permission denied. Returning fallback zone coordinates.');
      return { lat: 27.6015, lng: 77.5975 };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.warn('[LocationService] Failed to acquire GPS position:', error);
    return { lat: 27.6015, lng: 77.5975 };
  }
};

export const getReadableLocationName = async (lat: number, lng: number): Promise<string> => {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (places && places.length > 0) {
      const p = places[0];
      const locality = p.city || p.subregion || p.district || p.name || 'Local Sector';
      const state = p.region || 'UP';
      return `${locality}, ${state}`;
    }
  } catch (err) {
    console.debug('[LocationService] Reverse geocode fallback:', err);
  }

  // Geographic boundary heuristics for known SIH test sectors
  if (lat >= 27.4 && lat <= 27.8 && lng >= 77.4 && lng <= 77.8) {
    return 'Mathura (GLA University Sector), UP';
  }
  if (lat >= 30.3 && lat <= 30.8 && lng >= 79.3 && lng <= 79.8) {
    return 'Chamoli (Alaknanda Basin), Uttarakhand';
  }

  return `Live Sector (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`;
};
