import { NextRequest, NextResponse } from "next/server";
import {
  INDIA_FLOOD_ZONES,
  getRespondersForZone,
} from "@/lib/constants";
import { EmergencyResponder, HazardZone } from "@/lib/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zoneId = searchParams.get("zone_id") || "live_user_location";
  const agencyFilter = searchParams.get("type"); // "AMBULANCE", "POLICE", "NDRF"
  const refLat = searchParams.get("lat") ? Number(searchParams.get("lat")) : null;
  const refLng = searchParams.get("lng") ? Number(searchParams.get("lng")) : null;

  let targetZone = INDIA_FLOOD_ZONES.find((z) => z.id === zoneId);
  if (!targetZone && refLat !== null && refLng !== null && !isNaN(refLat) && !isNaN(refLng)) {
    targetZone = {
      id: zoneId as any,
      name: "Live Coordinates",
      district: "Local Sector",
      center: [refLat, refLng],
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
  } else if (!targetZone) {
    targetZone = {
      id: "live_user_location" as any,
      name: "Live Sector",
      district: "Local District",
      center: [27.4924, 77.6737],
      currentRisk: 10,
      alertColor: "GREEN",
      leadTimeMinutes: 480,
      dangerMarkM: 5.0,
      warningMarkM: 3.5,
      primaryTrigger: "Live Sector",
      telemetry: {
        rainfall_mm: 0,
        soil_moisture_pct: 45,
        slope_deg: 10,
        river_level_m: 1.2,
        seismic_mag: 0,
      },
    };
  }

  let responders: EmergencyResponder[] = getRespondersForZone(targetZone);

  // Filter by agency if specified
  if (agencyFilter) {
    responders = responders.filter((r) => r.type === agencyFilter);
  }

  // Recalculate dynamic distance & ETA if coordinates are provided
  if (refLat !== null && refLng !== null && !isNaN(refLat) && !isNaN(refLng)) {
    responders = responders.map((r) => {
      const dist = calculateDistanceKm(refLat, refLng, r.coords[0], r.coords[1]);
      // Average mountain speed ~20-25 km/h -> ~2.5 - 3 mins per km
      const eta = Math.max(3, Math.round(dist * 2.8));
      return {
        ...r,
        distance_km: dist,
        eta_minutes: eta,
      };
    });
  }

  // Summary counts
  const ambulanceCount = responders.filter((r) => r.type === "AMBULANCE").length;
  const policeCount = responders.filter((r) => r.type === "POLICE").length;
  const ndrfCount = responders.filter((r) => r.type === "NDRF" || r.type === "SDRF").length;

  return NextResponse.json(
    {
      status: "success",
      zone_id: zoneId,
      total_units: responders.length,
      ambulances: ambulanceCount,
      police_thanas: policeCount,
      ndrf_teams: ndrfCount,
      responders,
      emergency_dispatch_channel: "NDRF_TAC_NET_CH4_156.800MHZ",
      timestamp: new Date().toISOString(),
    },
    { headers: corsHeaders }
  );
}
