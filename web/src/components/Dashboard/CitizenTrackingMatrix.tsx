"use client";

import React, { useState } from "react";
import { CitizenLocation } from "@/lib/types";
import {
  Radio,
  Battery,
  Crosshair,
  Send,
  CheckCircle2,
  Share2,
  Phone,
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
    <div
      className={`flex flex-col ${
        compact
          ? "space-y-2.5 p-1 font-sans text-slate-900"
          : "rounded-3xl bg-white shadow-sm border border-slate-200 p-6 space-y-4 text-slate-900 font-sans"
      }`}
    >
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#faf9f5] border border-slate-300 flex items-center justify-center text-slate-900 shrink-0">
            <Radio className="w-4 h-4 text-red-600 animate-pulse" aria-hidden />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-950 font-display">
                Citizen Rescue List
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-300 font-black uppercase tracking-wider">
                {criticalCitizens.length} Urgent
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live phone SOS signals and emergency rescue requests
            </p>
          </div>
        </div>

        {/* Filter Pills in White & Vanilla Theme */}
        <div className="flex items-center gap-1 bg-[#faf9f5] p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-lg transition ${
              filter === "ALL"
                ? "bg-white text-slate-950 shadow-xs border border-slate-300 font-black"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            All ({citizens.length})
          </button>
          <button
            onClick={() => setFilter("LIVE")}
            className={`px-3 py-1 rounded-lg transition ${
              filter === "LIVE"
                ? "bg-white text-slate-950 shadow-xs border border-slate-300 font-black"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Live ({liveCitizens.length})
          </button>
          <button
            onClick={() => setFilter("LAST_KNOWN")}
            className={`px-3 py-1 rounded-lg transition ${
              filter === "LAST_KNOWN"
                ? "bg-white text-slate-950 shadow-xs border border-slate-300 font-black"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Offline ({lastKnownCitizens.length})
          </button>
          <button
            onClick={() => setFilter("CRITICAL")}
            className={`px-3 py-1 rounded-lg transition ${
              filter === "CRITICAL"
                ? "bg-white text-slate-950 shadow-xs border border-slate-300 font-black"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Urgent ({criticalCitizens.length})
          </button>
        </div>
      </div>

      {/* Scannable Citizen Rows */}
      <div className={`space-y-2.5 overflow-y-auto pr-1 ${compact ? "max-h-[560px]" : "max-h-[500px]"}`}>
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 rounded-2xl bg-[#faf9f5] border border-slate-200">
            No distress signals currently reported. The rescue queue updates automatically in real-time.
          </div>
        ) : (
          filteredList.map((citizen) => {
            const isJustDispatched = dispatchSuccessId === citizen.id;

            return (
              <div
                key={citizen.id}
                className="p-4 rounded-2xl border transition-all relative bg-[#faf9f5] border-slate-200 hover:border-slate-400 shadow-2xs text-slate-900 font-sans"
              >
                {/* Row Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        citizen.is_live
                          ? "bg-emerald-600 animate-pulse"
                          : "bg-slate-400"
                      }`}
                    />
                    <span className="text-xs font-black text-slate-950 truncate font-display">
                      {citizen.name || `Citizen [${citizen.device_uuid.slice(0, 8)}]`}
                    </span>
                    {citizen.phone && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                        <Phone className="w-2.5 h-2.5" />
                        {citizen.phone}
                      </span>
                    )}
                  </div>

                  {/* Battery & Status Badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div
                      className={`flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        citizen.battery_pct <= 20
                          ? "bg-red-50 text-red-700 border-red-300"
                          : "bg-white text-slate-700 border-slate-300"
                      }`}
                    >
                      <Battery className="w-3 h-3" aria-hidden />
                      <span>{citizen.battery_pct}%</span>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        citizen.is_live
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                          : "bg-slate-200 text-slate-800 border border-slate-300"
                      }`}
                    >
                      {citizen.is_live ? "LIVE GPS" : `${citizen.last_seen_minutes_ago || 15}m AGO`}
                    </span>

                    {citizen.sos_type === "TOUCH_FREE_MOTION_SAFE" && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-300">
                        🖐️ GYRO SAFE
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-line: Distress type + Coordinates */}
                <div className="flex items-center justify-between gap-2 mt-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-slate-950 truncate">
                      {citizen.sos_type === "TOUCH_FREE_MOTION_SAFE"
                        ? "Touch-Free Gyro Safe (Alive & Moving)"
                        : citizen.sos_type || "Water Rising"}
                    </span>
                    {citizen.medical_distress && citizen.medical_distress !== "NONE" && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-300 shrink-0 uppercase tracking-wider">
                        {citizen.medical_distress.replace("_", " ")}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 shrink-0 font-bold">
                    {citizen.lat.toFixed(3)}°, {citizen.lng.toFixed(3)}°
                  </span>
                </div>

                {/* Mesh Chain */}
                {!citizen.is_live && citizen.mesh_relay_chain && (
                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600 font-mono">
                    <span className="flex items-center gap-1.5 truncate">
                      <Share2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{citizen.mesh_relay_chain.join(" ➔ ")}</span>
                    </span>
                    <span className="text-[9px] text-slate-500 shrink-0 font-bold">
                      {citizen.mesh_hops || 2} Hops
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      if (onFocusCoordinates) {
                        onFocusCoordinates([citizen.lat, citizen.lng]);
                      } else if (typeof window !== "undefined") {
                        window.location.href = `/radar?lat=${citizen.lat}&lng=${citizen.lng}&uuid=${encodeURIComponent(citizen.device_uuid)}`;
                      }
                    }}
                    className="flex-1 h-[32px] rounded-xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition"
                  >
                    <Crosshair className="w-3 h-3 text-slate-700" aria-hidden />
                    <span>Locate on Map</span>
                  </button>

                  <button
                    onClick={() => handleDispatch(citizen)}
                    disabled={isJustDispatched}
                    className={`flex-1 h-[32px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition ${
                      isJustDispatched
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                        : "bg-slate-900 hover:bg-black text-white"
                    }`}
                  >
                    {isJustDispatched ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Dispatched</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
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
