import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { INITIAL_CITIZEN_LOCATIONS } from "@/lib/constants";
import { CitizenLocation, SOSEvent } from "@/lib/types";

// Global in-memory cache for fast local retrieval and mobile synchronization
declare global {
  var __NEERNETRA_SOS_EVENTS__: SOSEvent[] | undefined;
  var __NEERNETRA_CITIZENS__: CitizenLocation[] | undefined;
}

if (!global.__NEERNETRA_SOS_EVENTS__) {
  global.__NEERNETRA_SOS_EVENTS__ = [];
}
if (!global.__NEERNETRA_CITIZENS__) {
  global.__NEERNETRA_CITIZENS__ = [...INITIAL_CITIZEN_LOCATIONS];
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

    const {
      device_uuid = `android-${Date.now().toString(36)}`,
      name,
      phone,
      lat,
      lng,
      status = "SOS",
      sos_type = "ANDROID MOBILE DISASTER BEACON",
      is_mesh_relayed = false,
      battery_pct = 85,
      accuracy_radius_m = 12,
      medical_distress = "WATER_RISING",
      zone_id = "chamoli_01",
    } = body;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "Latitude and Longitude are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const eventRecord: SOSEvent = {
      id: `sos-${Date.now()}`,
      device_uuid,
      lat: Number(lat),
      lng: Number(lng),
      status: status as any,
      sos_type,
      is_mesh_relayed: Boolean(is_mesh_relayed),
      created_at: new Date().toISOString(),
    };

    // 1. Store in global SOS stream for immediate radar plotting
    global.__NEERNETRA_SOS_EVENTS__!.unshift(eventRecord);
    if (global.__NEERNETRA_SOS_EVENTS__!.length > 150) {
      global.__NEERNETRA_SOS_EVENTS__!.pop();
    }

    // 2. Synchronize directly into Citizen Distress Telemetry Matrix
    const citizenRecord: CitizenLocation = {
      id: `cit-${device_uuid.replace(/[^a-zA-Z0-9_-]/g, "")}`,
      device_uuid,
      name: name || `Citizen [${device_uuid.slice(0, 8)}]`,
      phone: phone || "+91 98765 43210",
      lat: Number(lat),
      lng: Number(lng),
      is_live: true,
      last_seen_minutes_ago: 0,
      accuracy_radius_m: Number(accuracy_radius_m) || 12,
      drift_radius_m: 0,
      battery_pct: Number(battery_pct) || 85,
      status: "SOS",
      sos_type,
      mesh_hops: is_mesh_relayed ? 2 : 0,
      zone_id: (zone_id || "chamoli_01") as any,
      medical_distress: medical_distress as any,
      mesh_relay_chain: is_mesh_relayed
        ? [name || "Mobile Device", "BLE-Relay-Node-01", "Raini Tower"]
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

    // Try inserting into Supabase if connected
    try {
      await supabase.from("sos_events").insert([
        {
          device_uuid: eventRecord.device_uuid,
          lat: eventRecord.lat,
          lng: eventRecord.lng,
          status: eventRecord.status,
          sos_type: eventRecord.sos_type,
          is_mesh_relayed: eventRecord.is_mesh_relayed,
        },
      ]);
    } catch (dbErr) {
      // Resilient local memory sync
    }

    return NextResponse.json(
      {
        success: true,
        message_id: `msg_${Date.now()}`,
        status: "SYNCHRONIZED_TO_COMMAND_DASHBOARD",
        event: eventRecord,
        citizen: citizenRecord,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process SOS trigger" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET() {
  const events = global.__NEERNETRA_SOS_EVENTS__ || [];
  return NextResponse.json({ events, total: events.length }, { headers: corsHeaders });
}