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
} from "lucide-react";
import AddButtonModal, {
  CustomActionButton,
  getStoredCustomButtons,
} from "./AddButtonModal";

interface HeaderProps {
  selectedZone: HazardZone;
  onSelectZone: (zone: HazardZone) => void;
  isDemoMode?: boolean;
  onToggleDemoMode?: () => void;
  onSimulateSOS?: () => void;
  onOpenMobileModal: () => void;
  onOpenRegionalBroadcast?: () => void;
  onOpenSafeRoutesGuidelines?: () => void;
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
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    case "Radio":
      return <Radio className="w-3.5 h-3.5" />;
    case "Megaphone":
      return <Megaphone className="w-3.5 h-3.5" />;
    case "Shield":
      return <Shield className="w-3.5 h-3.5" />;
    case "Zap":
      return <Zap className="w-3.5 h-3.5 text-amber-400" />;
    case "ExternalLink":
    default:
      return <ExternalLink className="w-3.5 h-3.5" />;
  }
}

function getCustomColorClasses(color: string) {
  switch (color) {
    case "red":
      return "bg-red-600 hover:bg-red-700 text-white border border-red-500";
    case "emerald":
      return "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500";
    case "blue":
      return "bg-blue-600 hover:bg-blue-700 text-white border border-blue-500";
    case "amber":
      return "bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-400";
    case "slate":
    default:
      return "bg-slate-900 hover:bg-black text-white border border-slate-800";
  }
}

export default function Header({
  selectedZone,
  onSelectZone,
  onOpenMobileModal,
  onOpenRegionalBroadcast,
  onOpenSafeRoutesGuidelines,
  floodRiskPercent,
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-300 bg-white shadow-xs">
      {/* Active Screen Alert Notification */}
      {activeScreenAlert && (
        <div className="bg-red-600 text-white px-4 py-2 text-xs font-extrabold flex items-center justify-between border-b border-red-700 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>{activeScreenAlert}</span>
          </div>
          <button
            onClick={() => setActiveScreenAlert(null)}
            className="px-2 py-0.5 rounded bg-red-800 hover:bg-red-900 text-white text-[10px] uppercase font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Telemetry Ticker (IST Time + Nationwide Alert Status) */}
      <div className="bg-[#faf9f5] border-b border-slate-200 px-4 py-1 text-[11px] text-slate-700 flex justify-between items-center font-mono">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-700 animate-pulse" />
          <span className="font-semibold text-slate-900 tracking-wide">
            NEERNETRA CWC-NDMA EARLY WARNING NETWORK
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-slate-700">
            Active Basin: <strong>{selectedZone.name}</strong> ({selectedZone.district})
          </span>
        </div>
        <div className="flex items-center gap-3 font-semibold">
          <span className="text-slate-800">IST: {currentTime || "--:--:--"}</span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-emerald-800 hidden sm:inline">SAT-TELEMETRY: OPTIMAL</span>
        </div>
      </div>

      {/* Main Command Bar */}
      <div className="px-3 sm:px-6 py-2.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white">
        {/* LEFT: Branding + Basin Selector */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Logo & National Command Title */}
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-2.5 group"
            aria-label="NeerNetra Home - Early Flood Warning"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-tight border border-slate-900 shadow-sm transition group-hover:bg-black">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm sm:text-base tracking-tight text-slate-950">
                  NEERNETRA
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                  GOVT OF INDIA
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>NDRF / SDMA Disaster Command Network</span>
              </div>
            </div>
          </Link>

          {/* Basin & Location Selector Dropdown */}
          <div className="relative flex items-center ml-1 sm:ml-3">
            <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" aria-hidden />
            <select
              id="header-zone-select"
              value={selectedZone.id}
              onChange={(e) => {
                const zone = INDIA_FLOOD_ZONES.find((z) => z.id === e.target.value);
                if (zone) onSelectZone(zone);
              }}
              aria-label="Select river basin"
              className="bg-[#faf9f5] text-slate-900 text-xs font-bold pl-8 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs cursor-pointer appearance-none hover:border-slate-400 transition"
            >
              <optgroup label="All-India River Basins">
                {INDIA_FLOOD_ZONES.map((zone) => (
                  <option key={zone.id} value={zone.id} className="bg-white text-slate-900">
                    {zone.name.split("(")[0].trim()} ({zone.district})
                  </option>
                ))}
              </optgroup>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 pointer-events-none" aria-hidden />
          </div>

          {/* Color-Coded Risk Badge: Red >= 70%, Yellow 35-69%, Green < 35% */}
          <span
            className={`text-[11px] font-black px-3 py-1 rounded-xl uppercase tracking-wider ${
              isDanger
                ? "bg-red-50 text-red-700 border border-red-300 animate-pulse"
                : isWarning
                ? "bg-amber-50 text-amber-800 border border-amber-300"
                : "bg-emerald-50 text-emerald-800 border border-emerald-300"
            }`}
          >
            {isDanger ? "🚨 High Alert" : isWarning ? "⚠️ Warning" : "✅ Safe"} {floodRiskPercent.toFixed(0)}%
          </span>
        </div>

        {/* CENTER: Main Navigation Tabs */}
        <nav aria-label="Main Navigation" className="flex items-center gap-1 p-1 rounded-xl bg-[#faf9f5] border border-slate-200 text-xs font-bold self-center">
          <Link
            href="/"
            className={`px-4 py-1.5 rounded-lg transition flex items-center gap-2 uppercase tracking-[1.5px] text-[11px] font-extrabold ${
              pathname === "/"
                ? "bg-white text-slate-950 shadow-xs border border-slate-300"
                : "text-slate-600 hover:text-slate-950 hover:bg-white/60"
            }`}
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>Basin Monitor</span>
          </Link>

          <Link
            href="/radar"
            className={`px-4 py-1.5 rounded-lg transition flex items-center gap-2 uppercase tracking-[1.5px] text-[11px] font-extrabold ${
              pathname === "/radar"
                ? "bg-white text-slate-950 shadow-xs border border-slate-300"
                : "text-slate-600 hover:text-slate-950 hover:bg-white/60"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Live Map</span>
          </Link>

          <Link
            href="/rescue"
            className={`px-4 py-1.5 rounded-lg transition flex items-center gap-2 uppercase tracking-[1.5px] text-[11px] font-extrabold ${
              pathname === "/rescue"
                ? "bg-white text-slate-950 shadow-xs border border-slate-300"
                : "text-slate-600 hover:text-slate-950 hover:bg-white/60"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Citizen SOS</span>
          </Link>
        </nav>

        {/* RIGHT: Operational Hotlines, Dynamic Custom Buttons, & Add Button */}
        <div className="flex items-center gap-2 self-end lg:self-center flex-wrap">
          {/* Indian Disaster Helpline */}
          <a
            href="tel:1078"
            aria-label="Call National Disaster Helpline 1078"
            className="h-[38px] px-3.5 rounded-xl bg-[#faf9f5] hover:bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
            title="NDRF Emergency Helpline: 1078"
          >
            <span>📞 Helpline 1078</span>
          </a>

          {/* Dynamic User-Added Custom Action Buttons */}
          {customButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => handleExecuteCustomButton(btn)}
              aria-label={btn.label}
              className={`h-[38px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition ${getCustomColorClasses(
                btn.color
              )}`}
              title={`${btn.actionType}: ${btn.value}`}
            >
              {getCustomIcon(btn.iconName)}
              <span>{btn.label}</span>
            </button>
          ))}

          {/* "+ Add Button" Control to add any custom button */}
          <button
            onClick={() => setIsAddButtonModalOpen(true)}
            aria-label="Add custom action button"
            className="h-[38px] px-3 rounded-xl bg-[#faf9f5] hover:bg-slate-100 text-slate-900 border border-slate-300 border-dashed text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
            title="Add any custom action button to command bar"
          >
            <Plus className="w-3.5 h-3.5 text-slate-700" aria-hidden />
            <span>+ Add Button</span>
          </button>

          {/* Safe Shelters Quick Button */}
          {onOpenSafeRoutesGuidelines && (
            <button
              onClick={onOpenSafeRoutesGuidelines}
              aria-label="View verified safe evacuation shelters and guidelines"
              className="h-[38px] px-3.5 rounded-xl bg-[#faf9f5] hover:bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
            >
              <Compass className="w-3.5 h-3.5 text-slate-700" aria-hidden />
              <span className="hidden sm:inline">Safe Shelters</span>
            </button>
          )}

          {/* Mobile APK Broadcast Sync Button */}
          <button
            onClick={onOpenMobileModal}
            aria-label="Citizen & Responder Mobile APK Sync"
            className="h-[38px] px-3.5 rounded-xl bg-[#faf9f5] hover:bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
            title="Mobile APK Push & Offline Mesh Network"
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-700" aria-hidden />
            <span className="hidden md:inline">
              {connectedMobileCount !== undefined
                ? `${connectedMobileCount} Mobile APKs`
                : "Mobile APKs"}
            </span>
            {connectedMobileCount !== undefined && connectedMobileCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>

          {/* Mobile Siren Control Status Indicator */}
          {onToggleMobileSiren && (
            <button
              onClick={onToggleMobileSiren}
              aria-label={isMobileSirenActive ? "Halt siren on mobile devices" : "Transmit siren to mobile devices"}
              className={`h-[38px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition ${
                isMobileSirenActive
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  : "bg-slate-900 hover:bg-black text-white"
              }`}
              title={isMobileSirenActive ? "Siren Active on Citizen APKs" : "Arm Mobile Siren Dispatch"}
            >
              <BellRing className="w-3.5 h-3.5" aria-hidden />
              <span>{isMobileSirenActive ? "🚨 Mobile Siren Active" : "📡 Mobile Siren Standby"}</span>
            </button>
          )}
        </div>
      </div>

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