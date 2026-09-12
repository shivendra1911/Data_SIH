"use client";

import React, { useState, useEffect } from "react";
import { HazardZone } from "@/lib/types";
import {
  ShieldAlert,
  Building,
  Truck,
  Tent,
  Zap,
  CheckCircle2,
  Send,
  Plus,
  Edit3,
} from "lucide-react";

interface DirectiveItem {
  id: string;
  title: string;
  action: string;
  priority: "IMMEDIATE" | "URGENT" | "ADVISORY" | "STANDBY";
  deadline: string;
  category: "DAM" | "HIGHWAY" | "PILGRIMAGE" | "POWER";
  executed: boolean;
}

interface PreventiveDirectivesPanelProps {
  activeZone: HazardZone;
}

export default function PreventiveDirectivesPanel({
  activeZone,
}: PreventiveDirectivesPanelProps) {
  const [directives, setDirectives] = useState<DirectiveItem[]>([]);
  const [isAddingDirective, setIsAddingDirective] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newPriority, setNewPriority] = useState<"IMMEDIATE" | "URGENT" | "ADVISORY" | "STANDBY">("IMMEDIATE");
  const [newCategory, setNewCategory] = useState<"DAM" | "HIGHWAY" | "PILGRIMAGE" | "POWER">("HIGHWAY");

  // Load directives dynamically from activeZone or guidelines API
  useEffect(() => {
    if (activeZone.preventiveDirectives && activeZone.preventiveDirectives.length > 0) {
      setDirectives(
        activeZone.preventiveDirectives.map((d) => ({
          id: d.id,
          title: d.title,
          action: d.action,
          priority: d.priority,
          deadline: d.deadline,
          category: d.category,
          executed: d.executed,
        }))
      );
    } else {
      setDirectives([]);
    }
  }, [activeZone]);

  const handleAuthorize = (id: string) => {
    setDirectives((prev) =>
      prev.map((d) => (d.id === id ? { ...d, executed: !d.executed } : d))
    );
  };

  const handleAddDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAction.trim()) return;

    const newDir: DirectiveItem = {
      id: `dir-custom-${Date.now()}`,
      title: newTitle.trim(),
      action: newAction.trim(),
      priority: newPriority,
      deadline: "T - 30 mins",
      category: newCategory,
      executed: false,
    };

    setDirectives((prev) => [newDir, ...prev]);
    setNewTitle("");
    setNewAction("");
    setIsAddingDirective(false);
  };

  const getCategoryIcon = (cat: DirectiveItem["category"]) => {
    switch (cat) {
      case "DAM":
        return <Building className="w-4 h-4 text-white/80" aria-hidden />;
      case "HIGHWAY":
        return <Truck className="w-4 h-4 text-white/80" aria-hidden />;
      case "PILGRIMAGE":
        return <Tent className="w-4 h-4 text-white/80" aria-hidden />;
      case "POWER":
        return <Zap className="w-4 h-4 text-white/80" aria-hidden />;
    }
  };

  const pendingCount = directives.filter((d) => !d.executed).length;

  return (
    <div className="tilt-card tilt-card-physics p-6 sm:p-7 rounded-3xl bg-[#1b2027]/85 backdrop-blur-2xl border border-white/10 hover:border-white/20 text-white font-sans shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shadow-inner">
            <ShieldAlert className="w-4 h-4 text-white" aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white font-display">
              Pre-Impact Preventive Directives
            </h3>
            <p className="text-xs text-white/60 font-medium">
              Sector control orders for {activeZone.name.split("(")[0].trim()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {pendingCount} Pending Authorization
          </span>

          <button
            onClick={() => setIsAddingDirective((p) => !p)}
            className="h-[34px] px-4 rounded-full bg-white/5 hover:bg-white/15 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Write Directive</span>
          </button>
        </div>
      </div>

      {/* Write Directive Inline Form */}
      {isAddingDirective && (
        <form onSubmit={handleAddDirective} className="p-4 rounded-2xl bg-[#161a20]/90 border border-white/15 space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-white">✍️ Add Custom Directive</span>
            <button
              type="button"
              onClick={() => setIsAddingDirective(false)}
              className="text-xs text-white/50 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-white/60 block mb-1">Target Sector / Asset</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. NH-58 Joshimath Road Bypass"
                required
                className="w-full text-xs p-2.5 rounded-xl border border-white/15 bg-[#1b2027] text-white focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/60 block mb-1">Sector Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as DirectiveItem["category"])}
                className="w-full text-xs p-2.5 rounded-xl border border-white/15 bg-[#1b2027] text-white focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <option value="HIGHWAY">Highway / Traffic Corridor</option>
                <option value="DAM">Dam / Reservoir Sluice Gate</option>
                <option value="PILGRIMAGE">Pilgrimage / Tourist Center</option>
                <option value="POWER">Power Grid / Substation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-white/60 block mb-1">Preventive Command Action</label>
            <input
              type="text"
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              placeholder="e.g. Divert commercial traffic and initiate low-lying barrier setup"
              required
              className="w-full text-xs p-2.5 rounded-xl border border-white/15 bg-[#1b2027] text-white focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-white hover:bg-slate-200 text-[#161a20] font-black text-xs transition active:scale-95 shadow-md"
            >
              Issue Directive
            </button>
          </div>
        </form>
      )}

      {/* Directive Cards Grid */}
      <div className="space-y-2.5 relative z-10">
        {directives.length === 0 ? (
          <div className="p-6 text-center text-xs text-white/50 rounded-2xl bg-[#161a20]/60 border border-white/10">
            No active directives for this basin. Click &ldquo;Write Directive&rdquo; to author orders.
          </div>
        ) : (
          directives.map((dir) => {
            const isExecuted = dir.executed;
            const isImmediate = dir.priority === "IMMEDIATE";

            return (
              <div
                key={dir.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner ${
                  isExecuted
                    ? "bg-[#161a20]/40 border-white/5 opacity-50"
                    : "bg-[#161a20]/80 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(dir.category)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{dir.title}</h4>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isImmediate
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {dir.priority}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 font-medium leading-relaxed">
                      {dir.action}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  <span className="text-[10px] font-mono text-white/50 font-bold">
                    {dir.deadline}
                  </span>

                  <button
                    onClick={() => handleAuthorize(dir.id)}
                    className={`h-[32px] px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm border ${
                      isExecuted
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-white hover:bg-slate-200 text-[#161a20] border-white font-extrabold"
                    }`}
                  >
                    {isExecuted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Executed</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 text-[#161a20]" />
                        <span>Authorize</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
