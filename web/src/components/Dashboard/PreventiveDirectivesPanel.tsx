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
        return <Building className="w-4 h-4 text-cyan-400" />;
      case "HIGHWAY":
        return <Truck className="w-4 h-4 text-amber-400" />;
      case "PILGRIMAGE":
        return <Tent className="w-4 h-4 text-emerald-400" />;
      case "POWER":
        return <Zap className="w-4 h-4 text-violet-400" />;
    }
  };

  const pendingCount = directives.filter((d) => !d.executed).length;

  return (
    <div className="tilt-card rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h2 className="text-xs font-mono font-bold text-white tracking-wider uppercase">
              Pre-Disaster Mitigation Directives
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              Autonomous Dam Buffer, Highway Interception & Civil Evacuation Protocols
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
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
                  ? "bg-slate-950/40 border-slate-800/80 opacity-75"
                  : isImmediate
                  ? "bg-gradient-to-r from-rose-950/40 to-slate-950/70 border-rose-500/40 shadow-sm"
                  : "bg-slate-950/70 border-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                    {getCategoryIcon(directive.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white tracking-tight">
                        {directive.title}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                          directive.priority === "IMMEDIATE"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {directive.priority}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {directive.action}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-slate-400">
                      <span>Execution Deadline: <strong className="text-amber-400">{directive.deadline}</strong></span>
                      <span>Target: <strong className="text-slate-200">{directive.category}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Authorization Toggle Button */}
                <button
                  onClick={() => handleAuthorize(directive.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition min-h-[40px] shrink-0 flex items-center gap-1.5 ${
                    directive.executed
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-lg shadow-rose-950/50"
                  }`}
                >
                  {directive.executed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ORDER EXECUTED</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>AUTHORIZE DISPATCH</span>
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