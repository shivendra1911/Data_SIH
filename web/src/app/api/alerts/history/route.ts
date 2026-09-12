import { NextResponse } from "next/server";
import { RegionalAlert } from "@/lib/types";

declare global {
  var __NEERNETRA_ALERTS_HISTORY__: RegionalAlert[] | undefined;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
