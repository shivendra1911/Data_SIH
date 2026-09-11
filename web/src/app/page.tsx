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
import NationalSentinelRadar from "@/components/Dashboard/NationalSentinelRadar";
import CitizenTrackingMatrix from "@/components/Dashboard/CitizenTrackingMatrix";
import EmergencyResponderGrid from "@/components/Dashboard/EmergencyResponderGrid";
import SafeRouteGuidelineModal from "@/components/Dashboard/SafeRouteGuidelineModal";

// Dynamically import Vectrus-style WebCodecs Scroll Video Hero with SSR disabled
const ScrollVideoHero = dynamic(
  () => import("@/components/CinematicHero/ScrollVideoHero"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[60vh] w-full bg-slate-950 flex items-center justify-center text-white font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest text-violet-200">
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
  NationalSentinelScan,
  SafeEvacuationRoute,
  EmergencyResponder,
  EvacuationGuidelines,
} from "@/lib/types";

import {
  INDIA_FLOOD_ZONES,
  INITIAL_MOCK_CLUSTERS,
  INITIAL_MOCK_SOS_EVENTS,
  INITIAL_CITIZEN_LOCATIONS,
  SAFE_EVACUATION_ROUTES,
  EMERGENCY_RESPONDERS_GRID,
  ZONE_EVACUATION_GUIDELINES,
  DEFAULT_EMERGENCY_RESPONDERS,
} from "@/lib/constants";
import { fetchActiveClusters, fetchCurrentPrediction } from "@/lib/api";
import { subscribeToSOSEvents } from "@/lib/supabase";
import { useRabtoTilt } from "@/lib/useRabtoTilt";
import { useScrollReveal } from "@/lib/useScrollReveal";
import {
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  Radio,
  Sliders,
  Layers,
  Sparkles,
  Truck,
  Globe,
  Activity,
  Crosshair,
} from "lucide-react";

export default function DashboardPage() {
  // Initialize Rabto FX 60fps 3D tilt physics & radial spotlight engine
  useRabtoTilt();
  // Initialize scroll-driven in-and-out typography animations
  useScrollReveal();

  const [selectedZone, setSelectedZone] = useState<HazardZone>(INDIA_FLOOD_ZONES[0]);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState<boolean>(true);
  const [forecastHorizon, setForecastHorizon] = useState<ForecastHorizon>("NOW");
  const [sosEvents, setSOSEvents] = useState<SOSEvent[]>(INITIAL_MOCK_SOS_EVENTS);
  const [clusters, setClusters] = useState<SOSCluster[]>(INITIAL_MOCK_CLUSTERS);
  const [mapCenter, setMapCenter] = useState<[number, number]>(INDIA_FLOOD_ZONES[0].center);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showRescueLayer, setShowRescueLayer] = useState<boolean>(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [isRegionalModalOpen, setIsRegionalModalOpen] = useState<boolean>(false);
  const [isGuidelineModalOpen, setIsGuidelineModalOpen] = useState<boolean>(false);
  const [citizens, setCitizens] = useState<CitizenLocation[]>(INITIAL_CITIZEN_LOCATIONS);
  const [sentinelScan, setSentinelScan] = useState<NationalSentinelScan | null>(null);
  const [loadingScan, setLoadingScan] = useState<boolean>(false);
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState<boolean>(true);
  const [consoleTab, setConsoleTab] = useState<"CITIZENS" | "RESPONDERS" | "AI_RISK" | "RADAR">("CITIZENS");

  // Active zone data derivations
  const activeSafeRoutes: SafeEvacuationRoute[] =
    SAFE_EVACUATION_ROUTES[selectedZone.id] ||
    SAFE_EVACUATION_ROUTES["chamoli_01"] ||
    [];

  const activeResponders: EmergencyResponder[] =
    EMERGENCY_RESPONDERS_GRID[selectedZone.id] ||
    DEFAULT_EMERGENCY_RESPONDERS;

  const activeGuidelines: EvacuationGuidelines | undefined =
    ZONE_EVACUATION_GUIDELINES[selectedZone.id];

  const activeCitizens: CitizenLocation[] = citizens.filter(
    (c) => !c.zone_id || c.zone_id === selectedZone.id
  );

  const handleDispatchResponderUnit = async (responder: EmergencyResponder) => {
    try {
      await fetch("/api/responders/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: selectedZone.id,
          responder_id: responder.id,
          target_coords: selectedZone.center,
          incident_description: `Urgent tactical dispatch for ${selectedZone.name}`,
        }),
      });
      if (soundEnabled) playAlertSound();
    } catch (e) {
      console.warn("Responder dispatch error:", e);
    }
  };

  const handleMultiAgencyDispatch = async () => {
    try {
      await fetch("/api/responders/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: selectedZone.id,
          agency_type: "ALL",
          target_coords: selectedZone.center,
          incident_description: `MULTI-AGENCY CRITICAL FLOOD DISPATCH: All branches mobilize for ${selectedZone.name}`,
        }),
      });
      if (soundEnabled) playAlertSound();
    } catch (e) {
      console.warn("Multi-agency dispatch error:", e);
    }
  };

  const handleBroadcastGuidelines = async (message?: string) => {
    try {
      await fetch("/api/guidelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: selectedZone.id,
          message:
            message ||
            `MANDATORY EVACUATION GUIDELINES DISPATCHED for ${selectedZone.name}. Head toward designated high ground safe routes immediately.`,
        }),
      });
      if (soundEnabled) playAlertSound();
    } catch (e) {
      console.warn("Guideline broadcast error:", e);
    }
  };

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

  // Autonomous National Flood Sentinel: Scans all basins in India and auto-triggers SOS
  const runNationalScan = useCallback(async () => {
    setLoadingScan(true);
    try {
      const res = await fetch(`/api/sentinel/scan?auto_dispatch=${autoDispatchEnabled}`);
      if (res.ok) {
        const data: NationalSentinelScan = await res.json();
        setSentinelScan(data);
        if (data.recent_auto_sos_dispatches.length > 0 && soundEnabled) {
          playAlertSound();
        }
      }
    } catch (err) {
      console.warn("National sentinel scan error:", err);
    } finally {
      setLoadingScan(false);
    }
  }, [autoDispatchEnabled, soundEnabled, playAlertSound]);

  useEffect(() => {
    runNationalScan();
    const interval = setInterval(runNationalScan, 10000); // 10-second real-time autonomous scan cycle
    return () => clearInterval(interval);
  }, [runNationalScan]);

  const handleSelectZoneById = (zoneId: string) => {
    const found = INDIA_FLOOD_ZONES.find((z) => z.id === zoneId);
    if (found) {
      handleSelectZone(found);
    }
  };


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
                // Immediately focus map on the new victim from the mobile app!
                setMapCenter([newItems[0].lat, newItems[0].lng]);
                setMapZoom(15);
                setConsoleTab("CITIZENS");
                // Immediately re-fetch citizens
                fetch("/api/citizen/locations")
                  .then((r) => r.json())
                  .then((d) => {
                    if (d.citizens) setCitizens(d.citizens);
                  })
                  .catch(() => {});
                return [...newItems, ...prev];
              }
              return prev;
            });
          }
        }
      } catch {}
    }, 2000);

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
    setMapZoom(15);
    setConsoleTab("CITIZENS");
    if (soundEnabled) playAlertSound();
    fetch("/api/citizen/locations")
      .then((r) => r.json())
      .then((d) => {
        if (d.citizens) setCitizens(d.citizens);
      })
      .catch(() => {});
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
    <div className="relative min-h-screen flex flex-col bg-transparent text-slate-950 font-sans selection:bg-violet-600 selection:text-white">
      {/* Persistent Fixed Full-Screen Background Video for Continuous Scroll Animation */}
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
        {/* Subtle Gradient Scrim for WCAG AA Contrast & Frosted Glass Transparency */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-900/40 to-slate-950/75 pointer-events-none" />
      </div>

      {/* 0. Hero Section with Scroll In/Out Animations */}
      <div className="relative z-10">
        <ScrollVideoHero
          onEnterCommandCenter={() => {
            document.getElementById("command-center")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </div>

      {/* Primary Command Operations Center */}
      <div id="command-center" className="relative z-10 min-h-screen flex flex-col bg-transparent">
        {/* 1. Tactical Command Header */}
        <Header
          selectedZone={selectedZone}
          onSelectZone={handleSelectZone}
          isDemoMode={isDemoMode}
          onToggleDemoMode={() => setIsDemoMode((prev) => !prev)}
          onSimulateSOS={handleSimulateSOS}
          onOpenMobileModal={() => setIsMobileModalOpen(true)}
          onOpenRegionalBroadcast={() => setIsRegionalModalOpen(true)}
          onOpenSafeRoutesGuidelines={() => setIsGuidelineModalOpen(true)}
          floodRiskPercent={displayedRisk}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
        />

        {/* 2. Executive Real-Time Telemetry Ribbon (Slim Single Row) */}
        <TelemetryStrip activeZone={selectedZone} riskPercent={displayedRisk} />

        {/* 3. Primary Mission Control Cockpit (High-Density Dual-Pane Stage) */}
        <main className="flex-1 p-3 sm:p-4 lg:p-5 max-w-[1800px] mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* LEFT PANE (7 cols): Tactical GIS Radar Map & Real-Time Hydrograph */}
            <div className="lg:col-span-7 flex flex-col space-y-3.5">
              {/* Tactical Solid Map Container */}
              <div className="tilt-card w-full h-[520px] lg:h-[560px] rounded-2xl overflow-hidden border border-white/70 shadow-sm relative bg-white">
                {/* Floating Map Status Overlay */}
                <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  <span className="text-xs font-bold text-slate-900">{selectedZone.name}</span>
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                      displayedRisk >= 75
                        ? "bg-red-600 text-white"
                        : displayedRisk >= 55
                        ? "bg-amber-500 text-slate-950"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {displayedRisk.toFixed(0)}% FLOOD RISK
                  </span>
                </div>

                <MapWrapper
                  center={mapCenter}
                  zoom={mapZoom}
                  sosEvents={sosEvents}
                  clusters={clusters}
                  activeZone={selectedZone}
                  citizens={activeCitizens}
                  safeRoutes={activeSafeRoutes}
                  responders={activeResponders}
                  selectedEventId={selectedEventId}
                  onSelectEvent={handleSelectEvent}
                  onDispatchCluster={handleDispatchCluster}
                />
              </div>

              {/* Inundation Hydrograph & Early Warning Countdown */}
              <div className="rounded-2xl glass-panel border border-white/60 p-3.5 shadow-sm">
                <HydrographPanel activeZone={selectedZone} />
              </div>
            </div>

            {/* RIGHT PANE (5 cols): Docked High-Density Operations Console */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="rounded-2xl glass-panel border border-white/60 p-3.5 shadow-sm flex flex-col h-full min-h-[780px]">
                {/* Segmented Tab Switcher */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 border border-slate-200 mb-2.5 text-xs">
                  <button
                    onClick={() => setConsoleTab("CITIZENS")}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      consoleTab === "CITIZENS"
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 text-red-600" />
                    <span>SOS ({activeCitizens.length})</span>
                  </button>

                  <button
                    onClick={() => setConsoleTab("RESPONDERS")}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      consoleTab === "RESPONDERS"
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Rescue ({activeResponders.length})</span>
                  </button>

                  <button
                    onClick={() => setConsoleTab("AI_RISK")}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      consoleTab === "AI_RISK"
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-amber-600" />
                    <span>AI Risk</span>
                  </button>

                  <button
                    onClick={() => setConsoleTab("RADAR")}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      consoleTab === "RADAR"
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Basins (12)</span>
                  </button>
                </div>

                {/* Live Mobile Stream Sync Status Chip */}
                <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-indigo-50/80 border border-indigo-200/80 flex items-center justify-between text-[11px] text-indigo-900">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Mobile Sync Active: 172.16.184.105:3000</span>
                  </span>
                  <button
                    onClick={() => setIsMobileModalOpen(true)}
                    className="text-[10px] font-bold text-indigo-700 hover:underline"
                  >
                    API Spec
                  </button>
                </div>

                {/* Tab Content Panes */}
                <div className="flex-1 overflow-y-auto">
                  {consoleTab === "CITIZENS" && (
                    <CitizenTrackingMatrix
                      citizens={activeCitizens}
                      compact={true}
                      onFocusCoordinates={(coords) => handleFocusCoords(coords[0], coords[1])}
                      onDispatchToCitizen={(cit) => {
                        const foundResp = activeResponders[0];
                        if (foundResp) handleDispatchResponderUnit(foundResp);
                      }}
                    />
                  )}

                  {consoleTab === "RESPONDERS" && (
                    <EmergencyResponderGrid
                      responders={activeResponders}
                      zoneName={selectedZone.name}
                      compact={true}
                      onDispatchUnit={handleDispatchResponderUnit}
                      onMultiAgencyDispatch={handleMultiAgencyDispatch}
                    />
                  )}

                  {consoleTab === "AI_RISK" && (
                    <div className="space-y-3">
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
                      <PreventiveDirectivesPanel activeZone={selectedZone} />
                    </div>
                  )}

                  {consoleTab === "RADAR" && (
                    <NationalSentinelRadar
                      scanData={sentinelScan}
                      loading={loadingScan}
                      onRefreshScan={runNationalScan}
                      selectedZone={selectedZone}
                      onSelectZoneById={handleSelectZoneById}
                      autoDispatchEnabled={autoDispatchEnabled}
                      onToggleAutoDispatch={() => setAutoDispatchEnabled((prev) => !prev)}
                      compact={true}
                    />
                  )}
                </div>
              </div>
            </div>
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

      {/* Safe Evacuation Routes & Survival Guidelines Modal */}
      <SafeRouteGuidelineModal
        isOpen={isGuidelineModalOpen}
        onClose={() => setIsGuidelineModalOpen(false)}
        activeZone={selectedZone}
        safeRoutes={activeSafeRoutes}
        guidelines={activeGuidelines}
        onBroadcastGuidelines={handleBroadcastGuidelines}
      />
    </div>

      {/* Floating Quick-Switch Pill */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 glass-panel border border-white/60 rounded-full p-1.5 shadow-xl">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to cinematic overview"
          className="px-4 py-2 rounded-full text-xs font-semibold text-slate-800 hover:text-slate-950 hover:bg-white/60 transition flex items-center gap-1.5 min-h-[44px]"
        >
          <ChevronUp className="w-3.5 h-3.5" aria-hidden />
          <span>Overview</span>
        </button>
        <button
          onClick={() => document.getElementById("command-center")?.scrollIntoView({ behavior: "smooth" })}
          aria-label="Jump to command center dashboard"
          className="px-4 py-2 rounded-full btn-solid-primary text-xs font-bold uppercase transition flex items-center gap-1.5 min-h-[44px]"
        >
          <span>Command Center</span>
          <ChevronDown className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/60 glass-panel px-6 py-5 text-center text-xs text-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="font-semibold text-slate-900">
          NeerNetra — India Flash Flood Early Warning System &bull; SIH 2026 PS: SIH26192
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block pulse-green" />
            CWC Telemetry Online
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5 text-violet-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
            Android Bridge: 172.16.184.105:3000
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">Emergency: NDRF 1078 &bull; SDMA 1070</span>
        </div>
      </footer>
    </div>
  );
}