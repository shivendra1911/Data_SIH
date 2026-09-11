import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ZonePrediction, NetworkMode, LocationSyncPayload } from '../types';
import { fetchCurrentPrediction, flushOfflineSOSQueue, sendSOSPayload } from '../services/api';
import { getOfflineSOSQueue } from '../services/offlineStorage';
import { meshManager } from '../services/meshService';
import {
  start5MinPeriodicLocationTracker,
  getLastKnownLocation,
  syncCurrentLocationToBackend,
} from '../services/locationTracker';
import { triggerRedZoneEmergencyAlert } from '../services/pushNotification';

import { TopPillNav } from '../components/TopPillNav';
import { SecurityGaugeCard } from '../components/SecurityGaugeCard';
import { MapSessionCard } from '../components/MapSessionCard';
import { PeopleBeaconCard } from '../components/PeopleBeaconCard';
import { DarkSessionDrawer } from '../components/DarkSessionDrawer';
import { TriageModal } from '../components/TriageModal';
import { MeshStatusBadge } from '../components/MeshStatusBadge';
import { BluetoothWalkieTalkie } from '../components/BluetoothWalkieTalkie';
import { RedZoneAlertOverlay } from '../components/RedZoneAlertOverlay';
import { Radio, Navigation, BellRing } from 'lucide-react-native';

const DEVICE_UUID_KEY = '@neernetra_device_uuid_v1';

export const HomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'rescue' | 'map'>('telemetry');
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

      // Start 5-minute periodic location sync routine
      start5MinPeriodicLocationTracker(storedUuid, 'chamoli_01');
      const cachedLoc = await getLastKnownLocation();
      setLastLocation(cachedLoc);
    } catch (e) {
      console.warn('Failed to initialize device UUID & location tracker:', e);
    }
  };

  const loadPrediction = async () => {
    setLoading(true);
    try {
      const data = await fetchCurrentPrediction('chamoli_01');
      setPrediction(data);
      setNetworkMode('ONLINE');

      // Trigger push notification if RED ZONE alert is active
      if (data.alert_color === 'RED' || data.flood_probability_percent > 75.0) {
        triggerRedZoneEmergencyAlert(data.zone_id, data.flood_probability_percent, data.primary_trigger);
        setShowRedAlertOverlay(true);
      }
    } catch (e) {
      console.warn('Prediction load error:', e);
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

  const handleSyncQueue = async () => {
    setSyncing(true);
    try {
      await flushOfflineSOSQueue();
      await checkOfflineQueue();
    } finally {
      setSyncing(false);
    }
  };

  const handleEmergencySOSFromOverlay = async () => {
    setShowRedAlertOverlay(false);
    await sendSOSPayload({
      device_uuid: deviceUuid,
      lat: lastLocation ? lastLocation.lat : 30.5573,
      lng: lastLocation ? lastLocation.lng : 79.5642,
      status: 'SOS',
      sos_type: 'TRAPPED',
      is_mesh_relayed: networkMode === 'BLE_MESH',
      timestamp: new Date().toISOString(),
    });
    await checkOfflineQueue();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#eaebe5" />

      {/* Top Navigation Pill Bar */}
      <TopPillNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onFilterPress={onRefresh}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
      >
        {/* Connectivity & Mesh Status Badge */}
        <MeshStatusBadge
          mode={networkMode}
          peerCount={peerCount}
          queuedCount={queuedCount}
          onSyncPress={handleSyncQueue}
          syncing={syncing}
        />

        {/* 5-Min Last Known Location Bar */}
        {lastLocation && (
          <View style={styles.locationSyncBar}>
            <Navigation size={14} color="#0284c7" />
            <Text style={styles.locSyncText}>
              5-Min Sync: <Text style={styles.boldCoords}>{lastLocation.lat.toFixed(4)}, {lastLocation.lng.toFixed(4)}</Text> • Battery {lastLocation.battery_level}%
            </Text>
          </View>
        )}

        {/* Tab 1: Telemetry & Overview */}
        {activeTab === 'telemetry' && (
          <>
            <SecurityGaugeCard prediction={prediction} />
            <BluetoothWalkieTalkie />
            <MapSessionCard />
            <PeopleBeaconCard beacons={[]} />
            <DarkSessionDrawer />
          </>
        )}

        {/* Tab 2: Rescue & Triage Beacon */}
        {activeTab === 'rescue' && (
          <>
            <TriageModal
              deviceUuid={deviceUuid}
              networkMode={networkMode}
              onStatusSubmitted={() => checkOfflineQueue()}
            />
            <BluetoothWalkieTalkie />
            <PeopleBeaconCard beacons={[]} />
            <DarkSessionDrawer />
          </>
        )}

        {/* Tab 3: Live Map Focus */}
        {activeTab === 'map' && (
          <>
            <MapSessionCard />
            <BluetoothWalkieTalkie />
            <SecurityGaugeCard prediction={prediction} />
            <DarkSessionDrawer />
          </>
        )}
      </ScrollView>

      {/* Full Screen Red Zone Warning Notification Modal Overlay */}
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
    paddingBottom: 40,
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
    marginBottom: 8,
  },
  locSyncText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '600',
  },
  boldCoords: {
    color: '#0f172a',
    fontWeight: '800',
  },
});
