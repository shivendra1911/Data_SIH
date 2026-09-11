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
  Vibrate,
  ShieldCheck,
  AlertOctagon,
  HelpCircle,
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
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse flex flex-col gap-4">
        <div className="h-6 w-1/3 bg-slate-800 rounded"></div>
        <div className="h-24 bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  const prob = prediction.flood_probability_percent;
  const isRed = prediction.alert_color === "RED" || prob >= 75;
  const isOrange = !isRed && (prediction.alert_color === "ORANGE" || prob >= 55);
  const isYellow = !isRed && !isOrange && (prediction.alert_color === "YELLOW" || prob >= 35);

  const statusBg = isRed
    ? "from-rose-950/50 to-red-900/20 border-rose-500/40 text-rose-200"
    : isOrange
    ? "from-amber-950/50 to-amber-900/20 border-amber-500/40 text-amber-200"
    : isYellow
    ? "from-yellow-950/50 to-yellow-900/20 border-yellow-500/40 text-yellow-200"
    : "from-emerald-950/50 to-emerald-900/20 border-emerald-500/40 text-emerald-200";

  const telemetry = prediction.telemetry || {
    rainfall_mm: 28.5,
    soil_moisture_pct: 78.0,
    slope_deg: 42.0,
    river_level_m: 5.6,
    seismic_mag: 3.4,
  };

  const isSeismicCryoAnomaly = telemetry.seismic_mag >= 3.0 && telemetry.slope_deg >= 35.0;

  const toggleTooltip = (name: string) => {
    setActiveTooltip((prev) => (prev === name ? null : name));
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Top Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              {language === "hi"
                ? "एआई बाढ़ एवं ग्लेशियर आपदा पूर्वानुमान"
                : "AI Flood & GLOF Prediction Engine"}
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              {language === "hi"
                ? "5 सेंसर डेटा आधारित विश्लेषण"
                : "FastAPI: /api/prediction/current • Scikit-Learn Model"}
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh flood prediction"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition duration-150 disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <RefreshCw
            className={`w-4 h-4 text-slate-300 ${loading ? "animate-spin text-rose-400" : ""}`}
          />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Main Risk Display */}
        <div
          className={`p-4 rounded-xl border bg-gradient-to-br ${statusBg} flex flex-col sm:flex-row items-center justify-between gap-4`}
        >
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-black tracking-wider uppercase ${
                  isRed
                    ? "bg-rose-500 text-white"
                    : isOrange
                    ? "bg-amber-500 text-slate-950"
                    : isYellow
                    ? "bg-yellow-400 text-slate-950"
                    : "bg-emerald-500 text-white"
                }`}
              >
                {prediction.alert_color} {language === "hi" ? "अलर्ट" : "ALERT"}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {prediction.zone_id}
              </span>
            </div>

            <h3 className="text-base font-semibold text-white mt-1">
              {prediction.primary_trigger}
            </h3>
            <p className="text-xs text-slate-400">
              {language === "hi" ? "अंतिम अपडेट: " : "Updated: "}
              {new Date(prediction.last_updated).toLocaleTimeString()}
            </p>
          </div>

          {/* Probability Gauge Circle */}
          <div className="relative flex flex-col items-center justify-center min-w-[130px]">
            <div className="text-3xl font-black font-mono tracking-tight text-white flex items-baseline">
              {prob.toFixed(1)}
              <span className="text-base font-bold text-slate-400 ml-0.5">%</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              {t.floodRisk}
            </span>
            <div className="w-full bg-slate-950/60 rounded-full h-2 mt-1.5 overflow-hidden border border-slate-700/50">
              <div
                className={`h-full transition-all duration-700 ${
                  isRed
                    ? "bg-rose-500 shadow-rose-500"
                    : isOrange
                    ? "bg-amber-500 shadow-amber-500"
                    : isYellow
                    ? "bg-yellow-400 shadow-yellow-400"
                    : "bg-emerald-500 shadow-emerald-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(5, prob))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Cryo-Seismic Signature Callout (Nepal 2026 / GLOF Fix) */}
        {isSeismicCryoAnomaly ? (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs text-slate-200">
              <strong className="text-rose-300 font-semibold block mb-0.5">
                {language === "hi"
                  ? "🚨 ग्लेशियर झील या पहाड़ टूटने का खतरा (CRYO-SEISMIC ANOMALY)"
                  : "CRYO-SEISMIC SIGNATURE DETECTED (GLOF RISK)"}
              </strong>
              {language === "hi"
                ? `पहाड़ पर ${telemetry.seismic_mag.toFixed(1)} तीव्रता का झटका महसूस हुआ है। ढलान (${telemetry.slope_deg.toFixed(1)}°) अत्यंत तीखी होने के कारण बिना बारिश के भी अचानक भारी मलबा और पानी आ सकता है।`
                : `Seismic tremor (${telemetry.seismic_mag.toFixed(1)}M) detected on a steep slope (${telemetry.slope_deg.toFixed(1)}°). High probability of glacial breach without prior heavy rain.`}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {language === "hi"
                ? "भूगर्भीय कंपन सामान्य सीमा में है।"
                : "Cryo-Seismic signatures within baseline thresholds."}
            </span>
          </div>
        )}

        {/* 5-Factor Multi-Source Telemetry Grid with Plain Language Tooltips */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              {language === "hi" ? "5 महत्वपूर्ण मौसम व भू-सेंसर" : "5-Factor Multi-Source Sensor Telemetry"}
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              {language === "hi" ? "(? पर क्लिक करके मतलब समझें)" : "(Click ? to understand each)"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {/* 1. Rain */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 relative">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                <span>{language === "hi" ? "बारिश" : "Rainfall"}</span>
                <button
                  onClick={() => toggleTooltip("rain")}
                  className="text-slate-500 hover:text-sky-400 p-0.5"
                  title="Explanation"
                >
                  <HelpCircle className="w-3 h-3" />
                </button>
              </div>
              <div className="text-base font-bold font-mono text-white mt-1">
                {telemetry.rainfall_mm.toFixed(1)}{" "}
                <span className="text-[10px] text-slate-400 font-normal">mm/h</span>
              </div>
              {activeTooltip === "rain" && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 p-2 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-slate-300 shadow-xl">
                  {t.sensorExplanation.rain}
                </div>
              )}
            </div>

            {/* 2. Soil Moisture */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 relative">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                <span>{language === "hi" ? "मिट्टी नमी" : "Soil Sat."}</span>
                <button
                  onClick={() => toggleTooltip("soil")}
                  className="text-slate-500 hover:text-emerald-400 p-0.5"
                  title="Explanation"
                >
                  <HelpCircle className="w-3 h-3" />
                </button>
              </div>
              <div className="text-base font-bold font-mono text-white mt-1">
                {telemetry.soil_moisture_pct.toFixed(0)}
                <span className="text-[10px] text-slate-400 font-normal">%</span>
              </div>
              {activeTooltip === "soil" && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 p-2 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-slate-300 shadow-xl">
                  {t.sensorExplanation.soil}
                </div>
              )}
            </div>

            {/* 3. Terrain Slope */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 relative">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                <span>{language === "hi" ? "ढलान" : "Slope Angle"}</span>
                <button
                  onClick={() => toggleTooltip("slope")}
                  className="text-slate-500 hover:text-amber-400 p-0.5"
                  title="Explanation"
                >
                  <HelpCircle className="w-3 h-3" />
                </button>
              </div>
              <div className="text-base font-bold font-mono text-white mt-1">
                {telemetry.slope_deg.toFixed(1)}
                <span className="text-[10px] text-slate-400 font-normal">°</span>
              </div>
              {activeTooltip === "slope" && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 p-2 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-slate-300 shadow-xl">
                  {t.sensorExplanation.slope}
                </div>
              )}
            </div>

            {/* 4. River Water Level */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 relative">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                <span>{language === "hi" ? "नदी स्तर" : "River Level"}</span>
                <button
                  onClick={() => toggleTooltip("river")}
                  className="text-slate-500 hover:text-cyan-400 p-0.5"
                  title="Explanation"
                >
                  <HelpCircle className="w-3 h-3" />
                </button>
              </div>
              <div className="text-base font-bold font-mono text-white mt-1">
                {telemetry.river_level_m.toFixed(1)}
                <span className="text-[10px] text-slate-400 font-normal">m</span>
              </div>
              {activeTooltip === "river" && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 p-2 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-slate-300 shadow-xl">
                  {t.sensorExplanation.river}
                </div>
              )}
            </div>

            {/* 5. Seismic Tremor */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1 relative">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                <span>{language === "hi" ? "कंपन" : "Seismic Tremor"}</span>
                <button
                  onClick={() => toggleTooltip("seismic")}
                  className="text-slate-500 hover:text-rose-400 p-0.5"
                  title="Explanation"
                >
                  <HelpCircle className="w-3 h-3" />
                </button>
              </div>
              <div className="text-base font-bold font-mono text-white mt-1">
                {telemetry.seismic_mag.toFixed(1)}{" "}
                <span className="text-[10px] text-slate-400 font-normal">M</span>
              </div>
              {activeTooltip === "seismic" && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 p-2 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-slate-300 shadow-xl">
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