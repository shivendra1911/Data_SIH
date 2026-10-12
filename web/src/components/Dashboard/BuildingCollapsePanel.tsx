"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert, CheckCircle2, Navigation, Clock, Activity, RotateCcw, Zap } from "lucide-react";

export interface CollapseCluster {
  cluster_id: string;
  status: "PENDING_QUORUM" | "CONFIRMED_COLLAPSE" | "RESOLVED_SAFE";
  priority: string;
  centroid_lat: number;
  centroid_lng: number;
  radius_meters: number;
  reporting_devices: string[];
  trapped_headcount: number;
  first_detected_at: string;
  last_report_at: string;
  max_peak_g: number;
  average_confidence: number;
  elapsed_seconds?: number;
}

interface BuildingCollapsePanelProps {
  collapseClusters?: CollapseCluster[];
  onDispatchUSAR?: (clusterId: string) => void;
  onFocusCoordinates?: (lat: number, lng: number) => void;
}

export default function BuildingCollapsePanel({
  collapseClusters: propClusters,
  onDispatchUSAR,
  onFocusCoordinates,
}: BuildingCollapsePanelProps) {
  const [clusters, setClusters] = useState<CollapseCluster[]>(propClusters || []);
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchClusters = async () => {
    try {
      const res = await fetch("/api/collapse/active-clusters");
      if (res.ok) {
        const data = await res.json();
        setClusters(data.clusters || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (propClusters && propClusters.length > 0) {
      setClusters(propClusters);
      return;
    }
    fetchClusters();
    const timer = setInterval(fetchClusters, 5000);
    return () => clearInterval(timer);
  }, [propClusters]);

  const totalTrapped = clusters.reduce((acc, c) => acc + (c.trapped_headcount || c.reporting_devices.length), 0);
  const confirmedCount = clusters.filter((c) => c.status === "CONFIRMED_COLLAPSE").length;

  const handleDispatch = (cid: string) => {
    setDispatchedIds((prev) => new Set(prev).add(cid));
    if (onDispatchUSAR) {
      onDispatchUSAR(cid);
    }
  };

  const handleSimulateShock = async () => {
    setIsSimulating(true);
    let coords = { lat: 27.6015, lng: 77.5975 };
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 1500 })
        );
        if (pos?.coords) {
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      } catch {}
    }
    try {
      const res = await fetch("/api/collapse/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          peak_g: 4.5,
          confidence: 0.94,
        }),
      });
      if (res.ok) {
        await fetchClusters();
      }
    } catch {}
    setIsSimulating(false);
  };

  const handleReset = async () => {
    try {
      await fetch("/api/collapse/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      setClusters([]);
      setDispatchedIds(new Set());
    } catch {}
  };

  return (
    <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 space-y-4 text-slate-800 font-sans h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
            <AlertTriangle className={`w-4 h-4 ${confirmedCount > 0 ? "text-red-600 animate-pulse" : "text-slate-600"}`} aria-hidden />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 font-display">
                Building Collapse Alert
              </h3>
              {confirmedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSimulateShock}
            disabled={isSimulating}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Simulate a phone accelerometer hitting > 3.5g shock threshold"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Simulate Phone Tremor</span>
          </button>

          {clusters.length > 0 && (
            <button
              onClick={handleReset}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 transition cursor-pointer"
              title="Reset simulation data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              confirmedCount > 0
                ? "bg-red-500/10 text-red-700 border border-red-500/20"
                : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
            }`}
          >
            {confirmedCount > 0 ? `${confirmedCount} Confirmed Alert` : "All Structures Stable"}
          </span>
        </div>
      </div>

      {/* Clusters List */}
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[440px] pr-1">
        {clusters.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-2 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="font-semibold text-slate-700">No active structural collapse detected.</p>
            <p className="text-slate-500 text-[11px]">
              System continuously listening for phone accelerometer shockwaves (&gt; 3.5g). When phones hit the threshold, the location and phone count will appear here.
            </p>
          </div>
        ) : (
          clusters.map((cluster) => {
            const isConfirmed = cluster.status === "CONFIRMED_COLLAPSE";
            const isDispatched = dispatchedIds.has(cluster.cluster_id);
            const phoneCount = cluster.reporting_devices.length;

            return (
              <div
                key={cluster.cluster_id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDispatched
                    ? "bg-slate-50/70 border-slate-200 opacity-90"
                    : isConfirmed
                    ? "bg-red-50/70 border-red-200 shadow-xs"
                    : "bg-amber-50/60 border-amber-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 font-display">
                        Structural Collapse Cluster #{cluster.cluster_id.slice(-6).toUpperCase()}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isConfirmed
                            ? "bg-red-600 text-white"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        {isConfirmed ? "Quorum Reached — Confirmed Alert" : "Analyzing Shockwave"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <span className="text-red-700 font-black text-sm">
                        {phoneCount} / 3
                      </span>
                      <span>Phones Hit Acceleration Threshold (&gt; 3.5g)</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 font-mono text-[11px]">
                        {Math.min(100, Math.round((phoneCount / 3) * 100))}% towards quorum
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3 pt-1">
                      <span className="flex items-center gap-1 text-slate-700 font-mono font-bold">
                        <Activity className="w-3.5 h-3.5 text-red-500" />
                        Peak Impact: {cluster.max_peak_g.toFixed(1)}g
                      </span>
                      <span className="text-slate-500">
                        Confidence: {Math.round(cluster.average_confidence * 100)}%
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        Location: {cluster.centroid_lat.toFixed(4)}°N, {cluster.centroid_lng.toFixed(4)}°E (±{cluster.radius_meters}m)
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    {isDispatched ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        USAR En Route
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDispatch(cluster.cluster_id)}
                        className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                          isConfirmed
                            ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                            : "bg-slate-800 hover:bg-slate-900 text-white"
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Dispatch USAR Brigade</span>
                      </button>
                    )}

                    {onFocusCoordinates && (
                      <button
                        onClick={() => onFocusCoordinates(cluster.centroid_lat, cluster.centroid_lng)}
                        className="text-xs text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1 transition-colors"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Locate on Map</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
