import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform, Alert } from 'react-native';
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
import { IncomingCallModal } from '../components/IncomingCallModal';
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
  start5SecDisasterLocationStream,
  stop5SecDisasterLocationStream,
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
import {
  getPendingEmergencyIntent,
  clearPendingEmergencyIntent,
  subscribeToEmergencyWakeUp,
} from '../services/gattServerBridge';

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
  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [showRedAlertOverlay, setShowRedAlertOverlay] = useState<boolean>(false);
  const [remainingCountdown, setRemainingCountdown] = useState<number | null>(null);
  const [sosStatus, setSosStatus] = useState<'SOS' | 'SAFE' | 'HELPING' | null>(null);
  const [forcedSiren, setForcedSiren] = useState<MobileSirenEvent | null>(null);

  // Active top navigation tab state
  const [currentTab, setCurrentTab] = useState<CitizenTab>('status');
  const [targetHavenCoords, setTargetHavenCoords] = useState<{ lat: number; lng: number } | null>(null);

  // BLE Intercom / Calling States
  const [activeCallPeer, setActiveCallPeer] = useState<{
    id: string;
    name: string;
    distance?: number;
    hopCount?: number;
    isGroupCall?: boolean;
  } | null>(null);
  const [incomingCaller, setIncomingCaller] = useState<{
    id: string;
    name: string;
    distance?: number;
    hopCount?: number;
    isGroupCall?: boolean;
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

    // Emergency Wake-Up listener (Handles incoming calls & SOS alerts when phone is woken up or locked)
    const handleWakeIntent = (data: any) => {
      if (!data) return;
      console.log('[HomeScreen] 🚨 Processed emergency wake-up intent from lock screen:', data);
      if (data.emergency_type === 'CALL_REQ' || data.emergency_type === 'GROUP_CALL' || data.caller_name) {
        if (data.auto_answer) {
          console.log('[HomeScreen] 📞 Auto-answering call accepted via WhatsApp-style incoming call screen!');
          const caller = {
            id: data.caller_id || 'remote_node',
            name: data.caller_name || 'Emergency Node',
            hopCount: 1,
            isGroupCall: Boolean(data.is_group_call || data.emergency_type === 'GROUP_CALL'),
          };
          setActiveCallPeer(caller);
          setIncomingCaller(null);
          (meshEngine as any).acceptCall(data.caller_id || 'remote_node');
        } else {
          setIncomingCaller({
            id: data.caller_id || 'remote_node',
            name: data.caller_name || 'Emergency Node',
            hopCount: 1,
            isGroupCall: Boolean(data.is_group_call || data.emergency_type === 'GROUP_CALL'),
          });
        }
      }
      clearPendingEmergencyIntent();
    };

    getPendingEmergencyIntent().then(handleWakeIntent);
    const unsubscribeWake = subscribeToEmergencyWakeUp(handleWakeIntent);

    return () => {
      mobileSirenListener.stop();
      unsubscribeWake();
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
      meshEngine.onPeersChanged = (newPeers: MeshPeer[]) => {
        setPeers([...newPeers]);
        setPeerCount(newPeers.length);
      };
      (meshEngine as any).onPeerDiscovered = (peer: MeshPeer) => {
        const current = meshEngine.getConnectedPeers();
        setPeers([...current]);
        setPeerCount(current.length);
      };
      (meshEngine as any).onSOSRelayed = async () => {
        checkOfflineQueue();
      };

      // Lazy-init Bluetooth on native Android/iOS
      if (Platform.OS !== 'web') {
        const modelName = getDeviceModelName();
        const nodeName = `Citizen [${modelName || storedUuid.substring(0, 8)}]`;
        await bleEngine.init(storedUuid, nodeName);
        const initialPeers = meshEngine.getConnectedPeers();
        setPeers([...initialPeers]);
        setPeerCount(initialPeers.length);

        (meshEngine as any).onIncomingCall = (caller: any) => {
          console.log('[HomeScreen] 📞 Received incoming call:', caller);
          setIncomingCaller(caller);
        };
        (meshEngine as any).onCallAnswered = (peerId: string, peerName?: string) => {
          console.log('[HomeScreen] 📞 Call answered by:', peerId);
          setActiveCallPeer({ id: peerId, name: peerName || `Citizen [${peerId.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}]`, hopCount: 1 });
        };
        (meshEngine as any).onCallDeclined = (peerId: string) => {
          console.log('[HomeScreen] 📞 Call declined by:', peerId);
          setActiveCallPeer(null);
          Alert.alert('Call Declined', 'The peer declined or is unavailable.');
        };
        (meshEngine as any).onCallEnded = (peerId: string) => {
          console.log('[HomeScreen] 📞 Call ended with:', peerId);
          setActiveCallPeer(null);
          setIncomingCaller(null);
        };
        (meshEngine as any).onStateChange = (state: string) => {
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
    stop5SecDisasterLocationStream();
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
    start5SecDisasterLocationStream(deviceUuid);
    await checkOfflineQueue();
  };

  const handleAcceptIncomingCall = async () => {
    if (!incomingCaller) return;
    await (meshEngine as any).acceptCall(incomingCaller.id);
    setActiveCallPeer(incomingCaller);
    setIncomingCaller(null);
  };

  const handleDeclineIncomingCall = async () => {
    if (!incomingCaller) return;
    await (meshEngine as any).declineCall(incomingCaller.id);
    setIncomingCaller(null);
  };

  const handleEndActiveCall = async () => {
    if (activeCallPeer) {
      await (meshEngine as any).endCall(activeCallPeer.id);
      setActiveCallPeer(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header with App Logo, Phone Model, Network Status, and Tab Switcher */}
      <TopPillNav
        activeTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
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

      <IncomingCallModal
        visible={Boolean(incomingCaller)}
        caller={incomingCaller}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />

      {remainingCountdown !== null && remainingCountdown > 0 && (
        <SafeConfirmationCountdown
          remainingSeconds={remainingCountdown}
          onConfirmSafe={handleConfirmSafe}
        />
      )}

      {/* Screen Container without Bottom Navigation Bar */}
      <View style={styles.screenBody}>
        {currentTab === 'status' && (
          <StatusScreen
            prediction={prediction}
            isRedZone={isRedZone}
            onSOSTrigger={handleSOSTrigger}
            networkMode={networkMode}
            onRefresh={loadPrediction}
            onNavigate={(tab, coords) => {
              if (coords) setTargetHavenCoords(coords);
              setCurrentTab(tab);
            }}
            onConfirmSafe={() => handleConfirmSafe(false)}
          />
        )}

        {currentTab === 'map' && (
          <MapScreen
            lastLocation={lastLocation}
            peers={peers}
            isRedZone={isRedZone}
            networkMode={networkMode}
            targetHavenCoords={targetHavenCoords}
            onBack={() => setCurrentTab('status')}
          />
        )}

        {currentTab === 'mesh' && (
          <MeshScreen
            peers={peers}
            networkMode={networkMode}
            onInitiateCall={(peer: any) => {
              (meshEngine as any).initiateCall(peer.id, peer.name);
              setActiveCallPeer(peer);
            }}
            onInitiateGroupCall={() => {
              (meshEngine as any).initiateGroupCall();
              setActiveCallPeer({
                id: 'GROUP_CALL',
                name: '🚨 ALL EMERGENCY NODES (GROUP CALL)',
                hopCount: 1,
                isGroupCall: true,
              });
            }}
            onBack={() => setCurrentTab('status')}
          />
        )}

        {currentTab === 'directives' && (
          <GuidelinesScreen
            onBack={() => setCurrentTab('status')}
          />
        )}
      </View>

      <RedZoneAlertOverlay
        visible={showRedAlertOverlay}
        zoneName={forcedSiren?.zoneName || prediction?.zone_name || 'Civil Emergency Hazard Zone'}
        floodProbability={forcedSiren ? 88.5 : prediction?.flood_probability_percent || 80.0}
        triggerReason={forcedSiren?.message || prediction?.primary_trigger || 'Civil Defense Emergency Siren Dispatched by NDRF / SDMA'}
        onTriggerSOS={() => {
          handleSOSTrigger('TRAPPED');
          setShowRedAlertOverlay(false);
        }}
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
    backgroundColor: '#F8F9F5',
  },
  screenBody: {
    flex: 1,
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
