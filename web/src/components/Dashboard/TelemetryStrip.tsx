"use client";

import React from "react";
import { HazardZone } from "@/lib/types";
import { Waves, CloudRain, Mountain, Activity, Clock, Gauge } from "lucide-react";

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

  const isRainHeavy = telemetry.rainfall_mm >= 15;
  const isRainModerate = telemetry.rainfall_mm >= 5 && telemetry.rainfall_mm < 15;

  const riverRatio = Math.min(100, Math.round((telemetry.river_level_m / activeZone.dangerMarkM) * 100));
  const isRiverCritical = telemetry.river_level_m >= activeZone.dangerMarkM * 0.85;

  const isSeismicActive = telemetry.seismic_mag >= 3.0;

  return (
    <div className="w-full bg-transparent px-4 sm:px-6 lg:px-8 py-3 text-white font-sans">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[1800px] mx-auto">

        {/* 1. Rainfall Today — Rabto 3D Tilt Card */}
        <div className="tilt-card tilt-card-physics p-5 rounded-2xl bg-[#1b2027]/85 backdrop-blur-xl border border-white/10 hover:border-white/30 shadow-2xl transition-all duration-300 flex items-center justify-between group">
          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                🌧️ Rainfall Right Now
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                  isRainHeavy
                    ? "bg-red-500/20 text-red-300 border-red-500/30 animate-pulse"
                    : isRainModerate
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                }`}
              >
                {isRainHeavy ? "Heavy Rain" : isRainModerate ? "Moderate Rain" : "Light / Clear"}
              </span>
            </div>
            <div className="text-3xl font-black text-white flex items-baseline gap-1.5 font-display tracking-tight">
              {telemetry.rainfall_mm.toFixed(1)}
              <span className="text-xs font-normal text-white/50">mm/hour</span>
            </div>
            <p className="text-xs text-white/70 font-medium">
              {isRainHeavy
                ? "Heavy rain detected over catchment hills"
                : isRainModerate
                ? "Moderate continuous showers recorded"
                : telemetry.rainfall_mm > 0
                ? `${telemetry.rainfall_mm.toFixed(1)} mm/hr light rain recorded via satellite`
                : "0.0 mm/hr • Clear skies recorded over this location"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-white/10 transition-all shadow-inner relative z-10">
            <CloudRain className={`w-6 h-6 ${isRainHeavy ? "text-red-400 animate-pulse" : "text-white/80"}`} />
          </div>
        </div>

        {/* 2. River Water Level — Rabto 3D Tilt Card */}
        <div className="tilt-card tilt-card-physics p-5 rounded-2xl bg-[#1b2027]/85 backdrop-blur-xl border border-white/10 hover:border-white/30 shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                  🌊 River Water Level
                </span>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                    isRiverCritical
                      ? "bg-red-500/20 text-red-300 border-red-500/30 animate-pulse"
                      : riverRatio >= 50
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  {isRiverCritical ? "Near Danger Mark" : riverRatio >= 50 ? "Moderate Flow" : "Normal Safe Flow"}
                </span>
              </div>
              <div className="text-3xl font-black text-white flex items-baseline gap-1.5 font-display tracking-tight">
                {telemetry.river_level_m.toFixed(1)}m
                <span className="text-xs font-normal text-white/50">
                  / Danger at {activeZone.dangerMarkM}m
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-white/10 transition-all shadow-inner">
              <Waves className={`w-6 h-6 ${isRiverCritical ? "text-red-400 animate-pulse" : "text-white/80"}`} />
            </div>
          </div>

          {/* River Level Progress Meter */}
          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-white/60">Basin Depth Capacity</span>
              <span className={isRiverCritical ? "text-red-400 font-extrabold animate-pulse" : "text-white font-bold"}>
                {riverRatio}% of Flood Line
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 border border-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isRiverCritical
                    ? "bg-red-500 shadow-sm shadow-red-500/50"
                    : riverRatio >= 50
                    ? "bg-amber-400 shadow-sm shadow-amber-400/50"
                    : "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                }`}
                style={{ width: `${Math.min(100, Math.max(8, riverRatio))}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. Mountain Slope & Ground Stability — Rabto 3D Tilt Card */}
        <div className="tilt-card tilt-card-physics p-5 rounded-2xl bg-[#1b2027]/85 backdrop-blur-xl border border-white/10 hover:border-white/30 shadow-2xl transition-all duration-300 flex items-center justify-between group">
          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                🏔️ Hill Slope & Ground
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                  isSeismicActive
                    ? "bg-red-500/20 text-red-300 border-red-500/30 animate-pulse"
                    : telemetry.soil_moisture_pct >= 75
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                }`}
              >
                {isSeismicActive
                  ? "Seismic Shock"
                  : telemetry.soil_moisture_pct >= 75
                  ? "Saturated Soil"
                  : "Stable Ground"}
              </span>
            </div>
            <div className="text-3xl font-black text-white flex items-baseline gap-1.5 font-display tracking-tight">
              {telemetry.slope_deg.toFixed(1)}°
              <span className="text-xs font-normal text-white/50">
                Incline • {telemetry.soil_moisture_pct.toFixed(0)}% Moisture
              </span>
            </div>
            <p className="text-xs text-white/70 font-medium">
              {isSeismicActive
                ? `Tremor detected: Mag ${telemetry.seismic_mag.toFixed(1)} recorded via USGS`
                : telemetry.soil_moisture_pct >= 75
                ? "High water saturation increases mudslide risk"
                : "Geological stability normal • Zero active tremors detected"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-white/10 transition-all shadow-inner relative z-10">
            <Mountain className={`w-6 h-6 ${isSeismicActive ? "text-red-400 animate-pulse" : "text-white/80"}`} />
          </div>
        </div>

      </div>
    </div>
  );
}
