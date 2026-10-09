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
  if (isConfirmed) {
    sec.status = "CONFIRMED_LANDSLIDE";
    if (!sec.confirmed_at) sec.confirmed_at = nowIso;
    sec.has_active_directive = true;
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
