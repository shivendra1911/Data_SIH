import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Activity, Radio, Map as MapIcon, ShieldAlert } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusScreen } from './StatusScreen';
import { MeshScreen } from './MeshScreen';
import { MapScreen } from './MapScreen';
import { GuidelinesScreen } from './GuidelinesScreen';
import { MeshStatusBadge } from '../components/MeshStatusBadge';
import { RedZoneAlertOverlay } from '../components/RedZoneAlertOverlay';
import { SafeConfirmationCountdown } from '../components/SafeConfirmationCountdown';
import { ActiveCallHUD } from '../components/ActiveCallHUD';
import { TopPillNav, CitizenTab } from '../components/TopPillNav';
import {
  ZonePrediction,
  LocationSyncPayload,
  MeshPeer,
  SOSType,
  NetworkMode,
} from '../types';
import {
  fetchCurrentPrediction,
  flushOfflineSOSQueue,
  sendSOSPayload,
  getNearestSafeRoute,
  getDeviceModelName,
} from '../services/api';
import {
  getLastKnownLocation,
  start5MinPeriodicLocationTracker,
} from '../services/locationTracker';
import { getOfflineSOSQueue } from '../services/offlineStorage';
import {
  startRedZoneDangerTimer,
  stopDangerTimer,
  markUserAsSafeConfirmed,
} from '../services/dangerEscalation';
import { triggerRedZoneEmergencyAlert } from '../services/pushNotification';
import { getCurrentDeviceLocation } from '../services/locationService';
import { bleEngine, meshEngine } from '../services/bluetoothMesh';
import { mobileSirenListener, MobileSirenEvent } from '../services/mobileSirenListener';

const Tab = createBottomTabNavigator();
const DEVICE_UUID_KEY = '@neernetra_device_uuid_v1';

const isUserInsideHazardZone = (userLat?: number, userLng?: number, zoneLat?: number, zoneLng?: number, maxRadiusKm = 25): boolean => {
  if (!userLat || !userLng) return false;
  if (!zoneLat || !zoneLng) return true;
  const R = 6371;
  const dLat = (zoneLat - userLat) * (Math.PI / 180);
  const dLng = (zoneLng - userLng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(userLat * (Math.PI / 180)) * Math.cos(zoneLat * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c <= maxRadiusKm;
};

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [deviceUuid, setDeviceUuid] = useState<string>('local_device');
  const [prediction, setPrediction] = useState<ZonePrediction | null>(null);
  const [networkMode, setNetworkMode] = useState<NetworkMode>('ONLINE');
  const [lastLocation, setLastLocation] = useState<LocationSyncPayload | null>(null);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [showRedAlertOverlay, setShowRedAlertOverlay] = useState<boolean>(false);
  const [remainingCountdown, setRemainingCountdown] = useState<number | null>(null);
  const [sosStatus, setSosStatus] = useState<'SOS' | 'SAFE' | 'HELPING' | null>(null);
  const [forcedSiren, setForcedSiren] = useState<MobileSirenEvent | null>(null);

  // Active top navigation tab state
  const [currentTab, setCurrentTab] = useState<CitizenTab>('status');

  // BLE Intercom / Calling States
  const [activeCallPeer, setActiveCallPeer] = useState<{
    id: string;
    name: string;
    distance?: number;
    hopCount?: number;
  } | null>(null);

  const isUserInDangerZone = Boolean(
    prediction?.alert_color === 'RED' &&
    (prediction?.flood_probability_percent ?? 0) > 60 &&
    (prediction.zone_id === 'live_user_location' ||
      isUserInsideHazardZone(lastLocation?.lat, lastLocation?.lng, 30.5573, 79.5642, 25))
  );

  const isRedZone =
    Boolean(forcedSiren?.active) ||
    isUserInDangerZone ||
    sosStatus === 'SOS';

  useEffect(() => {
    initDeviceUuid();
    loadPrediction();
    checkOfflineQueue();

    // Start background listener for Forced Civil Defense Sirens from web admin
    mobileSirenListener.start((event) => {
      if (event.active) {
        setForcedSiren(event);
        setShowRedAlertOverlay(true);
        setSosStatus('SOS');
        startRedZoneDangerTimer(
          deviceUuid,
          300,
          (remSeconds) => setRemainingCountdown(remSeconds),
          () => {
            setRemainingCountdown(0);
            checkOfflineQueue();
          },
          () => {
            console.log('[HomeScreen] Auto-confirming SAFE via Touch-Free Gyro/Motion Sensor!');
            handleConfirmSafe(true);
          },
          true // force start countdown!
        );
      } else {
        setForcedSiren(null);
        setShowRedAlertOverlay(false);
      }
    });

    return () => {
      mobileSirenListener.stop();
    };
  }, []);

  const initDeviceUuid = async () => {
    try {
      let storedUuid = await AsyncStorage.getItem(DEVICE_UUID_KEY);
      if (!storedUuid) {
        storedUuid = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
        await AsyncStorage.setItem(DEVICE_UUID_KEY, storedUuid);
      }
      setDeviceUuid(storedUuid);
      start5MinPeriodicLocationTracker(storedUuid, 'local_sector');
      const cachedLoc = await getLastKnownLocation();
      setLastLocation(cachedLoc);

      // Initialize mesh engine listeners
      (meshEngine as any).onPeerDiscovered = (peer: MeshPeer) => {
        setPeerCount(meshEngine.getConnectedPeers().length);
      };
      (meshEngine as any).onSOSRelayed = async () => {
        checkOfflineQueue();
      };

      // Lazy-init Bluetooth on native Android/iOS
      if (Platform.OS !== 'web') {
        await (bleEngine as any).init();
        (bleEngine as any).onCallReceived = (callerId: string, callerName: string) => {
          setActiveCallPeer({ id: callerId, name: callerName, hopCount: 1 });
        };
        (bleEngine as any).onCallEnded = () => {
          setActiveCallPeer(null);
        };
        (bleEngine as any).onStateChange = (state: string) => {
          if (state === 'PoweredOff') setNetworkMode('OFFLINE_QUEUED');
        };
      }
    } catch (e) {
      console.warn('[HomeScreen] Device UUID / BLE init failed:', e);
    }
  };

  const loadPrediction = async () => {
    try {
      const loc = await getLastKnownLocation();
      const data = await fetchCurrentPrediction('local_sector', loc?.lat, loc?.lng);
      setPrediction(data);
      setNetworkMode('ONLINE');

      const insideDangerZone =
        data.alert_color === 'RED' &&
        data.flood_probability_percent > 60 &&
        (data.zone_id === 'live_user_location' ||
          isUserInsideHazardZone(loc?.lat, loc?.lng, 30.5573, 79.5642, 25));

      if (insideDangerZone) {
        triggerRedZoneEmergencyAlert(data.zone_id, data.flood_probability_percent, data.primary_trigger);
        setShowRedAlertOverlay(true);

        startRedZoneDangerTimer(
          deviceUuid,
          300,
          (remSeconds) => setRemainingCountdown(remSeconds),
          () => {
            setRemainingCountdown(0);
            checkOfflineQueue();
          },
          () => {
            console.log('[HomeScreen] Auto-confirming SAFE via Touch-Free Gyro/Motion Sensor!');
            handleConfirmSafe(true);
          }
        );
      }
    } catch (e) {
      setNetworkMode('BLE_MESH');
    }
  };

  const checkOfflineQueue = async () => {
    const queue = await getOfflineSOSQueue();
    setQueuedCount(queue.length);
    setPeerCount(meshEngine.getConnectedPeers().length);
    setLastLocation(await getLastKnownLocation());
  };

  const handleConfirmSafe = async (isTouchFree: boolean = false) => {
    await markUserAsSafeConfirmed(deviceUuid);
    setRemainingCountdown(null);
    stopDangerTimer();
    setSosStatus('SAFE');
    let lat = lastLocation?.lat;
    let lng = lastLocation?.lng;
    try {
      const liveGps = await getCurrentDeviceLocation();
      if (liveGps && liveGps.lat && liveGps.lng) {
        lat = liveGps.lat;
        lng = liveGps.lng;
      }
    } catch {}

    await sendSOSPayload({
      device_uuid: deviceUuid,
      lat: lat || 27.6015,
      lng: lng || 77.5975,
      status: 'SAFE',
      sos_type: isTouchFree ? 'TOUCH_FREE_MOTION_SAFE' : 'CHECKIN',
      notes: isTouchFree
        ? 'Confirmed SAFE via Internal Gyro/Motion Sensor (Touch-Free / Damaged Screen Lift Gesture)'
        : 'Confirmed SAFE by citizen tap',
      is_mesh_relayed: networkMode === 'BLE_MESH',
      timestamp: new Date().toISOString(),
    });
  };

  const handleSOSTrigger = async (type: SOSType) => {
    setSosStatus('SOS');
    let lat = lastLocation?.lat;
    let lng = lastLocation?.lng;
    try {
      const liveGps = await getCurrentDeviceLocation();
      if (liveGps && liveGps.lat && liveGps.lng) {
        lat = liveGps.lat;
        lng = liveGps.lng;
      }
    } catch {}

    const payload = {
      device_uuid: deviceUuid,
      lat: lat || 27.6015,
      lng: lng || 77.5975,
      status: 'SOS' as const,
      sos_type: type,
      notes: `Immediate assistance required: ${type}`,
      is_mesh_relayed: networkMode === 'BLE_MESH',
      timestamp: new Date().toISOString(),
    };

    if (networkMode === 'BLE_MESH') {
      (meshEngine as any).broadcastSOS(payload);
    }
    await sendSOSPayload(payload);
    await checkOfflineQueue();
  };

  const handleEndActiveCall = () => {
    if (activeCallPeer) {
      (bleEngine as any).endCall(activeCallPeer.id);
      setActiveCallPeer(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header with App Logo, Phone Model, and Network Status */}
      <TopPillNav
        networkMode={networkMode}
        topInset={insets.top}
        phoneModel={getDeviceModelName()}
      />

      {/* Acoustic Forced Siren Banner */}
      {forcedSiren?.active && (
        <View style={styles.forcedSirenBanner}>
          <Text style={styles.forcedSirenTitle}>
            🚨 EMERGENCY CIVIL DEFENSE ALARM ACTIVATED
          </Text>
          <Text style={styles.forcedSirenSubtitle}>
            {forcedSiren.message || 'Immediate high-ground evacuation ordered by NDRF / SDMA! Move to safe haven now.'}
          </Text>
          <TouchableOpacity
            style={styles.silenceBtn}
            activeOpacity={0.8}
            onPress={() => {
              if (forcedSiren?.dispatchedAt) {
                mobileSirenListener.markSirenSilenced(forcedSiren.dispatchedAt);
              } else {
                mobileSirenListener.silenceAlarm(true);
              }
              setForcedSiren(null);
              setShowRedAlertOverlay(false);
              handleConfirmSafe(false);
            }}
          >
            <Text style={styles.silenceBtnText}>SILENCE ALARM & CONFIRM SAFE</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Connectivity badge only when in mesh/offline mode or unsynced queue exists */}
      {(networkMode !== 'ONLINE' || queuedCount > 0) && (
        <MeshStatusBadge
          mode={networkMode}
          peerCount={peerCount}
          queuedCount={queuedCount}
          onSyncPress={async () => {
            setSyncing(true);
            await flushOfflineSOSQueue();
            await checkOfflineQueue();
            setSyncing(false);
          }}
          syncing={syncing}
        />
      )}

      {activeCallPeer && (
        <ActiveCallHUD
          peer={activeCallPeer}
          onEndCall={handleEndActiveCall}
        />
      )}

      {remainingCountdown !== null && remainingCountdown > 0 && (
        <SafeConfirmationCountdown
          remainingSeconds={remainingCountdown}
          onConfirmSafe={handleConfirmSafe}
        />
      )}

      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: [
              styles.tabBar,
              {
                height: 56 + Math.max(insets.bottom, 12),
                paddingBottom: Math.max(insets.bottom, 8),
              },
            ],
            tabBarActiveTintColor: '#2563eb',
            tabBarInactiveTintColor: '#64748b',
            tabBarLabelStyle: styles.tabLabel,
          }}
        >
          <Tab.Screen
            name="Status"
            options={{
              tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
            }}
          >
            {() => (
              <StatusScreen
                prediction={prediction}
                isRedZone={isRedZone}
                onSOSTrigger={handleSOSTrigger}
                networkMode={networkMode}
                onRefresh={loadPrediction}
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Map"
            options={{
              tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} />,
            }}
          >
            {() => (
              <MapScreen
                lastLocation={lastLocation}
                peers={meshEngine.getConnectedPeers()}
                isRedZone={isRedZone}
                networkMode={networkMode}
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Mesh"
            options={{
              tabBarIcon: ({ color, size }) => <Radio color={color} size={size} />,
            }}
          >
            {() => (
              <MeshScreen
                peers={meshEngine.getConnectedPeers()}
                networkMode={networkMode}
                onInitiateCall={(peer: any) => {
                  (bleEngine as any).initiateCall(peer.id);
                  setActiveCallPeer(peer);
                }}
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Directives"
            options={{
              tabBarIcon: ({ color, size }) => <ShieldAlert color={color} size={size} />,
            }}
            component={GuidelinesScreen}
          />
        </Tab.Navigator>
      </NavigationContainer>

      <RedZoneAlertOverlay
        visible={showRedAlertOverlay}
        zoneName={forcedSiren?.zoneName || prediction?.zone_name || 'Civil Emergency Hazard Zone'}
        floodProbability={forcedSiren ? 88.5 : prediction?.flood_probability_percent || 80.0}
        triggerReason={forcedSiren?.message || prediction?.primary_trigger || 'Civil Defense Emergency Siren Dispatched by NDRF / SDMA'}
        onConfirmSafe={() => {
          if (forcedSiren?.dispatchedAt) {
            mobileSirenListener.markSirenSilenced(forcedSiren.dispatchedAt);
          } else {
            mobileSirenListener.silenceAlarm(true);
          }
          setForcedSiren(null);
          setShowRedAlertOverlay(false);
          handleConfirmSafe(false);
        }}
        onDismiss={() => {
          if (forcedSiren?.dispatchedAt) {
            mobileSirenListener.markSirenSilenced(forcedSiren.dispatchedAt);
          } else {
            mobileSirenListener.silenceAlarm(true);
          }
          setForcedSiren(null);
          setShowRedAlertOverlay(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 14,
    paddingTop: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  forcedSirenBanner: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#fca5a5',
  },
  forcedSirenTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  forcedSirenSubtitle: {
    color: '#fee2e2',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 15,
  },
  silenceBtn: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  silenceBtnText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
