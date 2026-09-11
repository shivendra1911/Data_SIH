"use client";

import React from "react";
import { ForecastHorizon } from "@/lib/types";
import { Clock, FastForward, Play, AlertCircle } from "lucide-react";

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
    <div className="tilt-card rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-2 text-slate-300 relative z-10">
        <FastForward className="w-4 h-4 text-sky-400" />
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-white block">
            Multi-Horizon Surge Forecast Slider
          </span>
          <span className="text-[10px] text-slate-400">
            Temporal Simulation of Flood Wave Downstream Velocity
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap min-h-[44px] flex flex-col items-center justify-center ${
                isSelected
                  ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80"
              }`}
            >
              <span>{h.label}</span>
              <span className="text-[9px] opacity-75">{h.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}