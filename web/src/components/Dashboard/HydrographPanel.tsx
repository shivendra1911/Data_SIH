"use client";

import React, { useState, useEffect } from "react";
import { HazardZone, HydrographPoint } from "@/lib/types";
import { Language, translations } from "@/lib/i18n";
import {
  Waves,
  Clock,
  TrendingUp,
  AlertTriangle,
  Info,
  ShieldAlert,
} from "lucide-react";

interface HydrographPanelProps {
  activeZone: HazardZone;
  language?: Language;
}

export default function HydrographPanel({
  activeZone,
  language = "en",
}: HydrographPanelProps) {
  const [leadSeconds, setLeadSeconds] = useState<number>(
    activeZone.leadTimeMinutes * 60
  );
  const t = translations[language];

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

  const hydrograph = activeZone.hydrograph;
  const maxLevel = Math.max(
    activeZone.dangerMarkM * 1.25,
    ...hydrograph.map((p) => p.level_m)
  );
  const minLevel = Math.min(...hydrograph.map((p) => p.level_m)) * 0.8;
  const range = maxLevel - minLevel || 1;

  // Chart coordinate helpers (viewBox 600 x 220)
  const chartW = 560;
  const chartH = 150;
  const offsetX = 40;
  const offsetY = 15;

  const points = hydrograph.map((pt, idx) => {
    const x = offsetX + (idx / (hydrograph.length - 1)) * chartW;
    const y =
      offsetY + chartH - ((pt.level_m - minLevel) / range) * chartH;
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
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Top Bar with Lead Time Countdown */}
      <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-950/80 via-slate-900 to-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              {t.hydrographTitle}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {language === "hi" ? "एआई मॉडल" : "PHYSICS-INFORMED ML"}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              {language === "hi"
                ? "नदी स्टेशन डेटा व अनुमानित जल बहाव"
                : "India-WRIS Station Baseline + Runoff Accumulation Model"}
            </p>
          </div>
        </div>

        {/* Lead Time Countdown Clock */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950 border border-rose-500/40 shadow-lg shadow-rose-950/30">
          <div className="flex items-center gap-1.5 text-rose-400">
            <Clock className="w-4 h-4 animate-pulse" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
              {language === "hi" ? "बचाव हेतु समय:" : "Evacuation Window:"}
            </span>
          </div>

          <div className="flex items-baseline gap-1 font-mono font-black text-rose-400 text-lg">
            <span>{countdown.hours}</span>
            <span className="text-xs text-slate-500 font-normal">{language === "hi" ? "घं" : "h"}</span>
            <span className="text-slate-600">:</span>
            <span>{countdown.minutes}</span>
            <span className="text-xs text-slate-500 font-normal">{language === "hi" ? "मि" : "m"}</span>
            <span className="text-slate-600">:</span>
            <span>{countdown.seconds}</span>
            <span className="text-xs text-slate-500 font-normal">{language === "hi" ? "से" : "s"}</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Quick Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              {t.currentWater}
            </span>
            <span className="text-lg font-mono font-black text-white mt-0.5 block">
              {currentPoint.level_m.toFixed(1)} m
            </span>
            <span className="text-[10px] text-emerald-400">
              {language === "hi" ? "सामान्य स्तर: ~3.0m" : "Normal Channel: ~3.0m"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-500/30">
            <span className="text-[10px] font-bold uppercase text-rose-400 block">
              {t.peakSurge}
            </span>
            <span className="text-lg font-mono font-black text-rose-400 mt-0.5 block">
              {peakPoint.level_m.toFixed(1)} m
            </span>
            <span className="text-[10px] text-rose-300 font-semibold">
              +{peakPoint.time} ({peakPoint.discharge_cumecs} m³/s)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/30">
            <span className="text-[10px] font-bold uppercase text-amber-400 block">
              {t.warningMark}
            </span>
            <span className="text-lg font-mono font-black text-amber-300 mt-0.5 block">
              {activeZone.warningMarkM.toFixed(1)} m
            </span>
            <span className="text-[10px] text-amber-400/80">
              {language === "hi" ? "तटवर्ती कटाव" : "Riverbank Inundation"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-600/40">
            <span className="text-[10px] font-bold uppercase text-rose-500 block">
              {t.dangerMark}
            </span>
            <span className="text-lg font-mono font-black text-rose-500 mt-0.5 block">
              {activeZone.dangerMarkM.toFixed(1)} m
            </span>
            <span className="text-[10px] text-rose-400 font-bold">
              {language === "hi" ? "गंभीर जलमग्नता" : "Catastrophic Breach"}
            </span>
          </div>
        </div>

        {/* SVG Hydrograph Visualization */}
        <div className="relative w-full rounded-xl bg-slate-950/90 border border-slate-800 p-3">
          <svg
            viewBox="0 0 620 200"
            className="w-full h-48 overflow-visible"
          >
            <defs>
              <linearGradient id="hydroGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line
              x1={offsetX}
              y1={offsetY + chartH}
              x2={offsetX + chartW}
              y2={offsetY + chartH}
              stroke="#334155"
              strokeWidth="1"
            />

            {/* Warning Level Line */}
            <line
              x1={offsetX}
              y1={warningY}
              x2={offsetX + chartW}
              y2={warningY}
              stroke="#f59e0b"
              strokeDasharray="4, 4"
              strokeWidth="1.5"
            />
            <text
              x={offsetX + chartW - 5}
              y={warningY - 5}
              textAnchor="end"
              fill="#f59e0b"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {language === "hi" ? "चेतावनी निशान: " : "WARNING: "}{activeZone.warningMarkM.toFixed(1)}m
            </text>

            {/* Danger Mark Line */}
            <line
              x1={offsetX}
              y1={dangerY}
              x2={offsetX + chartW}
              y2={dangerY}
              stroke="#ef4444"
              strokeDasharray="6, 4"
              strokeWidth="2"
            />
            <text
              x={offsetX + chartW - 5}
              y={dangerY - 5}
              textAnchor="end"
              fill="#ef4444"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {language === "hi" ? "खतरे का निशान: " : "DANGER MARK: "}{activeZone.dangerMarkM.toFixed(1)}m
            </text>

            {/* Area Fill */}
            <path d={areaD} fill="url(#hydroGrad)" />

            {/* Hydrograph Curve Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Points & Labels */}
            {points.map((pt, i) => (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.isPredicted ? 5 : 4}
                  fill={
                    pt.level_m >= activeZone.dangerMarkM
                      ? "#ef4444"
                      : pt.level_m >= activeZone.warningMarkM
                      ? "#f59e0b"
                      : "#38bdf8"
                  }
                  stroke="#ffffff"
                  strokeWidth="1.5"
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
                  fill={pt.time === "NOW" ? "#38bdf8" : "#94a3b8"}
                  fontSize="9"
                  fontWeight={pt.time === "NOW" ? "bold" : "normal"}
                  fontFamily="monospace"
                >
                  {pt.time === "NOW" ? (language === "hi" ? "अभी" : "NOW") : pt.time}
                </text>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-sky-400"></span>
                <span>{language === "hi" ? "जलस्तर वक्र" : "Hydrograph Curve"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-amber-400 border-dashed"></span>
                <span>{language === "hi" ? "चेतावनी स्तर" : "Warning Level"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-rose-500 border-dashed"></span>
                <span>{language === "hi" ? "खतरे का निशान" : "Danger Mark (Breach)"}</span>
              </div>
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              {language === "hi" ? "*T+02h से T+08h: अनुमानित बाढ़ बहाव" : "*T+02h to T+08h: Predicted Runoff Wave Propagation"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}