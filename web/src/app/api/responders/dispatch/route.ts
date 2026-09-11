import { NextRequest, NextResponse } from "next/server";
import {
  EMERGENCY_RESPONDERS_GRID,
  DEFAULT_EMERGENCY_RESPONDERS,
} from "@/lib/constants";
import { EmergencyResponder } from "@/lib/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// In-memory record of active responder dispatches
const dispatchHistory: Array<{
  dispatch_id: string;
  responder_id: string;
  unit_name: string;
  agency: string;
  zone_id: string;
  target_coords: [number, number];
  dispatched_at: string;
  eta_minutes: number;
  status: string;
}> = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const zoneId = body.zone_id || "chamoli_01";
    const responderId = body.responder_id; // Specific responder ID or undefined for agency-wide
    const agencyType = body.agency_type || "ALL"; // "ALL" | "AMBULANCE" | "POLICE" | "NDRF"
    const targetCoords: [number, number] = body.target_coords || [30.5573, 79.5642];
    const incidentDescription =
      body.incident_description ||
      "CRITICAL FLOOD RESCUE: Stranded citizens requiring immediate evacuation";

    const availableResponders: EmergencyResponder[] =
      EMERGENCY_RESPONDERS_GRID[zoneId] || DEFAULT_EMERGENCY_RESPONDERS;

    let targetUnits = availableResponders;
    if (responderId) {
      targetUnits = availableResponders.filter((r) => r.id === responderId);
    } else if (agencyType !== "ALL") {
      targetUnits = availableResponders.filter((r) => r.type === agencyType);
    }

    if (targetUnits.length === 0) {
      targetUnits = [availableResponders[0]];
    }

    const dispatchedRecords = targetUnits.map((unit) => {
      const rec = {
        dispatch_id: `DISPATCH-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        responder_id: unit.id,
        unit_name: unit.unit_name,
        agency: unit.type,
        zone_id: zoneId,
        target_coords: targetCoords,
        dispatched_at: new Date().toISOString(),
        eta_minutes: unit.eta_minutes,
        status: "DISPATCHED",
      };
      dispatchHistory.unshift(rec);
      return rec;
    });

    return NextResponse.json(
      {
        success: true,
        message: `Successfully dispatched ${dispatchedRecords.length} emergency units to incident coordinates`,
        incident_description: incidentDescription,
        target_coordinates: targetCoords,
        dispatched_units: dispatchedRecords,
        emergency_radio_link: "AIR_TAC_NET_CH12_462.5625MHZ",
        siren_activation_code: "CD_SIREN_ALARM_3_MIN_CONTINUOUS",
        timestamp: new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Emergency dispatch failed", details: err.message },
      { status: 400, headers: corsHeaders }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      status: "success",
      total_dispatches: dispatchHistory.length,
      dispatches: dispatchHistory,
    },
    { headers: corsHeaders }
  );
}
