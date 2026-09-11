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
    <div className="tilt-card rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-red-600" aria-hidden />
          </div>
          <div>
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Pre-Disaster Mitigation Directives
            </h2>
            <p className="text-[11px] text-gray-500">
              Autonomous Dam Buffer, Highway Diversions & Evacuation Orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 uppercase">
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
                  ? "bg-gray-50 border-gray-200 opacity-75"
                  : isImmediate
                  ? "bg-red-50/40 border-red-200 shadow-sm"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-gray-50 border border-gray-200 shrink-0 mt-0.5">
                    {getCategoryIcon(directive.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {directive.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          directive.priority === "IMMEDIATE"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {directive.priority}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                      {directive.action}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                      <span>Execution Deadline: <strong className="text-red-600 font-semibold">{directive.deadline}</strong></span>
                      <span>•</span>
                      <span>Target Sector: <strong className="text-gray-700">{directive.category}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Authorization Toggle Button */}
                <button
                  onClick={() => handleAuthorize(directive.id)}
                  aria-label={directive.executed ? "Order executed" : "Authorize dispatch directive"}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition min-h-[44px] shrink-0 flex items-center justify-center gap-1.5 ${
                    directive.executed
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-violet-700 hover:bg-violet-600 text-white shadow-sm active:scale-95"
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