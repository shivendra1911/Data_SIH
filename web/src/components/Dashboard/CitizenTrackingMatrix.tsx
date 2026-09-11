"use client";

import React, { useState } from "react";
import { CitizenLocation } from "@/lib/types";
import {
  Users,
  Radio,
  Clock,
  Compass,
  Battery,
  AlertTriangle,
  ChevronRight,
  Crosshair,
  ShieldAlert,
  Send,
  CheckCircle2,
  Share2,
} from "lucide-react";

interface CitizenTrackingMatrixProps {
  citizens: CitizenLocation[];
  onFocusCoordinates?: (coords: [number, number]) => void;
  onDispatchToCitizen?: (citizen: CitizenLocation) => void;
}

export default function CitizenTrackingMatrix({
  citizens,
  onFocusCoordinates,
  onDispatchToCitizen,
}: CitizenTrackingMatrixProps) {
  const [filter, setFilter] = useState<"ALL" | "LIVE" | "LAST_KNOWN" | "CRITICAL">("ALL");
  const [selectedCitizen, setSelectedCitizen] = useState<CitizenLocation | null>(null);
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
    setTimeout(() => setDispatchSuccessId(null), 3500);
  };

  return (
    <div className="tilt-card rounded-2xl glass-panel shadow-md overflow-hidden flex flex-col border border-white/60 p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-300 flex items-center justify-center text-violet-700 shadow-xs">
            <Radio className="w-5 h-5 animate-pulse" aria-hidden />
          </div>
          <div>
            <h2
              className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Citizen Distress Telemetry Matrix
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 font-extrabold">
                {criticalCitizens.length} HIGH PRIORITY
              </span>
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Live GPS fixes & BLE Offline Mesh Relays with Water Drift Uncertainty
            </p>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white/60 p-1 rounded-xl border border-white/80">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
              filter === "ALL"
                ? "btn-solid-primary text-white"
                : "text-slate-700 hover:text-slate-950 hover:bg-white/80"
            }`}
          >
            All ({citizens.length})
          </button>
          <button
            onClick={() => setFilter("LIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
              filter === "LIVE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            🟢 Live GPS ({liveCitizens.length})
          </button>
          <button
            onClick={() => setFilter("LAST_KNOWN")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
              filter === "LAST_KNOWN"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-amber-800 hover:bg-amber-50"
            }`}
          >
            ⏱️ Last Known ({lastKnownCitizens.length})
          </button>
          <button
            onClick={() => setFilter("CRITICAL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
              filter === "CRITICAL"
                ? "btn-solid-danger text-white"
                : "text-red-700 hover:bg-red-50"
            }`}
          >
            ⚠️ High Urgency ({criticalCitizens.length})
          </button>
        </div>
      </div>

      {/* Citizen Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
        {filteredList.map((citizen) => {
          const isSelected = selectedCitizen?.id === citizen.id;
          const isJustDispatched = dispatchSuccessId === citizen.id;

          return (
            <div
              key={citizen.id}
              className={`p-4 rounded-xl border transition-all relative overflow-hidden backdrop-blur-md ${
                citizen.is_live
                  ? "bg-white/70 border-emerald-300/80 hover:border-emerald-500"
                  : "bg-amber-50/70 border-amber-300/80 hover:border-amber-500"
              } ${isSelected ? "ring-2 ring-violet-600 shadow-md" : "shadow-xs"}`}
            >
              {/* Status Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      citizen.is_live
                        ? "bg-emerald-500 animate-ping"
                        : "bg-amber-500"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      citizen.is_live
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}
                  >
                    {citizen.is_live ? "LIVE GPS TELEMETRY" : `LAST KNOWN (${citizen.last_seen_minutes_ago}m AGO)`}
                  </span>
                </div>

                {/* Battery Gauge */}
                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-white">
                  <Battery
                    className={`w-3.5 h-3.5 ${
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
              </div>

              {/* Citizen Details */}
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-950">
                    {citizen.name || `Citizen [${citizen.device_uuid.slice(0, 8)}]`}
                  </h3>
                  {citizen.phone && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      {citizen.phone}
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-800 flex items-start gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" aria-hidden />
                  <span>{citizen.sos_type || "Active Distress Call"}</span>
                </p>

                {/* Medical Distress Tag */}
                {citizen.medical_distress && citizen.medical_distress !== "NONE" && (
                  <div className="inline-block mt-1">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-red-600 text-white shadow-xs">
                      MED: {citizen.medical_distress.replace("_", " ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Offline Mesh Relay Lineage */}
              {!citizen.is_live && (
                <div className="bg-white/80 rounded-lg p-2 mb-3 border border-amber-200 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-amber-900 font-bold">
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3 h-3 text-amber-700" aria-hidden /> BLE Mesh Chain ({citizen.mesh_hops} Hops)
                    </span>
                    <span className="text-[10px] text-slate-600 font-normal">
                      Est. Drift: ±{citizen.drift_radius_m || 300}m
                    </span>
                  </div>
                  {citizen.mesh_relay_chain && (
                    <div className="text-[10px] font-mono text-slate-600 truncate">
                      {citizen.mesh_relay_chain.join(" ➔ ")}
                    </div>
                  )}
                </div>
              )}

              {/* Coordinates & Accuracy */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono mb-3 bg-white/50 px-2.5 py-1 rounded-md border border-white/60">
                <span>
                  {citizen.lat.toFixed(4)}°N, {citizen.lng.toFixed(4)}°E
                </span>
                <span>Accuracy: ±{citizen.accuracy_radius_m}m</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-white/60">
                <button
                  onClick={() => onFocusCoordinates && onFocusCoordinates([citizen.lat, citizen.lng])}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-bold text-slate-800 bg-white/90 hover:bg-white hover:text-slate-950 border border-slate-300 transition flex items-center justify-center gap-1.5 min-h-[38px] shadow-xs"
                >
                  <Crosshair className="w-3.5 h-3.5 text-violet-700" aria-hidden />
                  <span>Locate on Map</span>
                </button>

                <button
                  onClick={() => handleDispatch(citizen)}
                  disabled={isJustDispatched}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[38px] ${
                    isJustDispatched
                      ? "bg-emerald-600 text-white"
                      : "btn-solid-danger"
                  }`}
                >
                  {isJustDispatched ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" aria-hidden />
                      <span>Dispatched!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-white" aria-hidden />
                      <span>Dispatch Rescue</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
