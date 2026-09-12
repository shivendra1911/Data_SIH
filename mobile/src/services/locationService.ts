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
