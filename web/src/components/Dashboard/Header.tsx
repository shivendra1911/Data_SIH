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
} from "lucide-react";

interface HeaderProps {
  selectedZone: HazardZone;
  onSelectZone: (zone: HazardZone) => void;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onSimulateSOS: () => void;
  onOpenMobileModal: () => void;
  onOpenRegionalBroadcast?: () => void;
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
    <header className="border-b border-gray-200 bg-white/95 backdrop-blur-xl sticky top-0 z-50 px-4 lg:px-8 py-3 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 max-w-[1800px] mx-auto w-full">

        {/* LEFT: Brand */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-700 via-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-200 ring-2 ring-violet-200">
              <ShieldAlert className="w-6 h-6 text-white" aria-hidden />
            </div>
            {isZeroMinuteActive && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full animate-ping" aria-hidden />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Neer<span className="text-violet-700">Netra</span>
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 tracking-widest">
                v2.4
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-lg bg-gray-50 text-gray-500 border border-gray-200">
                <Satellite className="w-3 h-3 text-emerald-500" aria-hidden />
                INSAT-3DR
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium tracking-tight">
              India Flash Flood & GLOF Early Warning Platform — AI-Powered • SIH 2026 PS: SIH26192
            </p>
          </div>
        </div>

        {/* CENTER: Status */}
        <div className="flex items-center gap-2.5">
          {isZeroMinuteActive ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-pulse">
              <Zap className="w-3.5 h-3.5 fill-red-600 text-red-600" aria-hidden />
              <span>ZERO-MINUTE PROTOCOL ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5" aria-hidden />
              <span>All Systems Normal</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-violet-500" aria-hidden />
            <span>{currentTime || "00:00:00 IST"}</span>
          </div>
        </div>

        {/* RIGHT: Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Broadcast Alert */}
          <button
            onClick={onOpenRegionalBroadcast}
            aria-label="Broadcast Regional Alert to all phones in zone"
            className={`btn-danger flex items-center gap-2 text-xs ${
              !isZeroMinuteActive && "opacity-75 hover:opacity-100"
            }`}
          >
            <Radio className="w-3.5 h-3.5" aria-hidden />
            <span>Broadcast Alert</span>
          </button>

          {/* Android Bridge */}
          <button
            onClick={onOpenMobileModal}
            aria-label="Pair with Android app over local Wi-Fi"
            className="btn-ghost text-xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-violet-600" aria-hidden />
            <span>Android Bridge</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? "Mute audio alerts" : "Enable audio alerts"}
            className="btn-ghost text-xs px-2.5"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-violet-600" aria-hidden />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-400" aria-hidden />
            )}
          </button>

          {/* Zone Selector */}
          <div className="relative flex items-center">
            <label htmlFor="zone-selector" className="sr-only">
              Select India flood monitoring zone
            </label>
            <MapPin className="w-3.5 h-3.5 text-violet-600 absolute left-3 pointer-events-none" aria-hidden />
            <select
              id="zone-selector"
              value={selectedZone.id}
              onChange={(e) => {
                const zone = INDIA_FLOOD_ZONES.find((z) => z.id === e.target.value);
                if (zone) onSelectZone(zone);
              }}
              className="bg-white text-gray-800 text-xs font-semibold pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 transition min-h-[44px] cursor-pointer appearance-none hover:border-violet-300"
            >
              {INDIA_FLOOD_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} — {zone.district}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 pointer-events-none" aria-hidden />
          </div>

          {/* Test SOS Spike */}
          <button
            onClick={onSimulateSOS}
            aria-label="Simulate inundation spike for testing"
            className="btn-ghost text-xs text-red-600 border-red-200 hover:bg-red-50"
          >
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" aria-hidden />
            <span>Test Spike</span>
          </button>
        </div>
      </div>
    </header>
  );
}