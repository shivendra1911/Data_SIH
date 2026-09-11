import { NextRequest, NextResponse } from "next/server";
import { INITIAL_MOCK_CLUSTERS } from "@/lib/constants";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zoneId = searchParams.get("zone_id") || "chamoli_01";

  // Check if external FastAPI backend is reachable on port 8000
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const backendRes = await fetch(`http://127.0.0.1:8000/api/sos/clusters?zone_id=${zoneId}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data, { headers: corsHeaders });
    }
  } catch {}

  // Return high-fidelity tactical clusters fallback
  return NextResponse.json(
    {
      status: "success",
      zone_id: zoneId,
      clusters: INITIAL_MOCK_CLUSTERS,
    },
    { headers: corsHeaders }
  );
}
