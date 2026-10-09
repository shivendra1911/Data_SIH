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

  const deviceUuid = body.device_uuid || `dev_${Math.random().toString(36).substring(2, 8)}`;
  const lat = Number(body.lat) || 30.5512;
  const lng = Number(body.lng) || 79.5621;
  const peakG = Number(body.peak_g) || 4.2;
  const freeFallMs = Number(body.free_fall_ms) || 350;
  const confidence = Number(body.confidence) || 0.92;

  // 1. Forward to FastAPI backend if available
  const backendData = await proxyToBackend<any>("/api/collapse/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (backendData && (backendData.status !== undefined || backendData.cluster_status !== undefined || backendData.success !== undefined)) {
    return NextResponse.json(backendData, { headers: corsHeaders });
  }

  // 2. Ingest into in-memory state
  const state = getGlobalState();
  const nowIso = new Date().toISOString();
  const clusterId = "clp_cluster_chm01";

  if (!state.collapseClusters[clusterId]) {
    state.collapseClusters[clusterId] = {
      cluster_id: clusterId,
      status: "PENDING_QUORUM",
      priority: "P2-HIGH",
      centroid_lat: lat,
      centroid_lng: lng,
      radius_meters: 65,
      reporting_devices: [deviceUuid],
      trapped_headcount: 1,
      first_detected_at: nowIso,
      last_report_at: nowIso,
      max_peak_g: peakG,
      average_confidence: confidence,
      elapsed_seconds: 0,
      dispatched: false,
    };
  } else {
    const cl = state.collapseClusters[clusterId];
    if (!cl.reporting_devices.includes(deviceUuid)) {
      cl.reporting_devices.push(deviceUuid);
      cl.trapped_headcount = cl.reporting_devices.length;
    }
    cl.last_report_at = nowIso;
    cl.max_peak_g = Math.max(cl.max_peak_g, peakG);
  }

  const cl = state.collapseClusters[clusterId];
  const quorumCount = cl.reporting_devices.length;
  const isConfirmed = quorumCount >= 3;
  cl.status = isConfirmed ? "CONFIRMED_COLLAPSE" : "PENDING_QUORUM";
  cl.priority = isConfirmed ? "P1-CRITICAL" : "P2-HIGH";

  // Mirror into active citizen radar
  if (!global.__NEERNETRA_CITIZENS__) {
    global.__NEERNETRA_CITIZENS__ = [];
  }
  const existingCitIdx = global.__NEERNETRA_CITIZENS__.findIndex((c) => c.device_uuid === deviceUuid);
  const collCit = {
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
    status: "SOS" as const,
    sos_type: "COLLAPSE",
    mesh_hops: 0,
    zone_id: "chamoli_01",
    medical_distress: "TRAPPED" as any,
  };
  if (existingCitIdx >= 0) {
    global.__NEERNETRA_CITIZENS__[existingCitIdx] = { ...global.__NEERNETRA_CITIZENS__[existingCitIdx], ...collCit };
  } else {
    global.__NEERNETRA_CITIZENS__.unshift(collCit);
  }

  return NextResponse.json(
    {
      success: true,
      cluster_id: clusterId,
      status: cl.status,
      cluster_status: cl.status,
      quorum_count: quorumCount,
      quorum_threshold: 3,
      is_confirmed: isConfirmed,
      reporting_devices_count: quorumCount,
      peak_g: peakG,
      free_fall_ms: freeFallMs,
      message: isConfirmed
        ? "🏛️ 3+ Phones Confirmed Structural Collapse Quorum! Cluster marked CONFIRMED_COLLAPSE"
        : `Kinetic shock registered (${quorumCount}/3 devices needed for collapse quorum confirmation)`,
    },
    { headers: corsHeaders }
  );
}
