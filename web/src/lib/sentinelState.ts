/**
 * Shared in-memory state store for Landslide 1/3rd Sector Quorum Consensus
 * and USAR Building Collapse Sentinels on Next.js serverless/Node runtime.
 * Automatically synchronizes with FastAPI backend (http://127.0.0.1:8000) when available.
 */

export interface LandslideSectorState {
  sector_id: string;
  sector_name: string;
  lat: number;
  lng: number;
  total_active_phones: number;
  quorum_threshold: number;
  status: "MONITORING" | "PENDING_QUORUM" | "CONFIRMED_LANDSLIDE" | "RESOLVED_SAFE";
  reporting_devices: string[];
  reports: Array<{
    id: string;
    device_uuid: string;
    tremor_g: number;
    frequency_hz: number;
    duration_s: number;
    timestamp_sec: number;
    received_at: string;
  }>;
  first_detected_at?: string | null;
  last_report_at?: string | null;
  latest_tremor_g: number;
  latest_frequency_hz: number;
  confirmed_at?: string | null;
  has_active_directive?: boolean;
}

export interface CollapseClusterState {
  cluster_id: string;
  status: "PENDING_QUORUM" | "CONFIRMED_COLLAPSE" | "RESOLVED_SAFE";
  priority: string;
  centroid_lat: number;
  centroid_lng: number;
  radius_meters: number;
  reporting_devices: string[];
  trapped_headcount: number;
  first_detected_at: string;
  last_report_at: string;
  max_peak_g: number;
  average_confidence: number;
  elapsed_seconds: number;
  dispatched?: boolean;
  dispatched_at?: string | null;
}

interface SentinelGlobalState {
  sectors: Record<string, LandslideSectorState>;
  directives: Array<any>;
  collapseClusters: Record<string, CollapseClusterState>;
}

declare global {
  // eslint-disable-next-line no-var
  var __neernetra_sentinel_state: SentinelGlobalState | undefined;
}

function initDefaultState(): SentinelGlobalState {
  const now = new Date();
  return {
    sectors: {
      sector_wayanad_04: {
        sector_id: "sector_wayanad_04",
        sector_name: "Sector 4: Chooralmala / Meppadi (Wayanad)",
        lat: 11.5273,
        lng: 76.1242,
        total_active_phones: 9,
        quorum_threshold: 3,
        status: "MONITORING",
        reporting_devices: [],
        reports: [],
        first_detected_at: null,
        last_report_at: null,
        latest_tremor_g: 0.0,
        latest_frequency_hz: 0.0,
        confirmed_at: null,
        has_active_directive: false,
      },
      sector_joshimath_01: {
        sector_id: "sector_joshimath_01",
        sector_name: "Sector 1: Joshimath Central Valley",
        lat: 30.5573,
        lng: 79.5642,
        total_active_phones: 9,
        quorum_threshold: 3,
        status: "MONITORING",
        reporting_devices: [],
        reports: [],
        first_detected_at: null,
        last_report_at: null,
        latest_tremor_g: 0.0,
        latest_frequency_hz: 0.0,
        confirmed_at: null,
        has_active_directive: false,
      },
    },
    directives: [],
    collapseClusters: {},
  };
}

export function getGlobalState(): SentinelGlobalState {
  if (!global.__neernetra_sentinel_state) {
    global.__neernetra_sentinel_state = initDefaultState();
  }
  return global.__neernetra_sentinel_state;
}

export const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function proxyToBackend<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch {}
  return null;
}
