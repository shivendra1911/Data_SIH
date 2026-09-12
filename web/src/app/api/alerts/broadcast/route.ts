import { NextRequest, NextResponse } from "next/server";
import { RegionalAlert } from "@/lib/types";

declare global {
  var __NEERNETRA_ALERTS_HISTORY__: RegionalAlert[] | undefined;
}

if (!global.__NEERNETRA_ALERTS_HISTORY__) {
  global.__NEERNETRA_ALERTS_HISTORY__ = [];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  const alerts = global.__NEERNETRA_ALERTS_HISTORY__ || [];
  return NextResponse.json(
    {
      status: "success",
      total_dispatched: alerts.length,
      alerts,
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
      title: body.title || "MANDATORY EVACUATION DISPATCH",
      message:
        body.message ||
        "Flash flood / surge approaching. Move to designated high ground immediately.",
      safe_havens: body.safe_havens || [
        "High-Ground Relief Shelter",
        "Elevated Community Sanctuary",
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

    global.__NEERNETRA_ALERTS_HISTORY__ = [newAlert, ...(global.__NEERNETRA_ALERTS_HISTORY__ || [])];

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
