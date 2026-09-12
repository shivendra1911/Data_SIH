"use client";

import React, { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

export interface FabAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "danger" | "success" | "dark" | "amber" | "blue";
  badge?: string | number;
  title?: string;
}

interface CommandFABProps {
  actions: FabAction[];
  /** Small label shown once, above the stack, when open (e.g. "Command Actions") */
  menuLabel?: string;
}

function toneClasses(tone: FabAction["tone"] = "default") {
  switch (tone) {
    case "danger":
      return "bg-red-600/90 hover:bg-red-500 text-white border-red-500/50 shadow-red-600/20";
    case "success":
      return "bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-500/50 shadow-emerald-600/20";
    case "dark":
      return "bg-[#1b2027]/95 hover:bg-[#252c38] text-white border-white/20";
    case "amber":
      return "bg-amber-500/90 hover:bg-amber-400 text-slate-950 border-amber-400/50";
    case "blue":
      return "bg-blue-600/90 hover:bg-blue-500 text-white border-blue-500/50";
    case "default":
    default:
      return "bg-[#1b2027]/95 hover:bg-[#252c38] text-white border-white/15 hover:border-white/30";
  }
}

/**
 * A single floating, expandable action button that replaces a row of
 * separate buttons. Fixed to the bottom-right of the viewport so it is
 * reachable from anywhere on the page, on every screen size.
 */
export default function CommandFAB({ actions, menuLabel = "Command Actions" }: CommandFABProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[60] flex flex-col items-end gap-2.5 font-sans"
    >
      {/* Expanded action list */}
      <div
        className={`flex flex-col items-end gap-2 transition-all duration-200 ease-out motion-reduce:transition-none ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
        role="menu"
        aria-hidden={!open}
      >
        <span className="text-[10px] font-black uppercase tracking-wider text-white bg-black/80 backdrop-blur-md px-3 py-1 rounded-full shadow-lg border border-white/10 mb-0.5 font-display">
          {menuLabel}
        </span>
        {actions.map((action) => (
          <button
            key={action.id}
            role="menuitem"
            onClick={() => {
              action.onClick();
              setOpen(false);
            }}
            title={action.title || action.label}
            className={`h-[44px] pl-4 pr-5 rounded-full border text-xs font-bold flex items-center gap-2.5 shadow-2xl backdrop-blur-xl transition active:scale-95 whitespace-nowrap ${toneClasses(
              action.tone
            )}`}
          >
            {action.icon}
            <span>{action.label}</span>
            {action.badge !== undefined && action.badge !== "" && (
              <span className="ml-0.5 min-w-[20px] h-[20px] px-1 rounded-full bg-white/20 text-[10px] font-black flex items-center justify-center">
                {action.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label={open ? "Close command actions" : "Open command actions"}
        aria-expanded={open}
        className="w-14 h-14 rounded-full bg-white hover:bg-slate-100 text-[#161a20] shadow-2xl border border-white/40 flex items-center justify-center transition motion-reduce:transition-none active:scale-95 hover:scale-105"
      >
        <Plus
          className={`w-6 h-6 transition-transform duration-200 motion-reduce:transition-none ${
            open ? "rotate-45" : "rotate-0"
          }`}
        />
      </button>
    </div>
  );
}
