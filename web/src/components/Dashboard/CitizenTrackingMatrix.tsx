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
  const [comingSoonId, setComingSoonId] = useState<string | null>(null);

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
    const key = cit.id || cit.device_uuid;
    if (onDispatchToCitizen) {
      onDispatchToCitizen(cit);
    }
    setComingSoonId(key);
    setTimeout(() => {
      setComingSoonId((prev) => (prev === key ? null : prev));
    }, 4000);
  };

  return (
    <div
      className={`flex flex-col ${
        compact
          ? "space-y-2.5 p-1 font-sans text-slate-800"
          : "rounded-3xl bg-white shadow-sm border border-slate-200 p-6 space-y-4 text-slate-800 font-sans"
      }`}
    >
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
            <Radio className="w-4 h-4 text-red-600 animate-pulse" aria-hidden />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 font-display">
                Citizen Rescue List
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-700 border border-red-500/20 font-bold uppercase tracking-wider">
                {criticalCitizens.length} Urgent
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live phone SOS signals and emergency rescue requests
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-lg transition ${
              filter === "ALL"
                ? "bg-white text-slate-900 shadow-xs border border-slate-300 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All ({citizens.length})
          </button>
          <button
            onClick={() => setFilter("LIVE")}
            className={`px-3 py-1 rounded-lg transition ${
              filter === "LIVE"
                ? "bg-white text-slate-900 shadow-xs border border-slate-300 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Live ({liveCitizens.length})
          </button>
          <button
            onClick={() => setFilter("LAST_KNOWN")}
            className={`px-3 py-1 rounded-lg transition ${
              filter === "LAST_KNOWN"
                ? "bg-white text-slate-900 shadow-xs border border-slate-300 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Offline ({lastKnownCitizens.length})
          </button>
          <button
            onClick={() => setFilter("CRITICAL")}
            className={`px-3 py-1 rounded-lg transition ${
              filter === "CRITICAL"
                ? "bg-white text-slate-900 shadow-xs border border-slate-300 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Urgent ({criticalCitizens.length})
          </button>
        </div>
      </div>

      {/* Scannable Citizen Rows */}
      <div className={`space-y-2.5 overflow-y-auto pr-1 ${compact ? "max-h-[560px]" : "max-h-[500px]"}`}>
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 rounded-2xl bg-[#f1f5f9] border border-slate-200">
            No distress signals currently reported. The rescue queue updates automatically in real-time.
          </div>
        ) : (
          filteredList.map((citizen) => {
            const isComingSoon =
              comingSoonId === citizen.id ||
              (citizen.device_uuid && comingSoonId === citizen.device_uuid);

            return (
              <div
                key={citizen.id}
                className="p-4 rounded-2xl border transition-all relative bg-[#f1f5f9] border-slate-200 hover:border-slate-300 shadow-2xs text-slate-800 font-sans"
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
                    <span className="text-xs font-bold text-slate-800 truncate font-display">
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
                          ? "bg-red-500/10 text-red-700 border-red-500/20"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      <Battery className="w-3 h-3" aria-hidden />
                      <span>{citizen.battery_pct}%</span>
                    </div>

                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        citizen.is_live
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                          : "bg-slate-200 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {citizen.is_live ? "LIVE GPS" : `${citizen.last_seen_minutes_ago || 15}m AGO`}
                    </span>

                    {citizen.sos_type === "TOUCH_FREE_MOTION_SAFE" ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                        🖐️ GYRO SAFE
                      </span>
                    ) : citizen.sos_type === "TRAPPED" ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 border border-red-500/20">
                        🚨 TRAPPED
                      </span>
                    ) : citizen.sos_type === "MEDICAL" ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 border border-rose-500/20">
                        🩸 MEDICAL
                      </span>
                    ) : citizen.sos_type === "WATER_RISING" ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">
                        🌊 WATER RISING
                      </span>
                    ) : citizen.sos_type === "FOOD_WATER" ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                        🍞 FOOD / WATER
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 border border-slate-300">
                        📍 TRACKING
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-line: Distress type + Coordinates */}
                <div className="flex items-center justify-between gap-2 mt-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-slate-800 truncate">
                      {citizen.sos_type === "TOUCH_FREE_MOTION_SAFE"
                        ? "🖐️ Confirmed Safe via Gyro / Motion Sensor"
                        : citizen.sos_type === "TRAPPED"
                        ? "🚨 Citizen Trapped in Structure"
                        : citizen.sos_type === "MEDICAL"
                        ? "🩸 Immediate Medical Emergency"
                        : citizen.sos_type === "WATER_RISING"
                        ? "🌊 Rising Water Level Threat"
                        : citizen.sos_type === "FOOD_WATER"
                        ? "🍞 Essential Rations & Clean Water Needed"
                        : "📍 Live GPS Tracking Active"}
                    </span>
                    {citizen.medical_distress && citizen.medical_distress !== "NONE" && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 border border-red-500/20 shrink-0 uppercase tracking-wider">
                        {citizen.medical_distress.replace("_", " ")}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-slate-600 shrink-0 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {citizen.lat.toFixed(4)}°, {citizen.lng.toFixed(4)}°
                  </span>
                </div>

                {/* Mesh Chain */}
                {!citizen.is_live && citizen.mesh_relay_chain && (
                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
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
                    className="flex-1 h-[32px] rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition"
                  >
                    <Crosshair className="w-3 h-3 text-slate-600" aria-hidden />
                    <span>Locate on Map</span>
                  </button>

                  <button
                    onClick={() => handleDispatch(citizen)}
                    className={`flex-1 h-[34px] min-h-[34px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition border cursor-pointer active:scale-95 ${
                      isComingSoon
                        ? "bg-amber-500/15 text-amber-800 border-amber-500/30 animate-pulse"
                        : "bg-slate-800 hover:bg-slate-900 text-[#f8fafc] border-slate-700"
                    }`}
                    title={isComingSoon ? "Dispatch Link is coming soon" : "Dispatch Link"}
                  >
                    {isComingSoon ? (
                      <>
                        <span className="text-xs">⏳</span>
                        <span>Coming Soon</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 text-[#f8fafc]" />
                        <span>Dispatch Link</span>
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
