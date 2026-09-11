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
  Clock,
  Smartphone,
  Satellite,
  Volume2,
  VolumeX,
  ChevronDown,
  Compass,
  Users,
} from "lucide-react";

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
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export default function Header({
  selectedZone,
  onSelectZone,
  onSimulateSOS,
  onOpenMobileModal,
  onOpenRegionalBroadcast,
  onOpenSafeRoutesGuidelines,
  floodRiskPercent,
  soundEnabled,
  onToggleSound,
}: HeaderProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>("");

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
        }) + " IST"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const isZeroMinuteActive = floodRiskPercent >= 75;

  return (
    <header className="glass-panel border-b border-white/60 sticky top-0 z-50 px-3 sm:px-5 lg:px-6 py-2 shadow-xs backdrop-blur-md">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 max-w-[1800px] mx-auto w-full">

        {/* LEFT: Brand & Live Mobile Sync Indicator */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-xs text-white">
                <ShieldAlert className="w-4 h-4" aria-hidden />
              </div>
              {isZeroMinuteActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" aria-hidden />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Link href="/" className="text-sm font-black tracking-tight text-slate-950 hover:opacity-90 transition" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Neer<span className="text-indigo-600">Netra</span>
                </Link>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                  v2.4
                </span>
                <button
                  onClick={onOpenMobileModal}
                  title="Click to view Android APK pairing status and endpoints"
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>APK Sync: 172.16.184.105:3000</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile IST Clock (Compact) */}
          <div className="sm:hidden flex items-center gap-1 text-[11px] font-mono text-slate-700 bg-white/70 px-2 py-1 rounded-md border border-slate-200">
            <Clock className="w-3 h-3 text-indigo-600" />
            <span>{currentTime || "00:00 IST"}</span>
          </div>
        </div>

        {/* CENTER: 3-Page Navigation Tabs */}
        <nav aria-label="Command Center Navigation" className="flex items-center justify-center gap-1 p-1 rounded-xl bg-slate-100/95 border border-slate-200/90 text-xs font-semibold shadow-xs">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              pathname === "/"
                ? "bg-white text-indigo-950 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <Satellite className={`w-3.5 h-3.5 ${pathname === "/" ? "text-indigo-600" : "text-slate-400"}`} />
            <span>National Sentinel</span>
          </Link>

          <Link
            href="/radar"
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              pathname === "/radar"
                ? "bg-white text-emerald-950 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <Compass className={`w-3.5 h-3.5 ${pathname === "/radar" ? "text-emerald-600" : "text-slate-400"}`} />
            <span>Tactical Radar</span>
          </Link>

          <Link
            href="/rescue"
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              pathname === "/rescue"
                ? "bg-white text-rose-950 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${pathname === "/rescue" ? "text-rose-600" : "text-slate-400"}`} />
            <span>Rescue & Citizen Grid</span>
          </Link>
        </nav>

        {/* RIGHT: Zone Selector, Clock & Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {/* Zone Selector */}
          <div className="relative flex items-center">
            <label htmlFor="zone-selector" className="sr-only">
              Select India flood monitoring zone
            </label>
            <MapPin className="w-3.5 h-3.5 text-indigo-600 absolute left-2.5 pointer-events-none" aria-hidden />
            <select
              id="zone-selector"
              value={selectedZone.id}
              onChange={(e) => {
                const zone = INDIA_FLOOD_ZONES.find((z) => z.id === e.target.value);
                if (zone) onSelectZone(zone);
              }}
              className="bg-white/90 text-slate-900 text-xs font-semibold pl-8 pr-7 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs transition h-[36px] cursor-pointer appearance-none hover:border-indigo-400"
            >
              {INDIA_FLOOD_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} ({zone.district})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" aria-hidden />
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/80 border border-slate-200 text-slate-800 text-xs font-mono font-medium shadow-xs h-[36px]">
            <Clock className="w-3.5 h-3.5 text-indigo-600" aria-hidden />
            <span>{currentTime || "00:00:00 IST"}</span>
          </div>

          {/* Safe Routes Modal trigger */}
          {onOpenSafeRoutesGuidelines && (
            <button
              onClick={onOpenSafeRoutesGuidelines}
              aria-label="Open Verified Safe Evacuation Routes and Survival Guidelines"
              className="btn-solid-emerald h-[36px]"
            >
              <Compass className="w-3.5 h-3.5 text-white" aria-hidden />
              <span className="hidden sm:inline">Safe Routes</span>
            </button>
          )}

          {/* Broadcast Alert */}
          {onOpenRegionalBroadcast && (
            <button
              onClick={onOpenRegionalBroadcast}
              aria-label="Broadcast Regional Alert to all phones in zone"
              className="btn-solid-danger h-[36px]"
            >
              <Radio className="w-3.5 h-3.5" aria-hidden />
              <span>Broadcast</span>
            </button>
          )}

          {/* Android Bridge */}
          <button
            onClick={onOpenMobileModal}
            aria-label="Pair with Android app over local Wi-Fi"
            className="btn-solid-dark h-[36px]"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-300" aria-hidden />
            <span className="hidden sm:inline">Mobile APK</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? "Mute audio alerts" : "Enable audio alerts"}
            className="h-[36px] w-[36px] rounded-lg bg-white/80 hover:bg-white text-slate-700 border border-slate-300 flex items-center justify-center shadow-xs transition active:scale-95"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-indigo-600" aria-hidden />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" aria-hidden />
            )}
          </button>

          {/* Test SOS Spike */}
          {onSimulateSOS && (
            <button
              onClick={onSimulateSOS}
              aria-label="Simulate inundation spike for testing"
              className="h-[36px] px-2 rounded-lg bg-white hover:bg-rose-50 text-red-700 text-xs font-semibold border border-rose-300 shadow-xs flex items-center gap-1 transition active:scale-95"
            >
              <Radio className="w-3 h-3 text-red-600" aria-hidden />
              <span>Test SOS</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
