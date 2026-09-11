"use client";

import React, { useState } from "react";
import { SOSEvent, CitizenLocation } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Navigation,
  Radio,
} from "lucide-react";

interface LiveSOSFeedProps {
  events: SOSEvent[];
  citizens?: CitizenLocation[];
  onSelectEvent: (event: SOSEvent) => void;
  onToggleRescued?: (id: string) => void;
}

export default function LiveSOSFeed({
  events,
  citizens = [],
  onSelectEvent,
  onToggleRescued,
}: LiveSOSFeedProps) {
  const [filter, setFilter] = useState<"ALL" | "SOS" | "SAFE" | "LIVE" | "LAST_KNOWN">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const combinedItems = [
    ...citizens.map((c) => ({
      id: c.id,
      device_uuid: c.device_uuid,
      lat: c.lat,
      lng: c.lng,
      status: c.status,
      sos_type: c.sos_type,
      is_mesh_relayed: c.mesh_hops > 0,
      is_live: c.is_live,
      last_seen_minutes_ago: c.last_seen_minutes_ago,
      battery_pct: c.battery_pct,
      drift_radius_m: c.drift_radius_m,
      mesh_hops: c.mesh_hops,
      created_at: new Date(Date.now() - c.last_seen_minutes_ago * 60000).toISOString(),
      rescued: false,
    })),
    ...events.filter((e) => !citizens.some((c) => c.device_uuid === e.device_uuid)).map((e) => ({
      ...e,
      is_live: !e.is_mesh_relayed,
      last_seen_minutes_ago: 0,
      battery_pct: 82,
      drift_radius_m: e.is_mesh_relayed ? 350 : 0,
      mesh_hops: e.is_mesh_relayed ? 2 : 0,
    })),
  ];

  const filteredEvents = combinedItems.filter((e) => {
    if (filter === "SOS" && e.status !== "SOS") return false;
    if (filter === "SAFE" && e.status !== "SAFE") return false;
    if (filter === "LIVE" && !e.is_live) return false;
    if (filter === "LAST_KNOWN" && e.is_live) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.device_uuid.toLowerCase().includes(q) ||
        (e.sos_type && e.sos_type.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="rounded-2xl glass-panel shadow-md overflow-hidden flex flex-col h-[600px] border border-white/60">
      {/* Header */}
      <div className="p-4 border-b border-white/60 space-y-3 bg-white/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
            </span>
            <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Live Citizen Triage Feed
            </h2>
          </div>
          <div className="text-[11px] font-bold text-slate-700">
            {events.length} Active Signals
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <label htmlFor="sos-feed-search" className="sr-only">
            Search by UUID or triage report
          </label>
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
          <input
            id="sos-feed-search"
            name="sos_feed_search"
            type="text"
            placeholder="Search by UUID or incident description..."
            aria-label="Search by UUID or incident description"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/90 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-950 font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px] shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition min-h-[36px] ${
              filter === "ALL"
                ? "bg-violet-700 text-white shadow-sm"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            All ({combinedItems.length})
          </button>
          <button
            onClick={() => setFilter("SOS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 min-h-[36px] ${
              filter === "SOS"
                ? "bg-red-600 text-white font-bold"
                : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            }`}
          >
            <AlertTriangle className="w-3 h-3" aria-hidden />
            SOS ({combinedItems.filter((e) => e.status === "SOS").length})
          </button>
          <button
            onClick={() => setFilter("LIVE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 min-h-[36px] ${
              filter === "LIVE"
                ? "bg-emerald-600 text-white font-bold"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            <span>● Live GPS ({combinedItems.filter((e) => e.is_live).length})</span>
          </button>
          <button
            onClick={() => setFilter("LAST_KNOWN")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 min-h-[36px] ${
              filter === "LAST_KNOWN"
                ? "bg-amber-600 text-white font-bold"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            <Clock className="w-3 h-3" aria-hidden />
            <span>Last Known ({combinedItems.filter((e) => !e.is_live).length})</span>
          </button>
        </div>
      </div>

      {/* Streamed Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs">
            No incident signals match current criteria.
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isSOS = event.status === "SOS";

            return (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event as any)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  event.rescued
                    ? "bg-gray-50 border-gray-200 opacity-60"
                    : !event.is_live
                    ? "bg-amber-50/40 border-amber-200 hover:bg-amber-50"
                    : isSOS
                    ? "bg-red-50/40 border-red-200 hover:bg-red-50"
                    : "bg-emerald-50/30 border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`p-2 rounded-xl shrink-0 ${
                        !event.is_live
                          ? "bg-amber-100 text-amber-700"
                          : isSOS
                          ? "bg-red-100 text-red-600"
                          : "bg-emerald-100 text-emerald-600"
                      }`}
                    >
                      {!event.is_live ? (
                        <Clock className="w-4 h-4" aria-hidden />
                      ) : isSOS ? (
                        <AlertTriangle className="w-4 h-4 animate-pulse" aria-hidden />
                      ) : (
                        <CheckCircle className="w-4 h-4" aria-hidden />
                      )}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        <span>{isSOS ? "SOS EMERGENCY" : event.status}</span>
                        {event.is_live ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            LIVE GPS
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            LAST KNOWN (-{event.last_seen_minutes_ago}m)
                          </span>
                        )}
                        {event.is_mesh_relayed && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-0.5">
                            <Radio className="w-2.5 h-2.5" aria-hidden /> MESH #{event.mesh_hops}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-600 font-medium mt-0.5">
                        {event.sos_type || "Beacon Signal Active"}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-500 font-mono text-right">
                    <div>{event.battery_pct}% Battery</div>
                    {!event.is_live && event.drift_radius_m > 0 && (
                      <div className="text-amber-700 font-medium text-[9px]">±{event.drift_radius_m}m drift</div>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <div className="text-gray-500 font-mono">
                    {event.lat.toFixed(4)}°N, {event.lng.toFixed(4)}°E
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event as any);
                      }}
                      className="text-violet-700 hover:text-violet-900 font-semibold flex items-center gap-1 min-h-[36px] px-1"
                    >
                      <Navigation className="w-3 h-3" aria-hidden /> Focus Map
                    </button>

                    {isSOS && onToggleRescued && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleRescued(event.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition min-h-[36px] ${
                          event.rescued
                            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                        }`}
                      >
                        {event.rescued ? "Undo" : "Mark Rescued"}
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
