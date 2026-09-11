"use client";

import React, { useState, useEffect } from "react";
import { HazardZone, PreventiveDirective } from "@/lib/types";
import { Language, translations } from "@/lib/i18n";
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
  language?: Language;
}

export default function PreventiveDirectivesPanel({
  activeZone,
  language = "en",
}: PreventiveDirectivesPanelProps) {
  const [directives, setDirectives] = useState<PreventiveDirective[]>(
    activeZone.preventiveDirectives
  );
  const t = translations[language];

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
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              {t.preventiveTitle}
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              {language === "hi"
                ? "डैम, राजमार्ग और तीर्थयात्रियों के लिए पूर्व सुरक्षा उपाय"
                : "Automated Dam, Highway & Pilgrimage Mitigation Protocols"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {pendingCount} {language === "hi" ? "लंबित" : "Pending"}
          </span>
        </div>
      </div>

      {/* Directives List */}
      <div className="p-4 space-y-3 max-h-[380px] overflow-y-auto">
        {directives.map((directive) => {
          const isImmediate = directive.priority === "IMMEDIATE";

          return (
            <div
              key={directive.id}
              className={`p-3.5 rounded-xl border transition-all ${
                directive.executed
                  ? "bg-slate-950/40 border-slate-800 opacity-75"
                  : isImmediate
                  ? "bg-gradient-to-r from-rose-950/30 to-slate-950/60 border-rose-500/40 shadow-sm"
                  : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 mt-0.5">
                    {getCategoryIcon(directive.category)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {directive.title}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                          isImmediate
                            ? "bg-rose-500 text-white"
                            : "bg-amber-500 text-slate-950"
                        }`}
                      >
                        {directive.priority === "IMMEDIATE"
                          ? language === "hi"
                            ? "अति आवश्यक"
                            : "IMMEDIATE"
                          : language === "hi"
                          ? "परामर्श"
                          : "ADVISORY"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {directive.action}
                    </p>

                    <div className="text-[11px] text-slate-400 font-mono mt-1.5 flex items-center gap-2">
                      <span>
                        {language === "hi" ? "कार्यवाही समय-सीमा: " : "Execution Window: "}
                        <strong className="text-amber-400">{directive.deadline}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Trigger */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                {directive.executed ? (
                  <div className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      {t.orderDispatched}
                    </span>
                    <button
                      onClick={() => handleAuthorize(directive.id)}
                      className="text-[10px] text-slate-400 hover:text-white underline min-h-[36px] px-2"
                    >
                      {language === "hi" ? "वापस लें" : "Revoke"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAuthorize(directive.id)}
                    className="w-full bg-slate-800 hover:bg-rose-600 active:scale-[0.99] text-white font-semibold py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-md min-h-[44px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t.authorizeBtn}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}