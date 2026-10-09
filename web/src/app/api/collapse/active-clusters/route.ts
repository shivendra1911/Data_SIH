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
  // 1. Try external FastAPI backend on port 8000
  const backendData = await proxyToBackend<any>("/api/collapse/active-clusters");
  if (backendData && Array.isArray(backendData.clusters)) {
    return NextResponse.json(backendData, { headers: corsHeaders });
  }

  // 2. Return shared in-memory collapse clusters
  const state = getGlobalState();
  const clustersList = Object.values(state.collapseClusters);

  return NextResponse.json(
    {
      total_active_clusters: clustersList.length,
      confirmed_clusters_count: clustersList.filter((c) => c.status === "CONFIRMED_COLLAPSE").length,
      clusters: clustersList,
    },
    { headers: corsHeaders }
  );
}
