"use client";

import React, { useState, useEffect } from "react";
import { HazardZone, ZoneId } from "@/lib/types";
import { HIMALAYAN_ZONES } from "@/lib/constants";
import { Language, translations } from "@/lib/i18n";
import {
  ShieldAlert,
  Activity,
  MapPin,
  Radio,
  Clock,
  Sparkles,
  Zap,
  Globe,
  Smartphone,
} from "lucide-react";

interface HeaderProps {
  selectedZone: HazardZone;
  onSelectZone: (zone: HazardZone) => void;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onSimulateSOS: () => void;
  onOpenMobileModal: () => void;
  floodRiskPercent: number;
  language: Language;
  onToggleLanguage: () => void;
}

export default function Header({
  selectedZone,
  onSelectZone,
  isDemoMode,
  onToggleDemoMode,
  onSimulateSOS,
  onOpenMobileModal,
  floodRiskPercent,
  language,
  onToggleLanguage,
}: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const t = translations[language];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
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
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-50 px-4 lg:px-6 py-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-rose-600 to-amber-600 flex items-center justify-center shadow-lg shadow-rose-950/50 ring-2 ring-rose-400/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                {t.appTitle}
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {t.commandCenter}
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Center: Zero-Minute Protocol Status & Live Clock */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Zero-Minute Protocol Banner */}
          {isZeroMinuteActive ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500 text-rose-300 text-xs font-bold animate-pulse shadow-lg">
              <Zap className="w-4 h-4 text-rose-400 fill-rose-400" />
              <span>
                {language === "hi"
                  ? "आपातकालीन चेतावनी सक्रिय (ZERO-MINUTE ALERT)"
                  : "ZERO-MINUTE PROTOCOL: ACTIVE (AUTONOMOUS ALERT)"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {language === "hi"
                  ? "सामान्य निगरानी चालू"
                  : "Standard Monitoring Protocol"}
              </span>
            </div>
          )}

          {/* Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime || "00:00:00 IST"}</span>
          </div>
        </div>

        {/* Right: Android Bridge, Language Switcher, Zone Switcher & Demo Simulation Trigger */}
        <div className="flex items-center gap-2">
          {/* Android Mobile Connect Button */}
          <button
            onClick={onOpenMobileModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition min-h-[44px] shadow-sm"
            title="Pair with Teammate's Android App"
          >
            <Smartphone className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Android Connect</span>
          </button>

          {/* Big Bilingual Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold transition min-h-[44px]"
            title="Toggle between English and Hindi"
          >
            <Globe className="w-4 h-4 text-amber-400" />
            <span>{t.languageToggle}</span>
          </button>

          {/* Zone Selector */}
          <div className="relative flex items-center">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={selectedZone.id}
              onChange={(e) => {
                const zone = HIMALAYAN_ZONES.find(
                  (z) => z.id === e.target.value
                );
                if (zone) onSelectZone(zone);
              }}
              className="bg-slate-900 hover:bg-slate-850 text-slate-100 text-xs font-medium pl-9 pr-8 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 transition min-h-[44px] cursor-pointer"
            >
              {HIMALAYAN_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          {/* Demo / Live Toggle */}
          <button
            onClick={onToggleDemoMode}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition min-h-[44px] flex items-center gap-1.5 ${
              isDemoMode
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isDemoMode ? "Demo Mode" : "Live Backend"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}