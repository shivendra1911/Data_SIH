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
        return <Truck className="w-3.5 h-3.5 text-rose-600" aria-hidden />;
      case "POLICE":
        return <Shield className="w-3.5 h-3.5 text-sky-600" aria-hidden />;
      case "NDRF":
      case "SDRF":
        return <LifeBuoy className="w-3.5 h-3.5 text-amber-600" aria-hidden />;
      default:
        return <Shield className="w-3.5 h-3.5 text-indigo-600" aria-hidden />;
    }
  };

  const getAgencyColor = (type: string) => {
    switch (type) {
      case "AMBULANCE":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "POLICE":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "NDRF":
      case "SDRF":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
  };

  return (
    <div className={`flex flex-col ${compact ? "space-y-2.5 p-1" : "tilt-card rounded-2xl glass-panel shadow-sm border border-white/60 p-4 space-y-3"}`}>
      {/* Header & Multi-Agency Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
            <Truck className="w-3.5 h-3.5" aria-hidden />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span>Emergency Response Grid</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                {responders.length} READY
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              108 ALS Ambulances, Police Thanas & NDRF
            </p>
          </div>
        </div>

        {/* Coordinated Multi-Agency Urgent Dispatch Button */}
        <button
          onClick={handleMultiAgency}
          className={`h-[32px] px-3 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs ${
            multiAgencyDone
              ? "bg-emerald-600 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          {multiAgencyDone ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-white" aria-hidden />
              <span>All Branches Dispatched!</span>
            </>
          ) : (
            <>
              <AlertOctagon className="w-3.5 h-3.5 text-white" aria-hidden />
              <span>Multi-Agency Dispatch</span>
            </>
          )}
        </button>
      </div>

      {/* Agency Filter Tabs */}
      <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200 text-[11px]">
        <button
          onClick={() => setAgencyFilter("ALL")}
          className={`px-2 py-1 rounded-md font-medium transition ${
            agencyFilter === "ALL"
              ? "bg-white text-slate-900 shadow-xs font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          All ({responders.length})
        </button>
        <button
          onClick={() => setAgencyFilter("AMBULANCE")}
          className={`px-2 py-1 rounded-md font-medium transition ${
            agencyFilter === "AMBULANCE"
              ? "bg-rose-600 text-white shadow-xs font-semibold"
              : "text-rose-700 hover:text-rose-900"
          }`}
        >
          🚑 108 ALS ({ambulances.length})
        </button>
        <button
          onClick={() => setAgencyFilter("POLICE")}
          className={`px-2 py-1 rounded-md font-medium transition ${
            agencyFilter === "POLICE"
              ? "bg-sky-600 text-white shadow-xs font-semibold"
              : "text-sky-700 hover:text-sky-900"
          }`}
        >
          🚓 Police ({police.length})
        </button>
        <button
          onClick={() => setAgencyFilter("NDRF")}
          className={`px-2 py-1 rounded-md font-medium transition ${
            agencyFilter === "NDRF"
              ? "bg-amber-600 text-white shadow-xs font-semibold"
              : "text-amber-800 hover:text-amber-950"
          }`}
        >
          🚤 NDRF ({ndrf.length})
        </button>
      </div>

      {/* Responders List */}
      <div className={`space-y-2 overflow-y-auto pr-1 ${compact ? "max-h-[560px]" : "max-h-[480px]"}`}>
        {filteredResponders.map((resp) => {
          const isDispatched = dispatchedUnits[resp.id];

          return (
            <div
              key={resp.id}
              className="p-2.5 rounded-xl bg-white/85 border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-indigo-300 transition flex flex-col justify-between space-y-2"
            >
              {/* Unit Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="p-1 rounded-md bg-slate-100 border border-slate-200 shrink-0">
                    {getAgencyIcon(resp.type)}
                  </div>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {resp.unit_name}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${getAgencyColor(
                      resp.type
                    )} shrink-0`}
                  >
                    {resp.type}
                  </span>
                </div>

                {/* ETA */}
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                  <Clock className="w-2.5 h-2.5 text-indigo-600" aria-hidden />
                  <span>~{resp.eta_minutes}m ({resp.distance_km}km)</span>
                </div>
              </div>

              {/* Station, Personnel, Vehicle */}
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                <span className="truncate">📍 {resp.station_location}</span>
                <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" />
                  {resp.personnel_count} Crew
                </span>
              </div>

              {/* Equipment list */}
              <div className="text-[10px] text-slate-500 truncate bg-slate-50/80 px-2 py-1 rounded border border-slate-100">
                Equipment: {resp.equipment.slice(0, 3).join(", ")}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <a
                  href={`tel:${resp.contact_number}`}
                  className="text-[10px] text-indigo-700 font-mono font-medium flex items-center gap-1 hover:underline"
                >
                  <PhoneCall className="w-2.5 h-2.5" />
                  <span>{resp.contact_number}</span>
                </a>

                <button
                  onClick={() => handleUnitDispatch(resp)}
                  disabled={isDispatched}
                  className={`h-[28px] px-3 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 shadow-2xs ${
                    isDispatched
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {isDispatched ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-white" aria-hidden />
                      <span>Mobilized</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3 text-white" aria-hidden />
                      <span>Dispatch</span>
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
