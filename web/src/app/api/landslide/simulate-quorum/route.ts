import { NextRequest, NextResponse } from "next/server";
import { getGlobalState, proxyToBackend } from "@/lib/sentinelState";
import { supabase } from "@/lib/supabase";

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

  if (body.reset) {
    sec.reporting_devices = [];
    sec.reports = [];
    sec.status = "MONITORING";
    sec.confirmed_at = null;
    sec.has_active_directive = false;
    sec.latest_tremor_g = 0.0;
    sec.latest_frequency_hz = 0.0;
    if (global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__) {
      global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__.delete(sectorId);
    }
    try {
      supabase
        .from("sos_alerts")
        .update({ status: "RESOLVED_SAFE" })
        .eq("sos_type", "LANDSLIDE")
        .then(() => {});
    } catch {}

    return NextResponse.json({
      success: true,
      status: sec.status,
      reporting_count: 0,
      quorum_threshold: sec.quorum_threshold,
      message: "Sector reset to normal monitoring",
    }, { headers: corsHeaders });
  }

  const currentCount = sec.reporting_devices.length;
  const newCount = currentCount >= sec.quorum_threshold ? 1 : currentCount + 1;

  const simPeers = [
    { device_uuid: "PHONE_ALPHA_SENSOR", tremor_g: 0.18, frequency_hz: 18.2 },
    { device_uuid: "PHONE_BETA_SENSOR", tremor_g: 0.22, frequency_hz: 18.5 },
    { device_uuid: "PHONE_GAMMA_SENSOR", tremor_g: 0.24, frequency_hz: 18.1 },
  ].slice(0, newCount);

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
  sec.latest_tremor_g = simPeers[simPeers.length - 1].tremor_g;
  sec.latest_frequency_hz = simPeers[simPeers.length - 1].frequency_hz;
  sec.first_detected_at = sec.first_detected_at || nowIso;
  sec.last_report_at = nowIso;

  // Persist to Supabase for cross-serverless synchronization
  try {
    for (const p of simPeers) {
      await supabase.from("sos_alerts").insert([
        {
          device_id: p.device_uuid,
          lat: sec.lat,
          lng: sec.lng,
          sos_type: "LANDSLIDE",
          status: newCount >= sec.quorum_threshold ? "CONFIRMED_LANDSLIDE" : "PENDING_QUORUM",
          battery_level: 85,
          notes: JSON.stringify({
            sector_id: sectorId,
            sector_name: sec.sector_name,
            tremor_g: p.tremor_g,
            frequency_hz: p.frequency_hz,
            duration_s: 30,
            timestamp: nowIso,
          }),
        },
      ]);
    }
  } catch {}

  const isQuorumReached = newCount >= sec.quorum_threshold;
  let directiveEntry = null;
  if (isQuorumReached) {
    sec.status = "CONFIRMED_LANDSLIDE";
    sec.confirmed_at = nowIso;
    sec.has_active_directive = true;

    directiveEntry = {
      id: `broad_landslide_${sectorId}`,
      type: "LANDSLIDE_1_3RD_CONSENSUS",
      severity: "CRITICAL",
      title: "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS",
      message: "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW",
      sector_id: sectorId,
      sector_name: sec.sector_name,
      consensus_count: newCount,
      total_active_phones: sec.total_active_phones,
      quorum_threshold: sec.quorum_threshold,
      status: "ACTIVE_SIREN",
      authorized_by: "THRESHOLD_QUORUM_ENGINE",
      created_at: nowIso,
    };

    const existingDirIdx = state.directives.findIndex((d) => d.sector_id === sectorId);
    if (existingDirIdx >= 0) {
      state.directives[existingDirIdx] = directiveEntry;
    } else {
      state.directives.push(directiveEntry);
    }

    // Activate mobile siren dispatch on phones
    if (!global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__) {
      global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__ = new Map();
    }
    global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__.set(sectorId, {
      zone_id: sectorId,
      zone_name: sec.sector_name,
      is_active: true,
      dispatched_at: nowIso,
      authorized_by: "THRESHOLD_QUORUM_ENGINE",
      target_devices_count: sec.total_active_phones,
      cell_broadcast_channels: ["CB-4370 (Govt Emergency Civic Alarm)", "CB-919 (NDRF Audio Alert)"],
      mobile_audio_action: "FORCE_MAX_VOLUME_EMERGENCY_SIREN_AND_VIBRATION",
      vibration_pattern: [1000, 400, 1000, 400, 1500],
      emergency_message: "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW",
    });
  } else {
    sec.status = "PENDING_QUORUM";
    sec.confirmed_at = null;
    sec.has_active_directive = false;
  }

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
