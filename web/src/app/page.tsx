"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Dashboard/Header";
import TelemetryStrip from "@/components/Dashboard/TelemetryStrip";
import PredictionPanel from "@/components/Dashboard/PredictionPanel";
import PreventiveDirectivesPanel from "@/components/Dashboard/PreventiveDirectivesPanel";
import DisasterLocationStream from "@/components/Dashboard/DisasterLocationStream";
import NationalSentinelRadar from "@/components/Dashboard/NationalSentinelRadar";
import CitizenTrackingMatrix from "@/components/Dashboard/CitizenTrackingMatrix";
import EmergencyResponderGrid from "@/components/Dashboard/EmergencyResponderGrid";
import ScrollVideoHero from "@/components/CinematicHero/ScrollVideoHero";
import MobilePairingModal from "@/components/Dashboard/MobilePairingModal";
import RegionalAlertBroadcastModal from "@/components/Dashboard/RegionalAlertBroadcastModal";
import SafeRouteGuidelineModal from "@/components/Dashboard/SafeRouteGuidelineModal";
import CommandFAB, { FabAction } from "@/components/Dashboard/CommandFAB";
import AddButtonModal, {
  CustomActionButton,
  getStoredCustomButtons,
} from "@/components/Dashboard/AddButtonModal";
import { INDIA_FLOOD_ZONES, getSafeRoutesForZone, getRespondersForZone } from "@/lib/constants";
import {
  HazardZone,
  PredictionResponse,
  NationalSentinelScan,
  SafeEvacuationRoute,
  ForecastHorizon,
  CitizenLocation,
  EmergencyResponder,
} from "@/lib/types";
import { fetchCurrentPrediction } from "@/lib/api";
import { autonomousAlertEngine, MobileSirenState } from "@/lib/autonomousAlertEngine";
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
  BellRing,
  Volume2,
  VolumeX,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Phone,
  ExternalLink,
  Megaphone,
  Shield,
  Plus,
  Navigation,
} from "lucide-react";

const DEFAULT_USER_ZONE: HazardZone = {
  id: "live_user_location",
  name: "My Live Location (Detecting...)",
  district: "Live Location",
  center: [24.7114, 83.0387],
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
  hydrograph: [],
  preventiveDirectives: [],
  infrastructure: [],
};

function getCustomIcon(name: string) {
  switch (name) {
    case "Phone":
      return <Phone className="w-3.5 h-3.5" />;
    case "AlertTriangle":
      return <AlertTriangle className="w-3.5 h-3.5" />;
    case "Radio":
      return <Radio className="w-3.5 h-3.5" />;
    case "Megaphone":
      return <Megaphone className="w-3.5 h-3.5" />;
    case "Shield":
      return <Shield className="w-3.5 h-3.5" />;
    case "Zap":
      return <Zap className="w-3.5 h-3.5" />;
    case "ExternalLink":
    default:
      return <ExternalLink className="w-3.5 h-3.5" />;
  }
}

function customColorToTone(color: string): FabAction["tone"] {
  switch (color) {
    case "red":
      return "danger";
    case "emerald":
      return "success";
    case "blue":
      return "blue";
    case "amber":
      return "amber";
    case "slate":
    default:
      return "dark";
  }
}

export default function NationalSentinelPage() {
  useRabtoTilt();
  useScrollReveal();

  const [selectedZone, setSelectedZone] = useState<HazardZone>(INDIA_FLOOD_ZONES[0]);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState<boolean>(true);
  const [forecastHorizon, setForecastHorizon] = useState<ForecastHorizon>("NOW");
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [isRegionalModalOpen, setIsRegionalModalOpen] = useState<boolean>(false);
  const [isGuidelineModalOpen, setIsGuidelineModalOpen] = useState<boolean>(false);
  const [sentinelScan, setSentinelScan] = useState<NationalSentinelScan | null>(null);
  const [loadingScan, setLoadingScan] = useState<boolean>(false);
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Government Mobile Siren State (Dispatched exclusively to mobile APKs in danger zone)
  const [sirenState, setSirenState] = useState<MobileSirenState>(autonomousAlertEngine.getState());

  const [connectedMobileCount, setConnectedMobileCount] = useState<number>(0);
  const [citizens, setCitizens] = useState<CitizenLocation[]>([]);

  useEffect(() => {
    const unsub = autonomousAlertEngine.subscribe((state) => {
      setSirenState(state);
    });
    return () => {
      unsub();
    };
  }, []);

  // Poll real connected mobile devices from /api/citizen/locations (tab-visibility aware)
  useEffect(() => {
    const fetchMobileCount = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/citizen/locations");
        if (res.ok) {
          const data = await res.json();
          setConnectedMobileCount(data.total || 0);
          if (data.citizens && Array.isArray(data.citizens)) {
            setCitizens(data.citizens);
          }
          autonomousAlertEngine.updateRegisteredDeviceCount(data.total || 0);
        }
      } catch (err) {
        // silent fail
      }
    };
    fetchMobileCount();
    const interval = setInterval(fetchMobileCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeSafeRoutes: SafeEvacuationRoute[] = getSafeRoutesForZone(selectedZone);
  const activeResponders: EmergencyResponder[] = getRespondersForZone(selectedZone);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Non-blocking toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      showToast(next ? "🔊 Alert Audio: Enabled" : "🔇 Alert Audio: Muted");
      return next;
    });
  }, []);

  const handleTriggerSOS = useCallback(async () => {
    if (soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(950, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(440, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } catch {}
    }
    try {
      const res = await fetch("/api/citizen/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Emergency Citizen SOS (${selectedZone.name.split("(")[0].trim()})`,
          phone: "+91 98765 43210",
          lat: selectedZone.center[0],
          lng: selectedZone.center[1],
          zone_id: selectedZone.id,
          status: "SOS",
          medical_distress: "HIGH_WATER_EVACUATION",
          sos_type: "CITIZEN 1-TAP DISTRESS BEACON",
        }),
      });
      if (res.ok) {
        showToast("🚨 Emergency SOS signal registered! Rescue teams and NDRF hotline 1078 dispatched.");
      }
    } catch (err) {
      console.error("SOS dispatch error:", err);
    }
  }, [selectedZone, soundEnabled]);

  const [isAddButtonModalOpen, setIsAddButtonModalOpen] = useState(false);
  const [customButtons, setCustomButtons] = useState<CustomActionButton[]>([]);

  useEffect(() => {
    setCustomButtons(getStoredCustomButtons());
    const handleButtonsChanged = () => {
      setCustomButtons(getStoredCustomButtons());
    };
    window.addEventListener("custom_action_buttons_changed", handleButtonsChanged);
    return () => {
      window.removeEventListener("custom_action_buttons_changed", handleButtonsChanged);
    };
  }, []);

  const handleExecuteCustomButton = (btn: CustomActionButton) => {
    if (btn.actionType === "LINK") {
      let url = btn.value.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (btn.actionType === "CALL") {
      window.location.href = `tel:${btn.value.replace(/[^0-9+]/g, "")}`;
    } else if (btn.actionType === "ALERT") {
      showToast(btn.value);
    }
  };

  const runNationalScan = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    setLoadingScan(true);
    try {
      const res = await fetch(`/api/sentinel/scan?auto_dispatch=${autoDispatchEnabled}`);
      if (res.ok) {
        const data: NationalSentinelScan = await res.json();
        setSentinelScan(data);
      }
    } catch (err) {
      console.warn("National sentinel scan error:", err);
    } finally {
      setLoadingScan(false);
    }
  }, [autoDispatchEnabled]);

  useEffect(() => {
    runNationalScan();
    const interval = setInterval(runNationalScan, 30000);
    return () => clearInterval(interval);
  }, [runNationalScan]);

  const detectLiveLocation = useCallback(async () => {
    // 1. Instant IP geolocation resolution (<100ms)
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
          showToast(`📍 Live Location Active: ${locName}`);
        }
      }
    } catch (e) {
      console.warn("IP Geolocation error:", e);
    }

    // 2. High-precision GPS enhancement if granted by browser
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const geoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${lat}&longitude=${lng}&count=1`
            );
            let locName = "My GPS Location";
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.results?.[0]?.name) {
                locName = `${geoData.results[0].name} (${geoData.results[0].admin1 || "India"})`;
              }
            }
            const userZone: HazardZone = {
              id: "live_user_location",
              name: locName,
              district: locName.split("(")[0].trim(),
              center: [lat, lng],
              dangerMarkM: 5.0,
              warningMarkM: 3.5,
              currentRisk: 6.5,
              alertColor: "GREEN",
              leadTimeMinutes: 480,
              primaryTrigger: "Live GPS Meteorological Telemetry",
              telemetry: {
                rainfall_mm: 0.0,
                soil_moisture_pct: 45.0,
                slope_deg: 10.0,
                river_level_m: 1.2,
                seismic_mag: 0.0,
              },
            };
            setSelectedZone(userZone);
            showToast(`📍 Precision GPS Active: ${locName}`);
          } catch {
            const userZone: HazardZone = {
              id: "live_user_location",
              name: `GPS Location (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
              district: "My Location",
              center: [lat, lng],
              dangerMarkM: 5.0,
              warningMarkM: 3.5,
              currentRisk: 6.5,
              alertColor: "GREEN",
              leadTimeMinutes: 480,
              primaryTrigger: "Live GPS Telemetry",
              telemetry: {
                rainfall_mm: 0.0,
                soil_moisture_pct: 45.0,
                slope_deg: 10.0,
                river_level_m: 1.2,
                seismic_mag: 0.0,
              },
            };
            setSelectedZone(userZone);
          }
        },
        () => {},
        { timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);


  const loadZoneData = useCallback(async (zone: HazardZone) => {
    setLoadingPrediction(true);
    try {
      let pred: PredictionResponse;
      if (zone.id === "live_user_location" || zone.id.startsWith("custom_")) {
        pred = await fetchCurrentPrediction({
          lat: zone.center[0],
          lng: zone.center[1],
          name: zone.name,
        });
      } else {
        pred = await fetchCurrentPrediction(zone.id);
      }
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

  // Autonomous Mobile Siren Dispatch: Disabled by default to prevent false alarm loops.
  // Sirens are only dispatched when the emergency authority explicitly triggers them from the dashboard.
  useEffect(() => {
    if (autoDispatchEnabled && displayedRisk >= 75) {
      autonomousAlertEngine.evaluateAndDispatchAutonomousAlert(
        selectedZone.id,
        selectedZone.name,
        displayedRisk,
        selectedZone.center
      );
    }
  }, [displayedRisk, selectedZone, autoDispatchEnabled]);

  const handleToggleMobileSiren = useCallback(() => {
    if (sirenState.isDispatchedToMobile) {
      autonomousAlertEngine.haltMobileSiren(selectedZone.id);
      showToast("Mobile siren halted across danger zone devices.");
    } else {
      autonomousAlertEngine.dispatchMobileSiren(
        selectedZone.id,
        selectedZone.name,
        displayedRisk,
        selectedZone.center
      );
      showToast(
        `Emergency siren transmitted to ${sirenState.targetDevicesCount.toLocaleString()} mobile devices.`
      );
    }
  }, [sirenState.isDispatchedToMobile, sirenState.targetDevicesCount, selectedZone, displayedRisk]);

  const fabActions: FabAction[] = [
    {
      id: "zone-broadcast",
      label: "Zone Broadcast",
      icon: <Radio className="w-3.5 h-3.5" />,
      onClick: () => setIsRegionalModalOpen(true),
      tone: "danger",
      title: "Broadcast alert notification to citizen devices",
    },
    {
      id: "safe-shelters",
      label: "Safe Shelters",
      icon: <Compass className="w-3.5 h-3.5" />,
      onClick: () => setIsGuidelineModalOpen(true),
      tone: "default",
      title: "View verified safe evacuation routes & shelters",
    },
    {
      id: "mobile-apks",
      label: "Mobile APKs",
      icon: <Smartphone className="w-3.5 h-3.5" />,
      onClick: () => setIsMobileModalOpen(true),
      tone: "default",
      badge: connectedMobileCount > 0 ? connectedMobileCount : undefined,
      title: "Connect & manage field mobile nodes",
    },
    {
      id: "use-my-location",
      label: "Use My Location",
      icon: <Navigation className="w-3.5 h-3.5" />,
      onClick: detectLiveLocation,
      tone: "default",
      title: "Detect live GPS & meteorological location",
    },
    {
      id: "toggle-sound",
      label: soundEnabled === false ? "Alert Sound: Off" : "Alert Sound: On",
      icon:
        soundEnabled === false ? (
          <VolumeX className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        ),
      onClick: handleToggleSound,
      tone: "default",
      title: soundEnabled ? "Mute alert audio" : "Enable alert audio",
    },
    {
      id: "mobile-siren",
      label: sirenState.isDispatchedToMobile ? "Mobile Siren Active" : "Mobile Siren Standby",
      icon: <BellRing className="w-3.5 h-3.5" />,
      onClick: handleToggleMobileSiren,
      tone: sirenState.isDispatchedToMobile ? "danger" : "dark",
      title: sirenState.isDispatchedToMobile ? "Siren Active on Citizen APKs" : "Arm Mobile Siren Dispatch",
    },
    {
      id: "simulate-sos",
      label: "Test Alert Sound",
      icon: <Zap className="w-3.5 h-3.5" />,
      onClick: handleTriggerSOS,
      tone: "amber",
      title: "Simulate test alert sound & SOS beacon",
    },
    ...customButtons.map((btn) => ({
      id: btn.id,
      label: btn.label,
      icon: getCustomIcon(btn.iconName),
      onClick: () => handleExecuteCustomButton(btn),
      tone: customColorToTone(btn.color),
      title: `${btn.actionType}: ${btn.value}`,
    })),
    {
      id: "add-button",
      label: "Add Button",
      icon: <Plus className="w-3.5 h-3.5" />,
      onClick: () => setIsAddButtonModalOpen(true),
      tone: "default",
      title: "Add custom action button",
    },
  ];

  const isSirenBroadcasting = sirenState.isDispatchedToMobile;
  const isSirenHalted = sirenState.isManuallyHalted;

  return (
    <div className="relative min-h-screen flex flex-col text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Fixed Ambient Dynamic Video Background for entire page */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none overflow-hidden transform-gpu will-change-transform">
        <video
          src="/download.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover scale-105 transform-gpu pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#161a20]/70 via-[#161a20]/35 to-[#161a20]/75 pointer-events-none" />
      </div>

      {/* Floating In-App Non-Blocking Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Cinematic Hero Section with Fixed & Smooth Video Scrubbing */}
      <div className="relative z-10">
        <ScrollVideoHero
          onEnterCommandCenter={() => {
            const lenis = (window as any).__lenis;
            if (lenis) {
              lenis.scrollTo('#sentinel-overview', { duration: 1.2 });
            } else {
              document.getElementById("sentinel-overview")?.scrollIntoView({ behavior: "smooth" });
            }
          }}
        />
      </div>

      {/* Main Page Stage */}
      <div id="sentinel-overview" className="relative z-10 min-h-screen flex flex-col bg-transparent">
        <Header
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
          onOpenMobileModal={() => setIsMobileModalOpen(true)}
          onOpenRegionalBroadcast={() => setIsRegionalModalOpen(true)}
          onOpenSafeRoutesGuidelines={() => setIsGuidelineModalOpen(true)}
          onDetectLiveLocation={detectLiveLocation}
          floodRiskPercent={displayedRisk}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          isMobileSirenActive={sirenState.isDispatchedToMobile}
          connectedMobileCount={connectedMobileCount}
          onToggleMobileSiren={handleToggleMobileSiren}
        />

        {/* GOVERNMENT EMERGENCY MOBILE SIREN DISPATCH CONSOLE
            Only takes up screen space when there's something the operator
            actually needs to act on (active or halted) — no permanent
            "standby" bar cluttering the page on every normal visit. */}
        {isSirenBroadcasting ? (
          <div className="bg-[#1e293b] text-[#f8fafc] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg border-b border-slate-700/80 sticky top-[61px] z-40">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-base shrink-0 animate-pulse">
                🚨
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
                    EMERGENCY CELL SIREN ACTIVE ON {sirenState.targetDevicesCount.toLocaleString()} CITIZEN DEVICES
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 uppercase">
                    MOBILE APK ONLY
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 font-normal">
                  Broadcasting civic evacuation siren &amp; forced vibration to all phones located in {selectedZone.name.split("(")[0].trim()}.
                  Web command audio is muted for operator composure.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  autonomousAlertEngine.haltMobileSiren(selectedZone.id);
                  showToast("Mobile emergency siren halted for citizen devices.");
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-[#f8fafc] font-bold text-xs transition shadow-sm flex items-center gap-1.5 border border-red-500 cursor-pointer"
              >
                <VolumeX className="w-3.5 h-3.5 text-[#f8fafc]" />
                <span>Halt Mobile Siren</span>
              </button>
              <button
                onClick={() => {
                  autonomousAlertEngine.dispatchMobileSiren(
                    selectedZone.id,
                    selectedZone.name,
                    displayedRisk,
                    selectedZone.center
                  );
                  showToast(`Emergency siren re-transmitted to ${sirenState.targetDevicesCount.toLocaleString()} mobile devices.`);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#f8fafc] font-bold text-xs transition shadow-sm flex items-center gap-1.5 border border-slate-600 cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 text-amber-400" />
                <span>Re-Broadcast Siren</span>
              </button>
            </div>
          </div>
        ) : isSirenHalted ? (
          <div className="bg-[#1e293b] text-[#f8fafc] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm border-b border-slate-700 sticky top-[61px] z-40">
            <div className="flex items-center gap-2.5">
              <span className="text-base">⚠️</span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                MOBILE SIREN HALTED BY OPERATOR:
              </span>
              <span className="text-xs font-normal text-slate-300">
                Citizen devices in {selectedZone.name.split("(")[0].trim()} on audio standby. Auto-dispatch temporarily suspended.
              </span>
            </div>
            <button
              onClick={() => {
                autonomousAlertEngine.dispatchMobileSiren(
                  selectedZone.id,
                  selectedZone.name,
                  displayedRisk,
                  selectedZone.center
                );
                showToast(`Emergency siren resumed on ${sirenState.targetDevicesCount.toLocaleString()} mobile devices.`);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#f8fafc] font-bold text-xs transition shadow-sm border border-slate-600 flex items-center gap-1.5 cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-400" />
              <span>Resume Mobile Siren</span>
            </button>
          </div>
        ) : null}

        {/* Real-time 3-Card Telemetry Ribbon with LIVE Telemetry */}
        <TelemetryStrip
          activeZone={selectedZone}
          riskPercent={displayedRisk}
          liveTelemetry={prediction?.telemetry}
          isLiveInternet={prediction?.is_live_internet}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto w-full space-y-8 font-sans">
          
          {/* PRIMARY FOCAL POINT: Big, Crystal-Clear Flood Risk Status Card */}
          <section aria-label="Current Flood Threat Assessment">
            <PredictionPanel
              prediction={
                prediction
                  ? {
                      ...prediction,
                      flood_probability_percent: displayedRisk,
                      alert_color:
                        displayedRisk >= 70
                          ? "RED"
                          : displayedRisk >= 35
                          ? "YELLOW"
                          : "GREEN",
                    }
                  : null
              }
              loading={loadingPrediction}
              onRefresh={() => loadZoneData(selectedZone)}
              onTriggerSOS={handleTriggerSOS}
            />
          </section>

          {/* Section 2: All-India 12 River Basins Quick Switcher */}
          <section aria-label="All-India River Basins" className="space-y-3">
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
          </section>

          {/* Section 3: High-Frequency GPS Telemetry, Citizen Rescue List & Emergency Response Grid */}
          <section aria-label="Field Telemetry & Citizen Operations" className="space-y-6">
            <DisasterLocationStream />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Cols: Citizen Rescue List */}
              <div className="lg:col-span-7">
                <CitizenTrackingMatrix
                  citizens={citizens}
                  onFocusCoordinates={(coords) => {
                    if (typeof window !== "undefined") {
                      window.location.href = `/radar?lat=${coords[0]}&lng=${coords[1]}`;
                    }
                  }}
                  onDispatchToCitizen={(cit) => {
                    showToast(`Dispatched response unit to citizen ${cit.name || cit.device_uuid}`);
                  }}
                />
              </div>

              {/* Right 5 Cols: Emergency Response Grid */}
              <div className="lg:col-span-5">
                <EmergencyResponderGrid
                  responders={activeResponders}
                  zoneName={selectedZone.name}
                  onDispatchUnit={(resp) => {
                    showToast(`Dispatched unit ${resp.unit_name}`);
                  }}
                />
              </div>
            </div>

            <PreventiveDirectivesPanel activeZone={selectedZone} />
          </section>

        </main>
      </div>

      {/* Modals */}
      <MobilePairingModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        onSimulateAndroidSOS={handleTriggerSOS}
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
          showToast("Safe guidelines broadcasted across regional edge network.");
        }}
      />

      {/* Floating Command Menu '+' at Bottom-Right with Full Functionality */}
      <CommandFAB actions={fabActions} menuLabel="Command Actions" />

      {/* Add Custom Button Modal */}
      <AddButtonModal
        isOpen={isAddButtonModalOpen}
        onClose={() => setIsAddButtonModalOpen(false)}
        onButtonAdded={() => {
          setCustomButtons(getStoredCustomButtons());
        }}
      />

      {/* Footer in Deep Muted Neutral Palette */}
      <footer className="border-t border-slate-800 bg-[#0f172a]/95 backdrop-blur-xl px-6 py-5 text-center text-xs text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 mt-10 font-sans shadow-lg">
        <div className="font-bold text-[#f8fafc]">
          NeerNetra &bull; India Flash Flood Early Warning System &bull; SIH 2026
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block live-dot-green" />
            12 Basins Online
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400 font-normal">Emergency Hotlines: NDRF 1078 &bull; SDMA 1070 &bull; Ambulance 108</span>
        </div>
      </footer>
    </div>
  );
}
