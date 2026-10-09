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
  const message = body.message || "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW";
  const authorizedBy = body.authorized_by || "COMMAND_PORTAL_USAR";

  // Forward to FastAPI if available
  await proxyToBackend("/api/landslide/broadcast-directive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const state = getGlobalState();
  const nowIso = new Date().toISOString();

  if (state.sectors[sectorId]) {
    state.sectors[sectorId].status = "CONFIRMED_LANDSLIDE";
    state.sectors[sectorId].confirmed_at = nowIso;
    state.sectors[sectorId].has_active_directive = true;
  }

  const directive = {
    id: `broad_landslide_${sectorId}`,
    type: "LANDSLIDE_1_3RD_CONSENSUS",
    severity: "CRITICAL",
    title: "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS",
    message,
    sector_id: sectorId,
    authorized_by: authorizedBy,
    status: "ACTIVE_SIREN",
    created_at: nowIso,
  };

  state.directives.push(directive);

  return NextResponse.json(
    {
      success: true,
      message: `Area-wide emergency directive broadcast dispatched to sector ${sectorId}`,
      directive,
    },
    { headers: corsHeaders }
  );
}
