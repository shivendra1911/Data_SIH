"use client";

import React, { useState, useEffect } from "react";
import { Mountain, AlertTriangle, ShieldCheck, Radio, CheckCircle2, Navigation, Activity, Users, Volume2 } from "lucide-react";

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
          authorized_by: "COMMAND_PORTAL_USAR",
        }),
      });
      if (res.ok) {
        if (onShowToast) onShowToast("Area-wide evacuation siren broadcast dispatched to all devices in sector!");
        fetchSectors();
      }
    } catch {}
    setLoadingAction(null);
  };

  const handleSimulate = async (sectorId: string) => {
    setLoadingAction(`sim_${sectorId}`);
    try {
      const res = await fetch("/api/landslide/simulate-quorum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sector_id: sectorId }),
      });
      if (res.ok) {
        if (onShowToast) onShowToast("Simulated 1/3rd sector quorum! 3+ devices confirmed landslide tremor.");
        fetchSectors();
      }
    } catch {}
    setLoadingAction(null);
  };

  const handleCancel = async (sectorId: string) => {
    setLoadingAction(`cancel_${sectorId}`);
    try {
      const res = await fetch("/api/landslide/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sector_id: sectorId }),
      });
      if (res.ok) {
        if (onShowToast) onShowToast(`Landslide alarm cancelled for sector ${sectorId}`);
        fetchSectors();
      }
    } catch {}
    setLoadingAction(null);
  };

  const confirmedCount = sectors.filter((s) => s.status === "CONFIRMED_LANDSLIDE").length;

  return (
    <div className="tilt-card rounded-2xl bg-[#1b2027]/90 shadow-xl overflow-hidden flex flex-col h-full border border-amber-500/30 text-white">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-amber-500/20 flex items-center justify-between bg-amber-950/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-xs">
            <Mountain className="w-4 h-4 text-amber-400" aria-hidden />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wide font-display flex items-center gap-2">
              Sub-Surface Landslide Sentinel (1/3rd Quorum)
              {confirmedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
              )}
            </h2>
            <p className="text-[11px] font-semibold text-white/60">
              Harmonic Tremor Verification • Confirmed when &ge; 1/3rd area mobiles report
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
              confirmedCount > 0 ? "bg-red-600 text-white animate-pulse" : "bg-emerald-600/80 text-white"
            } shadow-xs`}
          >
            {confirmedCount > 0 ? `${confirmedCount} Quorum Confirmed` : "All Sectors Stable"}
          </span>
          <span className="text-[11px] font-bold text-white/80">
            {sectors.length} Monitored Sectors
          </span>
        </div>
      </div>

      {/* Content List */}
      <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar flex-1">
        {sectors.length === 0 ? (
          <div className="text-center py-6 text-white/50 text-xs">
            Connecting to Landslide Sector Telemetry Engine...
          </div>
        ) : (
          sectors.map((sec) => {
            const isConfirmed = sec.status === "CONFIRMED_LANDSLIDE";
            const isPending = sec.status === "PENDING_QUORUM";
            const progressRatio = Math.min(100, Math.round((sec.reporting_count / sec.quorum_threshold) * 100));

            return (
              <div
                key={sec.sector_id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isConfirmed
                    ? "bg-red-950/40 border-red-500/50 shadow-lg shadow-red-950/20"
                    : isPending
                    ? "bg-amber-950/30 border-amber-500/40"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{sec.sector_name}</span>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isConfirmed
                            ? "bg-red-600 text-white"
                            : isPending
                            ? "bg-amber-600 text-white"
                            : "bg-emerald-600/30 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {isConfirmed ? "⛰️ 1/3RD QUORUM CONFIRMED" : isPending ? "PENDING 1/3RD QUORUM" : "STABLE • MONITORING"}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/60 mt-0.5 flex items-center gap-2">
                      <span>Coordinates: {sec.lat.toFixed(4)}°N, {sec.lng.toFixed(4)}°E</span>
                      <span>•</span>
                      <span>Total Active Devices: {sec.total_active_phones}</span>
                    </div>
                  </div>

                  {onFocusCoordinates && (
                    <button
                      onClick={() => onFocusCoordinates(sec.lat, sec.lng)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                      title="Focus on Command Map"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Consensus Progress Bar & Telemetry Metrics */}
                <div className="bg-black/30 rounded-lg p-2.5 my-2.5 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-white/70 font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      1/3rd Consensus Quorum:
                    </span>
                    <span className="font-mono font-bold text-white">
                      {sec.reporting_count} / {sec.total_active_phones} Devices ({sec.consensus_ratio_percent}%)
                      <span className="text-white/50 text-[10px] ml-1">
                        [Threshold: {sec.quorum_threshold} devices]
                      </span>
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isConfirmed
                          ? "bg-gradient-to-r from-amber-500 to-red-500"
                          : isPending
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.max(5, (sec.reporting_count / sec.total_active_phones) * 100)}%` }}
                    />
                  </div>

                  {/* Seismic Vibration Frequency Readout */}
                  <div className="flex justify-between items-center text-[10px] text-white/60 pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1 font-mono">
                      <Activity className="w-3 h-3 text-cyan-400" />
                      Seismic Band: {sec.latest_frequency_hz > 0 ? `${sec.latest_frequency_hz.toFixed(1)} Hz` : "18.4 Hz harmonic"}
                    </span>
                    <span className="font-mono">
                      Tremor: {sec.latest_tremor_g > 0 ? `${sec.latest_tremor_g.toFixed(2)}g` : "0.20g RMS"}
                    </span>
                  </div>
                </div>

                {/* Directive & Simulation Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSimulate(sec.sector_id)}
                      disabled={loadingAction === `sim_${sec.sector_id}`}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-bold text-amber-300 transition-colors flex items-center gap-1"
                    >
                      <Radio className="w-3 h-3" />
                      Simulate 1/3rd Quorum
                    </button>

                    {isConfirmed && (
                      <button
                        onClick={() => handleCancel(sec.sector_id)}
                        disabled={loadingAction === `cancel_${sec.sector_id}`}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white/80 transition-colors"
                      >
                        Reset / Safe
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleBroadcast(sec.sector_id)}
                    disabled={loadingAction === sec.sector_id}
                    className={`px-3 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all shadow-sm ${
                      isConfirmed
                        ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
                        : "bg-white/10 hover:bg-white/20 text-white/90"
                    }`}
                  >
                    <Volume2 className="w-3 h-3" />
                    {isConfirmed ? "Broadcast Sector Evacuation Siren" : "Issue Sector Directive"}
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
