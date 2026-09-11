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
}

export default function NationalSentinelRadar({
  scanData,
  loading,
  onRefreshScan,
  selectedZone,
  onSelectZoneById,
  autoDispatchEnabled,
  onToggleAutoDispatch,
}: NationalSentinelRadarProps) {
  const criticalCount = scanData?.critical_zones_count ?? 0;
  const warningCount = scanData?.warning_zones_count ?? 0;
  const totalScanned = scanData?.total_zones_scanned ?? 12;

  const recentDispatches = scanData?.recent_auto_sos_dispatches ?? [];

  return (
    <div className="w-full glass-panel border-b border-white/60 px-4 lg:px-8 py-3.5 space-y-3 shadow-md">
      {/* Top Banner: Status + Autonomous Mode Controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 max-w-[1800px] mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-950 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                All-India Autonomous Sentinel
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 shadow-sm">
                {criticalCount} Critical Threats Detected
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
                {warningCount} Under Warning
              </span>
            </div>
          </div>

          <span className="text-slate-400 hidden md:inline">|</span>

          <span className="text-xs text-slate-700 font-bold">
            Active Scan: {totalScanned} River Basins • 8 States Across India
          </span>
        </div>

        {/* Right: Auto-SOS Toggle & Scan Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleAutoDispatch}
            aria-label="Toggle autonomous SOS dispatch"
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 min-h-[44px] border shadow-sm ${
              autoDispatchEnabled
                ? "bg-emerald-100/90 text-emerald-900 border-emerald-400"
                : "bg-white/80 text-slate-700 border-slate-300 hover:bg-white"
            }`}
          >
            <BellRing className={`w-3.5 h-3.5 ${autoDispatchEnabled ? "text-emerald-700 animate-pulse" : "text-slate-400"}`} aria-hidden />
            <span>Autonomous Auto-SOS: {autoDispatchEnabled ? "ARMED" : "MANUAL"}</span>
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

      {/* Autonomous Alert Notification Ticker (When an Auto-SOS was dispatched) */}
      {recentDispatches.length > 0 && (
        <div className="max-w-[1800px] mx-auto p-3.5 rounded-2xl bg-red-100/90 border border-red-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs text-red-950">
            <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse shrink-0" aria-hidden />
            <div>
              <strong className="font-black text-red-900">🚨 AUTONOMOUS ZERO-MINUTE SOS DISPATCHED:</strong>{" "}
              <span className="font-semibold">{recentDispatches[0].message}</span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-red-800 whitespace-nowrap bg-white/70 px-2 py-0.5 rounded-lg border border-red-200">
            Auto-pushed to ~{recentDispatches[0].target_nodes_count} citizen devices
          </span>
        </div>
      )}

      {/* Horizontal All-India Threat Radar Ribbon */}
      <div className="max-w-[1800px] mx-auto overflow-x-auto pb-1">
        <div className="flex items-stretch gap-2.5 min-w-max">
          {scanData?.zones.map((zone) => {
            const isSelected = selectedZone.id === zone.zone_id;
            const isRed = zone.alert_color === "RED";
            const isOrange = zone.alert_color === "ORANGE";

            return (
              <button
                key={zone.zone_id}
                onClick={() => onSelectZoneById(zone.zone_id)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between w-[200px] min-h-[80px] shadow-sm ${
                  isSelected
                    ? "bg-violet-100/90 border-violet-500 ring-2 ring-violet-400 shadow-md"
                    : isRed
                    ? "backdrop-blur-md bg-red-50/80 border-red-300 hover:bg-red-100/90"
                    : isOrange
                    ? "backdrop-blur-md bg-amber-50/80 border-amber-300 hover:bg-amber-100/90"
                    : "backdrop-blur-md bg-white/75 border-white/80 hover:bg-white/95"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-600 truncate max-w-[110px]">
                      {zone.state}
                    </span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase shadow-xs ${
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

                  <div className="text-xs font-black text-slate-950 line-clamp-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {zone.zone_name.split("(")[0].trim()}
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px]">
                  <span className="text-slate-600 font-semibold">
                    Stage: <strong className="text-slate-900 font-black">{zone.river_level_m.toFixed(1)}m</strong>
                  </span>
                  {zone.auto_dispatched && (
                    <span className="text-red-700 font-black flex items-center gap-0.5 bg-red-100 px-1 rounded">
                      <Radio className="w-2.5 h-2.5 animate-ping" aria-hidden /> SOS
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
