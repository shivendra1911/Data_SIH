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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                severity === "CRITICAL RED"
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-amber-50 text-amber-600 border border-amber-200"
              }`}
            >
              <Radio className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <span>Regional Mobile Alert Dispatcher</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold">
                  ZERO-MINUTE
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Direct Geo-Fenced Push to Citizen Android Devices in Sector
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {dispatchedAlert ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" aria-hidden />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Regional Alert Broadcasted Successfully!
                </h3>
                <p className="text-xs text-emerald-800 font-medium mt-1">
                  Dispatched to {dispatchedAlert.target_nodes_count} mobile phones in {activeZone.name}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-emerald-200 text-left">
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block font-semibold">Status</span>
                  <span className="text-xs font-bold text-emerald-700">
                    {dispatchedAlert.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block font-semibold">Delivery ACK</span>
                  <span className="text-xs font-bold text-gray-900">
                    {dispatchedAlert.delivery_rate_pct}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block font-semibold">Acoustic Siren</span>
                  <span className="text-xs font-bold text-violet-700">
                    {dispatchedAlert.trigger_acoustic_siren ? "TRIGGERED" : "OFF"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setDispatchedAlert(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-xs font-semibold text-white transition min-h-[44px]"
              >
                Send Another Dispatch
              </button>
            </div>
          ) : (
            <>
              {/* Sector Target Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                <div>
                  <span className="text-[10px] uppercase text-gray-500 block font-semibold">Target Sector</span>
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-violet-600" aria-hidden />
                    {activeZone.district}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-500 block font-semibold">Current AI Risk</span>
                  <span
                    className={`text-xs font-bold ${
                      riskPercent >= 75
                        ? "text-red-600"
                        : riskPercent >= 55
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {riskPercent.toFixed(1)}% (
                    {riskPercent >= 75 ? "RED" : riskPercent >= 55 ? "ORANGE" : "NORMAL"})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-500 block font-semibold">Estimated Devices</span>
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1 mt-0.5">
                    <Smartphone className="w-3.5 h-3.5 text-violet-600" aria-hidden />
                    ~1,420 Phones in Zone
                  </span>
                </div>
              </div>

              {/* Severity Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Alert Severity Tier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSeverity("CRITICAL RED")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] ${
                      severity === "CRITICAL RED"
                        ? "bg-red-50 border-red-500 text-red-700 ring-2 ring-red-200"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600" aria-hidden />
                    <span>CRITICAL RED (ZERO-MINUTE)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeverity("HIGH ORANGE")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] ${
                      severity === "HIGH ORANGE"
                        ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-200"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Radio className="w-4 h-4 text-amber-600" aria-hidden />
                    <span>HIGH ORANGE (STANDBY)</span>
                  </button>
                </div>
              </div>

              {/* Alert Title */}
              <div className="space-y-1.5">
                <label
                  htmlFor="alert-title-input"
                  className="text-xs font-bold uppercase tracking-wider text-gray-700"
                >
                  Broadcast Push Title
                </label>
                <input
                  id="alert-title-input"
                  name="alert_title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[40px]"
                />
              </div>

              {/* Alert Message */}
              <div className="space-y-1.5">
                <label
                  htmlFor="alert-message-input"
                  className="text-xs font-bold uppercase tracking-wider text-gray-700"
                >
                  Emergency Directive Message
                </label>
                <textarea
                  id="alert-message-input"
                  name="alert_message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Acoustic Siren Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-red-600" aria-hidden />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">
                      Trigger Phone Siren Alert
                    </span>
                    <span className="text-[11px] text-gray-500 block">
                      Overrides silent mode on all citizen Android phones in region
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="siren-toggle"
                  checked={triggerAcousticSiren}
                  onChange={(e) => setTriggerAcousticSiren(e.target.checked)}
                  className="w-5 h-5 rounded text-violet-600 focus:ring-violet-500 border-gray-300 cursor-pointer"
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!dispatchedAlert && (
          <div className="bg-white px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-gray-500">
              Authorized under NDMA / SDMA Early Warning Protocol
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 transition min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={handleSendBroadcast}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm min-h-[44px]"
              >
                <Send className="w-4 h-4" aria-hidden />
                <span>{isSending ? "Broadcasting..." : "Dispatch Regional Alert"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
