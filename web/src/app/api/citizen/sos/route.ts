import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { CitizenLocation, SOSEvent } from "@/lib/types";

declare global {
  var __NEERNETRA_SOS_EVENTS__: SOSEvent[] | undefined;
  var __NEERNETRA_CITIZENS__: CitizenLocation[] | undefined;
}

if (!global.__NEERNETRA_SOS_EVENTS__) {
  global.__NEERNETRA_SOS_EVENTS__ = [];
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

    const device_uuid = body.device_uuid || `node-${Date.now().toString(36)}`;
    const lat = Number(body.lat) || 30.5573;
    const lng = Number(body.lng) || 79.5642;
    const status = body.status || "SOS";
    const sos_type = body.sos_type || "MOBILE DISTRESS BEACON";
    const is_mesh_relayed = Boolean(body.is_mesh_relayed);
    const battery_pct = Number(body.battery_pct ?? body.battery_level ?? 85);
    const accuracy = Number(body.accuracy_radius_m ?? body.accuracy ?? 10);
    const medical_distress = body.medical_distress || "WATER_RISING";
    const zone_id = body.zone_id || "chamoli_01";

    let name = body.name;
    if (!name && body.notes) {
      const parts = body.notes.split("|");
      if (parts[0] && parts[0].trim().length > 0) {
        name = parts[0].trim();
      }
    }
    if (!name) {
      name = `Citizen [${device_uuid.slice(0, 8)}]`;
    }

    const eventRecord: SOSEvent = {
      id: `sos-${Date.now()}`,
      device_uuid,
      lat,
      lng,
      status: status as any,
      sos_type,
      is_mesh_relayed,
      created_at: new Date().toISOString(),
    };

    global.__NEERNETRA_SOS_EVENTS__!.unshift(eventRecord);
    if (global.__NEERNETRA_SOS_EVENTS__!.length > 150) {
      global.__NEERNETRA_SOS_EVENTS__!.pop();
    }

    const citizenRecord: CitizenLocation = {
      id: `cit-${device_uuid.replace(/[^a-zA-Z0-9_-]/g, "")}`,
      device_uuid,
      name,
      phone: body.phone || "+91 98765 43210",
      lat,
      lng,
      is_live: true,
      last_seen_minutes_ago: 0,
      accuracy_radius_m: accuracy,
      drift_radius_m: 0,
      battery_pct,
      status: "SOS",
      sos_type,
      mesh_hops: is_mesh_relayed ? Number(body.mesh_hops || 2) : 0,
      zone_id: zone_id as any,
      medical_distress: medical_distress as any,
      mesh_relay_chain: is_mesh_relayed
        ? [name, "BLE-Relay-Node-01", "Raini Command Tower"]
        : undefined,
    };

    const existingIndex = global.__NEERNETRA_CITIZENS__!.findIndex(
      (c) => c.device_uuid === device_uuid || c.id === citizenRecord.id
    );

    if (existingIndex >= 0) {
      global.__NEERNETRA_CITIZENS__![existingIndex] = {
        ...global.__NEERNETRA_CITIZENS__![existingIndex],
        ...citizenRecord,
      };
    } else {
      global.__NEERNETRA_CITIZENS__!.unshift(citizenRecord);
    }

    // Non-blocking attempt to push to Supabase with timeout
    try {
      const insertPromise = supabase.from("sos_alerts").insert([
        {
          device_id: device_uuid,
          lat,
          lng,
          status: "SOS",
          sos_type,
          battery_level: battery_pct,
          notes: body.notes || `${name} | ${body.phone || "+91 98765 43210"}`,
        },
      ]);
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
      await Promise.race([insertPromise, timeoutPromise]);
    } catch {
      // Graceful fallback on DNS / offline
    }

    return NextResponse.json(
      {
        success: true,
        message_id: `msg_${Date.now()}`,
        status: "SOS_SIGNAL_RECEIVED",
        citizen: citizenRecord,
        event: eventRecord,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process SOS signal" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET() {
  const events = global.__NEERNETRA_SOS_EVENTS__ || [];
  const sosCitizens = (global.__NEERNETRA_CITIZENS__ || []).filter(
    (c) => c.status === "SOS"
  );
  return NextResponse.json(
    {
      status: "success",
      total_events: events.length,
      sos_citizens_count: sosCitizens.length,
      events,
      citizens: sosCitizens,
    },
    { headers: corsHeaders }
  );
}
