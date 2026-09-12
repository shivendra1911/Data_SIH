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
  DEFAULT_USER_ZONE,
  getSafeRoutesForZone,
  getRespondersForZone,
} from "@/lib/constants";
import {
  HazardZone,
  SOSEvent,
  SOSCluster,
  CitizenLocation,
  SafeEvacuationRoute,
  EmergencyResponder,
} from "@/lib/types";
import { fetchActiveClusters } from "@/lib/api";
import { useRabtoTilt } from "@/lib/useRabtoTilt";
import {
  Compass,
  MapPin,
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
    <div className="w-full h-full min-h-[580px] rounded-2xl flex flex-col items-center justify-center bg-slate-100 text-slate-600 gap-3 border border-slate-300">
      <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
      <span className="text-xs font-mono tracking-wider uppercase text-slate-700">
        Loading GIS Tactical Radar Engine...
      </span>
    </div>
  ),
});

export default function TacticalRadarPage() {
  useRabtoTilt();
  const [selectedZone, setSelectedZone] = useState<HazardZone>(INDIA_FLOOD_ZONES[0]);
  const [sosEvents, setSOSEvents] = useState<SOSEvent[]>([]);
  const [clusters, setClusters] = useState<SOSCluster[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(INDIA_FLOOD_ZONES[0].center);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [isRegionalModalOpen, setIsRegionalModalOpen] = useState<boolean>(false);
  const [isGuidelineModalOpen, setIsGuidelineModalOpen] = useState<boolean>(false);
  const [citizens, setCitizens] = useState<CitizenLocation[]>([]);

  const activeSafeRoutes: SafeEvacuationRoute[] = getSafeRoutesForZone(selectedZone);
  const activeResponders: EmergencyResponder[] = getRespondersForZone(selectedZone);

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

  // Poll citizen distress locations and clusters from live API (tab-visibility aware)
  useEffect(() => {
    const fetchCit = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const [citRes, clusterList] = await Promise.all([
          fetch("/api/citizen/locations"),
          fetchActiveClusters(selectedZone.id),
        ]);
        if (citRes.ok) {
          const data = await citRes.json();
          if (data.citizens && Array.isArray(data.citizens)) {
            setCitizens(data.citizens);
            const liveSos: SOSEvent[] = data.citizens
              .filter((c: CitizenLocation) => c.status === "SOS")
              .map((c: CitizenLocation) => ({
                id: c.id,
                device_uuid: c.device_uuid,
                lat: c.lat,
                lng: c.lng,
                status: c.status,
                sos_type: c.sos_type,
                is_mesh_relayed: c.mesh_hops > 0,
                created_at: new Date().toISOString(),
                rescued: false,
              }));
            setSOSEvents(liveSos);
          }
        }
        setClusters(clusterList);
      } catch {}
    };
    fetchCit();
    const interval = setInterval(fetchCit, 12000);
    return () => clearInterval(interval);
  }, [selectedZone.id]);

  const handleSelectZone = (zone: HazardZone) => {
    setSelectedZone(zone);
    setMapCenter(zone.center);
    setMapZoom(12);
  };

  const handleFocusRoute = (route: SafeEvacuationRoute) => {
    setMapCenter(route.start_coords);
    setMapZoom(14);
  };

  const detectLiveLocation = useCallback(async () => {
    try {
      const res = await fetch("/api/geolocation");
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) {
          const locName = `${data.city} (${data.region})`;
          const userZone: HazardZone = {
            id: "live_user_location",
            name: locName,
            district: data.city,
            center: [data.lat, data.lng],
            dangerMarkM: 5.0,
            warningMarkM: 3.5,
            currentRisk: 6.5,
            alertColor: "GREEN",
            leadTimeMinutes: 480,
            primaryTrigger: "Live Meteorological Telemetry",
            telemetry: {
              rainfall_mm: 0.0,
              soil_moisture_pct: 45.0,
              slope_deg: 10.0,
              river_level_m: 1.2,
              seismic_mag: 0.0,
            },
          };
          setSelectedZone(userZone);
          setMapCenter([data.lat, data.lng]);
        }
      }
    } catch (e) {
      console.warn("Radar geolocation error:", e);
    }
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Fixed Ambient Dynamic Video Background */}
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
        <div className="absolute inset-0 bg-gradient-to-b from-[#161a20]/70 via-[#161a20]/35 to-[#161a20]/75 pointer-events-none" />
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
          onDetectLiveLocation={detectLiveLocation}
          floodRiskPercent={selectedZone.currentRisk}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((p) => !p)}
          connectedMobileCount={citizens.length}
        />

        {/* Live status strip — Frosted Glass Theme */}
        <div className="bg-[#161a20]/80 backdrop-blur-xl border-b border-white/10 px-4 lg:px-6 py-3 shadow-md font-sans text-white">
          <div className="flex flex-wrap items-center gap-3 max-w-[1800px] mx-auto w-full text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-extrabold text-white uppercase tracking-[1.5px] text-[11px] font-display">
              LIVE FLOOD RADAR MAP:
            </span>
            <span className="font-bold text-white bg-white/10 px-3 py-0.5 rounded-full border border-white/15">
              {selectedZone.name} ({selectedZone.district})
            </span>
            <span className="text-white/60 font-medium">
              &bull; Danger Mark: {selectedZone.dangerMarkM}m &bull; Slope: {selectedZone.telemetry.slope_deg}&deg;
            </span>
            {citizens.filter((c) => c.status === "SOS").length > 0 && (
              <Link
                href="/rescue"
                className="ml-auto h-[32px] px-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm animate-pulse"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{citizens.filter((c) => c.status === "SOS").length} Active SOS &bull; Open Rescue Hub</span>
              </Link>
            )}
          </div>
        </div>

        {/* Main GIS Radar Stage */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1800px] mx-auto w-full space-y-5 font-sans">
          
          {/* Top Row: Full-Resolution GIS Map (Left 8 Cols) + Verified Safe Routes (Right 4 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* GIS Tactical Map Container */}
            <div className="lg:col-span-8 flex flex-col space-y-4">
              <div className="w-full h-[580px] lg:h-[660px] rounded-2xl overflow-hidden border border-slate-300 shadow-sm relative bg-white">
                {/* Floating Map Header Chip with User Color-Coding */}
                <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-300 shadow-md text-slate-900 font-sans">
                  <span className={`w-2 h-2 rounded-full ${
                    selectedZone.currentRisk >= 70
                      ? "bg-red-600 animate-pulse"
                      : selectedZone.currentRisk >= 35
                      ? "bg-amber-500 animate-pulse"
                      : "bg-emerald-600 animate-pulse"
                  }`} />
                  <span className="text-xs font-bold text-slate-950 font-display uppercase">{selectedZone.name}</span>
                  <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    selectedZone.currentRisk >= 70
                      ? "bg-red-50 text-red-700 border border-red-300"
                      : selectedZone.currentRisk >= 35
                      ? "bg-amber-50 text-amber-800 border border-amber-300"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-300"
                  }`}>
                    {selectedZone.currentRisk.toFixed(0)}% RISK
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

              {/* Inundation Hydrograph Panel in White Theme */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <HydrographPanel activeZone={selectedZone} />
              </div>
            </div>

            {/* Right 4 Cols: Verified Safe Evacuation Routes & High Ground Shelters */}
            <div className="lg:col-span-4 flex flex-col space-y-4">
              
              {/* Safe Evacuation Corridors Drawer in White Theme */}
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4 flex-1 text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    <Compass className="w-4 h-4 text-slate-700" />
                    <span>SAFE ROUTES ({activeSafeRoutes.length})</span>
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
                    +20M CLEARANCE
                  </span>
                </div>

                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                  {activeSafeRoutes.map((route, idx) => (
                    <div
                      key={route.id}
                      className="p-4 rounded-2xl bg-[#faf9f5] border border-slate-200 shadow-2xs hover:border-slate-400 transition space-y-3 text-slate-900"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-extrabold text-slate-950 flex items-center gap-2 font-display">
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span>{route.route_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>Destination: {route.assembly_point_name}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0 uppercase tracking-wider">
                          +{route.elevation_gain_m}m Gain
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white border border-slate-200 text-[10px] text-slate-700">
                        <div>
                          <span className="text-slate-500 block uppercase text-[9px] font-semibold">Distance</span>
                          <span className="font-bold text-slate-950">{route.distance_km} km</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase text-[9px] font-semibold">Walking ETA</span>
                          <span className="font-bold text-slate-950">{route.walk_time_minutes} mins</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase text-[9px] font-semibold">Capacity</span>
                          <span className="font-bold text-slate-950">{route.shelter_capacity} Pax</span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => handleFocusRoute(route)}
                          className="w-full h-[36px] rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs"
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
                  className="w-full h-[40px] rounded-xl bg-[#faf9f5] hover:bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5 text-slate-700" />
                  <span>Broadcast Routes &amp; Guidelines</span>
                </button>
              </div>

              {/* Civil Defense Hotlines Card in White Theme */}
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-3 text-xs text-slate-900">
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  <ShieldAlert className="w-4 h-4 text-slate-700" />
                  <span>CIVIL DEFENSE HOTLINES</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 text-center pt-1 font-sans">
                  <a
                    href="tel:1078"
                    className="p-3 rounded-2xl bg-[#faf9f5] border border-slate-200 hover:bg-slate-100 transition block text-slate-900 shadow-2xs"
                  >
                    <div className="font-black text-sm text-slate-950 font-display">1078</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">NDRF Control</div>
                  </a>
                  <a
                    href="tel:1070"
                    className="p-3 rounded-2xl bg-[#faf9f5] border border-slate-200 hover:bg-slate-100 transition block text-slate-900 shadow-2xs"
                  >
                    <div className="font-black text-sm text-slate-950 font-display">1070</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">State SDMA</div>
                  </a>
                  <a
                    href="tel:108"
                    className="p-3 rounded-2xl bg-[#faf9f5] border border-slate-200 hover:bg-slate-100 transition block text-slate-900 shadow-2xs"
                  >
                    <div className="font-black text-sm text-slate-950 font-display">108</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">ALS Ambulance</div>
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
