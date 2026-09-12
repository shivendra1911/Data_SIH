"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HazardZone } from "@/lib/types";
import { INDIA_FLOOD_ZONES } from "@/lib/constants";
import {
  ShieldAlert,
  MapPin,
  Radio,
  Smartphone,
  Satellite,
  ChevronDown,
  Compass,
  Users,
  BellRing,
  Plus,
  ExternalLink,
  Phone,
  AlertTriangle,
  Zap,
  Shield,
  Megaphone,
  Navigation,
  Volume2,
  VolumeX,
} from "lucide-react";
import AddButtonModal, {
  CustomActionButton,
  getStoredCustomButtons,
} from "./AddButtonModal";
import CommandFAB, { FabAction } from "./CommandFAB";

interface HeaderProps {
  selectedZone: HazardZone;
  onSelectZone: (zone: HazardZone) => void;
  onSimulateSOS?: () => void;
  onOpenMobileModal: () => void;
  onOpenRegionalBroadcast?: () => void;
  onOpenSafeRoutesGuidelines?: () => void;
  onDetectLiveLocation?: () => void;
  floodRiskPercent: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  isMobileSirenActive?: boolean;
  onToggleMobileSiren?: () => void;
  connectedMobileCount?: number;
}

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

// Maps a custom button's saved color to a CommandFAB tone so it renders
// consistent with every other action in the expandable menu.
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

export default function Header({
  selectedZone,
  onSelectZone,
  onSimulateSOS,
  onOpenMobileModal,
  onOpenRegionalBroadcast,
  onOpenSafeRoutesGuidelines,
  onDetectLiveLocation,
  floodRiskPercent,
  soundEnabled,
  onToggleSound,
  isMobileSirenActive = false,
  onToggleMobileSiren,
  connectedMobileCount,
}: HeaderProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isAddButtonModalOpen, setIsAddButtonModalOpen] = useState(false);
  const [customButtons, setCustomButtons] = useState<CustomActionButton[]>([]);
  const [activeScreenAlert, setActiveScreenAlert] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Kolkata",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load and listen for custom buttons
  useEffect(() => {
    setCustomButtons(getStoredCustomButtons());
    const handleUpdate = () => {
      setCustomButtons(getStoredCustomButtons());
    };
    window.addEventListener("custom_action_buttons_changed", handleUpdate);
    return () => window.removeEventListener("custom_action_buttons_changed", handleUpdate);
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
      setActiveScreenAlert(btn.value);
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } catch {}
      setTimeout(() => setActiveScreenAlert(null), 8000);
    }
  };

  const isDanger = floodRiskPercent >= 70;
  const isWarning = floodRiskPercent >= 35 && floodRiskPercent < 70;

  // Build the single consolidated action list for the floating command menu.
  // Every button that used to compete for space in the header row now lives
  // here, reachable from one always-visible floating trigger.
  const fabActions: FabAction[] = [];

  if (onOpenRegionalBroadcast) {
    fabActions.push({
      id: "zone-broadcast",
      label: "Zone Broadcast",
      icon: <Radio className="w-3.5 h-3.5" />,
      onClick: onOpenRegionalBroadcast,
      tone: "default",
    });
  }

  if (onOpenSafeRoutesGuidelines) {
    fabActions.push({
      id: "safe-shelters",
      label: "Safe Shelters",
      icon: <Compass className="w-3.5 h-3.5" />,
      onClick: onOpenSafeRoutesGuidelines,
      tone: "default",
    });
  }

  fabActions.push({
    id: "mobile-apks",
    label: "Mobile APKs",
    icon: <Smartphone className="w-3.5 h-3.5" />,
    onClick: onOpenMobileModal,
    tone: "default",
    badge: connectedMobileCount !== undefined ? connectedMobileCount : undefined,
  });

  if (onDetectLiveLocation) {
    fabActions.push({
      id: "use-my-location",
      label: "Use My Location",
      icon: <Navigation className="w-3.5 h-3.5" />,
      onClick: onDetectLiveLocation,
      tone: "default",
    });
  }

  if (onToggleSound) {
    fabActions.push({
      id: "toggle-sound",
      label: soundEnabled === false ? "Alert Sound: Off" : "Alert Sound: On",
      icon:
        soundEnabled === false ? (
          <VolumeX className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        ),
      onClick: onToggleSound,
      tone: "default",
    });
  }

  if (onToggleMobileSiren) {
    fabActions.push({
      id: "mobile-siren",
      label: isMobileSirenActive ? "Mobile Siren Active" : "Mobile Siren Standby",
      icon: <BellRing className="w-3.5 h-3.5" />,
      onClick: onToggleMobileSiren,
      tone: isMobileSirenActive ? "danger" : "dark",
      title: isMobileSirenActive ? "Siren Active on Citizen APKs" : "Arm Mobile Siren Dispatch",
    });
  }

  if (onSimulateSOS) {
    fabActions.push({
      id: "simulate-sos",
      label: "Test Alert Sound",
      icon: <Zap className="w-3.5 h-3.5" />,
      onClick: onSimulateSOS,
      tone: "default",
    });
  }

  customButtons.forEach((btn) => {
    fabActions.push({
      id: btn.id,
      label: btn.label,
      icon: getCustomIcon(btn.iconName),
      onClick: () => handleExecuteCustomButton(btn),
      tone: customColorToTone(btn.color),
      title: `${btn.actionType}: ${btn.value}`,
    });
  });

  fabActions.push({
    id: "add-button",
    label: "Add Button",
    icon: <Plus className="w-3.5 h-3.5" />,
    onClick: () => setIsAddButtonModalOpen(true),
    tone: "default",
    title: "Add any custom action button to the command menu",
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#161a20]/90 backdrop-blur-2xl shadow-2xl">
      {/* Active Screen Alert Notification */}
      {activeScreenAlert && (
        <div className="bg-red-600/90 backdrop-blur-md text-white px-4 py-2 text-xs font-extrabold flex items-center justify-between border-b border-red-500/50 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>{activeScreenAlert}</span>
          </div>
          <button
            onClick={() => setActiveScreenAlert(null)}
            className="px-2 py-0.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-[10px] uppercase font-mono transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Telemetry Ticker (IST Time + Nationwide Alert Status + Active Basin) */}
      <div className="bg-[#101317]/90 border-b border-white/5 px-4 py-1.5 text-[11px] text-white/60 flex justify-between items-center font-mono">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-semibold text-white/90 tracking-wide truncate">
            NEERNETRA CWC-NDMA EARLY WARNING NETWORK
          </span>
          <span className="hidden md:inline text-white/20 shrink-0">|</span>
          <span className="hidden md:inline text-white/70 truncate">
            Active Basin: <strong className="text-white font-bold">{selectedZone.name}</strong> ({selectedZone.district})
          </span>
        </div>
        <div className="flex items-center gap-3 font-semibold shrink-0">
          <span className="text-white/80">IST: {currentTime || "--:--:--"}</span>
          <span className="text-white/20 hidden sm:inline">|</span>
          <span className="text-emerald-400 hidden sm:inline">SAT-TELEMETRY: OPTIMAL</span>
        </div>
      </div>

      {/* Main Command Bar */}
      <div className="px-3 sm:px-6 py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* LEFT: Branding + Basin Selector + Risk Badge (Strictly in one row) */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Logo & National Command Title */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group shrink-0"
            aria-label="NeerNetra Home - Early Flood Warning"
          >
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black text-sm tracking-tight border border-white/15 shadow-inner transition group-hover:bg-white/20 group-hover:scale-105">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm sm:text-base tracking-tight text-white font-display">
                  NEERNETRA
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/80 border border-white/15">
                  GOVT OF INDIA
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>NDRF / SDMA Command</span>
              </div>
            </div>
          </Link>

          {/* Basin & Location Selector Dropdown */}
          <div className="relative flex items-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-white/50 absolute left-3 pointer-events-none" aria-hidden />
            <select
              id="header-zone-select"
              value={selectedZone.id}
              onChange={(e) => {
                const zone = INDIA_FLOOD_ZONES.find((z) => z.id === e.target.value);
                if (zone) onSelectZone(zone);
              }}
              aria-label="Select river basin"
              className="bg-[#1b2027]/90 text-white text-xs font-bold pl-8 pr-8 py-2 rounded-xl border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/40 shadow-inner cursor-pointer appearance-none hover:border-white/30 transition"
            >
              <optgroup label="All-India River Basins" className="bg-[#1b2027] text-white">
                {INDIA_FLOOD_ZONES.map((zone) => (
                  <option key={zone.id} value={zone.id} className="bg-[#1b2027] text-white">
                    {zone.name.split("(")[0].trim()} ({zone.district})
                  </option>
                ))}
              </optgroup>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-white/50 absolute right-3 pointer-events-none" aria-hidden />
          </div>

          {/* Color-Coded Risk Badge: NEVER wraps onto a 2nd row */}
          <span
            className={`text-[11px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider whitespace-nowrap shrink-0 border ${
              isDanger
                ? "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse shadow-sm shadow-red-500/20"
                : isWarning
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {isDanger ? "🚨 High Alert" : isWarning ? "⚠️ Warning" : "✅ Safe"} {floodRiskPercent.toFixed(0)}%
          </span>
        </div>

        {/* CENTER: Main Navigation Tabs */}
        <nav aria-label="Main Navigation" className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold self-center shadow-inner">
          <Link
            href="/"
            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-2 uppercase tracking-[1.5px] text-[11px] font-extrabold ${
              pathname === "/"
                ? "bg-white text-[#161a20] shadow-md"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>Basin Monitor</span>
          </Link>

          <Link
            href="/radar"
            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-2 uppercase tracking-[1.5px] text-[11px] font-extrabold ${
              pathname === "/radar"
                ? "bg-white text-[#161a20] shadow-md"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Live Map</span>
          </Link>

          <Link
            href="/rescue"
            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-2 uppercase tracking-[1.5px] text-[11px] font-extrabold ${
              pathname === "/rescue"
                ? "bg-white text-[#161a20] shadow-md"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Citizen SOS</span>
          </Link>
        </nav>

        {/* RIGHT: National Helpline button in sleek glass pill */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <a
            href="tel:1078"
            aria-label="Call National Disaster Helpline 1078"
            className="h-[38px] px-4 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 whitespace-nowrap"
            title="NDRF Emergency Helpline: 1078"
          >
            <span>📞 Helpline 1078</span>
          </a>
        </div>
      </div>

      {/* Floating Command Menu — replaces the old row of 6-7 separate buttons */}
      <CommandFAB actions={fabActions} menuLabel="Command Actions" />

      {/* Add Custom Button Modal */}
      <AddButtonModal
        isOpen={isAddButtonModalOpen}
        onClose={() => setIsAddButtonModalOpen(false)}
        onButtonAdded={() => {
          setCustomButtons(getStoredCustomButtons());
        }}
      />
    </header>
  );
}
