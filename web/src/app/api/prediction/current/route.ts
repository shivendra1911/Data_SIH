import { NextRequest, NextResponse } from "next/server";
import { HIMALAYAN_ZONES } from "@/lib/constants";
import { evaluateAIFloodRisk } from "@/lib/aiEngine";

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

  // Check if external FastAPI backend is reachable on port 8000
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
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
    HIMALAYAN_ZONES.find((z) => z.id === zoneId) || HIMALAYAN_ZONES[0];

  // Evaluate risk through the Physics-Informed ML Ensemble
  const aiResult = evaluateAIFloodRisk(
    zone.telemetry,
    zone.dangerMarkM,
    zone.warningMarkM
  );

  const responsePayload = {
    zone_id: zone.id,
    flood_probability_percent: aiResult.flood_probability_percent,
    alert_color: aiResult.alert_color,
    primary_trigger: aiResult.primary_trigger,
    is_cryo_seismic_glof: aiResult.is_cryo_seismic_glof,
    last_updated: new Date().toISOString(),
    lead_time_minutes: aiResult.lead_time_minutes,
    danger_mark_m: zone.dangerMarkM,
    warning_mark_m: zone.warningMarkM,
    telemetry: zone.telemetry,
    feature_contributions: aiResult.feature_contributions,
    recommendation: aiResult.preventive_action_recommendation,
  };

  return NextResponse.json(responsePayload, { headers: corsHeaders });
}