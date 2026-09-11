import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { SOSEvent } from "./types";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://neernetra.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_sqCaR-QnTPSE2PVW3FmCtg_AKwBWJpN";

// Safe client instantiation
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Helper to subscribe to real-time additions to the `sos_events` table.
 * If Supabase is unreachable or not configured with valid credentials,
 * the error callback triggers gracefully without crashing the UI.
 */
export function subscribeToSOSEvents(
  onNewEvent: (event: SOSEvent) => void,
  onError?: (error: any) => void
): () => void {
  // If Supabase is unconfigured or pointing to placeholder domain, bypass to prevent network spam
  const isDummyUrl =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    supabaseUrl.includes("neernetra.supabase.co") ||
    supabaseUrl.includes("example.com");
  if (isDummyUrl) {
    return () => {};
  }

  try {
    const channel: RealtimeChannel = supabase
      .channel("public:sos_events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sos_events" },
        (payload) => {
          const raw = payload.new as any;
          // Extract PostGIS coordinates if formatted as GeoJSON or lat/lng
          let lat = raw.lat;
          let lng = raw.lng;
          if (!lat && raw.location && raw.location.coordinates) {
            lng = raw.location.coordinates[0];
            lat = raw.location.coordinates[1];
          }

          const parsedEvent: SOSEvent = {
            id: raw.id || `sos-${Date.now()}`,
            device_uuid: raw.device_uuid || "unknown-device",
            lat: Number(lat) || 30.5573,
            lng: Number(lng) || 79.5642,
            status: (raw.status as any) || "SOS",
            sos_type: raw.sos_type || "EMERGENCY BEACON",
            is_mesh_relayed: Boolean(raw.is_mesh_relayed),
            created_at: raw.created_at || new Date().toISOString(),
          };

          onNewEvent(parsedEvent);
        }
      )
      .subscribe((status, err) => {
        if (err && onError) {
          onError(err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}
