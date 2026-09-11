"use client";

import React from "react";
import { HazardZone } from "@/lib/types";
import {
  Waves,
  CloudRain,
  Mountain,
  Activity,
  Clock,
  Gauge,
  Satellite,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

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

  return (
    <div className="w-full bg-slate-950/80 border-y border-slate-800/80 backdrop-blur-md px-4 lg:px-8 py-2.5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 max-w-[1750px] mx-auto text-xs">
        {/* Metric 1: River Gauge & Rising Velocity */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
            <Waves className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold flex items-center gap-1">
              <span>River Stage</span>
              <span className="text-rose-400 font-normal">▲ +1.4m/h</span>
            </div>
            <div className="text-sm font-black font-mono text-white flex items-baseline gap-1">
              {telemetry.river_level_m.toFixed(1)}m
              <span className="text-[10px] text-slate-400 font-normal">
                / {activeZone.dangerMarkM}m (Danger)
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Catchment Rainfall Intensity */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
            <CloudRain className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
              Catchment Rain
            </div>
            <div className="text-sm font-black font-mono text-white flex items-baseline gap-1">
              {telemetry.rainfall_mm.toFixed(1)}{" "}
              <span className="text-[10px] text-slate-400 font-normal">mm/h</span>
              <span className="text-[9px] text-amber-400 font-bold px-1 rounded bg-amber-500/10 border border-amber-500/20">
                HEAVY
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Soil Pore Saturation */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Mountain className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
              Soil Saturation
            </div>
            <div className="text-sm font-black font-mono text-white flex items-baseline gap-1">
              {telemetry.soil_moisture_pct.toFixed(1)}%
              <span className="text-[9px] text-rose-400 font-bold px-1 rounded bg-rose-500/10 border border-rose-500/20">
                OVERSATURATED
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Cryo-Seismic Tremor Frequency */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
              Cryo-Seismic (GLOF)
            </div>
            <div className="text-sm font-black font-mono text-white flex items-baseline gap-1">
              {telemetry.seismic_mag.toFixed(1)}M{" "}
              <span className="text-[10px] text-rose-400 font-bold">
                (Lake Breach Risk)
              </span>
            </div>
          </div>
        </div>

        {/* Metric 5: Lead-Time to Inundation Breach */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
              Lead Time Window
            </div>
            <div className="text-sm font-black font-mono text-amber-300">
              {hours}h {mins}m{" "}
              <span className="text-[10px] text-slate-400 font-normal">to Surge Peak</span>
            </div>
          </div>
        </div>

        {/* Metric 6: Discharge Rate & Basin */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Gauge className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
              Peak Discharge
            </div>
            <div className="text-sm font-black font-mono text-white flex items-baseline gap-1">
              1,240 <span className="text-[10px] text-slate-400 font-normal">m³/s</span>
              <span className="text-[9px] text-cyan-400 font-semibold uppercase">
                Alaknanda
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
