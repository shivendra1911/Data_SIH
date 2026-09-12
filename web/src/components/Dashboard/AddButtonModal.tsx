"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  ExternalLink,
  Phone,
  AlertTriangle,
  Radio,
  Megaphone,
  Shield,
  Zap,
  Check,
} from "lucide-react";

export interface CustomActionButton {
  id: string;
  label: string;
  actionType: "LINK" | "CALL" | "ALERT";
  value: string;
  color: "slate" | "red" | "emerald" | "blue" | "amber";
  iconName: "Phone" | "ExternalLink" | "AlertTriangle" | "Radio" | "Megaphone" | "Shield" | "Zap";
}

const STORAGE_KEY = "sentinel_custom_action_buttons";

export function getStoredCustomButtons(): CustomActionButton[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveCustomButtons(buttons: CustomActionButton[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buttons));
    window.dispatchEvent(new Event("custom_action_buttons_changed"));
  } catch {}
}

interface AddButtonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onButtonAdded?: (button: CustomActionButton) => void;
}

export default function AddButtonModal({ isOpen, onClose, onButtonAdded }: AddButtonModalProps) {
  const [buttons, setButtons] = useState<CustomActionButton[]>([]);
  const [label, setLabel] = useState("");
  const [actionType, setActionType] = useState<"LINK" | "CALL" | "ALERT">("LINK");
  const [value, setValue] = useState("");
  const [color, setColor] = useState<"slate" | "red" | "emerald" | "blue" | "amber">("slate");
  const [iconName, setIconName] = useState<"Phone" | "ExternalLink" | "AlertTriangle" | "Radio" | "Megaphone" | "Shield" | "Zap">("ExternalLink");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setButtons(getStoredCustomButtons());
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateButton = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLabel = label.trim();
    const trimmedValue = value.trim();

    if (!trimmedLabel) {
      setFeedback("Please enter a button label");
      return;
    }
    if (!trimmedValue) {
      setFeedback("Please enter a destination URL, phone number, or alert message");
      return;
    }

    const newButton: CustomActionButton = {
      id: `btn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label: trimmedLabel,
      actionType,
      value: trimmedValue,
      color,
      iconName,
    };

    const updated = [...buttons, newButton];
    saveCustomButtons(updated);
    setButtons(updated);

    if (onButtonAdded) onButtonAdded(newButton);

    setLabel("");
    setValue("");
    setFeedback(`Button "${trimmedLabel}" added successfully!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDeleteButton = (id: string) => {
    const updated = buttons.filter((b) => b.id !== id);
    saveCustomButtons(updated);
    setButtons(updated);
  };

  const applyTemplate = (tpl: {
    label: string;
    actionType: "LINK" | "CALL" | "ALERT";
    value: string;
    color: "slate" | "red" | "emerald" | "blue" | "amber";
    iconName: "Phone" | "ExternalLink" | "AlertTriangle" | "Radio" | "Megaphone" | "Shield" | "Zap";
  }) => {
    setLabel(tpl.label);
    setActionType(tpl.actionType);
    setValue(tpl.value);
    setColor(tpl.color);
    setIconName(tpl.iconName);
    setFeedback(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-button-title"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="add-button-title" className="text-base font-extrabold text-slate-950">
                Custom Action Button Manager
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Add and pin your own custom buttons to the top command bar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950 flex items-center justify-center border border-slate-200 transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Quick 1-Click Templates:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                applyTemplate({
                  label: "NDRF 24x7 HQ",
                  actionType: "CALL",
                  value: "1078",
                  color: "emerald",
                  iconName: "Phone",
                })
              }
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition"
            >
              📞 NDRF HQ (1078)
            </button>
            <button
              type="button"
              onClick={() =>
                applyTemplate({
                  label: "Emergency 112",
                  actionType: "CALL",
                  value: "112",
                  color: "red",
                  iconName: "Phone",
                })
              }
              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 text-xs font-bold transition"
            >
              🚨 National 112
            </button>
            <button
              type="button"
              onClick={() =>
                applyTemplate({
                  label: "IMD Weather Radar",
                  actionType: "LINK",
                  value: "https://mausam.imd.gov.in/responsive/radar.php",
                  color: "blue",
                  iconName: "ExternalLink",
                })
              }
              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 text-xs font-bold transition"
            >
              🛰️ IMD Radar
            </button>
            <button
              type="button"
              onClick={() =>
                applyTemplate({
                  label: "High-Ground Siren",
                  actionType: "ALERT",
                  value: "🚨 IMMEDIATE EVACUATION ORDER: Move to designated high-ground refuge sanctuary now!",
                  color: "red",
                  iconName: "AlertTriangle",
                })
              }
              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 text-xs font-bold transition"
            >
              ⚠️ Evacuation Alert
            </button>
          </div>
        </div>

        <form onSubmit={handleCreateButton} className="p-4 rounded-2xl bg-[#faf9f5] border border-slate-200 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Create New Action Button
            </span>
            {feedback && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                {feedback}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Button Label / Title:</label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. District Control Room, Call 112, Satellite Live..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Action Type:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActionType("LINK");
                  setIconName("ExternalLink");
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  actionType === "LINK"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open URL</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionType("CALL");
                  setIconName("Phone");
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  actionType === "CALL"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Phone</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionType("ALERT");
                  setIconName("AlertTriangle");
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  actionType === "ALERT"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Screen Alert</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              {actionType === "LINK"
                ? "Destination Web Link (URL):"
                : actionType === "CALL"
                ? "Phone Number to Dial:"
                : "Emergency Alert Notice Content:"}
            </label>
            <input
              type={actionType === "CALL" ? "tel" : "text"}
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                actionType === "LINK"
                  ? "https://ndrf.gov.in"
                  : actionType === "CALL"
                  ? "112 or +91 9876543210"
                  : "Evacuate valley floor immediately to high ground!"
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Button Theme / Color:</label>
            <div className="flex items-center gap-2">
              {[
                { id: "slate", label: "Dark", cls: "bg-slate-900 text-white" },
                { id: "red", label: "Red / Alert", cls: "bg-red-600 text-white" },
                { id: "emerald", label: "Green / Safe", cls: "bg-emerald-600 text-white" },
                { id: "blue", label: "Blue / Info", cls: "bg-blue-600 text-white" },
                { id: "amber", label: "Amber / Warning", cls: "bg-amber-500 text-white" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${c.cls} ${
                    color === c.id ? "ring-2 ring-offset-2 ring-slate-950 scale-105" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  {color === c.id && <Check className="w-3 h-3" />}
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Button to Command Bar</span>
          </button>
        </form>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Currently Configured Buttons ({buttons.length})
            </span>
            {buttons.length > 0 && (
              <span className="text-[11px] text-slate-500">
                Buttons automatically appear in the top header
              </span>
            )}
          </div>

          {buttons.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              No custom buttons added yet. Use the form above or pick a template!
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {buttons.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        b.color === "red"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : b.color === "emerald"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : b.color === "blue"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : b.color === "amber"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-900 border border-slate-200"
                      }`}
                    >
                      {b.label}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono truncate max-w-[220px]">
                      {b.actionType}: {b.value}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteButton(b.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title={`Delete ${b.label}`}
                    aria-label={`Delete button ${b.label}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-white transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}