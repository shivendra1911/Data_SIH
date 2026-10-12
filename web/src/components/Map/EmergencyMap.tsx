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
  CollapseCluster,
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
  Navigation,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
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
  collapseClusters?: CollapseCluster[];
}

// Controller component to smoothly fly camera to center coordinates or focus target
function MapViewController({
  center,
  zoom,
  focusTarget,
}: {
  center: [number, number];
  zoom: number;
  focusTarget?: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (focusTarget) {
      map.flyTo(focusTarget, 16, {
        duration: 1.4,
        easeLinearity: 0.25,
      });
    } else {
      map.flyTo(center, zoom, {
        duration: 1.4,
        easeLinearity: 0.25,
      });
    }
  }, [center, zoom, focusTarget, map]);
  return null;
}

// Custom DivIcons — Corwdy Pure Neutral Palette
const createRadarIcon = (status: "SOS" | "SAFE" | "HELPING", isMesh: boolean, hops: number = 0) => {
  const colorClass =
    status === "SAFE" ? "safe" : status === "HELPING" ? "helping" : "";
  let meshBadge = "";
  if (isMesh || hops > 0) {
    if (hops > 1) {
      meshBadge = `<span style="position: absolute; top: -7px; right: -7px; background: #fef08a; color: #854d0e; font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 9999px; border: 1px solid #ca8a04;">${hops}H</span>`;
    } else {
      meshBadge = `<span style="position: absolute; top: -6px; right: -6px; background: #bbf7d0; color: #166534; font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 9999px; border: 1px solid #16a34a;">1H</span>`;
    }
  }

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

const createStartOriginIcon = (name: string) => {
  return L.divIcon({
    className: "custom-origin-icon",
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; cursor: pointer;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; background: rgba(59, 130, 246, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: #2563eb;
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 11px;
        ">A</div>
        <div style="
          position: absolute;
          bottom: -18px;
          background: #1e293b;
          color: #f8fafc;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.3);
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        ">Origin</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createDestinationHavenIcon = (
  name: string,
  elevGain: number,
  capacity: number,
  isSafe: boolean,
  isSelected: boolean
) => {
  const primaryColor = isSafe ? "#059669" : "#2563eb";
  const badgeBg = isSafe ? "#064e3b" : "#1e3a8a";
  const pinSymbol = isSafe ? "🛡️" : "⚡";

  return L.divIcon({
    className: "custom-destination-icon",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: ${isSelected ? 'scale(1.08)' : 'scale(1.0)'}; transition: transform 0.2s;">
        <div style="
          display: flex;
          align-items: center;
          gap: 4px;
          background: ${badgeBg};
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(0,0,0,0.45);
          border: 1.5px solid #ffffff;
          white-space: nowrap;
          margin-bottom: 2px;
        ">
          <span>${pinSymbol}</span>
          <span>${name.split(" ")[0]}</span>
          <span style="opacity: 0.85; font-size: 9px; font-family: monospace;">+${elevGain}m</span>
        </div>
        <div style="
          width: 30px;
          height: 30px;
          background: ${primaryColor};
          border: 2.5px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="transform: rotate(45deg); font-size: 12px; font-weight: 900; color: white;">🏁</div>
        </div>
      </div>
    `,
    iconSize: [120, 56],
    iconAnchor: [60, 52],
    popupAnchor: [0, -48],
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

const createCollapseClusterIcon = (cluster: CollapseCluster) => {
  const isConfirmed = cluster.status === "CONFIRMED_COLLAPSE";
  const count = cluster.trapped_headcount || cluster.reporting_devices?.length || 1;
  const badgeBg = isConfirmed ? "#dc2626" : "#d97706";
  const ringColor = isConfirmed ? "rgba(220, 38, 38, 0.5)" : "rgba(217, 119, 6, 0.4)";
  const label = isConfirmed ? "QUORUM USAR" : "1 PHONE SHOCK";

  return L.divIcon({
    className: "custom-collapse-icon",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 54px;
          height: 54px;
          border-radius: 9999px;
          background: ${ringColor};
          animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          background: ${badgeBg};
          color: #ffffff;
          padding: 2px 7px;
          border-radius: 9999px;
          font-size: 9px;
          font-weight: 800;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          border: 1.5px solid #ffffff;
          white-space: nowrap;
          z-index: 2;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 3px;
        ">
          <span>${isConfirmed ? "🚨" : "⚠️"}</span>
          <span>${label}</span>
          <span style="background: rgba(0,0,0,0.3); padding: 0 4px; border-radius: 3px; font-family: monospace;">${count}📱</span>
        </div>
        <div style="
          width: 34px;
          height: 34px;
          background: #111827;
          border: 2px solid #ffffff;
          border-radius: 9999px;
          box-shadow: 0 0 14px ${badgeBg};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          z-index: 2;
        ">
          ${isConfirmed ? "🏢" : "⚡"}
        </div>
      </div>
    `,
    iconSize: [120, 60],
    iconAnchor: [60, 42],
    popupAnchor: [0, -40],
  });
};

export interface MapLandslideSector {
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
  reporting_count: number;
  consensus_ratio_percent: number;
  has_active_directive?: boolean;
}

const createLandslideSectorIcon = (sector: MapLandslideSector) => {
  const isConfirmed = sector.status === "CONFIRMED_LANDSLIDE";
  const isPending = sector.status === "PENDING_QUORUM";
  const ringColor = isConfirmed ? "rgba(239, 68, 68, 0.45)" : isPending ? "rgba(245, 158, 11, 0.35)" : "rgba(100, 116, 139, 0.2)";
  const badgeBg = isConfirmed ? "#ef4444" : isPending ? "#f59e0b" : "#475569";
  const count = sector.reporting_count || sector.reporting_devices?.length || 0;
  const thresh = sector.quorum_threshold || 3;
  const label = isConfirmed ? "LANDSLIDE QUORUM" : isPending ? "TREMOR DETECTED" : "SECTOR SENSOR";

  return L.divIcon({
    className: "landslide-sector-div-icon",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 58px;
          height: 58px;
          border-radius: 9999px;
          background: ${ringColor};
          animation: ping 2.0s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          background: ${badgeBg};
          color: #ffffff;
          padding: 2px 7px;
          border-radius: 9999px;
          font-size: 9px;
          font-weight: 800;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          border: 1.5px solid #ffffff;
          white-space: nowrap;
          z-index: 2;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 3px;
        ">
          <span>⛰️</span>
          <span>${label}</span>
          <span style="background: rgba(0,0,0,0.35); padding: 0 4px; border-radius: 3px; font-family: monospace;">${count}/${thresh}📱</span>
        </div>
        <div style="
          width: 36px;
          height: 36px;
          background: #111827;
          border: 2px solid #ffffff;
          border-radius: 9999px;
          box-shadow: 0 0 14px ${badgeBg};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          z-index: 2;
        ">
          ${isConfirmed ? "🚨" : "⛰️"}
        </div>
      </div>
    `,
    iconSize: [124, 62],
    iconAnchor: [62, 44],
    popupAnchor: [0, -42],
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
  collapseClusters: propCollapseClusters,
}: EmergencyMapProps) {
  const [showInfrastructure, setShowInfrastructure] = useState<boolean>(true);
  const [showEpicenter, setShowEpicenter] = useState<boolean>(true);
  const [showLiveCitizens, setShowLiveCitizens] = useState<boolean>(true);
  const [showLastKnownCitizens, setShowLastKnownCitizens] = useState<boolean>(true);
  const [showSafeRoutes, setShowSafeRoutes] = useState<boolean>(true);
  const [showCollapseClusters, setShowCollapseClusters] = useState<boolean>(true);
  const [liveCollapseClusters, setLiveCollapseClusters] = useState<CollapseCluster[]>(propCollapseClusters || []);
  const [showLandslideSectors, setShowLandslideSectors] = useState<boolean>(true);
  const [landslideSectors, setLandslideSectors] = useState<MapLandslideSector[]>([]);
  const [focusTarget, setFocusTarget] = useState<[number, number] | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [showTurnGuidance, setShowTurnGuidance] = useState<boolean>(false);
  const [showResponders, setShowResponders] = useState<boolean>(true);
  const [basemap, setBasemap] = useState<"hybrid" | "satellite" | "terrain" | "street">("hybrid");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  useEffect(() => {
    if (propCollapseClusters && propCollapseClusters.length > 0) {
      setLiveCollapseClusters(propCollapseClusters);
    }
  }, [propCollapseClusters]);

  useEffect(() => {
    let isMounted = true;
    const fetchCollapse = async () => {
      try {
        const res = await fetch("/api/collapse/active-clusters");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.clusters && Array.isArray(data.clusters)) {
            setLiveCollapseClusters(data.clusters);
          }
        }
      } catch {}
    };
    fetchCollapse();
    const pollInterval = setInterval(fetchCollapse, 3000);
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchLandslides = async () => {
      try {
        const res = await fetch("/api/landslide/active-sectors");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.sectors && Array.isArray(data.sectors)) {
            setLandslideSectors(data.sectors);
          }
        }
      } catch {}
    };
    fetchLandslides();
    const pollInterval = setInterval(fetchLandslides, 3500);
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  const mockNamesOrIds = [
    "test",
    "dummy",
    "mock",
    "demo",
    "synthetic",
    "cloud_device",
    "ramesh",
    "anita",
    "katy",
    "seed",
    "dev_priyanshu_phone",
    "dev_ramesh_kumar",
    "dev_katy_fuller",
    "dev_anita_sharma",
    "node_b_relay",
    "node_c_dist",
    "node_d_shelter",
    "node_x_relay",
    "node_l_2400m",
  ];

  // Filter out any mock/dummy telemetry devices
  const realCitizens = citizens.filter((c) => {
    if (!c.device_uuid && !c.name) return false;
    const d = (c.device_uuid || "").toLowerCase();
    const n = (c.name || "").toLowerCase();
    return !mockNamesOrIds.some((kw) => d.includes(kw) || n.includes(kw));
  });

  const activeSafeRoutes =
    safeRoutes && safeRoutes.length > 0
      ? safeRoutes
      : getSafeRoutesForZone(activeZone);

  const safeRoute = activeSafeRoutes.find((r) => r.route_type === "SAFE") || activeSafeRoutes[0];
  const fastRoute = activeSafeRoutes.find((r) => r.route_type === "FAST") || activeSafeRoutes[1] || activeSafeRoutes[0];

  const currentActiveRoute =
    activeSafeRoutes.find((r) => r.id === selectedRouteId) || safeRoute || activeSafeRoutes[0];

  useEffect(() => {
    if (activeSafeRoutes.length > 0) {
      const match = activeSafeRoutes.find((r) => r.id === selectedRouteId);
      if (!match) {
        setSelectedRouteId(safeRoute?.id || activeSafeRoutes[0].id);
      }
    }
  }, [activeZone.id, activeSafeRoutes, safeRoute?.id, selectedRouteId]);

  const activeResponders =
    responders && responders.length > 0
      ? responders
      : getRespondersForZone(activeZone);

  const googleApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    "AIzaSyBuZa36PDwWKduUlVQKPWoqPS7TiwW10EI";

  const basemapConfigs = {
    hybrid: {
      name: "Google Hybrid (Satellite + Roads)",
      url: `https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${googleApiKey}`,
      subdomains: ["0", "1", "2", "3"],
      attribution: "&copy; Google Maps",
      maxZoom: 21,
    },
    satellite: {
      name: "Google Satellite",
      url: `https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=${googleApiKey}`,
      subdomains: ["0", "1", "2", "3"],
      attribution: "&copy; Google Maps",
      maxZoom: 21,
    },
    terrain: {
      name: "Google Terrain (Relief)",
      url: `https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&key=${googleApiKey}`,
      subdomains: ["0", "1", "2", "3"],
      attribution: "&copy; Google Maps",
      maxZoom: 21,
    },
    street: {
      name: "Google Roadmap",
      url: `https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleApiKey}`,
      subdomains: ["0", "1", "2", "3"],
      attribution: "&copy; Google Maps",
      maxZoom: 21,
    },
  };

  const zoneAlertColor = "#ffffff";

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-white/10 bg-[#161a20] shadow-sm">
      {/* Live Google Maps Status Indicator & Active Collapse Focus */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2">
        <div className="bg-[#161a20]/90 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Google Maps Engine • Live PostGIS Telemetry</span>
        </div>

        {liveCollapseClusters.length > 0 && (
          <button
            onClick={() => {
              const first = liveCollapseClusters[0];
              setFocusTarget([first.centroid_lat, first.centroid_lng]);
            }}
            className="bg-red-600 hover:bg-red-500 backdrop-blur-md border border-red-400/50 px-3 py-1.5 rounded-xl text-[11px] font-extrabold text-white shadow-xl flex items-center gap-1.5 transition cursor-pointer"
            title="Focus camera on detected collapse sector"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{liveCollapseClusters.length} Collapse Cluster(s) Active • Focus Sector</span>
          </button>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapViewController center={center} zoom={zoom} focusTarget={focusTarget} />

        {/* Official Google Maps Live Tiles */}
        <TileLayer
          key={basemap}
          attribution={basemapConfigs[basemap].attribution}
          url={basemapConfigs[basemap].url}
          subdomains={basemapConfigs[basemap].subdomains}
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
          realCitizens
            .filter((c) => c.is_live)
            .map((citizen) => (
              <Marker
                key={citizen.id}
                position={[citizen.lat, citizen.lng]}
                icon={createRadarIcon(citizen.status, citizen.mesh_hops > 0, citizen.mesh_hops)}
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
                    {citizen.mesh_hops > 0 && (
                      <div className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 mt-1">
                        📡 {citizen.mesh_hops === 1 ? "Direct • 1 Hop (~150m)" : `Relayed Mesh • ${citizen.mesh_hops} Hops (~${citizen.mesh_hops * 200 >= 1000 ? `${((citizen.mesh_hops * 200) / 1000).toFixed(1)} km` : `${citizen.mesh_hops * 200}m`})`}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

        {/* Last Known Locations (Offline / Relayed via BLE Mesh) */}
        {showLastKnownCitizens &&
          realCitizens
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
          sosEvents
            .filter((event) => {
              const d = (event.device_uuid || event.id || "").toLowerCase();
              const n = (event.notes || "").toLowerCase();
              return !mockNamesOrIds.some((kw) => d.includes(kw) || n.includes(kw));
            })
            .map((event) => (
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

        {/* Google Maps Realistic Evacuation Route Paths (Safe & Fast) */}
        {showSafeRoutes &&
          activeSafeRoutes.map((route) => {
            const isSelected = route.id === currentActiveRoute?.id;
            const isSafe = route.route_type !== "FAST";
            return (
              <React.Fragment key={route.id}>
                {/* Outer casing polyline for Google Maps street contrast */}
                <Polyline
                  positions={route.waypoints}
                  pathOptions={{
                    color: isSelected
                      ? isSafe
                        ? "#064e3b"
                        : "#1e3a8a"
                      : "#334155",
                    weight: isSelected ? 9 : 7,
                    opacity: isSelected ? 0.75 : 0.35,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  eventHandlers={{
                    click: () => setSelectedRouteId(route.id),
                  }}
                />

                {/* Inner core road line (Emerald for Safe, Vibrant Blue for Fast, Slate for Inactive) */}
                <Polyline
                  positions={route.waypoints}
                  pathOptions={{
                    color: isSelected
                      ? isSafe
                        ? "#10b981"
                        : "#3b82f6"
                      : "#94a3b8",
                    weight: isSelected ? 5 : 4,
                    opacity: isSelected ? 1 : 0.75,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  eventHandlers={{
                    click: () => setSelectedRouteId(route.id),
                  }}
                />

                {/* Google Maps Destination Haven Pin */}
                <Marker
                  position={route.assembly_coords}
                  icon={createDestinationHavenIcon(
                    route.assembly_point_name,
                    route.elevation_gain_m || 0,
                    route.shelter_capacity,
                    isSafe,
                    isSelected
                  )}
                  eventHandlers={{
                    click: () => setSelectedRouteId(route.id),
                  }}
                >
                  <Popup>
                    <div className="p-2 space-y-1.5 text-white min-w-[220px] bg-[#1b2027]">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1">
                          {isSafe ? "🛡️ SAFE PATH HAVEN" : "⚡ FAST PATH HAVEN"}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold">
                          +{route.elevation_gain_m}m Gain
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white">
                        {route.assembly_point_name}
                      </div>
                      <div className="text-[11px] text-white/70">
                        Via: <strong className="text-white">{route.via_road || "Elevated Road Corridor"}</strong>
                      </div>
                      <div className="text-[11px] text-white/70">
                        Capacity: <strong className="text-white">{route.shelter_capacity} citizens</strong>
                      </div>
                      <div className="text-[10px] text-white/80 font-mono">
                        Distance: {route.distance_km}km • ~{route.walk_time_minutes} min walk
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

        {/* Start / Origin Pin for Selected Active Route */}
        {showSafeRoutes && currentActiveRoute && (
          <Marker
            position={currentActiveRoute.start_coords}
            icon={createStartOriginIcon(currentActiveRoute.start_point_name)}
          >
            <Popup>
              <div className="p-2 space-y-1 text-white bg-[#1b2027] min-w-[190px]">
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1">
                  <span>🔵 Start Location (A)</span>
                </div>
                <div className="text-xs font-semibold text-white">
                  {currentActiveRoute.start_point_name}
                </div>
                <div className="text-[10px] text-white/60 font-mono">
                  Lowland Sector Origin
                </div>
              </div>
            </Popup>
          </Marker>
        )}

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

        {/* Active Building Collapse Clusters (100m Perimeter Circle + Centroid Pin) */}
        {showCollapseClusters &&
          liveCollapseClusters.map((cCluster) => {
            const isConfirmed = cCluster.status === "CONFIRMED_COLLAPSE";
            const deviceCount = cCluster.trapped_headcount || cCluster.reporting_devices?.length || 1;
            return (
              <React.Fragment key={`collapse-cluster-${cCluster.cluster_id}`}>
                {/* 100m Sector Danger Perimeter Circle */}
                <Circle
                  center={[cCluster.centroid_lat, cCluster.centroid_lng]}
                  radius={cCluster.radius_meters || 100}
                  pathOptions={{
                    color: isConfirmed ? "#ef4444" : "#f59e0b",
                    fillColor: isConfirmed ? "#ef4444" : "#fbbf24",
                    fillOpacity: isConfirmed ? 0.28 : 0.16,
                    weight: 2,
                    dashArray: isConfirmed ? "4, 6" : "6, 8",
                  }}
                />

                {/* Centroid Shockwave Pin */}
                <Marker
                  position={[cCluster.centroid_lat, cCluster.centroid_lng]}
                  icon={createCollapseClusterIcon(cCluster)}
                >
                  <Popup>
                    <div className="p-2 space-y-2 text-white min-w-[240px] bg-[#1b2027]">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                        <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          {isConfirmed ? "🚨 STRUCTURAL COLLAPSE" : "⚠️ PHONE FALL SHOCK"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            isConfirmed ? "bg-red-500 text-white" : "bg-amber-500 text-slate-950"
                          }`}
                        >
                          {cCluster.priority || (isConfirmed ? "CRITICAL" : "ELEVATED")}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-white">
                        Cluster #{cCluster.cluster_id} • 100m Consensus Perimeter
                      </div>

                      <div className="text-xs text-white/80 space-y-1 bg-[#161a20] p-2 rounded border border-white/10 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-white/50">Fallen Devices:</span>
                          <strong className="text-white">{deviceCount} Phone(s)</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Peak Shock:</span>
                          <strong className="text-amber-400">{cCluster.max_peak_g ? `${cCluster.max_peak_g.toFixed(1)}G` : "3.4G"}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Status:</span>
                          <span className={isConfirmed ? "text-red-400 font-bold" : "text-amber-400 font-bold"}>
                            {cCluster.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">GPS Centroid:</span>
                          <span className="text-white/80 text-[10px]">
                            {cCluster.centroid_lat.toFixed(5)}, {cCluster.centroid_lng.toFixed(5)}
                          </span>
                        </div>
                      </div>

                      {isConfirmed ? (
                        <div className="text-[10px] font-bold text-red-300 bg-red-950/60 p-2 rounded border border-red-500/40 flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                          <span>Quorum Consensus Met (≥3 Phones) • Civil Defense Siren Active &amp; USAR Readiness Dispatched</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-medium text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-500/30">
                          1 Phone Fall Shockwave Reported. Monitoring 100m sector for consensus quorum.
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

        {/* Active Landslide Sectors (Dynamic 1/3rd Quorum Boundary Circle + Sector Marker) */}
        {showLandslideSectors &&
          landslideSectors.map((sector) => {
            const isConfirmed = sector.status === "CONFIRMED_LANDSLIDE";
            const isPending = sector.status === "PENDING_QUORUM";
            const deviceCount = sector.reporting_count || sector.reporting_devices?.length || 0;
            const threshold = sector.quorum_threshold || 3;
            const strokeColor = isConfirmed ? "#ef4444" : isPending ? "#f59e0b" : "#64748b";

            return (
              <React.Fragment key={`map-landslide-sector-${sector.sector_id}`}>
                {/* 350m Sector Quorum Surveillance Perimeter */}
                <Circle
                  center={[sector.lat, sector.lng]}
                  radius={350}
                  pathOptions={{
                    color: strokeColor,
                    fillColor: strokeColor,
                    fillOpacity: isConfirmed ? 0.25 : isPending ? 0.15 : 0.05,
                    weight: isConfirmed ? 2.5 : 1.5,
                    dashArray: isConfirmed ? "4, 6" : "6, 8",
                  }}
                />

                {/* Sector Mountain Marker */}
                <Marker
                  position={[sector.lat, sector.lng]}
                  icon={createLandslideSectorIcon(sector)}
                >
                  <Popup>
                    <div className="p-2 space-y-2 text-white min-w-[240px] bg-[#1b2027]">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                        <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          {isConfirmed ? "🚨 LANDSLIDE QUORUM" : isPending ? "⚠️ SECTOR TREMORS" : "⛰️ MONITORED SECTOR"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            isConfirmed ? "bg-red-500 text-white" : isPending ? "bg-amber-500 text-slate-950" : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {sector.status}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-white">
                        {sector.sector_name}
                      </div>

                      <div className="text-xs text-white/80 space-y-1 bg-[#161a20] p-2 rounded border border-white/10 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-white/50">Consensus Ratio:</span>
                          <strong className={isConfirmed ? "text-red-400 font-bold" : "text-white"}>
                            {deviceCount} / {threshold} Phones (1/3rd Quorum)
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Seismic Frequency:</span>
                          <strong className="text-amber-400">
                            {sector.latest_frequency_hz ? `${sector.latest_frequency_hz.toFixed(1)} Hz` : "18.5 Hz"}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Peak Tremor G:</span>
                          <strong className="text-amber-400">
                            {sector.latest_tremor_g ? `${sector.latest_tremor_g.toFixed(2)} G` : "0.22 G"}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Sector Centroid:</span>
                          <span className="text-white/80 text-[10px]">
                            {sector.lat.toFixed(5)}, {sector.lng.toFixed(5)}
                          </span>
                        </div>
                      </div>

                      {isConfirmed ? (
                        <div className="text-[10px] font-bold text-red-300 bg-red-950/60 p-2 rounded border border-red-500/40 flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                          <span>1/3rd Quorum Consensus Met • Evacuation Siren Dispatched to Sector Phones</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-medium text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-500/30">
                          {deviceCount > 0
                            ? `Harmonic tremors registered from ${deviceCount} phone(s). Need ${threshold} for 1/3rd quorum consensus.`
                            : "Baseline harmonic sensors monitoring (10-50Hz)."}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
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
              {/* Collapse Quorum Clusters Toggle & Jump List */}
              <div className="space-y-1">
                <button
                  onClick={() => setShowCollapseClusters((prev) => !prev)}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition text-left min-h-[36px] cursor-pointer ${
                    showCollapseClusters
                      ? "bg-red-600 text-white font-bold shadow-sm"
                      : "bg-[#161a20] text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>🏢 Collapse Alerts ({liveCollapseClusters.length})</span>
                  {liveCollapseClusters.length > 0 && (
                    <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">LIVE</span>
                  )}
                </button>

                {showCollapseClusters && liveCollapseClusters.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    {liveCollapseClusters.map((c) => (
                      <button
                        key={c.cluster_id}
                        onClick={() => setFocusTarget([c.centroid_lat, c.centroid_lng])}
                        className="w-full text-left p-1.5 rounded-lg bg-red-950/60 border border-red-500/40 text-white text-[10px] hover:bg-red-900/70 transition flex items-center justify-between cursor-pointer"
                        title="Focus this collapse cluster on map"
                      >
                        <span className="truncate font-semibold">
                          📍 {c.cluster_id.replace("clp_cluster_", "#")} ({c.status === "CONFIRMED_COLLAPSE" ? "QUORUM" : "1 PHONE"})
                        </span>
                        <span className="font-mono text-red-300 font-bold shrink-0 text-[10px]">
                          {c.trapped_headcount || c.reporting_devices.length}📱
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Landslide 1/3rd Quorum Sectors Toggle & Jump List */}
              <div className="space-y-1">
                <button
                  onClick={() => setShowLandslideSectors((prev) => !prev)}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition text-left min-h-[36px] cursor-pointer ${
                    showLandslideSectors
                      ? "bg-amber-600 text-white font-bold shadow-sm"
                      : "bg-[#161a20] text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>⛰️ Landslide Sectors ({landslideSectors.length})</span>
                  {landslideSectors.filter((s) => s.status === "CONFIRMED_LANDSLIDE").length > 0 && (
                    <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">SIREN</span>
                  )}
                </button>

                {showLandslideSectors && landslideSectors.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    {landslideSectors.map((s) => {
                      const isConf = s.status === "CONFIRMED_LANDSLIDE";
                      const isPend = s.status === "PENDING_QUORUM";
                      return (
                        <button
                          key={s.sector_id}
                          onClick={() => setFocusTarget([s.lat, s.lng])}
                          className={`w-full text-left p-1.5 rounded-lg border text-white text-[10px] transition flex items-center justify-between cursor-pointer ${
                            isConf
                              ? "bg-red-950/70 border-red-500/50 hover:bg-red-900"
                              : isPend
                              ? "bg-amber-950/60 border-amber-500/40 hover:bg-amber-900/70"
                              : "bg-[#1a202c] border-white/10 hover:bg-white/10"
                          }`}
                          title={`Focus ${s.sector_name} on map`}
                        >
                          <span className="truncate font-semibold">
                            ⛰️ {s.sector_name.split(":")[0]} ({s.status === "CONFIRMED_LANDSLIDE" ? "QUORUM" : s.status === "PENDING_QUORUM" ? "TREMOR" : "STABLE"})
                          </span>
                          <span className="font-mono text-amber-300 font-bold shrink-0 text-[10px]">
                            {s.reporting_count || 0}/{s.quorum_threshold || 3}📱
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

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
                <span>🟢 Live Citizens ({realCitizens.filter((c) => c.is_live).length || sosEvents.length})</span>
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
                <span>⏱️ Last Known ({realCitizens.filter((c) => !c.is_live).length})</span>
              </button>
            </div>
          </div>

          {/* Basemap Selection */}
          <div className="pt-2.5 border-t border-white/10 mt-2">
            <div className="text-[10px] font-bold uppercase text-white/60 flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-emerald-400" aria-hidden /> Google Maps
              </span>
              <span className="text-[9px] text-emerald-400 font-mono font-bold">● LIVE</span>
            </div>
            <div className="grid grid-cols-4 gap-1 bg-[#161a20] p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setBasemap("hybrid")}
                className={`px-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-0.5 cursor-pointer ${
                  basemap === "hybrid"
                    ? "bg-white text-[#161a20] shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
                title="Google Hybrid (Satellite + Roads)"
              >
                <span>Hybrid</span>
              </button>
              <button
                type="button"
                onClick={() => setBasemap("satellite")}
                className={`px-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-0.5 cursor-pointer ${
                  basemap === "satellite"
                    ? "bg-white text-[#161a20] shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
                title="Google Satellite Recon"
              >
                <span>Sat</span>
              </button>
              <button
                type="button"
                onClick={() => setBasemap("terrain")}
                className={`px-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-0.5 cursor-pointer ${
                  basemap === "terrain"
                    ? "bg-white text-[#161a20] shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
                title="Google Mountain Relief & Contours"
              >
                <span>Terrain</span>
              </button>
              <button
                type="button"
                onClick={() => setBasemap("street")}
                className={`px-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-0.5 cursor-pointer ${
                  basemap === "street"
                    ? "bg-white text-[#161a20] shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
                title="Google Vector Streets Roadmap"
              >
                <span>Street</span>
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

      {/* Google Maps Route Navigation Control Card */}
      {showSafeRoutes && currentActiveRoute && (
        <div className="absolute top-14 left-3 z-[1000] max-w-sm sm:max-w-md w-[calc(100%-24px)] sm:w-auto bg-[#1b2027]/95 backdrop-blur-md border border-white/15 rounded-2xl p-3 shadow-2xl text-white space-y-2 pointer-events-auto">
          {/* Top Google Maps Route Chips */}
          <div className="flex items-center gap-2">
            {safeRoute && (
              <button
                onClick={() => setSelectedRouteId(safeRoute.id)}
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                  currentActiveRoute.id === safeRoute.id
                    ? "bg-emerald-600 text-white shadow-sm ring-1 ring-white/30"
                    : "bg-white/10 hover:bg-white/20 text-white/80"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  <span>Safe Path</span>
                </div>
                <span className="font-mono text-[11px] font-extrabold">{safeRoute.walk_time_minutes}m</span>
              </button>
            )}

            {fastRoute && (
              <button
                onClick={() => setSelectedRouteId(fastRoute.id)}
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                  currentActiveRoute.id === fastRoute.id
                    ? "bg-blue-600 text-white shadow-sm ring-1 ring-white/30"
                    : "bg-white/10 hover:bg-white/20 text-white/80"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-white" />
                  <span>Fast Path</span>
                </div>
                <span className="font-mono text-[11px] font-extrabold">{fastRoute.walk_time_minutes}m</span>
              </button>
            )}
          </div>

          {/* Route Metric Summary */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>{currentActiveRoute.route_type === "FAST" ? "⚡ Fast Arterial" : "🛡️ High-Ridge Safe Path"}</span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  +{currentActiveRoute.elevation_gain_m}m AMSL
                </span>
              </div>
              <div className="text-[11px] text-white/70 line-clamp-1">
                {currentActiveRoute.via_road || currentActiveRoute.route_name}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-mono font-black text-sm text-white">
                ~{currentActiveRoute.walk_time_minutes} min
              </div>
              <div className="text-[10px] font-mono text-white/60">
                {currentActiveRoute.distance_km} km
              </div>
            </div>
          </div>

          {/* Toggle Turn-by-Turn Guidance */}
          {currentActiveRoute.turn_instructions && currentActiveRoute.turn_instructions.length > 0 && (
            <div>
              <button
                onClick={() => setShowTurnGuidance((prev) => !prev)}
                className="w-full py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-white/90 flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Navigation className="w-3 h-3 text-emerald-400" />
                  <span>Turn-by-turn directions ({currentActiveRoute.turn_instructions.length} steps)</span>
                </span>
                {showTurnGuidance ? (
                  <ChevronUp className="w-3.5 h-3.5 text-white/70" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-white/70" />
                )}
              </button>

              {showTurnGuidance && (
                <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[11px] text-white/80 font-mono">
                  {currentActiveRoute.turn_instructions.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 bg-black/30 p-1.5 rounded-lg border border-white/5">
                      <span className="text-white/50 shrink-0 font-bold">{idx + 1}.</span>
                      <span className="leading-tight text-white/90">{step}</span>
                    </div>
                  ))}
                  <div className="p-1 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <span>🏁 Destination:</span>
                    <span className="text-white font-semibold truncate">{currentActiveRoute.assembly_point_name}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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