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
    <div className="w-full h-full min-h-[460px] rounded-2xl border border-slate-700 bg-slate-900 flex flex-col items-center justify-center gap-3 p-6 text-slate-300">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-sm font-bold tracking-wide text-white">
        Connecting Google Maps Satellite & Terrain Radar...
      </p>
      <span className="text-xs text-slate-400">
        Streaming PostGIS live telemetry via Google Maps Engine
      </span>
    </div>
  ),
});

export default function MapWrapper(props: MapWrapperProps) {
  return <EmergencyMap {...props} />;
}
