"use client";

import React from "react";
import { NationalSentinelScan, HazardZone } from "@/lib/types";
import {
  Radio,
  Zap,
  RefreshCw,
  AlertTriangle,
  Navigation,
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

// User-specified alert color-coding: Red >= 70%, Yellow 35-69%, Green < 35%
function getRiskBadgeClasses(prob: number) {
  if (prob >= 70) {
    return "bg-red-50 text-red-700 border border-red-300 font-black";
  }
  if (prob >= 35) {
    return "bg-amber-50 text-amber-800 border border-amber-300 font-black";
  }
  return "bg-emerald-50 text-emerald-800 border border-emerald-300 font-black";
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
      <div className="space-y-2.5 p-1 font-sans text-slate-900">
        {/* Compact Top Status */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="font-extrabold text-slate-950 uppercase text-[11px] font-display">
              All-India River Basins
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-300">
              {criticalCount} HIGH ALERT
            </span>
          </div>

          <button
            onClick={onRefreshScan}
            disabled={loading}
            className="h-[28px] px-2.5 rounded-xl bg-[#faf9f5] hover:bg-slate-100 text-slate-900 border border-slate-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition shadow-2xs"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* 12-Basin Compact Grid */}
        <div className="grid grid-cols-2 gap-2 max-h-[560px] overflow-y-auto pr-1">
          {scanData?.zones.map((zone) => {
            const isSelected = selectedZone.id === zone.zone_id;

            return (
              <button
                key={zone.zone_id}
                onClick={() => onSelectZoneById(zone.zone_id)}
                className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between shadow-2xs ${
                  isSelected
                    ? "bg-white border-slate-950 ring-2 ring-slate-950/20 text-slate-950 shadow-sm"
                    : "bg-[#faf9f5] border-slate-200 hover:border-slate-300 text-slate-900"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-slate-500 truncate">
                      {zone.state}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full ${getRiskBadgeClasses(
                        zone.flood_probability_percent
                      )}`}
                    >
                      {zone.flood_probability_percent.toFixed(0)}%
                    </span>
                  </div>

                  <div className="text-[11px] font-extrabold text-slate-950 truncate">
                    {zone.river_basin}
                  </div>
                </div>

                <div className="text-[9px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>{zone.district}</span>
                  <span className="font-mono text-slate-700 font-bold">{zone.river_level_m}m</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Full Expanded View
  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 text-slate-900 font-sans shadow-sm space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h3 className="text-base font-extrabold text-slate-950 uppercase tracking-wider font-display">
              All-India 12 River Basins
            </h3>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-300">
              {criticalCount} HIGH ALERT
            </span>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
              {warningCount} WARNING
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium">
            Click any river basin card to instantly switch radar monitoring and live telemetry.
          </p>
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Autonomous SOS Toggle */}
          <button
            onClick={onToggleAutoDispatch}
            aria-label={
              autoDispatchEnabled
                ? "Disable Autonomous SOS Dispatch"
                : "Enable Autonomous SOS Dispatch"
            }
            className={`h-[34px] px-3.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-2xs border ${
              autoDispatchEnabled
                ? "bg-red-50 text-red-700 border-red-300"
                : "bg-[#faf9f5] text-slate-600 border-slate-300"
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${autoDispatchEnabled ? "text-red-600" : "text-slate-400"}`} />
            <span>Autonomous SOS: {autoDispatchEnabled ? "ENABLED" : "PAUSED"}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefreshScan}
            disabled={loading}
            aria-label="Refresh National River Basins Scan"
            className="h-[34px] px-3.5 rounded-xl bg-[#faf9f5] hover:bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh All</span>
          </button>
        </div>
      </div>

      {/* Active Live Location Spotlight (when user location is active) */}
      {selectedZone.id === "live_user_location" && (
        <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                  📍 YOUR REAL-TIME LIVE LOCATION
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 border border-emerald-400">
                  LIVE INTERNET GPS
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-950 mt-0.5">
                {selectedZone.name}
              </h4>
              <p className="text-xs text-slate-700">
                Live Open-Meteo precipitation, river drainage &amp; USGS seismic signals streaming directly for your coordinates.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-800 self-end sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
            Active Focus
          </span>
        </div>
      )}

      {/* 12-Basin Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {scanData?.zones.map((zone) => {
          const isSelected = selectedZone.id === zone.zone_id;
          const isDanger = zone.flood_probability_percent >= 70;

          return (
            <button
              key={zone.zone_id}
              onClick={() => onSelectZoneById(zone.zone_id)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between shadow-2xs ${
                isSelected
                  ? "bg-white border-slate-950 ring-2 ring-slate-950/20 text-slate-950 shadow-sm"
                  : "bg-[#faf9f5] border-slate-200 hover:border-slate-300 hover:bg-[#f6f4ee] text-slate-900"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 truncate">
                    {zone.state}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${getRiskBadgeClasses(
                      zone.flood_probability_percent
                    )}`}
                  >
                    {zone.flood_probability_percent.toFixed(0)}%
                  </span>
                </div>

                <h4 className="text-xs font-black text-slate-950 line-clamp-1 mb-1">
                  {zone.river_basin}
                </h4>

                <p className="text-[10px] text-slate-600 line-clamp-1 font-medium">
                  {zone.district}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/80 mt-2 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Water Level</span>
                <span className="font-mono font-bold text-slate-900">{zone.river_level_m}m</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent Autonomous SOS Dispatches */}
      {recentDispatches.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-600 animate-pulse" />
            <span className="text-xs font-black text-red-900 uppercase tracking-wider">
              Autonomous Early Warning Dispatches Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {recentDispatches.slice(0, 2).map((d) => (
              <div
                key={d.alert_id}
                className="p-3 rounded-xl bg-white border border-red-200 space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between text-red-900 font-bold">
                  <span>🚨 {d.zone_name}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {new Date(d.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 font-medium line-clamp-2">
                  {d.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
