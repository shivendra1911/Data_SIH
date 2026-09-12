import { NextRequest, NextResponse } from "next/server";
import { SOSCluster, CitizenLocation } from "@/lib/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zoneId = searchParams.get("zone_id") || "chamoli_01";

  // Check if external FastAPI backend is reachable on port 8000
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    const backendRes = await fetch(`http://127.0.0.1:8000/api/sos/clusters?zone_id=${zoneId}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data, { headers: corsHeaders });
    }
  } catch {}

  // Compute live clusters dynamically from actual in-memory citizen telemetry
  const citizens: CitizenLocation[] = (global as any).__NEERNETRA_CITIZENS__ || [];
  const zoneCitizens = citizens.filter((c) => !c.zone_id || c.zone_id === zoneId);

  const clusters: SOSCluster[] = [];

  if (zoneCitizens.length > 0) {
    // Group citizens within ~1km of each other
    const visited = new Set<string>();

    for (let i = 0; i < zoneCitizens.length; i++) {
      const c = zoneCitizens[i];
      if (visited.has(c.id)) continue;

      const group = [c];
      visited.add(c.id);

      for (let j = i + 1; j < zoneCitizens.length; j++) {
        const other = zoneCitizens[j];
        if (visited.has(other.id)) continue;
        const dLat = Math.abs(c.lat - other.lat);
        const dLng = Math.abs(c.lng - other.lng);
        if (dLat < 0.015 && dLng < 0.015) {
          group.push(other);
          visited.add(other.id);
        }
      }

      const avgLat = group.reduce((sum, g) => sum + g.lat, 0) / group.length;
      const avgLng = group.reduce((sum, g) => sum + g.lng, 0) / group.length;
      const hasMedical = group.some((g) => g.medical_distress && g.medical_distress !== "NONE");

      clusters.push({
        cluster_id: i + 1,
        center_lat: avgLat,
        center_lng: avgLng,
        total_people: group.length,
        priority: group.length >= 3 || hasMedical ? "P1" : "P2",
        dispatched: false,
        assigned_team: hasMedical ? "NDRF Alpha Team (Medical)" : "SDRF Local Boat 2",
      });
    }
  }

  return NextResponse.json(
    {
      status: "success",
      zone_id: zoneId,
      clusters,
      total_citizens: zoneCitizens.length,
    },
    { headers: corsHeaders }
  );
}

