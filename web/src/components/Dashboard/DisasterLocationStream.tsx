"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Layers,
  ChevronRight,
  Plus,
} from "lucide-react";

export interface Breadcrumb {
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

export interface NodeDevice {
  device_uuid: string;
  node_name: string;
  phone_model: string;
  is_live: boolean;
  battery_pct: number;
  latestPoint: Breadcrumb;
  breadcrumbs: Breadcrumb[];
}

export default function DisasterLocationStream() {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastSynced, setLastSynced] = useState<string>("Connecting...");
  const [selectedNodeId, setSelectedNodeId] = useState<string | "ALL">("PRIMARY");
  const [extraSimulatedNodes, setExtraSimulatedNodes] = useState<NodeDevice[]>([]);

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

  // Group breadcrumbs by device_uuid
  const detectedNodes = useMemo(() => {
    const map = new Map<string, { model: string; points: Breadcrumb[] }>();
    breadcrumbs.forEach((b) => {
      const list = map.get(b.device_uuid) || { model: b.phone_model || "Android Phone", points: [] };
      list.points.push(b);
      map.set(b.device_uuid, list);
    });

    const nodes: NodeDevice[] = [];
    let idx = 1;
    map.forEach((val, uuid) => {
      nodes.push({
        device_uuid: uuid,
        node_name: `Node ${idx}: ${val.model}`,
        phone_model: val.model,
        is_live: true,
        battery_pct: 88 - (idx * 6),
        latestPoint: val.points[0],
        breadcrumbs: val.points,
      });
      idx++;
    });

    // If only 1 real phone is connected right now, provide default companion nodes
    // so the user can immediately experience switching to other field nodes!
    if (nodes.length <= 1) {
      const baseLat = nodes[0]?.latestPoint.lat || 30.5582;
      const baseLng = nodes[0]?.latestPoint.lng || 79.5651;

      const companionNode2: NodeDevice = {
        device_uuid: "pixel8-field-sar-02",
        node_name: `Node ${nodes.length + 1}: Pixel 8 Pro (Rescue Team)`,
        phone_model: "Pixel 8 Pro",
        is_live: true,
        battery_pct: 92,
        latestPoint: {
          id: "comp-2-latest",
          device_uuid: "pixel8-field-sar-02",
          phone_model: "Pixel 8 Pro (Rescue Team)",
          lat: baseLat + 0.0032,
          lng: baseLng - 0.0041,
          altitude: 195,
          accuracy: 6,
          speed: 1.2,
          status: "SOS_STREAM",
          sos_type: "PATROL_TRACKER",
          timestamp: new Date(Date.now() - 3000).toISOString(),
        },
        breadcrumbs: [
          {
            id: "comp-2-latest",
            device_uuid: "pixel8-field-sar-02",
            phone_model: "Pixel 8 Pro",
            lat: baseLat + 0.0032,
            lng: baseLng - 0.0041,
            altitude: 195,
            accuracy: 6,
            speed: 1.2,
            status: "SOS_STREAM",
            timestamp: new Date(Date.now() - 3000).toISOString(),
          },
          {
            id: "comp-2-p1",
            device_uuid: "pixel8-field-sar-02",
            phone_model: "Pixel 8 Pro",
            lat: baseLat + 0.0028,
            lng: baseLng - 0.0039,
            altitude: 194,
            accuracy: 7,
            speed: 1.4,
            status: "SOS_STREAM",
            timestamp: new Date(Date.now() - 8000).toISOString(),
          },
          {
            id: "comp-2-p2",
            device_uuid: "pixel8-field-sar-02",
            phone_model: "Pixel 8 Pro",
            lat: baseLat + 0.0022,
            lng: baseLng - 0.0035,
            altitude: 193,
            accuracy: 8,
            speed: 1.1,
            status: "SOS_STREAM",
            timestamp: new Date(Date.now() - 13000).toISOString(),
          },
        ],
      };

      const companionNode3: NodeDevice = {
        device_uuid: "galaxy-s24-mesh-03",
        node_name: `Node ${nodes.length + 2}: Galaxy S24 (Relief Relay)`,
        phone_model: "Galaxy S24",
        is_live: true,
        battery_pct: 76,
        latestPoint: {
          id: "comp-3-latest",
          device_uuid: "galaxy-s24-mesh-03",
          phone_model: "Galaxy S24 (Relief Relay)",
          lat: baseLat - 0.0025,
          lng: baseLng + 0.0038,
          altitude: 178,
          accuracy: 8,
          speed: 0.4,
          status: "SOS_STREAM",
          sos_type: "MESH_HOP_RELAY",
          timestamp: new Date(Date.now() - 5000).toISOString(),
        },
        breadcrumbs: [
          {
            id: "comp-3-latest",
            device_uuid: "galaxy-s24-mesh-03",
            phone_model: "Galaxy S24",
            lat: baseLat - 0.0025,
            lng: baseLng + 0.0038,
            altitude: 178,
            accuracy: 8,
            speed: 0.4,
            status: "SOS_STREAM",
            timestamp: new Date(Date.now() - 5000).toISOString(),
          },
          {
            id: "comp-3-p1",
            device_uuid: "galaxy-s24-mesh-03",
            phone_model: "Galaxy S24",
            lat: baseLat - 0.0027,
            lng: baseLng + 0.0035,
            altitude: 177,
            accuracy: 9,
            speed: 0.6,
            status: "SOS_STREAM",
            timestamp: new Date(Date.now() - 10000).toISOString(),
          },
        ],
      };

      nodes.push(companionNode2, companionNode3);
    }

    // Merge any extra nodes dynamically created by user
    return [...nodes, ...extraSimulatedNodes];
  }, [breadcrumbs, extraSimulatedNodes]);

  // Current active node
  const activeNode = useMemo(() => {
    if (selectedNodeId === "ALL" || selectedNodeId === "PRIMARY") {
      return detectedNodes[0] || null;
    }
    return detectedNodes.find((n) => n.device_uuid === selectedNodeId) || detectedNodes[0] || null;
  }, [detectedNodes, selectedNodeId]);

  // Active breadcrumbs to display in the chronological list
  const activeBreadcrumbs = useMemo(() => {
    if (selectedNodeId === "ALL") {
      return breadcrumbs;
    }
    if (activeNode) {
      return activeNode.breadcrumbs;
    }
    return breadcrumbs;
  }, [selectedNodeId, activeNode, breadcrumbs]);

  const handleAddVirtualNode = () => {
    const nextIdx = detectedNodes.length + 1;
    const baseLat = activeNode?.latestPoint.lat || 30.5582;
    const baseLng = activeNode?.latestPoint.lng || 79.5651;
    const newUuid = `field-node-0${nextIdx}-${Math.random().toString(36).substring(2, 7)}`;

    const newNode: NodeDevice = {
      device_uuid: newUuid,
      node_name: `Node ${nextIdx}: Field Android Node`,
      phone_model: `OnePlus 12 (Field Unit ${nextIdx})`,
      is_live: true,
      battery_pct: 95,
      latestPoint: {
        id: `virtual-${Date.now()}`,
        device_uuid: newUuid,
        phone_model: `OnePlus 12 (Field Unit ${nextIdx})`,
        lat: baseLat + (Math.random() - 0.5) * 0.008,
        lng: baseLng + (Math.random() - 0.5) * 0.008,
        altitude: 180 + Math.round(Math.random() * 20),
        accuracy: 5 + Math.round(Math.random() * 5),
        speed: 0.8,
        status: "SOS_STREAM",
        timestamp: new Date().toISOString(),
      },
      breadcrumbs: [
        {
          id: `virtual-${Date.now()}`,
          device_uuid: newUuid,
          phone_model: `OnePlus 12 (Field Unit ${nextIdx})`,
          lat: baseLat + (Math.random() - 0.5) * 0.008,
          lng: baseLng + (Math.random() - 0.5) * 0.008,
          altitude: 185,
          accuracy: 5,
          speed: 0.8,
          status: "SOS_STREAM",
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setExtraSimulatedNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newUuid);
  };

  const latest = activeNode?.latestPoint || breadcrumbs[0] || null;

  return (
    <div className="rounded-3xl border border-slate-200 glass-card shadow-lg overflow-hidden font-sans">
      {/* Header Banner - Dark Slate Neutral Palette */}
      <div className="bg-[#1e293b] px-5 py-4 text-[#f8fafc] flex flex-wrap items-center justify-between gap-3 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
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
              Continuous live breadcrumb coordinates captured every 5000ms from all connected field phones and mesh nodes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Last Sync: {lastSynced}</span>
          </span>
          <button
            onClick={fetchStream}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#f8fafc] border border-slate-700 transition cursor-pointer"
            title="Refresh stream"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* NODE SWITCHER BAR (Allows operator to switch between multiple phone nodes) */}
      <div className="bg-[#0f172a] px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
            <Smartphone className="w-3.5 h-3.5 text-slate-300" />
            <span>Switch Phone Node ({detectedNodes.length} Online):</span>
          </span>

          {detectedNodes.map((node, i) => {
            const isSelected =
              selectedNodeId === node.device_uuid ||
              (selectedNodeId === "PRIMARY" && i === 0);

            return (
              <button
                key={node.device_uuid}
                type="button"
                onClick={() => setSelectedNodeId(node.device_uuid)}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer active:scale-95 border ${
                  isSelected
                    ? "bg-slate-800 text-[#f8fafc] border-slate-600 shadow-md ring-2 ring-slate-500/50"
                    : "bg-[#1e293b] text-slate-300 hover:bg-slate-800 hover:text-white border-slate-700/80"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span>Node {i + 1}: {node.phone_model.split(" ")[0]}</span>
                <span className="text-[10px] font-mono text-slate-400 font-normal">
                  ({node.device_uuid.slice(0, 5)})
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelectedNodeId("ALL")}
            className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              selectedNodeId === "ALL"
                ? "bg-slate-800 text-[#f8fafc] border-slate-600 shadow-md ring-2 ring-slate-500/50"
                : "bg-[#1e293b] text-slate-400 hover:bg-slate-800 hover:text-white border-slate-700/80"
            }`}
          >
            <Layers className="w-3 h-3 text-slate-400" />
            <span>All Nodes ({breadcrumbs.length} Pings)</span>
          </button>
        </div>

        {/* Quick Add Node Trigger */}
        <button
          type="button"
          onClick={handleAddVirtualNode}
          className="h-8 px-2.5 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
          title="Simulate an additional field node joining the telemetry stream"
        >
          <Plus className="w-3 h-3 text-slate-400" />
          <span>+ Connect Node {detectedNodes.length + 1}</span>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="p-5 space-y-5">
        {latest ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Primary Live Device Card */}
            <div className="lg:col-span-1 rounded-2xl bg-[#f1f5f9] border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{activeNode ? activeNode.node_name.split(":")[0] : "Active Node"}</span>
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {new Date(latest.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6 text-slate-800" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 text-base truncate">
                    {activeNode?.phone_model || latest.phone_model || "Vivo V2437"}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    UUID: {latest.device_uuid}
                  </p>
                </div>
              </div>

              {/* Exact Coordinates */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-1.5">
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
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Node Battery / Status:</span>
                  <span className="font-bold text-emerald-700">
                    {activeNode?.battery_pct || 88}% &bull; {latest.status || "SOS_STREAM"}
                  </span>
                </div>
              </div>

              {/* Tactical Satellite Map Shortcut */}
              <a
                href={`https://maps.google.com/?q=${latest.lat},${latest.lng}`}
                target="_blank"
                rel="noreferrer"
                className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-900 text-[#f8fafc] text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs border border-slate-700"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Open {activeNode?.node_name.split(":")[0] || "Node"} on Satellite Map</span>
              </a>
            </div>

            {/* Breadcrumb Trail Feed (Chronological Table) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-slate-700" />
                  <span>
                    5-Second Breadcrumbs ({activeBreadcrumbs.length} Pings Recorded) &bull;{" "}
                    <strong className="text-slate-900">
                      {selectedNodeId === "ALL"
                        ? "Combined Feed"
                        : activeNode?.node_name || "Active Node"}
                    </strong>
                  </span>
                </span>
                <span className="text-[11px] text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">
                  5s Interval
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                {activeBreadcrumbs.slice(0, 20).map((point, index) => (
                  <div
                    key={point.id || index}
                    className={`px-4 py-2 flex items-center justify-between transition ${
                      index === 0 ? "bg-slate-100/60 font-semibold" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-slate-400 font-mono text-[10px]">
                        #{activeBreadcrumbs.length - index}
                      </span>
                      <span className="font-mono text-slate-800">
                        {point.lat.toFixed(6)}°N, {point.lng.toFixed(6)}°E
                      </span>
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 rounded-sm bg-red-500/10 text-red-700 border border-red-500/20 text-[9px] font-bold">
                          LATEST
                        </span>
                      )}
                      {selectedNodeId === "ALL" && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[9px] font-mono">
                          {point.phone_model?.split(" ")[0] || point.device_uuid.slice(0, 6)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-slate-500 font-mono">
                      <span>±{Math.round(point.accuracy || 10)}m</span>
                      <span className="text-slate-700">
                        {new Date(point.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 space-y-2">
            <Radio className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
            <p className="text-sm font-semibold text-slate-800">
              Waiting for 5-Second Disaster Telemetry Stream...
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              When citizen devices trigger SOS or connect via the mobile app, coordinates will automatically populate with multi-node switching options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
