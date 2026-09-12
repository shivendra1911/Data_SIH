import { NextRequest, NextResponse } from "next/server";
import { CitizenLocation } from "@/lib/types";

// Unified global in-memory store for citizen telemetry (0 demo data)
declare global {
  var __NEERNETRA_CITIZENS__: CitizenLocation[] | undefined;
}

if (!global.__NEERNETRA_CITIZENS__) {
  global.__NEERNETRA_CITIZENS__ = [];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zoneIdFilter = searchParams.get("zone_id");
  const statusFilter = searchParams.get("status");
  const isLiveFilter = searchParams.get("is_live");

  let result = global.__NEERNETRA_CITIZENS__ || [];
  if (zoneIdFilter) {
    result = result.filter((c) => !c.zone_id || c.zone_id === zoneIdFilter);
  }
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
    const device_uuid = body.device_uuid || `node-${Math.random().toString(36).substring(2, 7)}`;
    const newCitizen: CitizenLocation = {
      id: body.id || `cit-${device_uuid.replace(/[^a-zA-Z0-9_-]/g, "")}`,
      device_uuid,
      name: body.name || `Citizen [${device_uuid.slice(0, 8)}]`,
      phone: body.phone || "+91 98765 43210",
      lat: Number(body.lat) || 30.5573,
      lng: Number(body.lng) || 79.5642,
      is_live: body.is_live !== undefined ? Boolean(body.is_live) : true,
      last_seen_minutes_ago: Number(body.last_seen_minutes_ago) || 0,
      accuracy_radius_m: Number(body.accuracy_radius_m) || 15,
      drift_radius_m: Number(body.drift_radius_m) || (body.is_live ? 0 : 300),
      battery_pct: Number(body.battery_pct) || 80,
      status: body.status || "SOS",
      sos_type: body.sos_type || "MOBILE DISTRESS BEACON",
      mesh_hops: Number(body.mesh_hops) || 0,
      zone_id: body.zone_id || "chamoli_01",
      medical_distress: body.medical_distress || "WATER_RISING",
    };

    if (!global.__NEERNETRA_CITIZENS__) {
      global.__NEERNETRA_CITIZENS__ = [];
    }

    const existingIndex = global.__NEERNETRA_CITIZENS__.findIndex(
      (c) => c.device_uuid === device_uuid || c.id === newCitizen.id
    );

    if (existingIndex >= 0) {
      global.__NEERNETRA_CITIZENS__[existingIndex] = {
        ...global.__NEERNETRA_CITIZENS__[existingIndex],
        ...newCitizen,
      };
    } else {
      global.__NEERNETRA_CITIZENS__.unshift(newCitizen);
    }

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
