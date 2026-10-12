import { NextResponse } from "next/server";
import { getGlobalState, proxyToBackend } from "@/lib/sentinelState";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  // 1. Try external FastAPI backend if running
  const backendData = await proxyToBackend<any>("/api/landslide/active-sectors");
  if (backendData && Array.isArray(backendData.sectors)) {
    return NextResponse.json(backendData, { headers: corsHeaders });
  }

  // 2. Fall back to shared in-memory state
  const state = getGlobalState();
  const nowTs = Date.now() / 1000;

  const sectorsList = Object.values(state.sectors).map((sec) => {
    // Retain reports within last 60 seconds
    const activeReports = (sec.reports || []).filter(
      (r) => nowTs - (r.timestamp_sec || nowTs) <= 60.0
    );
    const uniqueDevices = Array.from(new Set(activeReports.map((r) => r.device_uuid)));
    const totalPhones = sec.total_active_phones || 9;
    const threshold = Math.max(2, Math.ceil(totalPhones / 3.0));

    let status = sec.status;
    if (uniqueDevices.length >= threshold) {
      status = "CONFIRMED_LANDSLIDE";
      sec.status = "CONFIRMED_LANDSLIDE";
    } else if (uniqueDevices.length > 0) {
      status = "PENDING_QUORUM";
      sec.status = "PENDING_QUORUM";
    } else {
      status = "MONITORING";
      sec.status = "MONITORING";
      sec.has_active_directive = false;
    }

    const reportingCount = uniqueDevices.length;
    const consensusRatioPercent = Math.round((reportingCount / totalPhones) * 1000) / 10;

    return {
      sector_id: sec.sector_id,
      sector_name: sec.sector_name,
      lat: sec.lat,
      lng: sec.lng,
      total_active_phones: totalPhones,
      quorum_threshold: threshold,
      status,
      reporting_devices: uniqueDevices,
      first_detected_at: sec.first_detected_at,
      last_report_at: sec.last_report_at,
      latest_tremor_g: sec.latest_tremor_g,
      latest_frequency_hz: sec.latest_frequency_hz,
      confirmed_at: sec.confirmed_at,
      reporting_count: reportingCount,
      consensus_ratio_percent: consensusRatioPercent,
      has_active_directive: status === "CONFIRMED_LANDSLIDE" || sec.has_active_directive,
    };
  });

  return NextResponse.json(
    {
      total_monitored_sectors: sectorsList.length,
      confirmed_landslides_count: sectorsList.filter((s) => s.status === "CONFIRMED_LANDSLIDE").length,
      sectors: sectorsList,
    },
    { headers: corsHeaders }
  );
}
