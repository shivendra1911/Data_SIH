"use client";

import React from "react";
import { SOSCluster } from "@/lib/types";
import { Users, ShieldAlert, CheckCircle2, Navigation, AlertCircle } from "lucide-react";

interface ClusterTriagePanelProps {
  clusters: SOSCluster[];
  onDispatch: (clusterId: number) => void;
  onFocusCoordinates?: (lat: number, lng: number) => void;
}

export default function ClusterTriagePanel({
  clusters,
  onDispatch,
  onFocusCoordinates,
}: ClusterTriagePanelProps) {
  const totalStranded = clusters.reduce((acc, c) => acc + c.total_people, 0);
  const pendingClusters = clusters.filter((c) => !c.dispatched).length;

  return (
    <div className="rounded-2xl glass-panel shadow-md overflow-hidden flex flex-col h-full border border-white/60">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/60 flex items-center justify-between bg-white/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shadow-xs">
            <Users className="w-4 h-4 text-amber-700" aria-hidden />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-950 uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Autonomous Rescue Clusters
            </h2>
            <p className="text-[11px] font-semibold text-slate-600">
              K-Means Geospatial Density Triage (/api/sos/clusters)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 shadow-xs">
            {pendingClusters} Pending
          </span>
          <span className="text-[11px] font-black text-slate-900">
            {totalStranded} Stranded
          </span>
        </div>
      </div>

      {/* Clusters List */}
      <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto flex-1">
        {clusters.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs">
            No active SOS clusters detected in this sector.
          </div>
        ) : (
          clusters.map((cluster) => {
            const isP1 = cluster.priority === "P1";
            return (
              <div
                key={cluster.cluster_id}
                className={`p-3.5 rounded-xl border transition-all ${
                  cluster.dispatched
                    ? "bg-gray-50 border-gray-200 opacity-80"
                    : isP1
                    ? "bg-red-50/40 border-red-200 shadow-sm"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Cluster #{cluster.cluster_id}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isP1
                            ? "bg-red-600 text-white"
                            : "bg-amber-500 text-gray-900"
                        }`}
                      >
                        Priority {cluster.priority}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 mt-1 flex items-baseline gap-1.5">
                      <strong className="text-gray-900 text-sm font-bold">
                        {cluster.total_people}
                      </strong>{" "}
                      <span>Citizens Stranded</span>
                    </div>

                    <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <span>
                        Coordinates: {cluster.center_lat.toFixed(4)}°N, {cluster.center_lng.toFixed(4)}°E
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {onFocusCoordinates && (
                      <button
                        onClick={() =>
                          onFocusCoordinates(
                            cluster.center_lat,
                            cluster.center_lng
                          )
                        }
                        title="Locate Cluster on Map"
                        aria-label={`Locate cluster ${cluster.cluster_id} on map`}
                        className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition text-xs flex items-center gap-1 min-h-[44px] justify-center"
                      >
                        <Navigation className="w-3.5 h-3.5 text-violet-600" aria-hidden />
                        <span>Focus</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Dispatch Status / Action */}
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                  {cluster.dispatched ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden />
                      <span>
                        {cluster.assigned_team || "Team Dispatched En Route"}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onDispatch(cluster.cluster_id)}
                      aria-label={`Dispatch NDRF rescue team to cluster ${cluster.cluster_id}`}
                      className="btn-solid-danger w-full text-xs shadow-md"
                    >
                      <ShieldAlert className="w-4 h-4" aria-hidden />
                      <span>Dispatch Rescue Team</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
