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
        return <Building className="w-4 h-4 text-slate-700" aria-hidden />;
      case "HIGHWAY":
        return <Truck className="w-4 h-4 text-slate-700" aria-hidden />;
      case "PILGRIMAGE":
        return <Tent className="w-4 h-4 text-slate-700" aria-hidden />;
      case "POWER":
        return <Zap className="w-4 h-4 text-slate-700" aria-hidden />;
    }
  };

  const pendingCount = directives.filter((d) => !d.executed).length;

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 text-slate-900 font-sans shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#faf9f5] border border-slate-300 flex items-center justify-center text-slate-900">
            <ShieldAlert className="w-4 h-4 text-slate-900" aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-950 font-display">
              Pre-Impact Preventive Directives
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Sector control orders for {activeZone.name.split("(")[0].trim()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
            {pendingCount} Pending Authorization
          </span>

          <button
            onClick={() => setIsAddingDirective((p) => !p)}
            className="h-[30px] px-2.5 rounded-xl bg-[#faf9f5] hover:bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold flex items-center gap-1 transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Write Directive</span>
          </button>
        </div>
      </div>

      {/* Write Directive Inline Form */}
      {isAddingDirective && (
        <form onSubmit={handleAddDirective} className="p-4 rounded-2xl bg-[#faf9f5] border border-slate-300 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-900">✍️ Add Custom Directive</span>
            <button
              type="button"
              onClick={() => setIsAddingDirective(false)}
              className="text-xs text-slate-500 hover:text-slate-900 font-bold"
            >
              Cancel
            </button>
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Directive title (e.g. Halt Riverbank Ferry Operations)"
            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />

          <textarea
            rows={2}
            value={newAction}
            onChange={(e) => setNewAction(e.target.value)}
            placeholder="Mandatory action instructions..."
            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="px-2.5 py-1 text-xs rounded-lg bg-white border border-slate-300 text-slate-900"
              >
                <option value="DAM">DAM</option>
                <option value="HIGHWAY">HIGHWAY</option>
                <option value="PILGRIMAGE">PILGRIMAGE</option>
                <option value="POWER">POWER</option>
              </select>

              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="px-2.5 py-1 text-xs rounded-lg bg-white border border-slate-300 text-slate-900"
              >
                <option value="IMMEDIATE">IMMEDIATE</option>
                <option value="URGENT">URGENT</option>
                <option value="ADVISORY">ADVISORY</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-2xs"
            >
              Commit Directive
            </button>
          </div>
        </form>
      )}

      {/* Directives List */}
      <div className="space-y-2.5">
        {directives.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 rounded-2xl bg-[#faf9f5] border border-slate-200">
            No active directives for this basin. Click &ldquo;Write Directive&rdquo; to author orders.
          </div>
        ) : (
          directives.map((dir) => {
            const isExecuted = dir.executed;
            const isImmediate = dir.priority === "IMMEDIATE";

            return (
              <div
                key={dir.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                  isExecuted
                    ? "bg-[#faf9f5] border-slate-200 opacity-60"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#faf9f5] border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(dir.category)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-950">{dir.title}</h4>
                      <span
                        className={`text-[9px] font-black px-2 py-0.2 rounded-full uppercase tracking-wider ${
                          isImmediate
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {dir.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {dir.action}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  <span className="text-[10px] font-mono text-slate-500 font-bold">
                    {dir.deadline}
                  </span>

                  <button
                    onClick={() => handleAuthorize(dir.id)}
                    className={`h-[30px] px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs border ${
                      isExecuted
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-[#faf9f5] hover:bg-slate-100 text-slate-900 border-slate-300"
                    }`}
                  >
                    {isExecuted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Executed</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 text-slate-700" />
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
