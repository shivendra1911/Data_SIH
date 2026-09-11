"use client";

import React, { useState } from "react";
import { SafeEvacuationRoute, EvacuationGuidelines, HazardZone } from "@/lib/types";
import {
  X,
  ShieldCheck,
  Compass,
  Radio,
  Navigation,
  AlertTriangle,
  Volume2,
  CheckCircle2,
  Send,
  Building,
  PhoneCall,
} from "lucide-react";

interface SafeRouteGuidelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeZone: HazardZone;
  safeRoutes: SafeEvacuationRoute[];
  guidelines?: EvacuationGuidelines;
  onBroadcastGuidelines?: (message?: string) => void;
}

export default function SafeRouteGuidelineModal({
  isOpen,
  onClose,
  activeZone,
  safeRoutes,
  guidelines,
  onBroadcastGuidelines,
}: SafeRouteGuidelineModalProps) {
  const [broadcastDone, setBroadcastDone] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    safeRoutes[0]?.id || ""
  );

  if (!isOpen) return null;

  const handleBroadcast = () => {
    if (onBroadcastGuidelines) {
      onBroadcastGuidelines();
    }
    setBroadcastDone(true);
    setTimeout(() => setBroadcastDone(false), 4500);
  };

  const activeRoute =
    safeRoutes.find((r) => r.id === selectedRouteId) || safeRoutes[0];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl glass-panel bg-white/95 border border-white/80 p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-6 h-6" aria-hidden />
            </div>
            <div>
              <h2
                className="text-base font-black text-slate-950 uppercase tracking-wider flex items-center gap-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Safe Evacuation Routes & Survival Guidelines
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold">
                  VERIFIED HIGH GROUND
                </span>
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Autonomous civilian guidance for {activeZone.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Safe Routes Selector */}
        {safeRoutes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-600" /> Designated High Ground Safe Routes:
              </span>
              <span className="text-xs text-emerald-700 font-bold">
                {safeRoutes.length} Elevation Paths Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {safeRoutes.map((route) => {
                const isSelected = (activeRoute?.id === route.id);
                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-50/90 border-emerald-500 shadow-sm ring-2 ring-emerald-500/30"
                        : "bg-white/80 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">
                        {route.risk_avoidance_status}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        +{route.elevation_gain_m}m Gain
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-slate-950 mb-1">
                      {route.route_name}
                    </h4>

                    <div className="text-[11px] text-slate-600 space-y-0.5 mb-2">
                      <div>📍 <strong>From:</strong> {route.start_point_name}</div>
                      <div>⛺ <strong>To:</strong> {route.assembly_point_name}</div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 pt-2 border-t border-slate-200/60">
                      <span>Distance: {route.distance_km} km</span>
                      <span>Walk: ~{route.walk_time_minutes} mins</span>
                      <span>Cap: {route.shelter_capacity} ppl</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shelter Facilities Banner */}
        {activeRoute && (
          <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Building className="w-4 h-4" /> Shelter Destination: {activeRoute.assembly_point_name}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Coords: {activeRoute.assembly_coords[0].toFixed(4)}°N, {activeRoute.assembly_coords[1].toFixed(4)}°E
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeRoute.shelter_facilities.map((fac, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700"
                >
                  ✓ {fac}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Official Directives */}
        <div className="space-y-3">
          <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Mandatory Evacuation Guidelines:
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200 space-y-1.5">
              <h5 className="font-bold text-rose-900 uppercase text-[11px]">Immediate Actions:</h5>
              <ul className="list-disc list-inside space-y-1 text-slate-800 font-medium text-[11px]">
                {guidelines?.immediate_actions.map((act, i) => (
                  <li key={i}>{act}</li>
                )) || (
                  <>
                    <li>Evacuate immediately away from riverbanks uphill.</li>
                    <li>Do not attempt to cross flooded bridges or culverts.</li>
                    <li>Switch off main domestic gas and electrical breakers.</li>
                  </>
                )}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-200 space-y-1.5">
              <h5 className="font-bold text-sky-900 uppercase text-[11px]">Radio & Mesh Protocol:</h5>
              <div className="text-[11px] text-slate-800 space-y-1 font-medium">
                <div>
                  📻 <strong>Emergency Radio:</strong> {guidelines?.disaster_radio_mhz || "AIR FM 102.8 MHz"}
                </div>
                <div className="text-slate-700">
                  📡 {guidelines?.offline_mesh_protocol || "Keep Bluetooth and GPS ON for offline mesh emergency beaconing."}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-bold text-slate-800">
              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" /> Helplines:
            </span>
            <span>NDRF: <strong>1078</strong></span>
            <span>SDMA: <strong>1070</strong></span>
            <span>Ambulance: <strong>108</strong></span>
            <span>Police: <strong>112</strong></span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition min-h-[44px]"
            >
              Close
            </button>

            <button
              onClick={handleBroadcast}
              disabled={broadcastDone}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] ${
                broadcastDone
                  ? "bg-emerald-600 text-white shadow-md"
                  : "btn-solid-danger"
              }`}
            >
              {broadcastDone ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" aria-hidden />
                  <span>Guidelines Broadcasted to Phones!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" aria-hidden />
                  <span>Broadcast Guidelines & Safe Routes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
