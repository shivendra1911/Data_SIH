"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Dashboard/Header";
import CitizenTrackingMatrix from "@/components/Dashboard/CitizenTrackingMatrix";
import DisasterLocationStream from "@/components/Dashboard/DisasterLocationStream";
import EmergencyResponderGrid from "@/components/Dashboard/EmergencyResponderGrid";
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
  CitizenLocation,
  EmergencyResponder,
  SafeEvacuationRoute,
} from "@/lib/types";
import { subscribeToSOSEvents } from "@/lib/supabase";
import {
  Users,
  Truck,
  MapPin,
  Send,
  Radio,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  Volume2,
  VolumeX,
  Smartphone,
  Navigation,
  BellRing,
  Zap,
  Plus,
  Compass,
} from "lucide-react";
import CommandFAB, {
  FabAction,
  getCustomIcon,
  customColorToTone,
} from "@/components/Dashboard/CommandFAB";
import AddButtonModal, {
  CustomActionButton,
  getStoredCustomButtons,
} from "@/components/Dashboard/AddButtonModal";
import { autonomousAlertEngine, MobileSirenState } from "@/lib/autonomousAlertEngine";

export default function RescueCitizenGridPage() {
  const [selectedZone, setSelectedZone] = useState<HazardZone>(INDIA_FLOOD_ZONES[0]);
  const [citizens, setCitizens] = useState<CitizenLocation[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [isRegionalModalOpen, setIsRegionalModalOpen] = useState<boolean>(false);
  const [isGuidelineModalOpen, setIsGuidelineModalOpen] = useState<boolean>(false);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);

  const prevCitizenCountRef = useRef<number>(0);

  const activeResponders: EmergencyResponder[] = getRespondersForZone(selectedZone);
  const activeSafeRoutes: SafeEvacuationRoute[] = getSafeRoutesForZone(selectedZone);

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

  // Poll live store for incoming mobile phone distress signals (tab-visibility aware)
  useEffect(() => {
    const fetchCitizens = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/citizen/locations");
        if (res.ok) {
          const data = await res.json();
          if (data.citizens && Array.isArray(data.citizens)) {
            setCitizens(data.citizens);
            if (data.citizens.length > prevCitizenCountRef.current && prevCitizenCountRef.current > 0) {
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
    const interval = setInterval(fetchCitizens, 3000);
    return () => clearInterval(interval);
  }, [soundEnabled, playAlertSound]);

  // Realtime Supabase listener
  useEffect(() => {
    const unsub = subscribeToSOSEvents((newEvent) => {
      if (soundEnabled) playAlertSound();
      setDispatchNotice(`🚨 Direct Cloud SOS Signal from ${newEvent.device_uuid}! Plotted to rescue queue.`);
      setTimeout(() => setDispatchNotice(null), 5000);
      setCitizens((prev) => {
        const citIdx = prev.findIndex((c) => c.device_uuid === newEvent.device_uuid);
        const newCit: CitizenLocation = {
          id: `cit-${newEvent.device_uuid.replace(/[^a-zA-Z0-9_-]/g, "")}`,
          device_uuid: newEvent.device_uuid,
          name: `Mobile Citizen [${newEvent.device_uuid.slice(0, 8)}]`,
          phone: "+91 98765 43210",
          lat: newEvent.lat,
          lng: newEvent.lng,
          is_live: true,
          last_seen_minutes_ago: 0,
          accuracy_radius_m: 10,
          drift_radius_m: 0,
          battery_pct: 85,
          status: newEvent.status,
          sos_type: newEvent.sos_type,
          mesh_hops: newEvent.is_mesh_relayed ? 2 : 0,
          zone_id: "chamoli_01",
          medical_distress: "WATER_RISING",
        };
        if (citIdx >= 0) {
          const updated = [...prev];
          updated[citIdx] = { ...updated[citIdx], ...newCit };
          return updated;
        }
        return [newCit, ...prev];
      });
    });
    return () => unsub();
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

  const [sirenState, setSirenState] = useState<MobileSirenState>(autonomousAlertEngine.getState());
  useEffect(() => {
    const unsub = autonomousAlertEngine.subscribe((state) => {
      setSirenState(state);
    });
    return () => unsub();
  }, []);

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
      setDispatchNotice(btn.value);
      setTimeout(() => setDispatchNotice(null), 4000);
    }
  };

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      setDispatchNotice(next ? "🔊 Alert Audio: Enabled" : "🔇 Alert Audio: Muted");
      setTimeout(() => setDispatchNotice(null), 3000);
      return next;
    });
  }, []);

  const handleToggleMobileSiren = useCallback(() => {
    if (sirenState.isDispatchedToMobile) {
      autonomousAlertEngine.haltMobileSiren(selectedZone.id);
      setDispatchNotice("Mobile siren halted across danger zone devices.");
      setTimeout(() => setDispatchNotice(null), 3500);
    } else {
      autonomousAlertEngine.dispatchMobileSiren(
        selectedZone.id,
        selectedZone.name,
        selectedZone.currentRisk,
        selectedZone.center
      );
      setDispatchNotice(
        `Emergency siren transmitted to ${sirenState.targetDevicesCount.toLocaleString()} mobile devices.`
      );
      setTimeout(() => setDispatchNotice(null), 4000);
    }
  }, [sirenState.isDispatchedToMobile, sirenState.targetDevicesCount, selectedZone]);

  const handleTriggerSOS = useCallback(async () => {
    if (soundEnabled) playAlertSound();
    try {
      const res = await fetch("/api/citizen/sos", {
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
        setDispatchNotice("🚨 Emergency SOS signal registered! Rescue teams and NDRF hotline 1078 dispatched.");
        setTimeout(() => setDispatchNotice(null), 5000);
      }
    } catch (err) {
      console.error("SOS dispatch error:", err);
    }
  }, [selectedZone, soundEnabled, playAlertSound]);

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
          setDispatchNotice(`📍 Live Location Active: ${locName}`);
          setTimeout(() => setDispatchNotice(null), 3500);
        }
      }
    } catch (e) {
      console.warn("Rescue geolocation error:", e);
    }
  }, []);

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
      badge: citizens.length > 0 ? citizens.length : undefined,
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
      title: "Add a custom quick action button (Call, Link, or Alert)",
    },
  ];

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
          onSelectZone={setSelectedZone}
          onSimulateSOS={handleTriggerSOS}
          onOpenMobileModal={() => setIsMobileModalOpen(true)}
          onOpenRegionalBroadcast={() => setIsRegionalModalOpen(true)}
          onOpenSafeRoutesGuidelines={() => setIsGuidelineModalOpen(true)}
          onDetectLiveLocation={detectLiveLocation}
          floodRiskPercent={selectedZone.currentRisk}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          isMobileSirenActive={sirenState.isDispatchedToMobile}
          onToggleMobileSiren={handleToggleMobileSiren}
          connectedMobileCount={citizens.length}
        />

        {/* Secondary Alert / Live Mobile Telemetry Bar in Deep Muted Neutral Palette */}
        <div className="bg-[#1e293b] text-[#f8fafc] border-b border-slate-700 px-4 lg:px-6 py-3 shadow-sm font-sans">
          <div className="flex flex-wrap items-center gap-3 max-w-[1800px] mx-auto w-full text-xs">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-[10px]">Live Phone Sync Active</span>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <span className="font-bold text-[#f8fafc]">Distress Queue:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-[10px] uppercase tracking-wider">
                {sosCitizens.length} Active SOS
              </span>
              <span className="text-slate-400 text-[11px]">
                ({liveCount} Live GPS &bull; {offlineCount} Offline Mesh)
              </span>
            </div>
          </div>
        </div>

        {/* Dispatch Notification Alert */}
        {dispatchNotice && (
          <div className="max-w-[1800px] mx-auto w-full px-4 pt-3 font-sans">
            <div className="p-3.5 rounded-2xl bg-slate-900 text-[#f8fafc] border border-slate-700 shadow-md flex items-center justify-between text-xs font-bold animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{dispatchNotice}</span>
              </div>
              <button
                onClick={() => setDispatchNotice(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Grid Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1800px] mx-auto w-full space-y-6 font-sans">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Cols: Real-Time Citizen Tracking Matrix */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              <DisasterLocationStream />

              <CitizenTrackingMatrix
                citizens={citizens}
                onFocusCoordinates={(coords) => {
                  if (typeof window !== "undefined") {
                    window.location.href = `/radar?lat=${coords[0]}&lng=${coords[1]}`;
                  }
                }}
                onDispatchToCitizen={(c) => {
                  setDispatchNotice(`✓ Assigned nearest patrol unit to rescue ${c.name} at (${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}).`);
                  setTimeout(() => setDispatchNotice(null), 5000);
                }}
              />
            </div>

            {/* Right 5 Cols: Emergency Responder Grid */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <EmergencyResponderGrid
                responders={activeResponders}
                zoneName={selectedZone.name}
                onDispatchUnit={handleDispatchResponderUnit}
                onMultiAgencyDispatch={handleMultiAgencyDispatch}
              />
            </div>
          </div>

        </main>

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

      {/* Floating Command Menu '+' at Bottom-Right */}
      <CommandFAB actions={fabActions} menuLabel="Command Actions" />

      {/* Add Custom Button Modal */}
      <AddButtonModal
        isOpen={isAddButtonModalOpen}
        onClose={() => setIsAddButtonModalOpen(false)}
        onButtonAdded={() => {
          setCustomButtons(getStoredCustomButtons());
        }}
      />
    </div>
  );
}
