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

  const clusterId = body.cluster_id || "clp_cluster_chm01";

  // Forward to FastAPI if available
  await proxyToBackend("/api/collapse/dispatch-usar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const state = getGlobalState();
  const nowIso = new Date().toISOString();

  if (state.collapseClusters[clusterId]) {
    state.collapseClusters[clusterId].dispatched = true;
    state.collapseClusters[clusterId].dispatched_at = nowIso;
  }

  return NextResponse.json(
    {
      success: true,
      cluster_id: clusterId,
      message: `Urban Search and Rescue (USAR) tactical team dispatched to cluster ${clusterId}`,
      dispatched_at: nowIso,
    },
    { headers: corsHeaders }
  );
}
