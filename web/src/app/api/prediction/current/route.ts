import { NextRequest, NextResponse } from "next/server";
import { HIMALAYAN_ZONES } from "@/lib/constants";

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

  const zone =
    HIMALAYAN_ZONES.find((z) => z.id === zoneId) || HIMALAYAN_ZONES[0];

  const responsePayload = {
    zone_id: zone.id,
    flood_probability_percent: zone.currentRisk,
    alert_color: zone.alertColor,
    primary_trigger: zone.primaryTrigger,
    last_updated: new Date().toISOString(),
    lead_time_minutes: zone.leadTimeMinutes,
    danger_mark_m: zone.dangerMarkM,
    warning_mark_m: zone.warningMarkM,
    telemetry: zone.telemetry,
  };

  return NextResponse.json(responsePayload, { headers: corsHeaders });
}