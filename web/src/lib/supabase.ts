import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { SOSEvent } from "./types";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://nratutjgjodkbysxyxem.supabase.co";
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
 * Helper to subscribe to real-time additions to the `sos_alerts` table.
 * If Supabase is unreachable or not configured with valid credentials,
 * the error callback triggers gracefully without crashing the UI.
 */
export function subscribeToSOSEvents(
  onNewEvent: (event: SOSEvent) => void,
  onError?: (error: any) => void
): () => void {
  const isDummyUrl =
    !supabaseUrl ||
    supabaseUrl.includes("example.com") ||
    supabaseUrl.includes("your-project");
  if (isDummyUrl) {
    return () => {};
  }

  try {
    const channel: RealtimeChannel = supabase
      .channel("public:sos_alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_alerts" },
        (payload) => {
          const raw = payload.new as any;
          if (!raw) return;

          // Extract PostGIS coordinates if formatted as GeoJSON or lat/lng
          let lat = raw.lat;
          let lng = raw.lng;
          if (!lat && raw.location && raw.location.coordinates) {
            lng = raw.location.coordinates[0];
            lat = raw.location.coordinates[1];
          }

          const parsedEvent: SOSEvent = {
            id: raw.id || `sos-${Date.now()}`,
            device_uuid: raw.device_id || raw.device_uuid || "mobile_citizen",
            lat: Number(lat) || 27.6014,
            lng: Number(lng) || 77.5971,
            status: (raw.status as any) || "SOS",
            sos_type: raw.sos_type || "MOBILE DISTRESS BEACON",
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
