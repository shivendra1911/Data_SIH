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
    <div className="rounded-2xl bg-[#1b2027]/90 border border-white/10 shadow-xl overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-white/10 space-y-3 bg-[#161a20]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Live Citizen Triage Feed
            </h2>
          </div>
          <div className="text-[11px] font-bold text-white/70">
            {events.length} Active Signals
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <label htmlFor="sos-feed-search" className="sr-only">
            Search by UUID or triage report
          </label>
          <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
          <input
            id="sos-feed-search"
            name="sos_feed_search"
            type="text"
            placeholder="Search by UUID or incident description..."
            aria-label="Search by UUID or incident description"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161a20] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 min-h-[40px]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition min-h-[32px] ${
              filter === "ALL"
                ? "bg-white text-[#161a20] font-bold shadow-sm"
                : "bg-white/5 text-white/60 hover:text-white border border-white/10"
            }`}
          >
            All ({combinedItems.length})
          </button>
          <button
            onClick={() => setFilter("SOS")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1 min-h-[32px] ${
              filter === "SOS"
                ? "bg-white text-[#161a20] font-bold shadow-sm"
                : "bg-white/5 text-white/60 hover:text-white border border-white/10"
            }`}
          >
            <AlertTriangle className="w-3 h-3" aria-hidden />
            SOS ({combinedItems.filter((e) => e.status === "SOS").length})
          </button>
          <button
            onClick={() => setFilter("LIVE")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1 min-h-[32px] ${
              filter === "LIVE"
                ? "bg-white text-[#161a20] font-bold shadow-sm"
                : "bg-white/5 text-white/60 hover:text-white border border-white/10"
            }`}
          >
            <span>● Live GPS ({combinedItems.filter((e) => e.is_live).length})</span>
          </button>
          <button
            onClick={() => setFilter("LAST_KNOWN")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1 min-h-[32px] ${
              filter === "LAST_KNOWN"
                ? "bg-white text-[#161a20] font-bold shadow-sm"
                : "bg-white/5 text-white/60 hover:text-white border border-white/10"
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
          <div className="p-8 text-center text-white/40 text-xs">
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
                    ? "bg-[#161a20]/40 border-white/5 opacity-60"
                    : isSOS
                    ? "bg-[#161a20] border-white/25 hover:border-white/40"
                    : "bg-[#161a20]/80 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl shrink-0 bg-white/10 text-white">
                      {!event.is_live ? (
                        <Clock className="w-4 h-4 text-white/60" aria-hidden />
                      ) : isSOS ? (
                        <AlertTriangle className="w-4 h-4 text-white animate-pulse" aria-hidden />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-white" aria-hidden />
                      )}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        <span>{isSOS ? "SOS EMERGENCY" : event.status}</span>
                        {event.is_live ? (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white text-[#161a20]">
                            LIVE GPS
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15">
                            LAST KNOWN (-{event.last_seen_minutes_ago}m)
                          </span>
                        )}
                        {event.is_mesh_relayed && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15 flex items-center gap-0.5">
                            <Radio className="w-2.5 h-2.5" aria-hidden /> MESH #{event.mesh_hops}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/70 font-medium mt-0.5">
                        {event.sos_type || "Beacon Signal Active"}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-white/50 font-mono text-right">
                    <div>{event.battery_pct}% Battery</div>
                    {!event.is_live && event.drift_radius_m > 0 && (
                      <div className="text-white/60 font-medium text-[9px]">±{event.drift_radius_m}m drift</div>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <div className="text-white/50 font-mono">
                    {event.lat.toFixed(4)}°N, {event.lng.toFixed(4)}°E
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event as any);
                      }}
                      className="text-white/80 hover:text-white font-semibold flex items-center gap-1 min-h-[32px] px-2 rounded-full border border-white/15 bg-white/5"
                    >
                      <Navigation className="w-3 h-3" aria-hidden /> Focus Map
                    </button>

                    {isSOS && onToggleRescued && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleRescued(event.id);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition min-h-[32px] ${
                          event.rescued
                            ? "bg-white/10 text-white/60 hover:text-white border border-white/15"
                            : "btn-solid-primary"
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
