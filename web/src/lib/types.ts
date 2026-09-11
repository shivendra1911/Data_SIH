export type AlertColor = "RED" | "ORANGE" | "YELLOW" | "GREEN";

export type ZoneId =
  // Uttarakhand / HP
  | "chamoli_01"
  | "kedarnath_01"
  | "joshimath_01"
  | "rishikesh_01"
  | "uttarkashi_01"
  // All-India zones
  | "assam_brahmaputra_01"
  | "kerala_chalakudy_01"
  | "bihar_kosi_01"
  | "odisha_mahanadi_01"
  | "himachal_kullu_01"
  | "jk_jhelum_01"
  | "wb_teesta_01";

export type ForecastHorizon = "NOW" | "+2H" | "+6H" | "+12H" | "+24H";

export interface SensorTelemetry {
  rainfall_mm: number;
  soil_moisture_pct: number;
  slope_deg: number;
  river_level_m: number;
  seismic_mag: number;
}

export interface HydrographPoint {
  time: string;
  level_m: number;
  discharge_cumecs: number;
  isPredicted: boolean;
}

export interface PreventiveDirective {
  id: string;
  category: "DAM" | "HIGHWAY" | "PILGRIMAGE" | "POWER";
  title: string;
  action: string;
  priority: "IMMEDIATE" | "ADVISORY" | "STANDBY";
  deadline: string;
  executed: boolean;
}

export interface CriticalInfrastructure {
  id: string;
  name: string;
  type: "DAM" | "BRIDGE" | "BARRAGE" | "SHELTER";
  coords: [number, number];
  riskLevel: "HIGH" | "MODERATE" | "SAFE";
  bufferDistanceM: number;
}

export interface PredictionResponse {
  zone_id: string;
  flood_probability_percent: number;
  alert_color: AlertColor;
  primary_trigger: string;
  last_updated: string;
  lead_time_minutes: number;
  danger_mark_m: number;
  warning_mark_m: number;
  telemetry?: SensorTelemetry;
}

export interface SOSEvent {
  id: string;
  device_uuid: string;
  lat: number;
  lng: number;
  status: "SOS" | "SAFE" | "HELPING";
  sos_type?: string;
  is_mesh_relayed: boolean;
  created_at: string;
  rescued?: boolean;
}

export interface SOSCluster {
  cluster_id: number;
  center_lat: number;
  center_lng: number;
  total_people: number;
  priority: "P1" | "P2" | "P3";
  dispatched?: boolean;
  assigned_team?: string;
}

export interface SurgeCheckpoint {
  name: string;
  distance_km: number;
  eta_minutes: number;
  peak_surge_m: number;
}

export interface DisasterEpicenter {
  id: string;
  zone_id: string;
  name: string;
  type: "GLOF_MORAINE_BREACH" | "CLOUDBURST_CELL" | "ROCK_ICE_AVALANCHE";
  coords: [number, number];
  elevation_m: number;
  estimated_volume_m3: string;
  detection_source: string;
  surge_path: [number, number][];
  checkpoints: SurgeCheckpoint[];
}

export interface CitizenLocation {
  id: string;
  device_uuid: string;
  zone_id?: ZoneId;
  name?: string;
  phone?: string;
  lat: number;
  lng: number;
  is_live: boolean;
  last_seen_minutes_ago: number;
  accuracy_radius_m: number;
  drift_radius_m: number;
  battery_pct: number;
  status: "SOS" | "SAFE" | "HELPING";
  sos_type?: string;
  medical_distress?: "NONE" | "CRITICAL_INJURY" | "HYPOTHERMIA" | "ELDERLY_IMMOBILE" | "WATER_RISING";
  mesh_hops: number;
  mesh_relay_chain?: string[];
  breadcrumbs?: [number, number][];
}

export interface SafeEvacuationRoute {
  id: string;
  zone_id: ZoneId;
  route_name: string;
  start_point_name: string;
  start_coords: [number, number];
  assembly_point_name: string;
  assembly_coords: [number, number];
  elevation_gain_m: number;
  distance_km: number;
  walk_time_minutes: number;
  risk_avoidance_status: "100% CLEAR OF FLOOD PLAIN" | "ELEVATED RIDGE TRAIL" | "HIGHWAY ELEVATED CORRIDOR";
  waypoints: [number, number][];
  shelter_capacity: number;
  shelter_facilities: string[];
}

export interface EmergencyResponder {
  id: string;
  zone_id: ZoneId;
  type: "AMBULANCE" | "POLICE" | "NDRF" | "SDRF";
  unit_name: string;
  station_location: string;
  coords: [number, number];
  contact_number: string;
  personnel_count: number;
  vehicle_fleet: string;
  distance_km: number;
  eta_minutes: number;
  status: "STANDBY" | "DISPATCHED" | "EN_ROUTE" | "ON_SCENE";
  equipment: string[];
}

export interface EvacuationGuidelines {
  zone_id: ZoneId;
  zone_name: string;
  alert_level: "RED" | "ORANGE";
  alarm_tone: string;
  immediate_actions: string[];
  high_ground_directives: string[];
  offline_mesh_protocol: string;
  disaster_radio_mhz: string;
  emergency_helplines: { agency: string; phone: string }[];
}

export interface RegionalAlert {
  alert_id: string;
  zone_id: string;
  severity: "CRITICAL RED" | "HIGH ORANGE" | "ADVISORY YELLOW";
  title: string;
  message: string;
  safe_havens: string[];
  trigger_acoustic_siren: boolean;
  dispatched_at: string;
  status: string;
  target_nodes_count: number;
  delivery_rate_pct: number;
}

export interface HazardZone {
  id: ZoneId;
  name: string;
  district: string;
  center: [number, number];
  currentRisk: number;
  alertColor: AlertColor;
  primaryTrigger: string;
  leadTimeMinutes: number;
  dangerMarkM: number;
  warningMarkM: number;
  telemetry: SensorTelemetry;
  hydrograph: HydrographPoint[];
  preventiveDirectives: PreventiveDirective[];
  infrastructure: CriticalInfrastructure[];
  epicenter?: DisasterEpicenter;
}

export interface ScannedZoneSummary {
  zone_id: ZoneId;
  zone_name: string;
  district: string;
  state: string;
  river_basin: string;
  flood_probability_percent: number;
  alert_color: AlertColor;
  primary_trigger: string;
  is_cryo_seismic_glof: boolean;
  lead_time_minutes: number;
  river_level_m: number;
  danger_mark_m: number;
  auto_dispatched: boolean;
  dispatched_at?: string;
}

export interface NationalSentinelScan {
  timestamp: string;
  national_threat_level: "NORMAL" | "ELEVATED" | "HIGH" | "CRITICAL_RED";
  total_zones_scanned: number;
  critical_zones_count: number;
  warning_zones_count: number;
  highest_threat_zone: ScannedZoneSummary;
  zones: ScannedZoneSummary[];
  recent_auto_sos_dispatches: {
    alert_id: string;
    zone_name: string;
    timestamp: string;
    message: string;
    target_nodes_count: number;
  }[];
}
