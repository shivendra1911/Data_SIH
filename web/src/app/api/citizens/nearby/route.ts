import { NextRequest, NextResponse } from "next/server";
import { GET as getCitizenLocations } from "@/app/api/citizen/locations/route";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const res = await getCitizenLocations(req);
    const data = await res.json();
    const citizens = (data.citizens || []).map((c: any) => ({
      id: c.id || c.device_uuid,
      name: c.name || "Citizen Node",
      phone: c.phone || "+91 98765 43210",
      lat: c.lat,
      lng: c.lng,
      distance_meters: c.distance_meters ?? (c.mesh_hops ? c.mesh_hops * 200 : 45),
      battery_level: c.battery_pct ?? c.battery_level ?? 85,
      safety_status: c.status === "SOS" ? "DANGER" : (c.status === "HELPING" ? "HELPING" : "SAFE"),
      status: c.status || "SAFE",
      location_name: c.location_name || (c.mesh_hops > 1 ? `Multi-Hop Relay (${c.mesh_hops} hops)` : "Direct Mesh Range"),
      hop_count: c.mesh_hops || 0,
      next_hop: c.next_hop || null,
    }));

    return NextResponse.json(
      {
        status: "success",
        citizens,
        total: citizens.length,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err.message, citizens: [] },
      { status: 500, headers: corsHeaders }
    );
  }
}
