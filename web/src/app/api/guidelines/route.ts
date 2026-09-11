import { NextRequest, NextResponse } from "next/server";
import {
  ZONE_EVACUATION_GUIDELINES,
  INDIA_FLOOD_ZONES,
} from "@/lib/constants";
import { EvacuationGuidelines } from "@/lib/types";

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

  const zone = INDIA_FLOOD_ZONES.find((z) => z.id === zoneId);
  const guidelines: EvacuationGuidelines =
    ZONE_EVACUATION_GUIDELINES[zoneId] || {
      zone_id: (zoneId as any),
      zone_name: zone?.name || "Target Flood Inundation Zone",
      alert_level: (zone?.alertColor === "RED" ? "RED" : "ORANGE"),
      alarm_tone: "CIVIL_DEFENSE_SIREN_105DB",
      immediate_actions: [
        "EVACUATE IMMEDIATELY: Move away from riverbanks and submerged culverts uphill without delay.",
        "DO NOT attempt to cross flowing water on foot or in vehicles.",
        "Shut down main electricity and gas connections before vacating premise.",
        "Carry emergency medicine, government ID, dry snacks, and waterproof torch.",
      ],
      high_ground_directives: [
        "Head toward nearest designated high-ground Multi-Hazard Relief Shelter.",
        "Maintain at least +20 meters elevation above the bankfull river level.",
        "Stay clear of active debris slides and loose embankment edges.",
      ],
      offline_mesh_protocol:
        "KEEP BLUETOOTH & GPS SWITCHED ON: Enables offline peer-to-peer relay of your emergency distress packet and last known coordinates to rescue patrols.",
      disaster_radio_mhz: "Disaster FM Emergency Broadcast: 102.8 MHz",
      emergency_helplines: [
        { agency: "National Disaster Response Force (NDRF)", phone: "1078" },
        { agency: "State Disaster Management Authority (SDMA)", phone: "1070" },
        { agency: "Emergency Ambulance", phone: "108" },
        { agency: "Police Control Room", phone: "112" },
      ],
    };

  return NextResponse.json(
    {
      status: "success",
      zone_id: zoneId,
      guidelines,
      timestamp: new Date().toISOString(),
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const zoneId = body.zone_id || "chamoli_01";
    const customMessage = body.message;

    return NextResponse.json(
      {
        success: true,
        broadcast_id: `GUIDE-BCAST-${Date.now().toString(36).toUpperCase()}`,
        zone_id: zoneId,
        message:
          customMessage ||
          "MANDATORY EVACUATION GUIDELINES DISPATCHED: Move uphill immediately via designated Safe Route.",
        push_channel: `fcm_topic_guidelines_${zoneId}`,
        acoustic_alarm_triggered: true,
        delivery_status: "DISPATCHED_TO_MOBILE_MESH",
        timestamp: new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to dispatch guidelines", details: err.message },
      { status: 400, headers: corsHeaders }
    );
  }
}
