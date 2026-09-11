"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Header from "@/components/Dashboard/Header";
import HydrographPanel from "@/components/Dashboard/HydrographPanel";
import MobilePairingModal from "@/components/Dashboard/MobilePairingModal";
import RegionalAlertBroadcastModal from "@/components/Dashboard/RegionalAlertBroadcastModal";
import SafeRouteGuidelineModal from "@/components/Dashboard/SafeRouteGuidelineModal";
import {
  INDIA_FLOOD_ZONES,
  SAFE_EVACUATION_ROUTES,
  INITIAL_CITIZEN_LOCATIONS,
  INITIAL_MOCK_SOS_EVENTS,
  INITIAL_MOCK_CLUSTERS,
  EMERGENCY_RESPONDERS_GRID,
} from "@/lib/constants";
import {
  HazardZone,
  SOSEvent,
  SOSCluster,
  CitizenLocation,
  SafeEvacuationRoute,
  EmergencyResponder,
} from "@/lib/types";
import {
  Compass,
  MapPin,
  Radio,
  Users,
  ShieldAlert,
  ArrowRight,
  Send,
  Building,
  Footprints,
  PhoneCall,
  Volume2,
} from "lucide-react";

// Dynamically import Leaflet MapWrapper to prevent SSR window issues
const MapWrapper = dynamic(() => import("@/components/Map/MapWrapper"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[580px] rounded-2xl flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md text-slate-400 gap-3 border border-white/20">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      <span className="text-xs font-mono tracking-wider uppercase text-slate-300">
        Loading GIS Tactical Radar Engine...
      </span>
    </div>
  ),
});

export default function TacticalRadarPage() {
  const [selectedZone, setSelectedZone] = useState<HazardZone>(INDIA_FLOOD_ZONES[0]);
  const [sosEvents, setSOSEvents] = useState<SOSEvent[]>(INITIAL_MOCK_SOS_EVENTS);
  const [clusters, setClusters] = useState<SOSCluster[]>(INITIAL_MOCK_CLUSTERS);
  const [mapCenter, setMapCenter] = useState<[number, number]>(INDIA_FLOOD_ZONES[0].center);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [isRegionalModalOpen, setIsRegionalModalOpen] = useState<boolean>(false);
  const [isGuidelineModalOpen, setIsGuidelineModalOpen] = useState<boolean>(false);
  const [citizens, setCitizens] = useState<CitizenLocation[]>(INITIAL_CITIZEN_LOCATIONS);

  const activeSafeRoutes: SafeEvacuationRoute[] =
    SAFE_EVACUATION_ROUTES[selectedZone.id] ||
    SAFE_EVACUATION_ROUTES["chamoli_01"] ||
    [];

  const activeResponders: EmergencyResponder[] =
    EMERGENCY_RESPONDERS_GRID[selectedZone.id] ||
    EMERGENCY_RESPONDERS_GRID["chamoli_01"] ||
    [];


  const playAlertSound = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } catch {}
    }
  }, []);

  // Poll citizen distress locations from shared Node store
  useEffect(() => {
    const fetchCit = async () => {
      try {
        const res = await fetch("/api/citizen/locations");
        if (res.ok) {
          const data = await res.json();
          if (data.citizens) setCitizens(data.citizens);
        }
      } catch {}
    };
    fetchCit();
    const interval = setInterval(fetchCit, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleSelectZone = (zone: HazardZone) => {
    setSelectedZone(zone);
    setMapCenter(zone.center);
    setMapZoom(12);
  };

  const handleFocusRoute = (route: SafeEvacuationRoute) => {
    setMapCenter(route.start_coords);
    setMapZoom(14);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent text-slate-950 font-sans selection:bg-violet-600 selection:text-white">
      {/* Background Video */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
        <video
          src="/download.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-900/40 to-slate-950/75 pointer-events-none" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col bg-transparent">
        <Header
          selectedZone={selectedZone}
          onSelectZone={handleSelectZone}
          onSimulateSOS={() => {
            if (soundEnabled) playAlertSound();
          }}
          onOpenMobileModal={() => setIsMobileModalOpen(true)}
          onOpenRegionalBroadcast={() => setIsRegionalModalOpen(true)}
          onOpenSafeRoutesGuidelines={() => setIsGuidelineModalOpen(true)}
          floodRiskPercent={selectedZone.currentRisk}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((p) => !p)}
        />

        {/* Tactical Command Action Strip */}
        <div className="glass-panel border-b border-white/60 px-4 lg:px-6 py-2.5 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1800px] mx-auto w-full text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span className="font-extrabold text-slate-950 uppercase tracking-tight">
                Sector Under Tactical GIS Command:
              </span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                {selectedZone.name} ({selectedZone.district})
              </span>
              <span className="text-slate-600 font-medium">
                &bull; Danger Threshold: {selectedZone.dangerMarkM}m &bull; Elevation: {selectedZone.telemetry.slope_deg}&deg; Slope
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRegionalModalOpen(true)}
                className="btn-solid-danger text-xs h-[34px] px-3.5"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Trigger Zone Broadcast</span>
              </button>
              <Link
                href="/rescue"
                className="btn-solid-primary text-xs h-[34px] px-3.5 flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>View Citizen SOS Grid ({citizens.filter(c => c.status === "SOS").length})</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Main GIS Radar Stage */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1800px] mx-auto w-full space-y-5">
          
          {/* Top Row: Full-Resolution GIS Map (Left 8 Cols) + Verified Safe Routes (Right 4 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* GIS Tactical Map Container */}
            <div className="lg:col-span-8 flex flex-col space-y-4">
              <div className="w-full h-[580px] lg:h-[660px] rounded-2xl overflow-hidden border border-white/70 shadow-sm relative bg-white">
                {/* Floating Map Header Chip */}
                <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  <span className="text-xs font-bold text-slate-900">{selectedZone.name}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded uppercase bg-red-600 text-white">
                    {selectedZone.currentRisk}% RISK
                  </span>
                </div>

                <MapWrapper
                  center={mapCenter}
                  zoom={mapZoom}
                  sosEvents={sosEvents}
                  clusters={clusters}
                  activeZone={selectedZone}
                  citizens={citizens}
                  safeRoutes={activeSafeRoutes}
                  responders={activeResponders}
                  selectedEventId={selectedEventId}
                  onSelectEvent={(e) => {
                    setSelectedEventId(e.id);
                    setMapCenter([e.lat, e.lng]);
                    setMapZoom(15);
                  }}
                  onDispatchCluster={() => {}}
                />
              </div>

              {/* Inundation Hydrograph Panel */}
              <div className="rounded-2xl glass-panel border border-white/70 p-4 shadow-sm">
                <HydrographPanel activeZone={selectedZone} />
              </div>
            </div>

            {/* Right 4 Cols: Verified Safe Evacuation Routes & High Ground Shelters */}
            <div className="lg:col-span-4 flex flex-col space-y-4">
              
              {/* Safe Evacuation Corridors Drawer */}
              <div className="rounded-2xl glass-panel border border-white/70 p-4 shadow-sm space-y-3.5 flex-1">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Safe Evacuation Routes ({activeSafeRoutes.length})
                    </h3>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    +20M CLEARANCE
                  </span>
                </div>

                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                  {activeSafeRoutes.map((route, idx) => (
                    <div
                      key={route.id}
                      className="p-3.5 rounded-xl bg-white/90 border border-slate-200 shadow-xs hover:border-emerald-500 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-mono">
                              {idx + 1}
                            </span>
                            <span>{route.route_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>Destination: {route.assembly_point_name}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          +{route.elevation_gain_m}m Gain
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-700">
                        <div>
                          <span className="text-slate-400 block">Distance</span>
                          <span className="font-bold">{route.distance_km} km</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Walking ETA</span>
                          <span className="font-bold">{route.walk_time_minutes} mins</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Shelter Cap</span>
                          <span className="font-bold">{route.shelter_capacity} Pax</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleFocusRoute(route)}
                          className="flex-1 py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 min-h-[32px]"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Track Path on Map</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setIsGuidelineModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition flex items-center justify-center gap-2 min-h-[38px] shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Broadcast Routes & Guidelines to Zone</span>
                </button>
              </div>

              {/* Civil Defense Quick Help Desk */}
              <div className="rounded-2xl glass-panel border border-white/70 p-4 shadow-sm space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  Emergency Civil Defense Hotlines
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <a
                    href="tel:1078"
                    className="p-2 rounded-lg bg-white/80 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 transition block"
                  >
                    <div className="font-extrabold text-emerald-700">1078</div>
                    <div className="text-[10px] text-slate-500">NDRF Control</div>
                  </a>
                  <a
                    href="tel:1070"
                    className="p-2 rounded-lg bg-white/80 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition block"
                  >
                    <div className="font-extrabold text-blue-700">1070</div>
                    <div className="text-[10px] text-slate-500">State SDMA</div>
                  </a>
                  <a
                    href="tel:108"
                    className="p-2 rounded-lg bg-white/80 border border-slate-200 hover:bg-rose-50 hover:border-rose-300 transition block"
                  >
                    <div className="font-extrabold text-rose-700">108</div>
                    <div className="text-[10px] text-slate-500">ALS Ambulance</div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <MobilePairingModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        onSimulateAndroidSOS={() => {
          if (soundEnabled) playAlertSound();
        }}
      />

      <RegionalAlertBroadcastModal
        isOpen={isRegionalModalOpen}
        onClose={() => setIsRegionalModalOpen(false)}
        activeZone={selectedZone}
        riskPercent={selectedZone.currentRisk}
      />

      <SafeRouteGuidelineModal
        isOpen={isGuidelineModalOpen}
        onClose={() => setIsGuidelineModalOpen(false)}
        activeZone={selectedZone}
        safeRoutes={activeSafeRoutes}
        onBroadcastGuidelines={() => {
          if (soundEnabled) playAlertSound();
        }}
      />
    </div>
  );
}

