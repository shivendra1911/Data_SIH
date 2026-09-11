import { NextResponse } from "next/server";
import { INITIAL_REGIONAL_ALERTS } from "@/lib/constants";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    {
      status: "success",
      total_dispatched: INITIAL_REGIONAL_ALERTS.length,
      alerts: INITIAL_REGIONAL_ALERTS,
    },
    { headers: corsHeaders }
  );
}
