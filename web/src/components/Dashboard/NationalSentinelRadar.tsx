"use client";

import React from "react";
import { NationalSentinelScan, ScannedZoneSummary, HazardZone } from "@/lib/types";
import {
  ShieldAlert,
  Radio,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Globe,
  BellRing,
} from "lucide-react";

interface NationalSentinelRadarProps {
  scanData: NationalSentinelScan | null;
  loading: boolean;
  onRefreshScan: () => void;
  selectedZone: HazardZone;
  onSelectZoneById: (zoneId: string) => void;
  autoDispatchEnabled: boolean;
  onToggleAutoDispatch: () => void;
  compact?: boolean;
}

export default function NationalSentinelRadar({
  scanData,
  loading,
  onRefreshScan,
  selectedZone,
  onSelectZoneById,
  autoDispatchEnabled,
  onToggleAutoDispatch,
  compact = false,
}: NationalSentinelRadarProps) {
  const criticalCount = scanData?.critical_zones_count ?? 0;
  const warningCount = scanData?.warning_zones_count ?? 0;
  const recentDispatches = scanData?.recent_auto_sos_dispatches ?? [];

  if (compact) {
    return (
      <div className="space-y-2.5 p-1">
        {/* Compact Top Status */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
            </span>
            <span className="font-bold text-slate-900 uppercase text-[11px]">Pan-India Sentinel (12 Basins)</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-200">
              {criticalCount} RED
            </span>
          </div>

          <button
            onClick={onRefreshScan}
            disabled={loading}
            className="h-[28px] px-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-[11px] font-medium flex items-center gap-1 shadow-2xs"
          >
            <RefreshCw className={`w-3 h-3 text-indigo-600 ${loading ? "animate-spin" : ""}`} />
            <span>Rescan</span>
          </button>
        </div>

        {/* 12-Basin Compact Grid */}
        <div className="grid grid-cols-2 gap-2 max-h-[560px] overflow-y-auto pr-1">
          {scanData?.zones.map((zone) => {
            const isSelected = selectedZone.id === zone.zone_id;
            const isRed = zone.alert_color === "RED";
            const isOrange = zone.alert_color === "ORANGE";

            return (
              <button
                key={zone.zone_id}
                onClick={() => onSelectZoneById(zone.zone_id)}
                className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between shadow-2xs ${
                  isSelected
                    ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-400/70"
                    : isRed
                    ? "bg-red-50/90 border-red-200 hover:border-red-400"
                    : isOrange
                    ? "bg-amber-50/90 border-amber-200 hover:border-amber-400"
                    : "bg-white/85 border-slate-200/80 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-bold uppercase text-slate-500 truncate">
                      {zone.state}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                        isRed
                          ? "bg-red-600 text-white"
                          : isOrange
                          ? "bg-amber-500 text-slate-950"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {zone.flood_probability_percent.toFixed(0)}%
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-950 line-clamp-1">
                    {zone.zone_name.split("(")[0].trim()}
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>Stage: <strong className="text-slate-900 font-semibold">{zone.river_level_m.toFixed(1)}m</strong></span>
                  {zone.auto_dispatched && (
                    <span className="text-red-600 font-bold flex items-center gap-0.5">
                      <Radio className="w-2.5 h-2.5 animate-ping" /> SOS
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-950/25 backdrop-blur-md rounded-xl border border-white/15 px-4 lg:px-6 py-3.5 space-y-3 shadow-md">
      {/* Top Banner: Status + Autonomous Mode Controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 max-w-[1800px] mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                All-India Autonomous Sentinel
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/25 text-red-300 border border-red-500/40 shadow-xs">
                {criticalCount} Critical Threats Detected
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-xs">
                {warningCount} Under Warning
              </span>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleAutoDispatch}
            aria-label="Toggle autonomous SOS auto-dispatch mode"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[36px] shadow-sm ${
              autoDispatchEnabled
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-white/10 text-slate-300 hover:bg-white/20 border border-white/15"
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${autoDispatchEnabled ? "fill-white" : ""}`} aria-hidden />
            <span>{autoDispatchEnabled ? "Auto-SOS Active" : "Auto-SOS Off"}</span>
          </button>

          <button
            onClick={onRefreshScan}
            disabled={loading}
            aria-label="Run nationwide scan now"
            className="btn-solid-primary text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
            <span>Scan All India Now</span>
          </button>
        </div>
      </div>

      {/* Autonomous Alert Notification Ticker */}
      {recentDispatches.length > 0 && (
        <div className="max-w-[1800px] mx-auto p-3 rounded-xl bg-red-950/40 border border-red-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm text-white">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse shrink-0" aria-hidden />
            <div>
              <strong className="font-bold text-red-300">🚨 AUTONOMOUS ZERO-MINUTE SOS:</strong>{" "}
              <span className="font-medium text-slate-200">{recentDispatches[0].message}</span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-red-300 whitespace-nowrap bg-red-900/40 px-2 py-0.5 rounded-lg border border-red-500/40">
            Pushed to ~{recentDispatches[0].target_nodes_count} devices
          </span>
        </div>
      )}

      {/* Horizontal All-India Threat Radar Ribbon */}
      <div className="max-w-[1800px] mx-auto overflow-x-auto pb-1">
        <div className="flex items-stretch gap-2 min-w-max">
          {scanData?.zones.map((zone) => {
            const isSelected = selectedZone.id === zone.zone_id;
            const isRed = zone.alert_color === "RED";
            const isOrange = zone.alert_color === "ORANGE";

            return (
              <button
                key={zone.zone_id}
                onClick={() => onSelectZoneById(zone.zone_id)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between w-[180px] shadow-xs backdrop-blur-md ${
                  isSelected
                    ? "bg-indigo-600/35 border-indigo-400 ring-2 ring-indigo-400/80 text-white"
                    : isRed
                    ? "bg-red-950/30 border-red-500/40 hover:bg-red-950/50 text-white"
                    : isOrange
                    ? "bg-amber-950/30 border-amber-500/40 hover:bg-amber-950/50 text-white"
                    : "bg-white/10 border-white/15 hover:bg-white/20 text-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400 truncate max-w-[100px]">
                      {zone.state}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase shadow-xs ${
                        isRed
                          ? "bg-red-600 text-white"
                          : isOrange
                          ? "bg-amber-500 text-slate-950"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {zone.flood_probability_percent.toFixed(0)}%
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white line-clamp-1">
                    {zone.zone_name.split("(")[0].trim()}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-300">
                  <span>Stage: <strong className="text-white font-bold">{zone.river_level_m.toFixed(1)}m</strong></span>
                  {zone.auto_dispatched && (
                    <span className="text-red-400 font-bold flex items-center gap-0.5">
                      <Radio className="w-2.5 h-2.5 animate-ping" /> SOS
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
