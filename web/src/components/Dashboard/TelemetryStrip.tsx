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
    <div className="w-full bg-transparent px-4 sm:px-6 lg:px-8 py-3 text-slate-900 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[1800px] mx-auto">

        {/* 1. Rainfall Today */}
        <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 hover:border-white transition flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                🌧️ Rainfall Right Now
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isRainHeavy
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : isRainModerate
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {isRainHeavy ? "Heavy Rain" : isRainModerate ? "Moderate Rain" : "Light / Clear"}
              </span>
            </div>
            <div className="text-2xl font-black text-slate-950 flex items-baseline gap-1.5 font-display">
              {telemetry.rainfall_mm.toFixed(1)}
              <span className="text-xs font-normal text-slate-500">mm/hour</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {isRainHeavy
                ? "Heavy rain detected over catchment hills"
                : isRainModerate
                ? "Moderate continuous showers recorded"
                : telemetry.rainfall_mm > 0
                ? `${telemetry.rainfall_mm.toFixed(1)} mm/hr light rain recorded via satellite`
                : "0.0 mm/hr • Clear skies recorded over this location"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#faf9f5] border border-slate-200 flex items-center justify-center shrink-0">
            <CloudRain className={`w-6 h-6 ${isRainHeavy ? "text-red-600 animate-pulse" : "text-slate-700"}`} />
          </div>
        </div>

        {/* 2. River Water Level */}
        <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 hover:border-white transition flex flex-col justify-between shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  🌊 River Water Level
                </span>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isRiverCritical
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : riverRatio >= 50
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {isRiverCritical ? "Near Danger Mark" : riverRatio >= 50 ? "Moderate Flow" : "Normal Safe Flow"}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-950 flex items-baseline gap-1.5 font-display">
                {telemetry.river_level_m.toFixed(1)}m
                <span className="text-xs font-normal text-slate-500">
                  / Danger at {activeZone.dangerMarkM}m
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#faf9f5] border border-slate-200 flex items-center justify-center shrink-0">
              <Waves className={`w-6 h-6 ${isRiverCritical ? "text-red-600 animate-pulse" : "text-slate-700"}`} />
            </div>
          </div>

          {/* Simple River Level Progress Meter */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Basin Depth Capacity</span>
              <span className={isRiverCritical ? "text-red-700 font-extrabold" : "text-slate-900"}>
                {riverRatio}% of Flood Line
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isRiverCritical ? "bg-red-500" : riverRatio >= 50 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(8, riverRatio))}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. Mountain Slope & Ground Stability */}
        <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 hover:border-white transition flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                🏔️ Hill Slope & Ground
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isSeismicActive
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : telemetry.soil_moisture_pct >= 75
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {isSeismicActive
                  ? "Seismic Shock"
                  : telemetry.soil_moisture_pct >= 75
                  ? "Saturated Soil"
                  : "Stable Ground"}
              </span>
            </div>
            <div className="text-2xl font-black text-slate-950 flex items-baseline gap-1.5 font-display">
              {telemetry.slope_deg.toFixed(1)}°
              <span className="text-xs font-normal text-slate-500">
                Incline • {telemetry.soil_moisture_pct.toFixed(0)}% Moisture
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {isSeismicActive
                ? `Tremor detected: Mag ${telemetry.seismic_mag.toFixed(1)} recorded via USGS`
                : telemetry.soil_moisture_pct >= 75
                ? "High water saturation increases mudslide risk"
                : "Geological stability normal • Zero active tremors detected"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#faf9f5] border border-slate-200 flex items-center justify-center shrink-0">
            <Mountain className={`w-6 h-6 ${isSeismicActive ? "text-red-600 animate-pulse" : "text-slate-700"}`} />
          </div>
        </div>

      </div>
    </div>
  );
}
