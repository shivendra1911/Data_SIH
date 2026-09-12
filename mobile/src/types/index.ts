export type AlertColor = 'SAFE' | 'ORANGE' | 'RED';

export interface ZonePrediction {
  zone_id: string;
  zone_name?: string;
  flood_probability_percent: number;
  alert_color: AlertColor;
  primary_trigger: string;
  last_updated: string;
}

export type SOSStatus = 'SOS' | 'SAFE' | 'HELPING';

export type SOSType =
  | 'TRAPPED'
  | 'MEDICAL'
  | 'EVACUATION'
  | 'FOOD_WATER'
  | 'GENERAL'
  | 'LOCATION_TRACKING'
  | 'TOUCH_FREE_MOTION_SAFE'
  | 'CHECKIN';

export interface SOSPayload {
  device_uuid: string;
  lat: number;
  lng: number;
  status: SOSStatus | 'SAFE';
  sos_type?: SOSType;
  is_mesh_relayed: boolean;
  timestamp?: string;
  notes?: string;
}

export interface LocationSyncPayload {
  device_uuid: string;
  lat: number;
  lng: number;
  altitude?: number | null;
  accuracy?: number | null;
  battery_level?: number | null;
  last_synced_at: string;
  zone_id?: string;
}

export type NetworkMode = 'ONLINE' | 'BLE_MESH' | 'OFFLINE_QUEUED';

export interface MeshPeer {
  id: string;
  name: string;
  signalStrength: number; // dBm e.g. -45
  relayedPacketsCount: number;
  role?: string;
  location?: string;
  flag?: string;
  timestamp?: string;
  lat?: number;
  lng?: number;
  status?: SOSStatus;
  distanceMeters?: number;
  inVoiceCall?: boolean;
}

export interface MeshChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isMeshRelayed: boolean;
  hopCount: number;
}

export interface CitizenBeaconItem {
  id: string;
  name: string;
  role: string;
  status: SOSStatus;
  location: string;
  countryFlag: string;
  distance: string;
  sosType?: SOSType;
  timestamp: string;
  selected?: boolean;
}

export interface MapClusterMarker {
  id: string;
  number: number;
  lat: number;
  lng: number;
  xPercent: number;
  yPercent: number;
  active: boolean;
  label: string;
}

export type LanguageMode = 'en' | 'hi';

export interface CWCGaugeInfo {
  gauge_station: string;
  river: string;
  warning_level_m: number;
  danger_level_m: number;
  hfl_record_m: number;
  hfl_date?: string;
  current_stage_m?: number;
  status?: string;
  severity?: string;
  freeboard_to_danger_m?: number;
}

export interface EvacuationShelter {
  id: string;
  name: string;
  name_hi?: string;
  zone_id: string;
  lat: number;
  lng: number;
  elevation_m: number;
  capacity: number;
  medical_support: boolean;
  food_water_stocked: boolean;
  status: string;
  contact_phone?: string;
  distance_km?: number;
  distance_m?: number;
  bearing_deg?: number;
  bearing_compass?: string;
  elevation_gain_m?: number;
}
