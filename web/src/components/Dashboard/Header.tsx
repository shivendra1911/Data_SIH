"use client";

import React, { useState, useEffect } from "react";
import { HazardZone } from "@/lib/types";
import { HIMALAYAN_ZONES } from "@/lib/constants";
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
  isDemoMode,
  onToggleDemoMode,
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
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " IST"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const isZeroMinuteActive = floodRiskPercent >= 75;

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl sticky top-0 z-50 px-4 lg:px-8 py-3 shadow-2xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-[1750px] mx-auto w-full">
        {/* Left: Brand Identity & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-950/60 ring-2 ring-cyan-400/30">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            {isZeroMinuteActive && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full animate-ping"></span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black tracking-wider text-white font-mono flex items-center gap-2">
                NEER<span className="text-cyan-400">NETRA</span>
              </h1>
              <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 tracking-widest">
                v2.4 TAC-OPS
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                <Satellite className="w-3 h-3 text-emerald-400" />
                INSAT-3DR SYNC
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-tight">
              Himalayan Flash Flood & Cryo-Seismic GLOF Early Warning Platform • Alaknanda Basin
            </p>
          </div>
        </div>

        {/* Center: Zero-Minute Protocol Status & Live System Clock */}
        <div className="flex items-center gap-3">
          {/* Zero-Minute Protocol Status Badge */}
          {isZeroMinuteActive ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs font-mono font-bold shadow-lg shadow-rose-950/50 animate-pulse">
              <Zap className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span>ZERO-MINUTE PROTOCOL: ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-emerald-400 text-xs font-mono font-semibold">
              <Activity className="w-3.5 h-3.5" />
              <span>SURVEILLANCE NORMAL</span>
            </div>
          )}

          {/* System Clock */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-slate-300 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentTime || "00:00:00 IST"}</span>
          </div>
        </div>

        {/* Right: Controls, Android Bridge, Zone Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Regional Mobile Alert Broadcast Trigger Button */}
          <button
            onClick={onOpenRegionalBroadcast}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition min-h-[44px] shadow-lg ${
              isZeroMinuteActive
                ? "bg-rose-600 hover:bg-rose-500 active:scale-95 text-white border border-rose-400 animate-pulse shadow-rose-950/60"
                : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
            }`}
            title="Dispatch Geo-Fenced Push Broadcast to All Citizen Phones in Zone"
          >
            <Radio className="w-4 h-4 text-rose-400" />
            <span>Broadcast Regional Alert</span>
          </button>

          {/* Android Mobile Connect Button */}
          <button
            onClick={onOpenMobileModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 active:scale-95 text-sky-300 border border-sky-500/40 text-xs font-bold transition min-h-[44px] shadow-sm"
            title="Pair with Teammate's Android App (Local Wi-Fi Bridge)"
          >
            <Smartphone className="w-4 h-4 text-sky-400" />
            <span>Android Bridge</span>
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={onToggleSound}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={soundEnabled ? "Mute Audio Alerts" : "Enable Audio Alerts"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Sector / Zone Selector */}
          <div className="relative flex items-center">
            <label htmlFor="sector-zone-selector" className="sr-only">
              Select Himalayan Monitoring Catchment Sector
            </label>
            <MapPin className="w-4 h-4 text-cyan-400 absolute left-3 pointer-events-none" />
            <select
              id="sector-zone-selector"
              name="sector_zone"
              aria-label="Select Himalayan Monitoring Catchment Sector"
              value={selectedZone.id}
              onChange={(e) => {
                const zone = HIMALAYAN_ZONES.find((z) => z.id === e.target.value);
                if (zone) onSelectZone(zone);
              }}
              className="bg-slate-900 hover:bg-slate-850 text-slate-100 text-xs font-semibold pl-9 pr-7 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition min-h-[44px] cursor-pointer"
            >
              {HIMALAYAN_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} ({zone.district})
                </option>
              ))}
            </select>
          </div>

          {/* Simulation Trigger Button */}
          <button
            onClick={onSimulateSOS}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold transition min-h-[44px]"
            title="Simulate Inundation Spike & Beacon"
          >
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Test Inundation Spike</span>
          </button>
        </div>
      </div>
    </header>
  );
}