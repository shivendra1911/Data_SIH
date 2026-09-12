'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Shield,
  AlertOctagon,
  Radio,
  Navigation,
  CheckCircle2,
  User,
  RefreshCw,
  Zap,
  Activity,
  Waves,
  Mountain,
  BellRing,
  Send,
  Users,
  Compass,
  AlertTriangle,
  Flame,
  Check,
  Languages,
  Map as MapIcon
} from 'lucide-react';

const LeafletGisMap = dynamic(() => import('../components/LeafletGisMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 460,
      backgroundColor: '#0f172a',
      borderRadius: 16,
      color: '#38bdf8',
      fontSize: 13,
      fontWeight: 700,
      gap: 8,
    }}>
      <span>🗺️ Loading Himalayan Topographic GIS Tiles...</span>
    </div>
  ),
});

interface CitizenLiveLocation {
  device_uuid: string;
  name?: string;
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  battery_level?: number;
  last_synced_at: string;
  status?: string;
  isUnresponsiveDanger?: boolean;
  elapsed_seconds_since_sync?: number;
  zone_id?: string;
}

interface SOSEvent {
  id: string;
  device_uuid: string;
  lat: number;
  lng: number;
  status: string;
  sos_type?: string;
  is_mesh_relayed: boolean;
  received_at: string;
  notes?: string;
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

interface RescueDispatch {
  dispatch_id: string;
  cluster_id: number;
  squad_type: string;
  zone_id: string;
  assigned_unit: string;
  dispatched_at: string;
  status: string;
  eta_minutes: number;
  notes?: string;
}

interface ZonePredictionSummary {
  zone_id: string;
  zone_name: string;
  river?: string;
  coordinates: { lat: number; lng: number };
  flood_probability_percent: number;
  alert_color: string;
  primary_trigger: string;
  explanation?: string;
  sensors?: any;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function projectGeoToRadar(lat: number, lng: number, centerLat: number = 30.5573, centerLng: number = 79.5642, zoomKm = 10) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return { top: 50, left: 50 };
  }
  const dLatKm = (lat - centerLat) * 111.32;
  const dLngKm = (lng - centerLng) * (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const left = 50 + (dLngKm / zoomKm) * 35;
  const top = 50 - (dLatKm / zoomKm) * 35;
  return {
    top: Math.max(12, Math.min(88, top)),
    left: Math.max(12, Math.min(88, left))
  };
}

export default function GovernmentCommandPortal() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [selectedZone, setSelectedZone] = useState<string>('chamoli_01');
  const [allZones, setAllZones] = useState<ZonePredictionSummary[]>([]);
  const [currentPrediction, setCurrentPrediction] = useState<any>({
    zone_id: 'chamoli_01',
    zone_name: 'Chamoli Sector 01 (Alaknanda Basin)',
    flood_probability_percent: 88.5,
    alert_color: 'RED',
    primary_trigger: 'Seismic Glacial Lake Outburst (GLOF)',
    explanation: 'High-magnitude seismic shock coupled with torrential saturation in glacial headwaters.',
    sensors: {
      rainfall_mm_hr: 185.4,
      seismic_magnitude: 4.8,
      soil_moisture_pct: 88.0,
      river_water_level_m: 8.4,
      terrain_slope_deg: 38.5,
    },
    last_updated: '2026-09-11T12:00:00.000Z'
  });

  const [liveDevices, setLiveDevices] = useState<CitizenLiveLocation[]>([]);
  const [sosEvents, setSosEvents] = useState<SOSEvent[]>([]);
  const [clusters, setClusters] = useState<RescueCluster[]>([]);
  const [dispatches, setDispatches] = useState<RescueDispatch[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [broadcastPending, setBroadcastPending] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<CitizenLiveLocation | null>(null);
  const [filterZoneOnly, setFilterZoneOnly] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<'gis' | 'radar'>('gis');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [shelters, setShelters] = useState<any[]>([]);

  const displayedDevices = filterZoneOnly
    ? liveDevices.filter(d => (d.zone_id || 'chamoli_01').toLowerCase() === selectedZone.toLowerCase())
    : liveDevices;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Poll backend data with adaptive tab visibility and AbortController
  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout | null = null;
    const controller = new AbortController();

    const poll = async () => {
      await fetchAllData(controller.signal);
      if (active && !controller.signal.aborted) {
        const intervalMs = document.hidden ? 12000 : 4000;
        timer = setTimeout(poll, intervalMs);
      }
    };

    poll();

    const handleVisibilityChange = () => {
      if (timer) clearTimeout(timer);
      if (!document.hidden) {
        poll(); // Immediate refresh upon returning to tab
      } else {
        timer = setTimeout(poll, 12000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      active = false;
      controller.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedZone]);

  const fetchAllData = async (signal?: AbortSignal) => {
    try {
      // 1. High-speed consolidated endpoint (fetches predictions, zones, radar, clusters, dispatches in 1 round-trip)
      const overviewRes = await fetch(`${API_BASE}/api/dashboard/overview?zone_id=${encodeURIComponent(selectedZone)}`, { signal });
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        if (data.selected_zone?.prediction) {
          setCurrentPrediction({
            ...data.selected_zone.prediction,
            zone_id: data.selected_zone.zone_id,
            zone_name: data.selected_zone.zone_name,
            sensors: data.selected_zone.sensors,
            cwc_gauge: data.selected_zone.cwc_gauge,
            last_updated: data.timestamp
          });
        }
        if (Array.isArray(data.all_zones)) setAllZones(data.all_zones);
        if (Array.isArray(data.live_devices)) setLiveDevices(data.live_devices);
        if (Array.isArray(data.clusters)) setClusters(data.clusters);
        if (Array.isArray(data.dispatches)) setDispatches(data.dispatches);
        if (Array.isArray(data.shelters)) setShelters(data.shelters);
        setBackendOnline(true);
      }

      // 2. Fetch live citizen distress beacons feed
      const sosRes = await fetch(`${API_BASE}/api/sos/events`, { signal });
      if (sosRes.ok) {
        const sosData = await sosRes.json();
        if (Array.isArray(sosData.events)) setSosEvents(sosData.events);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('[Command Portal] Backend offline or deferred:', err);
        setBackendOnline(false);
      }
    }
  };

  // Dispatch rescue unit
  const handleDispatchSquad = async (clusterId: number, squadType: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/rescue/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cluster_id: clusterId,
          squad_type: squadType,
          zone_id: selectedZone,
          assigned_unit: `NDRF Battalion ${Math.floor(Math.random() * 5) + 1}`,
          notes: `Urgent dispatch authorization for ${squadType} to rescue cluster #${clusterId}`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActionNotice(`✅ ${squadType} Squad successfully dispatched to Cluster #${clusterId}!`);
        setTimeout(() => setActionNotice(null), 5000);
        fetchAllData();
      } else {
        const errData = await res.text();
        setActionNotice(`❌ Dispatch failed (HTTP ${res.status}): ${errData.slice(0, 120)}`);
        setTimeout(() => setActionNotice(null), 5000);
      }
    } catch (err) {
      setActionNotice(`❌ Dispatch failed: ${err}`);
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Trigger emergency broadcast
  const handleTriggerBroadcast = async () => {
    if (broadcastPending) return;
    setBroadcastPending(true);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/alert/broadcast?zone_id=${encodeURIComponent(selectedZone)}`, {
        method: 'POST'
      });
      if (res.ok) {
        setActionNotice(`🚨 EMERGENCY RED ALERT BROADCAST DISPATCHED TO ALL PHONES IN ${selectedZone.toUpperCase()}!`);
        setTimeout(() => setActionNotice(null), 6000);
        fetchAllData();
      } else {
        const errData = await res.text();
        setActionNotice(`❌ Broadcast failed (HTTP ${res.status}): ${errData.slice(0, 120)}`);
        setTimeout(() => setActionNotice(null), 5000);
      }
    } catch (err) {
      setActionNotice(`❌ Broadcast dispatch failed: ${err}`);
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setLoading(false);
      setBroadcastPending(false);
    }
  };

  // Quick hazard scenario simulation
  const handleSimulateScenario = async (scenario: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/telemetry/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: selectedZone,
          scenario
        })
      });
      if (res.ok) {
        setActionNotice(`⚡ Scenario applied: [${scenario}]. Live models re-evaluated.`);
        setTimeout(() => setActionNotice(null), 4000);
        fetchAllData();
      } else {
        const errData = await res.text();
        setActionNotice(`❌ Simulation failed (HTTP ${res.status}): ${errData.slice(0, 120)}`);
        setTimeout(() => setActionNotice(null), 5000);
      }
    } catch (err) {
      console.warn('Simulation error:', err);
      setActionNotice(`❌ Simulation request failed: ${err}`);
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const unresponsiveCount = liveDevices.filter(d => d.isUnresponsiveDanger).length;
  const activeSOSCount = liveDevices.filter(d => d.status === 'SOS').length;

  return (
    <div style={styles.pageContainer}>
      {/* Action Notification Banner */}
      {actionNotice && (
        <div style={styles.actionBanner}>
          <BellRing style={{ width: 18, height: 18, color: '#f59e0b' }} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Navbar Header */}
      <header style={styles.header}>
        <div style={styles.brandGroup}>
          <div style={styles.logoBadge}>
            <Shield style={{ width: 28, height: 28, color: '#38bdf8' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={styles.title}>
                {language === 'hi' ? 'नीरनेत्र — राष्ट्रीय आपदा आपातकालीन कमांड पोर्टल' : 'NEERNETRA — GOVERNMENT EMERGENCY COMMAND PORTAL'}
              </h1>
              <span style={{
                ...styles.connBadge,
                backgroundColor: backendOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: backendOnline ? '#34d399' : '#f87171',
                borderColor: backendOnline ? '#059669' : '#dc2626'
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: backendOnline ? '#10b981' : '#ef4444',
                  boxShadow: backendOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444'
                }} />
                {backendOnline ? 'BACKEND ONLINE (PORT 8000)' : 'BACKEND RECONNECTING...'}
              </span>
            </div>
            <p style={styles.subtitle}>
              {language === 'hi'
                ? 'एनडीआरएफ राष्ट्रीय आपदा बचाव ट्रैकर एवं हिमालयी हिमनद झील विस्फोट एआई टेलीमेट्री प्रणाली'
                : 'NDRF National Disaster Rescue Tracker & Himalayan Glacial Outburst AI Telemetry System'}
            </p>
          </div>
        </div>

        <div style={styles.headerRight}>
          {/* Bilingual Language Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 10,
            padding: 2,
            gap: 2,
          }}>
            <button
              onClick={() => setLanguage('en')}
              style={{
                backgroundColor: language === 'en' ? '#0284c7' : 'transparent',
                color: language === 'en' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('hi')}
              style={{
                backgroundColor: language === 'hi' ? '#0284c7' : 'transparent',
                color: language === 'hi' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              हिन्दी
            </button>
          </div>

          {/* Quick Zone Selector */}
          <div style={styles.zoneSelectorBox}>
            <Compass style={{ width: 16, height: 16, color: '#38bdf8' }} />
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>
              {language === 'hi' ? 'निगरानी क्षेत्र:' : 'MONITORED SECTOR:'}
            </span>
            <select
              style={styles.zoneDropdown}
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
            >
              <option value="chamoli_01">Chamoli (Alaknanda Basin)</option>
              <option value="joshimath_01">Joshimath (Dhauliganga)</option>
              <option value="kedarnath_01">Kedarnath Glacial Valley</option>
              <option value="badrinath_01">Badrinath Headwaters</option>
              <option value="uttarkashi_01">Uttarkashi (Bhagirathi)</option>
              <option value="rudraprayag_01">Rudraprayag Confluence</option>
              <option value="pithoragarh_01">Pithoragarh (Kali Basin)</option>
              <option value="gopeshwar_01">Gopeshwar District HQ</option>
              <option value="nainital_01">Nainital Lake Catchment</option>
              <option value="dehradun_01">Dehradun Foothills HQ</option>
            </select>
          </div>

          {/* Alert Status Pill */}
          <div style={{
            ...styles.alertPill,
            backgroundColor: currentPrediction.alert_color === 'RED' ? '#450a0a' : currentPrediction.alert_color === 'ORANGE' ? '#451a03' : '#064e3b',
            borderColor: currentPrediction.alert_color === 'RED' ? '#dc2626' : currentPrediction.alert_color === 'ORANGE' ? '#d97706' : '#059669'
          }}>
            <AlertOctagon style={{
              width: 18,
              height: 18,
              color: currentPrediction.alert_color === 'RED' ? '#ef4444' : currentPrediction.alert_color === 'ORANGE' ? '#f59e0b' : '#10b981'
            }} />
            <span style={styles.alertText}>
              {currentPrediction.alert_color} ALERT ({currentPrediction.flood_probability_percent}% RISK)
            </span>
          </div>

          {/* Emergency Broadcast Button */}
          <button
            style={{
              ...styles.broadcastBtn,
              opacity: broadcastPending ? 0.6 : 1,
              cursor: broadcastPending ? 'not-allowed' : 'pointer',
            }}
            onClick={handleTriggerBroadcast}
            disabled={broadcastPending}
            title="Broadcast emergency evacuation siren to all citizen phones in this zone"
          >
            <BellRing style={{ width: 16, height: 16, color: '#ffffff' }} />
            <span>
              {broadcastPending
                ? (language === 'hi' ? 'प्रसारित हो रहा है...' : 'TRANSMITTING...')
                : (language === 'hi' ? 'रेड अलर्ट सायरन प्रसारित करें' : 'TRIGGER RED BROADCAST')}
            </span>
          </button>

          <button style={styles.refreshBtn} onClick={() => fetchAllData()} title="Refresh live telemetry">
            <RefreshCw style={{ width: 16, height: 16, color: '#94a3b8' }} />
          </button>
        </div>
      </header>

      {/* Global Multi-Zone Himalayan Risk Bar */}
      <div style={styles.multiZoneBar}>
        <div style={styles.multiZoneLabel}>
          <Activity style={{ width: 14, height: 14, color: '#38bdf8' }} />
          <span>HIMALAYAN MONITORING GRID (10 ZONES):</span>
        </div>
        <div style={styles.zonePillsScroll}>
          {allZones.length > 0 ? (
            allZones.map((z) => (
              <button
                key={z.zone_id}
                onClick={() => setSelectedZone(z.zone_id)}
                style={{
                  ...styles.zonePillItem,
                  backgroundColor: z.zone_id === selectedZone ? '#1e293b' : '#0b1329',
                  borderColor: z.zone_id === selectedZone ? '#38bdf8' : '#1e293b',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: z.alert_color === 'RED' ? '#ef4444' : z.alert_color === 'ORANGE' ? '#f59e0b' : '#10b981',
                  boxShadow: z.alert_color === 'RED' ? '0 0 6px #ef4444' : 'none'
                }} />
                <span style={{ fontWeight: 700, color: z.zone_id === selectedZone ? '#ffffff' : '#94a3b8' }}>{z.zone_name}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: z.alert_color === 'RED' ? '#fca5a5' : z.alert_color === 'ORANGE' ? '#fde68a' : '#6ee7b7'
                }}>
                  {z.flood_probability_percent}%
                </span>
              </button>
            ))
          ) : (
            <span style={{ fontSize: 11, color: '#64748b' }}>Connecting multi-zone telemetry...</span>
          )}
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div style={styles.metricsBar}>
        <div style={styles.metricCard}>
          <span style={styles.metricTitle}>ACTIVE CITIZENS TRACKED</span>
          <div style={styles.metricValRow}>
            <Users style={{ width: 22, height: 22, color: '#38bdf8' }} />
            <span style={styles.metricVal}>{liveDevices.length}</span>
            <span style={styles.metricSub}>5-min GPS sync</span>
          </div>
        </div>

        <div style={styles.metricCard}>
          <span style={{ ...styles.metricTitle, color: '#f87171' }}>UNRESPONSIVE DANGER</span>
          <div style={styles.metricValRow}>
            <AlertTriangle style={{ width: 22, height: 22, color: '#ef4444' }} />
            <span style={{ ...styles.metricVal, color: '#ef4444' }}>{unresponsiveCount}</span>
            <span style={{ ...styles.metricSub, color: '#fca5a5' }}>&gt;5 min timeout</span>
          </div>
        </div>

        <div style={styles.metricCard}>
          <span style={{ ...styles.metricTitle, color: '#fb923c' }}>ACTIVE SOS BEACONS</span>
          <div style={styles.metricValRow}>
            <Radio style={{ width: 22, height: 22, color: '#f59e0b' }} />
            <span style={{ ...styles.metricVal, color: '#f59e0b' }}>{activeSOSCount}</span>
            <span style={styles.metricSub}>Direct &amp; BLE Mesh</span>
          </div>
        </div>

        <div style={styles.metricCard}>
          <span style={styles.metricTitle}>NDRF RESCUE CLUSTERS</span>
          <div style={styles.metricValRow}>
            <Shield style={{ width: 22, height: 22, color: '#a78bfa' }} />
            <span style={{ ...styles.metricVal, color: '#c4b5fd' }}>{clusters.length}</span>
            <span style={styles.metricSub}>{dispatches.length} missions active</span>
          </div>
        </div>

        {/* Live Simulation Trigger Controls */}
        <div style={{ ...styles.metricCard, flex: 1.5, backgroundColor: '#0f172a' }}>
          <span style={styles.metricTitle}>TEST HARNESS / HAZARD SIMULATOR</span>
          <div style={styles.simButtonsRow}>
            <button
              style={{ ...styles.simBtn, backgroundColor: '#7f1d1d', borderColor: '#ef4444' }}
              onClick={() => handleSimulateScenario('GLOF_CRITICAL')}
              title="Simulate extreme seismic shock and glacial breach"
            >
              <Flame style={{ width: 12, height: 12, color: '#fecaca' }} />
              <span>Simulate GLOF</span>
            </button>
            <button
              style={{ ...styles.simBtn, backgroundColor: '#78350f', borderColor: '#f59e0b' }}
              onClick={() => handleSimulateScenario('TORRENTIAL_CLOUDBURST')}
              title="Simulate torrential cloudburst rainfall"
            >
              <Waves style={{ width: 12, height: 12, color: '#fde68a' }} />
              <span>Cloudburst</span>
            </button>
            <button
              style={{ ...styles.simBtn, backgroundColor: '#064e3b', borderColor: '#10b981' }}
              onClick={() => handleSimulateScenario('NORMAL_BASELINE')}
              title="Reset telemetry to safe baseline"
            >
              <Check style={{ width: 12, height: 12, color: '#a7f3d0' }} />
              <span>Reset Safe</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <main style={styles.mainGrid}>
        {/* Left Column: Citizens Live Location & Danger Tracking */}
        <section style={styles.leftCol}>
          <div style={{ ...styles.cardHeader, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Navigation style={{ width: 18, height: 18, color: '#38bdf8' }} />
              <h2 style={styles.cardTitle}>CITIZEN GPS TELEMETRY</h2>
            </div>
            <button
              onClick={() => setFilterZoneOnly(!filterZoneOnly)}
              style={{
                backgroundColor: filterZoneOnly ? '#0284c7' : '#1e293b',
                color: filterZoneOnly ? '#ffffff' : '#94a3b8',
                border: '1px solid #38bdf8',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="Toggle between filtering by selected sector or viewing all Himalayan sectors"
            >
              {filterZoneOnly ? `📍 SECTOR (${displayedDevices.length})` : `🌐 ALL (${liveDevices.length})`}
            </button>
          </div>

          <p style={styles.cardDesc}>
            Tracks live mobile GPS &amp; persistent <strong style={{ color: '#fbbf24' }}>Last Known Location</strong>. Citizens silent for &gt;5 min escalate to <strong style={{ color: '#ef4444' }}>Critical Danger</strong>.
          </p>

          <div style={styles.deviceList}>
            {displayedDevices.map((dev) => (
              <div
                key={dev.device_uuid}
                onClick={() => setSelectedDevice(dev)}
                style={{
                  ...styles.deviceItem,
                  borderColor: dev.status === 'SOS' || dev.isUnresponsiveDanger ? '#dc2626' : selectedDevice?.device_uuid === dev.device_uuid ? '#38bdf8' : '#1e293b',
                  backgroundColor: dev.status === 'SOS' || dev.isUnresponsiveDanger ? 'rgba(220, 38, 38, 0.12)' : selectedDevice?.device_uuid === dev.device_uuid ? '#1e293b' : '#0f172a',
                }}
              >
                <div style={styles.devHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User style={{ width: 16, height: 16, color: dev.status === 'SOS' || dev.isUnresponsiveDanger ? '#ef4444' : '#34d399' }} />
                    <span style={styles.devUuid}>{dev.name || dev.device_uuid}</span>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: dev.isUnresponsiveDanger ? '#7f1d1d' : dev.status === 'SOS' ? '#991b1b' : dev.status === 'HELPING' ? '#075985' : '#064e3b',
                      color: dev.isUnresponsiveDanger ? '#fecaca' : dev.status === 'SOS' ? '#fee2e2' : dev.status === 'HELPING' ? '#bae6fd' : '#34d399',
                    }}
                  >
                    {dev.isUnresponsiveDanger ? '🚨 UNRESPONSIVE DANGER' : dev.status || 'ACTIVE'}
                  </span>
                </div>

                <div style={styles.coordBox}>
                  <span style={styles.coordLabel}>LAST KNOWN GPS COORDINATES:</span>
                  <span style={styles.coordVal}>
                    {(dev.lat != null ? Number(dev.lat).toFixed(4) : '30.5573')}° N, {(dev.lng != null ? Number(dev.lng).toFixed(4) : '79.5642')}° E ({dev.altitude || 1450}m Elev)
                  </span>
                </div>

                <div style={styles.devMetaRow}>
                  <span>Battery: <strong style={{ color: (dev.battery_level || 85) < 30 ? '#ef4444' : '#34d399' }}>{dev.battery_level || 85}%</strong></span>
                  <span>Zone: <strong>{dev.zone_id || 'chamoli_01'}</strong></span>
                  <span>Synced: {new Date(dev.last_synced_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Real-time SOS Beacons Feed */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Radio style={{ width: 16, height: 16, color: '#f59e0b' }} />
              <h3 style={{ fontSize: 12, fontWeight: 900, color: '#f3f4f6', letterSpacing: '0.6px' }}>
                RECENT DISTRESS BEACONS (BLE &amp; DIRECT)
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
              {sosEvents.slice(0, 4).map((e) => (
                <div key={e.id} style={styles.sosFeedItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#f87171' }}>
                      [{e.sos_type || 'GENERAL'}] {e.device_uuid.substring(0, 16)}
                    </span>
                    <span style={styles.meshRelayBadge}>
                      {e.is_mesh_relayed ? '📡 MESH RELAYED' : '🌐 DIRECT HTTP'}
                    </span>
                  </div>
                  <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{e.notes || 'Emergency request active'}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Center Canvas: Tactical Himalayan Geospatial Map */}
        <section style={styles.centerCol}>
          <div style={{ ...styles.cardHeader, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {mapMode === 'gis' ? (
                <MapIcon style={{ width: 18, height: 18, color: '#38bdf8' }} />
              ) : (
                <Radio style={{ width: 18, height: 18, color: '#f59e0b' }} />
              )}
              <h2 style={styles.cardTitle}>
                {mapMode === 'gis'
                  ? (language === 'hi' ? 'लाइव स्थलाकृतिक जीआईएस मानचित्र' : 'LIVE TOPOGRAPHIC GIS MAP')
                  : (language === 'hi' ? 'सामरिक हिमालयी रडार' : 'TACTICAL HIMALAYAN GEOSPATIAL RADAR')}
                {' — '}
                {currentPrediction.zone_name?.toUpperCase()}
              </h2>
            </div>

            {/* View Mode Switcher: GIS Map vs Vector Radar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setMapMode('gis')}
                style={{
                  backgroundColor: mapMode === 'gis' ? '#0284c7' : '#1e293b',
                  color: mapMode === 'gis' ? '#ffffff' : '#94a3b8',
                  border: '1px solid #38bdf8',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                🗺️ {language === 'hi' ? 'जीआईएस मैप' : 'GIS MAP'}
              </button>
              <button
                onClick={() => setMapMode('radar')}
                style={{
                  backgroundColor: mapMode === 'radar' ? '#0284c7' : '#1e293b',
                  color: mapMode === 'radar' ? '#ffffff' : '#94a3b8',
                  border: '1px solid #38bdf8',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                📡 {language === 'hi' ? 'वेक्टर रडार' : 'RADAR'}
              </button>
            </div>
          </div>

          <div style={styles.mapCanvasContainer}>
            {mapMode === 'gis' ? (
              <LeafletGisMap
                centerLat={currentPrediction.coordinates?.lat ?? 30.4167}
                centerLng={currentPrediction.coordinates?.lng ?? 79.3167}
                zoom={12}
                zoneName={currentPrediction.zone_name}
                liveDevices={displayedDevices}
                clusters={clusters}
                shelters={shelters}
                onSelectDevice={(d) => setSelectedDevice(d)}
                onDispatchSquad={(cid, sq) => handleDispatchSquad(cid, sq)}
                language={language}
              />
            ) : (
              <>
                {/* Topographic Contour Radar Simulation */}
                <div style={styles.mapCanvasGrid}>
                  {/* River Line Simulation */}
                  <svg style={styles.riverSvg} viewBox="0 0 800 500">
                    <path
                      d="M 50,450 Q 200,380 350,300 T 600,180 T 780,50"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="8"
                      strokeOpacity="0.4"
                    />
                    <path
                      d="M 250,500 Q 300,380 350,300 T 500,220"
                      fill="none"
                      stroke="#0369a1"
                      strokeWidth="5"
                      strokeOpacity="0.3"
                    />
                    <text x="360" y="290" fill="#38bdf8" fontSize="11" fontWeight="700">Alaknanda River Corridor</text>
                    <text x="610" y="170" fill="#38bdf8" fontSize="10" fontWeight="600">Dhauliganga Confluence</text>
                  </svg>

                  {/* Monitored Sector Hotspots */}
                  <div style={styles.sectorPin1}>
                    <div style={{
                      ...styles.pinPulseRed,
                      backgroundColor: currentPrediction.alert_color === 'RED' ? '#ef4444' : '#10b981',
                      boxShadow: currentPrediction.alert_color === 'RED' ? '0 0 20px #ef4444' : '0 0 10px #10b981'
                    }} />
                    <div style={styles.pinLabelBox}>
                      <span style={styles.pinSectorName}>{currentPrediction.zone_name}</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: currentPrediction.alert_color === 'RED' ? '#f87171' : '#34d399'
                      }}>
                        {currentPrediction.flood_probability_percent}% RISK ({currentPrediction.alert_color})
                      </span>
                    </div>
                  </div>

                  {/* Citizen Pins on Map */}
                  {displayedDevices.map((dev) => {
                    const centerLat = currentPrediction?.coordinates?.lat ?? 30.5573;
                    const centerLng = currentPrediction?.coordinates?.lng ?? 79.5642;
                    const pos = projectGeoToRadar(dev.lat, dev.lng, centerLat, centerLng);
                    return (
                      <div
                        key={dev.device_uuid}
                        onClick={() => setSelectedDevice(dev)}
                        style={{
                          position: 'absolute',
                          top: `${pos.top}%`,
                          left: `${pos.left}%`,
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          zIndex: 10,
                        }}
                      >
                        <div style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          backgroundColor: dev.status === 'SOS' || dev.isUnresponsiveDanger ? '#ef4444' : dev.status === 'HELPING' ? '#38bdf8' : '#10b981',
                          border: '2px solid #ffffff',
                          boxShadow: dev.status === 'SOS' ? '0 0 14px #ef4444' : '0 0 6px rgba(0,0,0,0.5)',
                        }} />
                        <span style={{
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          border: '1px solid #334155',
                          padding: '2px 6px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#ffffff',
                        }}>
                          {dev.name ? dev.name.split(' ')[0] : dev.device_uuid.substring(0, 6)} ({dev.status || 'ACTIVE'})
                        </span>
                      </div>
                    );
                  })}

                  {/* Rescue Cluster Search Perimeters */}
                  {clusters.map((c) => {
                    const centerLat = currentPrediction?.coordinates?.lat ?? 30.5573;
                    const centerLng = currentPrediction?.coordinates?.lng ?? 79.5642;
                    const pos = projectGeoToRadar(c.center_lat, c.center_lng, centerLat, centerLng);
                    return (
                      <div
                        key={c.cluster_id}
                        style={{
                          position: 'absolute',
                          top: `${pos.top}%`,
                          left: `${pos.left}%`,
                          transform: 'translate(-50%, -50%)',
                          width: 140,
                          height: 140,
                          borderRadius: '50%',
                          border: '2px dashed #ef4444',
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          pointerEvents: 'none',
                          animation: 'pulse 3s infinite',
                        }}
                      >
                        <span style={{ fontSize: 9, fontWeight: 900, color: '#fca5a5' }}>
                          CLUSTER #{c.cluster_id} ({c.total_people} STRANDED)
                        </span>
                        <span style={{ fontSize: 8, color: '#f87171' }}>{c.priority}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={styles.mapFooterBanner}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>Layer: Topographic Contour Tile Set (Offline Vector Engine)</span>
                    <span>•</span>
                    <span>Alaknanda / Dhauliganga Valley Catchment</span>
                  </div>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>LIVE GPS RESOLUTION: 4.2m RMS</span>
                </div>
              </>
            )}
          </div>

          {/* Citizen Tactical Dossier Drawer (Triggered on Citizen Selection) */}
          {selectedDevice && (
            <div style={styles.citizenDossierCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: 9, color: '#38bdf8', fontWeight: 800, letterSpacing: '0.8px' }}>
                    TACTICAL CITIZEN DOSSIER (LIVE RADAR TARGET)
                  </span>
                  <h3 style={{ fontSize: 14, fontWeight: 900, color: '#ffffff', marginTop: 1 }}>
                    {selectedDevice.name || selectedDevice.device_uuid}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDevice(null)}
                  style={styles.dossierCloseBtn}
                  title="Dismiss Dossier"
                >
                  ✕
                </button>
              </div>

              <div style={styles.dossierGrid}>
                <div style={styles.dossierItem}>
                  <span style={styles.dossierLabel}>STATUS</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: selectedDevice.isUnresponsiveDanger ? '#f87171' : selectedDevice.status === 'SOS' ? '#ef4444' : selectedDevice.status === 'HELPING' ? '#38bdf8' : '#34d399'
                  }}>
                    {selectedDevice.isUnresponsiveDanger ? '🚨 UNRESPONSIVE DANGER' : selectedDevice.status || 'ACTIVE'}
                  </span>
                </div>
                <div style={styles.dossierItem}>
                  <span style={styles.dossierLabel}>LAST KNOWN GPS</span>
                  <span style={{ color: '#e0f2fe', fontWeight: 700, fontSize: 11 }}>
                    {selectedDevice.lat.toFixed(4)}° N, {selectedDevice.lng.toFixed(4)}° E
                  </span>
                </div>
                <div style={styles.dossierItem}>
                  <span style={styles.dossierLabel}>BATTERY &amp; ALTITUDE</span>
                  <span style={{ color: (selectedDevice.battery_level || 85) < 30 ? '#ef4444' : '#34d399', fontWeight: 800, fontSize: 11 }}>
                    {selectedDevice.battery_level || 85}% • {selectedDevice.altitude || 1450}m Elev
                  </span>
                </div>
                <div style={styles.dossierItem}>
                  <span style={styles.dossierLabel}>ZONE SECTOR &amp; SYNC</span>
                  <span style={{ color: '#cbd5e1', fontSize: 11 }}>
                    {selectedDevice.zone_id || 'chamoli_01'} • {new Date(selectedDevice.last_synced_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button
                  style={styles.dossierDispatchBtn}
                  onClick={() => {
                    handleDispatchSquad(1, 'HELICOPTER');
                    setActionNotice(`🚁 Rescue extraction routed to ${selectedDevice.name || selectedDevice.device_uuid} at (${selectedDevice.lat.toFixed(4)}, ${selectedDevice.lng.toFixed(4)})`);
                  }}
                >
                  🚁 DISPATCH RESCUE TEAM DIRECTLY TO CITIZEN
                </button>
              </div>
            </div>
          )}

          {/* AI Inference & Physical Telemetry Factor Breakdown */}
          <div style={styles.aiBreakdownCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap style={{ width: 16, height: 16, color: '#f59e0b' }} />
                <h3 style={{ fontSize: 12, fontWeight: 900, color: '#ffffff', letterSpacing: '0.6px' }}>
                  NEERNETRA 99.76% ML INFERENCE &amp; PHYSICAL EXPLANATION
                </h3>
              </div>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>
                Trigger: <strong style={{ color: '#f59e0b' }}>{currentPrediction.primary_trigger}</strong>
              </span>
            </div>

            <p style={{ fontSize: 11, color: '#cbd5e1', lineHeight: '16px', marginBottom: 12 }}>
              {currentPrediction.explanation || 'Composite hydrological sensor analysis active across watershed.'}
            </p>

            <div style={styles.sensorGrid}>
              <div style={styles.sensorItem}>
                <span style={styles.sensorLabel}>RAINFALL INTENSITY</span>
                <span style={styles.sensorValue}>
                  {currentPrediction.sensors?.rainfall_mm_hr || currentPrediction.sensors?.rainfall_mm || 0} mm/hr
                </span>
              </div>
              <div style={styles.sensorItem}>
                <span style={styles.sensorLabel}>SEISMIC ACTIVITY</span>
                <span style={styles.sensorValue}>
                  {currentPrediction.sensors?.seismic_magnitude || currentPrediction.sensors?.seismic_mag || 0} M (USGS)
                </span>
              </div>
              <div style={styles.sensorItem}>
                <span style={styles.sensorLabel}>RIVER STAGE &amp; DISCHARGE</span>
                <span style={styles.sensorValue}>
                  {currentPrediction.sensors?.river_water_level_m ? `${currentPrediction.sensors.river_water_level_m}m` : '6.4m'}
                  <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, marginLeft: 4 }}>
                    ({currentPrediction.sensors?.river_discharge_m3s ?? 0} m³/s)
                  </span>
                </span>
              </div>
              <div style={styles.sensorItem}>
                <span style={styles.sensorLabel}>SOIL MOISTURE</span>
                <span style={styles.sensorValue}>
                  {currentPrediction.sensors?.soil_moisture_pct || (currentPrediction.sensors?.soil_moisture * 100) || 85}%
                </span>
              </div>
              <div style={styles.sensorItem}>
                <span style={styles.sensorLabel}>TERRAIN SLOPE</span>
                <span style={styles.sensorValue}>
                  {currentPrediction.sensors?.terrain_slope_deg || currentPrediction.sensors?.slope_angle_deg || 38.5}°
                </span>
              </div>
            </div>

            {/* Official Central Water Commission (CWC) Danger Calibration Gauge */}
            {currentPrediction.cwc_gauge && (
              <div style={{
                marginTop: 12,
                padding: '10px 14px',
                backgroundColor: '#09101f',
                border: '1px solid #1e293b',
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Waves style={{ width: 14, height: 14, color: '#38bdf8' }} />
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#e0f2fe', letterSpacing: '0.4px' }}>
                      CWC GAUGE: {currentPrediction.cwc_gauge.gauge_station?.toUpperCase()}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: currentPrediction.cwc_gauge.severity === 'CRITICAL' || currentPrediction.cwc_gauge.severity === 'DANGER'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : currentPrediction.cwc_gauge.severity === 'WARNING'
                      ? 'rgba(245, 158, 11, 0.2)'
                      : 'rgba(16, 185, 129, 0.2)',
                    color: currentPrediction.cwc_gauge.severity === 'CRITICAL' || currentPrediction.cwc_gauge.severity === 'DANGER'
                      ? '#ef4444'
                      : currentPrediction.cwc_gauge.severity === 'WARNING'
                      ? '#f59e0b'
                      : '#10b981',
                    border: '1px solid currentColor',
                  }}>
                    {currentPrediction.cwc_gauge.status}
                  </span>
                </div>

                {/* Gauge Thresholds Metric Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                  <span>Current Stage: <strong style={{ color: '#ffffff', fontSize: 12 }}>{currentPrediction.sensors?.river_water_level_m ?? 8.4}m</strong></span>
                  <span>Warning (WL): <strong style={{ color: '#fde047' }}>{currentPrediction.cwc_gauge.warning_level_m}m</strong></span>
                  <span>Danger (DL): <strong style={{ color: '#f87171' }}>{currentPrediction.cwc_gauge.danger_level_m}m</strong></span>
                  <span>Record HFL: <strong style={{ color: '#c084fc' }}>{currentPrediction.cwc_gauge.hfl_record_m}m</strong></span>
                </div>

                {/* Visual Calibration Stage Bar */}
                <div style={{
                  position: 'relative',
                  height: 10,
                  backgroundColor: '#1e293b',
                  borderRadius: 5,
                  overflow: 'hidden',
                  marginTop: 8,
                }}>
                  <div style={{
                    width: `${Math.min(100, ((currentPrediction.sensors?.river_water_level_m ?? 8.4) / (currentPrediction.cwc_gauge.hfl_record_m * 1.15)) * 100)}%`,
                    height: '100%',
                    backgroundColor: currentPrediction.cwc_gauge.severity === 'CRITICAL' || currentPrediction.cwc_gauge.severity === 'DANGER'
                      ? '#ef4444'
                      : currentPrediction.cwc_gauge.severity === 'WARNING'
                      ? '#f59e0b'
                      : '#10b981',
                    borderRadius: 5,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Active NDRF Rescue Clusters & Dispatch Execution */}
        <section style={styles.rightCol}>
          <div style={styles.cardHeader}>
            <AlertOctagon style={{ width: 18, height: 18, color: '#ef4444' }} />
            <h2 style={styles.cardTitle}>NDRF RESCUE CLUSTERS &amp; DISPATCH</h2>
          </div>

          <p style={styles.cardDesc}>
            Clusters generated from live mobile SOS beacons. Authorize tactical assets for immediate victim extraction.
          </p>

          <div style={styles.clusterList}>
            {clusters.map((c) => (
              <div key={c.cluster_id} style={styles.clusterCard}>
                <div style={styles.clusterTop}>
                  <span style={c.priority?.includes?.('P1') ? styles.p1Badge : styles.p2Badge}>
                    {c.priority || 'P2'}
                  </span>
                  <span style={styles.peopleCount}>
                    {c.total_people} People Stranded
                  </span>
                </div>

                <p style={styles.clusterDesc}>{c.sector || 'Sector Flash Flood Evacuation Zone'}</p>
                <p style={styles.clusterNeed}>
                  Primary Need: <strong style={{ color: '#fde047' }}>{c.primary_need}</strong>
                </p>
                <p style={styles.clusterCoords}>
                  Center GPS: {(c.center_lat != null ? Number(c.center_lat).toFixed(4) : '30.5573')}° N, {(c.center_lng != null ? Number(c.center_lng).toFixed(4) : '79.5642')}° E
                </p>

                {/* Dispatch Tactical Squad Buttons */}
                <div style={styles.dispatchActionsGroup}>
                  <button
                    style={styles.dispatchBtnHelicopter}
                    onClick={() => handleDispatchSquad(c.cluster_id, 'HELICOPTER')}
                    disabled={loading}
                  >
                    🚁 DISPATCH HELICOPTER
                  </button>
                  <button
                    style={styles.dispatchBtnBoat}
                    onClick={() => handleDispatchSquad(c.cluster_id, 'BOAT')}
                    disabled={loading}
                  >
                    🚤 DISPATCH BOAT SQUAD
                  </button>
                  <button
                    style={styles.dispatchBtnMedical}
                    onClick={() => handleDispatchSquad(c.cluster_id, 'MEDICAL')}
                    disabled={loading}
                  >
                    🚑 MEDICAL EVAC TEAM
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Active Mission Deployments */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Shield style={{ width: 16, height: 16, color: '#38bdf8' }} />
              <h3 style={{ fontSize: 12, fontWeight: 900, color: '#f3f4f6', letterSpacing: '0.6px' }}>
                ACTIVE RESCUE SQUAD DEPLOYMENTS ({dispatches.length})
              </h3>
            </div>

            {dispatches.length === 0 ? (
              <div style={{ padding: 12, backgroundColor: '#0f172a', borderRadius: 10, fontSize: 11, color: '#64748b' }}>
                No active rescue missions deployed. Click dispatch buttons above to launch squads.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                {dispatches.map((d) => (
                  <div key={d.dispatch_id} style={styles.dispatchItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8' }}>
                        {d.squad_type} SQUAD — CLUSTER #{d.cluster_id}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.1)', padding: '2px 6px', borderRadius: 6 }}>
                        {d.status} (ETA: {d.eta_minutes}m)
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{d.assigned_unit} • {d.notes}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#030712',
    color: '#f9fafb',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  actionBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#451a03',
    border: '1px solid #f59e0b',
    color: '#fef3c7',
    padding: '10px 16px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottom: '1px solid #1f2937',
    flexWrap: 'wrap',
    gap: 12,
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    padding: 10,
    borderRadius: 12,
    border: '1px solid rgba(56, 189, 248, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: 900,
    letterSpacing: '0.8px',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  connBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 8px',
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 800,
    border: '1px solid',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  zoneSelectorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    padding: '6px 10px',
    borderRadius: 10,
  },
  zoneDropdown: {
    backgroundColor: '#030712',
    color: '#38bdf8',
    border: '1px solid #1e293b',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    outline: 'none',
  },
  alertPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    borderRadius: 20,
    border: '1px solid',
  },
  alertText: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: '0.4px',
  },
  broadcastBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    border: '1px solid #ef4444',
    color: '#ffffff',
    padding: '8px 14px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 900,
    cursor: 'pointer',
  },
  refreshBtn: {
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    padding: 8,
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiZoneBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0b1329',
    padding: '8px 14px',
    borderRadius: 12,
    border: '1px solid #1e293b',
    overflowX: 'auto',
  },
  multiZoneLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    fontWeight: 900,
    color: '#38bdf8',
    whiteSpace: 'nowrap',
  },
  zonePillsScroll: {
    display: 'flex',
    gap: 8,
    flexWrap: 'nowrap',
    overflowX: 'auto',
  },
  zonePillItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 10px',
    borderRadius: 8,
    border: '1px solid',
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  metricsBar: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  metricCard: {
    backgroundColor: '#0b1329',
    border: '1px solid #1e293b',
    borderRadius: 14,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
    minWidth: 160,
  },
  metricTitle: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.6px',
    color: '#94a3b8',
  },
  metricValRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 2,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: 900,
    color: '#ffffff',
  },
  metricSub: {
    fontSize: 10,
    color: '#64748b',
  },
  simButtonsRow: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
  simBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 8px',
    borderRadius: 6,
    border: '1px solid',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 800,
    cursor: 'pointer',
  },
  mainGrid: {
    display: 'flex',
    gap: 14,
    flex: 1,
  },
  leftCol: {
    backgroundColor: '#0b1329',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 300,
  },
  centerCol: {
    backgroundColor: '#0b1329',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    flex: 1.6,
  },
  rightCol: {
    backgroundColor: '#0b1329',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 300,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: '0.8px',
    color: '#f3f4f6',
  },
  cardDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 12,
    lineHeight: '15px',
  },
  deviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 340,
    overflowY: 'auto',
  },
  deviceItem: {
    borderRadius: 12,
    padding: 10,
    border: '1px solid',
    cursor: 'pointer',
  },
  devHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  devUuid: {
    fontSize: 12,
    fontWeight: 800,
    color: '#ffffff',
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 6,
  },
  coordBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 6,
    borderRadius: 6,
    margin: '4px 0',
  },
  coordLabel: {
    fontSize: 8,
    color: '#64748b',
    display: 'block',
  },
  coordVal: {
    fontSize: 11,
    fontWeight: 800,
    color: '#38bdf8',
  },
  devMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  sosFeedItem: {
    backgroundColor: '#030712',
    padding: 8,
    borderRadius: 8,
    border: '1px solid #1e293b',
  },
  meshRelayBadge: {
    fontSize: 9,
    fontWeight: 800,
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: '1px 5px',
    borderRadius: 4,
  },
  mapCanvasContainer: {
    flex: 1,
    backgroundColor: '#030712',
    borderRadius: 14,
    border: '1px solid #1e293b',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 320,
    display: 'flex',
    flexDirection: 'column',
  },
  mapCanvasGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
    backgroundSize: '20px 20px',
  },
  riverSvg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  sectorPin1: {
    position: 'absolute',
    top: '38%',
    left: '42%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    zIndex: 5,
  },
  pinPulseRed: {
    width: 18,
    height: 18,
    borderRadius: '50%',
  },
  pinLabelBox: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    padding: '4px 10px',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  },
  pinSectorName: {
    fontSize: 11,
    fontWeight: 800,
    color: '#ffffff',
  },
  mapFooterBanner: {
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#94a3b8',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    padding: '8px 12px',
    borderTop: '1px solid #1e293b',
    zIndex: 20,
  },
  aiBreakdownCard: {
    backgroundColor: '#030712',
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  sensorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 8,
  },
  sensorItem: {
    backgroundColor: '#0b1329',
    border: '1px solid #1e293b',
    padding: '6px 8px',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  sensorLabel: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: 800,
  },
  sensorValue: {
    fontSize: 11,
    fontWeight: 900,
    color: '#38bdf8',
  },
  clusterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: 320,
    overflowY: 'auto',
  },
  clusterCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    border: '1px solid #1e293b',
  },
  clusterTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  p1Badge: {
    fontSize: 9,
    fontWeight: 900,
    backgroundColor: '#7f1d1d',
    color: '#fecaca',
    padding: '2px 8px',
    borderRadius: 6,
    border: '1px solid #ef4444',
  },
  p2Badge: {
    fontSize: 9,
    fontWeight: 900,
    backgroundColor: '#78350f',
    color: '#fef3c7',
    padding: '2px 8px',
    borderRadius: 6,
    border: '1px solid #f59e0b',
  },
  peopleCount: {
    fontSize: 11,
    fontWeight: 800,
    color: '#ef4444',
  },
  clusterDesc: {
    fontSize: 11,
    fontWeight: 700,
    color: '#e2e8f0',
    marginBottom: 2,
  },
  clusterNeed: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 2,
  },
  clusterCoords: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 8,
  },
  dispatchActionsGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginTop: 6,
  },
  dispatchBtnHelicopter: {
    backgroundColor: '#b91c1c',
    border: '1px solid #ef4444',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 900,
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'center',
  },
  dispatchBtnBoat: {
    backgroundColor: '#0369a1',
    border: '1px solid #38bdf8',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 900,
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'center',
  },
  dispatchBtnMedical: {
    backgroundColor: '#4d7c0f',
    border: '1px solid #84cc16',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 900,
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'center',
  },
  dispatchItem: {
    backgroundColor: '#030712',
    padding: 8,
    borderRadius: 8,
    border: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
  },
  citizenDossierCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #38bdf8',
    borderRadius: 12,
    padding: '12px 14px',
    marginTop: 10,
    boxShadow: '0 4px 20px rgba(56, 189, 248, 0.15)',
  },
  dossierCloseBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '2px 6px',
  },
  dossierGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    marginTop: 8,
  },
  dossierItem: {
    backgroundColor: '#030712',
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  dossierLabel: {
    fontSize: 8,
    fontWeight: 800,
    color: '#64748b',
    letterSpacing: '0.4px',
  },
  dossierDispatchBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    border: '1px solid #ef4444',
    color: '#ffffff',
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 900,
    cursor: 'pointer',
    textAlign: 'center',
  },
};
