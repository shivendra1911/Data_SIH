import { NextRequest, NextResponse } from "next/server";

declare global {
  var __NEERNETRA_PUSH_TOKENS__: Map<string, { fcm_token: string; zone_id: string; updated_at: string }> | undefined;
}

if (!global.__NEERNETRA_PUSH_TOKENS__) {
  global.__NEERNETRA_PUSH_TOKENS__ = new Map();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { device_uuid, fcm_token, zone_id = "chamoli_01" } = body;

    if (!device_uuid || !fcm_token) {
      return NextResponse.json(
        { error: "device_uuid and fcm_token required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!global.__NEERNETRA_PUSH_TOKENS__) {
      global.__NEERNETRA_PUSH_TOKENS__ = new Map();
    }

    global.__NEERNETRA_PUSH_TOKENS__.set(device_uuid, {
      fcm_token,
      zone_id,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, message: "Push token registered", device_uuid },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to register push token", details: err.message },
      { status: 400, headers: corsHeaders }
    );
  }
}
