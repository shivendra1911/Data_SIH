"use client";

import React, { useState, useEffect } from "react";
import { Mountain, AlertTriangle, Radio, CheckCircle2, Navigation, Activity, Users, Volume2, RotateCcw, Zap } from "lucide-react";

export interface LandslideSector {
  sector_id: string;
  sector_name: string;
  lat: number;
  lng: number;
  total_active_phones: number;
  quorum_threshold: number;
  status: "MONITORING" | "PENDING_QUORUM" | "CONFIRMED_LANDSLIDE" | "RESOLVED_SAFE";
  reporting_devices: string[];
  first_detected_at?: string;
  last_report_at?: string;
  latest_tremor_g: number;
  latest_frequency_hz: number;
  confirmed_at?: string;
  reporting_count: number;
  consensus_ratio_percent: number;
  has_active_directive?: boolean;
}

interface LandslideConsensusPanelProps {
  onFocusCoordinates?: (lat: number, lng: number) => void;
  onShowToast?: (message: string) => void;
}

export default function LandslideConsensusPanel({
  onFocusCoordinates,
  onShowToast,
}: LandslideConsensusPanelProps) {
  const [sectors, setSectors] = useState<LandslideSector[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const fetchSectors = async () => {
    try {
      const res = await fetch("/api/landslide/active-sectors");
      if (res.ok) {
        const data = await res.json();
        setSectors(data.sectors || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchSectors();
    const timer = setInterval(fetchSectors, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleBroadcast = async (sectorId: string) => {
    setLoadingAction(sectorId);
    try {
      const res = await fetch("/api/landslide/broadcast-directive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector_id: sectorId,
          message: "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW",
          authorized_by: "COMMAND_PORTAL",
        }),
      });
      if (res.ok) {
        if (onShowToast) onShowToast("Area-wide evacuation siren signal sent to citizen phones in sector!");
        fetchSectors();
      }
    } catch {}
    setLoadingAction(null);
  };

  const handleSimulatePhone = async (sectorId: string) => {
    setLoadingAction(`sim_${sectorId}`);
    try {
      const res = await fetch("/api/landslide/simulate-quorum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sector_id: sectorId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onShowToast) {
          if (data.status === "CONFIRMED_LANDSLIDE") {
            onShowToast("1/3rd quorum reached! Alert signal transmitted to phones.");
          } else {
            onShowToast(`Phone tremor registered in sector (${data.reporting_count || 1}/${data.quorum_threshold || 3} phones).`);
          }
        }
        fetchSectors();
      }
    } catch {}
    setLoadingAction(null);
  };

  const handleResetSector = async (sectorId: string) => {
    setLoadingAction(`reset_${sectorId}`);
    try {
      const res = await fetch("/api/landslide/simulate-quorum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sector_id: sectorId, reset: true }),
      });
      if (res.ok) {
        if (onShowToast) onShowToast("Sector reset to normal monitoring.");
        fetchSectors();
      }
    } catch {}
    setLoadingAction(null);
  };

  const handleSimulateLiveTremor = async () => {
    setLoadingAction("sim_live_gps");
    let lat = 27.6015;
    let lng = 77.5975;
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}
    }

    const secLat = lat.toFixed(2).replace(".", "_");
    const secLng = lng.toFixed(2).replace(".", "_");
    const sectorId = `sector_${secLat}_${secLng}`;
    const sectorName = `Sector [${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E]`;

    try {
      const res = await fetch("/api/landslide/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector_id: sectorId,
          sector_name: sectorName,
          lat,
          lng,
          tremor_g: 0.22,
          frequency_hz: 18.5,
          duration_s: 30,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onShowToast) {
          if (data.is_confirmed) {
            onShowToast("1/3rd quorum reached at your GPS sector! Evacuation siren active.");
          } else {
            onShowToast(`Tremor report sent from your GPS location (${data.reporting_count || 1}/${data.quorum_threshold || 3} phones).`);
          }
        }
        fetchSectors();
      }
    } catch {}
    setLoadingAction(null);
  };

  const confirmedCount = sectors.filter((s) => s.status === "CONFIRMED_LANDSLIDE").length;

  return (
    <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 space-y-4 text-slate-800 font-sans h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
            <Mountain className={`w-4 h-4 ${confirmedCount > 0 ? "text-amber-600 animate-pulse" : "text-slate-600"}`} aria-hidden />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 font-display">
                Landslide Early Warning
              </h3>
              {confirmedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSimulateLiveTremor}
            disabled={loadingAction === "sim_live_gps"}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Simulate a phone tremor sensor at your actual device GPS coordinates"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Simulate Tremor (My GPS)</span>
          </button>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              confirmedCount > 0
                ? "bg-red-500/10 text-red-700 border border-red-500/20"
                : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
            }`}
          >
            {confirmedCount > 0 ? `${confirmedCount} Quorum Confirmed` : "All Sectors Stable"}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {sectors.length} Sectors Monitored
          </span>
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[440px] pr-1">
        {sectors.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs rounded-2xl bg-slate-50 border border-slate-100">
            Connecting to Landslide Sector Telemetry Engine...
          </div>
        ) : (
          sectors.map((sec) => {
            const isConfirmed = sec.status === "CONFIRMED_LANDSLIDE";
            const isPending = sec.status === "PENDING_QUORUM";
            const hasReports = (sec.reporting_count || 0) > 0;

            return (
              <div
                key={sec.sector_id}
                className={`p-4 rounded-2xl border transition-all ${
                  isConfirmed
                    ? "bg-red-50/70 border-red-200 shadow-xs"
                    : isPending
                    ? "bg-amber-50/60 border-amber-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{sec.sector_name}</span>
                      <span
                        className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isConfirmed
                            ? "bg-red-600 text-white"
                            : isPending
                            ? "bg-amber-500 text-white"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }`}
                      >
                        {isConfirmed
                          ? "1/3rd Quorum Confirmed"
                          : isPending
                          ? "Analyzing Harmonic Tremor"
                          : "Stable Ground"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Coordinates: {sec.lat.toFixed(4)}°N, {sec.lng.toFixed(4)}°E</span>
                      <span>•</span>
                      <span>Active Sector Devices: {sec.total_active_phones}</span>
                    </div>
                  </div>

                  {onFocusCoordinates && (
                    <button
                      onClick={() => onFocusCoordinates(sec.lat, sec.lng)}
                      className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium transition-colors"
                      title="Focus on Command Map"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Locate Sector</span>
                    </button>
                  )}
                </div>

                {/* Consensus Progress Bar & Telemetry Metrics */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>Phones Hit Threshold Frequency:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      <strong className={isConfirmed ? "text-red-600" : isPending ? "text-amber-600" : "text-emerald-600"}>
                        {sec.reporting_count} / {sec.quorum_threshold}
                      </strong>{" "}
                      Phones ({sec.consensus_ratio_percent}%)
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isConfirmed
                          ? "bg-red-600"
                          : isPending
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.max(hasReports ? 33 : 4, (sec.reporting_count / sec.quorum_threshold) * 100)}%` }}
                    />
                  </div>

                  {/* Seismic Vibration Frequency Readout */}
                  <div className="flex justify-between items-center text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1 font-mono">
                      <Activity className="w-3 h-3 text-slate-500" />
                      Seismic Frequency: {sec.latest_frequency_hz > 0 ? `${sec.latest_frequency_hz.toFixed(1)} Hz` : "Normal (18.4 Hz band)"}
                    </span>
                    <span className="font-mono font-semibold text-slate-700">
                      Tremor: {sec.latest_tremor_g > 0 ? `${sec.latest_tremor_g.toFixed(2)}g` : "0.0g RMS (Stable)"}
                    </span>
                  </div>
                </div>

                {/* Actions: Simulate Phone Tremor / Send Alert Signal */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSimulatePhone(sec.sector_id)}
                      disabled={loadingAction === `sim_${sec.sector_id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Simulate Phone Tremor</span>
                    </button>

                    {hasReports && (
                      <button
                        onClick={() => handleResetSector(sec.sector_id)}
                        disabled={loadingAction === `reset_${sec.sector_id}`}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 transition cursor-pointer"
                        title="Reset sector to normal"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleBroadcast(sec.sector_id)}
                    disabled={loadingAction === sec.sector_id}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                      isConfirmed
                        ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                        : "bg-slate-800 hover:bg-slate-900 text-white"
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isConfirmed ? "Send Signal to Phones (Evacuation Siren)" : "Issue Sector Directive"}</span>
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
