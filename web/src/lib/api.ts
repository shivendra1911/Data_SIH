import { PredictionResponse, SOSCluster, ZoneId } from "./types";
import { HIMALAYAN_ZONES } from "./constants";

const API_BASE =
  typeof window !== "undefined"
    ? ""
    : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Fetch current flood prediction from backend FastAPI
 * Route: GET /api/prediction/current?zone_id={id}
 */
export async function fetchCurrentPrediction(
  zoneOrCoords: string | { zoneId?: string; lat?: number; lng?: number; name?: string }
): Promise<PredictionResponse> {
  let url = `${API_BASE}/api/prediction/current`;
  const isCoords = typeof zoneOrCoords !== "string" && zoneOrCoords && zoneOrCoords.lat !== undefined && zoneOrCoords.lng !== undefined;
  const fallbackZoneId = typeof zoneOrCoords === "string" 
    ? zoneOrCoords 
    : (zoneOrCoords?.zoneId || (isCoords ? "live_user_location" : "chamoli_01"));

  let zoneInfo = HIMALAYAN_ZONES.find((z) => z.id === fallbackZoneId) || {
    ...HIMALAYAN_ZONES[0],
    id: fallbackZoneId as any,
    name: typeof zoneOrCoords !== "string" ? zoneOrCoords?.name || "Live Location" : "Live Location",
    currentRisk: 6.5,
    alertColor: "GREEN" as const,
    primaryTrigger: "Live Meteorological Telemetry",
    leadTimeMinutes: 480,
    telemetry: {
      rainfall_mm: 0.0,
      soil_moisture_pct: 45.0,
      slope_deg: 10.0,
      river_level_m: 1.2,
      seismic_mag: 0.0,
    },
  };

  if (typeof zoneOrCoords === "string") {
    url += `?zone_id=${zoneOrCoords}`;
  } else if (isCoords) {
    url += `?lat=${zoneOrCoords.lat}&lng=${zoneOrCoords.lng}&name=${encodeURIComponent(zoneOrCoords.name || "Live Location")}`;
  } else if (zoneOrCoords && zoneOrCoords.zoneId) {
    url += `?zone_id=${zoneOrCoords.zoneId}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Backend returned status ${res.status}`);
    }

    const data = await res.json();
    return {
      zone_id: data.zone_id || fallbackZoneId,
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
      is_live_internet: data.is_live_internet,
      data_source: data.data_source,
      recommendation: data.recommendation,
    };
  } catch (error) {
    // Graceful fallback to zone telemetry
    return {
      zone_id: fallbackZoneId,
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
    return data.clusters || [];
  } catch {
    return [];
  }
}