"use client";

import React, { useState } from "react";
import {
  Smartphone,
  CheckCircle2,
  Copy,
  ExternalLink,
  Wifi,
  Radio,
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
    device_uuid: "pixel8-chamoli-node-01",
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
        setTestStatus("✓ Received! Event plotted onto Leaflet map radar!");
        onSimulateAndroidSOS(data.event);
      } else {
        setTestStatus("Error: " + data.error);
      }
    } catch (err: any) {
      setTestStatus("Connection error: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Android Mobile App Bridge Station
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  READY TO PAIR
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Give these endpoints to your teammate building the Expo / React Native app
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network info */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3 text-xs text-slate-300">
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className="text-slate-400">Your Machine Wi-Fi LAN IP:</span>{" "}
            <strong className="text-white font-mono text-sm">{localIp}</strong>
            <span className="text-[11px] text-slate-400 block">
              Ensure both the Android phone and your laptop are on the same Wi-Fi / Hotspot.
            </span>
          </div>
        </div>

        {/* Endpoint 1: SOS Trigger */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>1. Android SOS Trigger Endpoint (POST)</span>
            <span className="text-[10px] text-slate-400">CORS Enabled</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={triggerUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-sky-300 select-all"
            />
            <button
              onClick={() => copyToClipboard(triggerUrl, "trigger")}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 min-h-[40px]"
            >
              {copiedField === "trigger" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copiedField === "trigger" ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Endpoint 2: Prediction Current */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            2. Android Prediction Fetch Endpoint (GET)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={predictionUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 select-all"
            />
            <button
              onClick={() => copyToClipboard(predictionUrl, "prediction")}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 min-h-[40px]"
            >
              {copiedField === "prediction" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copiedField === "prediction" ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* JSON Payload Spec */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
            <span className="flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5 text-slate-400" /> Expected Android JSON Payload
            </span>
            <button
              onClick={() =>
                copyToClipboard(JSON.stringify(sampleJson, null, 2), "json")
              }
              className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
            >
              {copiedField === "json" ? "Copied JSON" : "Copy JSON"}
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
            {JSON.stringify(sampleJson, null, 2)}
          </pre>
        </div>

        {/* Test Live Bridge Button */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {testStatus && (
              <span className="text-emerald-400 font-semibold">{testStatus}</span>
            )}
          </div>

          <button
            onClick={runTestPacket}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-950 min-h-[44px]"
          >
            <Send className="w-4 h-4" />
            <span>Test Android SOS Packet Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}