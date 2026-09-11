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
        <div className="bg-[#1b2027]/80 border-b border-white/10 px-4 lg:px-6 py-3 backdrop-blur-md font-sans text-white">
          <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1800px] mx-auto w-full text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold text-white uppercase tracking-[1.5px] text-[11px] font-display">
                /TACTICAL GIS RADAR:
              </span>
              <span className="font-bold text-white bg-white/10 px-3 py-0.5 rounded-full border border-white/15">
                {selectedZone.name} ({selectedZone.district})
              </span>
              <span className="text-white/60 font-medium">
                &bull; Danger Threshold: {selectedZone.dangerMarkM}m &bull; Elevation: {selectedZone.telemetry.slope_deg}&deg; Slope
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsRegionalModalOpen(true)}
                className="btn-solid-danger text-xs h-[38px] px-4"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Zone Broadcast</span>
              </button>
              <Link
                href="/rescue"
                className="btn-solid-primary text-xs h-[38px] px-4 flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Citizen Grid ({citizens.filter(c => c.status === "SOS").length})</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Main GIS Radar Stage */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1800px] mx-auto w-full space-y-5 font-sans">
          
          {/* Top Row: Full-Resolution GIS Map (Left 8 Cols) + Verified Safe Routes (Right 4 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* GIS Tactical Map Container */}
            <div className="lg:col-span-8 flex flex-col space-y-4">
              <div className="w-full h-[580px] lg:h-[660px] rounded-2xl overflow-hidden border border-white/15 shadow-sm relative bg-[#161a20]">
                {/* Floating Map Header Chip */}
                <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 bg-[#161a20]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-md text-white font-sans">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-bold text-white font-display uppercase">{selectedZone.name}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-red-600 text-white tracking-wider">
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
              <div className="rounded-2xl glass-panel border border-white/10 p-4 shadow-sm">
                <HydrographPanel activeZone={selectedZone} />
              </div>
            </div>

            {/* Right 4 Cols: Verified Safe Evacuation Routes & High Ground Shelters */}
            <div className="lg:col-span-4 flex flex-col space-y-4">
              
              {/* Safe Evacuation Corridors Drawer */}
              <div className="rounded-2xl glass-panel border border-white/10 p-5 shadow-sm space-y-4 flex-1 text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="corwdy-subtitle">
                    <Compass className="w-3.5 h-3.5 text-white/80" />
                    <span>/SAFE ROUTES ({activeSafeRoutes.length})</span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                    +20M CLEARANCE
                  </span>
                </div>

                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                  {activeSafeRoutes.map((route, idx) => (
                    <div
                      key={route.id}
                      className="p-4 rounded-2xl bg-[#1b2027]/75 border border-white/10 shadow-xs hover:border-white/25 transition space-y-3 text-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2 font-display">
                            <span className="w-5 h-5 rounded-full bg-white text-[#161a20] text-[10px] flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span>{route.route_name}</span>
                          </div>
                          <div className="text-[11px] text-white/60 flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3 h-3 text-white/50" />
                            <span>Destination: {route.assembly_point_name}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0 uppercase tracking-wider">
                          +{route.elevation_gain_m}m Gain
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/70">
                        <div>
                          <span className="text-white/40 block uppercase text-[9px] font-semibold">Distance</span>
                          <span className="font-bold text-white">{route.distance_km} km</span>
                        </div>
                        <div>
                          <span className="text-white/40 block uppercase text-[9px] font-semibold">Walking ETA</span>
                          <span className="font-bold text-white">{route.walk_time_minutes} mins</span>
                        </div>
                        <div>
                          <span className="text-white/40 block uppercase text-[9px] font-semibold">Shelter Cap</span>
                          <span className="font-bold text-white">{route.shelter_capacity} Pax</span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => handleFocusRoute(route)}
                          className="btn-solid-primary w-full text-xs h-[36px]"
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
                  className="btn-solid-dark w-full text-xs h-[40px]"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                  <span>Broadcast Routes &amp; Guidelines</span>
                </button>
              </div>

              {/* Civil Defense Quick Help Desk */}
              <div className="rounded-2xl glass-panel border border-white/10 p-5 shadow-sm space-y-3 text-xs text-white">
                <div className="corwdy-subtitle">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>/CIVIL DEFENSE HOTLINES</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 text-center pt-1 font-sans">
                  <a
                    href="tel:1078"
                    className="p-3 rounded-2xl bg-[#1b2027]/75 border border-white/10 hover:bg-[#212730]/90 transition block text-white"
                  >
                    <div className="font-bold text-sm text-emerald-400 font-display">1078</div>
                    <div className="text-[10px] text-white/60 mt-0.5">NDRF Control</div>
                  </a>
                  <a
                    href="tel:1070"
                    className="p-3 rounded-2xl bg-[#1b2027]/75 border border-white/10 hover:bg-[#212730]/90 transition block text-white"
                  >
                    <div className="font-bold text-sm text-sky-400 font-display">1070</div>
                    <div className="text-[10px] text-white/60 mt-0.5">State SDMA</div>
                  </a>
                  <a
                    href="tel:108"
                    className="p-3 rounded-2xl bg-[#1b2027]/75 border border-white/10 hover:bg-[#212730]/90 transition block text-white"
                  >
                    <div className="font-bold text-sm text-rose-400 font-display">108</div>
                    <div className="text-[10px] text-white/60 mt-0.5">ALS Ambulance</div>
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

