import { NextRequest, NextResponse } from "next/server";
import { getGlobalState, proxyToBackend } from "@/lib/sentinelState";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const sectorId = body.sector_id || "sector_wayanad_04";

  // Forward to FastAPI if available
  await proxyToBackend("/api/landslide/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const state = getGlobalState();
  if (state.sectors[sectorId]) {
    state.sectors[sectorId].status = "MONITORING";
    state.sectors[sectorId].reports = [];
    state.sectors[sectorId].reporting_devices = [];
    state.sectors[sectorId].confirmed_at = null;
    state.sectors[sectorId].has_active_directive = false;
  }

  return NextResponse.json(
    {
      success: true,
      sector_id: sectorId,
      message: `Landslide alert cancelled and sector ${sectorId} restored to MONITORING`,
    },
    { headers: corsHeaders }
  );
}
