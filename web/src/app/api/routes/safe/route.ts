import { NextRequest, NextResponse } from "next/server";
import { INDIA_FLOOD_ZONES, getSafeRoutesForZone } from "@/lib/constants";
import { HazardZone, SafeEvacuationRoute } from "@/lib/types";

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
  const zoneId = searchParams.get("zone_id") || "live_user_location";
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const zoneName = searchParams.get("name") || "Local Sector";

  let targetZone: HazardZone | undefined;
  if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
    targetZone = {
      id: (zoneId || "custom_location") as any,
      name: zoneName,
      district: zoneName.split("(")[0].trim(),
      center: [parseFloat(lat), parseFloat(lng)],
      currentRisk: 10,
      alertColor: "GREEN",
      leadTimeMinutes: 480,
      dangerMarkM: 5.0,
      warningMarkM: 3.5,
      primaryTrigger: "Live Coordinates",
      telemetry: {
        rainfall_mm: 0,
        soil_moisture_pct: 45,
        slope_deg: 10,
        river_level_m: 1.2,
        seismic_mag: 0,
      },
    };
  } else {
    targetZone = INDIA_FLOOD_ZONES.find((z) => z.id === zoneId);
    if (!targetZone) {
      targetZone = {
        id: zoneId as any,
        name: zoneName,
        district: zoneName,
        center: [27.4924, 77.6737],
        currentRisk: 10,
        alertColor: "GREEN",
        leadTimeMinutes: 480,
        dangerMarkM: 5.0,
        warningMarkM: 3.5,
        primaryTrigger: "District Center",
        telemetry: {
          rainfall_mm: 0,
          soil_moisture_pct: 45,
          slope_deg: 10,
          river_level_m: 1.2,
          seismic_mag: 0,
        },
      };
    }
  }

  const routes: SafeEvacuationRoute[] = getSafeRoutesForZone(targetZone);

  return NextResponse.json(
    {
      status: "success",
      zone_id: zoneId,
      total_routes: routes.length,
      routes,
      elevation_clearance_protocol: "MINIMUM +18M TO +28M VERTICAL BUFFER ABOVE 100-YR FLOOD LEVEL",
      timestamp: new Date().toISOString(),
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newRoute: SafeEvacuationRoute = {
      id: body.id || `route-custom-${Date.now()}`,
      zone_id: body.zone_id || "chamoli_01",
      route_name: body.route_name || "Emergency High-Ground Escape Path",
      start_point_name: body.start_point_name || "Current GPS Distress Position",
      start_coords: body.start_coords || [30.5573, 79.5642],
      assembly_point_name: body.assembly_point_name || "Nearest Designated Flood Shelter",
      assembly_coords: body.assembly_coords || [30.5532, 79.5615],
      elevation_gain_m: Number(body.elevation_gain_m) || 120,
      distance_km: Number(body.distance_km) || 1.5,
      walk_time_minutes: Number(body.walk_time_minutes) || 22,
      risk_avoidance_status: body.risk_avoidance_status || "100% CLEAR OF FLOOD PLAIN",
      waypoints: body.waypoints || [
        body.start_coords || [30.5573, 79.5642],
        body.assembly_coords || [30.5532, 79.5615],
      ],
      shelter_capacity: Number(body.shelter_capacity) || 500,
      shelter_facilities: body.shelter_facilities || ["Water", "First-Aid", "Shelter"],
    };

    return NextResponse.json(
      { success: true, route: newRoute },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to generate safe route", details: err.message },
      { status: 400, headers: corsHeaders }
    );
  }
}
