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

  // Remove active directive from list
  state.directives = state.directives.filter((d) => d.sector_id !== sectorId);

  // Silence mobile siren in siren-dispatch store
  if (!global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__) {
    global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__ = new Map();
  }
  const existingRec = global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__.get(sectorId);
  if (existingRec) {
    existingRec.is_active = false;
    global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__.set(sectorId, existingRec);
  } else {
    global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__.set(sectorId, {
      zone_id: sectorId,
      zone_name: sectorId,
      is_active: false,
      dispatched_at: new Date().toISOString(),
      authorized_by: "SYSTEM_CANCEL",
      target_devices_count: 0,
      cell_broadcast_channels: [],
      mobile_audio_action: "STOP",
      vibration_pattern: [],
      emergency_message: "",
    });
  }

  // Sync HALT to Supabase
  try {
    const { supabase } = await import("@/lib/supabase");
    supabase.from("sos_alerts").insert([
      {
        device_id: "ADMIN_SIREN_DISPATCH",
        lat: 11.5273,
        lng: 76.1242,
        sos_type: "CIVIL_DEFENSE_SIREN",
        status: "HALTED_SIREN",
        battery_level: 100,
        notes: JSON.stringify({
          zone_id: sectorId,
          action: "HALT",
          halted_at: new Date().toISOString(),
        }),
      },
    ]).then(() => {});
  } catch {}

  return NextResponse.json(
    {
      success: true,
      sector_id: sectorId,
      message: `Landslide alert cancelled and sector ${sectorId} restored to MONITORING`,
    },
    { headers: corsHeaders }
  );
}
