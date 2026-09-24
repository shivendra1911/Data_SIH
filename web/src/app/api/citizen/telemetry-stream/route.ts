import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export interface TelemetryBreadcrumb {
  id: string;
  device_uuid: string;
  phone_model: string;
  lat: number;
  lng: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  status: string;
  sos_type?: string;
  timestamp: string;
}

declare global {
  var __NEERNETRA_TELEMETRY_STREAM__: TelemetryBreadcrumb[] | undefined;
}

if (!global.__NEERNETRA_TELEMETRY_STREAM__) {
  global.__NEERNETRA_TELEMETRY_STREAM__ = [];
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
  const deviceId = searchParams.get("device_uuid");

  let stream = [...(global.__NEERNETRA_TELEMETRY_STREAM__ || [])];

  if (deviceId) {
    stream = stream.filter((b) => b.device_uuid === deviceId);
  }

  // Also pull latest breadcrumbs from Supabase sos_alerts
  try {
    const { data: cloudAlerts } = await supabase
      .from("sos_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (cloudAlerts && Array.isArray(cloudAlerts)) {
      for (const alert of cloudAlerts) {
        // Exclude dummy test devices and synthetic pings
        const devId = (alert.device_id || "").toLowerCase();
        const noteStr = (alert.notes || "").toLowerCase();
        if (
          !alert.device_id ||
          devId === "test" ||
          devId === "test2" ||
          devId.startsWith("test") ||
          devId.includes("dummy") ||
          devId.includes("mock") ||
          devId === "cloud_device" ||
          noteStr.startsWith("test")
        ) {
          continue;
        }

        const isTelemetry =
          alert.notes?.includes("5s Stream") ||
          alert.notes?.includes("live GPS") ||
          alert.notes?.includes("Periodic") ||
          alert.notes?.includes("check-in") ||
          alert.status === "SOS_STREAM" ||
          alert.status === "LOCATION_TRACKING" ||
          alert.status === "SOS" ||
          alert.sos_type === "LOCATION_TRACKING" ||
          alert.sos_type === "CHECKIN";

        if (isTelemetry && alert.lat != null && alert.lng != null) {
          const exists = stream.some((s) => s.id === alert.id || s.timestamp === alert.created_at);
          if (!exists) {
            let model = "Android Phone";
            if (alert.notes) {
              const parts = alert.notes.split("|");
              if (parts[0] && parts[0].trim()) model = parts[0].trim();
            }
            stream.push({
              id: alert.id || `cloud-${alert.created_at}`,
              device_uuid: alert.device_id,
              phone_model: model,
              lat: Number(alert.lat),
              lng: Number(alert.lng),
              altitude: 184,
              accuracy: 10,
              speed: 0,
              status: alert.status || "SOS_STREAM",
              sos_type: alert.sos_type || "LOCATION_TRACKING",
              timestamp: alert.created_at || new Date().toISOString(),
            });
          }
        }
      }
    }
  } catch (err) {
    console.debug("[TelemetryStream API] Supabase query notice:", err);
  }

  // Filter out any lingering dummy entries from memory stream as well
  stream = stream.filter(
    (b) =>
      b.device_uuid &&
      !b.device_uuid.toLowerCase().startsWith("test") &&
      !b.device_uuid.toLowerCase().includes("dummy") &&
      !b.phone_model.toLowerCase().startsWith("test")
  );

  // Sort descending by timestamp
  stream.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Cap at 100 entries
  const capped = stream.slice(0, 100);

  // Group latest by device
  const deviceMap: Record<string, TelemetryBreadcrumb> = {};
  for (const b of capped) {
    if (!deviceMap[b.device_uuid]) {
      deviceMap[b.device_uuid] = b;
    }
  }

  return NextResponse.json(
    {
      success: true,
      count: capped.length,
      active_devices_count: Object.keys(deviceMap).length,
      latest_per_device: Object.values(deviceMap),
      breadcrumbs: capped,
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      device_uuid,
      lat,
      lng,
      altitude = 184,
      accuracy = 10,
      speed = 0,
      phone_model = "Vivo V2437",
      status = "SOS_STREAM",
      sos_type = "LOCATION_TRACKING",
      timestamp = new Date().toISOString(),
    } = body;

    if (!device_uuid || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "Missing device_uuid or coordinates" }, { status: 400, headers: corsHeaders });
    }

    const breadcrumb: TelemetryBreadcrumb = {
      id: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      device_uuid,
      phone_model,
      lat: Number(lat),
      lng: Number(lng),
      altitude: Number(altitude),
      accuracy: Number(accuracy),
      speed: Number(speed),
      status,
      sos_type,
      timestamp,
    };

    if (!global.__NEERNETRA_TELEMETRY_STREAM__) {
      global.__NEERNETRA_TELEMETRY_STREAM__ = [];
    }

    // Prepend to in-memory store
    global.__NEERNETRA_TELEMETRY_STREAM__.unshift(breadcrumb);

    // Keep memory clean (max 500 points)
    if (global.__NEERNETRA_TELEMETRY_STREAM__.length > 500) {
      global.__NEERNETRA_TELEMETRY_STREAM__.pop();
    }

    // Persist point to Supabase sos_alerts table
    try {
      await supabase.from("sos_alerts").insert({
        device_id: device_uuid,
        lat: Number(lat),
        lng: Number(lng),
        status,
        sos_type,
        notes: `${phone_model} | 5s Stream | Acc: ±${Math.round(accuracy)}m | Alt: ${Math.round(altitude)}m`,
      });
    } catch (dbErr) {
      console.debug("[TelemetryStream API] Supabase persistence notice:", dbErr);
    }

    return NextResponse.json({ success: true, breadcrumb }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
