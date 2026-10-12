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
  const safeRoute = routes.find((r) => r.route_type === "SAFE") || routes[0];
  const fastRoute = routes.find((r) => r.route_type === "FAST") || routes[1] || routes[0];

  const mobileRoutePoints = safeRoute.waypoints.map((pt) => ({
    latitude: pt[0],
    longitude: pt[1],
  }));

  const fastRoutePoints = fastRoute.waypoints.map((pt) => ({
    latitude: pt[0],
    longitude: pt[1],
  }));

  return NextResponse.json(
    {
      status: "success",
      success: true,
      zone_id: zoneId,
      total_routes: routes.length,
      distance_meters: Math.round(safeRoute.distance_km * 1000),
      distance_km: safeRoute.distance_km,
      estimated_walk_minutes: safeRoute.walk_time_minutes,
      safe_space: {
        latitude: safeRoute.assembly_coords[0],
        longitude: safeRoute.assembly_coords[1],
        name: safeRoute.assembly_point_name,
        sector: `${safeRoute.route_name} (${safeRoute.assembly_coords[0].toFixed(4)}°N, ${safeRoute.assembly_coords[1].toFixed(4)}°E)`,
        elevation_meters: safeRoute.elevation_gain_m + 160,
        capacity: safeRoute.shelter_capacity,
        supplies: safeRoute.shelter_facilities,
        contact_phone: "112",
      },
      fast_space: {
        latitude: fastRoute.assembly_coords[0],
        longitude: fastRoute.assembly_coords[1],
        name: fastRoute.assembly_point_name,
        sector: `${fastRoute.route_name} (${fastRoute.assembly_coords[0].toFixed(4)}°N, ${fastRoute.assembly_coords[1].toFixed(4)}°E)`,
        elevation_meters: fastRoute.elevation_gain_m + 160,
        capacity: fastRoute.shelter_capacity,
        supplies: fastRoute.shelter_facilities,
        contact_phone: "1078",
      },
      evacuation_instructions: safeRoute.turn_instructions || [
        "Proceed along elevated high-ground contour road.",
        "Avoid low-lying culverts and river flood plains.",
      ],
      route: mobileRoutePoints,
      fast_route: {
        name: fastRoute.route_name,
        assembly_coords: fastRoute.assembly_coords,
        distance_km: fastRoute.distance_km,
        walk_time_minutes: fastRoute.walk_time_minutes,
        waypoints: fastRoutePoints,
      },
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
    const lat = Number(body.lat || body.start_coords?.[0] || 30.5573);
    const lng = Number(body.lng || body.start_coords?.[1] || 79.5642);
    const zoneId = body.zone_id || "live_user_location";
    const zoneName = body.zone_name || body.name || "Live Coordinate Sector";

    const targetZone: HazardZone = {
      id: zoneId as any,
      name: zoneName,
      district: zoneName.split("(")[0].trim(),
      center: [lat, lng],
      currentRisk: 10,
      alertColor: "GREEN",
      leadTimeMinutes: 480,
      dangerMarkM: 5.0,
      warningMarkM: 3.5,
      primaryTrigger: "Live Navigation Request",
      telemetry: {
        rainfall_mm: 0,
        soil_moisture_pct: 45,
        slope_deg: 15,
        river_level_m: 1.2,
        seismic_mag: 0,
      },
    };

    const routes: SafeEvacuationRoute[] = getSafeRoutesForZone(targetZone);
    const safeRoute = routes.find((r) => r.route_type === "SAFE") || routes[0];
    const fastRoute = routes.find((r) => r.route_type === "FAST") || routes[1] || routes[0];

    const mobileRoutePoints = safeRoute.waypoints.map((pt) => ({
      latitude: pt[0],
      longitude: pt[1],
    }));

    const fastRoutePoints = fastRoute.waypoints.map((pt) => ({
      latitude: pt[0],
      longitude: pt[1],
    }));

    return NextResponse.json(
      {
        success: true,
        zone_id: targetZone.id,
        zone_name: targetZone.name,
        distance_meters: Math.round(safeRoute.distance_km * 1000),
        distance_km: safeRoute.distance_km,
        estimated_walk_minutes: safeRoute.walk_time_minutes,
        safe_space: {
          latitude: safeRoute.assembly_coords[0],
          longitude: safeRoute.assembly_coords[1],
          name: safeRoute.assembly_point_name,
          sector: `${safeRoute.route_name} (${safeRoute.assembly_coords[0].toFixed(4)}°N, ${safeRoute.assembly_coords[1].toFixed(4)}°E)`,
          elevation_meters: safeRoute.elevation_gain_m + 160,
          capacity: safeRoute.shelter_capacity,
          supplies: safeRoute.shelter_facilities,
          contact_phone: "112",
        },
        fast_space: {
          latitude: fastRoute.assembly_coords[0],
          longitude: fastRoute.assembly_coords[1],
          name: fastRoute.assembly_point_name,
          sector: `${fastRoute.route_name} (${fastRoute.assembly_coords[0].toFixed(4)}°N, ${fastRoute.assembly_coords[1].toFixed(4)}°E)`,
          elevation_meters: fastRoute.elevation_gain_m + 160,
          capacity: fastRoute.shelter_capacity,
          supplies: fastRoute.shelter_facilities,
          contact_phone: "1078",
        },
        evacuation_instructions: safeRoute.turn_instructions || [
          "Proceed along elevated high-ground contour road.",
          "Avoid low-lying culverts and river flood plains.",
        ],
        route: mobileRoutePoints,
        fast_route: {
          name: fastRoute.route_name,
          assembly_coords: fastRoute.assembly_coords,
          distance_km: fastRoute.distance_km,
          walk_time_minutes: fastRoute.walk_time_minutes,
          waypoints: fastRoutePoints,
        },
        routes,
        elevation_clearance_protocol: "MINIMUM +18M TO +28M VERTICAL BUFFER ABOVE 100-YR FLOOD LEVEL",
        timestamp: new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to generate safe route", details: err.message },
      { status: 400, headers: corsHeaders }
    );
  }
}
