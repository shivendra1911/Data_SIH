"use client";

import React, { useState } from "react";
import { SOSEvent } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Radio,
  Clock,
  Search,
  Navigation,
  CheckCircle2,
} from "lucide-react";

interface LiveSOSFeedProps {
  events: SOSEvent[];
  onSelectEvent: (event: SOSEvent) => void;
  onToggleRescued?: (id: string) => void;
}

export default function LiveSOSFeed({
  events,
  onSelectEvent,
  onToggleRescued,
}: LiveSOSFeedProps) {
  const [filter, setFilter] = useState<"ALL" | "SOS" | "SAFE" | "HELPING" | "MESH">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = events.filter((e) => {
    if (filter === "SOS" && e.status !== "SOS") return false;
    if (filter === "SAFE" && e.status !== "SAFE") return false;
    if (filter === "HELPING" && e.status !== "HELPING") return false;
    if (filter === "MESH" && !e.is_mesh_relayed) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.device_uuid.toLowerCase().includes(q) ||
        (e.sos_type && e.sos_type.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const sosCount = events.filter((e) => e.status === "SOS" && !e.rescued).length;
  const safeCount = events.filter((e) => e.status === "SAFE").length;
  const meshCount = events.filter((e) => e.is_mesh_relayed).length;

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl overflow-hidden backdrop-blur-md flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Live Citizen Triage Feed
            </h2>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            {events.length} Total Signals
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by UUID or triage report..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition min-h-[32px] ${
              filter === "ALL"
                ? "bg-slate-200 text-slate-950 font-bold"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            All ({events.length})
          </button>
          <button
            onClick={() => setFilter("SOS")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 min-h-[32px] ${
              filter === "SOS"
                ? "bg-rose-600 text-white font-bold"
                : "bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 border border-rose-500/30"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            SOS ({sosCount})
          </button>
          <button
            onClick={() => setFilter("SAFE")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 min-h-[32px] ${
              filter === "SAFE"
                ? "bg-emerald-600 text-white font-bold"
                : "bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-500/30"
            }`}
          >
            <CheckCircle className="w-3 h-3" />
            Safe ({safeCount})
          </button>
          <button
            onClick={() => setFilter("MESH")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 min-h-[32px] ${
              filter === "MESH"
                ? "bg-sky-600 text-white font-bold"
                : "bg-sky-950/40 text-sky-300 hover:bg-sky-900/50 border border-sky-500/30"
            }`}
          >
            <Radio className="w-3 h-3" />
            BLE Mesh ({meshCount})
          </button>
        </div>
      </div>

      {/* Streamed Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No incident signals match current criteria.
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isSOS = event.status === "SOS";
            const isSafe = event.status === "SAFE";
            const isHelping = event.status === "HELPING";

            return (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className={`p-3 rounded-xl border transition-all cursor-pointer hover:border-slate-600 ${
                  event.rescued
                    ? "bg-slate-950/40 border-slate-800 opacity-60"
                    : isSOS
                    ? "bg-rose-950/25 border-rose-500/40 hover:bg-rose-950/40 shadow-sm shadow-rose-950/30"
                    : isSafe
                    ? "bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-950/30"
                    : "bg-sky-950/20 border-sky-500/30 hover:bg-sky-950/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-lg ${
                        isSOS
                          ? "bg-rose-500/20 text-rose-400"
                          : isSafe
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-sky-500/20 text-sky-400"
                      }`}
                    >
                      {isSOS ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                      ) : isSafe ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <HelpCircle className="w-4 h-4 text-sky-400" />
                      )}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{isSOS ? "SOS EMERGENCY" : event.status}</span>
                        {event.is_mesh_relayed && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-500/40 flex items-center gap-0.5">
                            <Radio className="w-2 h-2" /> MESH
                          </span>
                        )}
                        {event.rescued && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                            RESCUED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium">
                        {event.sos_type || "No distress details"}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>
                      {new Date(event.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <div className="text-slate-400 font-mono">
                    {event.lat.toFixed(4)}°N, {event.lng.toFixed(4)}°E
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                      className="text-slate-300 hover:text-white flex items-center gap-1 underline-offset-2 hover:underline min-h-[36px] px-1"
                    >
                      <Navigation className="w-3 h-3" /> Focus Map
                    </button>

                    {isSOS && onToggleRescued && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleRescued(event.id);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition min-h-[36px] ${
                          event.rescued
                            ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
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
