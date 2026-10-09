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
  await proxyToBackend("/api/landslide/simulate-quorum", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const state = getGlobalState();
  const nowTs = Date.now() / 1000;
  const nowIso = new Date().toISOString();

  if (!state.sectors[sectorId]) {
    state.sectors[sectorId] = {
      sector_id: sectorId,
      sector_name: "Sector 4: Chooralmala / Meppadi (Wayanad)",
      lat: 11.5273,
      lng: 76.1242,
      total_active_phones: 9,
      quorum_threshold: 3,
      status: "MONITORING",
      reporting_devices: [],
      reports: [],
      first_detected_at: null,
      last_report_at: null,
      latest_tremor_g: 0.0,
      latest_frequency_hz: 0.0,
      confirmed_at: null,
      has_active_directive: false,
    };
  }

  const sec = state.sectors[sectorId];
  const simPeers = [
    { device_uuid: "SIM_PEER_ALPHA", tremor_g: 0.18, frequency_hz: 18.2 },
    { device_uuid: "SIM_PEER_BETA", tremor_g: 0.22, frequency_hz: 18.5 },
    { device_uuid: "SIM_PEER_GAMMA", tremor_g: 0.19, frequency_hz: 18.1 },
  ];

  sec.reports = simPeers.map((p, i) => ({
    id: `sim_rep_${i}`,
    device_uuid: p.device_uuid,
    tremor_g: p.tremor_g,
    frequency_hz: p.frequency_hz,
    duration_s: 30,
    timestamp_sec: nowTs,
    received_at: nowIso,
  }));

  sec.reporting_devices = simPeers.map((p) => p.device_uuid);
  sec.status = "CONFIRMED_LANDSLIDE";
  sec.confirmed_at = nowIso;
  sec.first_detected_at = nowIso;
  sec.last_report_at = nowIso;
  sec.latest_tremor_g = 0.22;
  sec.latest_frequency_hz = 18.5;
  sec.has_active_directive = true;

  const directiveEntry = {
    id: `broad_landslide_${sectorId}`,
    type: "LANDSLIDE_1_3RD_CONSENSUS",
    severity: "CRITICAL",
    title: "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS",
    message: "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW",
    sector_id: sectorId,
    sector_name: sec.sector_name,
    consensus_count: 3,
    total_active_phones: 9,
    quorum_threshold: 3,
    status: "ACTIVE_SIREN",
    authorized_by: "SIMULATION_TEST_ENGINE",
    created_at: nowIso,
  };

  const existingDirIdx = state.directives.findIndex((d) => d.sector_id === sectorId);
  if (existingDirIdx >= 0) {
    state.directives[existingDirIdx] = directiveEntry;
  } else {
    state.directives.push(directiveEntry);
  }

  // Activate mobile siren
  if (!global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__) {
    global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__ = new Map();
  }
  global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__.set(sectorId, {
    zone_id: sectorId,
    zone_name: sec.sector_name,
    is_active: true,
    dispatched_at: nowIso,
    authorized_by: "SIMULATION_TEST_ENGINE",
    target_devices_count: 9,
    cell_broadcast_channels: ["CB-4370 (Govt Emergency Civic Alarm)", "CB-919 (NDRF Audio Alert)"],
    mobile_audio_action: "FORCE_MAX_VOLUME_EMERGENCY_SIREN_AND_VIBRATION",
    vibration_pattern: [1000, 400, 1000, 400, 1500],
    emergency_message: "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW",
  });

  return NextResponse.json(
    {
      success: true,
      sector_id: sectorId,
      directive: directiveEntry,
      message: `Simulated 1/3rd quorum in sector ${sectorId}. Evacuation directive active.`,
    },
    { headers: corsHeaders }
  );
}
