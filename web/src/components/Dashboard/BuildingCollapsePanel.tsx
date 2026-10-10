"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert, CheckCircle2, Navigation, Clock, Activity, Users } from "lucide-react";

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

  // Fetch from /api/collapse/active-clusters if prop not provided or on periodic refresh
  useEffect(() => {
    if (propClusters && propClusters.length > 0) {
      setClusters(propClusters);
      return;
    }

    const fetchClusters = async () => {
      try {
        const res = await fetch("/api/collapse/active-clusters");
        if (res.ok) {
          const data = await res.json();
          setClusters(data.clusters || []);
        }
      } catch {}
    };

    fetchClusters();
    const timer = setInterval(fetchClusters, 5000);
    return () => clearInterval(timer);
  }, [propClusters]);

  const totalTrapped = clusters.reduce((acc, c) => acc + c.trapped_headcount, 0);
  const confirmedCount = clusters.filter((c) => c.status === "CONFIRMED_COLLAPSE").length;

  const handleDispatch = (cid: string) => {
    setDispatchedIds((prev) => new Set(prev).add(cid));
    if (onDispatchUSAR) {
      onDispatchUSAR(cid);
    }
  };

  const formatElapsed = (seconds: number = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `T+${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="tilt-card rounded-2xl bg-[#1b2027]/90 shadow-xl overflow-hidden flex flex-col h-full border border-red-500/30 text-white">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-red-500/20 flex items-center justify-between bg-red-950/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shadow-xs">
            <AlertTriangle className="w-4 h-4 text-red-400" aria-hidden />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wide font-display flex items-center gap-2">
              USAR Building Collapse Sentinel
              {confirmedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
              )}
            </h2>
            <p className="text-[11px] font-semibold text-white/60">
              3-Phase Kinetic Quorum Consensus (t &le; 15s, d &le; 100m, &ge; 3 phones)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-xs">
            {confirmedCount} Confirmed
          </span>
          <span className="text-[11px] font-bold text-white/80">
            {totalTrapped} Trapped
          </span>
        </div>
      </div>

      {/* Clusters List */}
      <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar flex-1">
        {clusters.length === 0 ? (
          <div className="p-8 text-center text-white/40 text-xs">
            No structural collapse incidents detected in monitored sectors. Kinetic sentinels active.
          </div>
        ) : (
          clusters.map((cluster) => {
            const isConfirmed = cluster.status === "CONFIRMED_COLLAPSE";
            const isDispatched = dispatchedIds.has(cluster.cluster_id);

            return (
              <div
                key={cluster.cluster_id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isDispatched
                    ? "bg-[#161a20]/40 border-white/5 opacity-80"
                    : isConfirmed
                    ? "bg-red-950/30 border-red-500/50 shadow-sm"
                    : "bg-[#161a20]/80 border-amber-500/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-display">
                        Incident #{cluster.cluster_id.slice(-6).toUpperCase()}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isConfirmed
                            ? "bg-red-600 text-white"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {isConfirmed ? "🚨 3+ PHONE QUORUM CONFIRMED" : "⏳ PENDING QUORUM"}
                      </span>
                    </div>

                    <div className="text-xs text-white/80 mt-1 flex items-baseline gap-2">
                      <strong className="text-red-400 text-sm font-bold">
                        {cluster.trapped_headcount}
                      </strong>{" "}
                      <span>Phones Trapped Under Rubble</span>
                    </div>

                    <div className="text-[11px] text-white/60 mt-1 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-orange-300 font-semibold">
                        <Activity className="w-3 h-3 text-orange-400" />
                        Peak Impact: {cluster.max_peak_g.toFixed(1)}g
                      </span>
                      <span className="text-white/50">
                        Confidence: {Math.round(cluster.average_confidence * 100)}%
                      </span>
                      <span className="flex items-center gap-1 text-white/50">
                        <Clock className="w-3 h-3" />
                        {formatElapsed(cluster.elapsed_seconds)}
                      </span>
                    </div>

                    <div className="text-[11px] text-white/40 mt-1 flex items-center gap-1.5">
                      <span>
                        Centroid: {cluster.centroid_lat.toFixed(4)}°N, {cluster.centroid_lng.toFixed(4)}°E (&plusmn;{cluster.radius_meters}m)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {isDispatched ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        USAR En Route
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDispatch(cluster.cluster_id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all ${
                          isConfirmed
                            ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
                            : "bg-white/10 hover:bg-white/20 text-white"
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Dispatch USAR Brigade
                      </button>
                    )}

                    {onFocusCoordinates && (
                      <button
                        onClick={() => onFocusCoordinates(cluster.centroid_lat, cluster.centroid_lng)}
                        className="text-[11px] text-white/50 hover:text-white flex items-center gap-1 transition-colors mt-0.5"
                      >
                        <Navigation className="w-3 h-3" />
                        Locate Rubble
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
