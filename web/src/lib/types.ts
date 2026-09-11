export type AlertColor = "RED" | "ORANGE" | "YELLOW" | "GREEN";

export type ZoneId =
  | "chamoli_01"
  | "kedarnath_01"
  | "joshimath_01"
  | "rishikesh_01"
  | "uttarkashi_01";

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
}
