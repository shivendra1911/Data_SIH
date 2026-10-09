import { NextRequest, NextResponse } from "next/server";
import { getGlobalState, proxyToBackend } from "@/lib/sentinelState";
import { supabase } from "@/lib/supabase";
import { CitizenLocation } from "@/lib/types";

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
  const deviceUuid = body.device_uuid || `dev_${Math.random().toString(36).substring(2, 8)}`;
  const tremorG = Number(body.tremor_g) || 0.18;
  const frequencyHz = Number(body.frequency_hz) || 18.5;
  const durationS = Number(body.duration_s) || 30;
  const lat = Number(body.lat) || 11.5273;
  const lng = Number(body.lng) || 76.1242;

  // 1. Try forwarding to FastAPI backend
  const backendData = await proxyToBackend<any>("/api/landslide/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (backendData && backendData.success !== undefined) {
    if (backendData.is_confirmed) {
      const emergencyMessage = "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW";
      const nowIso = new Date().toISOString();
      const secName = backendData.sector_name || body.sector_name || "Sector 4: Chooralmala / Meppadi (Wayanad)";
      const totalPhones = backendData.total_active_phones || 9;

      if (!global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__) {
        global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__ = new Map();
      }
      global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__.set(sectorId, {
        zone_id: sectorId,
        zone_name: secName,
        is_active: true,
        dispatched_at: nowIso,
        authorized_by: "1/3rd Sector Quorum Consensus Engine",
        target_devices_count: totalPhones,
        cell_broadcast_channels: ["CB-4370 (Govt Emergency Civic Alarm)", "CB-919 (NDRF Audio Alert)"],
        mobile_audio_action: "FORCE_MAX_VOLUME_EMERGENCY_SIREN_AND_VIBRATION",
        vibration_pattern: [1000, 400, 1000, 400, 1500],
        emergency_message: emergencyMessage,
      });

      // Mirror confirmed landslide distress to radar citizens store
      if (!global.__NEERNETRA_CITIZENS__) {
        global.__NEERNETRA_CITIZENS__ = [];
      }
      const existingCitIdx = global.__NEERNETRA_CITIZENS__.findIndex((c) => c.device_uuid === deviceUuid);
      const lsCitizen: CitizenLocation = {
        id: `cit-${deviceUuid.replace(/[^a-zA-Z0-9_-]/g, "")}`,
        device_uuid: deviceUuid,
        name: `Citizen [${deviceUuid.slice(0, 8)}]`,
        phone: "+91 98765 43210",
        lat,
        lng,
        is_live: true,
        last_seen_minutes_ago: 0,
        accuracy_radius_m: 10,
        drift_radius_m: 0,
        battery_pct: 85,
        status: "SOS",
        sos_type: "LANDSLIDE",
        mesh_hops: 0,
        zone_id: "chamoli_01",
        medical_distress: "WATER_RISING",
      };
      if (existingCitIdx >= 0) {
        global.__NEERNETRA_CITIZENS__[existingCitIdx] = { ...global.__NEERNETRA_CITIZENS__[existingCitIdx], ...lsCitizen };
      } else {
        global.__NEERNETRA_CITIZENS__.unshift(lsCitizen);
      }

      // Automated Cloud Push via Supabase Cloud Realtime
      try {
        supabase.from("sos_alerts").insert([
          {
            device_id: "ADMIN_SIREN_DISPATCH",
            lat,
            lng,
            sos_type: "CIVIL_DEFENSE_SIREN",
            status: "ACTIVE_SIREN",
            battery_level: 100,
            notes: JSON.stringify({
              zone_id: sectorId,
              zone_name: secName,
              action: "BROADCAST_ALL",
              flood_pct: 95.0,
              message: emergencyMessage,
              created_at: nowIso,
            }),
          },
        ]).then(() => {});
      } catch {}
    }
    return NextResponse.json(backendData, { headers: corsHeaders });
  }

  // 2. Fall back to local in-memory state
  const state = getGlobalState();
  const nowTs = Date.now() / 1000;
  const nowIso = new Date().toISOString();

  if (!state.sectors[sectorId]) {
    state.sectors[sectorId] = {
      sector_id: sectorId,
      sector_name: body.sector_name || "Sector 4: Chooralmala / Meppadi (Wayanad)",
      lat,
      lng,
      total_active_phones: 9,
      quorum_threshold: 3,
      status: "MONITORING",
      reporting_devices: [],
      reports: [],
      first_detected_at: nowIso,
      last_report_at: nowIso,
      latest_tremor_g: tremorG,
      latest_frequency_hz: frequencyHz,
      confirmed_at: null,
      has_active_directive: false,
    };
  }

  const sec = state.sectors[sectorId];
  if (!sec.first_detected_at) sec.first_detected_at = nowIso;
  sec.last_report_at = nowIso;
  sec.latest_tremor_g = tremorG;
  sec.latest_frequency_hz = frequencyHz;
  sec.lat = lat;
  sec.lng = lng;

  // Append report
  sec.reports.push({
    id: `rep_${Date.now()}`,
    device_uuid: deviceUuid,
    tremor_g: tremorG,
    frequency_hz: frequencyHz,
    duration_s: durationS,
    timestamp_sec: nowTs,
    received_at: nowIso,
  });

  // Retain reports within last 60s
  sec.reports = sec.reports.filter((r) => nowTs - r.timestamp_sec <= 60.0);
  const uniqueDevices = Array.from(new Set(sec.reports.map((r) => r.device_uuid)));
  sec.reporting_devices = uniqueDevices;

  const totalPhones = sec.total_active_phones || 9;
  const quorumThreshold = Math.max(2, Math.ceil(totalPhones / 3.0));
  sec.quorum_threshold = quorumThreshold;

  const isConfirmed = uniqueDevices.length >= quorumThreshold;
  const emergencyMessage = "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW";

  if (isConfirmed) {
    sec.status = "CONFIRMED_LANDSLIDE";
    if (!sec.confirmed_at) sec.confirmed_at = nowIso;
    sec.has_active_directive = true;

    // 1. Append active directive to in-memory state
    const directiveEntry = {
      id: `broad_landslide_${sectorId}`,
      type: "LANDSLIDE_1_3RD_CONSENSUS",
      severity: "CRITICAL",
      title: "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS",
      message: emergencyMessage,
      sector_id: sectorId,
      sector_name: sec.sector_name,
      consensus_count: uniqueDevices.length,
      quorum_threshold: quorumThreshold,
      status: "ACTIVE_SIREN",
      authorized_by: "1/3rd Sector Quorum Consensus Engine",
      created_at: nowIso,
    };
    const existingDirIdx = state.directives.findIndex((d) => d.sector_id === sectorId);
    if (existingDirIdx >= 0) {
      state.directives[existingDirIdx] = directiveEntry;
    } else {
      state.directives.push(directiveEntry);
    }

    // 2. Automated Siren Dispatch: Activate mobile sirens via /api/mobile/siren-dispatch store
    if (!global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__) {
      global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__ = new Map();
    }
    global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__.set(sectorId, {
      zone_id: sectorId,
      zone_name: sec.sector_name,
      is_active: true,
      dispatched_at: nowIso,
      authorized_by: "1/3rd Sector Quorum Consensus Engine",
      target_devices_count: totalPhones,
      cell_broadcast_channels: ["CB-4370 (Govt Emergency Civic Alarm)", "CB-919 (NDRF Audio Alert)"],
      mobile_audio_action: "FORCE_MAX_VOLUME_EMERGENCY_SIREN_AND_VIBRATION",
      vibration_pattern: [1000, 400, 1000, 400, 1500],
      emergency_message: emergencyMessage,
    });

    // 3. Automated Cloud Push via Supabase Cloud Realtime
    try {
      supabase.from("sos_alerts").insert([
        {
          device_id: "ADMIN_SIREN_DISPATCH",
          lat,
          lng,
          sos_type: "CIVIL_DEFENSE_SIREN",
          status: "ACTIVE_SIREN",
          battery_level: 100,
          notes: JSON.stringify({
            zone_id: sectorId,
            zone_name: sec.sector_name,
            action: "BROADCAST_ALL",
            flood_pct: 95.0,
            message: emergencyMessage,
            created_at: nowIso,
          }),
        },
      ]).then(() => {});
    } catch {}

    // 4. Mirror confirmed landslide distress to radar citizens store
    if (!global.__NEERNETRA_CITIZENS__) {
      global.__NEERNETRA_CITIZENS__ = [];
    }
    const existingCitIdx = global.__NEERNETRA_CITIZENS__.findIndex((c) => c.device_uuid === deviceUuid);
    const lsCitizen: CitizenLocation = {
      id: `cit-${deviceUuid.replace(/[^a-zA-Z0-9_-]/g, "")}`,
      device_uuid: deviceUuid,
      name: `Citizen [${deviceUuid.slice(0, 8)}]`,
      phone: "+91 98765 43210",
      lat,
      lng,
      is_live: true,
      last_seen_minutes_ago: 0,
      accuracy_radius_m: 10,
      drift_radius_m: 0,
      battery_pct: 85,
      status: "SOS",
      sos_type: "LANDSLIDE",
      mesh_hops: 0,
      zone_id: "chamoli_01",
      medical_distress: "WATER_RISING",
    };
    if (existingCitIdx >= 0) {
      global.__NEERNETRA_CITIZENS__[existingCitIdx] = { ...global.__NEERNETRA_CITIZENS__[existingCitIdx], ...lsCitizen };
    } else {
      global.__NEERNETRA_CITIZENS__.unshift(lsCitizen);
    }
  } else {
    sec.status = "PENDING_QUORUM";
  }

  const consensusRatioPercent = Math.round((uniqueDevices.length / totalPhones) * 1000) / 10;

  return NextResponse.json(
    {
      success: true,
      sector_id: sectorId,
      sector_name: sec.sector_name,
      status: sec.status,
      reporting_count: uniqueDevices.length,
      quorum_threshold: quorumThreshold,
      total_active_phones: totalPhones,
      consensus_ratio_percent: consensusRatioPercent,
      is_confirmed: isConfirmed,
      directive_broadcast_active: isConfirmed,
    },
    { headers: corsHeaders }
  );
}
