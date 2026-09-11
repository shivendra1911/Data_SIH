"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Dashboard/Header";
import CitizenTrackingMatrix from "@/components/Dashboard/CitizenTrackingMatrix";
import EmergencyResponderGrid from "@/components/Dashboard/EmergencyResponderGrid";
import MobilePairingModal from "@/components/Dashboard/MobilePairingModal";
import RegionalAlertBroadcastModal from "@/components/Dashboard/RegionalAlertBroadcastModal";
import SafeRouteGuidelineModal from "@/components/Dashboard/SafeRouteGuidelineModal";
import {
  INDIA_FLOOD_ZONES,
  SAFE_EVACUATION_ROUTES,
  INITIAL_CITIZEN_LOCATIONS,
  EMERGENCY_RESPONDERS_GRID,
} from "@/lib/constants";
import {
  HazardZone,
  CitizenLocation,
  EmergencyResponder,
  SafeEvacuationRoute,
} from "@/lib/types";
import {
  Users,
  Smartphone,
  Truck,
  Compass,
  ArrowRight,
  Radio,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  Volume2,
} from "lucide-react";

export default function RescueCitizenGridPage() {
  const [selectedZone, setSelectedZone] = useState<HazardZone>(INDIA_FLOOD_ZONES[0]);
  const [citizens, setCitizens] = useState<CitizenLocation[]>(INITIAL_CITIZEN_LOCATIONS);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [isRegionalModalOpen, setIsRegionalModalOpen] = useState<boolean>(false);
  const [isGuidelineModalOpen, setIsGuidelineModalOpen] = useState<boolean>(false);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);

  const prevCitizenCountRef = useRef<number>(INITIAL_CITIZEN_LOCATIONS.length);

  const activeResponders: EmergencyResponder[] =
    EMERGENCY_RESPONDERS_GRID[selectedZone.id] ||
    EMERGENCY_RESPONDERS_GRID["chamoli_01"] ||
    [];

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

  // Poll shared in-memory Node store for incoming mobile phone distress signals
  useEffect(() => {
    const fetchCitizens = async () => {
      try {
        const res = await fetch("/api/citizen/locations");
        if (res.ok) {
          const data = await res.json();
          if (data.citizens && Array.isArray(data.citizens)) {
            setCitizens(data.citizens);
            if (data.citizens.length > prevCitizenCountRef.current) {
              // New citizen SOS arrived from mobile APK
              if (soundEnabled) playAlertSound();
              setDispatchNotice(`🚨 New Emergency SOS received from mobile device! Plotted to rescue queue.`);
              setTimeout(() => setDispatchNotice(null), 5000);
            }
            prevCitizenCountRef.current = data.citizens.length;
          }
        }
      } catch (err) {
        console.warn("Error fetching citizen telemetry:", err);
      }
    };

    fetchCitizens();
    const interval = setInterval(fetchCitizens, 2000);
    return () => clearInterval(interval);
  }, [soundEnabled, playAlertSound]);

  const handleDispatchResponderUnit = async (responder: EmergencyResponder) => {
    try {
      const res = await fetch("/api/responders/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responder_id: responder.id,
          zone_id: selectedZone.id,
          incident_description: `Immediate flood evacuation dispatch for ${responder.unit_name}`,
        }),
      });
      if (res.ok) {
        setDispatchNotice(`✓ Dispatched ${responder.unit_name} to flood sector. ETA: ~${responder.eta_minutes} mins.`);
        setTimeout(() => setDispatchNotice(null), 4000);
      }
    } catch (e) {
      console.warn("Dispatch error:", e);
    }
  };

  const handleMultiAgencyDispatch = async () => {
    try {
      const res = await fetch("/api/responders/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: selectedZone.id,
          agency_type: "ALL",
          incident_description: `MULTI-AGENCY PRIORITY DISPATCH: All available 108 Ambulances, Police QRTs & NDRF units mobilized.`,
        }),
      });
      if (res.ok) {
        setDispatchNotice(`🚨 MULTI-AGENCY DISPATCH EXECUTED: All 108 ALS, Police, and NDRF units mobilized for ${selectedZone.name}.`);
        setTimeout(() => setDispatchNotice(null), 5000);
      }
    } catch (e) {
      console.warn("Multi-agency dispatch error:", e);
    }
  };

  const sosCitizens = citizens.filter((c) => c.status === "SOS");
  const liveCount = citizens.filter((c) => c.is_live).length;
  const offlineCount = citizens.length - liveCount;

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
          onSelectZone={setSelectedZone}
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

        {/* Live Mobile APK LAN Synchronization Bar */}
        <div className="bg-[#1b2027]/80 border-b border-white/10 px-4 lg:px-6 py-3 backdrop-blur-md font-sans text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-[1800px] mx-auto w-full text-xs">
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 shadow-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold uppercase tracking-wider text-[10px]">Active Mobile Wi-Fi Sync:</span>
                <code className="font-mono bg-white/10 px-2 py-0.5 rounded text-white text-[11px]">
                  172.16.184.105:3000
                </code>
              </div>

              <div className="flex items-center gap-2 text-white/70">
                <span className="font-semibold">Registered Distress Beacons:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold text-[10px] uppercase tracking-wider">
                  {sosCitizens.length} SOS Active
                </span>
                <span className="text-white/50 text-[11px]">
                  ({liveCount} Live GPS &bull; {offlineCount} Last Known Offline)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsMobileModalOpen(true)}
                className="btn-solid-dark text-xs h-[38px] px-4 flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5 text-white/80" />
                <span>Pair Android APK</span>
              </button>
              <Link
                href="/radar"
                className="btn-solid-primary text-xs h-[38px] px-4 flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Open Tactical Radar</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Dispatch Notification Alert */}
        {dispatchNotice && (
          <div className="max-w-[1800px] mx-auto w-full px-4 pt-3 font-sans">
            <div className="p-3.5 rounded-2xl bg-[#1b2027] text-white border border-emerald-400/40 shadow-xl backdrop-blur-md flex items-center justify-between text-xs font-semibold animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{dispatchNotice}</span>
              </div>
              <button
                onClick={() => setDispatchNotice(null)}
                className="text-white/60 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Operational Stage */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1800px] mx-auto w-full space-y-6 font-sans">
          
          {/* Section 1: Citizen Distress Telemetry Matrix */}
          <div className="rounded-2xl glass-panel border border-white/10 p-5 sm:p-6 shadow-sm space-y-4 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <div className="corwdy-subtitle mb-1">
                  <span>/CITIZEN DISTRESS TELEMETRY</span>
                </div>
                <h2 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2 font-display">
                  <Users className="w-4 h-4 text-rose-400" />
                  Citizen Distress Telemetry Matrix (Live GPS vs Last Known Location)
                </h2>
                <p className="text-xs text-white/70">
                  Real-time distress signals transmitted from citizen mobile devices. Distinguishes live GPS pings from offline last-known beacons with estimated flood drift radii and multi-hop BLE mesh lineages.
                </p>
              </div>

              <span className="text-[11px] font-mono font-medium text-white/50">
                Auto-Synchronized every 2000ms &bull; Sector: {selectedZone.name}
              </span>
            </div>

            <CitizenTrackingMatrix
              citizens={citizens}
              compact={false}
              onFocusCoordinates={() => {
                window.location.href = "/radar";
              }}
              onDispatchToCitizen={(cit) => {
                const foundResp = activeResponders[0];
                if (foundResp) handleDispatchResponderUnit(foundResp);
              }}
            />
          </div>

          {/* Section 2: Emergency Response Grid (108 ALS, Police, NDRF) */}
          <div className="rounded-2xl glass-panel border border-white/10 p-5 sm:p-6 shadow-sm space-y-4 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <div className="corwdy-subtitle mb-1">
                  <span>/FLEET DISPATCH GRID</span>
                </div>
                <h2 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2 font-display">
                  <Truck className="w-4 h-4 text-sky-400" />
                  Emergency Responder Fleet &amp; Multi-Agency Dispatch Grid
                </h2>
                <p className="text-xs text-white/70">
                  Surrounding 108 Advanced Life Support (ALS) Ambulances, State Police Thanas, and NDRF Battalions with mountain transit ETAs, equipment lists, and hotlines.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleMultiAgencyDispatch}
                  className="btn-solid-danger text-xs h-[38px] px-4 flex items-center gap-1.5 shadow-sm"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Execute Multi-Agency Dispatch</span>
                </button>
              </div>
            </div>

            <EmergencyResponderGrid
              responders={activeResponders}
              zoneName={selectedZone.name}
              compact={false}
              onDispatchUnit={handleDispatchResponderUnit}
              onMultiAgencyDispatch={handleMultiAgencyDispatch}
            />
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

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#161a20]/90 backdrop-blur-md px-6 py-5 text-center text-xs text-white/70 flex flex-col sm:flex-row items-center justify-between gap-3 mt-10 font-sans">
        <div className="font-semibold text-white">
          NeerNetra &bull; Citizen Rescue Fleet Operations &bull; SIH 2026 PS: SIH26192
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block pulse-green" />
            Mobile Sync Server: 172.16.184.105:3000
          </span>
          <span className="text-white/20">|</span>
          <span className="text-white/70">NDRF: 1078 &bull; SDMA: 1070 &bull; Ambulance: 108</span>
        </div>
      </footer>
    </div>
  );
}

