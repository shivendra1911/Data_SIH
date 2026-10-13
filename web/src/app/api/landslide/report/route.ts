import { NextRequest, NextResponse } from "next/server";
import { getGlobalState, proxyToBackend } from "@/lib/sentinelState";
import { supabase } from "@/lib/supabase";
import { CitizenLocation } from "@/lib/types";
import { checkRateLimit } from "@/lib/security";
import type { MobileSirenRecord } from "@/app/api/mobile/siren-dispatch/route";

declare global {
  var __NEERNETRA_MOBILE_SIREN_DISPATCHES__: Map<string, MobileSirenRecord> | undefined;
  var __NEERNETRA_CITIZENS__: CitizenLocation[] | undefined;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rateLimit = checkRateLimit(`landslide_${clientIp}`, 60, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many landslide reports. Please wait.", retry_after_sec: rateLimit.retryAfterSec },
      { status: 429, headers: corsHeaders }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const lat = Number(body.lat) || 27.6015;
  const lng = Number(body.lng) || 77.5975;
  const autoSectorId = `sector_${lat.toFixed(2).replace('.', '_')}_${lng.toFixed(2).replace('.', '_')}`;
  const autoSectorName = `Sector [${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E]`;
  const sectorId = body.sector_id || autoSectorId;
  const sectorName = body.sector_name || autoSectorName;
  const deviceUuid = body.device_uuid || `dev_ls_${Math.random().toString(36).substring(2, 8)}`;
  const tremorG = Number(body.tremor_g) || 0.22;
  const frequencyHz = Number(body.frequency_hz) || 18.5;
  const durationS = Number(body.duration_s) || 30;
  const nowTs = Date.now() / 1000;
  const nowIso = new Date().toISOString();

  const state = getGlobalState();

  if (!state.sectors[sectorId]) {
    state.sectors[sectorId] = {
      sector_id: sectorId,
      sector_name: sectorName,
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

  // Retain reports within last 15 minutes (900s)
  sec.reports = sec.reports.filter((r) => nowTs - r.timestamp_sec <= 900.0);
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

    // Siren Dispatch to mobile phones
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
  } else {
    sec.status = "PENDING_QUORUM";
  }

  // CRITICAL: Insert EVERY tremor report to Supabase sos_alerts table for cross-serverless persistence!
  try {
    const reportInsert = {
      device_id: deviceUuid,
      lat,
      lng,
      sos_type: "LANDSLIDE",
      status: isConfirmed ? "CONFIRMED_LANDSLIDE" : "PENDING_QUORUM",
      battery_level: 85,
      notes: JSON.stringify({
        sector_id: sectorId,
        sector_name: sectorName,
        tremor_g: tremorG,
        frequency_hz: frequencyHz,
        duration_s: durationS,
        timestamp: nowIso,
      }),
    };
    supabase.from("sos_alerts").insert([reportInsert]).then(() => {});
  } catch {}

  // Forward to FastAPI asynchronously if running
  proxyToBackend<any>("/api/landslide/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});

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
      latest_frequency_hz: frequencyHz,
      latest_tremor_g: tremorG,
    },
    { headers: corsHeaders }
  );
}
