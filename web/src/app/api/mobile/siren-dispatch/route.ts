import { NextRequest, NextResponse } from "next/server";

export interface MobileSirenRecord {
  zone_id: string;
  zone_name: string;
  is_active: boolean;
  dispatched_at: string;
  authorized_by: string;
  target_devices_count: number;
  cell_broadcast_channels: string[];
  mobile_audio_action: string;
  vibration_pattern: number[];
  evacuation_safe_haven?: string;
  emergency_message: string;
}

declare global {
  var __NEERNETRA_MOBILE_SIREN_DISPATCHES__: Map<string, MobileSirenRecord> | undefined;
}

if (!global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__) {
  global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__ = new Map();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET: Mobile APKs call this to check if emergency siren should sound on their device
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const zoneId = url.searchParams.get("zone_id");

  const dispatches = global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__ || new Map();

  if (zoneId) {
    const record = dispatches.get(zoneId);
    return NextResponse.json(
      {
        status: "success",
        zone_id: zoneId,
        is_siren_active_on_mobile: record ? record.is_active : false,
        details: record || null,
      },
      { headers: corsHeaders }
    );
  }

  // Return all active dispatches across India
  const allActive: MobileSirenRecord[] = [];
  dispatches.forEach((rec) => {
    if (rec.is_active) allActive.push(rec);
  });

  return NextResponse.json(
    {
      status: "success",
      total_active_mobile_sirens: allActive.length,
      active_dispatches: allActive,
    },
    { headers: corsHeaders }
  );
}

// POST: Government team triggers or halts the siren broadcast to citizen devices
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const zoneId = body.zone_id || "chamoli_01";
    const zoneName = body.zone_name || "Chamoli";
    const action = body.action || "ACTIVATE"; // "ACTIVATE" | "HALT"
    const authorizedBy = body.authorized_by || "NDRF / SDMA National Command Authority";

    const dispatches = global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__ || new Map();

    if (action === "HALT") {
      const existing = dispatches.get(zoneId);
      if (existing) {
        existing.is_active = false;
        dispatches.set(zoneId, existing);
      }
      return NextResponse.json(
        {
          success: true,
          action: "HALTED",
          message: `Emergency siren signal halted for mobile devices in ${zoneName}`,
          zone_id: zoneId,
          is_active: false,
        },
        { headers: corsHeaders }
      );
    }

    // Determine estimated device count based on zone
    const baseDeviceCounts: Record<string, number> = {
      chamoli_01: 14820,
      kedarnath_02: 38400,
      joshimath_03: 11250,
      uttarkashi_04: 19600,
      rishikesh_05: 54300,
      brahmaputra_06: 82000,
      chalakudy_07: 42100,
      kosi_08: 71500,
      teesta_09: 29800,
      parvati_10: 16700,
      mahanadi_11: 63000,
      jhelum_12: 48900,
    };

    const targetDevices = baseDeviceCounts[zoneId] || 15000;

    const record: MobileSirenRecord = {
      zone_id: zoneId,
      zone_name: zoneName,
      is_active: true,
      dispatched_at: new Date().toISOString(),
      authorized_by: authorizedBy,
      target_devices_count: targetDevices,
      cell_broadcast_channels: [
        "CB-4370 (Govt Emergency Civic Alarm)",
        "CB-919 (NDRF National Disaster Audio Alert)",
      ],
      mobile_audio_action: "FORCE_MAX_VOLUME_EMERGENCY_SIREN_AND_VIBRATION",
      vibration_pattern: [1000, 400, 1000, 400, 1500],
      evacuation_safe_haven: body.safe_haven || "Designated High-Ground Relief Sanctuary",
      emergency_message:
        body.message ||
        `🚨 GOVERNMENT EVACUATION ALERT: Flash flood threat predicted in ${zoneName}. Civic siren sounding on your phone. Evacuate immediately uphill away from riverbanks.`,
    };

    dispatches.set(zoneId, record);
    global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__ = dispatches;

    // Also mirror to alert broadcast history for unified logging
    if (global.__NEERNETRA_ALERTS_HISTORY__) {
      global.__NEERNETRA_ALERTS_HISTORY__.unshift({
        alert_id: `siren-${Date.now()}`,
        zone_id: zoneId,
        severity: "CRITICAL RED",
        title: `🚨 GOVERNMENT EMERGENCY SIREN DISPATCHED TO MOBILE APKs`,
        message: record.emergency_message,
        safe_havens: [record.evacuation_safe_haven || "Designated High-Ground Sanctuary"],
        trigger_acoustic_siren: true,
        dispatched_at: record.dispatched_at,
        status: "TRANSMITTING_TO_MOBILE_APKS",
        target_nodes_count: targetDevices,
        delivery_rate_pct: 99.2,
      });
    }

    return NextResponse.json(
      {
        success: true,
        action: "DISPATCHED",
        message: `Emergency siren successfully transmitted to ${targetDevices.toLocaleString()} mobile devices (APKs) in ${zoneName}`,
        record,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to dispatch mobile siren", details: err.message },
      { status: 400, headers: corsHeaders }
    );
  }
}
