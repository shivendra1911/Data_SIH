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

  const existingDirIdx = state.directives.findIndex((d) => d.sector_id === sectorId);
  if (existingDirIdx >= 0) {
    state.directives[existingDirIdx] = directive;
  } else {
    state.directives.push(directive);
  }

  // Trigger mobile sirens
  if (!global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__) {
    global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__ = new Map();
  }
  global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__.set(sectorId, {
    zone_id: sectorId,
    zone_name: state.sectors[sectorId]?.sector_name || sectorId,
    is_active: true,
    dispatched_at: nowIso,
    authorized_by: authorizedBy,
    target_devices_count: state.sectors[sectorId]?.total_active_phones || 9,
    cell_broadcast_channels: ["CB-4370 (Govt Emergency Civic Alarm)", "CB-919 (NDRF Audio Alert)"],
    mobile_audio_action: "FORCE_MAX_VOLUME_EMERGENCY_SIREN_AND_VIBRATION",
    vibration_pattern: [1000, 400, 1000, 400, 1500],
    emergency_message: message,
  });

  // Supabase cloud dispatch
  try {
    const { supabase } = await import("@/lib/supabase");
    supabase.from("sos_alerts").insert([
      {
        device_id: "ADMIN_SIREN_DISPATCH",
        lat: state.sectors[sectorId]?.lat || 11.5273,
        lng: state.sectors[sectorId]?.lng || 76.1242,
        sos_type: "CIVIL_DEFENSE_SIREN",
        status: "ACTIVE_SIREN",
        battery_level: 100,
        notes: JSON.stringify({
          zone_id: sectorId,
          zone_name: state.sectors[sectorId]?.sector_name || sectorId,
          action: "BROADCAST_ALL",
          message,
          created_at: nowIso,
        }),
      },
    ]).then(() => {});
  } catch {}

  return NextResponse.json(
    {
      success: true,
      message: `Area-wide emergency directive broadcast dispatched to sector ${sectorId}`,
      directive,
    },
    { headers: corsHeaders }
  );
}
