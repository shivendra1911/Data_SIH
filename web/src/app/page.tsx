"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Dashboard/Header";
import TelemetryStrip from "@/components/Dashboard/TelemetryStrip";
import AccessibleVoiceCard from "@/components/Dashboard/AccessibleVoiceCard";
import MobilePairingModal from "@/components/Dashboard/MobilePairingModal";
import MapWrapper from "@/components/Map/MapWrapper";
import PredictionPanel from "@/components/Dashboard/PredictionPanel";
import HydrographPanel from "@/components/Dashboard/HydrographPanel";
import PreventiveDirectivesPanel from "@/components/Dashboard/PreventiveDirectivesPanel";
import ForecastHorizonSlider from "@/components/Dashboard/ForecastHorizonSlider";
import ClusterTriagePanel from "@/components/Dashboard/ClusterTriagePanel";
import LiveSOSFeed from "@/components/Dashboard/LiveSOSFeed";
import RegionalAlertBroadcastModal from "@/components/Dashboard/RegionalAlertBroadcastModal";

// Dynamically import Vectrus-style 500vh WebCodecs Scroll Video Hero with SSR disabled
const ScrollVideoHero = dynamic(
  () => import("@/components/CinematicHero/ScrollVideoHero"),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-full bg-[#1D3045] flex items-center justify-center text-white font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest text-cyan-200">
            Initializing WebCodecs 60FPS Video Canvas...
          </span>
        </div>
      </div>
    ),
  }
);
import {
  ForecastHorizon,
  HazardZone,
  PredictionResponse,
  SOSCluster,
  SOSEvent,
  CitizenLocation,
  RegionalAlert,
} from "@/lib/types";
import {
  HIMALAYAN_ZONES,
  INITIAL_MOCK_CLUSTERS,
  INITIAL_MOCK_SOS_EVENTS,
  INITIAL_CITIZEN_LOCATIONS,
} from "@/lib/constants";
import { fetchActiveClusters, fetchCurrentPrediction } from "@/lib/api";
import { subscribeToSOSEvents } from "@/lib/supabase";
import { useRabtoTilt } from "@/lib/useRabtoTilt";
import {
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  Radio,
  Sliders,
  Layers,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  // Initialize Rabto FX 60fps 3D tilt physics & radial spotlight engine
  useRabtoTilt();

  const [selectedZone, setSelectedZone] = useState<HazardZone>(HIMALAYAN_ZONES[0]);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState<boolean>(true);
  const [forecastHorizon, setForecastHorizon] = useState<ForecastHorizon>("NOW");
  const [sosEvents, setSOSEvents] = useState<SOSEvent[]>(INITIAL_MOCK_SOS_EVENTS);
  const [clusters, setClusters] = useState<SOSCluster[]>(INITIAL_MOCK_CLUSTERS);
  const [mapCenter, setMapCenter] = useState<[number, number]>(HIMALAYAN_ZONES[0].center);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showRescueLayer, setShowRescueLayer] = useState<boolean>(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [isRegionalModalOpen, setIsRegionalModalOpen] = useState<boolean>(false);
  const [citizens, setCitizens] = useState<CitizenLocation[]>(INITIAL_CITIZEN_LOCATIONS);

  // High-frequency alert sound synthesizer
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

  // Load prediction & clustering telemetry on sector change
  const loadZoneData = useCallback(async (zone: HazardZone) => {
    setLoadingPrediction(true);
    try {
      const pred = await fetchCurrentPrediction(zone.id);
      setPrediction(pred);
      const clust = await fetchActiveClusters(zone.id);
      setClusters(clust);
    } catch (err) {
      console.warn("Using fallback telemetry for zone", zone.name, err);
    } finally {
      setLoadingPrediction(false);
    }
  }, []);

  useEffect(() => {
    loadZoneData(selectedZone);
  }, [selectedZone, loadZoneData]);

  // Subscribe to live Supabase real-time additions to `sos_events`
  useEffect(() => {
    const unsubscribe = subscribeToSOSEvents((newEvent) => {
      setSOSEvents((prev) => [newEvent, ...prev]);
      if (soundEnabled && newEvent.status === "SOS") {
        playAlertSound();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [soundEnabled, playAlertSound]);

  // Fast polling bridge for local Android app triggers via /api/sos/trigger
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/sos/trigger");
        if (res.ok) {
          const data = await res.json();
          if (data.events && Array.isArray(data.events) && data.events.length > 0) {
            setSOSEvents((prev) => {
              const existingIds = new Set(prev.map((e) => e.id));
              const newItems = data.events.filter((e: any) => !existingIds.has(e.id));
              if (newItems.length > 0) {
                if (soundEnabled) playAlertSound();
                return [...newItems, ...prev];
              }
              return prev;
            });
          }
        }
      } catch {}
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [soundEnabled, playAlertSound]);

  // Live citizen tracking poll from /api/citizen/locations
  useEffect(() => {
    const fetchCitizenLocations = async () => {
      try {
        const res = await fetch("/api/citizen/locations");
        if (res.ok) {
          const data = await res.json();
          if (data.citizens && Array.isArray(data.citizens)) {
            setCitizens(data.citizens);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch citizen locations", err);
      }
    };
    fetchCitizenLocations();
    const interval = setInterval(fetchCitizenLocations, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectZone = (zone: HazardZone) => {
    setSelectedZone(zone);
    setMapCenter(zone.center);
    setMapZoom(12);
    setForecastHorizon("NOW");
  };

  const handleSelectEvent = (event: SOSEvent) => {
    setSelectedEventId(event.id);
    setMapCenter([event.lat, event.lng]);
    setMapZoom(15);
  };

  const handleFocusCoords = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(14);
  };

  const handleToggleRescued = (id: string) => {
    setSOSEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, rescued: !e.rescued } : e))
    );
  };

  const handleDispatchCluster = (clusterId: number) => {
    setClusters((prev) =>
      prev.map((c) =>
        c.cluster_id === clusterId
          ? {
              ...c,
              dispatched: true,
              assigned_team: "NDRF Sector Bravo-9 Unit Dispatched",
            }
          : c
      )
    );
  };

  const handleSimulateSOS = () => {
    const latOffset = (Math.random() - 0.5) * 0.02;
    const lngOffset = (Math.random() - 0.5) * 0.02;
    const isMesh = Math.random() > 0.4;
    const mockEvent: SOSEvent = {
      id: `sim-${Date.now()}`,
      device_uuid: `node-${Math.random().toString(36).substring(2, 8)}`,
      lat: selectedZone.center[0] + latOffset,
      lng: selectedZone.center[1] + lngOffset,
      status: "SOS",
      sos_type: "RAPID RIVER INUNDATION & STRUCTURAL BREACH",
      is_mesh_relayed: isMesh,
      created_at: new Date().toISOString(),
    };

    setSOSEvents((prev) => [mockEvent, ...prev]);
    setMapCenter([mockEvent.lat, mockEvent.lng]);
    setMapZoom(14);
    if (soundEnabled) playAlertSound();
  };

  const handleAndroidSOSArrival = (event: SOSEvent) => {
    setSOSEvents((prev) => [event, ...prev]);
    setMapCenter([event.lat, event.lng]);
    setMapZoom(14);
    if (soundEnabled) playAlertSound();
  };

  // Adjust risk calculation based on horizon slider
  let displayedRisk = prediction
    ? prediction.flood_probability_percent
    : selectedZone.currentRisk;
  if (forecastHorizon === "+2H") displayedRisk = Math.min(98.5, displayedRisk * 1.15);
  if (forecastHorizon === "+6H") displayedRisk = Math.min(99.9, displayedRisk * 1.35);
  if (forecastHorizon === "+12H") displayedRisk = displayedRisk * 0.85;
  if (forecastHorizon === "+24H") displayedRisk = displayedRisk * 0.45;

  return (
    <div className="min-h-screen flex flex-col bg-[#05070e] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 0. Vectrus-Style 500vh WebCodecs Hardware-Accelerated Video Scrub Hero & Sequential Typography */}
      <ScrollVideoHero
        onEnterCommandCenter={() => {
          document.getElementById("command-center")?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* Primary Command Operations Center Anchor */}
      <div id="command-center" className="min-h-screen flex flex-col bg-[#05070e] hud-grid relative">
        {/* 1. Tactical Command Header with HUD Telemetry Status */}
        <Header
          selectedZone={selectedZone}
          onSelectZone={handleSelectZone}
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => setIsDemoMode((prev) => !prev)}
        onSimulateSOS={handleSimulateSOS}
        onOpenMobileModal={() => setIsMobileModalOpen(true)}
        onOpenRegionalBroadcast={() => setIsRegionalModalOpen(true)}
        floodRiskPercent={displayedRisk}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
      />

      {/* 2. Executive Real-Time Telemetry Ribbon */}
      <TelemetryStrip activeZone={selectedZone} riskPercent={displayedRisk} />

      {/* 3. Primary Command Workspace */}
      <main className="flex-1 p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1750px] mx-auto w-full">
        {/* Audio Alert Dispatcher & Ground Directives Bar */}
        <AccessibleVoiceCard
          activeZone={selectedZone}
          riskPercent={displayedRisk}
        />

        {/* Multi-Horizon Scrubber */}
        <ForecastHorizonSlider
          currentHorizon={forecastHorizon}
          onSelectHorizon={(h) => setForecastHorizon(h)}
        />

        {/* Primary Row 1: Geospatial Inundation Map (8 cols) + AI Hydrological Risk Engine (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Tactical Geospatial Map */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="tilt-card w-full h-[520px] lg:h-[570px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
              <MapWrapper
                center={mapCenter}
                zoom={mapZoom}
                sosEvents={sosEvents}
                clusters={clusters}
                activeZone={selectedZone}
                citizens={citizens}
                selectedEventId={selectedEventId}
                onSelectEvent={handleSelectEvent}
                onDispatchCluster={handleDispatchCluster}
              />
            </div>
          </div>

          {/* AI Neural Predictive Engine */}
          <div className="lg:col-span-4 flex flex-col">
            <PredictionPanel
              prediction={
                prediction
                  ? {
                      ...prediction,
                      flood_probability_percent: displayedRisk,
                      alert_color:
                        displayedRisk >= 75
                          ? "RED"
                          : displayedRisk >= 55
                          ? "ORANGE"
                          : displayedRisk >= 35
                          ? "YELLOW"
                          : "GREEN",
                    }
                  : null
              }
              loading={loadingPrediction}
              onRefresh={() => loadZoneData(selectedZone)}
            />
          </div>
        </div>

        {/* Primary Row 2: Inundation Hydrograph (7 cols) + Preventive Directives Matrix (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Hydrograph & Lead Time Countdown */}
          <div className="lg:col-span-7">
            <HydrographPanel activeZone={selectedZone} />
          </div>

          {/* Preventive Action Directives */}
          <div className="lg:col-span-5">
            <PreventiveDirectivesPanel activeZone={selectedZone} />
          </div>
        </div>

        {/* Primary Row 3: Tactical Distress Beacons & Automated K-Means Rescue Triage (Collapsible) */}
        <div className="tilt-card border border-slate-800/80 rounded-2xl bg-slate-950/70 p-4 space-y-4 shadow-xl">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Field Distress Beacons & Automated K-Means Rescue Triage
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Offline BLE Mesh Relays • Realtime Latency &lt;450ms • Connected Field Nodes: {sosEvents.length}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRescueLayer((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-xs font-mono font-semibold text-slate-300 border border-slate-800 flex items-center gap-2 transition min-h-[40px]"
            >
              <span>{showRescueLayer ? "Collapse Triage Feed" : "Expand Field Telemetry"}</span>
              {showRescueLayer ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {showRescueLayer && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 relative z-10">
              <div className="lg:col-span-6">
                <ClusterTriagePanel
                  clusters={clusters}
                  onDispatch={handleDispatchCluster}
                  onFocusCoordinates={handleFocusCoords}
                />
              </div>

              <div className="lg:col-span-6">
                <LiveSOSFeed
                  events={sosEvents}
                  citizens={citizens}
                  onSelectEvent={handleSelectEvent}
                  onToggleRescued={handleToggleRescued}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Android Pairing Bridge Station Modal */}
      <MobilePairingModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        onSimulateAndroidSOS={handleAndroidSOSArrival}
      />

      {/* Zero-Minute Regional Mobile Alert Broadcast Modal */}
      <RegionalAlertBroadcastModal
        isOpen={isRegionalModalOpen}
        onClose={() => setIsRegionalModalOpen(false)}
        activeZone={selectedZone}
        riskPercent={displayedRisk}
      />

      </div>

      {/* Floating Tactical Quick-Switch Pill */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-slate-900/95 border border-slate-700/80 rounded-full p-1.5 shadow-2xl backdrop-blur-md">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="px-4 py-2 rounded-full text-[11px] font-mono font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 min-h-[44px]"
          title="Scroll to Cinematic Overview"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span>Cinematic Overview</span>
        </button>
        <button
          onClick={() => document.getElementById("command-center")?.scrollIntoView({ behavior: "smooth" })}
          className="px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-mono font-bold uppercase transition flex items-center gap-1.5 min-h-[44px]"
          title="Jump to Tactical Command Center"
        >
          <span>Command Center</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Command Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="font-mono text-[11px] text-slate-400">
          NEERNETRA • Smart India Hackathon PS: SIH26192 • Himalayan Flash Flood & GLOF Early Warning System
        </div>
        <div className="flex flex-wrap items-center gap-3 text-slate-400 font-mono text-[11px]">
          <span className="text-emerald-400">● CWC Station Telemetry Online</span>
          <span>•</span>
          <span className="text-sky-400">● Android Relay: 172.16.183.190:3000</span>
          <span>•</span>
          <span>NDRF Hotlines: 1078 / SDMA: 1070</span>
        </div>
      </footer>
    </div>
  );
}