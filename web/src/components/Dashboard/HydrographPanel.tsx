"use client";

import React, { useState, useEffect } from "react";
import { HazardZone, HydrographPoint } from "@/lib/types";
import { Waves, Clock, TrendingUp, AlertTriangle } from "lucide-react";

interface HydrographPanelProps {
  activeZone: HazardZone;
}

export default function HydrographPanel({ activeZone }: HydrographPanelProps) {
  const [leadSeconds, setLeadSeconds] = useState<number>(
    activeZone.leadTimeMinutes * 60
  );

  useEffect(() => {
    setLeadSeconds(activeZone.leadTimeMinutes * 60);
  }, [activeZone]);

  // Live countdown timer for peak flood wave arrival
  useEffect(() => {
    const interval = setInterval(() => {
      setLeadSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
    };
  };

  const countdown = formatCountdown(leadSeconds);

  const fallbackHydrograph: HydrographPoint[] = [
    { time: "-3h", level_m: (activeZone.telemetry?.river_level_m || 1.2) * 0.95, discharge_cumecs: 45, isPredicted: false },
    { time: "-2h", level_m: (activeZone.telemetry?.river_level_m || 1.2) * 0.98, discharge_cumecs: 48, isPredicted: false },
    { time: "-1h", level_m: (activeZone.telemetry?.river_level_m || 1.2) * 0.99, discharge_cumecs: 50, isPredicted: false },
    { time: "NOW", level_m: (activeZone.telemetry?.river_level_m || 1.2), discharge_cumecs: 52, isPredicted: false },
    { time: "+1h", level_m: (activeZone.telemetry?.river_level_m || 1.2) * 1.02, discharge_cumecs: 54, isPredicted: true },
    { time: "+2h", level_m: (activeZone.telemetry?.river_level_m || 1.2) * 1.04, discharge_cumecs: 55, isPredicted: true },
    { time: "+3h", level_m: (activeZone.telemetry?.river_level_m || 1.2) * 1.01, discharge_cumecs: 51, isPredicted: true },
  ];
  const hydrograph = (activeZone.hydrograph && activeZone.hydrograph.length > 0) ? activeZone.hydrograph : fallbackHydrograph;
  const maxLevel = Math.max(
    activeZone.dangerMarkM * 1.25,
    ...hydrograph.map((p) => p.level_m)
  );
  const minLevel = Math.min(...hydrograph.map((p) => p.level_m)) * 0.8;
  const range = maxLevel - minLevel || 1;

  // Chart coordinate helpers (viewBox 620 x 200)
  const chartW = 560;
  const chartH = 140;
  const offsetX = 40;
  const offsetY = 20;

  const points = hydrograph.map((pt, idx) => {
    const x = offsetX + (idx / (hydrograph.length - 1)) * chartW;
    const y = offsetY + chartH - ((pt.level_m - minLevel) / range) * chartH;
    return { ...pt, x, y };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  // Area under curve
  const areaD = `${pathD} L ${points[points.length - 1].x} ${
    offsetY + chartH
  } L ${points[0].x} ${offsetY + chartH} Z`;

  // Danger Mark Y
  const dangerY =
    offsetY +
    chartH -
    ((activeZone.dangerMarkM - minLevel) / range) * chartH;

  // Warning Mark Y
  const warningY =
    offsetY +
    chartH -
    ((activeZone.warningMarkM - minLevel) / range) * chartH;

  const currentPoint = hydrograph.find((p) => p.time === "NOW") || hydrograph[3];
  const peakPoint = hydrograph.reduce(
    (max, p) => (p.level_m > max.level_m ? p : max),
    hydrograph[0]
  );

  return (
    <div className="rounded-2xl bg-white shadow-xs overflow-hidden flex flex-col h-full border border-slate-200 text-slate-900">
      {/* Top Bar with Lead Time Countdown */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#faf9f5] relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-900 shadow-2xs">
            <Waves className="w-5 h-5 text-slate-900" aria-hidden />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
              <span>Inundation Hydrograph & Flood Wave Arrival</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold">
                KINEMATIC WAVE ML
              </span>
            </h2>
            <p className="text-[11px] font-medium text-slate-500">
              India-WRIS Station Gauge Telemetry + Upstream Catchment Runoff Model
            </p>
          </div>
        </div>

        {/* Lead Time Countdown Clock */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900 text-white shadow-xs">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-white" aria-hidden />
            <span className="text-[10px] uppercase font-black tracking-wider text-white">
              Evacuation Window:
            </span>
          </div>

          <div className="flex items-baseline gap-1 font-black text-white text-lg font-display">
            <span>{countdown.hours}</span>
            <span className="text-xs text-white/70 font-bold">h</span>
            <span className="text-white/40">:</span>
            <span>{countdown.minutes}</span>
            <span className="text-xs text-white/70 font-bold">m</span>
            <span className="text-white/40">:</span>
            <span>{countdown.seconds}</span>
            <span className="text-xs text-white/70 font-bold">s</span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between relative z-10">
          {/* Quick Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#faf9f5] border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Current Stage
            </span>
            <span className="text-lg font-black text-slate-950 mt-0.5 block font-display">
              {currentPoint.level_m.toFixed(1)} m
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Baseline Channel: ~3.0m
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#faf9f5] border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Peak Surge
            </span>
            <span className="text-lg font-black text-slate-950 mt-0.5 block font-display">
              {peakPoint.level_m.toFixed(1)} m
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              +{peakPoint.time} ({peakPoint.discharge_cumecs.toLocaleString("en-IN")} m³/s)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-amber-700 block">
              Warning Mark
            </span>
            <span className="text-lg font-black text-slate-950 mt-0.5 block font-display">
              {activeZone.warningMarkM.toFixed(1)} m
            </span>
            <span className="text-[10px] text-amber-700 font-medium">
              Bankfull Inundation
            </span>
          </div>

          <div className="p-3 rounded-xl bg-red-50 border border-red-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-red-700 block">
              Danger Mark
            </span>
            <span className="text-lg font-black text-slate-950 mt-0.5 block font-display">
              {activeZone.dangerMarkM.toFixed(1)} m
            </span>
            <span className="text-[10px] text-red-700 font-bold">
              Breach Threshold
            </span>
          </div>
        </div>

        {/* SVG Hydrograph Visualization */}
        <div className="relative w-full rounded-xl bg-[#161a20] border border-white/10 p-3 shadow-sm">
          <svg viewBox="0 0 620 200" className="w-full h-48 overflow-visible">
            <defs>
              <linearGradient id="hydroGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
                <stop offset="60%" stopColor="#ffffff" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Baseline Grid Line */}
            <line
              x1={offsetX}
              y1={offsetY + chartH}
              x2={offsetX + chartW}
              y2={offsetY + chartH}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1.5"
            />

            {/* Warning Level Line */}
            <line
              x1={offsetX}
              y1={warningY}
              x2={offsetX + chartW}
              y2={warningY}
              stroke="rgba(255,255,255,0.4)"
              strokeDasharray="4, 4"
              strokeWidth="1.5"
            />
            <text
              x={offsetX + chartW - 5}
              y={warningY - 5}
              textAnchor="end"
              fill="rgba(255,255,255,0.7)"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              WARNING: {activeZone.warningMarkM.toFixed(1)}m
            </text>

            {/* Danger Mark Line */}
            <line
              x1={offsetX}
              y1={dangerY}
              x2={offsetX + chartW}
              y2={dangerY}
              stroke="#ffffff"
              strokeDasharray="6, 4"
              strokeWidth="2"
            />
            <text
              x={offsetX + chartW - 5}
              y={dangerY - 5}
              textAnchor="end"
              fill="#ffffff"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              DANGER THRESHOLD: {activeZone.dangerMarkM.toFixed(1)}m
            </text>

            {/* Area Fill */}
            <path d={areaD} fill="url(#hydroGradLight)" />

            {/* Hydrograph Curve Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Points & Labels */}
            {points.map((pt, i) => (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.isPredicted ? 5 : 4}
                  fill={pt.level_m >= activeZone.dangerMarkM ? "#ffffff" : "#161a20"}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={pt.x}
                  y={pt.y - 9}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {pt.level_m.toFixed(1)}m
                </text>
                <text
                  x={pt.x}
                  y={offsetY + chartH + 16}
                  textAnchor="middle"
                  fill={pt.time === "NOW" ? "#ffffff" : "rgba(255,255,255,0.5)"}
                  fontSize="9"
                  fontWeight={pt.time === "NOW" ? "bold" : "normal"}
                  fontFamily="monospace"
                >
                  {pt.time}
                </text>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/10 text-[11px] text-white/50">
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-white rounded"></span>
                <span className="font-semibold text-white/80">Hydrograph Curve</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-white/40 rounded"></span>
                <span>Warning Level</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-white rounded"></span>
                <span>Danger Mark (Breach)</span>
              </div>
            </div>
            <div className="text-[10px] text-white/40">
              *T+02h to T+08h: Predicted Runoff Wave Propagation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}