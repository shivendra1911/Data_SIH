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
      <div className="p-8 rounded-3xl bg-white border border-slate-200 animate-pulse flex flex-col gap-4 text-slate-900 shadow-xs">
        <div className="h-6 w-1/3 bg-slate-100 rounded-lg"></div>
        <div className="h-28 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  const prob = prediction.flood_probability_percent;
  const isDanger = prob >= 70;
  const isWarning = prob >= 35 && prob < 70;
  const isSafe = prob < 35;

  // Percentage colors strictly conforming to user rule: Red >= 70%, Yellow 35-69%, Green < 35%
  const riskColor = isDanger
    ? "text-red-600"
    : isWarning
    ? "text-amber-600"
    : "text-emerald-700";

  const riskBadgeClass = isDanger
    ? "bg-red-50 text-red-700 border border-red-300"
    : isWarning
    ? "bg-amber-50 text-amber-800 border border-amber-300"
    : "bg-emerald-50 text-emerald-800 border border-emerald-300";

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
    <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 text-slate-900 font-sans shadow-md space-y-6">
      
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${riskBadgeClass}`}>
            {isDanger ? "High Alert" : isWarning ? "Medium Risk" : "Safe Zone"}
          </span>
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            {prediction.zone_name || prediction.zone_id}
          </span>
        </div>

        {/* Refresh button with live provider tag */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#faf9f5] text-slate-700 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>{prediction.active_provider || "Live Weather & Flood Feed"}</span>
          </span>

          <button
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh live flood telemetry"
            className="w-9 h-9 rounded-xl bg-[#faf9f5] hover:bg-slate-100 text-slate-800 border border-slate-300 flex items-center justify-center transition shadow-2xs"
            title="Refresh live data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Big Number and Risk Level */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className={`text-6xl sm:text-7xl font-black font-display tracking-tight ${riskColor}`}>
              {prob.toFixed(0)}%
            </span>
            <div className="space-y-0.5">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 block">
                Flood Probability
              </span>
              <span className="text-xs font-bold text-slate-700">
                Next 3 to 6 Hours
              </span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 font-display">
            {statusTitle}
          </h2>

          <p className="text-sm text-slate-600 font-normal max-w-2xl leading-relaxed">
            {plainExplanation}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
          {onTriggerSOS && (
            <button
              onClick={onTriggerSOS}
              aria-label="Trigger instant Emergency SOS alert"
              className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Radio className="w-4 h-4" aria-hidden />
              <span>🚨 Send Emergency SOS</span>
            </button>
          )}

          <Link
            href="/radar"
            className="px-5 py-2.5 rounded-2xl bg-[#faf9f5] hover:bg-slate-100 text-slate-900 border border-slate-300 font-extrabold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
          >
            <span>Open Live Tactical Map</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        </div>
      </div>

      {/* 3 Simple Supporting Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#faf9f5] border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Water Depth
          </span>
          <div className="text-lg font-black text-slate-950 mt-1">
            {prediction.telemetry?.river_level_m.toFixed(1)} meters
          </div>
          <p className="text-[11px] text-slate-600 font-medium mt-0.5">
            Danger Mark: {prediction.danger_mark_m}m
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#faf9f5] border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Catchment Rain
          </span>
          <div className="text-lg font-black text-slate-950 mt-1">
            {prediction.telemetry?.rainfall_mm.toFixed(1)} mm/hr
          </div>
          <p className="text-[11px] text-slate-600 font-medium mt-0.5">
            Soil Saturation: {prediction.telemetry?.soil_moisture_pct.toFixed(0)}%
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#faf9f5] border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Response Time
          </span>
          <div className="text-lg font-black text-slate-950 mt-1">
            ~{Math.round(prediction.lead_time_minutes / 60)} hours lead time
          </div>
          <p className="text-[11px] text-slate-600 font-medium mt-0.5">
            Before peak surge arrival
          </p>
        </div>
      </div>

    </div>
  );
}
