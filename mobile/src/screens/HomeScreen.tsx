import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ZonePrediction, NetworkMode } from '../types';
import { fetchCurrentPrediction, flushOfflineSOSQueue } from '../services/api';
import { getOfflineSOSQueue } from '../services/offlineStorage';
import { meshManager } from '../services/meshService';
import { AlertHeader } from '../components/AlertHeader';
import { MeshStatusBadge } from '../components/MeshStatusBadge';
import { TriageModal } from '../components/TriageModal';
import { EmergencyGuide } from '../components/EmergencyGuide';
import { Shield, PhoneCall, RefreshCw } from 'lucide-react-native';

const DEVICE_UUID_KEY = '@neernetra_device_uuid_v1';

export const HomeScreen: React.FC = () => {
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
      const synced = await flushOfflineSOSQueue();
      await checkOfflineQueue();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      {/* Top Navbar */}
      <View style={styles.navbar}>
        <View style={styles.brandRow}>
          <Shield size={26} color="#38bdf8" />
          <View>
            <Text style={styles.brandTitle}>NEERNETRA</Text>
            <Text style={styles.brandSubtitle}>Flash Flood Edge Dispatch</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}>
          <RefreshCw size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
        }
      >
        {/* Connectivity & Mesh Status */}
        <MeshStatusBadge
          mode={networkMode}
          peerCount={peerCount}
          queuedCount={queuedCount}
          onSyncPress={handleSyncQueue}
          syncing={syncing}
        />

        {/* Live Prediction & Risk Header */}
        <AlertHeader prediction={prediction} loading={loading} />

        {/* Triage SOS Beacon Panel */}
        <TriageModal
          deviceUuid={deviceUuid}
          networkMode={networkMode}
          onStatusSubmitted={() => checkOfflineQueue()}
        />

        {/* Emergency Helpline Strip */}
        <View style={styles.helplineCard}>
          <PhoneCall size={20} color="#f87171" />
          <View style={styles.helplineTextContainer}>
            <Text style={styles.helplineTitle}>NDRF National Disaster Helpline</Text>
            <Text style={styles.helplineNumber}>1078 / 011-24363260 (Toll Free)</Text>
          </View>
        </View>

        {/* Offline Survival Protocol */}
        <EmergencyGuide />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#030712',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    backgroundColor: '#030712',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1315',
    borderColor: '#7f1d1d',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 12,
  },
  helplineTextContainer: {
    flex: 1,
  },
  helplineTitle: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  helplineNumber: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
});
