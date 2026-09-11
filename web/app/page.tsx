'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertOctagon, Radio, Navigation, CheckCircle2, User, PhoneCall, RefreshCw } from 'lucide-react';

interface CitizenLiveLocation {
  device_uuid: string;
  lat: number;
  lng: number;
  altitude?: number;
  battery_level?: number;
  last_synced_at: string;
  status?: string;
  isUnresponsiveDanger?: boolean;
}

export default function GovernmentCommandPortal() {
  const [liveDevices, setLiveDevices] = useState<CitizenLiveLocation[]>([
    {
      device_uuid: 'dev_priyanshu_phone',
      lat: 30.5573,
      lng: 79.5642,
      altitude: 1450,
      battery_level: 88,
      last_synced_at: new Date().toISOString(),
      status: 'SOS',
      isUnresponsiveDanger: true, // UNRESPONSIVE AFTER 5 MIN TIMEOUT!
    },
    {
      device_uuid: 'dev_ramesh_kumar',
      lat: 30.5585,
      lng: 79.5652,
      altitude: 1480,
      battery_level: 64,
      last_synced_at: new Date(Date.now() - 3 * 60000).toISOString(),
      status: 'SAFE',
      isUnresponsiveDanger: false,
    },
    {
      device_uuid: 'dev_katy_fuller',
      lat: 30.5560,
      lng: 79.5630,
      altitude: 1410,
      battery_level: 42,
      last_synced_at: new Date(Date.now() - 4 * 60000).toISOString(),
      status: 'HELPING',
      isUnresponsiveDanger: false,
    },
  ]);

  const [prediction, setPrediction] = useState<any>({
    zone_id: 'chamoli_01',
    flood_probability_percent: 85.5,
    alert_color: 'RED',
    primary_trigger: 'GLOF Glacial Outburst & Cloudburst',
  });

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchBackendData();
    const interval = setInterval(fetchBackendData, 10000); // refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchBackendData = async () => {
    setLoading(true);
    try {
      // Fetch live predictions
      const predRes = await fetch('http://localhost:8000/api/prediction/current?zone_id=chamoli_01');
      if (predRes.ok) {
        const predData = await predRes.json();
        setPrediction(predData);
      }

      // Fetch 5-minute live citizen locations
      const locRes = await fetch('http://localhost:8000/api/location/live');
      if (locRes.ok) {
        const locData = await locRes.json();
        if (locData.devices && locData.devices.length > 0) {
          setLiveDevices(locData.devices);
        }
      }
    } catch (e) {
      console.warn('Backend fetch deferred:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Top Navbar Header */}
      <header style={styles.header}>
        <div style={styles.brandGroup}>
          <Shield style={{ width: 28, height: 28, color: '#38bdf8' }} />
          <div>
            <h1 style={styles.title}>NEERNETRA — GOVERNMENT EMERGENCY COMMAND PORTAL</h1>
            <p style={styles.subtitle}>NDRF National Disaster Rescue Tracker & GLOF Telemetry Engine</p>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.alertPill}>
            <AlertOctagon style={{ width: 18, height: 18, color: '#ef4444' }} />
            <span style={styles.alertText}>
              {prediction.alert_color} ALERT ({prediction.flood_probability_percent}% RISK)
            </span>
          </div>
          <button style={styles.refreshBtn} onClick={fetchBackendData}>
            <RefreshCw style={{ width: 16, height: 16, color: '#94a3b8' }} />
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main style={styles.mainGrid}>
        {/* Left Column: Citizens Live Location & Danger Tracking */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <Navigation style={{ width: 20, height: 20, color: '#38bdf8' }} />
            <h2 style={styles.cardTitle}>CITIZEN GPS TRACKER (5-MIN SYNC)</h2>
          </div>

          <p style={styles.cardDesc}>
            Tracks live position & persistent <strong style={{ color: '#fbbf24' }}>Last Known Location</strong>. Unresponsive citizens after 5 min automatically escalate to <strong style={{ color: '#ef4444' }}>Critical Danger</strong>.
          </p>

          <div style={styles.deviceList}>
            {liveDevices.map((dev) => (
              <div
                key={dev.device_uuid}
                style={{
                  ...styles.deviceItem,
                  borderColor: dev.status === 'SOS' || dev.isUnresponsiveDanger ? '#dc2626' : '#1e293b',
                  backgroundColor: dev.status === 'SOS' || dev.isUnresponsiveDanger ? 'rgba(220, 38, 38, 0.1)' : '#0f172a',
                }}
              >
                <div style={styles.devHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User style={{ width: 18, height: 18, color: dev.status === 'SOS' ? '#ef4444' : '#34d399' }} />
                    <span style={styles.devUuid}>{dev.device_uuid}</span>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: dev.status === 'SOS' || dev.isUnresponsiveDanger ? '#7f1d1d' : '#064e3b',
                      color: dev.status === 'SOS' || dev.isUnresponsiveDanger ? '#fecaca' : '#34d399',
                    }}
                  >
                    {dev.isUnresponsiveDanger ? '🚨 UNRESPONSIVE DANGER' : dev.status || 'ACTIVE'}
                  </span>
                </div>

                <div style={styles.coordBox}>
                  <span style={styles.coordLabel}>LAST KNOWN GPS COORDINATES:</span>
                  <span style={styles.coordVal}>
                    {dev.lat.toFixed(5)}° N, {dev.lng.toFixed(5)}° E ({dev.altitude || 1450}m Elev)
                  </span>
                </div>

                <div style={styles.devMetaRow}>
                  <span>Battery: {dev.battery_level || 88}%</span>
                  <span>Last Sync: {new Date(dev.last_synced_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Center Canvas: Live Leaflet / Tactical Map Representation */}
        <section style={{ ...styles.card, flex: 1.5 }}>
          <div style={styles.cardHeader}>
            <Radio style={{ width: 20, height: 20, color: '#f59e0b' }} />
            <h2 style={styles.cardTitle}>CHAMOLI DISASTER TACTICAL MAP</h2>
          </div>

          <div style={styles.mapCanvasPlaceholder}>
            <div style={styles.mapGridOverlay}>
              <div style={styles.sectorPin1}>
                <div style={styles.pinPulseRed} />
                <span style={styles.pinLabel}>Chamoli Sector 1 (85.5% RED)</span>
              </div>

              <div style={styles.sectorPin2}>
                <div style={styles.pinPulseGreen} />
                <span style={styles.pinLabel}>Joshimath Base (SAFE)</span>
              </div>
            </div>

            <div style={styles.mapFooterBanner}>
              <span>Layer: Topographic Contour Tile Set (Offline Mode)</span>
              <span>Protomaps Vector Engine</span>
            </div>
          </div>
        </section>

        {/* Right Column: Active Rescue Clusters */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <AlertOctagon style={{ width: 20, height: 20, color: '#ef4444' }} />
            <h2 style={styles.cardTitle}>NDRF RESCUE CLUSTERS</h2>
          </div>

          <div style={styles.clusterList}>
            <div style={styles.clusterCard}>
              <div style={styles.clusterTop}>
                <span style={styles.p1Badge}>P1 — CRITICAL DISPATCH</span>
                <span style={styles.peopleCount}>47 People Stranded</span>
              </div>
              <p style={styles.clusterDesc}>Sector 1 Riverbank Collapse • Trapped Under Debris</p>
              <p style={styles.clusterCoords}>Center: 30.5573° N, 79.5642° E</p>
              <button style={styles.dispatchBtn}>DISPATCH HELICOPTER SQUAD 1</button>
            </div>

            <div style={styles.clusterCard}>
              <div style={styles.clusterTop}>
                <span style={styles.p2Badge}>P2 — HIGH PRIORITY</span>
                <span style={styles.peopleCount}>18 People Stranded</span>
              </div>
              <p style={styles.clusterDesc}>Joshimath Highway Evacuation Request</p>
              <p style={styles.clusterCoords}>Center: 30.5810° N, 79.5230° E</p>
              <button style={styles.dispatchBtnSecondary}>DISPATCH RESCUE BOAT</button>
            </div>
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
    gap: 16,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottom: '1px solid #1f2937',
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: '1px',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  alertPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#450a0a',
    border: '1px solid #dc2626',
    padding: '6px 14px',
    borderRadius: 20,
  },
  alertText: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: 800,
  },
  refreshBtn: {
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    padding: 8,
    borderRadius: 10,
    cursor: 'pointer',
  },
  mainGrid: {
    display: 'flex',
    gap: 16,
    flex: 1,
  },
  card: {
    backgroundColor: '#0b1329',
    borderRadius: 20,
    padding: 20,
    border: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: '0.8px',
    color: '#f3f4f6',
  },
  cardDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 14,
    lineHeight: '16px',
  },
  deviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  deviceItem: {
    borderRadius: 14,
    padding: 12,
    border: '1px solid',
  },
  devHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  devUuid: {
    fontSize: 13,
    fontWeight: 800,
    color: '#ffffff',
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: 8,
  },
  coordBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 8,
    borderRadius: 8,
    margin: '6px 0',
  },
  coordLabel: {
    fontSize: 9,
    color: '#64748b',
    display: 'block',
  },
  coordVal: {
    fontSize: 12,
    fontWeight: 800,
    color: '#38bdf8',
  },
  devMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },
  mapCanvasPlaceholder: {
    flex: 1,
    backgroundColor: '#030712',
    borderRadius: 16,
    border: '1px solid #1e293b',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 350,
  },
  mapGridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    padding: 30,
  },
  sectorPin1: {
    position: 'absolute',
    top: '35%',
    left: '42%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectorPin2: {
    position: 'absolute',
    top: '65%',
    left: '25%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  pinPulseRed: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    boxShadow: '0 0 16px #ef4444',
  },
  pinPulseGreen: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 12px #10b981',
  },
  pinLabel: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    padding: '4px 10px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
  },
  mapFooterBanner: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    display: 'flex',
    justify: 'space-between',
    fontSize: 10,
    color: '#38bdf8',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: '6px 12px',
    borderRadius: 10,
  },
  clusterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  clusterCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    border: '1px solid #1e293b',
  },
  clusterTop: {
    display: 'flex',
    alignItems: 'center',
    justify: 'space-between',
    marginBottom: 6,
  },
  p1Badge: {
    fontSize: 10,
    fontWeight: 900,
    color: '#fecaca',
    backgroundColor: '#7f1d1d',
    padding: '3px 8px',
    borderRadius: 8,
  },
  p2Badge: {
    fontSize: 10,
    fontWeight: 900,
    color: '#ffedd5',
    backgroundColor: '#7c2d12',
    padding: '3px 8px',
    borderRadius: 8,
  },
  peopleCount: {
    fontSize: 12,
    fontWeight: 800,
    color: '#ffffff',
  },
  clusterDesc: {
    fontSize: 12,
    color: '#94a3b8',
    margin: '4px 0',
  },
  clusterCoords: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 10,
  },
  dispatchBtn: {
    width: '100%',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: 11,
    padding: '10px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
  },
  dispatchBtnSecondary: {
    width: '100%',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: 11,
    padding: '10px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
  },
};
