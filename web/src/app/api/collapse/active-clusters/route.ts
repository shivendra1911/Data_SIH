import { NextResponse } from "next/server";
import { getGlobalState, proxyToBackend } from "@/lib/sentinelState";
import { supabase } from "@/lib/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

export async function GET() {
  // 1. Try external FastAPI backend if running
  const backendData = await proxyToBackend<any>("/api/collapse/active-clusters");
  if (backendData && Array.isArray(backendData.clusters) && backendData.clusters.length > 0) {
    return NextResponse.json(backendData, { headers: corsHeaders });
  }

  // 2. Fetch recent genuine collapse reports from Supabase Cloud table (cross-serverless synchronization)
  const clustersMap = new Map<string, any>();
  const inMemoryState = getGlobalState();

  // Load in-memory clusters first
  for (const [cid, cl] of Object.entries(inMemoryState.collapseClusters)) {
    if (cl.status !== "RESOLVED_SAFE") {
      clustersMap.set(cid, { ...cl });
    }
  }

  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: supaReports, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("sos_type", "COLLAPSE")
      .neq("status", "RESOLVED_SAFE")
      .gte("created_at", thirtyMinsAgo)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(supaReports) && supaReports.length > 0) {
      for (const row of supaReports) {
        const lat = Number(row.lat);
        const lng = Number(row.lng);
        const deviceId = row.device_id || "phone_unknown";
        let parsedNotes: any = {};
        try {
          if (row.notes) parsedNotes = JSON.parse(row.notes);
        } catch {}

        const peakG = Number(parsedNotes.peak_g) || 4.2;
        const conf = Number(parsedNotes.confidence) || 0.94;

        // Spatial match to an existing cluster within 100 meters
        let matchedKey: string | null = null;
        for (const [key, cl] of Array.from(clustersMap.entries())) {
          if (haversineMeters(cl.centroid_lat, cl.centroid_lng, lat, lng) <= 100) {
            matchedKey = key;
            break;
          }
        }

        const clusterId = matchedKey || parsedNotes.cluster_id || `clp_${lat.toFixed(3).replace(".", "_")}_${lng.toFixed(3).replace(".", "_")}`;

        if (!clustersMap.has(clusterId)) {
          clustersMap.set(clusterId, {
            cluster_id: clusterId,
            status: "PENDING_QUORUM",
            priority: "P2-HIGH",
            centroid_lat: lat,
            centroid_lng: lng,
            radius_meters: 100,
            reporting_devices: [deviceId],
            trapped_headcount: 1,
            first_detected_at: row.created_at,
            last_report_at: row.created_at,
            max_peak_g: peakG,
            average_confidence: conf,
            elapsed_seconds: Math.floor((Date.now() - new Date(row.created_at).getTime()) / 1000),
          });
        } else {
          const cl = clustersMap.get(clusterId);
          if (!cl.reporting_devices.includes(deviceId)) {
            cl.reporting_devices.push(deviceId);
            cl.trapped_headcount = cl.reporting_devices.length;
          }
          const n = cl.reporting_devices.length;
          cl.centroid_lat = Number(((cl.centroid_lat * (n - 1) + lat) / n).toFixed(5));
          cl.centroid_lng = Number(((cl.centroid_lng * (n - 1) + lng) / n).toFixed(5));
          cl.max_peak_g = Math.max(cl.max_peak_g, peakG);
        }
      }
    }
  } catch {}

  // Determine confirmed status: >= 3 devices within 100m
  const clustersList = Array.from(clustersMap.values()).map((cl) => {
    const isConfirmed = cl.reporting_devices.length >= 3;
    return {
      ...cl,
      status: isConfirmed ? "CONFIRMED_COLLAPSE" : "PENDING_QUORUM",
      priority: isConfirmed ? "P1-CRITICAL" : "P2-HIGH",
    };
  });

  return NextResponse.json(
    {
      total_active_clusters: clustersList.length,
      confirmed_clusters_count: clustersList.filter((c) => c.status === "CONFIRMED_COLLAPSE").length,
      clusters: clustersList,
    },
    { headers: corsHeaders }
  );
}
