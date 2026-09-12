import { NextRequest, NextResponse } from "next/server";
import {
  ZONE_EVACUATION_GUIDELINES,
  INDIA_FLOOD_ZONES,
  getSafeRoutesForZone,
  getGuidelinesForZone,
} from "@/lib/constants";
import { computeAlgorithmicSafeSpace } from "@/lib/safeSpaceAlgorithm";
import { EvacuationGuidelines, HazardZone } from "@/lib/types";
import { supabase } from "@/lib/supabase";

// Unified global in-memory store for manual guidelines and custom directives
declare global {
  var __NEERNETRA_CUSTOM_GUIDELINES__: Record<string, EvacuationGuidelines> | undefined;
}

if (!global.__NEERNETRA_CUSTOM_GUIDELINES__) {
  global.__NEERNETRA_CUSTOM_GUIDELINES__ = {};
}

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
  const zoneId = searchParams.get("zone_id") || "live_user_location";
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const zoneName = searchParams.get("name");

  let zone: HazardZone | undefined = INDIA_FLOOD_ZONES.find((z) => z.id === zoneId);
  if (!zone) {
    const defaultCenter: [number, number] =
      lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))
        ? [parseFloat(lat), parseFloat(lng)]
        : [27.4924, 77.6737];
    const cleanLabel =
      zoneName || (zoneId === "live_user_location" ? "My Live Location" : "Local Basin");
    zone = {
      id: zoneId as any,
      name: cleanLabel,
      district: cleanLabel.split("(")[0].trim(),
      center: defaultCenter,
      currentRisk: 12.0,
      alertColor: "GREEN",
      leadTimeMinutes: 480,
      dangerMarkM: 5.0,
      warningMarkM: 3.5,
      primaryTrigger: "Live Topographic Coordinates",
      telemetry: {
        rainfall_mm: 0.0,
        soil_moisture_pct: 45.0,
        slope_deg: 10.0,
        river_level_m: 1.2,
        seismic_mag: 0.0,
      },
    };
  }

  // 1. Compute Safe Space dynamically via algorithm and Open-Elevation API
  const algorithmicSafeSpace = await computeAlgorithmicSafeSpace(
    zone.id,
    zone.name,
    zone.center,
    zone.dangerMarkM,
    zone.telemetry?.slope_deg || 15.0
  );

  // 2. Retrieve custom manually-written guidelines if available, otherwise baseline template
  const customGuide = global.__NEERNETRA_CUSTOM_GUIDELINES__?.[zoneId];

  const defaultActions = [
    "EVACUATE IMMEDIATELY: Move away from riverbanks and submerged culverts uphill without delay.",
    "DO NOT attempt to cross flowing water on foot or in vehicles.",
    "Shut down main electricity and gas connections before vacating premise.",
    "Carry emergency medicine, government ID, dry snacks, and waterproof torch.",
  ];

  const guidelines: EvacuationGuidelines =
    customGuide || getGuidelinesForZone(zone);

  const safeRoutes = getSafeRoutesForZone(zone);

  return NextResponse.json(
    {
      status: "success",
      zone_id: zoneId,
      zone_name: zone.name,
      algorithmic_safe_space: algorithmicSafeSpace,
      guidelines,
      safe_routes: safeRoutes,
      is_custom_written: Boolean(customGuide),
      timestamp: new Date().toISOString(),
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const zoneId = body.zone_id || "chamoli_01";
    const zone = INDIA_FLOOD_ZONES.find((z) => z.id === zoneId) || INDIA_FLOOD_ZONES[0];

    // Manual write option: user or disaster officer supplies custom directive and action steps
    const newGuidelines: EvacuationGuidelines = {
      zone_id: zoneId as any,
      zone_name: zone.name,
      alert_level: body.alert_level || "RED",
      alarm_tone: "CIVIL_DEFENSE_SIREN_105DB",
      immediate_actions: Array.isArray(body.immediate_actions)
        ? body.immediate_actions
        : body.immediate_actions
        ? [body.immediate_actions]
        : [
            "Manual directive: Immediate evacuation ordered for all low-lying sectors.",
            "Move along designated high ground routes away from rising floodwaters.",
          ],
      high_ground_directives: Array.isArray(body.high_ground_directives)
        ? body.high_ground_directives
        : [
            body.high_ground_note || "Proceed to designated multi-hazard safe haven immediately.",
          ],
      offline_mesh_protocol:
        body.offline_mesh_protocol ||
        "Keep Bluetooth and GPS active for offline peer-to-peer mesh beaconing.",
      disaster_radio_mhz: body.disaster_radio_mhz || "Disaster FM 102.8 MHz",
      emergency_helplines: body.emergency_helplines || [
        { agency: "NDRF Helpline", phone: "1078" },
        { agency: "SDMA Control Room", phone: "1070" },
        { agency: "Emergency Ambulance", phone: "108" },
        { agency: "Police Control", phone: "112" },
      ],
    };

    // Store in global memory so it is immediately active
    if (!global.__NEERNETRA_CUSTOM_GUIDELINES__) {
      global.__NEERNETRA_CUSTOM_GUIDELINES__ = {};
    }
    global.__NEERNETRA_CUSTOM_GUIDELINES__[zoneId] = newGuidelines;

    // Trigger an alert broadcast record
    if (global.__NEERNETRA_ALERTS_HISTORY__) {
      global.__NEERNETRA_ALERTS_HISTORY__.unshift({
        alert_id: `manual-guide-${Date.now().toString(36)}`,
        zone_id: zoneId,
        severity: "CRITICAL RED",
        title: body.title || `MANUAL DIRECTIVE: ${zone.name}`,
        message:
          newGuidelines.immediate_actions.join(" • ") ||
          "Custom evacuation instructions broadcasted by command center.",
        safe_havens: [
          `${zone.name} Algorithmic High Ridge Sanctuary`,
          "Designated Multi-Hazard Community Shelter",
        ],
        trigger_acoustic_siren: true,
        dispatched_at: new Date().toISOString(),
        status: "ACTIVE_IN_EDGE_MESH",
        target_nodes_count: 1420,
        delivery_rate_pct: 99.1,
      });
    }

    // Sync to Supabase Cloud for mobile devices
    try {
      await supabase.from("sos_alerts").insert({
        device_id: "GOVT_DIRECTIVE",
        lat: zone.center[0],
        lng: zone.center[1],
        sos_type: "GOVT_DIRECTIVE",
        status: "ACTIVE",
        battery_level: 100,
        notes: JSON.stringify({
          id: `manual-guide-${Date.now().toString(36)}`,
          title: body.title || `MANUAL DIRECTIVE: ${zone.name}`,
          action: newGuidelines.immediate_actions.join(" • ") || "Custom evacuation instructions broadcasted by command center.",
          priority: "HIGH",
          category: "MANUAL_DIRECTIVE",
          zone_id: zoneId,
          created_at: new Date().toISOString(),
        }),
      });
      console.log("[Guidelines API] Manual directive synced to Supabase Cloud!");
    } catch (sbErr) {
      console.warn("[Guidelines API] Supabase insert fallback:", sbErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Manual guidelines & directives saved and broadcasted to network",
        zone_id: zoneId,
        guidelines: newGuidelines,
        timestamp: new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to save manual guidelines", details: err.message },
      { status: 400, headers: corsHeaders }
    );
  }
}
