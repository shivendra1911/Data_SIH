"use client";

import React, { useState, useEffect } from "react";
import {
  Radio,
  MapPin,
  Clock,
  Compass,
  Zap,
  Activity,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Navigation,
} from "lucide-react";

interface Breadcrumb {
  id: string;
  device_uuid: string;
  phone_model: string;
  lat: number;
  lng: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  status: string;
  sos_type?: string;
  timestamp: string;
}

export default function DisasterLocationStream() {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastSynced, setLastSynced] = useState<string>("Connecting...");
  const [streamActive, setStreamActive] = useState<boolean>(true);

  const fetchStream = async () => {
    try {
      const res = await fetch("/api/citizen/telemetry-stream");
      if (res.ok) {
        const data = await res.json();
        if (data.breadcrumbs && Array.isArray(data.breadcrumbs)) {
          setBreadcrumbs(data.breadcrumbs);
          setLastSynced(new Date().toLocaleTimeString());
        }
      }
    } catch (e) {
      console.debug("Telemetry stream fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStream();
    const interval = setInterval(fetchStream, 4000);
    return () => clearInterval(interval);
  }, []);

  const latest = breadcrumbs[0] || null;

  return (
    <div className="rounded-3xl border border-slate-200 glass-card shadow-lg overflow-hidden font-sans">
      {/* Header Banner - Dark Slate Neutral Palette */}
      <div className="bg-[#1e293b] px-5 py-4 text-[#f8fafc] flex flex-wrap items-center justify-between gap-3 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
            <Radio className="w-5 h-5 text-red-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <h3 className="font-extrabold text-base tracking-tight text-[#f8fafc]">
                Disaster Live GPS Telemetry Stream (5-Second High-Frequency Tracker)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Continuous live breadcrumb coordinates captured every 5000ms during active emergencies &amp; SOS beacons
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Last Sync: {lastSynced}</span>
          </span>
          <button
            onClick={fetchStream}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#f8fafc] border border-slate-700 transition"
            title="Refresh stream"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="p-5 space-y-5">
        {latest ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Primary Live Device Card */}
            <div className="lg:col-span-1 rounded-2xl bg-[#f1f5f9] border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-700 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider">
                  Live Stream Active
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {new Date(latest.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-slate-800" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{latest.phone_model || "Vivo V2437"}</h4>
                  <p className="text-xs text-slate-500 font-mono">UUID: {latest.device_uuid.slice(0, 14)}...</p>
                </div>
              </div>

              {/* Exact Coordinates */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-600" /> Live GPS:
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {latest.lat.toFixed(6)}°N, {latest.lng.toFixed(6)}°E
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Accuracy / Altitude:</span>
                  <span className="font-medium text-slate-700">
                    ±{Math.round(latest.accuracy || 10)}m &bull; {Math.round(latest.altitude || 184)}m MSL
                  </span>
                </div>
              </div>

              {/* Tactical Satellite Map Shortcut */}
              <a
                href={`https://maps.google.com/?q=${latest.lat},${latest.lng}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-[#f8fafc] text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs border border-slate-700"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Open in Tactical Satellite Map</span>
              </a>
            </div>

            {/* Breadcrumb Trail Feed (Chronological Table) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-slate-700" />
                  Chronological 5-Second Breadcrumb Sequence ({breadcrumbs.length} Pings Recorded)
                </span>
                <span className="text-[11px] text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">
                  5s Cadence
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                {breadcrumbs.slice(0, 15).map((point, index) => (
                  <div
                    key={point.id || index}
                    className={`px-4 py-2 flex items-center justify-between transition ${
                      index === 0 ? "bg-slate-100/60 font-semibold" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-slate-400 font-mono text-[10px]">#{breadcrumbs.length - index}</span>
                      <span className="font-mono text-slate-800">
                        {point.lat.toFixed(6)}°N, {point.lng.toFixed(6)}°E
                      </span>
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 rounded-sm bg-red-500/10 text-red-700 border border-red-500/20 text-[9px] font-bold">
                          LATEST
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-slate-500 font-mono">
                      <span>±{Math.round(point.accuracy || 10)}m</span>
                      <span className="text-slate-700">{new Date(point.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 space-y-2">
            <Radio className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
            <p className="text-sm font-semibold text-slate-800">Waiting for 5-Second Disaster Telemetry Stream...</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              When a citizen triggers SOS or is inside an active RED danger zone, the mobile device automatically streams its live high-precision GPS coordinates every 5 seconds to this console.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
