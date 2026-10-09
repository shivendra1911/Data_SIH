import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  // 1. Try external FastAPI backend on port 8000
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    const backendRes = await fetch(`${backendUrl}/api/collapse/active-clusters`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data, { headers: corsHeaders });
    }
  } catch {
    // Backend offline or running in pure edge mode (Vercel)
  }

  // 2. Return fallback simulated structural collapse cluster for live demonstration
  const now = new Date();
  const demoClusters = [
    {
      cluster_id: "clp_cluster_chm01",
      status: "CONFIRMED_COLLAPSE",
      priority: "P1-CRITICAL",
      centroid_lat: 30.5512,
      centroid_lng: 79.5621,
      radius_meters: 65,
      reporting_devices: ["dev_phone_alpha", "dev_phone_bravo", "dev_phone_charlie"],
      trapped_headcount: 3,
      first_detected_at: new Date(now.getTime() - 4 * 60 * 1000).toISOString(),
      last_report_at: now.toISOString(),
      max_peak_g: 4.82,
      average_confidence: 0.94,
      elapsed_seconds: 240,
    },
    {
      cluster_id: "clp_cluster_wayanad_sector3",
      status: "PENDING_QUORUM",
      priority: "P2-HIGH",
      centroid_lat: 11.6854,
      centroid_lng: 76.132,
      radius_meters: 85,
      reporting_devices: ["dev_kerala_node_1", "dev_kerala_node_2"],
      trapped_headcount: 2,
      first_detected_at: new Date(now.getTime() - 90 * 1000).toISOString(),
      last_report_at: now.toISOString(),
      max_peak_g: 3.91,
      average_confidence: 0.88,
      elapsed_seconds: 90,
    },
  ];

  return NextResponse.json(
    {
      total_active_clusters: demoClusters.length,
      confirmed_clusters_count: demoClusters.filter((c) => c.status === "CONFIRMED_COLLAPSE").length,
      clusters: demoClusters,
    },
    { headers: corsHeaders }
  );
}
