"use client";

import React, { useState } from "react";
import { HazardZone, RegionalAlert } from "@/lib/types";
import {
  ShieldAlert,
  Radio,
  X,
  Volume2,
  CheckCircle2,
  Send,
  AlertTriangle,
  Smartphone,
  MapPin,
} from "lucide-react";

interface RegionalAlertBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeZone: HazardZone;
  riskPercent: number;
  onBroadcastSuccess?: (alert: RegionalAlert) => void;
}

export default function RegionalAlertBroadcastModal({
  isOpen,
  onClose,
  activeZone,
  riskPercent,
  onBroadcastSuccess,
}: RegionalAlertBroadcastModalProps) {
  const isZeroMinute = riskPercent >= 70;

  const [severity, setSeverity] = useState<"CRITICAL RED" | "HIGH ORANGE">(
    isZeroMinute ? "CRITICAL RED" : "HIGH ORANGE"
  );
  const [title, setTitle] = useState(
    isZeroMinute
      ? `ZERO-MINUTE ALERT: MANDATORY EVACUATION (${activeZone.name.toUpperCase()})`
      : `FLOOD ADVISORY: RISING RIVER STAGE (${activeZone.name.toUpperCase()})`
  );
  const [message, setMessage] = useState(
    isZeroMinute
      ? `IMMEDIATE GLOF / FLASH FLOOD SURGE IN PROGRESS in ${activeZone.name}. Evacuate low-lying riverbanks immediately uphill (>100m vertical elevation). Do not cross bridges.`
      : `High catchment rainfall detected in ${activeZone.name}. River stage approaching warning threshold. Stay tuned and move away from watercourses.`
  );
  const [triggerAcousticSiren, setTriggerAcousticSiren] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [dispatchedAlert, setDispatchedAlert] = useState<RegionalAlert | null>(null);

  if (!isOpen) return null;

  const handleSendBroadcast = async () => {
    setIsSending(true);
    try {
      const payload = {
        zone_id: activeZone.id,
        severity,
        title,
        message,
        safe_havens: [
          "District Helipad Multi-Hazard Shelter",
          "High Ground Community Safe Haven",
        ],
        trigger_acoustic_siren: triggerAcousticSiren,
      };

      const res = await fetch("/api/alerts/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setDispatchedAlert(data.alert);
        if (onBroadcastSuccess) onBroadcastSuccess(data.alert);
      }
    } catch (err) {
      console.error("Failed to broadcast regional alert:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-900">
        {/* Modal Header */}
        <div className="bg-[#faf9f5] px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white border border-slate-300 text-slate-900">
              <Radio className="w-5 h-5 text-red-600 animate-pulse" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-950 flex items-center gap-2 font-display">
                <span>Regional Mobile Alert Dispatcher</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-300 font-black">
                  ZERO-MINUTE
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Direct Geo-Fenced Push to Citizen Android Devices in Sector
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition flex items-center justify-center border border-slate-200"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {dispatchedAlert ? (
            <div className="p-6 rounded-2xl bg-[#faf9f5] border border-slate-200 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-300">
                <CheckCircle2 className="w-8 h-8 text-emerald-700" aria-hidden />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-950 font-display">
                  Regional Alert Broadcasted Successfully!
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Dispatched to {dispatchedAlert.target_nodes_count} mobile phones in {activeZone.name}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-white p-3.5 rounded-2xl border border-slate-200 text-left">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block font-bold">Status</span>
                  <span className="text-xs font-black text-slate-950 font-mono">
                    {dispatchedAlert.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block font-bold">Delivery ACK</span>
                  <span className="text-xs font-black text-slate-950 font-mono">
                    {dispatchedAlert.delivery_rate_pct}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block font-bold">Acoustic Siren</span>
                  <span className="text-xs font-black text-slate-950 font-mono">
                    {dispatchedAlert.trigger_acoustic_siren ? "TRIGGERED" : "OFF"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setDispatchedAlert(null)}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-slate-900 hover:bg-black text-white transition shadow-xs"
              >
                Send Another Dispatch
              </button>
            </div>
          ) : (
            <>
              {/* Sector Target Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#faf9f5] p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block font-bold">Target Sector</span>
                  <span className="text-xs font-black text-slate-950 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" aria-hidden />
                    {activeZone.district}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block font-bold">Current Risk</span>
                  <span className="text-xs font-black text-slate-950">
                    {riskPercent.toFixed(1)}% (
                    {riskPercent >= 70 ? "CRITICAL" : riskPercent >= 35 ? "ELEVATED" : "NORMAL"})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block font-bold">Estimated Devices</span>
                  <span className="text-xs font-black text-slate-950 flex items-center gap-1 mt-0.5">
                    <Smartphone className="w-3.5 h-3.5 text-slate-500" aria-hidden />
                    ~1,420 Active Nodes
                  </span>
                </div>
              </div>

              {/* Severity Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                  Broadcast Alert Severity Level:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSeverity("CRITICAL RED")}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      severity === "CRITICAL RED"
                        ? "bg-red-50 border-red-400 ring-2 ring-red-400/20 shadow-xs"
                        : "bg-[#faf9f5] border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-red-950 block">
                        CRITICAL RED
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Immediate Evacuation Mandate
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeverity("HIGH ORANGE")}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      severity === "HIGH ORANGE"
                        ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                        : "bg-[#faf9f5] border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-amber-950 block">
                        HIGH ORANGE
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Elevated Flood Advisory
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Alert Broadcast Headline:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#faf9f5] border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Message Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Directive Instructions (Sent via SMS &amp; Edge Mesh Notification):
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#faf9f5] border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed"
                />
              </div>

              {/* Acoustic Siren Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#faf9f5] border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-slate-700" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Force Autonomous High-Decibel Siren
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Plays piercing oscillating civil defense tone on receiver devices
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTriggerAcousticSiren(!triggerAcousticSiren)}
                  className={`w-11 h-6 rounded-full transition flex items-center p-0.5 ${
                    triggerAcousticSiren ? "bg-slate-900" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      triggerAcousticSiren ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!dispatchedAlert && (
          <div className="bg-[#faf9f5] px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-950 hover:bg-slate-200 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleSendBroadcast}
              disabled={isSending}
              className="px-6 py-2.5 rounded-full text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-2 shadow-xs"
            >
              {isSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Dispatching to Edge...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Alert to Phones</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
