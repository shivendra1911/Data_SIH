"use client";

import React, { useState } from "react";
import { EmergencyResponder } from "@/lib/types";
import {
  Truck,
  Shield,
  LifeBuoy,
  PhoneCall,
  Clock,
  Send,
  CheckCircle2,
  AlertOctagon,
  Users,
} from "lucide-react";

interface EmergencyResponderGridProps {
  responders: EmergencyResponder[];
  zoneName: string;
  onDispatchUnit?: (responder: EmergencyResponder) => void;
  onMultiAgencyDispatch?: () => void;
  compact?: boolean;
}

export default function EmergencyResponderGrid({
  responders,
  zoneName,
  onDispatchUnit,
  onMultiAgencyDispatch,
  compact = false,
}: EmergencyResponderGridProps) {
  const [dispatchedUnits, setDispatchedUnits] = useState<Record<string, boolean>>({});
  const [comingSoonId, setComingSoonId] = useState<string | null>(null);
  const [multiAgencyDone, setMultiAgencyDone] = useState(false);
  const [agencyFilter, setAgencyFilter] = useState<"ALL" | "AMBULANCE" | "POLICE" | "NDRF">("ALL");

  const ambulances = responders.filter((r) => r.type === "AMBULANCE");
  const police = responders.filter((r) => r.type === "POLICE");
  const ndrf = responders.filter((r) => r.type === "NDRF" || r.type === "SDRF");

  const filteredResponders =
    agencyFilter === "AMBULANCE"
      ? ambulances
      : agencyFilter === "POLICE"
      ? police
      : agencyFilter === "NDRF"
      ? ndrf
      : responders;

  const handleUnitDispatch = (responder: EmergencyResponder) => {
    if (onDispatchUnit) {
      onDispatchUnit(responder);
    }
    setDispatchedUnits((prev) => ({ ...prev, [responder.id]: true }));
    setComingSoonId(responder.id);
    setTimeout(() => {
      setComingSoonId((prev) => (prev === responder.id ? null : prev));
    }, 3500);
  };

  const handleMultiAgency = () => {
    if (onMultiAgencyDispatch) {
      onMultiAgencyDispatch();
    }
    const allIds: Record<string, boolean> = {};
    responders.forEach((r) => {
      allIds[r.id] = true;
    });
    setDispatchedUnits(allIds);
    setMultiAgencyDone(true);
    setTimeout(() => setMultiAgencyDone(false), 4000);
  };

  const getAgencyIcon = (type: string) => {
    switch (type) {
      case "AMBULANCE":
        return <Truck className="w-3.5 h-3.5 text-slate-800" aria-hidden />;
      case "POLICE":
        return <Shield className="w-3.5 h-3.5 text-slate-800" aria-hidden />;
      case "NDRF":
      case "SDRF":
        return <LifeBuoy className="w-3.5 h-3.5 text-slate-800" aria-hidden />;
      default:
        return <Shield className="w-3.5 h-3.5 text-slate-800" aria-hidden />;
    }
  };

  return (
    <div
      className={`flex flex-col ${
        compact
          ? "space-y-2.5 p-1 font-sans text-slate-800"
          : "rounded-3xl bg-white shadow-sm border border-slate-200 p-6 space-y-4 text-slate-800 font-sans"
      }`}
    >
      {/* Header & Multi-Agency Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
            <Truck className="w-4 h-4 text-slate-800" aria-hidden />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 font-display">
                Emergency Response Grid
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-[#f8fafc] font-bold">
                {responders.length} Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              108 ALS Ambulances, Police Thanas &amp; NDRF Units
            </p>
          </div>
        </div>

        {/* Coordinated Multi-Agency Dispatch Button - Neutral Dark Slate with High Contrast */}
        <button
          onClick={handleMultiAgency}
          className={`h-[36px] px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs border ${
            multiAgencyDone
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
              : "bg-slate-800 hover:bg-slate-900 text-[#f8fafc] border-slate-700"
          }`}
        >
          {multiAgencyDone ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
              <span>All Branches Dispatched!</span>
            </>
          ) : (
            <>
              <AlertOctagon className="w-3.5 h-3.5 text-amber-300" aria-hidden />
              <span>Multi-Agency Mobilization</span>
            </>
          )}
        </button>
      </div>

      {/* Agency Filter Tabs */}
      <div className="flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-xl border border-slate-200 text-xs font-bold">
        <button
          onClick={() => setAgencyFilter("ALL")}
          className={`px-3 py-1 rounded-lg transition ${
            agencyFilter === "ALL"
              ? "bg-white text-slate-900 shadow-xs border border-slate-300 font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          All ({responders.length})
        </button>
        <button
          onClick={() => setAgencyFilter("AMBULANCE")}
          className={`px-3 py-1 rounded-lg transition ${
            agencyFilter === "AMBULANCE"
              ? "bg-white text-slate-900 shadow-xs border border-slate-300 font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          108 ALS ({ambulances.length})
        </button>
        <button
          onClick={() => setAgencyFilter("POLICE")}
          className={`px-3 py-1 rounded-lg transition ${
            agencyFilter === "POLICE"
              ? "bg-white text-slate-900 shadow-xs border border-slate-300 font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Police ({police.length})
        </button>
        <button
          onClick={() => setAgencyFilter("NDRF")}
          className={`px-3 py-1 rounded-lg transition ${
            agencyFilter === "NDRF"
              ? "bg-white text-slate-900 shadow-xs border border-slate-300 font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          NDRF / SDRF ({ndrf.length})
        </button>
      </div>

      {/* Responder Cards Grid */}
      <div className={`space-y-2.5 overflow-y-auto pr-1 ${compact ? "max-h-[560px]" : "max-h-[500px]"}`}>
        {filteredResponders.map((responder) => {
          const isDispatched = dispatchedUnits[responder.id];

          return (
            <div
              key={responder.id}
              className="p-4 rounded-2xl border transition-all relative bg-[#f1f5f9] border-slate-200 hover:border-slate-300 shadow-2xs text-slate-800 font-sans"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {getAgencyIcon(responder.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-800 truncate font-display">
                        {responder.unit_name}
                      </h4>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-white text-slate-700 border border-slate-200">
                        {responder.type}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                      <span>📍 Base: {responder.station_location}</span>
                      <span>&bull;</span>
                      <span>Personnel: {responder.personnel_count}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] font-mono font-bold text-slate-800 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    ETA: ~{responder.eta_minutes}m
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isDispatched
                        ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                    }`}
                  >
                    {isDispatched ? "DISPATCHED" : "ON STANDBY"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-200">
                <a
                  href={`tel:${responder.contact_number.replace(/\s+/g, "")}`}
                  className="h-[32px] px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition"
                >
                  <PhoneCall className="w-3 h-3 text-slate-600" />
                  <span>{responder.contact_number}</span>
                </a>

                <button
                  onClick={() => handleUnitDispatch(responder)}
                  className={`flex-1 h-[34px] min-h-[34px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition border cursor-pointer active:scale-95 ${
                    comingSoonId === responder.id
                      ? "bg-amber-500/15 text-amber-800 border-amber-500/30 animate-pulse"
                      : "bg-slate-800 hover:bg-slate-900 text-[#f8fafc] border-slate-700"
                  }`}
                  title={comingSoonId === responder.id ? "Dispatch Link is coming soon" : "Dispatch Link"}
                >
                  {comingSoonId === responder.id ? (
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
        })}
      </div>
    </div>
  );
}

