'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CitizenLiveLocation {
  device_uuid: string;
  name?: string;
  lat: number;
  lng: number;
  altitude?: number;
  battery_level?: number;
  last_synced_at: string;
  status?: string;
  isUnresponsiveDanger?: boolean;
  zone_id?: string;
}

interface RescueCluster {
  cluster_id: number;
  center_lat: number;
  center_lng: number;
  total_people: number;
  priority: string;
  primary_need: string;
  status: string;
  sector?: string;
}

interface EvacuationShelter {
  id: string;
  name: string;
  name_hi?: string;
  zone_id: string;
  lat: number;
  lng: number;
  elevation_m: number;
  capacity: number;
  medical_support: boolean;
  food_water_stocked: boolean;
  status: string;
  contact_phone?: string;
}

interface LeafletGisMapProps {
  centerLat: number;
  centerLng: number;
  zoom?: number;
  zoneName: string;
  liveDevices: CitizenLiveLocation[];
  clusters: RescueCluster[];
  shelters?: EvacuationShelter[];
  onSelectDevice?: (device: CitizenLiveLocation) => void;
  onDispatchSquad?: (clusterId: number, squadType: string) => void;
  language?: 'en' | 'hi';
}

export default function LeafletGisMap({
  centerLat,
  centerLng,
  zoom = 12,
  zoneName,
  liveDevices = [],
  clusters = [],
  shelters = [],
  onSelectDevice,
  onDispatchSquad,
  language = 'en',
}: LeafletGisMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const clustersLayerRef = useRef<any>(null);
  const sheltersLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [tileMode, setTileMode] = useState<'topo' | 'dark'>('dark');

  // Initialize Leaflet Map
  useEffect(() => {
    let isCancelled = false;

    const initMap = async () => {
      if (!mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = await import('leaflet');

      if (isCancelled || !mapContainerRef.current) return;

      // Fix default Leaflet icon paths in Next.js bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const initialTileUrl =
        tileMode === 'dark'
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tileLayer = L.tileLayer(initialTileUrl, {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      });

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: zoom,
        zoomControl: false,
        attributionControl: false,
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

      // Custom Zoom Control top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Layer groups for dynamic data
      const markersLayer = L.layerGroup().addTo(map);
      const clustersLayer = L.layerGroup().addTo(map);
      const sheltersLayer = L.layerGroup().addTo(map);

      markersLayerRef.current = markersLayer;
      clustersLayerRef.current = clustersLayer;
      sheltersLayerRef.current = sheltersLayer;
      mapInstanceRef.current = map;

      setMapReady(true);
    };

    initMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update center when zone coordinates change
  useEffect(() => {
    if (mapInstanceRef.current && centerLat && centerLng) {
      mapInstanceRef.current.flyTo([centerLat, centerLng], zoom, {
        duration: 1.2,
      });
    }
  }, [centerLat, centerLng, zoom]);

  // Toggle Tile Layer (Dark Tactical vs Topographic)
  const handleToggleTile = async () => {
    if (!mapInstanceRef.current) return;
    const L = await import('leaflet');
    const newMode = tileMode === 'dark' ? 'topo' : 'dark';
    setTileMode(newMode);

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newUrl =
      newMode === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newLayer = L.tileLayer(newUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  };

  // Render Markers (Citizens, Clusters, Shelters)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    const updateLayers = async () => {
      const L = await import('leaflet');

      // 1. Clear existing layers
      if (markersLayerRef.current) markersLayerRef.current.clearLayers();
      if (clustersLayerRef.current) clustersLayerRef.current.clearLayers();
      if (sheltersLayerRef.current) sheltersLayerRef.current.clearLayers();

      // 2. Add Citizens
      liveDevices.forEach((dev) => {
        if (dev.lat == null || dev.lng == null) return;
        const isDanger = dev.status === 'SOS' || dev.isUnresponsiveDanger;
        const isHelping = dev.status === 'HELPING';
        const color = isDanger ? '#ef4444' : isHelping ? '#38bdf8' : '#10b981';
        const pulseAnim = isDanger
          ? 'animation: pulse 1.5s infinite; box-shadow: 0 0 14px #ef4444;'
          : '';

        const iconHtml = `
          <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${color}; border: 2px solid #ffffff; ${pulseAnim}"></div>
          </div>
        `;

        const icon = L.divIcon({
          className: 'custom-citizen-pin',
          html: iconHtml,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = L.marker([dev.lat, dev.lng], { icon });
        const name = dev.name || dev.device_uuid.substring(0, 10);
        const statusLabel = dev.isUnresponsiveDanger
          ? '🚨 UNRESPONSIVE DANGER (>5 MIN)'
          : dev.status || 'ACTIVE';

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 4px; min-width: 180px;">
            <strong style="font-size: 13px; color: #0f172a;">${name}</strong>
            <div style="margin-top: 4px; font-size: 11px; color: ${color}; font-weight: 700;">
              ${statusLabel}
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
              GPS: ${dev.lat.toFixed(4)}° N, ${dev.lng.toFixed(4)}° E<br/>
              Elev: ${dev.altitude || 1450}m • Batt: ${dev.battery_level || 85}%<br/>
              Sync: ${new Date(dev.last_synced_at).toLocaleTimeString()}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => {
          if (onSelectDevice) onSelectDevice(dev);
        });
        marker.addTo(markersLayerRef.current);
      });

      // 3. Add Rescue Clusters
      clusters.forEach((c) => {
        if (c.center_lat == null || c.center_lng == null) return;
        const circle = L.circle([c.center_lat, c.center_lng], {
          radius: 1200,
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.18,
          weight: 2,
          dashArray: '6, 6',
        });

        const clusterHtml = `
          <div style="background: rgba(220, 38, 38, 0.85); color: #fff; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 800; border: 1px solid #fca5a5; white-space: nowrap;">
            CLUSTER #${c.cluster_id} (${c.total_people} STRANDED)
          </div>
        `;
        const clusterIcon = L.divIcon({
          className: 'cluster-label-pin',
          html: clusterHtml,
          iconAnchor: [60, 10],
        });

        const clusterMarker = L.marker([c.center_lat, c.center_lng], { icon: clusterIcon });
        const popupContent = `
          <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 4px; min-width: 190px;">
            <strong style="font-size: 13px; color: #dc2626;">RESCUE CLUSTER #${c.cluster_id}</strong>
            <div style="font-size: 11px; margin-top: 4px; color: #0f172a;">
              <strong>${c.total_people} People Stranded</strong> (${c.priority || 'P1'})
            </div>
            <div style="font-size: 10px; color: #475569; margin-top: 2px;">
              Primary Need: <strong>${c.primary_need}</strong><br/>
              GPS: ${c.center_lat.toFixed(4)}° N, ${c.center_lng.toFixed(4)}° E
            </div>
          </div>
        `;
        circle.bindPopup(popupContent);
        circle.addTo(clustersLayerRef.current);
        clusterMarker.addTo(clustersLayerRef.current);
      });

      // 4. Add Evacuation Shelters
      shelters.forEach((sh) => {
        if (sh.lat == null || sh.lng == null) return;
        const shelterHtml = `
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #064e3b; border: 2px solid #34d399; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);">
            <span style="font-size: 12px;">🛡️</span>
          </div>
        `;
        const shelterIcon = L.divIcon({
          className: 'shelter-marker-pin',
          html: shelterHtml,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const marker = L.marker([sh.lat, sh.lng], { icon: shelterIcon });
        const name = language === 'hi' && sh.name_hi ? sh.name_hi : sh.name;
        const popupContent = `
          <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 4px; min-width: 200px;">
            <strong style="font-size: 12px; color: #059669;">🛡️ SAFE HIGH-GROUND HAVEN</strong>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px;">${name}</div>
            <div style="font-size: 10px; color: #475569; margin-top: 4px;">
              Elevation: <strong>${sh.elevation_m}m</strong> • Capacity: <strong>${sh.capacity}</strong><br/>
              Medical Unit: <strong>${sh.medical_support ? '✅ Available' : '❌ None'}</strong><br/>
              Food & Water: <strong>${sh.food_water_stocked ? '✅ Stocked' : '❌ Low'}</strong><br/>
              Contact: <strong>${sh.contact_phone || 'Emergency Control'}</strong>
            </div>
          </div>
        `;
        marker.bindPopup(popupContent);
        marker.addTo(sheltersLayerRef.current);
      });
    };

    updateLayers();
  }, [mapReady, liveDevices, clusters, shelters, language]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 460, borderRadius: 16, overflow: 'hidden' }}>
      {/* Map Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 460 }} />

      {/* Floating Tactical Layer Switcher */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', gap: 8 }}>
        <button
          onClick={handleToggleTile}
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            color: '#38bdf8',
            border: '1px solid #0284c7',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{tileMode === 'dark' ? '🛰️ SATELLITE DARK' : '⛰️ TOPOGRAPHIC GIS'}</span>
        </button>

        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          color: '#e2e8f0',
          border: '1px solid #334155',
          padding: '6px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 700,
          backdropFilter: 'blur(8px)',
        }}>
          📍 {zoneName?.toUpperCase()}
        </div>
      </div>

      {/* Floating Legend */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 10,
        color: '#cbd5e1',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span>Citizen (Safe)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <span>Distress / Unresponsive</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#38bdf8' }} />
          <span>Volunteer</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>🛡️ Safe Haven</span>
        </div>
      </div>
    </div>
  );
}
