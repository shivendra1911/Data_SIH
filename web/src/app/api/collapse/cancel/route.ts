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

  const deviceUuid = body.device_uuid;

  // 1. Forward to FastAPI backend if running
  const backendData = await proxyToBackend<any>("/api/collapse/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (backendData && backendData.success !== undefined) {
    return NextResponse.json(backendData, { headers: corsHeaders });
  }

  // 2. Fallback to in-memory state
  const state = getGlobalState();
  const affectedClusters: string[] = [];

  // Update citizen status in active radar store
  if (global.__NEERNETRA_CITIZENS__ && deviceUuid) {
    const citIdx = global.__NEERNETRA_CITIZENS__.findIndex((c) => c.device_uuid === deviceUuid);
    if (citIdx >= 0) {
      global.__NEERNETRA_CITIZENS__[citIdx].status = "SAFE";
      global.__NEERNETRA_CITIZENS__[citIdx].medical_distress = "NONE";
      global.__NEERNETRA_CITIZENS__[citIdx].sos_type = "SAFE CONFIRMATION";
    }
  }

  // Remove from active collapse clusters
  for (const [cid, cl] of Object.entries(state.collapseClusters)) {
    if (deviceUuid && cl.reporting_devices.includes(deviceUuid)) {
      cl.reporting_devices = cl.reporting_devices.filter((d) => d !== deviceUuid);
      cl.trapped_headcount = cl.reporting_devices.length;
      if (cl.reporting_devices.length < 3 && cl.status === "CONFIRMED_COLLAPSE") {
        cl.status = "PENDING_QUORUM";
        cl.priority = "P2-HIGH";
      }
      if (cl.reporting_devices.length === 0) {
        cl.status = "RESOLVED_SAFE";
        cl.priority = "NORMAL";
      }
      affectedClusters.push(cid);
    }
  }

  return NextResponse.json(
    {
      success: true,
      status: "CANCELLED",
      message: "Collapse alarm safely cancelled by user ('I AM SAFE' verified)",
      affected_clusters: affectedClusters,
    },
    { headers: corsHeaders }
  );
}
