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
  Clock,
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
  const isZeroMinute = riskPercent >= 75;

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
      ? `IMMEDIATE GLOF / FLASH FLOOD SURGE IN PROGRESS in ${activeZone.name}. Evacuate low-lying riverbanks immediately uphill (>100m vertical elevation). Do not drive through bridges.`
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
          "Joshimath Helipad Multi-Hazard Shelter",
          "Govindghat High Ground Gurdwara Ground",
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                severity === "CRITICAL RED"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              }`}
            >
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span>Regional Mobile Alert Dispatcher</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ZERO-MINUTE PROTOCOL
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Direct Geo-Fenced Push to Citizen Android Devices in Sector
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {dispatchedAlert ? (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Regional Alert Broadcasted Successfully!
                </h3>
                <p className="text-xs text-emerald-300 font-mono mt-1">
                  Dispatched to {dispatchedAlert.target_nodes_count} mobile phones in {activeZone.name}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-left">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Status</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {dispatchedAlert.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Delivery ACK</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {dispatchedAlert.delivery_rate_pct}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Acoustic Siren</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {dispatchedAlert.trigger_acoustic_siren ? "TRIGGERED" : "OFF"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setDispatchedAlert(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition min-h-[40px]"
              >
                Send Another Dispatch
              </button>
            </div>
          ) : (
            <>
              {/* Sector Target Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Target Sector</span>
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    {activeZone.district}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Current AI Risk</span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      riskPercent >= 75
                        ? "text-rose-400"
                        : riskPercent >= 55
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {riskPercent.toFixed(1)}% (
                    {riskPercent >= 75 ? "RED" : riskPercent >= 55 ? "ORANGE" : "NORMAL"})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Estimated Devices</span>
                  <span className="text-xs font-mono font-bold text-sky-300 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" />
                    ~1,420 Phones in Polygon
                  </span>
                </div>
              </div>

              {/* Severity Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Alert Severity Tier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSeverity("CRITICAL RED")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] ${
                      severity === "CRITICAL RED"
                        ? "bg-rose-600/30 border-rose-500 text-rose-200 ring-2 ring-rose-500/40"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>CRITICAL RED (ZERO-MINUTE)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeverity("HIGH ORANGE")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] ${
                      severity === "HIGH ORANGE"
                        ? "bg-amber-600/30 border-amber-500 text-amber-200 ring-2 ring-amber-500/40"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Radio className="w-4 h-4 text-amber-400" />
                    <span>HIGH ORANGE (STANDBY)</span>
                  </button>
                </div>
              </div>

              {/* Alert Title */}
              <div className="space-y-1.5">
                <label
                  htmlFor="alert-title-input"
                  className="text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  Broadcast Push Title
                </label>
                <input
                  id="alert-title-input"
                  name="alert_title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              {/* Alert Message */}
              <div className="space-y-1.5">
                <label
                  htmlFor="alert-message-input"
                  className="text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  Emergency Directive Message
                </label>
                <textarea
                  id="alert-message-input"
                  name="alert_message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              {/* Acoustic Siren Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-rose-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Force Device Acoustic Siren
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Bypasses DND and silent mode on all citizen Android phones in sector
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="siren-toggle"
                  checked={triggerAcousticSiren}
                  onChange={(e) => setTriggerAcousticSiren(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500/40 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!dispatchedAlert && (
          <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 font-mono">
              Authorized under NDMA Standard Protocol • Encrypted Payload
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={handleSendBroadcast}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-mono font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-rose-950/50 min-h-[44px]"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? "Broadcasting..." : "Dispatch Regional Alert"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
