"use client";

import React from "react";
import Link from "next/link";
import { HazardZone } from "@/lib/types";
import { Mountain, Compass, Users, ArrowRight } from "lucide-react";

import { EnvironmentalTelemetry } from "@/lib/aiEngine";

interface TelemetryStripProps {
  activeZone: HazardZone;
  riskPercent: number;
  liveTelemetry?: EnvironmentalTelemetry | null;
  isLiveInternet?: boolean;
}

export default function TelemetryStrip({ activeZone, riskPercent, liveTelemetry, isLiveInternet = true }: TelemetryStripProps) {
  const telemetry = liveTelemetry || activeZone.telemetry || {
    rainfall_mm: 0.0,
    soil_moisture_pct: 45.0,
    slope_deg: 15.0,
    river_level_m: 1.5,
    seismic_mag: 0.0,
  };

  const isSeismicActive = telemetry.seismic_mag >= 3.0;

  return (
    <div className="w-full bg-transparent px-4 sm:px-6 lg:px-8 py-2.5 text-slate-800 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-[1800px] mx-auto">

        {/* 1. Live Flood Radar Map Navigation Card */}
        <Link
          href="/radar"
          className="glass-card rounded-2xl p-3 sm:px-4 sm:py-3 transition flex items-center justify-between group hover:scale-[1.01] min-h-[72px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-[#f8fafc] flex items-center justify-center group-hover:bg-slate-700 transition shrink-0 shadow-xs border border-slate-700">
              <Compass className="w-5 h-5 text-[#f8fafc]" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <span>Live Flood Radar Map</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 live-dot-green shrink-0" />
                  <span>LIVE GIS</span>
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium line-clamp-1">
                Satellite imagery, real river heights &amp; evacuation shelters
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-1 transition shrink-0 ml-2" />
        </Link>

        {/* 2. Citizen Rescue & SOS Hub Navigation Card */}
        <Link
          href="/rescue"
          className="glass-card rounded-2xl p-3 sm:px-4 sm:py-3 transition flex items-center justify-between group hover:scale-[1.01] min-h-[72px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-[#f8fafc] flex items-center justify-center group-hover:bg-slate-700 transition shrink-0 shadow-xs border border-slate-700">
              <Users className="w-5 h-5 text-[#f8fafc]" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <span>Citizen Rescue Hub</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 border border-red-500/20 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 live-dot-red shrink-0" />
                  <span>LIVE SOS</span>
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium line-clamp-1">
                Live mobile distress beacons &amp; emergency responder teams
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-1 transition shrink-0 ml-2" />
        </Link>

        {/* 3. Mountain Slope & Ground Stability */}
        <div className="glass-card rounded-2xl p-3 sm:px-4 sm:py-3 transition flex items-center justify-between min-h-[72px]">
          <div className="flex-1 mr-2 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                🏔️ Slope &amp; Ground
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isSeismicActive
                    ? "bg-red-500/10 text-red-700 border border-red-500/20"
                    : telemetry.soil_moisture_pct >= 75
                    ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                }`}
              >
                {isSeismicActive
                  ? "Seismic Shock"
                  : telemetry.soil_moisture_pct >= 75
                  ? "Saturated Soil"
                  : "Stable Ground"}
              </span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-slate-800 flex items-baseline gap-2">
              <span>{telemetry.slope_deg.toFixed(1)}°</span>
              <span className="text-[11px] font-medium text-slate-500 font-sans">
                Incline &bull; <span className="font-mono font-bold text-slate-700">{telemetry.soil_moisture_pct.toFixed(0)}%</span> Moisture
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
              {isSeismicActive
                ? `Tremor: Mag ${telemetry.seismic_mag.toFixed(1)} recorded via USGS`
                : telemetry.soil_moisture_pct >= 75
                ? "High soil water saturation increases mudslide risk"
                : "Geological stability normal &bull; Zero tremors"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Mountain className={`w-5 h-5 ${isSeismicActive ? "text-red-600 animate-pulse" : "text-slate-700"}`} />
          </div>
        </div>

      </div>
    </div>
  );
}
