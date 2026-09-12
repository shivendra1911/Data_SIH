import { NextRequest, NextResponse } from "next/server";
import { INDIA_FLOOD_ZONES, getSafeRoutesForZone } from "@/lib/constants";
import { evaluateAIFloodRisk } from "@/lib/aiEngine";
import { getLiveTelemetry } from "@/lib/liveTelemetryService";
import { ScannedZoneSummary, NationalSentinelScan } from "@/lib/types";

export const dynamic = "force-dynamic";

// In-memory autonomous dispatch log to prevent spamming the exact same zone within 5 minutes
const autoDispatchedRecords: Map<string, { timestamp: number; alert_id: string; target_nodes: number }> = new Map();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceAutoDispatch = url.searchParams.get("auto_dispatch") !== "false";

    const scannedZones: ScannedZoneSummary[] = [];
    const newDispatches: {
      alert_id: string;
      zone_name: string;
      timestamp: string;
      message: string;
      target_nodes_count: number;
    }[] = [];

    const now = Date.now();

    // Ingest live internet telemetry for all monitored basins concurrently
    const liveTelemetryResults = await Promise.all(
      INDIA_FLOOD_ZONES.map(async (zone) => {
        try {
          const res = await getLiveTelemetry(
            zone.center[0],
            zone.center[1],
            zone.telemetry.slope_deg,
            zone.dangerMarkM
          );
          return { zone, telemetry: res.telemetry, isLive: res.isLive };
        } catch {
          return { zone, telemetry: zone.telemetry, isLive: false };
        }
      })
    );

    for (const { zone, telemetry, isLive } of liveTelemetryResults) {
      const evalResult = evaluateAIFloodRisk(
        telemetry,
        zone.dangerMarkM,
        zone.warningMarkM
      );

      const isCritical = evalResult.alert_color === "RED" || evalResult.flood_probability_percent >= 75;
      let wasAutoDispatched = false;
      let dispatchedAtTime: string | undefined = undefined;

      const lastDispatch = autoDispatchedRecords.get(zone.id);

      // Autonomous trigger rule: if zone is in Critical Red and hasn't been auto-dispatched in 5 minutes
      if (forceAutoDispatch && isCritical) {
        if (!lastDispatch || now - lastDispatch.timestamp > 5 * 60 * 1000) {
          const alertId = `auto-sos-${zone.id}-${Date.now().toString(36)}`;
          const targetNodes = Math.floor(1200 + Math.random() * 450);
          const safeRoutesForZone = getSafeRoutesForZone(zone);
          const primarySafeRoute = safeRoutesForZone?.[0];
          const safeRouteText = primarySafeRoute
            ? ` Designated Safe Route: ${primarySafeRoute.route_name} to ${primarySafeRoute.assembly_point_name} (+${primarySafeRoute.elevation_gain_m}m).`
            : "";

          autoDispatchedRecords.set(zone.id, {
            timestamp: now,
            alert_id: alertId,
            target_nodes: targetNodes,
          });

          newDispatches.push({
            alert_id: alertId,
            zone_name: zone.name,
            timestamp: new Date().toISOString(),
            message: `AUTONOMOUS SOS: Critical ${evalResult.primary_trigger} detected in ${zone.name}. Mandatory evacuation active.${safeRouteText}`,
            target_nodes_count: targetNodes,
          });

          wasAutoDispatched = true;
          dispatchedAtTime = new Date().toISOString();
        } else {
          wasAutoDispatched = true;
          dispatchedAtTime = new Date(lastDispatch.timestamp).toISOString();
        }
      }

      // Extract state from district or name
      const stateMatch = zone.district.match(/,\s*([A-Za-z\s&]+)$/);
      const state = stateMatch ? stateMatch[1].trim() : "India";

      scannedZones.push({
        zone_id: zone.id,
        zone_name: zone.name,
        district: zone.district,
        state,
        river_basin: zone.name.includes("(") ? zone.name.split("(")[0].trim() : zone.name,
        flood_probability_percent: evalResult.flood_probability_percent,
        alert_color: evalResult.alert_color,
        primary_trigger: evalResult.primary_trigger,
        is_cryo_seismic_glof: evalResult.is_cryo_seismic_glof,
        lead_time_minutes: evalResult.lead_time_minutes,
        river_level_m: telemetry.river_level_m,
        danger_mark_m: zone.dangerMarkM,
        auto_dispatched: wasAutoDispatched,
        dispatched_at: dispatchedAtTime,
      });
    }

    // Rank zones by highest flood probability first
    scannedZones.sort((a, b) => b.flood_probability_percent - a.flood_probability_percent);

    const criticalCount = scannedZones.filter((z) => z.alert_color === "RED").length;
    const warningCount = scannedZones.filter((z) => z.alert_color === "ORANGE").length;

    const nationalThreatLevel =
      criticalCount >= 3
        ? "CRITICAL_RED"
        : criticalCount >= 1
        ? "HIGH"
        : warningCount >= 2
        ? "ELEVATED"
        : "NORMAL";

    const responsePayload: NationalSentinelScan = {
      timestamp: new Date().toISOString(),
      national_threat_level: nationalThreatLevel,
      total_zones_scanned: scannedZones.length,
      critical_zones_count: criticalCount,
      warning_zones_count: warningCount,
      highest_threat_zone: scannedZones[0],
      zones: scannedZones,
      recent_auto_sos_dispatches: newDispatches,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("National Sentinel Scan failed:", error);
    return NextResponse.json(
      { error: "Failed to execute national sentinel scan", details: error.message },
      { status: 500 }
    );
  }
}
