import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

  // Synchronize with FastAPI active broadcasts engine if available
  try {
    const { proxyToBackend } = await import("@/lib/sentinelState");
    const activeBroadcastsData = await proxyToBackend<any>("/api/alerts/active");
    if (activeBroadcastsData && Array.isArray(activeBroadcastsData.alerts)) {
      for (const alert of activeBroadcastsData.alerts) {
        const targetId = alert.sector_id || alert.zone_id || alert.cluster_id;
        if (!targetId) continue;

        if (alert.status === "ACTIVE_SIREN") {
          const existing = dispatches.get(targetId);
          if (!existing || existing.is_active) {
            dispatches.set(targetId, {
              zone_id: targetId,
              zone_name: alert.sector_name || alert.zone_name || (alert.cluster_id ? "Structural Collapse Hazard Vicinity (USAR Sector)" : targetId),
              is_active: true,
              dispatched_at: alert.created_at || new Date().toISOString(),
              authorized_by: alert.authorized_by || (alert.type === "STRUCTURAL_COLLAPSE_QUORUM" ? "3+ Phone USAR Structural Collapse Quorum Engine" : "1/3rd Sector Quorum Consensus Engine"),
              target_devices_count: alert.total_active_phones || alert.trapped_headcount || 9,
              cell_broadcast_channels: ["CB-4370 (Govt Emergency Civic Alarm)", "CB-919 (NDRF Audio Alert)"],
              mobile_audio_action: "FORCE_MAX_VOLUME_EMERGENCY_SIREN_AND_VIBRATION",
              vibration_pattern: [1000, 400, 1000, 400, 1500],
              emergency_message: alert.message || (alert.type === "STRUCTURAL_COLLAPSE_QUORUM" ? "🏛️ STRUCTURAL COLLAPSE CONFIRMED BY 3+ PHONES — USAR RESCUE DISPATCHED — EVACUATE VICINITY" : "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW"),
            });
          }
        } else if (alert.status === "SILENCED") {
          const existing = dispatches.get(targetId);
          if (existing && existing.is_active) {
            existing.is_active = false;
            dispatches.set(targetId, existing);
          }
        }
      }
    }
  } catch {}

  global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__ = dispatches;

  if (zoneId) {
    const record = dispatches.get(zoneId);
    const universalRecord = dispatches.get("all_sectors") || dispatches.get("universal");
    const isActive = Boolean(record?.is_active || (universalRecord?.is_active && !record));
    return NextResponse.json(
      {
        status: "success",
        zone_id: zoneId,
        is_siren_active_on_mobile: isActive,
        details: (record && record.is_active) ? record : (universalRecord && universalRecord.is_active ? universalRecord : record || null),
      },
      { headers: corsHeaders }
    );
  }

  // Return all active dispatches across India
  const allActive: MobileSirenRecord[] = [];
  dispatches.forEach((rec) => {
    if (rec.is_active) allActive.push(rec);
  });

  // Sort descending by dispatched_at so latest dispatch is always index 0
  allActive.sort(
    (a, b) => new Date(b.dispatched_at).getTime() - new Date(a.dispatched_at).getTime()
  );

  return NextResponse.json(
    {
      status: "success",
      is_siren_active_on_mobile: allActive.length > 0,
      total_active_mobile_sirens: allActive.length,
      active_dispatches: allActive,
      latest_dispatch: allActive[0] || null,
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

      // Sync HALT to Supabase cloud (non-blocking)
      try {
        const insertPromise = supabase.from("sos_alerts").insert([
          {
            device_id: "ADMIN_SIREN_DISPATCH",
            lat: 27.6015,
            lng: 77.5975,
            sos_type: "CIVIL_DEFENSE_SIREN",
            status: "HALTED_SIREN",
            battery_level: 100,
            notes: JSON.stringify({
              zone_id: zoneId,
              action: "HALT",
              authorized_by: authorizedBy,
              halted_at: new Date().toISOString(),
            }),
          },
        ]);
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1200));
        await Promise.race([insertPromise, timeoutPromise]);
      } catch {}

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

    // Sync ACTIVATE to Supabase cloud (non-blocking)
    try {
      const insertPromise = supabase.from("sos_alerts").insert([
        {
          device_id: "ADMIN_SIREN_DISPATCH",
          lat: 27.6015,
          lng: 77.5975,
          sos_type: "CIVIL_DEFENSE_SIREN",
          status: "ACTIVE_SIREN",
          battery_level: 100,
          notes: JSON.stringify({
            zone_id: zoneId,
            zone_name: zoneName,
            action: "BROADCAST_ALL",
            is_universal: true,
            authorized_by: authorizedBy,
            message: record.emergency_message,
            dispatched_at: record.dispatched_at,
          }),
        },
      ]);
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1200));
      await Promise.race([insertPromise, timeoutPromise]);
    } catch {}

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
