"use client";

import React, { useState, useEffect, useCallback } from "react";
import Header from "@/components/Dashboard/Header";
import AccessibleVoiceCard from "@/components/Dashboard/AccessibleVoiceCard";
import MobilePairingModal from "@/components/Dashboard/MobilePairingModal";
import CitizenSafetyHub from "@/components/Citizen/CitizenSafetyHub";
import MapWrapper from "@/components/Map/MapWrapper";
import PredictionPanel from "@/components/Dashboard/PredictionPanel";
import HydrographPanel from "@/components/Dashboard/HydrographPanel";
import PreventiveDirectivesPanel from "@/components/Dashboard/PreventiveDirectivesPanel";
import ForecastHorizonSlider from "@/components/Dashboard/ForecastHorizonSlider";
import ClusterTriagePanel from "@/components/Dashboard/ClusterTriagePanel";
import LiveSOSFeed from "@/components/Dashboard/LiveSOSFeed";
import {
  ForecastHorizon,
  HazardZone,
  PredictionResponse,
  SOSCluster,
  SOSEvent,
} from "@/lib/types";
import {
  HIMALAYAN_ZONES,
  INITIAL_MOCK_CLUSTERS,
  INITIAL_MOCK_SOS_EVENTS,
} from "@/lib/constants";
import { Language, translations } from "@/lib/i18n";
import { fetchActiveClusters, fetchCurrentPrediction } from "@/lib/api";
import { subscribeToSOSEvents } from "@/lib/supabase";
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  Users2,
  Activity,
  Compass,
} from "lucide-react";

export default function DashboardPage() {
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
  const [viewMode, setViewMode] = useState<"CITIZEN" | "COMMAND">("CITIZEN");
  const [language, setLanguage] = useState<Language>("hi"); // Default to Hindi for rural accessibility!

  const t = translations[language];

  // Sound play helper
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

  // Load prediction and clusters when zone changes
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
      device_uuid: `android-${Math.random().toString(36).substring(2, 8)}`,
      lat: selectedZone.center[0] + latOffset,
      lng: selectedZone.center[1] + lngOffset,
      status: "SOS",
      sos_type: language === "hi" ? "नदी का जलस्तर तेजी से बढ़ा" : "RIVER LEVEL RISING RAPIDLY",
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
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Top Command Header with Bilingual Switch & Android Bridge */}
      <Header
        selectedZone={selectedZone}
        onSelectZone={handleSelectZone}
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => setIsDemoMode((prev) => !prev)}
        onSimulateSOS={handleSimulateSOS}
        onOpenMobileModal={() => setIsMobileModalOpen(true)}
        floodRiskPercent={displayedRisk}
        language={language}
        onToggleLanguage={() => setLanguage((l) => (l === "en" ? "hi" : "en"))}
      />

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-4 lg:p-6 space-y-5 max-w-[1750px] mx-auto w-full">
        {/* Giant Accessible Mode Switcher: Citizen View vs Command Center */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 border border-slate-800 p-2.5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {language === "hi"
                ? "आप किस रूप में देखना चाहते हैं? (Select Mode):"
                : "Choose Your Viewing Experience:"}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setViewMode("CITIZEN")}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition min-h-[46px] ${
                viewMode === "CITIZEN"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950 ring-2 ring-emerald-400/40"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <Users2 className="w-4 h-4" />
              <span>
                {language === "hi"
                  ? "👨‍👩‍👧‍👦 नागरिक सुरक्षा केंद्र (Citizen View)"
                  : "👨‍👩‍👧‍👦 Citizen Safety Hub"}
              </span>
            </button>

            <button
              onClick={() => setViewMode("COMMAND")}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition min-h-[46px] ${
                viewMode === "COMMAND"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-950 ring-2 ring-sky-400/40"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>
                {language === "hi"
                  ? "🛰️ नियंत्रण कक्ष (Command Center)"
                  : "🛰️ Command Center"}
              </span>
            </button>
          </div>
        </div>

        {/* 1. CITIZEN VIEW: Plain Language, Bulletins, Relief Camps, Do's & Don'ts */}
        {viewMode === "CITIZEN" && (
          <div className="space-y-5">
            <CitizenSafetyHub
              activeZone={selectedZone}
              riskPercent={displayedRisk}
              language={language}
              onSuccessSOS={handleAndroidSOSArrival}
            />
          </div>
        )}

        {/* 2. COMMAND CENTER VIEW: Detailed Maps, Hydrographs, Dam Controls, Sliders */}
        {viewMode === "COMMAND" && (
          <div className="space-y-5">
            {/* Accessible Voice Announcement & Plain Language Action Card */}
            <AccessibleVoiceCard
              activeZone={selectedZone}
              riskPercent={displayedRisk}
              language={language}
            />

            {/* Multi-Horizon Prediction Forecast Slider */}
            <ForecastHorizonSlider
              currentHorizon={forecastHorizon}
              onSelectHorizon={(h) => setForecastHorizon(h)}
            />

            {/* Primary Row 1: Tactical Inundation Map (8 cols) + AI Prediction & 5-Factor Sensors (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
              {/* Tactical Inundation Map */}
              <div className="lg:col-span-8 flex flex-col">
                <div className="w-full h-[500px] lg:h-[550px]">
                  <MapWrapper
                    center={mapCenter}
                    zoom={mapZoom}
                    sosEvents={sosEvents}
                    clusters={clusters}
                    activeZone={selectedZone}
                    selectedEventId={selectedEventId}
                    onSelectEvent={handleSelectEvent}
                    onDispatchCluster={handleDispatchCluster}
                  />
                </div>
              </div>

              {/* AI Prediction & 5-Factor Environmental Sensors */}
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
                  language={language}
                />
              </div>
            </div>

            {/* Primary Row 2: River Inundation Hydrograph (7 cols) + Pre-Disaster Preventive Directives (5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
              {/* Hydrograph & Lead Time Countdown */}
              <div className="lg:col-span-7">
                <HydrographPanel activeZone={selectedZone} language={language} />
              </div>

              {/* Preventive Action Directives */}
              <div className="lg:col-span-5">
                <PreventiveDirectivesPanel activeZone={selectedZone} language={language} />
              </div>
            </div>

            {/* Secondary Collapsible Layer: Last-Mile Citizen Triage & Rescue Verification */}
            <div className="border border-slate-800/80 rounded-2xl bg-slate-950/40 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      {t.citizenLayerTitle}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {language === "hi"
                        ? "नागरिक सुरक्षा जाल (ब्लूटूथ मेश व लाइव सुपबेस सत्यापन)"
                        : "Citizen Safety Net (BLE Offline Mesh + Supabase Realtime Verification)"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowRescueLayer((prev) => !prev)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 border border-slate-800 flex items-center gap-1.5 min-h-[44px]"
                >
                  <span>{showRescueLayer ? t.hideCitizen : t.expandCitizen}</span>
                  {showRescueLayer ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {showRescueLayer && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
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
                      onSelectEvent={handleSelectEvent}
                      onToggleRescued={handleToggleRescued}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Pairing Modal */}
      <MobilePairingModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        onSimulateAndroidSOS={handleAndroidSOSArrival}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 px-6 py-3 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          NeerNetra PS: SIH26192 • Team NeerNetra (GLA University) • Himalayan Flash Flood Prediction & Mitigation System
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span>{language === "hi" ? "आवाज द्वारा चेतावनी" : "Voice Alerts"}</span>
          <span>•</span>
          <span>{language === "hi" ? "दैनिक आकाशवाणी बुलेटिन" : "Radio Bulletins"}</span>
          <span>•</span>
          <span>{language === "hi" ? "राहत शिविर निर्देशिका" : "Relief Camps"}</span>
          <span>•</span>
          <span>Android Bridge: http://172.16.183.190:3000</span>
        </div>
      </footer>
    </div>
  );
}