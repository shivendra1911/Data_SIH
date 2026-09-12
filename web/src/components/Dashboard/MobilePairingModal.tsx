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

  const localIp = "172.16.184.105";
  const triggerUrl = `http://${localIp}:3000/api/sos/trigger`;
  const predictionUrl = `http://${localIp}:3000/api/prediction/current?zone_id=chamoli_01`;
  const safeRoutesUrl = `http://${localIp}:3000/api/routes/safe?zone_id=chamoli_01`;

  const sampleJson = {
    device_uuid: "pixel8-field-node-01",
    name: "Citizen (Mobile APK)",
    phone: "+91 98765 43210",
    lat: 30.5582,
    lng: 79.5651,
    status: "SOS",
    sos_type: "TRAPPED IN FLASH FLOOD",
    battery_pct: 82,
    medical_distress: "WATER_RISING",
    is_mesh_relayed: true,
    zone_id: "chamoli_01",
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
      if (res.ok) {
        setTestStatus("✓ Received 200 OK — Packet Plotted to Radar Queue");
        onSimulateAndroidSOS(sampleJson);
      } else {
        setTestStatus(`Error ${res.status}: ${data.error || "Failed"}`);
      }
    } catch (err: any) {
      setTestStatus(`Network Error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#faf9f5] text-slate-900 border border-slate-300 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-slate-900" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-950 flex items-center gap-2 font-display">
                Android App Pairing Station
                <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ONLINE
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Direct integration endpoints for React Native / Android citizen distress reporting
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition flex items-center justify-center border border-slate-200"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* Network info */}
        <div className="p-3.5 rounded-2xl bg-[#faf9f5] border border-slate-200 flex items-center gap-3 text-xs text-slate-700">
          <Wifi className="w-4 h-4 text-slate-600 shrink-0" aria-hidden />
          <div>
            <span className="text-slate-500">Wi-Fi LAN Server IP:</span>{" "}
            <strong className="text-slate-950 font-mono">{localIp}:3000</strong> &bull;{" "}
            <span className="text-slate-500">Listening on 0.0.0.0</span>
          </div>
        </div>

        {/* API Endpoints for Mobile Dev */}
        <div className="space-y-2.5 text-xs">
          <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
            1. Mobile SOS POST Endpoint:
          </label>
          <div className="flex items-center gap-2 bg-[#faf9f5] p-2.5 rounded-xl border border-slate-200 font-mono text-[11px]">
            <span className="text-emerald-700 font-bold">POST</span>
            <span className="flex-1 truncate text-slate-900">{triggerUrl}</span>
            <button
              onClick={() => copyToClipboard(triggerUrl, "trigger")}
              className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition shadow-2xs"
              title="Copy endpoint"
            >
              {copiedField === "trigger" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block pt-1">
            2. Real-Time Risk &amp; Hydrograph Telemetry:
          </label>
          <div className="flex items-center gap-2 bg-[#faf9f5] p-2.5 rounded-xl border border-slate-200 font-mono text-[11px]">
            <span className="text-blue-700 font-bold">GET</span>
            <span className="flex-1 truncate text-slate-900">{predictionUrl}</span>
            <button
              onClick={() => copyToClipboard(predictionUrl, "pred")}
              className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition shadow-2xs"
              title="Copy endpoint"
            >
              {copiedField === "pred" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Sample Payload */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[11px]">
              <Code2 className="w-3.5 h-3.5" /> JSON Distress Payload Schema:
            </span>
            <button
              onClick={() => copyToClipboard(JSON.stringify(sampleJson, null, 2), "json")}
              className="text-[11px] text-slate-600 hover:text-slate-950 font-bold flex items-center gap-1"
            >
              {copiedField === "json" ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-3.5 rounded-2xl bg-[#faf9f5] border border-slate-200 text-slate-800 text-[11px] font-mono overflow-x-auto max-h-36">
            {JSON.stringify(sampleJson, null, 2)}
          </pre>
        </div>

        {/* Live Test Trigger Button */}
        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            {testStatus || "Click to test sending an emergency payload right now."}
          </div>

          <button
            onClick={runTestPacket}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Test Packet Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}