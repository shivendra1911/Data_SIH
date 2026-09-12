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
import { supabase } from "@/lib/supabase";

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

  const handleAddDirective = async (e: React.FormEvent) => {
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

    // 1. Dispatch to local guidelines API
    fetch("/api/guidelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zone_id: activeZone.id,
        title: newDir.title,
        immediate_actions: [newDir.action],
        high_ground_directives: [newDir.action],
        alert_level: newDir.priority === "IMMEDIATE" ? "RED" : "ORANGE",
      }),
    }).catch((err) => console.warn("[DirectivesPanel] Local API sync error:", err));

    // 2. Dispatch directly to Supabase cloud table for instant mobile phone push
    try {
      const res = await supabase
        .from("sos_alerts")
        .insert([
        {
          device_id: "GOVT_DIRECTIVE",
          lat: activeZone.center ? activeZone.center[0] : 27.6015,
          lng: activeZone.center ? activeZone.center[1] : 77.5975,
          sos_type: "GOVT_DIRECTIVE",
          status: "ACTIVE",
          battery_level: 100,
          notes: JSON.stringify({
            id: newDir.id,
            title: newDir.title,
            action: newDir.action,
            priority: newDir.priority,
            category: newDir.category,
            zone_id: activeZone.id,
            zone_name: activeZone.name,
            created_at: new Date().toISOString(),
          }),
        },
      ]);
      if (res && (res as any).error) {
        console.warn("[DirectivesPanel] Supabase cloud directive push error:", (res as any).error);
      } else {
        console.log("[DirectivesPanel] Government directive synced to cloud for mobile APKs!");
      }
    } catch (err) {
      console.warn("[DirectivesPanel] Cloud sync error:", err);
    }
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
    <div className="p-6 rounded-3xl glass-card text-slate-800 font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
            <ShieldAlert className="w-4 h-4 text-slate-800" aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 font-display">
              Pre-Impact Preventive Directives
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Sector control orders for {activeZone.name.split("(")[0].trim()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
            {pendingCount} Pending Authorization
          </span>

          <button
            onClick={() => setIsAddingDirective((p) => !p)}
            className="h-[30px] px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1 transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Write Directive</span>
          </button>
        </div>
      </div>

      {/* Write Directive Inline Form */}
      {isAddingDirective && (
        <form onSubmit={handleAddDirective} className="p-4 rounded-2xl bg-[#f1f5f9] border border-slate-300 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">✍️ Add Custom Directive</span>
            <button
              type="button"
              onClick={() => setIsAddingDirective(false)}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold"
            >
              Cancel
            </button>
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Directive title (e.g. Halt Riverbank Ferry Operations)"
            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800"
          />

          <textarea
            rows={2}
            value={newAction}
            onChange={(e) => setNewAction(e.target.value)}
            placeholder="Mandatory action instructions..."
            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="px-2.5 py-1 text-xs rounded-lg bg-white border border-slate-300 text-slate-800"
              >
                <option value="DAM">DAM</option>
                <option value="HIGHWAY">HIGHWAY</option>
                <option value="PILGRIMAGE">PILGRIMAGE</option>
                <option value="POWER">POWER</option>
              </select>

              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="px-2.5 py-1 text-xs rounded-lg bg-white border border-slate-300 text-slate-800"
              >
                <option value="IMMEDIATE">IMMEDIATE</option>
                <option value="URGENT">URGENT</option>
                <option value="ADVISORY">ADVISORY</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-[#f8fafc] text-xs font-bold transition shadow-2xs border border-slate-700"
            >
              Commit Directive
            </button>
          </div>
        </form>
      )}

      {/* Directives List */}
      <div className="space-y-2.5">
        {directives.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 rounded-2xl bg-[#f1f5f9] border border-slate-200">
            No active directives for this basin. Click &ldquo;Write Directive&rdquo; to author orders.
          </div>
        ) : (
          directives.map((dir) => {
            const isExecuted = dir.executed;
            const isImmediate = dir.priority === "IMMEDIATE";

            return (
              <div
                key={dir.id}
                className={`p-4 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 border shadow-xs ${
                  isExecuted
                    ? "bg-slate-100/70 border-slate-200 opacity-60 text-slate-700"
                    : "bg-[#f1f5f9] border-slate-200/80 hover:bg-white text-slate-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {getCategoryIcon(dir.category)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800">{dir.title}</h4>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isImmediate
                            ? "bg-red-500/10 text-red-700 border border-red-500/20 font-mono"
                            : "bg-amber-500/10 text-amber-700 border border-amber-500/20 font-mono"
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

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <span className="text-[11px] font-mono text-slate-500 font-bold tracking-tight">
                    {dir.deadline}
                  </span>

                  {/* High-Contrast Action Authorization Button */}
                  <button
                    onClick={() => handleAuthorize(dir.id)}
                    className={`min-h-[38px] px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shadow-sm cursor-pointer ${
                      isExecuted
                        ? "bg-emerald-600 hover:bg-emerald-700 text-[#f8fafc] shadow-emerald-600/20"
                        : "bg-slate-800 hover:bg-slate-900 text-[#f8fafc] hover:scale-[1.02] active:scale-[0.98] shadow-sm border border-slate-700"
                    }`}
                    title={isExecuted ? "Directive Authorized and Logged" : "Click to Authorize Directive"}
                  >
                    {isExecuted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#f8fafc]" />
                        <span>Executed</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-amber-300" />
                        <span className="tracking-wide uppercase text-[11px]">Authorize</span>
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
