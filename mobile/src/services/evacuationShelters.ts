import AsyncStorage from '@react-native-async-storage/async-storage';
import { EvacuationShelter } from '../types';

const SHELTERS_CACHE_KEY = '@neernetra_evac_shelters_v1';

// Offline Pre-Cached Database of Himalayan Safe Assembly Shelters & Relief Centers
export const OFFLINE_SHELTERS_DB: EvacuationShelter[] = [
  {
    id: 'shelter_chamoli_01',
    name: 'Chamoli District Relief Center & Stadium',
    name_hi: 'चमोली जिला राहत केंद्र एवं खेल मैदान',
    zone_id: 'chamoli_01',
    lat: 30.4190,
    lng: 79.3250,
    elevation_m: 1610.0,
    capacity: 850,
    medical_support: true,
    food_water_stocked: true,
    status: 'OPEN',
    contact_phone: '+91-1372-252107',
  },
  {
    id: 'shelter_joshimath_01',
    name: 'Joshimath High Ground Camp (ITBP Base)',
    name_hi: 'जोशीमठ सुरक्षित ऊँचाई शिविर (आईटीबीपी बेस)',
    zone_id: 'joshimath_01',
    lat: 30.5615,
    lng: 79.5720,
    elevation_m: 1940.0,
    capacity: 1200,
    medical_support: true,
    food_water_stocked: true,
    status: 'OPEN',
    contact_phone: '+91-1389-222129',
  },
  {
    id: 'shelter_kedarnath_01',
    name: 'Kedarnath GMVN Helipad High-Ground Safe Haven',
    name_hi: 'केदारनाथ जीएमवीएन हेलीपैड सुरक्षित स्थल',
    zone_id: 'kedarnath_01',
    lat: 30.7380,
    lng: 79.0720,
    elevation_m: 3584.0,
    capacity: 500,
    medical_support: true,
    food_water_stocked: true,
    status: 'OPEN',
    contact_phone: '+91-1364-267324',
  },
  {
    id: 'shelter_rudraprayag_01',
    name: 'Rudraprayag Government College Assembly Ground',
    name_hi: 'रुद्रप्रयाग राजकीय महाविद्यालय सुरक्षित परिसर',
    zone_id: 'rudraprayag_01',
    lat: 30.2890,
    lng: 78.9850,
    elevation_m: 980.0,
    capacity: 900,
    medical_support: true,
    food_water_stocked: true,
    status: 'OPEN',
    contact_phone: '+91-1364-233727',
  },
  {
    id: 'shelter_uttarkashi_01',
    name: 'Uttarkashi NIM Safe Mountain Campus',
    name_hi: 'उत्तरकाशी एनआईएम सुरक्षित पर्वतीय परिसर',
    zone_id: 'uttarkashi_01',
    lat: 30.7310,
    lng: 78.4420,
    elevation_m: 1280.0,
    capacity: 650,
    medical_support: true,
    food_water_stocked: true,
    status: 'OPEN',
    contact_phone: '+91-1374-222123',
  },
  {
    id: 'shelter_badrinath_01',
    name: 'Badrinath Temple Complex High Ridge Haven',
    name_hi: 'बद्रीनाथ मंदिर सुरक्षित ऊँचाई शरणस्थल',
    zone_id: 'badrinath_01',
    lat: 30.7450,
    lng: 79.4950,
    elevation_m: 3180.0,
    capacity: 750,
    medical_support: true,
    food_water_stocked: true,
    status: 'OPEN',
    contact_phone: '+91-1381-222210',
  },
  {
    id: 'shelter_gopeshwar_01',
    name: 'Gopeshwar Sports Ground & Relief Depot',
    name_hi: 'गोपेश्वर खेल मैदान एवं जिला राहत केंद्र',
    zone_id: 'gopeshwar_01',
    lat: 30.4120,
    lng: 79.3240,
    elevation_m: 1550.0,
    capacity: 950,
    medical_support: true,
    food_water_stocked: true,
    status: 'OPEN',
    contact_phone: '+91-1372-252220',
  },
  {
    id: 'shelter_pithoragarh_01',
    name: 'Pithoragarh Naini-Saini Safe Airfield Camp',
    name_hi: 'पिथौरागढ़ नैनी-सैनी सुरक्षित शिविर',
    zone_id: 'pithoragarh_01',
    lat: 29.5850,
    lng: 80.2220,
    elevation_m: 1650.0,
    capacity: 1100,
    medical_support: true,
    food_water_stocked: true,
    status: 'OPEN',
    contact_phone: '+91-1364-224410',
  },
  {
    id: 'shelter_nainital_01',
    name: 'Nainital High-Ground Poly-Relief Enclave',
    name_hi: 'नैनीताल सुरक्षित ऊँचाई राहत परिसर',
    zone_id: 'nainital_01',
    lat: 29.3950,
    lng: 79.4580,
    elevation_m: 2100.0,
    capacity: 600,
    medical_support: true,
    food_water_stocked: true,
    status: 'OPEN',
    contact_phone: '+91-1362-235120',
  },
  {
    id: 'shelter_dehradun_01',
    name: 'Dehradun Parade Ground NDRF Central Command',
    name_hi: 'देहरादून परेड ग्राउंड एनडीआरएफ कमांड कैंप',
    zone_id: 'dehradun_01',
    lat: 30.3200,
    lng: 78.0380,
    elevation_m: 680.0,
    capacity: 2000,
    medical_support: true,
    food_water_stocked: true,
    status: 'OPEN',
    contact_phone: '+91-135-2710334',
  }
];

export const calculateHaversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  return Math.round(R * c * 100) / 100;
};

export const calculateBearingDeg = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180.0;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return Math.round(((theta * 180.0) / Math.PI + 360.0) % 360.0);
};

export const bearingToCompass = (deg: number): string => {
  const quadrants = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  const idx = Math.round(deg / 45.0) % 8;
  return quadrants[idx];
};

export const getNearestEvacuationShelter = (
  currentLat: number = 30.5573,
  currentLng: number = 79.5642,
  currentAltitude: number = 1450.0,
  sheltersList: EvacuationShelter[] = OFFLINE_SHELTERS_DB
): EvacuationShelter => {
  let nearest: EvacuationShelter = sheltersList[0];
  let minDistance = Infinity;

  const enriched = sheltersList.map((s) => {
    const distKm = calculateHaversineKm(currentLat, currentLng, s.lat, s.lng);
    const bearing = calculateBearingDeg(currentLat, currentLng, s.lat, s.lng);
    const compass = bearingToCompass(bearing);
    const elevationGain = Math.round((s.elevation_m - currentAltitude) * 10) / 10;

    const item: EvacuationShelter = {
      ...s,
      distance_km: distKm,
      distance_m: Math.round(distKm * 1000),
      bearing_deg: bearing,
      bearing_compass: compass,
      elevation_gain_m: elevationGain,
    };

    if (distKm < minDistance) {
      minDistance = distKm;
      nearest = item;
    }
    return item;
  });

  return nearest;
};

export const getCachedShelters = async (): Promise<EvacuationShelter[]> => {
  try {
    const raw = await AsyncStorage.getItem(SHELTERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return OFFLINE_SHELTERS_DB;
};
