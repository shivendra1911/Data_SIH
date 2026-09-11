import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  Text,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ZonePrediction, NetworkMode, LocationSyncPayload, SOSType, SOSPayload } from '../types';
import { fetchCurrentPrediction, sendSOSPayload, flushOfflineSOSQueue } from '../services/api';
import { getOfflineSOSQueue } from '../services/offlineStorage';
import { meshManager, meshEngine, bleEngine } from '../services/bluetoothMesh';
import {
  start5MinPeriodicLocationTracker,
  getLastKnownLocation,
  syncCurrentLocationToBackend,
} from '../services/locationTracker';
import { triggerRedZoneEmergencyAlert } from '../services/pushNotification';
import {
  startRedZoneDangerTimer,
  markUserAsSafeConfirmed,
  stopDangerTimer,
} from '../services/dangerEscalation';
import { startBLEAdvertising, stopBLEAdvertising } from '../services/bleAdvertiser';

import { TopPillNav, CitizenTab } from '../components/TopPillNav';
import { SecurityGaugeCard } from '../components/SecurityGaugeCard';
import { NearbyVictimsHelpCard } from '../components/NearbyVictimsHelpCard';
import { MeshRelayFeed } from '../components/MeshRelayFeed';
import { MeshStatusBadge } from '../components/MeshStatusBadge';
import { BluetoothWalkieTalkie } from '../components/BluetoothWalkieTalkie';
import { RedZoneAlertOverlay } from '../components/RedZoneAlertOverlay';
import { SafeConfirmationCountdown } from '../components/SafeConfirmationCountdown';
import { OfflineMapContainer } from '../components/OfflineMapContainer';
import { SOSBigButton } from '../components/SOSBigButton';
import { Navigation } from 'lucide-react-native';

const DEVICE_UUID_KEY = '@neernetra_device_uuid_v1';

export const HomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CitizenTab>('status');
  const [prediction, setPrediction] = useState<ZonePrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [deviceUuid, setDeviceUuid] = useState<string>('uuid-device-node-1');
  const [networkMode, setNetworkMode] = useState<NetworkMode>('ONLINE');
  const [peerCount, setPeerCount] = useState<number>(3);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastLocation, setLastLocation] = useState<LocationSyncPayload | null>(null);
  const [showRedAlertOverlay, setShowRedAlertOverlay] = useState<boolean>(false);
  const [remainingCountdown, setRemainingCountdown] = useState<number | null>(null);
  const [sosStatus, setSosStatus] = useState<'SOS' | 'SAFE' | 'HELPING' | null>(null);
  const [userName] = useState<string>('Citizen');

  useEffect(() => {
    initDeviceUuid();
    loadPrediction();
    checkOfflineQueue();
  }, []);

  const initDeviceUuid = async () => {
    try {
      let storedUuid = await AsyncStorage.getItem(DEVICE_UUID_KEY);
      if (!storedUuid) {
        storedUuid = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
        await AsyncStorage.setItem(DEVICE_UUID_KEY, storedUuid);
      }
      setDeviceUuid(storedUuid);
      start5MinPeriodicLocationTracker(storedUuid, 'chamoli_01');
      const cachedLoc = await getLastKnownLocation();
      setLastLocation(cachedLoc);

      // ── Real BLE Mesh Initialisation ──────────────────────────────────────
      // Init real BLE engine (requests permissions, starts scanning)
      const bleOk = await bleEngine.init(storedUuid, 'Citizen');
      if (bleOk) {
        // Start advertising so other phones can find us
        await startBLEAdvertising('NeerNetra_' + storedUuid.substring(4, 10));

        // Live peer updates → refresh peer count
        bleEngine.onPeersChanged = (peers) => {
          setPeerCount(peers.length);
        };

        // SOS received from another mesh peer
        bleEngine.onSOSReceived = (senderId, lat, lng) => {
          console.warn(`[HomeScreen] SOS received via mesh from ${senderId} at ${lat},${lng}`);
        };

        // Network mode: if peers > 0 and no internet → BLE_MESH
        bleEngine.onStateChange = (state) => {
          if (state === 'PoweredOff') setNetworkMode('OFFLINE_QUEUED');
        };
      }
    } catch (e) {
      console.warn('[HomeScreen] Device UUID / BLE init failed:', e);
    }
  };

  const loadPrediction = async () => {
    setLoading(true);
    try {
      const data = await fetchCurrentPrediction('chamoli_01');
      setPrediction(data);
      setNetworkMode('ONLINE');

      if (data.alert_color === 'RED' || data.flood_probability_percent > 75.0) {
        triggerRedZoneEmergencyAlert(data.zone_id, data.flood_probability_percent, data.primary_trigger);
        setShowRedAlertOverlay(true);

        startRedZoneDangerTimer(
          deviceUuid,
          300,
          (remSeconds) => setRemainingCountdown(remSeconds),
          () => {
            setRemainingCountdown(0);
            checkOfflineQueue();
          }
        );
      }
    } catch (e) {
      console.warn('[HomeScreen] Prediction offline — switching to BLE mesh mode:', e);
      setNetworkMode('BLE_MESH');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkOfflineQueue = async () => {
    const queue = await getOfflineSOSQueue();
    setQueuedCount(queue.length);
    setPeerCount(meshManager.getActivePeersCount());
    const cachedLoc = await getLastKnownLocation();
    setLastLocation(cachedLoc);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrediction();
    await checkOfflineQueue();
    if (deviceUuid) {
      await syncCurrentLocationToBackend(deviceUuid, 'chamoli_01');
    }
  };

  // Citizen taps "I AM SAFE"
  const handleConfirmSafe = async () => {
    await markUserAsSafeConfirmed(deviceUuid);
    setRemainingCountdown(null);
    stopDangerTimer();
    setSosStatus('SAFE');

    const lat = lastLocation ? lastLocation.lat : 30.5573;
    const lng = lastLocation ? lastLocation.lng : 79.5642;

    await sendSOSPayload({
      device_uuid: deviceUuid,
      lat,
      lng,
      status: 'SAFE',
      is_mesh_relayed: networkMode === 'BLE_MESH',
      timestamp: new Date().toISOString(),
    });
    await checkOfflineQueue();
  };

  // Citizen selects an SOS type
  const handleSOSTrigger = async (type: SOSType) => {
    setSosStatus('SOS');
    const lat = lastLocation ? lastLocation.lat : 30.5573;
    const lng = lastLocation ? lastLocation.lng : 79.5642;

    const payload: SOSPayload = {
      device_uuid: deviceUuid,
      lat,
      lng,
      status: 'SOS',
      sos_type: type,
      is_mesh_relayed: networkMode === 'BLE_MESH',
      timestamp: new Date().toISOString(),
    };

    // If online, post to backend; otherwise broadcast via BLE mesh
    if (networkMode !== 'BLE_MESH') {
      await sendSOSPayload(payload);
    } else {
      await meshEngine.broadcastMultiHopSOS(payload);
    }
    await checkOfflineQueue();
  };

  // SOS triggered from Red Zone overlay
  const handleEmergencySOSFromOverlay = async () => {
    setShowRedAlertOverlay(false);
    await handleSOSTrigger('TRAPPED');
  };

  const handleSyncQueue = async () => {
    setSyncing(true);
    try {
      await flushOfflineSOSQueue();
      await checkOfflineQueue();
    } finally {
      setSyncing(false);
    }
  };

  const peers = meshEngine.getConnectedPeers();

  const isRedZone =
    prediction?.alert_color === 'RED' ||
    (prediction?.flood_probability_percent ?? 0) > 75;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#eaebe5" />

      {/* Top Nav with NeerNetra branding and tab pills */}
      <TopPillNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        networkMode={networkMode}
      />

      {/* 5-minute danger countdown — always rendered above all tabs */}
      {remainingCountdown !== null && remainingCountdown > 0 && (
        <SafeConfirmationCountdown
          remainingSeconds={remainingCountdown}
          onConfirmSafe={handleConfirmSafe}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
      >
        {/* Network / Mesh status badge (always visible) */}
        <MeshStatusBadge
          mode={networkMode}
          peerCount={peerCount}
          queuedCount={queuedCount}
          onSyncPress={handleSyncQueue}
          syncing={syncing}
        />

        {/* Last known GPS location bar */}
        {lastLocation && (
          <View style={styles.locationSyncBar}>
            <Navigation size={13} color="#0284c7" />
            <Text style={styles.locSyncText}>
              5-Min GPS Sync:{' '}
              <Text style={styles.boldCoords}>
                {lastLocation.lat.toFixed(4)}, {lastLocation.lng.toFixed(4)}
              </Text>{' '}
              • Battery {lastLocation.battery_level ?? '--'}%
            </Text>
          </View>
        )}

        {/* ========== TAB 1: STATUS ========== */}
        {activeTab === 'status' && (
          <>
            {/* Flood risk gauge */}
            <SecurityGaugeCard prediction={prediction} />

            {/* Primary SOS + I AM SAFE buttons */}
            <SOSBigButton
              onSOSTrigger={handleSOSTrigger}
              onConfirmSafe={handleConfirmSafe}
              currentStatus={sosStatus}
            />

            {/* Nearby citizens needing / offering help */}
            <NearbyVictimsHelpCard />
          </>
        )}

        {/* ========== TAB 2: MESH ========== */}
        {activeTab === 'mesh' && (
          <>
            {/* Walkie-talkie offline chat */}
            <BluetoothWalkieTalkie />

            {/* Nearby citizens reachable over BLE */}
            <NearbyVictimsHelpCard />

            {/* Active relay feed */}
            <MeshRelayFeed peers={peers} />
          </>
        )}

        {/* ========== TAB 3: MAP ========== */}
        {activeTab === 'map' && (
          <>
            {/* Offline vector map with GPS pin and BLE peer markers */}
            <OfflineMapContainer
              lastLocation={lastLocation}
              peers={peers}
              isRedZone={isRedZone}
            />

            {/* Still show SOS buttons so citizen can act from map tab */}
            <SOSBigButton
              onSOSTrigger={handleSOSTrigger}
              onConfirmSafe={handleConfirmSafe}
              currentStatus={sosStatus}
            />

            {/* Compact relay list */}
            <MeshRelayFeed peers={peers} />
          </>
        )}
      </ScrollView>

      {/* Full-screen Red Zone warning modal */}
      <RedZoneAlertOverlay
        visible={showRedAlertOverlay}
        prediction={prediction}
        lastLocation={lastLocation}
        onTriggerSOS={handleEmergencySOSFromOverlay}
        onDismiss={() => setShowRedAlertOverlay(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eaebe5',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  locationSyncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  locSyncText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  boldCoords: {
    color: '#0f172a',
    fontWeight: '800',
  },
});
