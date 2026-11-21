"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Navigation,
  Clock,
  Activity,
  RotateCcw,
  Zap,
  Smartphone,
  Radio,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  MapPin,
} from "lucide-react";

export interface DeviceFallReport {
  device_id: string;
  phone_model?: string;
  peak_g: number;
  free_fall_ms?: number;
  confidence?: number;
  timestamp: string;
  lat?: number;
  lng?: number;
  notes?: string;
}

export interface CollapseCluster {
  cluster_id: string;
  status: "PENDING_QUORUM" | "CONFIRMED_COLLAPSE" | "RESOLVED_SAFE";
  priority: string;
  centroid_lat: number;
  centroid_lng: number;
  radius_meters: number;
  reporting_devices: string[];
  reporting_devices_details?: DeviceFallReport[];
  trapped_headcount: number;
  first_detected_at: string;
  last_report_at: string;
  max_peak_g: number;
  average_confidence: number;
  elapsed_seconds?: number;
}

interface BuildingCollapsePanelProps {
  collapseClusters?: CollapseCluster[];
  onDispatchUSAR?: (clusterId: string) => void;
  onFocusCoordinates?: (lat: number, lng: number) => void;
}

const PRESET_MODELS = [
  "Google Pixel 7 Pro",
  "Samsung Galaxy S22 Ultra",
  "OnePlus 11 5G",
  "Redmi Note 12 Pro",
  "Apple iPhone 14 (Mesh Node)",
];

export default function BuildingCollapsePanel({
  collapseClusters: propClusters,
  onDispatchUSAR,
  onFocusCoordinates,
}: BuildingCollapsePanelProps) {
  const [clusters, setClusters] = useState<CollapseCluster[]>(propClusters || []);
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());
  const [isSimulating, setIsSimulating] = useState(false);
  const [expandedDevices, setExpandedDevices] = useState<Record<string, boolean>>({});

  const fetchClusters = async () => {
    try {
      const res = await fetch("/api/collapse/active-clusters");
      if (res.ok) {
        const data = await res.json();
        setClusters(data.clusters || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (propClusters && propClusters.length > 0) {
      setClusters(propClusters);
      return;
    }
    fetchClusters();
    // 2.5-second fast polling for immediate response when phone falls
    const timer = setInterval(fetchClusters, 2500);
    return () => clearInterval(timer);
  }, [propClusters]);

  const confirmedCount = clusters.filter((c) => c.status === "CONFIRMED_COLLAPSE").length;

  const handleDispatch = (cid: string) => {
    setDispatchedIds((prev) => new Set(prev).add(cid));
    if (onDispatchUSAR) {
      onDispatchUSAR(cid);
    }
  };

  const getSimCoordinates = async () => {
    let coords = { lat: 27.6015, lng: 77.5975 };
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 1500 })
        );
        if (pos?.coords) {
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      } catch {}
    }
    return coords;
  };

  // Simulate 1 phone fall at a time (Phone 1 -> Phone 2 -> Phone 3 triggers Quorum!)
  const handleSimulateSinglePhone = async () => {
    setIsSimulating(true);
    const coords = await getSimCoordinates();

    // Check existing active cluster
    const activeCluster = clusters.find((c) => c.status !== "RESOLVED_SAFE");
    const currentCount = activeCluster ? activeCluster.reporting_devices.length : 0;
    const phoneIdx = currentCount % PRESET_MODELS.length;
    const model = PRESET_MODELS[phoneIdx];

    // Offset coordinates slightly (~15-30m) within the same 100m radius
    const offsetLat = currentCount === 0 ? coords.lat : Number((coords.lat + (currentCount * 0.00015)).toFixed(5));
    const offsetLng = currentCount === 0 ? coords.lng : Number((coords.lng + (currentCount * 0.00012)).toFixed(5));
    const peakG = Number((4.2 + (Math.random() * 0.9)).toFixed(1));
    const freeFall = 320 + Math.floor(Math.random() * 80);

    const deviceUuid = `phone_node_${phoneIdx + 1}_${Date.now().toString(36).slice(-4)}`;

    try {
      const res = await fetch("/api/collapse/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_uuid: deviceUuid,
          phone_model: model,
          lat: offsetLat,
          lng: offsetLng,
          peak_g: peakG,
          free_fall_ms: freeFall,
          confidence: 0.96,
          notes: `Simulated phone fall #${phoneIdx + 1} (${model}) - ${peakG}g kinetic impact`,
        }),
      });
      if (res.ok) {
        await fetchClusters();
      }
    } catch {}
    setIsSimulating(false);
  };

  // Simulate all 3 phones at once for instant quorum
  const handleSimulateQuorum = async () => {
    setIsSimulating(true);
    const coords = await getSimCoordinates();
    const batch = [
      { model: "Google Pixel 7 Pro", peak: 4.8, freeFall: 350, latOff: 0, lngOff: 0 },
      { model: "Samsung Galaxy S22 Ultra", peak: 4.4, freeFall: 320, latOff: 0.00018, lngOff: 0.00015 },
      { model: "OnePlus 11 5G", peak: 4.6, freeFall: 370, latOff: -0.00016, lngOff: -0.00020 },
    ];

    try {
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        await fetch("/api/collapse/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_uuid: `quorum_node_${i + 1}_${Date.now().toString(36).slice(-4)}`,
            phone_model: item.model,
            lat: Number((coords.lat + item.latOff).toFixed(5)),
            lng: Number((coords.lng + item.lngOff).toFixed(5)),
            peak_g: item.peak,
            free_fall_ms: item.freeFall,
            confidence: 0.96,
            notes: `3-Phone Quorum Node #${i + 1} (${item.model}) - ${item.peak}g kinetic impact`,
          }),
        });
      }
      await fetchClusters();
    } catch {}
    setIsSimulating(false);
  };

  const handleReset = async () => {
    try {
      await fetch("/api/collapse/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      setClusters([]);
      setDispatchedIds(new Set());
    } catch {}
  };

  const toggleExpand = (cid: string) => {
    setExpandedDevices((prev) => ({ ...prev, [cid]: !prev[cid] }));
  };

  return (
    <div className="rounded-3xl glass-card border border-slate-200/80 p-6 space-y-4 text-slate-800 font-sans h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
            <AlertTriangle
              className={`w-4 h-4 ${confirmedCount > 0 ? "text-red-600 animate-pulse" : "text-slate-600"}`}
              aria-hidden
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 font-display">
                Building Collapse Alert
              </h3>
              {confirmedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Real-time 100m spatial kinetic shock consensus across citizen smartphones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Simulate 1 Phone Fall */}
          <button
            onClick={handleSimulateSinglePhone}
            disabled={isSimulating}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Simulate 1 phone falling (>3.5g impact). Click again to add Phone 2 and Phone 3!"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate 1 Phone Fall</span>
          </button>

          {/* Simulate 3-Phone Quorum */}
          <button
            onClick={handleSimulateQuorum}
            disabled={isSimulating}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Simulate 3 phones falling simultaneously in a 100m zone to trigger Quorum"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            <span>Simulate 3-Phone Quorum</span>
          </button>

          {clusters.length > 0 && (
            <button
              onClick={handleReset}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 transition cursor-pointer"
              title="Reset simulation data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              confirmedCount > 0
                ? "bg-red-500/10 text-red-700 border border-red-500/20"
                : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
            }`}
          >
            {confirmedCount > 0 ? `${confirmedCount} Confirmed Collapse` : "All Structures Stable"}
          </span>
        </div>
      </div>

      {/* Clusters List */}
      <div className="space-y-4 flex-1 overflow-y-auto max-h-[520px] pr-1">
        {clusters.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-2 rounded-2xl bg-slate-50 border border-slate-100">
            <Smartphone className="w-8 h-8 text-slate-400 mx-auto stroke-[1.5]" />
            <p className="font-semibold text-slate-700 text-sm">No active structural collapse detected.</p>
            <p className="text-slate-500 text-[11px] max-w-md mx-auto">
              System is listening for phone accelerometer shockwaves (&gt; 3.5g) and free-fall telemetry. When a phone drops or simulates impact, its live sensor data will immediately appear here.
            </p>
          </div>
        ) : (
          clusters.map((cluster) => {
            const isConfirmed = cluster.status === "CONFIRMED_COLLAPSE";
            const isDispatched = dispatchedIds.has(cluster.cluster_id);
            const phoneCount = cluster.reporting_devices.length;
            const isExpanded = expandedDevices[cluster.cluster_id] !== false; // expanded by default

            // Use itemized device details if available, or generate fallback models
            const deviceDetails: DeviceFallReport[] =
              cluster.reporting_devices_details && cluster.reporting_devices_details.length > 0
                ? cluster.reporting_devices_details
                : cluster.reporting_devices.map((id, idx) => ({
                    device_id: id,
                    phone_model: PRESET_MODELS[idx % PRESET_MODELS.length],
                    peak_g: cluster.max_peak_g,
                    free_fall_ms: 350,
                    confidence: cluster.average_confidence,
                    timestamp: cluster.last_report_at,
                    lat: cluster.centroid_lat,
                    lng: cluster.centroid_lng,
                  }));

            return (
              <div
                key={cluster.cluster_id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  isDispatched
                    ? "bg-slate-50/70 border-slate-200 opacity-90"
                    : isConfirmed
                    ? "bg-red-50/70 border-red-300 shadow-sm"
                    : "bg-amber-50/60 border-amber-300"
                }`}
              >
                {/* Cluster Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 font-display">
                        Structural Collapse Cluster #{cluster.cluster_id.slice(-6).toUpperCase()}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isConfirmed ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                        }`}
                      >
                        {isConfirmed ? "Quorum Reached — Confirmed Alert" : "Analyzing Shockwave"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <span className="text-red-700 font-black text-sm">
                        {phoneCount} / 3
                      </span>
                      <span>Phones Hit Acceleration Threshold (&gt; 3.5g)</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 font-mono text-[11px]">
                        {Math.min(100, Math.round((phoneCount / 3) * 100))}% towards quorum
                      </span>
                    </div>

                    {/* Quorum Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden my-1">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isConfirmed ? "bg-red-600 animate-pulse" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(12, (phoneCount / 3) * 100))}%` }}
                      />
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3 pt-0.5">
                      <span className="flex items-center gap-1 text-slate-700 font-mono font-bold">
                        <Activity className="w-3.5 h-3.5 text-red-500" />
                        Max Peak: {cluster.max_peak_g.toFixed(1)}g
                      </span>
                      <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        Centroid: {cluster.centroid_lat.toFixed(4)}°N, {cluster.centroid_lng.toFixed(4)}°E (±100m)
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    {isDispatched ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        USAR En Route
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDispatch(cluster.cluster_id)}
                        className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                          isConfirmed
                            ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                            : "bg-slate-800 hover:bg-slate-900 text-white"
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Dispatch USAR Brigade</span>
                      </button>
                    )}

                    {onFocusCoordinates && (
                      <button
                        onClick={() => onFocusCoordinates(cluster.centroid_lat, cluster.centroid_lng)}
                        className="text-xs text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Locate on Map</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3-Step Quorum Timeline */}
                <div className="bg-white/80 rounded-xl p-2.5 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>100m Consensus Verification Timeline</span>
                    <span className="text-[10px] font-mono font-normal text-slate-500">
                      Requirement: &ge;3 Phones within 100m
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((step) => {
                      const isStepMet = phoneCount >= step;
                      const device = deviceDetails[step - 1];

                      return (
                        <div
                          key={step}
                          className={`p-2 rounded-lg border text-xs transition-all ${
                            isStepMet
                              ? "bg-red-50 border-red-300 text-red-900"
                              : "bg-slate-50 border-slate-200 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold text-[11px]">
                            {isStepMet ? (
                              <CheckCircle2 className="w-3 h-3 text-red-600 shrink-0" />
                            ) : (
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            )}
                            <span>Phone #{step}</span>
                          </div>
                          <div className="text-[10px] mt-0.5 truncate">
                            {isStepMet && device
                              ? `${device.phone_model?.split(" ")[0] || "Node"} (${device.peak_g?.toFixed(1)}g)`
                              : "Awaiting shock"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expandable Per-Phone Sensor Telemetry Cards */}
                <div className="pt-1">
                  <button
                    onClick={() => toggleExpand(cluster.cluster_id)}
                    className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer border-t border-slate-200/60"
                  >
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reporting Phones Telemetry ({deviceDetails.length} Device{deviceDetails.length > 1 ? "s" : ""})</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                      {deviceDetails.map((dev, idx) => (
                        <div
                          key={dev.device_id || idx}
                          className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Smartphone className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                              <span className="font-bold text-slate-900 truncate">
                                {dev.phone_model || `Phone #${idx + 1}`}
                              </span>
                            </div>
                            <span className="text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 shrink-0">
                              {dev.peak_g.toFixed(1)}g Peak
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px] text-slate-600">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Free-Fall:</span>
                              <span className="font-mono font-semibold text-slate-800">
                                {dev.free_fall_ms || 350} ms
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Sensor Confidence:</span>
                              <span className="font-mono font-semibold text-emerald-700">
                                {Math.round((dev.confidence || 0.95) * 100)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Device ID:</span>
                              <span className="font-mono text-[10px] text-slate-500 truncate max-w-[110px]">
                                {dev.device_id}
                              </span>
                            </div>
                            {dev.lat && dev.lng && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Coordinates:</span>
                                <span className="font-mono text-[10px] text-slate-700">
                                  {dev.lat.toFixed(4)}°, {dev.lng.toFixed(4)}°
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {dev.timestamp ? new Date(dev.timestamp).toLocaleTimeString() : "Just now"}
                            </span>
                            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" />
                              Threshold Met
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
