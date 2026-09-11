import { NextRequest, NextResponse } from "next/server";
import { INITIAL_REGIONAL_ALERTS } from "@/lib/constants";
import { RegionalAlert } from "@/lib/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Global in-memory log of regional alerts
let broadcastHistory: RegionalAlert[] = [...INITIAL_REGIONAL_ALERTS];

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    {
      status: "success",
      total_dispatched: broadcastHistory.length,
      alerts: broadcastHistory,
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const newAlert: RegionalAlert = {
      alert_id: `alert-${Date.now()}`,
      zone_id: body.zone_id || "chamoli_01",
      severity: body.severity || "CRITICAL RED",
      title: body.title || "ZERO-MINUTE MANDATORY EVACUATION DISPATCH",
      message:
        body.message ||
        "Immediate flash flood / GLOF surge approaching. Move to designated high ground immediately.",
      safe_havens: body.safe_havens || [
        "Joshimath Helipad Multi-Hazard Shelter",
        "Govindghat High Ground Gurdwara",
      ],
      trigger_acoustic_siren:
        body.trigger_acoustic_siren !== undefined
          ? Boolean(body.trigger_acoustic_siren)
          : true,
      dispatched_at: new Date().toISOString(),
      status: "ACTIVE_IN_EDGE_MESH",
      target_nodes_count: Math.floor(1200 + Math.random() * 400),
      delivery_rate_pct: 98.4,
    };

    broadcastHistory = [newAlert, ...broadcastHistory];

    return NextResponse.json(
      {
        success: true,
        message: "Regional Alert dispatched to citizen mobile edge nodes",
        alert: newAlert,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to dispatch regional alert", details: err.message },
      { status: 400, headers: corsHeaders }
    );
  }
}
