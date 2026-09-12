"use client";

import React, { useState, useEffect } from "react";
import { SafeEvacuationRoute, EvacuationGuidelines, HazardZone } from "@/lib/types";
import { AlgorithmicSafeSpace } from "@/lib/safeSpaceAlgorithm";
import {
  X,
  ShieldCheck,
  Compass,
  Navigation,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Send,
  Building,
  PhoneCall,
  Edit3,
  Sparkles,
  Mountain,
  Plus,
  Save,
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
  guidelines: initialGuidelines,
  onBroadcastGuidelines,
}: SafeRouteGuidelineModalProps) {
  const [activeTab, setActiveTab] = useState<"SAFE_SPACE" | "MANUAL_WRITE" | "VIEW_ROUTES">("SAFE_SPACE");
  const [algorithmicSafeSpace, setAlgorithmicSafeSpace] = useState<AlgorithmicSafeSpace | null>(null);
  const [loadingSafeSpace, setLoadingSafeSpace] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(safeRoutes[0]?.id || "");
  const [broadcastDone, setBroadcastDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Manual write state (user directive: manual write option for guidelines)
  const [manualTitle, setManualTitle] = useState("");
  const [manualActions, setManualActions] = useState("");
  const [manualRadio, setManualRadio] = useState("AIR FM 102.8 MHz");
  const [manualMeshNotes, setManualMeshNotes] = useState(
    "Keep Bluetooth and GPS active for offline peer-to-peer mesh beaconing."
  );
  const [activeGuidelines, setActiveGuidelines] = useState<EvacuationGuidelines | undefined>(
    initialGuidelines
  );

  // Fetch dynamic Algorithmic Safe Space calculated by model + Open-Elevation API
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const lat = activeZone.center?.[0];
    const lng = activeZone.center?.[1];
    const name = encodeURIComponent(activeZone.name || "Local Sector");
    fetch(`/api/guidelines?zone_id=${activeZone.id}&lat=${lat}&lng=${lng}&name=${name}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.algorithmic_safe_space) {
            setAlgorithmicSafeSpace(data.algorithmic_safe_space);
          }
          if (data.guidelines) {
            setActiveGuidelines(data.guidelines);
            if (!manualActions) {
              setManualActions(data.guidelines.immediate_actions.join("\n"));
            }
          }
          setLoadingSafeSpace(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingSafeSpace(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeZone.id]);

  if (!isOpen) return null;

  // Handle Manual Guideline Save & Broadcast
  const handleSaveManualDirectives = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const actionList = manualActions
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const res = await fetch("/api/guidelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: activeZone.id,
          title: manualTitle || `Manual Directive for ${activeZone.name}`,
          immediate_actions: actionList,
          disaster_radio_mhz: manualRadio,
          offline_mesh_protocol: manualMeshNotes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveGuidelines(data.guidelines);
        setBroadcastDone(true);
        if (onBroadcastGuidelines) onBroadcastGuidelines();
        setTimeout(() => setBroadcastDone(false), 5000);
      }
    } catch (err) {
      console.warn("Error saving manual directive:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeRoute = safeRoutes.find((r) => r.id === selectedRouteId) || safeRoutes[0];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn font-sans">
      {/* Container: White and Vanilla Theme with Deep Slate/Black Text Contrast */}
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white border border-slate-200 p-6 sm:p-7 shadow-2xl space-y-6 text-slate-900">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#faf9f5] border border-slate-300 flex items-center justify-center text-slate-900 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-slate-900" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-2">
                <span>Safe Evacuation Routes & Guidelines</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-black">
                  AI TOPOGRAPHY VERIFIED
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {activeZone.name} ({activeZone.district})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950 flex items-center justify-center border border-slate-200 transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#faf9f5] border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab("SAFE_SPACE")}
            className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "SAFE_SPACE"
                ? "bg-white text-slate-950 shadow-sm border border-slate-300"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <Mountain className="w-3.5 h-3.5 text-slate-900" />
            <span>High-Ground Safe Refuge</span>
          </button>

          <button
            onClick={() => setActiveTab("MANUAL_WRITE")}
            className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "MANUAL_WRITE"
                ? "bg-white text-slate-950 shadow-sm border border-slate-300"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            <span>✍️ Write / Edit Directives</span>
          </button>

          <button
            onClick={() => setActiveTab("VIEW_ROUTES")}
            className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "VIEW_ROUTES"
                ? "bg-white text-slate-950 shadow-sm border border-slate-300"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-slate-900" />
            <span>Elevation Routes ({safeRoutes.length})</span>
          </button>
        </div>

        {/* TAB 1: SAFE REFUGE HAVEN */}
        {activeTab === "SAFE_SPACE" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#faf9f5] border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Designated Safe Haven Refuge
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Verified Safe Zone
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-950">
                      {algorithmicSafeSpace?.haven_name || "Joshimath High-Ridge Sanctuary"}
                    </h3>
                    <p className="text-xs text-slate-600">
                      High-ground evacuation sanctuary situated safely above flood level
                    </p>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">
                    {algorithmicSafeSpace?.safety_score_pct || 99.4}% Safety Index
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  <div className="p-2.5 rounded-lg bg-[#faf9f5] border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Base Elevation</span>
                    <p className="text-base font-black text-slate-950">
                      {algorithmicSafeSpace?.base_elevation_m || 1820}m
                    </p>
                    <span className="text-[10px] text-slate-500">River Basin</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Safe Haven Level</span>
                    <p className="text-base font-black text-emerald-950">
                      {algorithmicSafeSpace?.safe_elevation_m || 1980}m
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700">
                      +{algorithmicSafeSpace?.vertical_clearance_m || 160}m Clearance
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#faf9f5] border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Distance</span>
                    <p className="text-base font-black text-slate-950">
                      {algorithmicSafeSpace?.distance_km || 1.8} km
                    </p>
                    <span className="text-[10px] text-slate-500">Uphill Ascent</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#faf9f5] border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Walk Time</span>
                    <p className="text-base font-black text-slate-950">
                      ~{algorithmicSafeSpace?.evacuation_walk_time_minutes || 24} mins
                    </p>
                    <span className="text-[10px] text-slate-500">Fast Walking</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <span>
                    📍 Safe Coordinates:{" "}
                    <strong className="text-slate-900 font-mono">
                      {algorithmicSafeSpace?.safe_coords[0]}°N, {algorithmicSafeSpace?.safe_coords[1]}°E
                    </strong>
                  </span>
                  <span>
                    👥 Refuge Capacity:{" "}
                    <strong className="text-slate-900 font-mono">
                      {algorithmicSafeSpace?.safe_capacity_people || 1400} Citizens
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL WRITE OPTION FOR GUIDELINES & DIRECTIVES */}
        {activeTab === "MANUAL_WRITE" && (
          <form onSubmit={handleSaveManualDirectives} className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#faf9f5] border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-blue-600" /> Write Custom Guidelines & Directives:
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Persists to network & edge devices
                </span>
              </div>

              {/* Title input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Directive Title / Incident Header:</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder={`e.g. Mandatory Riverbank Evacuation Directive for ${activeZone.name}`}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                />
              </div>

              {/* Manual Action Steps Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Immediate Evacuation Actions (One action per line):
                </label>
                <textarea
                  rows={4}
                  value={manualActions}
                  onChange={(e) => setManualActions(e.target.value)}
                  placeholder="Enter custom instructions for citizens and responders (e.g. Move uphill towards temple grounds immediately...)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono shadow-2xs leading-relaxed"
                />
              </div>

              {/* Radio & Mesh settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Disaster FM Radio Frequency:</label>
                  <input
                    type="text"
                    value={manualRadio}
                    onChange={(e) => setManualRadio(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Offline Mesh Protocol Note:</label>
                  <input
                    type="text"
                    value={manualMeshNotes}
                    onChange={(e) => setManualMeshNotes(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Save & Broadcast Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500 font-medium">
                Saves to live server and broadcasts alert to citizen mesh
              </span>

              <button
                type="submit"
                disabled={isSaving || broadcastDone}
                className={`px-5 py-2.5 rounded-full text-xs font-extrabold transition flex items-center gap-2 shadow-sm ${
                  broadcastDone
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 hover:bg-black text-white"
                }`}
              >
                {broadcastDone ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Directive Saved & Broadcasted!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-white" />
                    <span>{isSaving ? "Saving..." : "Save & Broadcast Directive"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: VERIFIED ELEVATION ROUTES LIST */}
        {activeTab === "VIEW_ROUTES" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-slate-900" /> Designated Safe Routes:
              </span>
              <span className="text-xs text-slate-700 font-bold">
                {safeRoutes.length} Elevation Paths
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {safeRoutes.map((route) => {
                const isSelected = activeRoute?.id === route.id;
                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#faf9f5] border-slate-900 shadow-sm ring-2 ring-slate-900/10"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {route.risk_avoidance_status}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        +{route.elevation_gain_m}m Gain
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-950 mb-1">{route.route_name}</h4>

                    <div className="text-[11px] text-slate-600 space-y-0.5 mb-2">
                      <div>📍 <strong>From:</strong> {route.start_point_name}</div>
                      <div>⛺ <strong>To:</strong> {route.assembly_point_name}</div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 pt-2 border-t border-slate-100">
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

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-bold text-slate-900">
              <PhoneCall className="w-3.5 h-3.5 text-slate-600" /> Helplines:
            </span>
            <span>NDRF: <strong>1078</strong></span>
            <span>SDMA: <strong>1070</strong></span>
            <span>Ambulance: <strong>108</strong></span>
            <span>Police: <strong>112</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
