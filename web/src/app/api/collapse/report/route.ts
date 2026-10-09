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
  if (backendData && backendData.status !== undefined) {
    return NextResponse.json(backendData, { headers: corsHeaders });
  }

  // 2. Ingest into in-memory state
  const state = getGlobalState();
  const nowIso = new Date().toISOString();
  const clusterId = "clp_cluster_chm01";

  if (!state.collapseClusters[clusterId]) {
    state.collapseClusters[clusterId] = {
      cluster_id: clusterId,
      status: "CONFIRMED_COLLAPSE",
      priority: "P1-CRITICAL",
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

  return NextResponse.json(
    {
      success: true,
      cluster_id: clusterId,
      status: "CONFIRMED_COLLAPSE",
      reporting_devices_count: state.collapseClusters[clusterId].reporting_devices.length,
      peak_g: peakG,
      free_fall_ms: freeFallMs,
      message: "Collapse kinetic impact registered into spatiotemporal cluster",
    },
    { headers: corsHeaders }
  );
}
