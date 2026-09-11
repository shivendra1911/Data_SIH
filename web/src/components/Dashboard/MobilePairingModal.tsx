"use client";

import React, { useState } from "react";
import {
  Smartphone,
  CheckCircle2,
  Copy,
  Wifi,
  Send,
  X,
  Code2,
} from "lucide-react";

interface MobilePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateAndroidSOS: (payload: any) => void;
}

export default function MobilePairingModal({
  isOpen,
  onClose,
  onSimulateAndroidSOS,
}: MobilePairingModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const localIp = "172.16.183.190";
  const triggerUrl = `http://${localIp}:3000/api/sos/trigger`;
  const predictionUrl = `http://${localIp}:3000/api/prediction/current?zone_id=chamoli_01`;

  const sampleJson = {
    device_uuid: "pixel8-field-node-01",
    lat: 30.5582,
    lng: 79.5651,
    status: "SOS",
    sos_type: "TRAPPED IN RIVER FLASH FLOOD",
    is_mesh_relayed: true,
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const runTestPacket = async () => {
    setTestStatus("Sending packet to /api/sos/trigger...");
    try {
      const res = await fetch("/api/sos/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleJson),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus("✓ Received! Incident plotted onto map radar!");
        onSimulateAndroidSOS(data.event);
      } else {
        setTestStatus("Error: " + data.error);
      }
    } catch (err: any) {
      setTestStatus("Connection error: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center">
              <Smartphone className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Android App Pairing Station
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ONLINE
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Direct integration endpoints for React Native / Expo citizen and responder apps
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

        {/* Network info */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center gap-3 text-xs text-gray-700">
          <Wifi className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
          <div>
            <span className="text-gray-500">Wi-Fi LAN Server IP:</span>{" "}
            <strong className="text-gray-900 font-mono text-sm">{localIp}</strong>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              Ensure both the Android test device and host computer are on the same Wi-Fi or hotspot.
            </span>
          </div>
        </div>

        {/* Endpoint 1: SOS Trigger */}
        <div className="space-y-1.5">
          <label htmlFor="mobile-trigger-url" className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center justify-between">
            <span>1. Android SOS Dispatch Endpoint (POST)</span>
            <span className="text-[10px] text-emerald-700 font-semibold">CORS Enabled</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="mobile-trigger-url"
              name="mobile_trigger_url"
              type="text"
              readOnly
              aria-label="Android SOS Trigger Endpoint URL"
              value={triggerUrl}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-violet-700 select-all min-h-[44px]"
            />
            <button
              onClick={() => copyToClipboard(triggerUrl, "trigger")}
              aria-label="Copy trigger URL"
              className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 min-h-[44px]"
            >
              {copiedField === "trigger" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="w-4 h-4" aria-hidden />
              )}
              <span>{copiedField === "trigger" ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Endpoint 2: Prediction Current */}
        <div className="space-y-1.5">
          <label htmlFor="mobile-pred-url" className="text-xs font-bold uppercase tracking-wider text-gray-700">
            2. Android Prediction Feed Endpoint (GET)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="mobile-pred-url"
              name="mobile_pred_url"
              type="text"
              readOnly
              aria-label="Android Prediction Fetch Endpoint URL"
              value={predictionUrl}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-violet-700 select-all min-h-[44px]"
            />
            <button
              onClick={() => copyToClipboard(predictionUrl, "prediction")}
              aria-label="Copy prediction URL"
              className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 min-h-[44px]"
            >
              {copiedField === "prediction" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="w-4 h-4" aria-hidden />
              )}
              <span>{copiedField === "prediction" ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* JSON Payload Spec */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-700">
            <span className="flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5 text-gray-500" aria-hidden /> Expected Android SOS JSON Payload
            </span>
            <button
              onClick={() =>
                copyToClipboard(JSON.stringify(sampleJson, null, 2), "json")
              }
              className="text-[11px] text-violet-700 hover:underline font-semibold flex items-center gap-1"
            >
              {copiedField === "json" ? "Copied JSON" : "Copy JSON"}
            </button>
          </div>
          <pre className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-[11px] font-mono text-gray-800 overflow-x-auto">
            {JSON.stringify(sampleJson, null, 2)}
          </pre>
        </div>

        {/* Test Live Bridge Button */}
        <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {testStatus && (
              <span className="text-emerald-700 font-semibold">{testStatus}</span>
            )}
          </div>

          <button
            onClick={runTestPacket}
            aria-label="Send test Android SOS packet to server"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
          >
            <Send className="w-4 h-4" aria-hidden />
            <span>Test Android SOS Packet Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}