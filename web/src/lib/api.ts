import { PredictionResponse, SOSCluster, ZoneId } from "./types";
import { HIMALAYAN_ZONES, INITIAL_MOCK_CLUSTERS } from "./constants";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Fetch current flood prediction from backend FastAPI
 * Route: GET /api/prediction/current?zone_id={id}
 */
export async function fetchCurrentPrediction(
  zoneId: ZoneId
): Promise<PredictionResponse> {
  const zoneInfo =
    HIMALAYAN_ZONES.find((z) => z.id === zoneId) || HIMALAYAN_ZONES[0];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `${API_BASE}/api/prediction/current?zone_id=${zoneId}`,
      {
        signal: controller.signal,
        cache: "no-store",
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Backend returned status ${res.status}`);
    }

    const data = await res.json();
    return {
      zone_id: data.zone_id || zoneId,
      flood_probability_percent:
        typeof data.flood_probability_percent === "number"
          ? data.flood_probability_percent
          : zoneInfo.currentRisk,
      alert_color: data.alert_color || zoneInfo.alertColor,
      primary_trigger: data.primary_trigger || zoneInfo.primaryTrigger,
      last_updated: data.last_updated || new Date().toISOString(),
      lead_time_minutes:
        typeof data.lead_time_minutes === "number"
          ? data.lead_time_minutes
          : zoneInfo.leadTimeMinutes,
      danger_mark_m:
        typeof data.danger_mark_m === "number"
          ? data.danger_mark_m
          : zoneInfo.dangerMarkM,
      warning_mark_m:
        typeof data.warning_mark_m === "number"
          ? data.warning_mark_m
          : zoneInfo.warningMarkM,
      telemetry: data.telemetry || zoneInfo.telemetry,
    };
  } catch (error) {
    // Graceful fallback to zone telemetry (e.g. when backend is booting or demoing)
    return {
      zone_id: zoneId,
      flood_probability_percent: zoneInfo.currentRisk,
      alert_color: zoneInfo.alertColor,
      primary_trigger: zoneInfo.primaryTrigger,
      last_updated: new Date().toISOString(),
      lead_time_minutes: zoneInfo.leadTimeMinutes,
      danger_mark_m: zoneInfo.dangerMarkM,
      warning_mark_m: zoneInfo.warningMarkM,
      telemetry: zoneInfo.telemetry,
    };
  }
}

/**
 * Fetch active SOS clusters from backend
 * Route: GET /api/sos/clusters?zone_id={id}
 */
export async function fetchActiveClusters(
  zoneId: ZoneId
): Promise<SOSCluster[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `${API_BASE}/api/sos/clusters?zone_id=${zoneId}`,
      {
        signal: controller.signal,
        cache: "no-store",
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Backend error ${res.status}`);
    const data = await res.json();
    return data.clusters || INITIAL_MOCK_CLUSTERS;
  } catch {
    return INITIAL_MOCK_CLUSTERS;
  }
}