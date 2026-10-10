import { NextRequest, NextResponse } from "next/server";
import { CitizenLocation } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { proxyToBackend } from "@/lib/sentinelState";

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

  // Prune legacy simulated siren beacons from in-memory cache
  if (global.__NEERNETRA_CITIZENS__) {
    global.__NEERNETRA_CITIZENS__ = global.__NEERNETRA_CITIZENS__.filter(
      (c) =>
        !c.name?.includes("Cell Broadcast") &&
        !c.sos_type?.includes("EMERGENCY CELL SIREN") &&
        !c.device_uuid?.includes("cell-broadcast")
    );
  }

  let result = [...(global.__NEERNETRA_CITIZENS__ || [])];

  // 1. Retrieve any connected devices from FastAPI backend (/api/location/live)
  try {
    const backendData = await proxyToBackend<any>("/api/location/live");
    if (backendData && Array.isArray(backendData.devices)) {
      for (const dev of backendData.devices) {
        if (!dev.device_uuid) continue;
        const existingIdx = result.findIndex((c) => c.device_uuid === dev.device_uuid);
        const citObj: CitizenLocation = {
          id: `cit-${dev.device_uuid.replace(/[^a-zA-Z0-9_-]/g, "")}`,
          device_uuid: dev.device_uuid,
          name: dev.name || `Citizen [${dev.device_uuid.slice(0, 8)}]`,
          phone: dev.phone || "+91 98765 43210",
          lat: Number(dev.lat) || 30.5573,
          lng: Number(dev.lng) || 79.5642,
          is_live: true,
          last_seen_minutes_ago: 0,
          accuracy_radius_m: Number(dev.accuracy) || 10,
          drift_radius_m: 0,
          battery_pct: Number(dev.battery_level) || 85,
          status: dev.status === "SOS" ? "SOS" : "SAFE",
          sos_type: dev.status === "SOS" ? "MOBILE DISTRESS" : "LOCATION_TRACKING",
          mesh_hops: 0,
          zone_id: dev.zone_id || "chamoli_01",
          medical_distress: "NONE",
        };
        if (existingIdx >= 0) {
          result[existingIdx] = { ...result[existingIdx], ...citObj };
        } else {
          result.push(citObj);
        }
      }
    }
  } catch {}

  // 2. Retrieve any cloud-synced alerts from Supabase (with fast failover if offline)
  try {
    const supabasePromise = supabase
      .from("sos_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const timeoutPromise = new Promise<{ data: null }>((resolve) =>
      setTimeout(() => resolve({ data: null }), 3500)
    );
    const { data: cloudAlerts } = (await Promise.race([
      supabasePromise,
      timeoutPromise,
    ])) as any;

    if (cloudAlerts && Array.isArray(cloudAlerts)) {
      const processedCloudDevIds = new Set<string>();
      for (const alert of cloudAlerts) {
        // Skip broadcast control commands and sirens from showing as citizens
        if (
          alert.device_id === "ADMIN_SIREN_DISPATCH" ||
          alert.device_id === "GOVT_DIRECTIVE" ||
          alert.device_id === "COMMAND_DIRECTIVE" ||
          alert.device_id === "BROADCAST_ALL" ||
          alert.sos_type === "CIVIL_DEFENSE_SIREN" ||
          alert.sos_type === "GOVT_DIRECTIVE" ||
          alert.notes?.includes("EMERGENCY CELL SIREN")
        ) {
          continue;
        }

        const lowerDevId = (alert.device_id || "").toLowerCase();
        if (
          lowerDevId.startsWith("test") ||
          lowerDevId.includes("dummy") ||
          lowerDevId.includes("mock") ||
          lowerDevId.includes("demo") ||
          lowerDevId.startsWith("citizen-apk") ||
          lowerDevId.includes("synthetic") ||
          lowerDevId.startsWith("col_phone") ||
          lowerDevId.startsWith("fake") ||
          lowerDevId === "audit_node_99" ||
          lowerDevId === "cloud_device"
        ) {
          continue;
        }

        const devId = alert.device_id || `mobile-${alert.id ? String(alert.id).slice(0, 6) : "node"}`;
        if (processedCloudDevIds.has(devId)) {
          continue;
        }
        processedCloudDevIds.add(devId);
        const existingIdx = result.findIndex((c) => c.device_uuid === devId);

        let parsedMedical = "NONE";
        if (alert.sos_type === "HIGH_WATER_EVACUATION" || alert.notes?.includes("WATER_RISING")) {
          parsedMedical = "WATER_RISING";
        } else if (alert.notes?.includes("CRITICAL_INJURY")) {
          parsedMedical = "CRITICAL_INJURY";
        } else if (alert.notes?.includes("ELDERLY_IMMOBILE")) {
          parsedMedical = "ELDERLY_IMMOBILE";
        } else if (alert.notes?.includes("HYPOTHERMIA")) {
          parsedMedical = "HYPOTHERMIA";
        }

        let parsedName = `Citizen [${devId.replace(/^dev_/, "").slice(0, 6)}]`;
        let parsedPhone = "+91 98765 43210";

        if (alert.notes) {
          const parts = alert.notes.split("|").map((p: string) => p.trim());
          if (parts.length > 0 && parts[0].length > 0) {
            const rawCandidate = parts[0];
            if (
              !rawCandidate.includes("Periodic live") &&
              !rawCandidate.includes("Confirmed SAFE") &&
              !rawCandidate.includes("Immediate assistance")
            ) {
              parsedName = rawCandidate;
            }
          }
          if (parts.length > 1 && parts[1].length > 0) {
            if (parts[1].startsWith("+") || /^\d+$/.test(parts[1])) {
              parsedPhone = parts[1];
            } else if (
              !parts[1].includes("Periodic live") &&
              !parts[1].includes("Confirmed SAFE") &&
              !parts[1].includes("Immediate assistance")
            ) {
              if (parsedName !== parts[1]) {
                parsedName = `${parsedName} (${parts[1]})`;
              }
            }
          }
        }

        let parsedSosType = alert.sos_type || "LOCATION_TRACKING";
        if (
          alert.notes?.includes("TOUCH_FREE_MOTION_SAFE") ||
          alert.notes?.includes("Gyro/Motion Sensor")
        ) {
          parsedSosType = "TOUCH_FREE_MOTION_SAFE";
        } else if (parsedSosType === "CHECKIN") {
          parsedSosType = "LOCATION_TRACKING";
        }

        const isExplicitSos =
          alert.status === "SOS" ||
          alert.sos_type === "HIGH_WATER_EVACUATION" ||
          alert.sos_type === "TRAPPED" ||
          alert.sos_type === "LANDSLIDE" ||
          alert.sos_type === "COLLAPSE" ||
          parsedMedical !== "NONE";

        const lastSeenMins = Math.max(0, Math.round((Date.now() - new Date(alert.created_at).getTime()) / 60000));
        // In disaster edge mesh mode, preserve active presence for 24 hours (1440 mins)
        const isLiveInDisasterMode = lastSeenMins < 1440;

        const parsedCitizen: CitizenLocation = {
          id: `cit-${devId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
          device_uuid: devId,
          name: parsedName,
          phone: parsedPhone,
          lat: Number(alert.lat) || 27.6014,
          lng: Number(alert.lng) || 77.5971,
          is_live: isLiveInDisasterMode,
          last_seen_minutes_ago: lastSeenMins,
          accuracy_radius_m: 10,
          drift_radius_m: 0,
          battery_pct: Number(alert.battery_level) || 84,
          status: isExplicitSos ? "SOS" : "SAFE",
          sos_type: parsedSosType,
          mesh_hops: 0,
          zone_id: "chamoli_01",
          medical_distress: parsedMedical as any,
        };

        if (existingIdx >= 0) {
          // IMPORTANT: Fresh Supabase data overrides older cached data
          result[existingIdx] = { ...result[existingIdx], ...parsedCitizen };
        } else {
          result.push(parsedCitizen);
        }
      }
    }
  } catch (err) {
    // Cloud sync fallback gracefully to in-memory
  }

  // Ensure result contains NO Cell Broadcast dummy beacons or synthetic test devices
  result = result.filter(
    (c) =>
      !c.name?.includes("Cell Broadcast") &&
      !c.sos_type?.includes("EMERGENCY CELL SIREN") &&
      !c.device_uuid?.includes("cell-broadcast") &&
      !c.device_uuid?.toLowerCase().startsWith("test") &&
      !c.device_uuid?.toLowerCase().includes("dummy") &&
      !c.device_uuid?.toLowerCase().includes("mock") &&
      !c.device_uuid?.toLowerCase().includes("demo") &&
      !c.device_uuid?.toLowerCase().startsWith("citizen-apk") &&
      !c.device_uuid?.toLowerCase().includes("audit_node") &&
      !c.device_uuid?.toLowerCase().includes("synthetic") &&
      !c.device_uuid?.toLowerCase().startsWith("col_phone") &&
      !c.device_uuid?.toLowerCase().startsWith("fake")
  );

  // Synchronize unified global store for cross-route radar and connected device counters
  global.__NEERNETRA_CITIZENS__ = result;

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
