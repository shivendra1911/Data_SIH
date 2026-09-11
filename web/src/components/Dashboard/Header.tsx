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
    <header className="bg-[#161a20]/90 border-b border-white/10 sticky top-0 z-50 px-3 sm:px-5 lg:px-6 py-2.5 shadow-xl backdrop-blur-md text-white font-sans">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 max-w-[1800px] mx-auto w-full">

        {/* LEFT: Brand & Live Mobile Sync Indicator */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-xs">
                <ShieldAlert className="w-4 h-4 text-white" aria-hidden />
              </div>
              {isZeroMinuteActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" aria-hidden />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Link href="/" className="text-sm font-bold tracking-tight text-white hover:opacity-90 transition font-display uppercase">
                  Neer<span className="text-white/80">Netra</span>
                </Link>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15 tracking-wider">
                  v2.4
                </span>
                <button
                  onClick={onOpenMobileModal}
                  title="Click to view Android APK pairing status and endpoints"
                  className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/25 transition tracking-wider uppercase"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>APK Sync: 172.16.184.105:3000</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile IST Clock (Compact) */}
          <div className="sm:hidden flex items-center gap-1 text-[11px] font-mono text-white/80 bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            <Clock className="w-3 h-3 text-white/70" />
            <span>{currentTime || "00:00 IST"}</span>
          </div>
        </div>

        {/* CENTER: 3-Page Navigation Tabs (Corwdy Capsule Pill Tabs) */}
        <nav aria-label="Command Center Navigation" className="flex items-center justify-center gap-1.5 p-1 rounded-full bg-white/5 border border-white/15 text-xs font-semibold shadow-inner backdrop-blur-md">
          <Link
            href="/"
            className={`px-4 py-1.5 rounded-full transition flex items-center gap-2 uppercase tracking-[1.5px] text-[10px] font-bold ${
              pathname === "/"
                ? "bg-white text-[#161a20] shadow-md"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Satellite className={`w-3.5 h-3.5 ${pathname === "/" ? "text-[#161a20]" : "text-white/70"}`} />
            <span>National Sentinel</span>
          </Link>

          <Link
            href="/radar"
            className={`px-4 py-1.5 rounded-full transition flex items-center gap-2 uppercase tracking-[1.5px] text-[10px] font-bold ${
              pathname === "/radar"
                ? "bg-white text-[#161a20] shadow-md"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Compass className={`w-3.5 h-3.5 ${pathname === "/radar" ? "text-[#161a20]" : "text-white/70"}`} />
            <span>Tactical Radar</span>
          </Link>

          <Link
            href="/rescue"
            className={`px-4 py-1.5 rounded-full transition flex items-center gap-2 uppercase tracking-[1.5px] text-[10px] font-bold ${
              pathname === "/rescue"
                ? "bg-white text-[#161a20] shadow-md"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${pathname === "/rescue" ? "text-[#161a20]" : "text-white/70"}`} />
            <span>Rescue &amp; Citizen Grid</span>
          </Link>
        </nav>

        {/* RIGHT: Zone Selector, Clock & Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Zone Selector */}
          <div className="relative flex items-center">
            <label htmlFor="zone-selector" className="sr-only">
              Select India flood monitoring zone
            </label>
            <MapPin className="w-3.5 h-3.5 text-white/70 absolute left-3 pointer-events-none" aria-hidden />
            <select
              id="zone-selector"
              value={selectedZone.id}
              onChange={(e) => {
                const zone = INDIA_FLOOD_ZONES.find((z) => z.id === e.target.value);
                if (zone) onSelectZone(zone);
              }}
              className="bg-[#1b2027] text-white text-xs font-semibold pl-8 pr-8 py-1.5 rounded-full border border-white/15 focus:outline-none focus:ring-1 focus:ring-white/40 shadow-xs transition h-[36px] cursor-pointer appearance-none hover:border-white/30"
            >
              {INDIA_FLOOD_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id} className="bg-[#1b2027] text-white">
                  {zone.name} ({zone.district})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-white/50 absolute right-3 pointer-events-none" aria-hidden />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-white/80 text-xs font-mono font-medium shadow-xs h-[36px]">
            <Clock className="w-3.5 h-3.5 text-white/60" aria-hidden />
            <span>{currentTime || "00:00:00 IST"}</span>
          </div>

          {/* Safe Routes Modal trigger */}
          {onOpenSafeRoutesGuidelines && (
            <button
              onClick={onOpenSafeRoutesGuidelines}
              aria-label="Open Verified Safe Evacuation Routes and Survival Guidelines"
              className="btn-solid-emerald h-[36px]"
            >
              <Compass className="w-3.5 h-3.5" aria-hidden />
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
            <Smartphone className="w-3.5 h-3.5 text-white/80" aria-hidden />
            <span className="hidden sm:inline">Mobile APK</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? "Mute audio alerts" : "Enable audio alerts"}
            className="circle-btn w-[36px] h-[36px]"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-white" aria-hidden />
            ) : (
              <VolumeX className="w-4 h-4 text-white/50" aria-hidden />
            )}
          </button>

          {/* Test SOS Spike */}
          {onSimulateSOS && (
            <button
              onClick={onSimulateSOS}
              aria-label="Simulate inundation spike for testing"
              className="h-[36px] px-3.5 rounded-full bg-red-500/15 hover:bg-red-600 hover:text-white text-red-300 text-[10px] font-bold uppercase tracking-[2px] border border-red-500/40 shadow-xs flex items-center gap-1.5 transition active:scale-95"
            >
              <Radio className="w-3 h-3 text-red-400" aria-hidden />
              <span>Test SOS</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
