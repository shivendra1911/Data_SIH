"use client";

import React, { useState, useEffect } from "react";
import { HazardZone } from "@/lib/types";
import { INDIA_FLOOD_ZONES } from "@/lib/constants";
import {
  ShieldAlert,
  Activity,
  MapPin,
  Radio,
  Clock,
  Zap,
  Smartphone,
  Satellite,
  Volume2,
  VolumeX,
  ChevronDown,
  Compass,
} from "lucide-react";

interface HeaderProps {
  selectedZone: HazardZone;
  onSelectZone: (zone: HazardZone) => void;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onSimulateSOS: () => void;
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
    <header className="glass-panel border-b border-white/60 sticky top-0 z-50 px-4 lg:px-8 py-3 shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 max-w-[1800px] mx-auto w-full">

        {/* LEFT: Brand */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-700 via-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 ring-2 ring-white/60">
              <ShieldAlert className="w-6 h-6 text-white" aria-hidden />
            </div>
            {isZeroMinuteActive && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full animate-ping" aria-hidden />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-950" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Neer<span className="text-violet-700">Netra</span>
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-300 tracking-widest">
                v2.4
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-white/80 text-slate-700 border border-slate-200 shadow-sm">
                <Satellite className="w-3 h-3 text-emerald-600" aria-hidden />
                INSAT-3DR
              </span>
            </div>
            <p className="text-xs text-slate-700 font-semibold tracking-tight">
              India Flash Flood & GLOF Early Warning Platform — AI-Powered • SIH 2026 PS: SIH26192
            </p>
          </div>
        </div>

        {/* CENTER: Status */}
        <div className="flex items-center gap-2.5">
          {isZeroMinuteActive ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-100/90 border border-red-300 text-red-800 text-xs font-black animate-pulse shadow-sm">
              <Zap className="w-3.5 h-3.5 fill-red-600 text-red-600" aria-hidden />
              <span>ZERO-MINUTE PROTOCOL ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-sm">
              <Activity className="w-3.5 h-3.5" aria-hidden />
              <span>All Systems Normal</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-white/80 text-slate-800 text-xs font-mono font-bold shadow-sm">
            <Clock className="w-3.5 h-3.5 text-violet-600" aria-hidden />
            <span>{currentTime || "00:00:00 IST"}</span>
          </div>
        </div>

        {/* RIGHT: Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Solid Safe Routes & Guidelines */}
          {onOpenSafeRoutesGuidelines && (
            <button
              onClick={onOpenSafeRoutesGuidelines}
              aria-label="Open Verified Safe Evacuation Routes and Survival Guidelines"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold border border-emerald-400 shadow-sm text-xs min-h-[44px] flex items-center gap-1.5 transition active:scale-[0.98]"
            >
              <Compass className="w-3.5 h-3.5 text-white" aria-hidden />
              <span>Safe Routes & Guide</span>
            </button>
          )}

          {/* Solid Broadcast Alert */}
          <button
            onClick={onOpenRegionalBroadcast}
            aria-label="Broadcast Regional Alert to all phones in zone"
            className="btn-solid-danger flex items-center gap-2 text-xs shadow-md"
          >
            <Radio className="w-3.5 h-3.5" aria-hidden />
            <span>Broadcast Alert</span>
          </button>

          {/* Solid Android Bridge */}
          <button
            onClick={onOpenMobileModal}
            aria-label="Pair with Android app over local Wi-Fi"
            className="btn-solid-dark flex items-center gap-2 text-xs shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5 text-violet-300" aria-hidden />
            <span>Android Bridge</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? "Mute audio alerts" : "Enable audio alerts"}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/80 hover:bg-white text-slate-800 border border-slate-300 flex items-center justify-center shadow-sm transition active:scale-95"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-violet-700" aria-hidden />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" aria-hidden />
            )}
          </button>

          {/* Zone Selector */}
          <div className="relative flex items-center">
            <label htmlFor="zone-selector" className="sr-only">
              Select India flood monitoring zone
            </label>
            <MapPin className="w-3.5 h-3.5 text-violet-700 absolute left-3 pointer-events-none" aria-hidden />
            <select
              id="zone-selector"
              value={selectedZone.id}
              onChange={(e) => {
                const zone = INDIA_FLOOD_ZONES.find((z) => z.id === e.target.value);
                if (zone) onSelectZone(zone);
              }}
              className="bg-white/90 text-slate-900 text-xs font-bold pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm transition min-h-[44px] cursor-pointer appearance-none hover:border-violet-400"
            >
              {INDIA_FLOOD_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} — {zone.district}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 pointer-events-none" aria-hidden />
          </div>

          {/* Test SOS Spike */}
          <button
            onClick={onSimulateSOS}
            aria-label="Simulate inundation spike for testing"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-red-700 font-bold border border-rose-300 shadow-sm text-xs min-h-[44px] flex items-center gap-2 transition active:scale-[0.98]"
          >
            <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" aria-hidden />
            <span>Test Spike</span>
          </button>
        </div>
      </div>
    </header>
  );
}