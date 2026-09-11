import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Global in-memory cache for fast local retrieval
declare global {
  var __NEERNETRA_SOS_EVENTS__: any[] | undefined;
}

if (!global.__NEERNETRA_SOS_EVENTS__) {
  global.__NEERNETRA_SOS_EVENTS__ = [];
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
      lat,
      lng,
      status = "SOS",
      sos_type = "ANDROID DISASTER BEACON",
      is_mesh_relayed = false,
    } = body;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "Latitude and Longitude are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const eventRecord = {
      id: `sos-${Date.now()}`,
      device_uuid,
      lat: Number(lat),
      lng: Number(lng),
      status,
      sos_type,
      is_mesh_relayed: Boolean(is_mesh_relayed),
      created_at: new Date().toISOString(),
    };

    // Store in global server memory for instant stream
    global.__NEERNETRA_SOS_EVENTS__!.unshift(eventRecord);
    if (global.__NEERNETRA_SOS_EVENTS__!.length > 100) {
      global.__NEERNETRA_SOS_EVENTS__!.pop();
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
      console.warn("Supabase insert notice (running with in-memory sync):", dbErr);
    }

    return NextResponse.json(
      {
        success: true,
        message_id: `msg_${Date.now()}`,
        event: eventRecord,
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
  return NextResponse.json({ events }, { headers: corsHeaders });
}