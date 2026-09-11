import { NextRequest, NextResponse } from "next/server";
import { INITIAL_CITIZEN_LOCATIONS } from "@/lib/constants";
import { CitizenLocation } from "@/lib/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

let citizenStore: CitizenLocation[] = [...INITIAL_CITIZEN_LOCATIONS];

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const isLiveFilter = searchParams.get("is_live");

  let result = citizenStore;
  if (statusFilter) {
    result = result.filter((c) => c.status === statusFilter);
  }
  if (isLiveFilter !== null) {
    const isLive = isLiveFilter === "true";
    result = result.filter((c) => c.is_live === isLive);
  }

  const liveCount = result.filter((c) => c.is_live).length;
  const lastKnownCount = result.filter((c) => !c.is_live).length;

  return NextResponse.json(
    {
      status: "success",
      total: result.length,
      live_count: liveCount,
      last_known_count: lastKnownCount,
      citizens: result,
      last_synced: new Date().toISOString(),
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newCitizen: CitizenLocation = {
      id: body.id || `cit-${Date.now()}`,
      device_uuid: body.device_uuid || `node-${Math.random().toString(36).substring(2, 7)}`,
      lat: Number(body.lat) || 30.5573,
      lng: Number(body.lng) || 79.5642,
      is_live: body.is_live !== undefined ? Boolean(body.is_live) : true,
      last_seen_minutes_ago: Number(body.last_seen_minutes_ago) || 0,
      accuracy_radius_m: Number(body.accuracy_radius_m) || 15,
      drift_radius_m: Number(body.drift_radius_m) || (body.is_live ? 0 : 300),
      battery_pct: Number(body.battery_pct) || 80,
      status: body.status || "SOS",
      sos_type: body.sos_type || "DISTRESS SIGNAL",
      mesh_hops: Number(body.mesh_hops) || 0,
    };

    citizenStore = [newCitizen, ...citizenStore];

    return NextResponse.json(
      { success: true, citizen: newCitizen },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to record citizen location", details: err.message },
      { status: 400, headers: corsHeaders }
    );
  }
}
