import { NextRequest, NextResponse } from "next/server";
import { getGlobalState, proxyToBackend } from "@/lib/sentinelState";
import { supabase } from "@/lib/supabase";
import { CitizenLocation } from "@/lib/types";
import { checkRateLimit } from "@/lib/security";
import type { MobileSirenRecord } from "@/app/api/mobile/siren-dispatch/route";

declare global {
  var __NEERNETRA_MOBILE_SIREN_DISPATCHES__: Map<string, MobileSirenRecord> | undefined;
  var __NEERNETRA_CITIZENS__: CitizenLocation[] | undefined;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rateLimit = checkRateLimit(`collapse_${clientIp}`, 60, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many collapse reports. Please wait.", retry_after_sec: rateLimit.retryAfterSec },
      { status: 429, headers: corsHeaders }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const deviceUuid = body.device_uuid || `col_phone_${Math.random().toString(36).substring(2, 8)}`;
  const lat = Number(body.lat) || 27.6015;
  const lng = Number(body.lng) || 77.5975;
  const peakG = Number(body.peak_g) || 4.5;
  const freeFallMs = Number(body.free_fall_ms) || 350;
  const confidence = Number(body.confidence) || 0.94;
  const nowIso = new Date().toISOString();

  // Ingest into in-memory state with 100-meter spatial clustering
  const state = getGlobalState();

  // Find if an active cluster already exists within 100 meters
  let matchedClusterId: string | null = null;
  for (const [cid, cl] of Object.entries(state.collapseClusters)) {
    if (cl.status !== "RESOLVED_SAFE" && haversineMeters(cl.centroid_lat, cl.centroid_lng, lat, lng) <= 100) {
      matchedClusterId = cid;
      break;
    }
  }

  const clusterId = matchedClusterId || `clp_${lat.toFixed(3).replace(".", "_")}_${lng.toFixed(3).replace(".", "_")}`;

  if (!state.collapseClusters[clusterId]) {
    state.collapseClusters[clusterId] = {
      cluster_id: clusterId,
      status: "PENDING_QUORUM",
      priority: "P2-HIGH",
      centroid_lat: lat,
      centroid_lng: lng,
      radius_meters: 100,
      reporting_devices: [deviceUuid],
      trapped_headcount: 1,
      first_detected_at: nowIso,
      last_report_at: nowIso,
      max_peak_g: peakG,
      average_confidence: confidence,
      elapsed_seconds: 0,
      dispatched: false,
    };
  } else {
    const cl = state.collapseClusters[clusterId];
    if (!cl.reporting_devices.includes(deviceUuid)) {
      cl.reporting_devices.push(deviceUuid);
      cl.trapped_headcount = cl.reporting_devices.length;
    }
    const n = cl.reporting_devices.length;
    cl.centroid_lat = Number(((cl.centroid_lat * (n - 1) + lat) / n).toFixed(5));
    cl.centroid_lng = Number(((cl.centroid_lng * (n - 1) + lng) / n).toFixed(5));
    cl.radius_meters = 100;
    cl.last_report_at = nowIso;
    cl.max_peak_g = Math.max(cl.max_peak_g, peakG);
    cl.average_confidence = Number(((cl.average_confidence + confidence) / 2).toFixed(2));
  }

  const cl = state.collapseClusters[clusterId];
  const quorumCount = cl.reporting_devices.length;
  const isConfirmed = quorumCount >= 3;
  cl.status = isConfirmed ? "CONFIRMED_COLLAPSE" : "PENDING_QUORUM";
  cl.priority = isConfirmed ? "P1-CRITICAL" : "P2-HIGH";

  // Mirror into active citizen radar
  if (!global.__NEERNETRA_CITIZENS__) {
    global.__NEERNETRA_CITIZENS__ = [];
  }
  const existingCitIdx = global.__NEERNETRA_CITIZENS__.findIndex((c) => c.device_uuid === deviceUuid);
  const collCit: CitizenLocation = {
    id: `cit-${deviceUuid.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    device_uuid: deviceUuid,
    name: `Citizen [${deviceUuid.slice(0, 8)}]`,
    phone: "+91 98765 43210",
    lat,
    lng,
    is_live: true,
    last_seen_minutes_ago: 0,
    accuracy_radius_m: 10,
    drift_radius_m: 0,
    battery_pct: 85,
    status: "SOS",
    sos_type: "COLLAPSE",
    mesh_hops: 0,
    zone_id: clusterId,
    medical_distress: "CRITICAL_INJURY",
  };
  if (existingCitIdx >= 0) {
    global.__NEERNETRA_CITIZENS__[existingCitIdx] = { ...global.__NEERNETRA_CITIZENS__[existingCitIdx], ...collCit };
  } else {
    global.__NEERNETRA_CITIZENS__.unshift(collCit);
  }

  // CRITICAL: Synchronize EVERY report to Supabase sos_alerts table for cross-serverless persistence!
  try {
    const insertPayload = {
      device_id: deviceUuid,
      lat,
      lng,
      sos_type: "COLLAPSE",
      status: isConfirmed ? "CONFIRMED_COLLAPSE" : "PENDING_QUORUM",
      battery_level: 85,
      notes: JSON.stringify({
        cluster_id: clusterId,
        peak_g: peakG,
        confidence,
        free_fall_ms: freeFallMs,
        notes: body.notes || `Phone shock (${peakG}g) at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        timestamp: nowIso,
      }),
    };
    await supabase.from("sos_alerts").insert([insertPayload]);
  } catch {}

  // If confirmed by 3+ phones, activate universal emergency siren broadcast
  if (isConfirmed) {
    const emergencyMessage = `🏛️ STRUCTURAL COLLAPSE CONFIRMED BY ${quorumCount}+ PHONES WITHIN 100M — USAR RESCUE DISPATCHED — EVACUATE VICINITY`;
    if (!global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__) {
      global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__ = new Map();
    }
    global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__.set(clusterId, {
      zone_id: clusterId,
      zone_name: `Structural Collapse Hazard (100m Impact Zone: ${cl.centroid_lat.toFixed(4)}°N, ${cl.centroid_lng.toFixed(4)}°E)`,
      is_active: true,
      dispatched_at: nowIso,
      authorized_by: "3+ Phone USAR Structural Collapse Quorum Engine",
      target_devices_count: 500,
      cell_broadcast_channels: ["CB-4370 (Govt Emergency Civic Alarm)", "CB-919 (NDRF Audio Alert)"],
      mobile_audio_action: "FORCE_MAX_VOLUME_EMERGENCY_SIREN_AND_VIBRATION",
      vibration_pattern: [1000, 400, 1000, 400, 1500],
      emergency_message: emergencyMessage,
    });

    try {
      supabase.from("sos_alerts").insert([
        {
          device_id: "ADMIN_SIREN_DISPATCH",
          lat: cl.centroid_lat,
          lng: cl.centroid_lng,
          sos_type: "CIVIL_DEFENSE_SIREN",
          status: "ACTIVE_SIREN",
          battery_level: 100,
          notes: JSON.stringify({
            zone_id: clusterId,
            zone_name: `Structural Collapse Hazard (100m Impact Zone: ${cl.centroid_lat.toFixed(4)}°N, ${cl.centroid_lng.toFixed(4)}°E)`,
            action: "BROADCAST_ALL",
            is_universal: true,
            authorized_by: "3+ Phone USAR Structural Collapse Quorum Engine",
            message: emergencyMessage,
            dispatched_at: nowIso,
          }),
        },
      ]).then(() => {});
    } catch {}
  }

  // Also proxy to FastAPI backend asynchronously if running
  proxyToBackend<any>("/api/collapse/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});

  return NextResponse.json(
    {
      success: true,
      cluster_id: clusterId,
      status: cl.status,
      cluster_status: cl.status,
      centroid_lat: cl.centroid_lat,
      centroid_lng: cl.centroid_lng,
      radius_meters: cl.radius_meters,
      quorum_count: quorumCount,
      quorum_threshold: 3,
      is_confirmed: isConfirmed,
      directive_broadcast_active: isConfirmed,
      reporting_devices_count: quorumCount,
      reporting_devices: cl.reporting_devices,
      peak_g: peakG,
      free_fall_ms: freeFallMs,
      message: isConfirmed
        ? `🏛️ 3+ Phones Confirmed Structural Collapse Quorum in 100m Area (${cl.centroid_lat.toFixed(4)}°N, ${cl.centroid_lng.toFixed(4)}°E)! USAR Rescue Dispatched.`
        : `Kinetic shock registered (${quorumCount}/3 devices within 100m needed for collapse quorum confirmation)`,
    },
    { headers: corsHeaders }
  );
}
