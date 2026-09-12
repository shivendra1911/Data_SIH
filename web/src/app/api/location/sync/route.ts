import { NextRequest, NextResponse } from "next/server";
import { CitizenLocation } from "@/lib/types";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const device_uuid = body.device_uuid || `node-${Math.random().toString(36).substring(2, 7)}`;
    const lat = Number(body.lat) || 30.5573;
    const lng = Number(body.lng) || 79.5642;

    const citizen: CitizenLocation = {
      id: `cit-${device_uuid.replace(/[^a-zA-Z0-9_-]/g, "")}`,
      device_uuid,
      name: body.name || `Citizen [${device_uuid.slice(0, 8)}]`,
      phone: body.phone || "+91 98765 43210",
      lat,
      lng,
      is_live: true,
      last_seen_minutes_ago: 0,
      accuracy_radius_m: Number(body.accuracy) || 10,
      drift_radius_m: 0,
      battery_pct: Number(body.battery_level) || 90,
      status: body.status || "SAFE",
      sos_type: body.sos_type || "PERIODIC TELEMETRY BEACON",
      mesh_hops: Number(body.mesh_hops) || 0,
      zone_id: body.zone_id || "chamoli_01",
      medical_distress: "NONE",
    };

    if (!global.__NEERNETRA_CITIZENS__) {
      global.__NEERNETRA_CITIZENS__ = [];
    }

    const existingIndex = global.__NEERNETRA_CITIZENS__.findIndex(
      (c) => c.device_uuid === device_uuid
    );

    if (existingIndex >= 0) {
      const currentStatus = global.__NEERNETRA_CITIZENS__[existingIndex].status;
      global.__NEERNETRA_CITIZENS__[existingIndex] = {
        ...global.__NEERNETRA_CITIZENS__[existingIndex],
        ...citizen,
        status: currentStatus === "SOS" ? "SOS" : citizen.status,
      };
    } else {
      global.__NEERNETRA_CITIZENS__.unshift(citizen);
    }

    return NextResponse.json(
      { success: true, message: "Location synced", device_uuid, lat, lng },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to sync location", details: err.message },
      { status: 400, headers: corsHeaders }
    );
  }
}
