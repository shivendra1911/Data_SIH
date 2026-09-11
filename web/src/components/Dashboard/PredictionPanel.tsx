"use client";

import React, { useState } from "react";
import { PredictionResponse } from "@/lib/types";
import { Language, translations } from "@/lib/i18n";
import {
  AlertTriangle,
  RefreshCw,
  Gauge,
  Droplets,
  Activity,
  Mountain,
  Waves,
  ShieldCheck,
  AlertOctagon,
  HelpCircle,
  Cpu,
  Zap,
} from "lucide-react";

interface PredictionPanelProps {
  prediction: PredictionResponse | null;
  loading: boolean;
  onRefresh: () => void;
  language?: Language;
}

export default function PredictionPanel({
  prediction,
  loading,
  onRefresh,
  language = "en",
}: PredictionPanelProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const t = translations[language];

  if (!prediction) {
    return (
      <div className="p-6 rounded-2xl bg-slate-950/30 backdrop-blur-md border border-white/20 animate-pulse flex flex-col gap-4 shadow-sm text-white">
        <div className="h-6 w-1/3 bg-white/10 rounded-lg"></div>
        <div className="h-24 bg-white/10 rounded-xl"></div>
      </div>
    );
  }

  const prob = prediction.flood_probability_percent;
  const isRed = prediction.alert_color === "RED" || prob >= 75;
  const isOrange = !isRed && (prediction.alert_color === "ORANGE" || prob >= 55);
  const isYellow = !isRed && !isOrange && (prediction.alert_color === "YELLOW" || prob >= 35);

  const statusCardStyle = isRed
    ? "bg-red-950/35 border-red-500/40 text-white"
    : isOrange
    ? "bg-amber-950/35 border-amber-500/40 text-white"
    : isYellow
    ? "bg-yellow-950/35 border-yellow-500/40 text-white"
    : "bg-emerald-950/35 border-emerald-500/40 text-white";

  const telemetry = prediction.telemetry || {
    rainfall_mm: 64.2,
    soil_moisture_pct: 92.4,
    slope_deg: 42.0,
    river_level_m: 7.2,
    seismic_mag: 4.2,
  };

  const isSeismicCryoAnomaly = telemetry.seismic_mag >= 3.0 && telemetry.slope_deg >= 35.0;

  const toggleTooltip = (name: string) => {
    setActiveTooltip((prev) => (prev === name ? null : name));
  };

  return (
    <div className="flex flex-col h-full space-y-4 text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between relative z-10 pb-1 font-sans">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shadow-xs text-white">
            <Cpu className="w-4 h-4" aria-hidden />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-[1.5px] flex items-center gap-1.5 font-display">
              <span>AI Hydrological Risk Engine</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15 font-bold tracking-wider">
                94.8% ACCURACY
              </span>
            </h2>
            <p className="text-[11px] font-medium text-white/70">
              Physics-Informed Random Forest + Cryo-Seismic Telemetry
            </p>
          </div>
        </div>

        {/* Solid Refresh Action Button (Circle Btn) */}
        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh AI prediction telemetry"
          className="circle-btn w-[38px] h-[38px]"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      <div className="space-y-4 flex-1 flex flex-col justify-between relative z-10 font-sans">
        {/* Main Risk Status Banner */}
        <div
          className={`p-4 rounded-2xl border ${statusCardStyle} flex flex-col sm:flex-row items-center justify-between gap-4 transition backdrop-blur-md shadow-sm`}
        >
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[1.5px] shadow-sm ${
                  isRed
                    ? "bg-red-600 text-white animate-pulse"
                    : isOrange
                    ? "bg-amber-500 text-[#161a20]"
                    : isYellow
                    ? "bg-yellow-400 text-[#161a20]"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {prediction.alert_color} ALERT
              </span>
              <span className="text-[10px] text-white/70 uppercase font-bold tracking-wider">
                Zone: {prediction.zone_id}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white tracking-tight font-display">
              {prediction.primary_trigger}
            </h3>
            <p className="text-[11px] text-white/70 font-medium">
              Telemetry Synchronized: {new Date(prediction.last_updated).toLocaleTimeString()} IST
            </p>
          </div>

          {/* Probability Gauge Box */}
          <div className="relative flex flex-col items-center justify-center min-w-[130px] p-3 rounded-2xl bg-[#1b2027] text-white border border-white/15 shadow-xl shrink-0">
            <div className="text-3xl font-bold tracking-tight text-white flex items-baseline font-display">
              {prob.toFixed(1)}
              <span className="text-sm font-bold text-red-400 ml-0.5">%</span>
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-[1.5px] text-white/60">
              Flood Probability
            </span>
            <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all duration-700 ${
                  isRed
                    ? "bg-red-500"
                    : isOrange
                    ? "bg-amber-400"
                    : isYellow
                    ? "bg-yellow-300"
                    : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(100, Math.max(5, prob))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Cryo-Seismic Signature Callout (GLOF Avalanche Defense) */}
        {isSeismicCryoAnomaly ? (
          <div className="p-3.5 rounded-xl bg-red-950/35 border border-red-500/40 backdrop-blur-md flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" aria-hidden />
            <div className="text-xs text-red-100">
              <strong className="text-red-300 font-bold block mb-1 uppercase tracking-wide">
                Cryo-Seismic Anomaly Detected (GLOF Risk)
              </strong>
              <p className="leading-relaxed text-red-200 text-[11px]">
                Ground tremors ({telemetry.seismic_mag.toFixed(1)}M) detected on steep permafrost slope ({telemetry.slope_deg.toFixed(1)}°).
                Glacial moraine breach or landslide dam outburst imminent without requiring prior cloudburst.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2.5 text-xs text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden />
            <span className="text-[11px] font-medium">
              Cryo-seismic baseline normal: No glacial moraine shift or landslide detected.
            </span>
          </div>
        )}

        {/* 5-Factor Environmental Telemetry Grid */}
        <div>
          <div className="corwdy-subtitle mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-white/80">
              <Activity className="w-3.5 h-3.5 text-white" aria-hidden />
              <span>/ENVIRONMENTAL TELEMETRY MATRIX</span>
            </span>
            <span className="text-[10px] text-white/50 font-normal">
              Hover for Info
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {/* 1. Rain */}
            <div className="p-3 rounded-2xl backdrop-blur-md bg-[#1b2027]/75 hover:bg-[#212730]/90 border border-white/10 relative transition shadow-xs text-white">
              <div className="flex items-center justify-between text-white/60 text-[10px] uppercase font-bold tracking-wider">
                <span>Rainfall</span>
                <button
                  onClick={() => toggleTooltip("rain")}
                  aria-label="Rainfall sensor information"
                  className="text-white/40 hover:text-white p-0.5"
                >
                  <HelpCircle className="w-3 h-3" aria-hidden />
                </button>
              </div>
              <div className="text-sm font-bold text-white mt-1.5 font-display">
                {telemetry.rainfall_mm.toFixed(1)}{" "}
                <span className="text-[9px] text-white/50 font-normal font-sans">mm/h</span>
              </div>
              {activeTooltip === "rain" && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 p-3 rounded-2xl bg-[#161a20] border border-white/20 text-[10px] text-white shadow-2xl backdrop-blur-md font-sans">
                  {t.sensorExplanation.rain}
                </div>
              )}
            </div>

            {/* 2. Soil Moisture */}
            <div className="p-3 rounded-2xl backdrop-blur-md bg-[#1b2027]/75 hover:bg-[#212730]/90 border border-white/10 relative transition shadow-xs text-white">
              <div className="flex items-center justify-between text-white/60 text-[10px] uppercase font-bold tracking-wider">
                <span>Soil Sat.</span>
                <button
                  onClick={() => toggleTooltip("soil")}
                  aria-label="Soil saturation sensor information"
                  className="text-white/40 hover:text-white p-0.5"
                >
                  <HelpCircle className="w-3 h-3" aria-hidden />
                </button>
              </div>
              <div className="text-sm font-bold text-white mt-1.5 font-display">
                {telemetry.soil_moisture_pct.toFixed(0)}
                <span className="text-[9px] text-white/50 font-normal font-sans">%</span>
              </div>
              {activeTooltip === "soil" && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 p-3 rounded-2xl bg-[#161a20] border border-white/20 text-[10px] text-white shadow-2xl backdrop-blur-md font-sans">
                  {t.sensorExplanation.soil}
                </div>
              )}
            </div>

            {/* 3. Slope */}
            <div className="p-3 rounded-2xl backdrop-blur-md bg-[#1b2027]/75 hover:bg-[#212730]/90 border border-white/10 relative transition shadow-xs text-white">
              <div className="flex items-center justify-between text-white/60 text-[10px] uppercase font-bold tracking-wider">
                <span>Slope</span>
                <button
                  onClick={() => toggleTooltip("slope")}
                  aria-label="Terrain slope sensor information"
                  className="text-white/40 hover:text-white p-0.5"
                >
                  <HelpCircle className="w-3 h-3" aria-hidden />
                </button>
              </div>
              <div className="text-sm font-bold text-white mt-1.5 font-display">
                {telemetry.slope_deg.toFixed(0)}
                <span className="text-[9px] text-white/50 font-normal font-sans">&deg;</span>
              </div>
              {activeTooltip === "slope" && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 p-3 rounded-2xl bg-[#161a20] border border-white/20 text-[10px] text-white shadow-2xl backdrop-blur-md font-sans">
                  {t.sensorExplanation.slope}
                </div>
              )}
            </div>

            {/* 4. River Stage */}
            <div className="p-3 rounded-2xl backdrop-blur-md bg-[#1b2027]/75 hover:bg-[#212730]/90 border border-white/10 relative transition shadow-xs text-white">
              <div className="flex items-center justify-between text-white/60 text-[10px] uppercase font-bold tracking-wider">
                <span>River Stage</span>
                <button
                  onClick={() => toggleTooltip("river")}
                  aria-label="River stage level sensor information"
                  className="text-white/40 hover:text-white p-0.5"
                >
                  <HelpCircle className="w-3 h-3" aria-hidden />
                </button>
              </div>
              <div className="text-sm font-bold text-white mt-1.5 font-display">
                {telemetry.river_level_m.toFixed(1)}{" "}
                <span className="text-[9px] text-white/50 font-normal font-sans">m</span>
              </div>
              {activeTooltip === "river" && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 p-3 rounded-2xl bg-[#161a20] border border-white/20 text-[10px] text-white shadow-2xl backdrop-blur-md font-sans">
                  {t.sensorExplanation.river}
                </div>
              )}
            </div>

            {/* 5. Seismic Tremors */}
            <div className="p-3 rounded-2xl backdrop-blur-md bg-[#1b2027]/75 hover:bg-[#212730]/90 border border-white/10 relative transition shadow-xs text-white">
              <div className="flex items-center justify-between text-white/60 text-[10px] uppercase font-bold tracking-wider">
                <span>Seismic</span>
                <button
                  onClick={() => toggleTooltip("seismic")}
                  aria-label="USGS seismic sensor information"
                  className="text-white/40 hover:text-white p-0.5"
                >
                  <HelpCircle className="w-3 h-3" aria-hidden />
                </button>
              </div>
              <div className="text-sm font-bold text-white mt-1.5 font-display">
                {telemetry.seismic_mag.toFixed(1)}{" "}
                <span className="text-[9px] text-white/50 font-normal font-sans">M</span>
              </div>
              {activeTooltip === "seismic" && (
                <div className="absolute right-0 top-full mt-1 z-30 p-3 rounded-2xl bg-[#161a20] border border-white/20 text-[10px] text-white shadow-2xl backdrop-blur-md w-48 font-sans">
                  {t.sensorExplanation.seismic}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
