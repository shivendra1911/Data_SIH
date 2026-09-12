"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HazardZone } from "@/lib/types";
import { INDIA_FLOOD_ZONES } from "@/lib/constants";
import {
  ShieldAlert,
  MapPin,
  Radio,
  Satellite,
  ChevronDown,
  Compass,
  Users,
  BellRing,
  AlertTriangle,
  Volume2,
  VolumeX,
} from "lucide-react";

interface HeaderProps {
  selectedZone: HazardZone;
  onSelectZone: (zone: HazardZone) => void;
  onSimulateSOS?: () => void;
  onOpenMobileModal?: () => void;
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
  const router = useRouter();
  const [activeScreenAlert, setActiveScreenAlert] = useState<string | null>(null);

  const isDanger = floodRiskPercent >= 70;
  const isWarning = floodRiskPercent >= 35 && floodRiskPercent < 70;

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 shadow-md text-[#f8fafc]">
      {/* Active Screen Alert Notification */}
      {activeScreenAlert && (
        <div className="bg-[#1e293b] text-[#f8fafc] px-4 py-2 text-xs font-bold flex items-center justify-between border-b border-red-500/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{activeScreenAlert}</span>
          </div>
          <button
            onClick={() => setActiveScreenAlert(null)}
            className="px-2.5 py-1 rounded-lg bg-red-900/80 hover:bg-red-800 text-[#f8fafc] text-[10px] uppercase font-mono tracking-wider transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Command Bar */}
      <div className="px-3 sm:px-6 py-2.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-transparent">
        {/* LEFT: Branding + Basin Selector */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Logo & National Command Title */}
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-2.5 group"
            aria-label="NeerNetra Home - Early Flood Warning"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-800 text-[#f8fafc] flex items-center justify-center font-black text-sm tracking-tight border border-slate-700 shadow-sm transition group-hover:bg-slate-700">
              <ShieldAlert className="w-5 h-5 text-slate-200" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm sm:text-base tracking-tight text-[#f8fafc] leading-tight font-display">
                NEERNETRA
              </span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none mt-0.5">
                Govt of India
              </span>
            </div>
          </Link>

          {/* Basin & Location Selector Dropdown */}
          <div className="relative flex items-center ml-1 sm:ml-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" aria-hidden="true" />
            <select
              id="header-zone-select"
              value={selectedZone.id}
              onChange={(e) => {
                const zone = INDIA_FLOOD_ZONES.find((z) => z.id === e.target.value);
                if (zone) onSelectZone(zone);
              }}
              aria-label="Select river basin"
              className="bg-[#1e293b] text-[#f8fafc] text-xs font-semibold pl-8 pr-8 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-sm cursor-pointer appearance-none hover:border-slate-600 transition min-h-[44px]"
            >
              <optgroup label="All-India River Basins" className="bg-[#0f172a] text-[#f8fafc]">
                {INDIA_FLOOD_ZONES.map((zone) => (
                  <option key={zone.id} value={zone.id} className="bg-[#0f172a] text-[#f8fafc]">
                    {zone.name.split("(")[0].trim()} ({zone.district})
                  </option>
                ))}
              </optgroup>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" aria-hidden="true" />
          </div>

          {/* Color-Coded Risk Badge */}
          <span
            className={`text-[11px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider min-h-[32px] flex items-center ${
              isDanger
                ? "bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse"
                : isWarning
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            {isDanger ? "🚨 High Alert" : isWarning ? "⚠️ Warning" : "✅ Safe"} {floodRiskPercent.toFixed(0)}%
          </span>
        </div>

        {/* CENTER: Screen Navigation Dropdown Box */}
        <div className="relative flex items-center self-center">
          <div className="relative flex items-center bg-[#1e293b] hover:bg-slate-800 border border-slate-700 rounded-xl px-3 py-1 text-xs font-semibold text-[#f8fafc] transition shadow-sm group focus-within:ring-2 focus-within:ring-slate-500 min-h-[44px]">
            {pathname === "/radar" ? (
              <Compass className="w-4 h-4 text-slate-300 shrink-0 mr-2" aria-hidden="true" />
            ) : pathname === "/rescue" ? (
              <Users className="w-4 h-4 text-slate-300 shrink-0 mr-2" aria-hidden="true" />
            ) : (
              <Satellite className="w-4 h-4 text-slate-300 shrink-0 mr-2" aria-hidden="true" />
            )}
            <select
              aria-label="Select screen"
              value={pathname === "/radar" ? "/radar" : pathname === "/rescue" ? "/rescue" : "/"}
              onChange={(e) => {
                router.push(e.target.value);
              }}
              className="bg-transparent text-[#f8fafc] text-xs font-bold uppercase tracking-[1.2px] focus:outline-none cursor-pointer pr-7 appearance-none"
            >
              <option value="/" className="bg-[#0f172a] text-[#f8fafc] font-bold py-1.5">
                Basin Monitor
              </option>
              <option value="/radar" className="bg-[#0f172a] text-[#f8fafc] font-bold py-1.5">
                Live Map
              </option>
              <option value="/rescue" className="bg-[#0f172a] text-[#f8fafc] font-bold py-1.5">
                Citizen SOS
              </option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 pointer-events-none transition group-hover:text-slate-200" aria-hidden="true" />
          </div>
        </div>

        {/* RIGHT: Government Mobile Alert Broadcast, Connected Mobile Devices, and Helpline */}
        <div className="flex items-center gap-2 sm:gap-2.5 self-center flex-wrap sm:flex-nowrap">
          {/* Government Alert Broadcast Button - Primary operational button to send emergency alerts to connected mobile devices */}
          {onOpenRegionalBroadcast && (
            <button
              type="button"
              onClick={onOpenRegionalBroadcast}
              aria-label="Broadcast Emergency Alert Notification to Citizen Mobile App"
              className="h-10 sm:h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-[#f8fafc] font-bold text-xs flex items-center gap-2 shadow-md shadow-red-950/40 border border-red-500/80 transition duration-200 ease-out cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              title="Broadcast Geo-Fenced Push Alert Notification to Connected Citizen Mobile App"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <Radio className="w-3.5 h-3.5 text-[#f8fafc] shrink-0" aria-hidden="true" />
              <span className="font-extrabold tracking-wide uppercase text-[11px] sm:text-xs whitespace-nowrap">
                Broadcast Alert to App
              </span>
            </button>
          )}


          {/* Indian Disaster Helpline */}
          <a
            href="tel:1078"
            aria-label="Call National Disaster Helpline 1078"
            className="h-10 sm:h-11 min-h-[44px] px-3 sm:px-3.5 rounded-xl bg-[#1e293b] hover:bg-slate-800 active:bg-slate-900 text-[#f8fafc] border border-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-sm transition duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 whitespace-nowrap"
            title="NDRF Emergency Helpline: 1078"
          >
            <span>📞 Helpline 1078</span>
          </a>
        </div>
      </div>
    </header>
  );
}
