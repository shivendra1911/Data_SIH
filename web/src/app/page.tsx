"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Dashboard/Header";
import TelemetryStrip from "@/components/Dashboard/TelemetryStrip";
import PredictionPanel from "@/components/Dashboard/PredictionPanel";
import PreventiveDirectivesPanel from "@/components/Dashboard/PreventiveDirectivesPanel";
import NationalSentinelRadar from "@/components/Dashboard/NationalSentinelRadar";
import ScrollVideoHero from "@/components/CinematicHero/ScrollVideoHero";
import MobilePairingModal from "@/components/Dashboard/MobilePairingModal";
import RegionalAlertBroadcastModal from "@/components/Dashboard/RegionalAlertBroadcastModal";
import SafeRouteGuidelineModal from "@/components/Dashboard/SafeRouteGuidelineModal";
import { INDIA_FLOOD_ZONES, SAFE_EVACUATION_ROUTES } from "@/lib/constants";
import {
  HazardZone,
  PredictionResponse,
  NationalSentinelScan,
  SafeEvacuationRoute,
  ForecastHorizon,
} from "@/lib/types";
import { fetchCurrentPrediction } from "@/lib/api";
import { useRabtoTilt } from "@/lib/useRabtoTilt";
import { useScrollReveal } from "@/lib/useScrollReveal";
import {
  Compass,
  Radio,
  Users,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function NationalSentinelPage() {
  useRabtoTilt();
  useScrollReveal();

  const [selectedZone, setSelectedZone] = useState<HazardZone>(INDIA_FLOOD_ZONES[0]);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState<boolean>(true);
  const [forecastHorizon, setForecastHorizon] = useState<ForecastHorizon>("NOW");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [isRegionalModalOpen, setIsRegionalModalOpen] = useState<boolean>(false);
  const [isGuidelineModalOpen, setIsGuidelineModalOpen] = useState<boolean>(false);
  const [sentinelScan, setSentinelScan] = useState<NationalSentinelScan | null>(null);
  const [loadingScan, setLoadingScan] = useState<boolean>(false);
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState<boolean>(true);

  const activeSafeRoutes: SafeEvacuationRoute[] =
    SAFE_EVACUATION_ROUTES[selectedZone.id] ||
    SAFE_EVACUATION_ROUTES["chamoli_01"] ||
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
    const interval = setInterval(runNationalScan, 10000);
    return () => clearInterval(interval);
  }, [runNationalScan]);

  const loadZoneData = useCallback(async (zone: HazardZone) => {
    setLoadingPrediction(true);
    try {
      const pred = await fetchCurrentPrediction(zone.id);
      setPrediction(pred);
    } catch (err) {
      console.warn("Using fallback telemetry for zone", zone.name, err);
    } finally {
      setLoadingPrediction(false);
    }
  }, []);

  useEffect(() => {
    loadZoneData(selectedZone);
  }, [selectedZone, loadZoneData]);

  let displayedRisk = prediction
    ? prediction.flood_probability_percent
    : selectedZone.currentRisk;
  if (forecastHorizon === "+2H") displayedRisk = Math.min(98.5, displayedRisk * 1.15);
  if (forecastHorizon === "+6H") displayedRisk = Math.min(99.9, displayedRisk * 1.35);
  if (forecastHorizon === "+12H") displayedRisk = displayedRisk * 0.85;
  if (forecastHorizon === "+24H") displayedRisk = displayedRisk * 0.45;

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent text-slate-950 font-sans selection:bg-violet-600 selection:text-white">
      {/* Background Video for Continuous Scroll Animation */}
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

      {/* Cinematic Hero Section */}
      <div className="relative z-10">
        <ScrollVideoHero
          onEnterCommandCenter={() => {
            document.getElementById("sentinel-overview")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </div>

      {/* Main Page Stage */}
      <div id="sentinel-overview" className="relative z-10 min-h-screen flex flex-col bg-transparent">
        <Header
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
          onSimulateSOS={() => {
            if (soundEnabled) playAlertSound();
          }}
          onOpenMobileModal={() => setIsMobileModalOpen(true)}
          onOpenRegionalBroadcast={() => setIsRegionalModalOpen(true)}
          onOpenSafeRoutesGuidelines={() => setIsGuidelineModalOpen(true)}
          floodRiskPercent={displayedRisk}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((p) => !p)}
        />

        {/* Real-time Telemetry Ribbon */}
        <TelemetryStrip activeZone={selectedZone} riskPercent={displayedRisk} />

        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1800px] mx-auto w-full space-y-6">
          
          {/* Quick Hub Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/radar"
              className="glass-panel p-4 rounded-2xl border border-white/70 hover:border-emerald-400/80 transition flex items-center justify-between group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center group-hover:scale-105 transition">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Tactical GIS Radar & Inundation Command
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      LIVE GIS
                    </span>
                  </h2>
                  <p className="text-xs text-slate-600">
                    Full-view spatial radar, Topo/Sat overlays, flood wave vectors & safe routes
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition" />
            </Link>

            <Link
              href="/rescue"
              className="glass-panel p-4 rounded-2xl border border-white/70 hover:border-rose-400/80 transition flex items-center justify-between group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center group-hover:scale-105 transition">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Citizen Distress & Emergency Response Grid
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      APK SYNC
                    </span>
                  </h2>
                  <p className="text-xs text-slate-600">
                    Mobile APK distress telemetry, Live GPS vs Last Known Beacons, 108/Police/NDRF dispatch
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-rose-600 group-hover:translate-x-1 transition" />
            </Link>
          </div>

          {/* Section 1: Pan-India Autonomous Sentinel Basin Radar (Spacious Full Grid) */}
          <div className="rounded-2xl glass-panel border border-white/70 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-950 uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <Radio className="w-4 h-4 text-red-600" />
                  Pan-India Autonomous Sentinel Basin Surveillance (12 Basins)
                </h2>
                <p className="text-xs text-slate-600">
                  Continuous multi-basin telemetry monitoring river stage anomalies, flood crest velocity, and autonomous red alerts across India.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoDispatchEnabled((p) => !p)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                    autoDispatchEnabled
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-slate-100 text-slate-600 border-slate-300"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Auto-SOS: {autoDispatchEnabled ? "ARMED" : "OFF"}</span>
                </button>
                <button
                  onClick={runNationalScan}
                  disabled={loadingScan}
                  className="btn-solid-primary text-xs h-[34px] px-3"
                >
                  <span>{loadingScan ? "Scanning..." : "Scan All Basins"}</span>
                </button>
              </div>
            </div>

            <NationalSentinelRadar
              scanData={sentinelScan}
              loading={loadingScan}
              onRefreshScan={runNationalScan}
              selectedZone={selectedZone}
              onSelectZoneById={(zoneId) => {
                const found = INDIA_FLOOD_ZONES.find((z) => z.id === zoneId);
                if (found) setSelectedZone(found);
              }}
              autoDispatchEnabled={autoDispatchEnabled}
              onToggleAutoDispatch={() => setAutoDispatchEnabled((p) => !p)}
              compact={false}
            />
          </div>

          {/* Section 2: Multi-Horizon Forecast & AI Hydrological Risk Engine */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Cols: Multi-Horizon Forecast Simulation & Directives */}
            <div className="lg:col-span-7 space-y-4">
              {/* Multi-Horizon Surge Forecast Simulation */}
              <div className="rounded-2xl glass-panel border border-white/70 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Multi-Horizon Hydrodynamic Wave Forecast
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Sector: {selectedZone.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {[
                    { key: "NOW", label: "T - 0 (NOW)", desc: "Baseline / Anomaly" },
                    { key: "+2H", label: "+2 HOURS", desc: "Runoff Accumulation" },
                    { key: "+6H", label: "+6 HOURS", desc: "Peak Inundation Crest" },
                    { key: "+12H", label: "+12 HOURS", desc: "Downstream Propagation" },
                    { key: "+24H", label: "+24 HOURS", desc: "Recession & Normal" },
                  ].map((h) => (
                    <button
                      key={h.key}
                      onClick={() => setForecastHorizon(h.key as ForecastHorizon)}
                      className={`p-2 rounded-xl text-left border transition ${
                        forecastHorizon === h.key
                          ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                          : "bg-white/80 text-slate-700 border-slate-200 hover:bg-white"
                      }`}
                    >
                      <div className="font-bold">{h.label}</div>
                      <div className="text-[10px] opacity-80 truncate">{h.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pre-Disaster Mitigation Directives */}
              <PreventiveDirectivesPanel activeZone={selectedZone} />
            </div>

            {/* Right 5 Cols: AI Hydrological Risk Engine Card */}
            <div className="lg:col-span-5">
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
        riskPercent={displayedRisk}
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

      {/* Quick Jump Floating Pill */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 glass-panel border border-white/60 rounded-full p-1.5 shadow-xl">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-800 hover:text-slate-950 hover:bg-white/60 transition flex items-center gap-1 min-h-[36px]"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span>Top</span>
        </button>
        <Link
          href="/radar"
          className="px-3.5 py-1.5 rounded-full btn-solid-primary text-xs font-bold uppercase transition flex items-center gap-1.5 min-h-[36px]"
        >
          <span>Tactical Radar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/60 glass-panel px-6 py-4 text-center text-xs text-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 mt-8">
        <div className="font-semibold text-slate-900">
          NeerNetra â€” India Flash Flood Early Warning System &bull; SIH 2026 PS: SIH26192
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block pulse-green" />
            12 Basins Online
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">Emergency Hotlines: NDRF 1078 &bull; SDMA 1070 &bull; Ambulance 108</span>
        </div>
      </footer>
    </div>
  );
}

