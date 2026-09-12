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
      <div className="p-8 rounded-3xl glass-card animate-pulse flex flex-col gap-4 text-slate-900">
        <div className="h-6 w-1/3 bg-slate-200/60 rounded-lg"></div>
        <div className="h-28 bg-slate-200/60 rounded-2xl"></div>
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
    ? "bg-red-500/10 text-red-700 border border-red-500/30"
    : isWarning
    ? "bg-amber-500/10 text-amber-700 border border-amber-500/30"
    : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30";

  const statusTitle = isDanger
    ? "🚨 Severe Flood Alert — Move to High Ground"
    : isWarning
    ? "⚠️ Flood Warning — River Rising Rapidly"
    : "✅ Conditions Normal — No Immediate Threat";

  const plainExplanation = isDanger
    ? `Continuous rainfall has swollen the river to ${prediction.telemetry?.river_level_m.toFixed(1)}m, close to the ${prediction.danger_mark_m}m danger mark. Risk of flash flood is high.`
    : isWarning
    ? `Rainfall in the upper hills is causing river water to rise. Stay alert and keep emergency supplies ready.`
    : `River water levels and mountain slopes are currently stable. No flood or landslide warnings in this basin.`;

  const currentDepth = prediction.telemetry?.river_level_m ?? 0;
  const dangerMark = prediction.danger_mark_m || 5.0;
  const warningMark = prediction.warning_mark_m || (dangerMark * 0.7);
  const depthPercentage = Math.min(100, Math.max(0, (currentDepth / dangerMark) * 100));
  const isDepthExceeded = currentDepth >= warningMark || isDanger;

  return (
    <div className="p-6 sm:p-7 rounded-3xl glass-card text-slate-800 font-sans space-y-6">
      
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${riskBadgeClass}`}>
            {isDanger ? "High Alert" : isWarning ? "Medium Risk" : "Safe Zone"}
          </span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {prediction.zone_name || prediction.zone_id}
          </span>
        </div>

        {/* Refresh button with live provider tag */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot-green" />
            <span>{prediction.active_provider || "Live Telemetry Feed"}</span>
          </span>

          <button
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh live flood telemetry"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center transition shadow-2xs cursor-pointer"
            title="Refresh live data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Big Number and Risk Level with enhanced Alert Hierarchy */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/80">
        <div className="space-y-2.5">
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl sm:text-5xl lg:text-6xl font-black font-mono tracking-tight ${riskColor}`}>
              {prob.toFixed(0)}%
            </span>
            <div className="space-y-0.5">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500 block">
                Flood Probability
              </span>
              <span className="text-xs font-semibold text-slate-700">
                Next 3 to 6 Hours
              </span>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-[900] tracking-tight text-slate-800 font-sans leading-tight">
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
              className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-[#f8fafc] font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Radio className="w-4 h-4" aria-hidden />
              <span>🚨 Send Emergency SOS</span>
            </button>
          )}

          <Link
            href="/radar"
            className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-[#f8fafc] border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition"
          >
            <span>Open Live Tactical Map</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          </Link>
        </div>
      </div>

      {/* Merged 3-Column Supporting Metrics Container with Vertical Dividers */}
      <div className="rounded-2xl bg-[#f1f5f9]/90 border border-slate-200/90 p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200/90 gap-4 md:gap-0 shadow-xs">
        
        {/* Column 1: Water Depth with Visual Progress Bar */}
        <div className="md:px-4 first:md:pl-1 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Water Depth
          </span>
          <div className="text-xl font-black font-mono text-slate-800 flex items-baseline gap-1.5">
            <span>{currentDepth.toFixed(1)}</span>
            <span className="text-xs font-semibold text-slate-500 font-sans">meters</span>
          </div>

          {/* Thin Horizontal Visual Progress Bar */}
          <div className="space-y-1 pt-0.5">
            <div className="w-full bg-slate-200/90 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isDepthExceeded ? "bg-red-500" : "bg-emerald-500"
                }`}
                style={{ width: `${depthPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>{depthPercentage.toFixed(0)}% of limit</span>
              <span className={isDepthExceeded ? "text-red-600 font-bold" : "text-slate-500"}>
                Limit: {dangerMark}m
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium">
            Danger Mark: <span className="font-mono font-semibold text-slate-700">{dangerMark}m</span>
          </p>
        </div>

        {/* Column 2: Catchment Rain */}
        <div className="md:px-5 pt-3 md:pt-0 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Catchment Rain
          </span>
          <div className="text-xl font-black font-mono text-slate-800 flex items-baseline gap-1.5">
            <span>{prediction.telemetry?.rainfall_mm.toFixed(1)}</span>
            <span className="text-xs font-semibold text-slate-500 font-sans">mm/hr</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium pt-3">
            Soil Saturation:{" "}
            <span className="font-mono font-semibold text-slate-700">
              {prediction.telemetry?.soil_moisture_pct.toFixed(0)}%
            </span>
          </p>
        </div>

        {/* Column 3: Response Time */}
        <div className="md:px-5 pt-3 md:pt-0 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Response Time
          </span>
          <div className="text-xl font-black font-mono text-slate-800 flex items-baseline gap-1.5">
            <span>~{Math.round(prediction.lead_time_minutes / 60)}</span>
            <span className="text-xs font-semibold text-slate-500 font-sans">hours lead time</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium pt-3">
            Before peak hydrological surge arrival
          </p>
        </div>

      </div>

    </div>
  );
}
