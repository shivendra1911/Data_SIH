"use client";

import dynamic from "next/dynamic";
import {
  HazardZone,
  SOSCluster,
  SOSEvent,
  CitizenLocation,
  SafeEvacuationRoute,
  EmergencyResponder,
} from "@/lib/types";

interface MapWrapperProps {
  center: [number, number];
  zoom: number;
  sosEvents: SOSEvent[];
  clusters: SOSCluster[];
  activeZone: HazardZone;
  citizens?: CitizenLocation[];
  safeRoutes?: SafeEvacuationRoute[];
  responders?: EmergencyResponder[];
  selectedEventId?: string;
  onSelectEvent?: (event: SOSEvent) => void;
  onDispatchCluster?: (clusterId: number) => void;
}

// Dynamically import EmergencyMap without SSR
const EmergencyMap = dynamic(() => import("./EmergencyMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[460px] rounded-2xl border border-white/10 bg-[#161a20] flex flex-col items-center justify-center gap-3 p-6 text-white/70">
      <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      <p className="text-sm font-medium tracking-wide text-white">
        Initializing Tactical Geospatial Radar...
      </p>
      <span className="text-xs text-white/40">
        Streaming PostGIS coordinates from Supabase
      </span>
    </div>
  ),
});

export default function MapWrapper(props: MapWrapperProps) {
  return <EmergencyMap {...props} />;
}
