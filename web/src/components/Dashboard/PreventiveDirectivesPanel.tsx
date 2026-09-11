"use client";

import React, { useState, useEffect } from "react";
import { HazardZone, PreventiveDirective } from "@/lib/types";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Send,
  Building,
  Truck,
  Tent,
  Zap,
} from "lucide-react";

interface PreventiveDirectivesPanelProps {
  activeZone: HazardZone;
}

export default function PreventiveDirectivesPanel({
  activeZone,
}: PreventiveDirectivesPanelProps) {
  const [directives, setDirectives] = useState<PreventiveDirective[]>(
    activeZone.preventiveDirectives
  );

  useEffect(() => {
    setDirectives(activeZone.preventiveDirectives);
  }, [activeZone]);

  const handleAuthorize = (id: string) => {
    setDirectives((prev) =>
      prev.map((d) => (d.id === id ? { ...d, executed: !d.executed } : d))
    );
  };

  const getCategoryIcon = (category: PreventiveDirective["category"]) => {
    switch (category) {
      case "DAM":
        return <Building className="w-4 h-4 text-violet-600" aria-hidden />;
      case "HIGHWAY":
        return <Truck className="w-4 h-4 text-amber-600" aria-hidden />;
      case "PILGRIMAGE":
        return <Tent className="w-4 h-4 text-emerald-600" aria-hidden />;
      case "POWER":
        return <Zap className="w-4 h-4 text-purple-600" aria-hidden />;
    }
  };

  const pendingCount = directives.filter((d) => !d.executed).length;

  return (
    <div className="tilt-card rounded-2xl glass-panel shadow-md overflow-hidden flex flex-col h-full border border-white/60">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/60 flex items-center justify-between bg-white/40 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-4 h-4 text-red-700" aria-hidden />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Pre-Disaster Mitigation Directives
            </h2>
            <p className="text-[11px] font-semibold text-slate-600">
              Autonomous Dam Buffer, Highway Diversions & Evacuation Orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 uppercase shadow-xs">
            {pendingCount} Orders Pending
          </span>
        </div>
      </div>

      {/* Directives List */}
      <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto relative z-10 flex-1">
        {directives.map((directive) => {
          const isImmediate = directive.priority === "IMMEDIATE";

          return (
            <div
              key={directive.id}
              className={`p-3.5 rounded-xl border transition-all ${
                directive.executed
                  ? "backdrop-blur-md bg-white/50 border-slate-200 opacity-80"
                  : isImmediate
                  ? "backdrop-blur-md bg-red-50/80 border-red-300 shadow-sm"
                  : "backdrop-blur-md bg-white/70 border-white/80 shadow-xs"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/90 border border-slate-200 shrink-0 mt-0.5 shadow-xs">
                    {getCategoryIcon(directive.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-950 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {directive.title}
                      </span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-xs ${
                          directive.priority === "IMMEDIATE"
                            ? "bg-red-600 text-white"
                            : "bg-amber-500 text-slate-950"
                        }`}
                      >
                        {directive.priority}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 font-medium mt-1 leading-relaxed">
                      {directive.action}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-600 font-semibold">
                      <span>Execution Deadline: <strong className="text-red-700 font-black">{directive.deadline}</strong></span>
                      <span>•</span>
                      <span>Target Sector: <strong className="text-slate-900 font-black">{directive.category}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Solid Authorization Toggle Button */}
                <button
                  onClick={() => handleAuthorize(directive.id)}
                  aria-label={directive.executed ? "Order executed" : "Authorize dispatch directive"}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition min-h-[44px] shrink-0 flex items-center justify-center gap-1.5 active:scale-95 shadow-sm ${
                    directive.executed
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "btn-solid-primary"
                  }`}
                >
                  {directive.executed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                      <span>Executed</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" aria-hidden />
                      <span>Authorize Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}