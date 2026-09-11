import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ZonePrediction, NetworkMode } from '../types';
import { fetchCurrentPrediction, flushOfflineSOSQueue } from '../services/api';
import { getOfflineSOSQueue } from '../services/offlineStorage';
import { meshManager } from '../services/meshService';

import { TopPillNav } from '../components/TopPillNav';
import { SecurityGaugeCard } from '../components/SecurityGaugeCard';
import { MapSessionCard } from '../components/MapSessionCard';
import { PeopleBeaconCard } from '../components/PeopleBeaconCard';
import { DarkSessionDrawer } from '../components/DarkSessionDrawer';
import { TriageModal } from '../components/TriageModal';
import { MeshStatusBadge } from '../components/MeshStatusBadge';

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
    } catch (e) {
      console.warn('Failed to load device UUID:', e);
    }
  };

  const loadPrediction = async () => {
    setLoading(true);
    try {
      const data = await fetchCurrentPrediction('chamoli_01');
      setPrediction(data);
      setNetworkMode('ONLINE');
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
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrediction();
    await checkOfflineQueue();
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
        {/* Connection Status Badge */}
        <MeshStatusBadge
          mode={networkMode}
          peerCount={peerCount}
          queuedCount={queuedCount}
          onSyncPress={handleSyncQueue}
          syncing={syncing}
        />

        {/* Tab 1: Telemetry & Overview (Gauge + Map + People + Dark Drawer) */}
        {activeTab === 'telemetry' && (
          <>
            <SecurityGaugeCard prediction={prediction} />
            <MapSessionCard />
            <PeopleBeaconCard beacons={[]} />
            <DarkSessionDrawer />
          </>
        )}

        {/* Tab 2: Triage Beacon & Action Panel */}
        {activeTab === 'rescue' && (
          <>
            <TriageModal
              deviceUuid={deviceUuid}
              networkMode={networkMode}
              onStatusSubmitted={() => checkOfflineQueue()}
            />
            <PeopleBeaconCard beacons={[]} />
            <DarkSessionDrawer />
          </>
        )}

        {/* Tab 3: Full Map Session Focus */}
        {activeTab === 'map' && (
          <>
            <MapSessionCard />
            <SecurityGaugeCard prediction={prediction} />
            <DarkSessionDrawer />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eaebe5', // Warm light ivory/gray backdrop matching the reference image!
  },
  scrollContent: {
    paddingBottom: 40,
  },
});
