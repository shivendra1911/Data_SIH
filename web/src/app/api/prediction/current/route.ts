import { NextRequest, NextResponse } from "next/server";
import { INDIA_FLOOD_ZONES } from "@/lib/constants";
import { evaluateAIFloodRisk } from "@/lib/aiEngine";
import { getLiveTelemetry } from "@/lib/liveTelemetryService";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zoneId = searchParams.get("zone_id") || "chamoli_01";
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const nameParam = searchParams.get("name");

  let centerLat: number;
  let centerLng: number;
  let zoneName: string;
  let zoneDangerMark = 7.5;
  let zoneWarningMark = 6.0;
  let zoneSlope = 15.0;

  if (latParam && lngParam) {
    centerLat = parseFloat(latParam);
    centerLng = parseFloat(lngParam);
    zoneName = nameParam || "Your Live Location";
    zoneDangerMark = 5.0;
    zoneWarningMark = 3.5;
  } else {
    // Check if external FastAPI backend is reachable on port 8000
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);
      const backendRes = await fetch(
        `http://127.0.0.1:8000/api/prediction/current?zone_id=${zoneId}`,
        {
          signal: controller.signal,
          cache: "no-store",
        }
      );
      clearTimeout(timeoutId);
      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data, { headers: corsHeaders });
      }
    } catch {}

    const zone =
      INDIA_FLOOD_ZONES.find((z) => z.id === zoneId) || INDIA_FLOOD_ZONES[0];
    centerLat = zone.center[0];
    centerLng = zone.center[1];
    zoneName = zone.name;
    zoneDangerMark = zone.dangerMarkM;
    zoneWarningMark = zone.warningMarkM;
    zoneSlope = zone.telemetry.slope_deg;
  }

  // Ingest REAL live internet data for this location's actual coordinates
  const liveData = await getLiveTelemetry(
    centerLat,
    centerLng,
    zoneSlope,
    zoneDangerMark
  );

  // Evaluate risk through the Physics-Informed ML Engine using LIVE sensor inputs
  const aiResult = evaluateAIFloodRisk(
    liveData.telemetry,
    zoneDangerMark,
    zoneWarningMark
  );

  const responsePayload = {
    zone_id: latParam && lngParam ? "live_user_location" : zoneId,
    zone_name: zoneName,
    flood_probability_percent: aiResult.flood_probability_percent,
    alert_color: aiResult.alert_color,
    risk_level: aiResult.risk_level,
    primary_trigger: aiResult.primary_trigger,
    is_cryo_seismic_glof: aiResult.is_cryo_seismic_glof,
    last_updated: liveData.timestamp,
    lead_time_minutes: aiResult.lead_time_minutes,
    danger_mark_m: zoneDangerMark,
    warning_mark_m: zoneWarningMark,
    telemetry: liveData.telemetry,
    feature_contributions: aiResult.feature_contributions,
    recommendation: aiResult.preventive_action_recommendation,
    is_live_internet: liveData.isLive,
    data_source: liveData.source,
    active_provider: liveData.activeProvider,
    diagnostics: liveData.diagnostics,
    raw_details: liveData.rawDetails,
  };

  return NextResponse.json(responsePayload, { headers: corsHeaders });
}