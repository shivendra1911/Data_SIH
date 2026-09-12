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
    <div className="tilt-card rounded-2xl bg-[#1b2027]/90 shadow-xl overflow-hidden flex flex-col h-full border border-white/10 text-white">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#161a20]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-xs">
            <Users className="w-4 h-4 text-white" aria-hidden />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Autonomous Rescue Clusters
            </h2>
            <p className="text-[11px] font-semibold text-white/60">
              K-Means Geospatial Density Triage (/api/sos/clusters)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white text-[#161a20] shadow-xs">
            {pendingClusters} Pending
          </span>
          <span className="text-[11px] font-bold text-white/80">
            {totalStranded} Stranded
          </span>
        </div>
      </div>

      {/* Clusters List */}
      <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto flex-1">
        {clusters.length === 0 ? (
          <div className="p-8 text-center text-white/40 text-xs">
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
                    ? "bg-[#161a20]/40 border-white/5 opacity-80"
                    : isP1
                    ? "bg-[#161a20] border-white/30 shadow-sm"
                    : "bg-[#161a20]/80 border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Cluster #{cluster.cluster_id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isP1
                            ? "bg-white text-[#161a20]"
                            : "bg-white/10 text-white border border-white/15"
                        }`}
                      >
                        Priority {cluster.priority}
                      </span>
                    </div>

                    <div className="text-xs text-white/70 mt-1 flex items-baseline gap-1.5">
                      <strong className="text-white text-sm font-bold">
                        {cluster.total_people}
                      </strong>{" "}
                      <span>Citizens Stranded</span>
                    </div>

                    <div className="text-[11px] text-white/50 mt-0.5 flex items-center gap-1.5">
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
                        className="btn-solid-dark px-3 py-1.5 rounded-full text-xs flex items-center gap-1 min-h-[36px] justify-center"
                      >
                        <Navigation className="w-3.5 h-3.5 text-white/70" aria-hidden />
                        <span>Focus</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Dispatch Status / Action */}
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                  {cluster.dispatched ? (
                    <div className="flex items-center gap-1.5 text-xs text-white/80 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-white" aria-hidden />
                      <span>
                        {cluster.assigned_team || "Team Dispatched En Route"}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onDispatch(cluster.cluster_id)}
                      aria-label={`Dispatch NDRF rescue team to cluster ${cluster.cluster_id}`}
                      className="btn-solid-primary w-full text-xs font-bold py-2 rounded-full shadow-sm"
                    >
                      <ShieldAlert className="w-4 h-4 text-[#161a20]" aria-hidden />
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
