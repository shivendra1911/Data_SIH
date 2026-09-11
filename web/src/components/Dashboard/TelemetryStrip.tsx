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

  // Tile base classes — Corwdy dark slate surface
  const tile = "tilt-card flex items-center gap-3 p-3 rounded-2xl backdrop-blur-md bg-[#1b2027]/75 hover:bg-[#212730]/90 border border-white/10 shadow-md transition-all text-white font-sans";
  const iconBox = (color: string) =>
    `w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative z-10 ${color}`;
  const label = "text-[10px] uppercase tracking-[2px] text-white/70 font-semibold font-sans";
  const value = "text-sm font-bold text-white flex items-baseline gap-1.5 font-sans";

  return (
    <div className="w-full bg-[#161a20]/80 backdrop-blur-md border-y border-white/10 px-4 lg:px-8 py-3 shadow-md text-white font-sans">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 max-w-[1800px] mx-auto text-xs">

        {/* River Stage */}
        <div className={tile}>
          <div className={iconBox("bg-white/10 border border-white/15")}>
            <Waves className="w-4 h-4 text-white" aria-hidden />
          </div>
          <div className="relative z-10">
            <div className={label}>
              River Stage <span className="text-red-400 font-bold">▲ +1.4m</span>
            </div>
            <div className={value}>
              {telemetry.river_level_m.toFixed(1)}m
              <span className="text-[10px] text-white/50 font-normal">/ {activeZone.dangerMarkM}m</span>
            </div>
          </div>
        </div>

        {/* Catchment Rainfall */}
        <div className={tile}>
          <div className={iconBox("bg-white/10 border border-white/15")}>
            <CloudRain className="w-4 h-4 text-white" aria-hidden />
          </div>
          <div className="relative z-10">
            <div className={label}>Catchment Rain</div>
            <div className={value}>
              {telemetry.rainfall_mm.toFixed(1)}
              <span className="text-[10px] text-white/50 font-normal">mm/h</span>
              <span className="text-[9px] text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 uppercase tracking-wider">HEAVY</span>
            </div>
          </div>
        </div>

        {/* Soil Saturation */}
        <div className={tile}>
          <div className={iconBox("bg-white/10 border border-white/15")}>
            <Mountain className="w-4 h-4 text-emerald-400" aria-hidden />
          </div>
          <div className="relative z-10">
            <div className={label}>Soil Saturation</div>
            <div className={value}>
              {telemetry.soil_moisture_pct.toFixed(1)}%
              <span className="text-[9px] text-red-300 font-bold px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 uppercase tracking-wider">OVERSATURATED</span>
            </div>
          </div>
        </div>

        {/* Seismic / GLOF */}
        <div className={tile}>
          <div className={iconBox("bg-white/10 border border-white/15")}>
            <Activity className={`w-4 h-4 text-red-400 ${isDanger ? "animate-pulse" : ""}`} aria-hidden />
          </div>
          <div className="relative z-10">
            <div className={label}>Cryo-Seismic (GLOF)</div>
            <div className={value}>
              {telemetry.seismic_mag.toFixed(1)}M
              {telemetry.seismic_mag > 3 && (
                <span className="text-[9px] text-red-300 font-bold px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 uppercase tracking-wider">BREACH RISK</span>
              )}
            </div>
          </div>
        </div>

        {/* Evacuation Window */}
        <div className={tile}>
          <div className={iconBox("bg-white/10 border border-white/15")}>
            <Clock className="w-4 h-4 text-amber-400" aria-hidden />
          </div>
          <div className="relative z-10">
            <div className={label}>Evacuation Window</div>
            <div className={`${value} text-amber-300`}>
              {hours}h {mins}m
              <span className="text-[10px] text-white/50 font-normal">to Peak</span>
            </div>
          </div>
        </div>

        {/* Peak Discharge */}
        <div className={tile}>
          <div className={iconBox("bg-white/10 border border-white/15")}>
            <Gauge className="w-4 h-4 text-white" aria-hidden />
          </div>
          <div className="relative z-10">
            <div className={label}>Peak Discharge</div>
            <div className={value}>
              {activeZone.hydrograph
                ? Math.max(...activeZone.hydrograph.map((h) => h.discharge_cumecs)).toLocaleString("en-IN")
                : "1,240"}
              <span className="text-[10px] text-white/50 font-normal">m³/s</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
