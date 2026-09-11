"use client";

import React from "react";
import { ForecastHorizon } from "@/lib/types";
import { FastForward } from "lucide-react";

interface ForecastHorizonSliderProps {
  currentHorizon: ForecastHorizon;
  onSelectHorizon: (horizon: ForecastHorizon) => void;
}

const HORIZONS: {
  id: ForecastHorizon;
  label: string;
  sub: string;
  riskFactor: number;
}[] = [
  { id: "NOW", label: "T - 0 (NOW)", sub: "Baseline / Early Anomaly", riskFactor: 1.0 },
  { id: "+2H", label: "+2 HOURS", sub: "Runoff Accumulation", riskFactor: 1.15 },
  { id: "+6H", label: "+6 HOURS", sub: "Peak Inundation Crest", riskFactor: 1.35 },
  { id: "+12H", label: "+12 HOURS", sub: "Downstream Propagation", riskFactor: 0.85 },
  { id: "+24H", label: "+24 HOURS", sub: "Recession & Normalization", riskFactor: 0.4 },
];

export default function ForecastHorizonSlider({
  currentHorizon,
  onSelectHorizon,
}: ForecastHorizonSliderProps) {
  return (
    <div className="tilt-card rounded-2xl glass-panel p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md border border-white/60">
      <div className="flex items-center gap-2.5 relative z-10">
        <div className="w-8 h-8 rounded-xl bg-violet-100 border border-violet-300 flex items-center justify-center shadow-xs">
          <FastForward className="w-4 h-4 text-violet-700" aria-hidden />
        </div>
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-950 block" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Multi-Horizon Surge Forecast Simulation
          </span>
          <span className="text-[11px] font-semibold text-slate-600">
            Temporal Hydrodynamic Wave Propagation
          </span>
        </div>
      </div>

      {/* Horizon Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 relative z-10">
        {HORIZONS.map((h) => {
          const isSelected = currentHorizon === h.id;
          return (
            <button
              key={h.id}
              onClick={() => onSelectHorizon(h.id)}
              aria-pressed={isSelected}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap min-h-[44px] flex flex-col items-center justify-center active:scale-[0.98] ${
                isSelected
                  ? "btn-solid-primary shadow-md"
                  : "backdrop-blur-md bg-white/70 hover:bg-white text-slate-800 border border-slate-300 shadow-xs"
              }`}
            >
              <span>{h.label}</span>
              <span className={`text-[9px] font-medium ${isSelected ? "text-violet-100" : "text-slate-500"}`}>{h.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}