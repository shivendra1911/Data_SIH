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
    <div className="w-full bg-white border-b border-gray-200 px-4 lg:px-8 py-3.5 space-y-3">
      {/* Top Banner: Status + Autonomous Mode Controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 max-w-[1800px] mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                All-India Autonomous Sentinel
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                {criticalCount} Critical Threats Detected
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {warningCount} Under Warning
              </span>
            </div>
          </div>

          <span className="text-gray-300 hidden md:inline">|</span>

          <span className="text-xs text-gray-500 font-medium">
            Active Scan: {totalScanned} River Basins • 8 States Across India
          </span>
        </div>

        {/* Right: Auto-SOS Toggle & Scan Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleAutoDispatch}
            aria-label="Toggle autonomous SOS dispatch"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 min-h-[38px] border ${
              autoDispatchEnabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            <BellRing className={`w-3.5 h-3.5 ${autoDispatchEnabled ? "text-emerald-600 animate-pulse" : "text-gray-400"}`} aria-hidden />
            <span>Autonomous Auto-SOS: {autoDispatchEnabled ? "ARMED" : "MANUAL"}</span>
          </button>

          <button
            onClick={onRefreshScan}
            disabled={loading}
            aria-label="Run nationwide scan now"
            className="px-3 py-1.5 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm min-h-[38px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
            <span>Scan All India Now</span>
          </button>
        </div>
      </div>

      {/* Autonomous Alert Notification Ticker (When an Auto-SOS was dispatched) */}
      {recentDispatches.length > 0 && (
        <div className="max-w-[1800px] mx-auto p-3 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 text-xs text-red-950">
            <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse shrink-0" aria-hidden />
            <div>
              <strong className="font-bold text-red-700">🚨 AUTONOMOUS ZERO-MINUTE SOS DISPATCHED:</strong>{" "}
              <span>{recentDispatches[0].message}</span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-red-700 whitespace-nowrap">
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
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between w-[200px] min-h-[76px] ${
                  isSelected
                    ? "bg-violet-50/80 border-violet-400 ring-2 ring-violet-300 shadow-sm"
                    : isRed
                    ? "bg-red-50/50 border-red-200 hover:border-red-300"
                    : isOrange
                    ? "bg-amber-50/40 border-amber-200 hover:border-amber-300"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 truncate max-w-[110px]">
                      {zone.state}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                        isRed
                          ? "bg-red-600 text-white"
                          : isOrange
                          ? "bg-amber-500 text-gray-900"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {zone.flood_probability_percent.toFixed(0)}%
                    </span>
                  </div>

                  <div className="text-xs font-bold text-gray-900 line-clamp-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {zone.zone_name.split("(")[0].trim()}
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px]">
                  <span className="text-gray-500">
                    Stage: <strong className="text-gray-700">{zone.river_level_m.toFixed(1)}m</strong>
                  </span>
                  {zone.auto_dispatched && (
                    <span className="text-red-700 font-bold flex items-center gap-0.5">
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
