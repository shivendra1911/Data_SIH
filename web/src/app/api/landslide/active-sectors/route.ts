import { NextResponse } from "next/server";
import { getGlobalState, proxyToBackend } from "@/lib/sentinelState";
import { supabase } from "@/lib/supabase";

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
  if (backendData && Array.isArray(backendData.sectors) && backendData.sectors.length > 0) {
    return NextResponse.json(backendData, { headers: corsHeaders });
  }

  // 2. Fall back to shared state + Supabase Cloud table (cross-serverless synchronization)
  const state = getGlobalState();
  const nowTs = Date.now() / 1000;
  const sectorsMap = new Map<string, any>();

  // Initialize with in-memory sectors
  for (const [secId, sec] of Object.entries(state.sectors)) {
    const activeReports = (sec.reports || []).filter(
      (r) => nowTs - (r.timestamp_sec || nowTs) <= 900.0
    );
    const uniqueDevices = Array.from(new Set(activeReports.map((r) => r.device_uuid)));
    const totalPhones = sec.total_active_phones || 9;
    const threshold = Math.max(2, Math.ceil(totalPhones / 3.0));
    const isConfirmed = uniqueDevices.length >= threshold;
    const isPending = uniqueDevices.length > 0;

    sectorsMap.set(secId, {
      sector_id: sec.sector_id,
      sector_name: sec.sector_name,
      lat: sec.lat,
      lng: sec.lng,
      total_active_phones: totalPhones,
      quorum_threshold: threshold,
      status: isConfirmed ? "CONFIRMED_LANDSLIDE" : isPending ? "PENDING_QUORUM" : "MONITORING",
      reporting_devices: uniqueDevices,
      first_detected_at: sec.first_detected_at,
      last_report_at: sec.last_report_at,
      latest_tremor_g: sec.latest_tremor_g,
      latest_frequency_hz: sec.latest_frequency_hz,
      confirmed_at: sec.confirmed_at,
      reporting_count: uniqueDevices.length,
      consensus_ratio_percent: Math.round((uniqueDevices.length / totalPhones) * 1000) / 10,
      has_active_directive: isConfirmed || sec.has_active_directive,
    });
  }

  // 3. Query recent landslide reports from Supabase Cloud
  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: supaReports, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("sos_type", "LANDSLIDE")
      .neq("status", "RESOLVED_SAFE")
      .gte("created_at", thirtyMinsAgo)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(supaReports) && supaReports.length > 0) {
      for (const row of supaReports) {
        let notesData: any = {};
        try {
          if (row.notes) notesData = JSON.parse(row.notes);
        } catch {}

        const lat = Number(row.lat);
        const lng = Number(row.lng);
        const sectorId = notesData.sector_id || `sector_${lat.toFixed(2).replace(".", "_")}_${lng.toFixed(2).replace(".", "_")}`;
        const sectorName = notesData.sector_name || `Sector [${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E]`;
        const deviceId = row.device_id || "phone_unknown";
        const tremorG = Number(notesData.tremor_g) || 0.22;
        const freqHz = Number(notesData.frequency_hz) || 18.5;

        if (!sectorsMap.has(sectorId)) {
          sectorsMap.set(sectorId, {
            sector_id: sectorId,
            sector_name: sectorName,
            lat,
            lng,
            total_active_phones: 9,
            quorum_threshold: 3,
            status: "PENDING_QUORUM",
            reporting_devices: [deviceId],
            first_detected_at: row.created_at,
            last_report_at: row.created_at,
            latest_tremor_g: tremorG,
            latest_frequency_hz: freqHz,
            confirmed_at: null,
            reporting_count: 1,
            consensus_ratio_percent: 11.1,
            has_active_directive: false,
          });
        } else {
          const sec = sectorsMap.get(sectorId);
          if (!sec.reporting_devices.includes(deviceId)) {
            sec.reporting_devices.push(deviceId);
            sec.reporting_count = sec.reporting_devices.length;
            sec.consensus_ratio_percent = Math.round((sec.reporting_count / sec.total_active_phones) * 1000) / 10;
          }
          sec.latest_tremor_g = Math.max(sec.latest_tremor_g, tremorG);
          sec.latest_frequency_hz = freqHz;
        }
      }
    }
  } catch {}

  // Recalculate quorum confirmation
  const sectorsList = Array.from(sectorsMap.values()).map((sec) => {
    const isConfirmed = sec.reporting_count >= sec.quorum_threshold;
    const isPending = sec.reporting_count > 0;
    return {
      ...sec,
      status: isConfirmed ? "CONFIRMED_LANDSLIDE" : isPending ? "PENDING_QUORUM" : "MONITORING",
      has_active_directive: isConfirmed || sec.has_active_directive,
    };
  });

  // Sort sectors: CONFIRMED first, then PENDING, then others
  sectorsList.sort((a, b) => {
    const score = (s: typeof a) => {
      if (s.status === "CONFIRMED_LANDSLIDE") return 100 + s.reporting_count;
      if (s.status === "PENDING_QUORUM") return 50 + s.reporting_count;
      if (s.reporting_count > 0) return 20 + s.reporting_count;
      return 0;
    };
    return score(b) - score(a);
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
