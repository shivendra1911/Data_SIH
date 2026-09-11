"use client";

import React from "react";
import { HazardZone } from "@/lib/types";
import { Waves, CloudRain, Mountain, Activity, Clock, Gauge } from "lucide-react";

interface TelemetryStripProps {
  activeZone: HazardZone;
  riskPercent: number;
}

export default function TelemetryStrip({ activeZone, riskPercent }: TelemetryStripProps) {
  const isDanger = activeZone.alertColor === "RED" || riskPercent >= 75;
  const isWarning = !isDanger && (activeZone.alertColor === "ORANGE" || riskPercent >= 55);

  const hours = Math.floor(activeZone.leadTimeMinutes / 60);
  const mins = activeZone.leadTimeMinutes % 60;

  const telemetry = activeZone.telemetry || {
    rainfall_mm: 64.2,
    soil_moisture_pct: 92.4,
    slope_deg: 42.0,
    river_level_m: 7.2,
    seismic_mag: 4.2,
  };

  // Tile base classes — Rabto frosted glass architecture
  const tile = "tilt-card flex items-center gap-2.5 p-2.5 rounded-xl backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 shadow-md transition-all text-white text-in-out is-visible";
  const iconBox = (color: string) =>
    `w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative z-10 ${color}`;
  const label = "text-[10px] uppercase tracking-wider text-slate-300 font-bold";
  const value = "text-sm font-black text-white flex items-baseline gap-1.5";

  return (
    <div className="w-full bg-slate-950/25 backdrop-blur-md border-y border-white/15 px-4 lg:px-8 py-2.5 shadow-sm text-white">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 max-w-[1800px] mx-auto text-xs">

        {/* River Stage */}
        <div className={tile}>
          <div className={iconBox("bg-sky-500/20 border border-sky-400/40")}>
            <Waves className="w-4 h-4 text-sky-400" aria-hidden />
          </div>
          <div className="relative z-10">
            <div className={label}>
              River Stage <span className="text-red-400 font-bold">▲ +1.4m/h</span>
            </div>
            <div className={value}>
              {telemetry.river_level_m.toFixed(1)}m
              <span className="text-[10px] text-slate-400 font-normal">/ {activeZone.dangerMarkM}m</span>
            </div>
          </div>
        </div>

        {/* Catchment Rainfall */}
        <div className={tile}>
          <div className={iconBox("bg-blue-500/20 border border-blue-400/40")}>
            <CloudRain className="w-4 h-4 text-blue-400" aria-hidden />
          </div>
          <div className="relative z-10">
            <div className={label}>Catchment Rain</div>
            <div className={value}>
              {telemetry.rainfall_mm.toFixed(1)}
              <span className="text-[10px] text-gray-400 font-normal">mm/h</span>
              <span className="text-[9px] text-amber-700 font-bold px-1 rounded bg-amber-50 border border-amber-200">HEAVY</span>
            </div>
          </div>
        </div>

        {/* Soil Saturation */}
        <div className={tile}>
          <div className={iconBox("bg-emerald-500/20 border border-emerald-400/40")}>
            <Mountain className="w-4 h-4 text-emerald-400" aria-hidden />
          </div>
          <div className="relative z-10">
            <div className={label}>Soil Saturation</div>
            <div className={value}>
              {telemetry.soil_moisture_pct.toFixed(1)}%
              <span className="text-[9px] text-red-300 font-bold px-1 rounded bg-red-500/20 border border-red-500/40">OVERSATURATED</span>
            </div>
          </div>
        </div>

        {/* Seismic / GLOF */}
        <div className={tile}>
          <div className={iconBox("bg-red-500/20 border border-red-400/40")}>
            <Activity className={`w-4 h-4 text-red-400 ${isDanger ? "animate-pulse" : ""}`} aria-hidden />
          </div>
          <div className="relative z-10">
            <div className={label}>Cryo-Seismic (GLOF)</div>
            <div className={value}>
              {telemetry.seismic_mag.toFixed(1)}M
              {telemetry.seismic_mag > 3 && (
                <span className="text-[9px] text-red-300 font-bold px-1 rounded bg-red-500/20 border border-red-500/40">BREACH RISK</span>
              )}
            </div>
          </div>
        </div>

        {/* Evacuation Window */}
        <div className={tile}>
          <div className={iconBox("bg-amber-500/20 border border-amber-400/40")}>
            <Clock className="w-4 h-4 text-amber-400" aria-hidden />
          </div>
          <div className="relative z-10">
            <div className={label}>Evacuation Window</div>
            <div className={`${value} text-amber-300`}>
              {hours}h {mins}m
              <span className="text-[10px] text-slate-400 font-normal">to Peak</span>
            </div>
          </div>
        </div>

        {/* Peak Discharge */}
        <div className={tile}>
          <div className={iconBox("bg-violet-500/20 border border-violet-400/40")}>
            <Gauge className="w-4 h-4 text-violet-400" aria-hidden />
          </div>
          <div className="relative z-10">
            <div className={label}>Peak Discharge</div>
            <div className={value}>
              {activeZone.hydrograph
                ? Math.max(...activeZone.hydrograph.map((h) => h.discharge_cumecs)).toLocaleString("en-IN")
                : "1,240"}
              <span className="text-[10px] text-slate-400 font-normal">m³/s</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
