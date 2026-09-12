"use client";

import React from "react";
import Link from "next/link";
import { PredictionResponse } from "@/lib/types";
import {
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Radio,
  MapPin,
  PhoneCall,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface PredictionPanelProps {
  prediction: PredictionResponse | null;
  loading: boolean;
  onRefresh: () => void;
  onTriggerSOS?: () => void;
}

export default function PredictionPanel({
  prediction,
  loading,
  onRefresh,
  onTriggerSOS,
}: PredictionPanelProps) {
  if (!prediction) {
    return (
      <div className="tilt-card p-8 rounded-3xl bg-[#1b2027]/85 backdrop-blur-xl border border-white/10 animate-pulse flex flex-col gap-4 text-white shadow-2xl">
        <div className="h-6 w-1/3 bg-white/10 rounded-lg"></div>
        <div className="h-28 bg-white/10 rounded-2xl"></div>
      </div>
    );
  }

  const prob = prediction.flood_probability_percent;
  const isDanger = prob >= 70;
  const isWarning = prob >= 35 && prob < 70;
  const isSafe = prob < 35;

  // Percentage colors strictly conforming to user rule: Red >= 70%, Yellow 35-69%, Green < 35%
  const riskColor = isDanger
    ? "text-red-500"
    : isWarning
    ? "text-amber-400"
    : "text-emerald-400";

  const riskBadgeClass = isDanger
    ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm shadow-red-500/20"
    : isWarning
    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";

  const statusTitle = isDanger
    ? "🚨 Severe Flood Alert — Move to High Ground"
    : isWarning
    ? "⚠️ Flood Warning — River Rising Rapidly"
    : "✅ Conditions Normal — No Immediate Threat";

  const plainExplanation = isDanger
    ? `Continuous rainfall has swollen the river to ${prediction.telemetry?.river_level_m.toFixed(1)}m, dangerously close to the ${prediction.danger_mark_m}m danger mark. Risk of flash flood is high.`
    : isWarning
    ? `Rainfall in the upper hills is causing river water to rise. Stay alert and keep emergency supplies ready.`
    : `River water levels and mountain slopes are currently stable. No flood or landslide warnings in this basin.`;

  return (
    <div className="tilt-card tilt-card-physics p-6 sm:p-8 rounded-3xl bg-[#1b2027]/85 backdrop-blur-2xl border border-white/10 hover:border-white/25 text-white font-sans shadow-2xl space-y-6">
      
      {/* Card Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${riskBadgeClass}`}>
            {isDanger ? "High Alert" : isWarning ? "Medium Risk" : "Safe Zone"}
          </span>
          <span className="text-xs font-bold text-white/60 uppercase tracking-wider font-mono">
            {prediction.zone_name || prediction.zone_id}
          </span>
        </div>

        {/* Refresh button with live provider tag */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full bg-white/5 text-white/80 border border-white/10 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{prediction.active_provider || "Live Weather & Flood Feed"}</span>
          </span>

          <button
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh live flood telemetry"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-white border border-white/15 flex items-center justify-center transition shadow-inner active:scale-95"
            title="Refresh live data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Big Number and Risk Level */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10 relative z-10">
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className={`text-6xl sm:text-7xl lg:text-8xl font-black font-display tracking-tight ${riskColor} drop-shadow-[0_0_35px_rgba(239,68,68,0.25)]`}>
              {prob.toFixed(0)}%
            </span>
            <div className="space-y-0.5">
              <span className="text-xs uppercase font-extrabold tracking-wider text-white/50 block">
                Flood Probability
              </span>
              <span className="text-xs font-bold text-white/80">
                Next 3 to 6 Hours
              </span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-display tracking-tight">
            {statusTitle}
          </h2>

          <p className="text-sm text-white/80 font-normal max-w-2xl leading-relaxed">
            {plainExplanation}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
          {onTriggerSOS && (
            <button
              onClick={onTriggerSOS}
              aria-label="Trigger instant Emergency SOS alert"
              className="px-7 py-3.5 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition-all min-h-[44px]"
            >
              <Radio className="w-4 h-4" aria-hidden />
              <span>🚨 Send Emergency SOS</span>
            </button>
          )}

          <Link
            href="/radar"
            className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/15 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all min-h-[44px]"
          >
            <span>Open Live Tactical Map</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/60" />
          </Link>
        </div>
      </div>

      {/* 3 Supporting Metrics Cards in Dark Frosted Glass */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
        <div className="p-4 rounded-2xl bg-[#161a20]/80 border border-white/10 shadow-inner">
          <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
            Water Depth
          </span>
          <div className="text-xl font-black text-white mt-1 font-display">
            {prediction.telemetry?.river_level_m.toFixed(1)} meters
          </div>
          <p className="text-[11px] text-white/60 font-medium mt-0.5">
            Danger Mark: {prediction.danger_mark_m}m
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#161a20]/80 border border-white/10 shadow-inner">
          <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
            Catchment Rain
          </span>
          <div className="text-xl font-black text-white mt-1 font-display">
            {prediction.telemetry?.rainfall_mm.toFixed(1)} mm/hr
          </div>
          <p className="text-[11px] text-white/60 font-medium mt-0.5">
            Soil Saturation: {prediction.telemetry?.soil_moisture_pct.toFixed(0)}%
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#161a20]/80 border border-white/10 shadow-inner">
          <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
            Response Time
          </span>
          <div className="text-xl font-black text-white mt-1 font-display">
            ~{Math.round(prediction.lead_time_minutes / 60)} hours lead time
          </div>
          <p className="text-[11px] text-white/60 font-medium mt-0.5">
            Before peak surge arrival
          </p>
        </div>
      </div>

    </div>
  );
}
