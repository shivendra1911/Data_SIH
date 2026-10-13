import { NextRequest, NextResponse } from "next/server";
import { getGlobalState, proxyToBackend } from "@/lib/sentinelState";
import { supabase } from "@/lib/supabase";
import { CitizenLocation } from "@/lib/types";
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

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const deviceUuid = body.device_uuid;

  // 1. Update citizen status in active radar store
  if (global.__NEERNETRA_CITIZENS__ && deviceUuid) {
    const citIdx = global.__NEERNETRA_CITIZENS__.findIndex((c) => c.device_uuid === deviceUuid);
    if (citIdx >= 0) {
      global.__NEERNETRA_CITIZENS__[citIdx].status = "SAFE";
      global.__NEERNETRA_CITIZENS__[citIdx].medical_distress = "NONE";
      global.__NEERNETRA_CITIZENS__[citIdx].sos_type = "SAFE CONFIRMATION";
    }
  }

  // 2. Silence corresponding mobile siren dispatches
  if (global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__) {
    global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__.forEach((rec, key) => {
      if (key.includes("clp_cluster") || key.includes("collapse")) {
        rec.is_active = false;
        global.__NEERNETRA_MOBILE_SIREN_DISPATCHES__!.set(key, rec);
      }
    });
  }

  // 3. Post HALTED_SIREN to Supabase cloud and resolve active collapse events
  try {
    await supabase.from("sos_alerts").insert([
      {
        device_id: "ADMIN_SIREN_DISPATCH",
        lat: 27.6015,
        lng: 77.5975,
        sos_type: "CIVIL_DEFENSE_SIREN",
        status: "HALTED_SIREN",
        battery_level: 100,
        notes: JSON.stringify({
          zone_id: "collapse_sectors",
          action: "HALT",
          authorized_by: "User SAFE Confirmation",
          halted_at: new Date().toISOString(),
        }),
      },
    ]);

    if (body.reset) {
      await supabase
        .from("sos_alerts")
        .update({ status: "RESOLVED_SAFE" })
        .eq("sos_type", "COLLAPSE");
    }
  } catch {}

  // 4. Forward to FastAPI backend if running
  const backendData = await proxyToBackend<any>("/api/collapse/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (backendData && backendData.success !== undefined) {
    return NextResponse.json(backendData, { headers: corsHeaders });
  }

  // 5. Fallback to in-memory state
  const state = getGlobalState();
  const affectedClusters: string[] = [];

  if (body.reset) {
    state.collapseClusters = {};
    return NextResponse.json(
      {
        success: true,
        status: "RESET",
        message: "All collapse clusters reset to normal",
        affected_clusters: [],
      },
      { headers: corsHeaders }
    );
  }

  if (body.cluster_id) {
    const cid = body.cluster_id;
    delete state.collapseClusters[cid];
    affectedClusters.push(cid);
  }

  for (const [cid, cl] of Object.entries(state.collapseClusters)) {
    if (deviceUuid && (cl.reporting_devices.includes(deviceUuid) || deviceUuid.startsWith("col_phone"))) {
      cl.reporting_devices = cl.reporting_devices.filter((d) => d !== deviceUuid);
      cl.trapped_headcount = cl.reporting_devices.length;
      if (cl.reporting_devices.length < 3) {
        cl.status = "PENDING_QUORUM";
        cl.priority = "P2-HIGH";
      }
      if (cl.reporting_devices.length === 0) {
        cl.status = "RESOLVED_SAFE";
        cl.priority = "NORMAL";
        delete state.collapseClusters[cid];
      }
      affectedClusters.push(cid);
    }
  }

  return NextResponse.json(
    {
      success: true,
      status: "CANCELLED",
      message: "Collapse alarm safely cancelled by user ('I AM SAFE' verified)",
      affected_clusters: affectedClusters,
    },
    { headers: corsHeaders }
  );
}
