"use client";

import React, { useState } from "react";
import { CitizenLocation } from "@/lib/types";
import {
  Radio,
  Battery,
  AlertTriangle,
  Crosshair,
  Send,
  CheckCircle2,
  Share2,
  Phone,
  Activity,
} from "lucide-react";

interface CitizenTrackingMatrixProps {
  citizens: CitizenLocation[];
  onFocusCoordinates?: (coords: [number, number]) => void;
  onDispatchToCitizen?: (citizen: CitizenLocation) => void;
  compact?: boolean;
}

export default function CitizenTrackingMatrix({
  citizens,
  onFocusCoordinates,
  onDispatchToCitizen,
  compact = false,
}: CitizenTrackingMatrixProps) {
  const [filter, setFilter] = useState<"ALL" | "LIVE" | "LAST_KNOWN" | "CRITICAL">("ALL");
  const [dispatchSuccessId, setDispatchSuccessId] = useState<string | null>(null);

  const liveCitizens = citizens.filter((c) => c.is_live);
  const lastKnownCitizens = citizens.filter((c) => !c.is_live);
  const criticalCitizens = citizens.filter(
    (c) => c.status === "SOS" && (c.medical_distress || !c.is_live)
  );

  const filteredList =
    filter === "LIVE"
      ? liveCitizens
      : filter === "LAST_KNOWN"
      ? lastKnownCitizens
      : filter === "CRITICAL"
      ? criticalCitizens
      : citizens;

  const handleDispatch = (cit: CitizenLocation) => {
    if (onDispatchToCitizen) {
      onDispatchToCitizen(cit);
    }
    setDispatchSuccessId(cit.id);
    setTimeout(() => setDispatchSuccessId(null), 3000);
  };

  return (
    <div className={`flex flex-col ${compact ? "space-y-2.5 p-1" : "tilt-card rounded-2xl bg-[#1b2027]/75 shadow-sm border border-white/10 p-5 space-y-4 text-white font-sans"}`}>
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
            <Radio className="w-3.5 h-3.5 animate-pulse" aria-hidden />
          </div>
          <div>
            <div className="corwdy-subtitle">
              <span>/CITIZEN DISTRESS MATRIX</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/40 uppercase tracking-wider">
                {criticalCitizens.length} URGENT
              </span>
            </div>
            <p className="text-[11px] text-white/60 font-sans mt-0.5">
              Live GPS pings &amp; offline BLE mesh relay beacons
            </p>
          </div>
        </div>

        {/* Compact Filter Pills (Corwdy Capsule Pill Tabs) */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 text-[10px] uppercase font-bold tracking-wider">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-full transition ${
              filter === "ALL"
                ? "bg-white text-[#161a20] shadow-md font-bold"
                : "text-white/60 hover:text-white"
            }`}
          >
            All ({citizens.length})
          </button>
          <button
            onClick={() => setFilter("LIVE")}
            className={`px-3 py-1 rounded-full transition ${
              filter === "LIVE"
                ? "bg-emerald-500 text-[#161a20] shadow-md font-bold"
                : "text-emerald-400 hover:text-white"
            }`}
          >
            Live ({liveCitizens.length})
          </button>
          <button
            onClick={() => setFilter("LAST_KNOWN")}
            className={`px-3 py-1 rounded-full transition ${
              filter === "LAST_KNOWN"
                ? "bg-amber-400 text-[#161a20] shadow-md font-bold"
                : "text-amber-300 hover:text-white"
            }`}
          >
            Offline ({lastKnownCitizens.length})
          </button>
          <button
            onClick={() => setFilter("CRITICAL")}
            className={`px-3 py-1 rounded-full transition ${
              filter === "CRITICAL"
                ? "bg-red-600 text-white shadow-md font-bold"
                : "text-red-400 hover:text-white"
            }`}
          >
            P1 ({criticalCitizens.length})
          </button>
        </div>
      </div>

      {/* High-Density Scannable Rows */}
      <div className={`space-y-2.5 overflow-y-auto pr-1 ${compact ? "max-h-[560px]" : "max-h-[480px]"}`}>
        {filteredList.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/50">
            No distress signals found matching this filter.
          </div>
        ) : (
          filteredList.map((citizen) => {
            const isJustDispatched = dispatchSuccessId === citizen.id;

            return (
              <div
                key={citizen.id}
                className={`p-3.5 rounded-2xl border transition-all relative ${
                  citizen.is_live
                    ? "bg-[#161a20]/85 border-white/10 hover:border-emerald-400/50"
                    : "bg-[#161a20]/85 border-amber-500/25 hover:border-amber-400/50"
                } shadow-sm text-white font-sans`}
              >
                {/* Row Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        citizen.is_live
                          ? "bg-emerald-400 animate-pulse ring-2 ring-emerald-400/40"
                          : "bg-amber-400"
                      }`}
                    />
                    <span className="text-xs font-bold text-white truncate font-display">
                      {citizen.name || `Citizen [${citizen.device_uuid.slice(0, 8)}]`}
                    </span>
                    {citizen.phone && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-white/50 font-mono">
                        <Phone className="w-2.5 h-2.5" />
                        {citizen.phone}
                      </span>
                    )}
                  </div>

                  {/* Battery & Status Badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] font-mono font-semibold text-white/80 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                      <Battery
                        className={`w-3 h-3 ${
                          citizen.battery_pct < 25
                            ? "text-red-400 animate-pulse"
                            : citizen.battery_pct < 50
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                        aria-hidden
                      />
                      <span>{citizen.battery_pct}%</span>
                    </div>

                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        citizen.is_live
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                      }`}
                    >
                      {citizen.is_live ? "LIVE" : `${citizen.last_seen_minutes_ago || 15}m AGO`}
                    </span>
                  </div>
                </div>

                {/* Sub-line: Distress type + Location info */}
                <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-white/70">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-medium text-white truncate">
                      {citizen.sos_type || "Water Rising Inundation"}
                    </span>
                    {citizen.medical_distress && citizen.medical_distress !== "NONE" && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white shrink-0 uppercase tracking-wider">
                        {citizen.medical_distress.replace("_", " ")}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-white/50 shrink-0">
                    {citizen.lat.toFixed(3)}°, {citizen.lng.toFixed(3)}°
                    {citizen.is_live ? ` (±${citizen.accuracy_radius_m || 12}m)` : ` (±${citizen.drift_radius_m || 350}m drift)`}
                  </span>
                </div>

                {/* Offline BLE Relay Chain if applicable */}
                {!citizen.is_live && citizen.mesh_relay_chain && (
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-amber-300/90 font-mono">
                    <span className="flex items-center gap-1.5 truncate">
                      <Share2 className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{citizen.mesh_relay_chain.join(" ➔ ")}</span>
                    </span>
                    <span className="text-[9px] text-white/50 shrink-0">
                      {citizen.mesh_hops || 2} Hops
                    </span>
                  </div>
                )}

                {/* Compact Action Buttons */}
                <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/10">
                  <button
                    onClick={() => onFocusCoordinates && onFocusCoordinates([citizen.lat, citizen.lng])}
                    className="btn-solid-dark flex-1 h-[34px] text-[10px]"
                  >
                    <Crosshair className="w-3 h-3 text-white" aria-hidden />
                    <span>Locate</span>
                  </button>

                  <button
                    onClick={() => handleDispatch(citizen)}
                    disabled={isJustDispatched}
                    className={`flex-1 h-[34px] ${
                      isJustDispatched
                        ? "btn-solid-emerald text-[10px]"
                        : "btn-solid-danger text-[10px]"
                    }`}
                  >
                    {isJustDispatched ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-white" aria-hidden />
                        <span>Dispatched</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 text-white" aria-hidden />
                        <span>Dispatch Unit</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
