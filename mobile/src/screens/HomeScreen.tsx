import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ShieldAlert, Map, Radio, Landmark } from 'lucide-react-native';

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
import { startRedZoneDangerTimer, markUserAsSafeConfirmed, stopDangerTimer } from '../services/dangerEscalation';
import { startBLEAdvertising } from '../services/bleAdvertiser';
import { getCurrentDeviceLocation } from '../services/locationService';
import { mobileSirenListener } from '../services/mobileSirenListener';

// Components
import { MeshStatusBadge } from '../components/MeshStatusBadge';
import { RedZoneAlertOverlay } from '../components/RedZoneAlertOverlay';
import { SafeConfirmationCountdown } from '../components/SafeConfirmationCountdown';
import { GuidelineBar } from '../components/GuidelineBar';
import { SOSFAB } from '../components/SOSFAB';
import { IncomingCallModal } from '../components/IncomingCallModal';
import { ActiveCallHUD } from '../components/ActiveCallHUD';

// Screens
import { StatusScreen } from './StatusScreen';
import { MeshScreen } from './MeshScreen';
import { MapScreen } from './MapScreen';
import { GuidelinesScreen } from './GuidelinesScreen';

const Tab = createBottomTabNavigator();
const DEVICE_UUID_KEY = '@neernetra_device_uuid_v1';

export const HomeScreen: React.FC = () => {
  const [prediction, setPrediction] = useState<ZonePrediction | null>(null);
  const [deviceUuid, setDeviceUuid] = useState<string>('uuid-device-node-1');
  const [networkMode, setNetworkMode] = useState<NetworkMode>('ONLINE');
  const [peerCount, setPeerCount] = useState<number>(3);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastLocation, setLastLocation] = useState<LocationSyncPayload | null>(null);
  const [showRedAlertOverlay, setShowRedAlertOverlay] = useState<boolean>(false);
  const [remainingCountdown, setRemainingCountdown] = useState<number | null>(null);
  const [sosStatus, setSosStatus] = useState<'SOS' | 'SAFE' | 'HELPING' | null>(null);
  const [forcedSiren, setForcedSiren] = useState<{ active: boolean; message?: string; zoneName?: string } | null>(null);

  // BLE Intercom / Calling States
  const [incomingCaller, setIncomingCaller] = useState<{
    id: string;
    name: string;
    distance?: number;
    hopCount?: number;
  } | null>(null);
  const [activeCallPeer, setActiveCallPeer] = useState<{
    id: string;
    name: string;
    distance?: number;
    hopCount?: number;
  } | null>(null);

  const isRedZone =
    Boolean(forcedSiren?.active) ||
    prediction?.alert_color === 'RED' ||
    (prediction?.flood_probability_percent !== undefined && prediction.flood_probability_percent > 60) ||
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

      const bleOk = await bleEngine.init(storedUuid, 'Citizen');
      if (bleOk) {
        await startBLEAdvertising('NeerNetra_' + storedUuid.substring(4, 10));
        bleEngine.onPeersChanged = (peers) => setPeerCount(peers.length);
        bleEngine.onIncomingCall = (caller) => {
          setIncomingCaller(caller);
        };
        bleEngine.onCallAnswered = (peerId) => {
          const peer = bleEngine.getConnectedPeers().find((p) => p.id === peerId);
          setActiveCallPeer({
            id: peerId,
            name: peer?.name || 'Citizen Node',
            distance: peer?.distanceMeters || 15,
            hopCount: 1,
          });
        };
        bleEngine.onCallDeclined = () => {
          setIncomingCaller(null);
          setActiveCallPeer(null);
        };
        bleEngine.onCallEnded = () => {
          setActiveCallPeer(null);
        };
        bleEngine.onStateChange = (state) => {
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

      if (data.alert_color === 'RED' && data.flood_probability_percent > 75.0) {
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

    const payload: SOSPayload = {
      device_uuid: deviceUuid,
      lat: lat || 27.6015,
      lng: lng || 77.5975,
      status: 'SOS',
      sos_type: type,
      is_mesh_relayed: networkMode === 'BLE_MESH',
      timestamp: new Date().toISOString(),
    };
    if (networkMode !== 'BLE_MESH') {
      await sendSOSPayload(payload);
    } else {
      await meshEngine.broadcastMultiHopSOS(payload);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCaller) return;
    await bleEngine.acceptCall(incomingCaller.id);
    setActiveCallPeer(incomingCaller);
    setIncomingCaller(null);
  };

  const handleDeclineCall = async () => {
    if (!incomingCaller) return;
    await bleEngine.declineCall(incomingCaller.id);
    setIncomingCaller(null);
  };

  const handleEndActiveCall = async () => {
    if (!activeCallPeer) return;
    await bleEngine.endCall(activeCallPeer.id);
    setActiveCallPeer(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#eaebe5" />
      
      <GuidelineBar />

      {forcedSiren?.active && (
        <View style={styles.forcedSirenBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>🚨</Text>
            <Text style={styles.forcedSirenTitle}>CIVIL DEFENSE SIREN BROADCAST</Text>
          </View>
          <Text style={styles.forcedSirenMsg}>
            {forcedSiren.message || 'National Disaster Force / SDMA has triggered an audible emergency siren for your sector.'}
          </Text>
          <TouchableOpacity
            style={styles.silenceBtn}
            activeOpacity={0.8}
            onPress={() => {
              mobileSirenListener.silenceAlarm();
              setForcedSiren(null);
              setShowRedAlertOverlay(false);
              handleConfirmSafe(false);
            }}
          >
            <Text style={styles.silenceBtnText}>SILENCE ALARM & CONFIRM SAFE</Text>
          </TouchableOpacity>
        </View>
      )}

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
            tabBarActiveTintColor: '#0284c7',
            tabBarInactiveTintColor: '#64748b',
            tabBarStyle: styles.tabBar,
          }}
        >
          <Tab.Screen 
            name="Status" 
            options={{ tabBarIcon: ({ color, size }) => <ShieldAlert color={color} size={size} /> }}
          >
            {() => <StatusScreen prediction={prediction} />}
          </Tab.Screen>
          
          <Tab.Screen 
            name="Map" 
            options={{ tabBarIcon: ({ color, size }) => <Map color={color} size={size} /> }}
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
            options={{ tabBarIcon: ({ color, size }) => <Radio color={color} size={size} /> }}
          >
            {() => <MeshScreen peers={meshEngine.getConnectedPeers()} isDisasterConfirmed={isRedZone} />}
          </Tab.Screen>

          <Tab.Screen 
            name="Guidelines" 
            options={{
              tabBarLabel: 'Directives',
              tabBarIcon: ({ color, size }) => <Landmark color={color} size={size} />
            }}
          >
            {() => <GuidelinesScreen />}
          </Tab.Screen>
        </Tab.Navigator>

        <SOSFAB 
          onSOSTrigger={handleSOSTrigger}
          onConfirmSafe={handleConfirmSafe}
          currentStatus={sosStatus}
        />
      </NavigationContainer>

      <IncomingCallModal
        visible={!!incomingCaller}
        caller={incomingCaller}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />

      <RedZoneAlertOverlay
        visible={showRedAlertOverlay}
        prediction={prediction}
        lastLocation={lastLocation}
        onTriggerSOS={() => {
          setShowRedAlertOverlay(false);
          handleSOSTrigger('TRAPPED');
        }}
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
  tabBar: {
    height: 60,
    paddingBottom: 5,
    paddingTop: 5,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  forcedSirenBanner: {
    backgroundColor: '#b91c1c',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#fca5a5',
    elevation: 6,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  forcedSirenTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  forcedSirenMsg: {
    color: '#fee2e2',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    fontWeight: '500',
    lineHeight: 16,
  },
  silenceBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  silenceBtnText: {
    color: '#b91c1c',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
