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
    <div className={`flex flex-col ${compact ? "space-y-2.5 p-1" : "tilt-card rounded-2xl glass-panel shadow-sm border border-white/60 p-4 space-y-3"}`}>
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
            <Radio className="w-3.5 h-3.5 animate-pulse" aria-hidden />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span>Citizen Distress Telemetry</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 font-bold border border-red-200">
                {criticalCitizens.length} URGENT
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Live GPS pings & offline BLE mesh relays
            </p>
          </div>
        </div>

        {/* Compact Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200 text-[11px]">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-2 py-1 rounded-md font-medium transition ${
              filter === "ALL"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({citizens.length})
          </button>
          <button
            onClick={() => setFilter("LIVE")}
            className={`px-2 py-1 rounded-md font-medium transition ${
              filter === "LIVE"
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "text-emerald-700 hover:text-emerald-900"
            }`}
          >
            Live ({liveCitizens.length})
          </button>
          <button
            onClick={() => setFilter("LAST_KNOWN")}
            className={`px-2 py-1 rounded-md font-medium transition ${
              filter === "LAST_KNOWN"
                ? "bg-amber-500 text-white shadow-xs font-semibold"
                : "text-amber-800 hover:text-amber-950"
            }`}
          >
            Offline ({lastKnownCitizens.length})
          </button>
          <button
            onClick={() => setFilter("CRITICAL")}
            className={`px-2 py-1 rounded-md font-medium transition ${
              filter === "CRITICAL"
                ? "bg-red-600 text-white shadow-xs font-semibold"
                : "text-red-700 hover:text-red-900"
            }`}
          >
            P1 ({criticalCitizens.length})
          </button>
        </div>
      </div>

      {/* High-Density Scannable Rows */}
      <div className={`space-y-2 overflow-y-auto pr-1 ${compact ? "max-h-[560px]" : "max-h-[480px]"}`}>
        {filteredList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No distress signals found matching this filter.
          </div>
        ) : (
          filteredList.map((citizen) => {
            const isJustDispatched = dispatchSuccessId === citizen.id;

            return (
              <div
                key={citizen.id}
                className={`p-2.5 rounded-xl border transition-all relative ${
                  citizen.is_live
                    ? "bg-white/85 border-emerald-200/80 hover:border-emerald-400"
                    : "bg-amber-50/80 border-amber-200/80 hover:border-amber-400"
                } shadow-xs hover:shadow-sm`}
              >
                {/* Row Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        citizen.is_live
                          ? "bg-emerald-500 animate-pulse ring-2 ring-emerald-300/60"
                          : "bg-amber-500"
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {citizen.name || `Citizen [${citizen.device_uuid.slice(0, 8)}]`}
                    </span>
                    {citizen.phone && (
                      <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-slate-500 font-mono">
                        <Phone className="w-2.5 h-2.5" />
                        {citizen.phone}
                      </span>
                    )}
                  </div>

                  {/* Battery & Status Badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-700 bg-white/90 px-1.5 py-0.5 rounded border border-slate-200">
                      <Battery
                        className={`w-3 h-3 ${
                          citizen.battery_pct < 25
                            ? "text-red-600 animate-pulse"
                            : citizen.battery_pct < 50
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                        aria-hidden
                      />
                      <span>{citizen.battery_pct}%</span>
                    </div>

                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        citizen.is_live
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {citizen.is_live ? "LIVE" : `${citizen.last_seen_minutes_ago || 15}m AGO`}
                    </span>
                  </div>
                </div>

                {/* Sub-line: Distress type + Location info */}
                <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-medium text-slate-800 truncate">
                      {citizen.sos_type || "Water Rising Inundation"}
                    </span>
                    {citizen.medical_distress && citizen.medical_distress !== "NONE" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-600 text-white shrink-0">
                        {citizen.medical_distress.replace("_", " ")}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {citizen.lat.toFixed(3)}°, {citizen.lng.toFixed(3)}°
                    {citizen.is_live ? ` (±${citizen.accuracy_radius_m || 12}m)` : ` (±${citizen.drift_radius_m || 350}m drift)`}
                  </span>
                </div>

                {/* Offline BLE Relay Chain if applicable */}
                {!citizen.is_live && citizen.mesh_relay_chain && (
                  <div className="mt-1.5 pt-1.5 border-t border-amber-200/60 flex items-center justify-between text-[10px] text-amber-900 font-mono">
                    <span className="flex items-center gap-1 truncate">
                      <Share2 className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                      <span className="truncate">{citizen.mesh_relay_chain.join(" ➔ ")}</span>
                    </span>
                    <span className="text-[9px] text-slate-500 shrink-0">
                      {citizen.mesh_hops || 2} Hops
                    </span>
                  </div>
                )}

                {/* Compact Action Buttons */}
                <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-200/60">
                  <button
                    onClick={() => onFocusCoordinates && onFocusCoordinates([citizen.lat, citizen.lng])}
                    className="flex-1 h-[30px] px-2 rounded-lg text-[11px] font-semibold text-slate-800 bg-white/90 hover:bg-white hover:text-slate-950 border border-slate-300 transition flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <Crosshair className="w-3 h-3 text-indigo-600" aria-hidden />
                    <span>Locate</span>
                  </button>

                  <button
                    onClick={() => handleDispatch(citizen)}
                    disabled={isJustDispatched}
                    className={`flex-1 h-[30px] px-2 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 shadow-2xs ${
                      isJustDispatched
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
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
