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
  SafeEvacuationRoute,
  EmergencyResponder,
} from "@/lib/types";
import {
  getSafeRoutesForZone,
  getRespondersForZone,
} from "@/lib/constants";
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
  Truck,
  Shield,
  LifeBuoy,
  Compass,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

interface EmergencyMapProps {
  center: [number, number];
  zoom: number;
  sosEvents: SOSEvent[];
  clusters: SOSCluster[];
  activeZone: HazardZone;
  citizens?: CitizenLocation[];
  safeRoutes?: SafeEvacuationRoute[];
  responders?: EmergencyResponder[];
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

// Custom DivIcons — Corwdy Pure Neutral Palette
const createRadarIcon = (status: "SOS" | "SAFE" | "HELPING", isMesh: boolean) => {
  const colorClass =
    status === "SAFE" ? "safe" : status === "HELPING" ? "helping" : "";
  const meshBadge = isMesh
    ? `<span style="position: absolute; top: -6px; right: -6px; background: #ffffff; color: #161a20; font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 9999px; border: 1px solid #161a20;">BLE</span>`
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
  return L.divIcon({
    className: "cluster-div-icon",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        background: #161a20;
        color: white;
        border: 2px solid #ffffff;
        border-radius: 9999px;
        width: 52px;
        height: 52px;
        box-shadow: 0 0 16px rgba(255, 255, 255, 0.3);
        font-weight: 800;
        font-size: 11px;
        cursor: pointer;
      ">
        <span style="font-size: 9px; opacity: 0.8; font-family: monospace;">${cluster.priority}</span>
        <span style="font-size: 14px; line-height: 1; font-weight: 900;">${cluster.total_people}</span>
        <span style="font-size: 7px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8;">NDRF</span>
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -26],
  });
};

const createInfraIcon = (infra: CriticalInfrastructure) => {
  const iconSymbol =
    infra.type === "DAM" || infra.type === "BARRAGE" ? "⚡" : infra.type === "BRIDGE" ? "🌉" : "⛺";

  return L.divIcon({
    className: "infra-div-icon",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        background: #1b2027;
        color: white;
        border: 1.5px solid rgba(255, 255, 255, 0.4);
        border-radius: 8px;
        width: 32px;
        height: 32px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.6);
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
        background: #161a20;
        color: white;
        border: 2px solid #ffffff;
        border-radius: 9999px;
        width: 44px;
        height: 44px;
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.35);
        cursor: pointer;
      ">
        <span style="font-size: 18px;">💥</span>
        <span style="
          position: absolute;
          bottom: -16px;
          background: #1b2027;
          color: #ffffff;
          font-family: monospace;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.25);
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
        background: #161a20;
        color: white;
        border: 1.5px solid rgba(255, 255, 255, 0.3);
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
        background: #1b2027;
        color: white;
        border: 2px dashed rgba(255, 255, 255, 0.4);
        border-radius: 9999px;
        width: 36px;
        height: 36px;
        box-shadow: 0 0 14px rgba(255, 255, 255, 0.2);
        cursor: pointer;
      ">
        <span style="font-size: 13px;">⏱️</span>
        <span style="
          position: absolute;
          top: -8px;
          right: -8px;
          background: #161a20;
          color: #ffffff;
          font-family: monospace;
          font-size: 8px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.25);
        ">-${citizen.last_seen_minutes_ago}m</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const createAssemblyIcon = (name: string, capacity: number) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div style="
        background: #161a20;
        color: white;
        padding: 4px 8px;
        border-radius: 8px;
        font-weight: 800;
        font-size: 10px;
        border: 1.5px solid rgba(255, 255, 255, 0.5);
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        cursor: pointer;
      ">
        <span>⛺</span>
        <span>${name.split(" ")[0]} (Cap: ${capacity})</span>
      </div>
    `,
    iconSize: [120, 30],
    iconAnchor: [60, 15],
    popupAnchor: [0, -15],
  });
};

const createResponderIcon = (type: string, eta: number) => {
  const emoji = type === "AMBULANCE" ? "🚑" : type === "POLICE" ? "🚓" : "🚤";
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div style="
        background: #161a20;
        color: white;
        padding: 3px 6px;
        border-radius: 6px;
        font-weight: 800;
        font-size: 9px;
        border: 1.5px solid rgba(255, 255, 255, 0.4);
        box-shadow: 0 3px 8px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 3px;
        cursor: pointer;
        white-space: nowrap;
      ">
        <span>${emoji}</span>
        <span>${type} (~${eta}m)</span>
      </div>
    `,
    iconSize: [90, 24],
    iconAnchor: [45, 12],
    popupAnchor: [0, -12],
  });
};

export default function EmergencyMap({
  center,
  zoom,
  sosEvents,
  clusters,
  activeZone,
  citizens = [],
  safeRoutes,
  responders,
  selectedEventId,
  onSelectEvent,
  onDispatchCluster,
}: EmergencyMapProps) {
  const [showInfrastructure, setShowInfrastructure] = useState<boolean>(true);
  const [showEpicenter, setShowEpicenter] = useState<boolean>(true);
  const [showLiveCitizens, setShowLiveCitizens] = useState<boolean>(true);
  const [showLastKnownCitizens, setShowLastKnownCitizens] = useState<boolean>(true);
  const [showSafeRoutes, setShowSafeRoutes] = useState<boolean>(true);
  const [showResponders, setShowResponders] = useState<boolean>(true);
  const [basemap, setBasemap] = useState<"topo" | "satellite" | "osm">("topo");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  const activeSafeRoutes =
    safeRoutes && safeRoutes.length > 0
      ? safeRoutes
      : getSafeRoutesForZone(activeZone);

  const activeResponders =
    responders && responders.length > 0
      ? responders
      : getRespondersForZone(activeZone);

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

  const zoneAlertColor = "#ffffff";

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-white/10 bg-[#161a20] shadow-sm">
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
            fillOpacity: 0.08,
            weight: 1.5,
            dashArray: "6, 8",
          }}
        />

        {/* Critical Infrastructure Points (Dams, Bridges, Shelters) */}
        {showInfrastructure &&
          (activeZone.infrastructure || []).map((infra) => (
            <Marker
              key={infra.id}
              position={infra.coords}
              icon={createInfraIcon(infra)}
            >
              <Popup>
                <div className="p-2 space-y-1.5 text-white min-w-[210px] bg-[#1b2027]">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      {infra.name}
                    </span>
                    <span
                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase bg-white text-[#161a20]"
                    >
                      {infra.riskLevel} RISK
                    </span>
                  </div>
                  <div className="text-xs text-white/70">
                    <span className="text-white/40">Type:</span> {infra.type}
                  </div>
                  <div className="text-xs text-white/70">
                    <span className="text-white/40">River Offset:</span> {infra.bufferDistanceM}m from channel
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
              <div className="p-2 space-y-2 text-white min-w-[210px] bg-[#1b2027]">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Cluster #{cluster.cluster_id}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-[#161a20]">
                    Priority {cluster.priority}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-white/60">Total Trapped:</span>{" "}
                  <strong className="text-white font-mono text-base">
                    {cluster.total_people} People
                  </strong>
                </div>
                {cluster.dispatched ? (
                  <div className="text-xs font-medium text-white bg-white/10 p-1.5 rounded border border-white/20">
                    ✓ Dispatched: {cluster.assigned_team || "Team Dispatched"}
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      onDispatchCluster && onDispatchCluster(cluster.cluster_id)
                    }
                    className="btn-solid-primary w-full mt-1 font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 min-h-[44px]"
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
                <div className="p-2.5 space-y-2 text-white min-w-[240px] bg-[#1b2027]">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      💥 DISASTER EPICENTER
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-[#161a20] text-[9px] font-extrabold uppercase">
                      {activeZone.epicenter.type}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white">
                    {activeZone.epicenter.name}
                  </div>
                  <div className="text-xs text-white/70 space-y-1 bg-[#161a20] p-2 rounded border border-white/10 font-mono">
                    <div>
                      <span className="text-white/40">Elevation:</span>{" "}
                      {activeZone.epicenter.elevation_m}m AMSL
                    </div>
                    <div>
                      <span className="text-white/40">Volume:</span>{" "}
                      {activeZone.epicenter.estimated_volume_m3}
                    </div>
                    <div>
                      <span className="text-white/40">Detection:</span>{" "}
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
                color: "#ffffff",
                weight: 4,
                opacity: 0.9,
                dashArray: "8, 8",
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
                  <div className="p-2 text-xs text-white space-y-1 min-w-[190px] bg-[#1b2027]">
                    <div className="font-bold text-white flex items-center gap-1">
                      🌊 Surge Checkpoint: {cp.name}
                    </div>
                    <div className="text-white/70 font-mono text-[11px]">
                      Distance: {cp.distance_km} km • ETA: +{cp.eta_minutes} mins
                    </div>
                    <div className="text-white font-mono text-[11px] font-bold">
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
                  <div className="p-2 space-y-1.5 text-white min-w-[210px] bg-[#1b2027]">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        ● LIVE GPS FIX
                      </span>
                      <span className="text-[10px] font-mono text-white/60">
                        {citizen.battery_pct}% Batt
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white">
                      {citizen.sos_type || "Citizen Active"}
                    </div>
                    <div className="text-[11px] text-white/50 font-mono">
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
                    color: "#ffffff",
                    fillColor: "#ffffff",
                    fillOpacity: 0.08,
                    weight: 1.5,
                    dashArray: "4, 6",
                  }}
                />

                <Marker
                  position={[citizen.lat, citizen.lng]}
                  icon={createLastKnownLocationIcon(citizen)}
                >
                  <Popup>
                    <div className="p-2 space-y-1.5 text-white min-w-[230px] bg-[#1b2027]">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1">
                        <span className="text-xs font-mono font-bold text-white flex items-center gap-1">
                          ⏱️ LAST KNOWN FIX
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/15 text-white border border-white/20">
                          {citizen.last_seen_minutes_ago}m AGO
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white">
                        {citizen.sos_type || "Last Reported Position"}
                      </div>
                      <div className="text-[11px] text-white/70 font-mono space-y-0.5 bg-[#161a20] p-1.5 rounded border border-white/10">
                        <div>
                          <span className="text-white/40">Signal Relay:</span>{" "}
                          Offline BLE Mesh Hop #{citizen.mesh_hops}
                        </div>
                        <div>
                          <span className="text-white/40">Drift Radius:</span>{" "}
                          ±{citizen.drift_radius_m}m valley buffer
                        </div>
                        <div>
                          <span className="text-white/40">Battery State:</span>{" "}
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
                <div className="p-2 space-y-2 text-white min-w-[220px] bg-[#1b2027]">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-white">
                      {event.status === "SOS" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                      )}
                      {event.status === "SOS" ? "CRITICAL SOS" : event.status}
                    </span>
                    {event.is_mesh_relayed && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-white border border-white/20 flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5" /> BLE Mesh
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-white/80">
                    <div className="font-semibold text-white">
                      {event.sos_type || "Emergency Signal"}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Verified Safe Evacuation Routes */}
        {showSafeRoutes &&
          activeSafeRoutes.map((route) => (
            <React.Fragment key={route.id}>
              <Polyline
                positions={route.waypoints}
                pathOptions={{
                  color: "rgba(255, 255, 255, 0.75)",
                  weight: 4,
                  opacity: 0.85,
                  dashArray: "8, 8",
                }}
              />
              <Marker
                position={route.assembly_coords}
                icon={createAssemblyIcon(route.assembly_point_name, route.shelter_capacity)}
              >
                <Popup>
                  <div className="p-2 space-y-1.5 text-white min-w-[220px] bg-[#1b2027]">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1">
                      <span className="text-xs font-bold text-white">
                        ⛺ HIGH GROUND SHELTER
                      </span>
                      <span className="text-[10px] text-white/70 font-bold">
                        +{route.elevation_gain_m}m Gain
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">
                      {route.assembly_point_name}
                    </div>
                    <div className="text-[11px] text-white/70">
                      Capacity: <strong className="text-white">{route.shelter_capacity} citizens</strong>
                    </div>
                    <div className="text-[10px] text-white/80 font-mono">
                      Safe Route: {route.distance_km}km • ~{route.walk_time_minutes} min walk
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

        {/* Emergency Responders Grid (Ambulances, Police, NDRF) */}
        {showResponders &&
          activeResponders.map((resp) => (
            <Marker
              key={resp.id}
              position={resp.coords}
              icon={createResponderIcon(resp.type, resp.eta_minutes)}
            >
              <Popup>
                <div className="p-2 space-y-1.5 text-white min-w-[230px] bg-[#1b2027]">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      {resp.type === "AMBULANCE" ? "🚑" : resp.type === "POLICE" ? "🚓" : "🚤"} {resp.type} UNIT
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-[#161a20]">
                      ETA ~{resp.eta_minutes} MINS
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white">
                    {resp.unit_name}
                  </div>
                  <div className="text-[11px] text-white/70">
                    Station: {resp.station_location}
                  </div>
                  <div className="text-[10px] text-white/50">
                    Fleet: {resp.vehicle_fleet}
                  </div>
                  <div className="text-[10px] font-mono text-white pt-1">
                    Hotline: {resp.contact_number}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Tactical Layers Docked Sidebar (Right Side of Map, Not Screen) */}
      {isSidebarOpen ? (
        <div className="absolute top-0 right-0 bottom-0 h-full w-60 sm:w-64 bg-[#1b2027]/95 backdrop-blur-md border-l border-white/15 z-[1000] p-3.5 flex flex-col justify-between shadow-2xl overflow-y-auto">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="text-xs font-black uppercase text-white flex items-center gap-1.5 tracking-wider">
                <Layers className="w-3.5 h-3.5 text-white" aria-hidden />
                <span>Map Layers</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Layer toggles */}
            <div className="flex flex-col gap-1.5">
              {/* Epicenter & Flood Wave Toggle */}
              <button
                onClick={() => setShowEpicenter((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition text-left min-h-[36px] cursor-pointer ${
                  showEpicenter
                    ? "bg-white text-[#161a20] font-bold shadow-sm"
                    : "bg-[#161a20] text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>💥 GLOF Epicenter &amp; Wave</span>
              </button>

              {/* Safe Evacuation Routes */}
              <button
                onClick={() => setShowSafeRoutes((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition text-left min-h-[36px] cursor-pointer ${
                  showSafeRoutes
                    ? "bg-white text-[#161a20] font-bold shadow-sm"
                    : "bg-[#161a20] text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>🏃‍♂️ Safe Routes ({activeSafeRoutes.length})</span>
              </button>

              {/* Emergency Responders */}
              <button
                onClick={() => setShowResponders((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition text-left min-h-[36px] cursor-pointer ${
                  showResponders
                    ? "bg-white text-[#161a20] font-bold shadow-sm"
                    : "bg-[#161a20] text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>🚑 Responders ({activeResponders.length})</span>
              </button>

              {/* Critical Infrastructure */}
              <button
                onClick={() => setShowInfrastructure((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition text-left min-h-[36px] cursor-pointer ${
                  showInfrastructure
                    ? "bg-white text-[#161a20] font-bold shadow-sm"
                    : "bg-[#161a20] text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>⚡ Critical Infrastructure</span>
              </button>

              {/* Live Citizens */}
              <button
                onClick={() => setShowLiveCitizens((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition text-left min-h-[36px] cursor-pointer ${
                  showLiveCitizens
                    ? "bg-white text-[#161a20] font-bold shadow-sm"
                    : "bg-[#161a20] text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>🟢 Live Citizens ({citizens.filter((c) => c.is_live).length || sosEvents.length})</span>
              </button>

              {/* Last Known Locations (BLE Mesh) */}
              <button
                onClick={() => setShowLastKnownCitizens((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition text-left min-h-[36px] cursor-pointer ${
                  showLastKnownCitizens
                    ? "bg-white text-[#161a20] font-bold shadow-sm"
                    : "bg-[#161a20] text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>⏱️ Last Known ({citizens.filter((c) => !c.is_live).length})</span>
              </button>
            </div>
          </div>

          {/* Basemap Selection */}
          <div className="pt-2.5 border-t border-white/10 mt-2">
            <div className="text-[10px] font-bold uppercase text-white/60 flex items-center gap-1 mb-1.5">
              <Globe className="w-3 h-3 text-white" aria-hidden /> Terrain Mode
            </div>
            <div className="grid grid-cols-3 gap-1 bg-[#161a20] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setBasemap("topo")}
                className={`px-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer ${
                  basemap === "topo"
                    ? "bg-white text-[#161a20] shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
                title="Elevation Contours (Esri Topo)"
              >
                <Mountain className="w-3 h-3" aria-hidden />
                <span>Topo</span>
              </button>
              <button
                onClick={() => setBasemap("satellite")}
                className={`px-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer ${
                  basemap === "satellite"
                    ? "bg-white text-[#161a20] shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
                title="Satellite Reconnaissance (Esri Imagery)"
              >
                <Satellite className="w-3 h-3" aria-hidden />
                <span>Sat</span>
              </button>
              <button
                onClick={() => setBasemap("osm")}
                className={`px-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer ${
                  basemap === "osm"
                    ? "bg-white text-[#161a20] shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
                title="OpenStreetMap Road Network"
              >
                <Globe className="w-3 h-3" aria-hidden />
                <span>OSM</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Sidebar Toggle Tab (Right Side of Map) */
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-3 right-3 z-[1000] bg-[#1b2027]/95 backdrop-blur-md border border-white/15 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xl hover:bg-[#161a20] transition cursor-pointer"
          title="Open map layers sidebar"
          aria-label="Open map layers sidebar"
        >
          <Layers className="w-4 h-4 text-white" />
          <span>Map Layers</span>
          <ChevronLeft className="w-3.5 h-3.5 text-white/70" />
        </button>
      )}

      {/* Map Overlay Header / Legend */}
      <div className="absolute top-3 left-3 z-[1000] bg-[#1b2027]/95 backdrop-blur-md border border-white/15 rounded-2xl p-3 shadow-2xl max-w-xs pointer-events-auto">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
          <span className="text-xs font-extrabold uppercase tracking-wider text-white">
            India Flood Radar
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/80">
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
            <span>Evac Shelter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white ring-2 ring-white/30"></span>
            <span>Citizen SOS</span>
          </div>
        </div>
      </div>

      {/* Floating Active Zone Banner */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-[#1b2027]/95 backdrop-blur-md border border-white/15 rounded-xl px-3.5 py-2 text-xs flex items-center gap-2.5 shadow-xl">
        <div
          className="w-2.5 h-2.5 rounded-full bg-white"
        ></div>
        <div>
          <span className="text-white/60 font-medium">Monitoring Zone:</span>{" "}
          <strong className="text-white font-bold">{activeZone.name}</strong>
        </div>
      </div>
    </div>
  );
}