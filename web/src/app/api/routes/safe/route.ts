import { NextRequest, NextResponse } from "next/server";
import { SAFE_EVACUATION_ROUTES } from "@/lib/constants";
import { SafeEvacuationRoute } from "@/lib/types";

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
  const zoneId = searchParams.get("zone_id") || "chamoli_01";

  const routes: SafeEvacuationRoute[] =
    SAFE_EVACUATION_ROUTES[zoneId] ||
    SAFE_EVACUATION_ROUTES["chamoli_01"] ||
    [];

  return NextResponse.json(
    {
      status: "success",
      zone_id: zoneId,
      total_routes: routes.length,
      routes,
      elevation_clearance_protocol: "MINIMUM +20M VERTICAL BUFFER ABOVE 100-YR FLOOD LEVEL",
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
