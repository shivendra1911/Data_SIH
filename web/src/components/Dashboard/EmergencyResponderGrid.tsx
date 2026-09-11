"use client";

import React, { useState } from "react";
import { EmergencyResponder } from "@/lib/types";
import {
  Truck,
  Shield,
  LifeBuoy,
  PhoneCall,
  Navigation,
  Clock,
  Send,
  CheckCircle2,
  AlertOctagon,
  Users,
  Radio,
} from "lucide-react";

interface EmergencyResponderGridProps {
  responders: EmergencyResponder[];
  zoneName: string;
  onDispatchUnit?: (responder: EmergencyResponder) => void;
  onMultiAgencyDispatch?: () => void;
}

export default function EmergencyResponderGrid({
  responders,
  zoneName,
  onDispatchUnit,
  onMultiAgencyDispatch,
}: EmergencyResponderGridProps) {
  const [dispatchedUnits, setDispatchedUnits] = useState<Record<string, boolean>>({});
  const [multiAgencyDone, setMultiAgencyDone] = useState(false);

  const ambulances = responders.filter((r) => r.type === "AMBULANCE");
  const police = responders.filter((r) => r.type === "POLICE");
  const ndrf = responders.filter((r) => r.type === "NDRF" || r.type === "SDRF");

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
    setTimeout(() => setMultiAgencyDone(false), 5000);
  };

  const getAgencyIcon = (type: string) => {
    switch (type) {
      case "AMBULANCE":
        return <Truck className="w-5 h-5 text-rose-600" aria-hidden />;
      case "POLICE":
        return <Shield className="w-5 h-5 text-sky-600" aria-hidden />;
      case "NDRF":
      case "SDRF":
        return <LifeBuoy className="w-5 h-5 text-amber-600" aria-hidden />;
      default:
        return <Shield className="w-5 h-5 text-violet-600" aria-hidden />;
    }
  };

  const getAgencyColor = (type: string) => {
    switch (type) {
      case "AMBULANCE":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "POLICE":
        return "bg-sky-100 text-sky-800 border-sky-300";
      case "NDRF":
      case "SDRF":
        return "bg-amber-100 text-amber-900 border-amber-300";
      default:
        return "bg-violet-100 text-violet-800 border-violet-300";
    }
  };

  return (
    <div className="tilt-card rounded-2xl glass-panel shadow-md overflow-hidden flex flex-col border border-white/60 p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-300 flex items-center justify-center text-violet-700 shadow-xs">
            <Truck className="w-5 h-5" aria-hidden />
          </div>
          <div>
            <h2
              className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Emergency Response Grid: Ambulances, Police & NDRF
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-300 font-extrabold">
                {responders.length} UNITS READY
              </span>
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Real-time proximity dispatch across {zoneName}
            </p>
          </div>
        </div>

        {/* Coordinated Multi-Agency Urgent Dispatch Button */}
        <button
          onClick={handleMultiAgency}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 min-h-[44px] ${
            multiAgencyDone
              ? "bg-emerald-600 text-white shadow-lg"
              : "btn-solid-danger"
          }`}
        >
          {multiAgencyDone ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" aria-hidden />
              <span>All Branches Dispatched!</span>
            </>
          ) : (
            <>
              <AlertOctagon className="w-4 h-4 text-white animate-pulse" aria-hidden />
              <span>Multi-Agency Urgent Dispatch</span>
            </>
          )}
        </button>
      </div>

      {/* Agency Summary Badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-2.5 rounded-xl bg-white/70 border border-rose-200 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-xs">
            108
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Ambulances</span>
            <span className="text-xs font-extrabold text-slate-950">{ambulances.length} ALS Units Ready</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/70 border border-sky-200 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xs">
            112
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Police Thanas</span>
            <span className="text-xs font-extrabold text-slate-950">{police.length} Roadblock Teams</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/70 border border-amber-200 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
            1078
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">NDRF Battalions</span>
            <span className="text-xs font-extrabold text-slate-950">{ndrf.length} Boat Taskforces</span>
          </div>
        </div>
      </div>

      {/* Responders List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 pt-1">
        {responders.map((resp) => {
          const isDispatched = dispatchedUnits[resp.id];

          return (
            <div
              key={resp.id}
              className="p-4 rounded-xl bg-white/75 border border-white/80 shadow-xs flex flex-col justify-between space-y-3 backdrop-blur-md hover:border-violet-300 transition"
            >
              <div className="space-y-2">
                {/* Agency & ETA Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                      {getAgencyIcon(resp.type)}
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${getAgencyColor(
                        resp.type
                      )}`}
                    >
                      {resp.type}
                    </span>
                  </div>

                  {/* ETA Clock */}
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-violet-600" aria-hidden />
                    <span>ETA ~{resp.eta_minutes}m ({resp.distance_km}km)</span>
                  </div>
                </div>

                {/* Unit Name & Location */}
                <div>
                  <h3 className="text-xs font-black text-slate-950">
                    {resp.unit_name}
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium">
                    📍 {resp.station_location}
                  </p>
                </div>

                {/* Fleet / Personnel */}
                <div className="bg-white/60 p-2 rounded-lg border border-slate-200 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-500" aria-hidden /> Personnel:
                    </span>
                    <strong className="font-black text-slate-950">{resp.personnel_count} Crew</strong>
                  </div>
                  <div className="text-[10px] text-slate-600 truncate">
                    Fleet: {resp.vehicle_fleet}
                  </div>
                </div>

                {/* Equipment Tags */}
                <div className="flex flex-wrap gap-1">
                  {resp.equipment.slice(0, 3).map((eq, i) => (
                    <span
                      key={i}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {eq}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                <a
                  href={`tel:${resp.contact_number.split("/")[0].trim()}`}
                  className="py-2 px-3 rounded-lg text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 transition flex items-center gap-1.5 min-h-[38px]"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                  <span>{resp.contact_number.split("/")[0].trim()}</span>
                </a>

                <button
                  onClick={() => handleUnitDispatch(resp)}
                  disabled={isDispatched}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[38px] ${
                    isDispatched
                      ? "bg-emerald-600 text-white shadow-xs"
                      : resp.type === "AMBULANCE"
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-xs"
                      : resp.type === "POLICE"
                      ? "bg-sky-700 hover:bg-sky-600 text-white shadow-xs"
                      : "btn-solid-danger"
                  }`}
                >
                  {isDispatched ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" aria-hidden />
                      <span>Dispatched</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-white" aria-hidden />
                      <span>Dispatch Unit</span>
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
