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
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Autonomous Rescue Clusters
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              PostGIS ST_ClusterKMeans • Route: /api/sos/clusters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {pendingClusters} Pending
          </span>
          <span className="text-xs font-mono text-slate-400">
            {totalStranded} People
          </span>
        </div>
      </div>

      {/* Clusters List */}
      <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
        {clusters.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
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
                    ? "bg-slate-950/40 border-slate-800 opacity-80"
                    : isP1
                    ? "bg-gradient-to-r from-rose-950/40 to-slate-950/60 border-rose-500/40 shadow-md shadow-rose-950/20"
                    : "bg-slate-950/60 border-slate-700/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        Cluster #{cluster.cluster_id}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isP1
                            ? "bg-rose-500 text-white"
                            : "bg-amber-500 text-slate-950"
                        }`}
                      >
                        Priority {cluster.priority}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 mt-1 flex items-baseline gap-1.5">
                      <strong className="text-white font-mono text-sm">
                        {cluster.total_people}
                      </strong>{" "}
                      <span>Citizens Stranded</span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                      <span>
                        Center: {cluster.center_lat.toFixed(4)}°N,{" "}
                        {cluster.center_lng.toFixed(4)}°E
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
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1 min-h-[44px] min-w-[44px] justify-center"
                      >
                        <Navigation className="w-3.5 h-3.5 text-slate-300" />
                        <span className="hidden sm:inline">Focus</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Dispatch Status / Action */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                  {cluster.dispatched ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>
                        {cluster.assigned_team || "Team Bravo En Route"}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onDispatch(cluster.cluster_id)}
                      className="w-full bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-semibold py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50 min-h-[44px]"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Dispatch NDRF Rescue Team</span>
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
