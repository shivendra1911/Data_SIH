"use client";

import React, { useState } from "react";
import { HazardZone } from "@/lib/types";
import {
  ShieldAlert,
  Building,
  Truck,
  Tent,
  Zap,
  CheckCircle2,
  Send,
} from "lucide-react";

interface PreventiveDirective {
  id: string;
  title: string;
  action: string;
  priority: "IMMEDIATE" | "URGENT" | "ADVISORY";
  deadline: string;
  category: "DAM" | "HIGHWAY" | "PILGRIMAGE" | "POWER";
  executed: boolean;
}

interface PreventiveDirectivesPanelProps {
  activeZone: HazardZone;
}

const INITIAL_DIRECTIVES: PreventiveDirective[] = [
  {
    id: "dir-01",
    title: "Tapovan-Vishnugad Dam Spillway Buffer Discharge",
    action: "Autonomous pre-release of 250 m³/s to create downstream flood absorption volume.",
    priority: "IMMEDIATE",
    deadline: "T - 90 mins",
    category: "DAM",
    executed: false,
  },
  {
    id: "dir-02",
    title: "NH-7 (Badrinath Highway) Traffic Halt",
    action: "Order Uttarakhand Police & BRO to halt civilian traffic at Helang and Joshimath checkpoints. Close low-lying river bridges.",
    priority: "IMMEDIATE",
    deadline: "T - 45 mins",
    category: "HIGHWAY",
    executed: false,
  },
  {
    id: "dir-03",
    title: "Govindghat Riverside Pilgrimage Camp Clearing",
    action: "Order SDMA SDRF personnel to evacuate 400+ pilgrims from temporary riverbank shelters to high-ground Gurdwara grounds.",
    priority: "IMMEDIATE",
    deadline: "T - 60 mins",
    category: "PILGRIMAGE",
    executed: false,
  },
  {
    id: "dir-04",
    title: "NTPC Hydroelectric Intake Tunnel Shutdown",
    action: "Depressurize power intake tunnels to avoid silt sedimentation and structural collapse.",
    priority: "ADVISORY",
    deadline: "T - 120 mins",
    category: "POWER",
    executed: true,
  },
];

export default function PreventiveDirectivesPanel({
  activeZone,
}: PreventiveDirectivesPanelProps) {
  const [directives, setDirectives] = useState<PreventiveDirective[]>(INITIAL_DIRECTIVES);

  const handleAuthorize = (id: string) => {
    setDirectives((prev) =>
      prev.map((d) => (d.id === id ? { ...d, executed: !d.executed } : d))
    );
  };

  const getCategoryIcon = (cat: PreventiveDirective["category"]) => {
    switch (cat) {
      case "DAM":
        return <Building className="w-4 h-4 text-violet-300" aria-hidden />;
      case "HIGHWAY":
        return <Truck className="w-4 h-4 text-amber-300" aria-hidden />;
      case "PILGRIMAGE":
        return <Tent className="w-4 h-4 text-emerald-300" aria-hidden />;
      case "POWER":
        return <Zap className="w-4 h-4 text-purple-300" aria-hidden />;
    }
  };

  const pendingCount = directives.filter((d) => !d.executed).length;

  return (
    <div className="flex flex-col h-full space-y-3 text-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between relative z-10 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shadow-xs text-white">
            <ShieldAlert className="w-4 h-4" aria-hidden />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-[1.5px] font-display">
              Pre-Disaster Mitigation Directives
            </h2>
            <p className="text-[11px] font-medium text-white/70">
              Autonomous Dam Buffer, Highway Diversions &amp; Evacuation Orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 uppercase tracking-wider">
            {pendingCount} Pending
          </span>
        </div>
      </div>

      {/* Directives List */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto relative z-10 flex-1">
        {directives.map((directive) => {
          const isImmediate = directive.priority === "IMMEDIATE";

          return (
            <div
              key={directive.id}
              className={`p-4 rounded-2xl border transition-all ${
                directive.executed
                  ? "backdrop-blur-md bg-white/5 border-white/10 opacity-75 text-white/60"
                  : isImmediate
                  ? "backdrop-blur-md bg-red-950/25 border-red-500/35 shadow-sm text-white"
                  : "backdrop-blur-md bg-[#1b2027]/75 border-white/10 hover:bg-[#212730]/90 shadow-xs text-white"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-full bg-white/10 border border-white/15 shrink-0 mt-0.5 shadow-xs">
                    {getCategoryIcon(directive.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white tracking-tight font-display">
                        {directive.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs ${
                          directive.priority === "IMMEDIATE"
                            ? "bg-red-600 text-white"
                            : "bg-amber-500 text-[#161a20]"
                        }`}
                      >
                        {directive.priority}
                      </span>
                    </div>

                    <p className="text-xs text-white/75 font-normal mt-1.5 leading-relaxed font-sans">
                      {directive.action}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-white/60 font-medium">
                      <span>Execution Deadline: <strong className="text-red-400 font-bold">{directive.deadline}</strong></span>
                      <span>•</span>
                      <span>Sector: <strong className="text-white font-bold">{directive.category}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Solid Authorization Toggle Button */}
                <button
                  onClick={() => handleAuthorize(directive.id)}
                  aria-label={directive.executed ? "Order executed" : "Authorize dispatch directive"}
                  className={`shrink-0 ${
                    directive.executed
                      ? "btn-solid-emerald"
                      : "btn-solid-primary"
                  }`}
                >
                  {directive.executed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
                      <span>Executed</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" aria-hidden />
                      <span>Authorize</span>
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
