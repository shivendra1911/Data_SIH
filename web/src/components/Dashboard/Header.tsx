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
    <header className="bg-slate-950/40 border-b border-white/15 sticky top-0 z-50 px-3 sm:px-5 lg:px-6 py-2 shadow-lg backdrop-blur-md text-white">
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
                <Link href="/" className="text-sm font-black tracking-tight text-white hover:opacity-90 transition" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Neer<span className="text-violet-400">Netra</span>
                </Link>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-violet-500/25 text-violet-200 border border-violet-400/40">
                  v2.4
                </span>
                <button
                  onClick={onOpenMobileModal}
                  title="Click to view Android APK pairing status and endpoints"
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30 transition"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>APK Sync: 172.16.184.105:3000</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile IST Clock (Compact) */}
          <div className="sm:hidden flex items-center gap-1 text-[11px] font-mono text-slate-200 bg-white/10 px-2 py-1 rounded-md border border-white/20">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>{currentTime || "00:00 IST"}</span>
          </div>
        </div>

        {/* CENTER: 3-Page Navigation Tabs */}
        <nav aria-label="Command Center Navigation" className="flex items-center justify-center gap-1 p-1 rounded-xl bg-white/10 border border-white/20 text-xs font-semibold shadow-md backdrop-blur-md">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              pathname === "/"
                ? "bg-white text-slate-950 shadow-md font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Satellite className={`w-3.5 h-3.5 ${pathname === "/" ? "text-indigo-600" : "text-slate-300"}`} />
            <span>National Sentinel</span>
          </Link>

          <Link
            href="/radar"
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              pathname === "/radar"
                ? "bg-white text-slate-950 shadow-md font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Compass className={`w-3.5 h-3.5 ${pathname === "/radar" ? "text-emerald-600" : "text-slate-300"}`} />
            <span>Tactical Radar</span>
          </Link>

          <Link
            href="/rescue"
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              pathname === "/rescue"
                ? "bg-white text-slate-950 shadow-md font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${pathname === "/rescue" ? "text-rose-600" : "text-slate-300"}`} />
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
            <MapPin className="w-3.5 h-3.5 text-violet-400 absolute left-2.5 pointer-events-none" aria-hidden />
            <select
              id="zone-selector"
              value={selectedZone.id}
              onChange={(e) => {
                const zone = INDIA_FLOOD_ZONES.find((z) => z.id === e.target.value);
                if (zone) onSelectZone(zone);
              }}
              className="bg-slate-900/90 text-white text-xs font-semibold pl-8 pr-7 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:ring-1 focus:ring-violet-400 shadow-xs transition h-[36px] cursor-pointer appearance-none hover:border-white/40"
            >
              {INDIA_FLOOD_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id} className="bg-slate-900 text-white">
                  {zone.name} ({zone.district})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" aria-hidden />
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/10 border border-white/20 text-slate-200 text-xs font-mono font-medium shadow-xs h-[36px]">
            <Clock className="w-3.5 h-3.5 text-violet-400" aria-hidden />
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
