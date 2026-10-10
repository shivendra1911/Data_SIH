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

export async function GET() {
  const mockKeywords = ["test", "dummy", "mock", "demo", "synthetic", "audit", "fake", "col_phone", "ramesh", "anita", "katy", "seed", "cloud_device"];
  const citizens = (global.__NEERNETRA_CITIZENS__ || []).filter((c) => {
    const d = (c.device_uuid || "").toLowerCase();
    const n = (c.name || "").toLowerCase();
    return !mockKeywords.some((kw) => d.includes(kw) || n.includes(kw));
  });
  return NextResponse.json(
    {
      status: "success",
      total: citizens.length,
      citizens,
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const device_uuid = body.device_uuid || `node-${Math.random().toString(36).substring(2, 7)}`;
    const lat = Number(body.lat) || 30.5573;
    const lng = Number(body.lng) || 79.5642;

    let parsedName = body.name;
    if (!parsedName && body.notes) {
      const parts = body.notes.split("|");
      if (parts[0] && parts[0].trim().length > 0) {
        parsedName = parts[0].trim();
      }
    }
    if (!parsedName) {
      parsedName = `Citizen [${device_uuid.slice(0, 8)}]`;
    }

    const mockKeywords = ["test", "dummy", "mock", "demo", "synthetic", "audit", "fake", "col_phone", "ramesh", "anita", "katy", "seed", "cloud_device"];
    const lowerDev = device_uuid.toLowerCase();
    const lowerName = parsedName.toLowerCase();
    if (mockKeywords.some((kw) => lowerDev.includes(kw) || lowerName.includes(kw))) {
      return NextResponse.json({ status: "ignored_mock_device" }, { headers: corsHeaders });
    }

    const citizen: CitizenLocation = {
      id: `cit-${device_uuid.replace(/[^a-zA-Z0-9_-]/g, "")}`,
      device_uuid,
      name: parsedName,
      phone: body.phone || "+91 98765 43210",
      lat,
      lng,
      is_live: true,
      last_seen_minutes_ago: 0,
      accuracy_radius_m: Number(body.accuracy ?? body.accuracy_radius_m ?? 10),
      drift_radius_m: 0,
      battery_pct: Number(body.battery_pct ?? body.battery_level ?? 90),
      status: body.status || "SAFE",
      sos_type: body.sos_type || "PERIODIC TELEMETRY BEACON",
      mesh_hops: Number(body.mesh_hops) || 0,
      zone_id: body.zone_id || "chamoli_01",
      medical_distress: body.medical_distress || "NONE",
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

    // Mirror to FastAPI backend asynchronously to maintain active sector quorum nodes
    try {
      const { proxyToBackend } = await import("@/lib/sentinelState");
      proxyToBackend("/api/location/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_uuid,
          lat,
          lng,
          altitude: Number(body.altitude) || 1450,
          accuracy: Number(body.accuracy ?? body.accuracy_radius_m ?? 5.0),
          battery_level: Number(body.battery_pct ?? body.battery_level ?? 85),
          last_synced_at: body.last_synced_at || new Date().toISOString(),
          zone_id: body.zone_id || "chamoli_01",
        }),
      }).catch(() => {});
    } catch {}

    return NextResponse.json(
      { success: true, message: "Location synced", device_uuid, lat, lng, total_connected: global.__NEERNETRA_CITIZENS__.length },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to sync location", details: err.message },
      { status: 400, headers: corsHeaders }
    );
  }
}
