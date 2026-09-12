import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { INDIA_FLOOD_ZONES } from "@/lib/constants";

export interface OfficialNotification {
  id: string;
  title: string;
  source?: string;
  organization: string;
  summary?: string;
  full_text?: string;
  body: string;
  source_type: "NATIONAL_CALAMITY" | "LOCAL_GOVT" | "LOCAL_NEWS";
  severity: "CRITICAL" | "WARNING" | "ADVISORY" | "INFO";
  ref_code: string;
  timestamp: string;
  contact_hotline?: string;
  action_advice?: string;
  verified: boolean;
}

export interface GovernmentGuidelinesResponse {
  total: number;
  last_updated: string;
  disaster_zone: string;
  active_emergency_level: string;
  guidelines: OfficialNotification[];
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
  const url = new URL(req.url);
  const zoneId = url.searchParams.get("zone_id") || "chamoli_01";

  const zone =
    INDIA_FLOOD_ZONES.find((z) => z.id === zoneId) || INDIA_FLOOD_ZONES[0];

  const guidelines: OfficialNotification[] = [];

  // 1. Check Supabase cloud for real-time government directives issued from Admin Web Panel
  try {
    const { data: cloudDirectives } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("device_id", "GOVT_DIRECTIVE")
      .order("created_at", { ascending: false })
      .limit(10);

    if (cloudDirectives && Array.isArray(cloudDirectives)) {
      for (const cd of cloudDirectives) {
        let parsedNotes: any = {};
        try {
          parsedNotes = cd.notes ? JSON.parse(cd.notes) : {};
        } catch {
          parsedNotes = { title: "Command Directive", action: cd.notes };
        }

        guidelines.push({
          id: cd.id || ("dir-cloud-" + Date.now()),
          title: parsedNotes.title || "EMERGENCY CIVIL DIRECTIVE",
          source: "NDRF / SDMA Disaster Management Cell",
          organization: "NDRF / SDMA Disaster Management Cell",
          summary:
            parsedNotes.action ||
            "Immediate precautionary actions ordered. Proceed uphill towards designated shelters.",
          full_text:
            parsedNotes.action ||
            "Immediate precautionary actions ordered. Proceed uphill towards designated shelters.",
          body:
            parsedNotes.action ||
            "Immediate precautionary actions ordered. Proceed uphill towards designated shelters.",
          source_type: "NATIONAL_CALAMITY",
          severity: parsedNotes.priority === "HIGH" ? "CRITICAL" : "WARNING",
          ref_code: "DIR-GOV-" + (cd.id ? String(cd.id).slice(0, 6).toUpperCase() : "LIVE"),
          timestamp: cd.created_at || new Date().toISOString(),
          contact_hotline: "1078 (NDRF Toll-Free)",
          action_advice: parsedNotes.action || "Evacuate uphill immediately.",
          verified: true,
        });
      }
    }
  } catch (err) {
    console.warn("[OfficialGuidelines API] Supabase fetch fallback:", err);
  }

  // 2. Add in-memory custom guidelines if created by admin
  const customGuide = (global as any).__NEERNETRA_CUSTOM_GUIDELINES__?.[zoneId];
  if (customGuide) {
    guidelines.push({
      id: "custom-guide-" + zoneId,
      title: "ACTIVE DIRECTIVE: " + customGuide.zone_name,
      source: "SDMA State Incident Command",
      organization: "SDMA State Incident Command",
      summary: customGuide.immediate_actions?.join("\n") || "High ground evacuation mandatory.",
      full_text: customGuide.immediate_actions?.join("\n") || "High ground evacuation mandatory.",
      body: customGuide.immediate_actions?.join("\n") || "High ground evacuation mandatory.",
      source_type: "LOCAL_GOVT",
      severity: "CRITICAL",
      ref_code: "SDMA-" + zoneId.toUpperCase(),
      timestamp: new Date().toISOString(),
      contact_hotline: "1070 (State Disaster Helpline)",
      action_advice: customGuide.high_ground_directives?.[0] || "Proceed along designated safe ridge path.",
      verified: true,
    });
  }

  // 3. Official standard NDRF / SDMA preventive directives
  guidelines.push({
    id: "dir-ndrf-evac-" + zone.id,
    title: "MANDATORY HIGH-GROUND DIRECTIVE: " + zone.name,
    source: "National Disaster Response Force (NDRF)",
    organization: "National Disaster Response Force (NDRF)",
    summary: "Rapid river swelling detected. All inhabitants within 1.5 km of river basin must ascend towards designated reinforced multi-hazard safe haven immediately.",
    full_text: "Rapid river swelling detected. All inhabitants within 1.5 km of river basin must ascend towards designated reinforced multi-hazard safe haven immediately. Do not attempt to cross flooded roadways or culverts.",
    body: "Rapid river swelling detected. All inhabitants within 1.5 km of river basin must ascend towards designated reinforced multi-hazard safe haven immediately. Do not attempt to cross flooded roadways or culverts.",
    source_type: "NATIONAL_CALAMITY",
    severity: "CRITICAL",
    ref_code: "NDRF-EVAC-2026",
    timestamp: new Date().toISOString(),
    contact_hotline: "1078",
    action_advice: "Ascend at least 15 meters above baseline river level. Carry dry water and medical kits.",
    verified: true,
  });

  guidelines.push({
    id: "dir-sdma-utility-" + zone.id,
    title: "MUNICIPAL PROTOCOL: UTILITY ISOLATION",
    source: "State Disaster Management Authority (SDMA)",
    organization: "State Disaster Management Authority (SDMA)",
    summary: "Shut down primary electrical circuit breakers and LPG gas cylinders before vacating ground structures. Avoid submerged transformer boxes.",
    full_text: "Shut down primary electrical circuit breakers and LPG gas cylinders before vacating ground structures. Avoid submerged transformer boxes and fallen electrical lines.",
    body: "Shut down primary electrical circuit breakers and LPG gas cylinders before vacating ground structures. Avoid submerged transformer boxes and fallen electrical lines.",
    source_type: "LOCAL_GOVT",
    severity: "WARNING",
    ref_code: "SDMA-PWR-04",
    timestamp: new Date().toISOString(),
    contact_hotline: "1070",
    action_advice: "Turn off main power breaker. Do not walk through floodwaters near power poles.",
    verified: true,
  });

  guidelines.push({
    id: "dir-news-weather-" + zone.id,
    title: "IMD FLASH ADVISORY: Cloudburst / Heavy Inundation",
    source: "India Meteorological Department (IMD)",
    organization: "India Meteorological Department (IMD)",
    summary: "Heavy to extremely heavy precipitation radar signatures observed over catchment tributaries. High possibility of sudden flash surge within 30-90 minutes.",
    full_text: "Heavy to extremely heavy precipitation radar signatures observed over catchment tributaries. High possibility of sudden flash surge within 30-90 minutes.",
    body: "Heavy to extremely heavy precipitation radar signatures observed over catchment tributaries. High possibility of sudden flash surge within 30-90 minutes.",
    source_type: "LOCAL_NEWS",
    severity: "ADVISORY",
    ref_code: "IMD-RADAR-ALERT",
    timestamp: new Date().toISOString(),
    contact_hotline: "112",
    action_advice: "Maintain offline BLE mesh connection on NeerNetra app for real-time coordinates.",
    verified: true,
  });

  const responsePayload: GovernmentGuidelinesResponse = {
    total: guidelines.length,
    last_updated: new Date().toISOString(),
    disaster_zone: zone.name,
    active_emergency_level: "RED_HIGH_ALERT",
    guidelines,
  };

  return NextResponse.json(responsePayload, { headers: corsHeaders });
}
