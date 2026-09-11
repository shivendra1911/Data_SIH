"use client";

import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  CriticalInfrastructure,
  HazardZone,
  SOSCluster,
  SOSEvent,
  CitizenLocation,
  DisasterEpicenter,
  SurgeCheckpoint,
} from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  Radio,
  Users,
  Building2,
  Tent,
  Layers,
  Mountain,
  Satellite,
  Globe,
  Clock,
  Flame,
} from "lucide-react";

interface EmergencyMapProps {
  center: [number, number];
  zoom: number;
  sosEvents: SOSEvent[];
  clusters: SOSCluster[];
  activeZone: HazardZone;
  citizens?: CitizenLocation[];
  selectedEventId?: string;
  onSelectEvent?: (event: SOSEvent) => void;
  onDispatchCluster?: (clusterId: number) => void;
}

// Controller component to smoothly fly camera to center coordinates
function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.4,
      easeLinearity: 0.25,
    });
  }, [center, zoom, map]);
  return null;
}

// Custom DivIcons
const createRadarIcon = (status: "SOS" | "SAFE" | "HELPING", isMesh: boolean) => {
  const colorClass =
    status === "SAFE" ? "safe" : status === "HELPING" ? "helping" : "";
  const meshBadge = isMesh
    ? `<span style="position: absolute; top: -6px; right: -6px; background: #38bdf8; color: #000; font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 9999px; border: 1px solid #000;">BLE</span>`
    : "";

  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div class="radar-pulse-container" style="cursor: pointer;">
        ${status === "SOS" ? '<div class="radar-wave"></div><div class="radar-wave radar-wave-delayed"></div>' : ""}
        <div class="radar-dot ${colorClass}">
          ${meshBadge}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

const createClusterIcon = (cluster: SOSCluster) => {
  const isP1 = cluster.priority === "P1";
  const bgColor = isP1 ? "#e11d48" : "#d97706";
  const borderColor = isP1 ? "#fda4af" : "#fde68a";

  return L.divIcon({
    className: "cluster-div-icon",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        background: ${bgColor};
        color: white;
        border: 2px solid ${borderColor};
        border-radius: 9999px;
        width: 52px;
        height: 52px;
        box-shadow: 0 0 16px ${bgColor};
        font-weight: 800;
        font-size: 11px;
        cursor: pointer;
      ">
        <span style="font-size: 9px; opacity: 0.9;">${cluster.priority}</span>
        <span style="font-size: 13px; line-height: 1;">${cluster.total_people}</span>
        <span style="font-size: 7px; text-transform: uppercase;">NDRF</span>
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -26],
  });
};

const createInfraIcon = (infra: CriticalInfrastructure) => {
  const isSafe = infra.riskLevel === "SAFE";
  const isHigh = infra.riskLevel === "HIGH";
  const bg = isSafe ? "#10b981" : isHigh ? "#ef4444" : "#f59e0b";
  const iconSymbol =
    infra.type === "DAM" || infra.type === "BARRAGE" ? "⚡" : infra.type === "BRIDGE" ? "🌉" : "⛺";

  return L.divIcon({
    className: "infra-div-icon",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${bg};
        color: white;
        border: 2px solid #ffffff;
        border-radius: 8px;
        width: 32px;
        height: 32px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        font-size: 14px;
        cursor: pointer;
      ">
        ${iconSymbol}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createEpicenterIcon = () => {
  return L.divIcon({
    className: "epicenter-div-icon",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #dc2626;
        color: white;
        border: 3px solid #fef08a;
        border-radius: 9999px;
        width: 44px;
        height: 44px;
        box-shadow: 0 0 24px #dc2626;
        cursor: pointer;
      ">
        <span style="font-size: 20px;">💥</span>
        <span style="
          position: absolute;
          bottom: -16px;
          background: #05070e;
          color: #fca5a5;
          font-family: monospace;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 4px;
          border: 1px solid #dc2626;
          white-space: nowrap;
        ">GLOF ORIGIN</span>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

const createCheckpointIcon = (checkpoint: SurgeCheckpoint) => {
  return L.divIcon({
    className: "checkpoint-div-icon",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0284c7;
        color: white;
        border: 2px solid #bae6fd;
        border-radius: 6px;
        padding: 2px 6px;
        font-family: monospace;
        font-size: 9px;
        font-weight: 800;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        cursor: pointer;
        white-space: nowrap;
      ">
        🌊 +${checkpoint.eta_minutes}m (${checkpoint.peak_surge_m}m)
      </div>
    `,
    iconSize: [70, 22],
    iconAnchor: [35, 11],
    popupAnchor: [0, -11],
  });
};

const createLastKnownLocationIcon = (citizen: CitizenLocation) => {
  return L.divIcon({
    className: "last-known-div-icon",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #d97706;
        color: white;
        border: 2px dashed #fef08a;
        border-radius: 9999px;
        width: 36px;
        height: 36px;
        box-shadow: 0 0 14px rgba(217, 119, 6, 0.7);
        cursor: pointer;
      ">
        <span style="font-size: 13px;">⏱️</span>
        <span style="
          position: absolute;
          top: -8px;
          right: -8px;
          background: #0f172a;
          color: #fde68a;
          font-family: monospace;
          font-size: 8px;
          font-weight: 800;
          padding: 1px 3px;
          border-radius: 4px;
          border: 1px solid #f59e0b;
        ">-${citizen.last_seen_minutes_ago}m</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

export default function EmergencyMap({
  center,
  zoom,
  sosEvents,
  clusters,
  activeZone,
  citizens = [],
  selectedEventId,
  onSelectEvent,
  onDispatchCluster,
}: EmergencyMapProps) {
  const [showInfrastructure, setShowInfrastructure] = useState<boolean>(true);
  const [showEpicenter, setShowEpicenter] = useState<boolean>(true);
  const [showLiveCitizens, setShowLiveCitizens] = useState<boolean>(true);
  const [showLastKnownCitizens, setShowLastKnownCitizens] = useState<boolean>(true);
  const [basemap, setBasemap] = useState<"topo" | "satellite" | "osm">("topo");

  const basemapConfigs = {
    topo: {
      name: "Topographic Contours",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri, DeLorme, USGS, NPS",
      maxZoom: 19,
    },
    satellite: {
      name: "Satellite Recon",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics",
      maxZoom: 18,
    },
    osm: {
      name: "Tactical Street",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    },
  };

  const zoneAlertColor =
    activeZone.alertColor === "RED"
      ? "#ef4444"
      : activeZone.alertColor === "ORANGE"
      ? "#f59e0b"
      : activeZone.alertColor === "YELLOW"
      ? "#eab308"
      : "#10b981";

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapViewController center={center} zoom={zoom} />

        {/* Clean Tactical Tiles with Zero Watermarks */}
        <TileLayer
          key={basemap}
          attribution={basemapConfigs[basemap].attribution}
          url={basemapConfigs[basemap].url}
          maxZoom={basemapConfigs[basemap].maxZoom}
        />

        {/* Active Zone Hazard Radius Overlay */}
        <Circle
          center={activeZone.center}
          radius={3800}
          pathOptions={{
            color: zoneAlertColor,
            fillColor: zoneAlertColor,
            fillOpacity: 0.12,
            weight: 2,
            dashArray: "6, 8",
          }}
        />

        {/* Critical Infrastructure Points (Dams, Bridges, Shelters) */}
        {showInfrastructure &&
          activeZone.infrastructure.map((infra) => (
            <Marker
              key={infra.id}
              position={infra.coords}
              icon={createInfraIcon(infra)}
            >
              <Popup>
                <div className="p-2 space-y-1.5 text-slate-100 min-w-[210px]">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      {infra.name}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                        infra.riskLevel === "HIGH"
                          ? "bg-rose-500 text-white"
                          : infra.riskLevel === "SAFE"
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-500 text-slate-950"
                      }`}
                    >
                      {infra.riskLevel} RISK
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">Type:</span> {infra.type}
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">River Offset:</span> {infra.bufferDistanceM}m from channel
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Rescue Clusters (K-Means Output) */}
        {clusters.map((cluster) => (
          <Marker
            key={`cluster-${cluster.cluster_id}`}
            position={[cluster.center_lat, cluster.center_lng]}
            icon={createClusterIcon(cluster)}
          >
            <Popup>
              <div className="p-2 space-y-2 text-slate-100 min-w-[210px]">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Cluster #{cluster.cluster_id}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      cluster.priority === "P1"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/50"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                    }`}
                  >
                    Priority {cluster.priority}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-400">Total Trapped:</span>{" "}
                  <strong className="text-white font-mono text-base">
                    {cluster.total_people} People
                  </strong>
                </div>
                {cluster.dispatched ? (
                  <div className="text-xs font-medium text-emerald-400 bg-emerald-950/40 p-1.5 rounded border border-emerald-500/30">
                    ✓ Dispatched: {cluster.assigned_team || "Team Dispatched"}
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      onDispatchCluster && onDispatchCluster(cluster.cluster_id)
                    }
                    className="w-full mt-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2 px-3 rounded-lg text-xs transition duration-150 flex items-center justify-center gap-1.5 shadow-lg min-h-[44px]"
                  >
                    <ShieldAlert className="w-4 h-4" /> Dispatch NDRF Unit
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Disaster Epicenter & Downstream Surge Propagation Wave */}
        {showEpicenter && activeZone.epicenter && (
          <>
            {/* GLOF Breach Origin Epicenter Marker */}
            <Marker
              position={activeZone.epicenter.coords}
              icon={createEpicenterIcon()}
            >
              <Popup>
                <div className="p-2.5 space-y-2 text-slate-100 min-w-[240px]">
                  <div className="flex items-center justify-between border-b border-rose-500/40 pb-1.5">
                    <span className="text-xs font-mono font-bold text-rose-300 flex items-center gap-1.5">
                      💥 DISASTER EPICENTER
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase">
                      {activeZone.epicenter.type}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white">
                    {activeZone.epicenter.name}
                  </div>
                  <div className="text-xs text-slate-300 space-y-1 bg-slate-900/80 p-2 rounded border border-slate-800 font-mono">
                    <div>
                      <span className="text-slate-400">Elevation:</span>{" "}
                      {activeZone.epicenter.elevation_m}m AMSL
                    </div>
                    <div>
                      <span className="text-slate-400">Volume:</span>{" "}
                      {activeZone.epicenter.estimated_volume_m3}
                    </div>
                    <div>
                      <span className="text-slate-400">Detection:</span>{" "}
                      {activeZone.epicenter.detection_source}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* Downstream Surge Wave Propagation Polyline */}
            <Polyline
              positions={activeZone.epicenter.surge_path}
              pathOptions={{
                color: "#06b6d4",
                weight: 5,
                opacity: 0.85,
                dashArray: "10, 10",
              }}
            />

            {/* Checkpoint Arrival Times along Valley */}
            {activeZone.epicenter.checkpoints.map((cp, idx) => (
              <Marker
                key={`cp-${idx}`}
                position={activeZone.epicenter!.surge_path[idx + 1] || activeZone.epicenter!.coords}
                icon={createCheckpointIcon(cp)}
              >
                <Popup>
                  <div className="p-2 text-xs text-slate-100 space-y-1 min-w-[190px]">
                    <div className="font-bold text-sky-300 flex items-center gap-1">
                      🌊 Surge Checkpoint: {cp.name}
                    </div>
                    <div className="text-slate-300 font-mono text-[11px]">
                      Distance: {cp.distance_km} km • ETA: +{cp.eta_minutes} mins
                    </div>
                    <div className="text-rose-400 font-mono text-[11px] font-bold">
                      Predicted Peak Crest: {cp.peak_surge_m}m
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </>
        )}

        {/* Live Citizen Telemetry Pins */}
        {showLiveCitizens &&
          citizens
            .filter((c) => c.is_live)
            .map((citizen) => (
              <Marker
                key={citizen.id}
                position={[citizen.lat, citizen.lng]}
                icon={createRadarIcon(citizen.status, citizen.mesh_hops > 0)}
              >
                <Popup>
                  <div className="p-2 space-y-1.5 text-slate-100 min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        ● LIVE GPS FIX
                      </span>
                      <span className="text-[10px] font-mono text-slate-300">
                        {citizen.battery_pct}% Batt
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white">
                      {citizen.sos_type || "Citizen Active"}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      UUID: {citizen.device_uuid.slice(0, 14)}...
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

        {/* Last Known Locations (Offline / Relayed via BLE Mesh) */}
        {showLastKnownCitizens &&
          citizens
            .filter((c) => !c.is_live)
            .map((citizen) => (
              <React.Fragment key={citizen.id}>
                {/* Search / Drift Buffer Circle */}
                <Circle
                  center={[citizen.lat, citizen.lng]}
                  radius={citizen.drift_radius_m || 300}
                  pathOptions={{
                    color: "#f59e0b",
                    fillColor: "#f59e0b",
                    fillOpacity: 0.12,
                    weight: 1.5,
                    dashArray: "4, 6",
                  }}
                />

                <Marker
                  position={[citizen.lat, citizen.lng]}
                  icon={createLastKnownLocationIcon(citizen)}
                >
                  <Popup>
                    <div className="p-2 space-y-1.5 text-slate-100 min-w-[230px]">
                      <div className="flex items-center justify-between border-b border-amber-500/40 pb-1">
                        <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1">
                          ⏱️ LAST KNOWN FIX
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                          {citizen.last_seen_minutes_ago}m AGO
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white">
                        {citizen.sos_type || "Last Reported Position"}
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono space-y-0.5 bg-slate-900/90 p-1.5 rounded border border-slate-800">
                        <div>
                          <span className="text-slate-400">Signal Relay:</span>{" "}
                          Offline BLE Mesh Hop #{citizen.mesh_hops}
                        </div>
                        <div>
                          <span className="text-slate-400">Drift Radius:</span>{" "}
                          ±{citizen.drift_radius_m}m valley buffer
                        </div>
                        <div>
                          <span className="text-slate-400">Battery State:</span>{" "}
                          {citizen.battery_pct}% Remaining
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}

        {/* Fallback Legacy SOS Events */}
        {showLiveCitizens &&
          sosEvents.map((event) => (
            <Marker
              key={event.id}
              position={[event.lat, event.lng]}
              icon={createRadarIcon(event.status, event.is_mesh_relayed)}
              eventHandlers={{
                click: () => onSelectEvent && onSelectEvent(event),
              }}
            >
              <Popup>
                <div className="p-2 space-y-2 text-slate-100 min-w-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                        event.status === "SOS"
                          ? "text-rose-400"
                          : event.status === "SAFE"
                          ? "text-emerald-400"
                          : "text-sky-400"
                      }`}
                    >
                      {event.status === "SOS" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {event.status === "SOS" ? "CRITICAL SOS" : event.status}
                    </span>
                    {event.is_mesh_relayed && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-950 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5" /> BLE Mesh
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-200">
                    <div className="font-semibold text-white">
                      {event.sos_type || "Emergency Signal"}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Tactical Layers Floating Control */}
      <div className="absolute top-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-2xl flex flex-col gap-1.5 max-w-[220px]">
        <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 mb-0.5">
          <Layers className="w-3 h-3 text-sky-400" /> Tactical Layers
        </div>

        {/* Epicenter & Flood Wave Toggle */}
        <button
          onClick={() => setShowEpicenter((prev) => !prev)}
          className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition text-left ${
            showEpicenter
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          <span>💥 GLOF Epicenter & Wave</span>
        </button>

        {/* Critical Infrastructure */}
        <button
          onClick={() => setShowInfrastructure((prev) => !prev)}
          className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition text-left ${
            showInfrastructure
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          <span>⚡ Critical Infrastructure</span>
        </button>

        {/* Live Citizens */}
        <button
          onClick={() => setShowLiveCitizens((prev) => !prev)}
          className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition text-left ${
            showLiveCitizens
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          <span>🟢 Live Citizens ({citizens.filter((c) => c.is_live).length || sosEvents.length})</span>
        </button>

        {/* Last Known Locations (BLE Mesh) */}
        <button
          onClick={() => setShowLastKnownCitizens((prev) => !prev)}
          className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition text-left ${
            showLastKnownCitizens
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          <span>⏱️ Last Known ({citizens.filter((c) => !c.is_live).length})</span>
        </button>

        {/* Basemap Selection */}
        <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 mt-1 mb-0.5 pt-1 border-t border-slate-800">
          <Globe className="w-3 h-3 text-cyan-400" /> Terrain Mode
        </div>
        <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setBasemap("topo")}
            className={`px-1.5 py-1 rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 ${
              basemap === "topo"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Himalayan Valley Elevation Contours (Esri Topo)"
          >
            <Mountain className="w-3 h-3" />
            <span>Topo</span>
          </button>
          <button
            onClick={() => setBasemap("satellite")}
            className={`px-1.5 py-1 rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 ${
              basemap === "satellite"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="High-Resolution Satellite Reconnaissance (Esri Imagery)"
          >
            <Satellite className="w-3 h-3" />
            <span>Sat</span>
          </button>
          <button
            onClick={() => setBasemap("osm")}
            className={`px-1.5 py-1 rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 ${
              basemap === "osm"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Standard OpenStreetMap Road & Basin Network"
          >
            <Globe className="w-3 h-3" />
            <span>OSM</span>
          </button>
        </div>
      </div>

      {/* Tactical Map Overlay Header / Legend */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl max-w-xs pointer-events-auto">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Himalayan Valley Inundation Radar
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">⚡</span>
            <span>Dam / Barrage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🌉</span>
            <span>River Bridge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">⛺</span>
            <span>High-Ground Haven</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-400/50"></span>
            <span>Citizen SOS</span>
          </div>
        </div>
      </div>

      {/* Floating Active Zone Banner */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md border border-slate-700 rounded-lg px-3 py-2 text-xs flex items-center gap-2.5">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: zoneAlertColor }}
        ></div>
        <div>
          <span className="text-slate-400 font-medium">Monitoring Catchment:</span>{" "}
          <strong className="text-white font-semibold">{activeZone.name}</strong>
        </div>
      </div>
    </div>
  );
}