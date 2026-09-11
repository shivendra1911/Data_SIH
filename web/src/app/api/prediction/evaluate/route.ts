import { NextRequest, NextResponse } from "next/server";
import { evaluateAIFloodRisk } from "@/lib/aiEngine";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const telemetry = {
      rainfall_mm: Number(body.rainfall_mm) || 0,
      soil_moisture_pct: Number(body.soil_moisture_pct) || 50,
      slope_deg: Number(body.slope_deg) || 30,
      river_level_m: Number(body.river_level_m) || 3.0,
      seismic_mag: Number(body.seismic_mag) || 1.5,
    };

    const dangerMark = Number(body.danger_mark_m) || 7.5;
    const warningMark = Number(body.warning_mark_m) || 6.0;

    const result = evaluateAIFloodRisk(telemetry, dangerMark, warningMark);

    return NextResponse.json(
      {
        status: "success",
        telemetry,
        prediction: result,
        evaluated_at: new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid telemetry payload", details: err.message },
      { status: 400, headers: corsHeaders }
    );
  }
}
