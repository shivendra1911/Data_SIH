/**
 * NeerNetra GATT Server JS Bridge
 * =================================
 * Calls the native Android NeerNetraGattModule via NativeModules.
 * This runs the phone as a BLE Peripheral (GATT Server + Advertiser)
 * and handles native hardware audio recording and speaker playback.
 */

import { NativeModules, NativeEventEmitter, Platform, DeviceEventEmitter } from 'react-native';

const { NeerNetraGatt } = NativeModules;

let emitter: NativeEventEmitter | null = null;
let packetListener: any = null;

/**
 * Start the GATT Server (Peripheral Mode).
 * Makes this phone discoverable to other NeerNetra phones over BLE.
 *
 * @param deviceName - Shown in BLE scan results of other phones
 * @param onPacketReceived - Called when another phone writes data to us
 */
export const startGattServer = async (
  deviceName: string,
  onPacketReceived: (fromDevice: string, base64Data: string) => void,
  onCentralConnected?: (clientAddress: string) => void,
  onCentralDisconnected?: (clientAddress: string) => void,
  onNativePeerFound?: (deviceId: string, deviceName: string, rssi: number, hopCount?: number, distanceMeters?: number) => void
): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  if (!NeerNetraGatt) {
    console.warn('[GattBridge] NeerNetraGatt native module not found. Is android/ built?');
    return false;
  }

  try {
    const result = await NeerNetraGatt.startGattServer(deviceName);
    console.log('[GattBridge] GATT Server started:', result);

    if (!emitter) {
      emitter = new NativeEventEmitter(NeerNetraGatt);
    }

    if (packetListener) {
      packetListener.remove();
    }

    packetListener = emitter.addListener('onPacketReceived', (event: { fromDevice: string; data: string }) => {
      console.log(`[GattBridge] Packet from central ${event.fromDevice}`);
      onPacketReceived(event.fromDevice, event.data);
    });

    emitter.addListener('onCentralConnected', (address: string) => {
      console.log(`[GattBridge] Central connected to our server: ${address}`);
      if (onCentralConnected) onCentralConnected(address);
    });

    emitter.addListener('onCentralDisconnected', (address: string) => {
      console.log(`[GattBridge] Central disconnected from our server: ${address}`);
      if (onCentralDisconnected) onCentralDisconnected(address);
    });

    // Native background scanner found a NeerNetra peer (fires even when JS BLE scanner is throttled)
    emitter.addListener('onNativePeerFound', (peer: { id: string; name: string; rssi: number; hopCount?: number; distanceMeters?: number }) => {
      if (onNativePeerFound) onNativePeerFound(peer.id, peer.name, peer.rssi, peer.hopCount, peer.distanceMeters);
    });

    // Native audio burst received directly via high-speed UDP 8765 or BLE GATT
    emitter.addListener('onNativeVoiceBurstReceived', (event: { senderId: string; senderName?: string; audio: string; isGroupCall?: boolean }) => {
      try {
        DeviceEventEmitter.emit('NEERNETRA_VOICE_BURST', event);
      } catch {}
    });

    return true;
  } catch (err: any) {
    console.warn('[GattBridge] Failed to start GATT server:', err?.message);
    return false;
  }
};

export const setLocalNodeId = async (nodeId: string): Promise<boolean> => {
  if (Platform.OS !== 'android' || !NeerNetraGatt?.setLocalNodeId) return false;
  try {
    return await NeerNetraGatt.setLocalNodeId(nodeId);
  } catch {
    return false;
  }
};

/**
 * Get all known peers and background-discovered peers from the native routing table.
 */
export const getKnownPeers = async (): Promise<any[]> => {
  if (Platform.OS !== 'android' || !NeerNetraGatt?.getKnownPeers) return [];
  try {
    const list = await NeerNetraGatt.getKnownPeers();
    return Array.isArray(list) ? list : [];
  } catch (err: any) {
    console.warn('[GattBridge] getKnownPeers error:', err?.message);
    return [];
  }
};

/**
 * Purge test / simulation peers from native routing table and SharedPreferences.
 */
export const clearTestPeers = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !NeerNetraGatt?.clearTestPeers) return false;
  try {
    return await NeerNetraGatt.clearTestPeers();
  } catch (err: any) {
    console.warn('[GattBridge] clearTestPeers error:', err?.message);
    return false;
  }
};

/**
 * Clear all peers from native routing table and SharedPreferences.
 */
export const clearAllPeers = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !NeerNetraGatt?.clearAllPeers) return false;
  try {
    return await NeerNetraGatt.clearAllPeers();
  } catch (err: any) {
    console.warn('[GattBridge] clearAllPeers error:', err?.message);
    return false;
  }
};

/**
 * Send data to ALL phones currently connected to our GATT Server.
 * This is how we push updates/messages to phones that found us via BLE.
 */
export const notifyAllCentrals = async (base64Data: string): Promise<number> => {
  if (!NeerNetraGatt) return 0;
  try {
    const count = await NeerNetraGatt.notifyAllClients(base64Data);
    return count as number;
  } catch (err: any) {
    console.warn('[GattBridge] notifyAllClients failed:', err?.message);
    return 0;
  }
};

/**
 * Triggers an explicit long-range Wi-Fi Direct / Local Hotspot call burst (up to 250m)
 */
export const triggerWifiDirectCall = async (targetNodeId: string, callerName?: string): Promise<boolean> => {
  if (!NeerNetraGatt?.triggerWifiDirectCall) return false;
  try {
    return await NeerNetraGatt.triggerWifiDirectCall(targetNodeId, callerName || 'Citizen Node');
  } catch (err: any) {
    console.warn('[GattBridge] triggerWifiDirectCall error:', err?.message);
    return false;
  }
};

export const broadcastWifiBeacon = async (): Promise<boolean> => {
  if (!NeerNetraGatt?.broadcastWifiBeacon) return false;
  try {
    return await NeerNetraGatt.broadcastWifiBeacon();
  } catch {
    return false;
  }
};

/**
 * Triggers an explicit long-range Wi-Fi Direct / Local Hotspot message burst (up to 250m)
 */
export const triggerWifiDirectMessage = async (targetNodeId: string, messageText: string): Promise<boolean> => {
  if (!NeerNetraGatt?.triggerWifiDirectMessage) return false;
  try {
    return await NeerNetraGatt.triggerWifiDirectMessage(targetNodeId, messageText);
  } catch (err: any) {
    console.warn('[GattBridge] triggerWifiDirectMessage error:', err?.message);
    return false;
  }
};

/**
 * Triggers an explicit long-range Wi-Fi Direct voice burst (up to 250m)
 */
export const triggerWifiDirectVoiceBurst = async (
  targetNodeId: string,
  base64Audio: string,
  isGroupCall: boolean = false
): Promise<boolean> => {
  if (!NeerNetraGatt?.triggerWifiDirectVoiceBurst) return false;
  try {
    return await NeerNetraGatt.triggerWifiDirectVoiceBurst(targetNodeId, base64Audio, isGroupCall);
  } catch (err: any) {
    console.warn('[GattBridge] triggerWifiDirectVoiceBurst error:', err?.message);
    return false;
  }
};

/**
 * Native Voice Walkie-Talkie Recording:
 * Records hardware microphone audio compressed to AMR-NB 8kHz (~1.2 KB/sec)
 */
export const startVoiceRecording = async (): Promise<boolean> => {
  if (!NeerNetraGatt?.startVoiceRecording) return false;
  try {
    return await NeerNetraGatt.startVoiceRecording();
  } catch (err: any) {
    console.warn('[GattBridge] startVoiceRecording error:', err?.message);
    return false;
  }
};

export const stopVoiceRecording = async (): Promise<string> => {
  if (!NeerNetraGatt?.stopVoiceRecording) return '';
  try {
    const base64Audio = await NeerNetraGatt.stopVoiceRecording();
    return base64Audio || '';
  } catch (err: any) {
    console.warn('[GattBridge] stopVoiceRecording error:', err?.message);
    return '';
  }
};

/**
 * Native Voice Playback:
 * Plays incoming compressed audio directly out of the phone speaker
 */
export const playVoiceAudio = async (base64Audio: string): Promise<boolean> => {
  if (!NeerNetraGatt?.playVoiceAudio) return false;
  try {
    return await NeerNetraGatt.playVoiceAudio(base64Audio);
  } catch (err: any) {
    console.warn('[GattBridge] playVoiceAudio error:', err?.message);
    return false;
  }
};

export const stopVoiceAudio = async (): Promise<boolean> => {
  if (!NeerNetraGatt?.stopVoiceAudio) return false;
  try {
    return await NeerNetraGatt.stopVoiceAudio();
  } catch {
    return false;
  }
};

export const playPttTone = async (type: 'start' | 'beep' | 'roger' | 'incoming' = 'beep'): Promise<boolean> => {
  if (!NeerNetraGatt?.playPttTone) return false;
  try {
    return await NeerNetraGatt.playPttTone(type);
  } catch {
    return false;
  }
};

/**
 * Stop the GATT Server and BLE Advertising.
 */
export const stopGattServer = async (): Promise<void> => {
  if (!NeerNetraGatt) return;
  try {
    if (packetListener) {
      packetListener.remove();
      packetListener = null;
    }
    await NeerNetraGatt.stopGattServer();
    console.log('[GattBridge] GATT Server stopped');
  } catch (err: any) {
    console.warn('[GattBridge] Stop failed:', err?.message);
  }
};

/**
 * 24/7 Background Foreground Service Controls
 */
export const startMeshForegroundService = async (): Promise<boolean> => {
  if (!NeerNetraGatt?.startMeshForegroundService) return false;
  try {
    return await NeerNetraGatt.startMeshForegroundService();
  } catch (err: any) {
    console.warn('[GattBridge] startMeshForegroundService error:', err?.message);
    return false;
  }
};

export const stopMeshForegroundService = async (): Promise<boolean> => {
  if (!NeerNetraGatt?.stopMeshForegroundService) return false;
  try {
    return await NeerNetraGatt.stopMeshForegroundService();
  } catch (err: any) {
    console.warn('[GattBridge] stopMeshForegroundService error:', err?.message);
    return false;
  }
};

/**
 * Immediately dismiss the IncomingCallActivity on this device.
 * Call when ending or declining a call to avoid the 20-second hang-up delay.
 */
export const dismissIncomingCall = async (): Promise<boolean> => {
  if (!NeerNetraGatt?.dismissIncomingCall) return false;
  try {
    return await NeerNetraGatt.dismissIncomingCall();
  } catch {
    return false;
  }
};

/**
 * Screen Wake-Up & Full-Screen Intent Invocation
 */
export const wakeUpScreenAndShowCall = async (
  callerName: string,
  isGroupCall: boolean,
  callerId: string
): Promise<boolean> => {
  if (!NeerNetraGatt?.wakeUpScreenAndShowCall) return false;
  try {
    return await NeerNetraGatt.wakeUpScreenAndShowCall(callerName, isGroupCall, callerId);
  } catch (err: any) {
    console.warn('[GattBridge] wakeUpScreenAndShowCall error:', err?.message);
    return false;
  }
};

export const triggerNativeSosAlert = async (
  senderName: string,
  message: string,
  lat: number,
  lng: number
): Promise<boolean> => {
  if (!NeerNetraGatt?.triggerNativeSosAlert) return false;
  try {
    return await NeerNetraGatt.triggerNativeSosAlert(senderName, message, lat, lng);
  } catch (err: any) {
    console.warn('[GattBridge] triggerNativeSosAlert error:', err?.message);
    return false;
  }
};

export const getPendingEmergencyIntent = async (): Promise<any> => {
  if (!NeerNetraGatt?.getPendingEmergencyIntent) return null;
  try {
    return await NeerNetraGatt.getPendingEmergencyIntent();
  } catch {
    return null;
  }
};

export const clearPendingEmergencyIntent = async (): Promise<boolean> => {
  if (!NeerNetraGatt?.clearPendingEmergencyIntent) return false;
  try {
    return await NeerNetraGatt.clearPendingEmergencyIntent();
  } catch {
    return false;
  }
};

export const subscribeToEmergencyWakeUp = (
  callback: (event: {
    emergency_type: string;
    caller_name?: string;
    is_group_call?: boolean;
    caller_id?: string;
    title?: string;
    message?: string;
  }) => void
) => {
  if (Platform.OS !== 'android' || !NeerNetraGatt) return () => {};
  if (!emitter) {
    emitter = new NativeEventEmitter(NeerNetraGatt);
  }
  const sub = emitter.addListener('onEmergencyWakeUp', callback);
  return () => sub.remove();
};

export const showNativeChatNotification = async (senderName: string, messageText: string): Promise<boolean> => {
  if (Platform.OS !== 'android' || !NeerNetraGatt?.showChatNotification) return false;
  try {
    return await NeerNetraGatt.showChatNotification(senderName, messageText);
  } catch {
    return false;
  }
};

export const setLowPowerBeaconMode = async (enable: boolean): Promise<boolean> => {
  if (Platform.OS !== 'android' || !NeerNetraGatt?.setLowPowerBeaconMode) return false;
  try {
    return await NeerNetraGatt.setLowPowerBeaconMode(enable);
  } catch {
    return false;
  }
};

export interface HardwareSensorStatus {
  accelerometer: boolean;
  accelerometerName: string;
  gyroscope: boolean;
  gyroscopeName: string;
  barometer: boolean;
  barometerName: string;
  isBackgroundMonitoringActive: boolean;
  nativeCollapseSentinelActive: boolean;
  nativeLandslideSentinelActive: boolean;
  lastVectorMagnitudeG?: number;
  lastGyroOmega?: number;
  lastPressureHpa?: number;
}

export const getHardwareSensorStatus = async (): Promise<HardwareSensorStatus | null> => {
  if (Platform.OS !== 'android' || !NeerNetraGatt?.getHardwareSensorStatus) return null;
  try {
    return await NeerNetraGatt.getHardwareSensorStatus();
  } catch {
    return null;
  }
};

export const subscribeToNativeCollapse = (
  callback: (event: { peakG: number; freeFallDurationMs: number; timestamp: number }) => void
) => {
  if (Platform.OS !== 'android' || !NeerNetraGatt) return () => {};
  if (!emitter) {
    emitter = new NativeEventEmitter(NeerNetraGatt);
  }
  const sub = emitter.addListener('onNativeCollapseDetected', callback);
  return () => sub.remove();
};

export const subscribeToNativeLandslide = (
  callback: (event: { tremorG: number; durationMs: number; timestamp: number }) => void
) => {
  if (Platform.OS !== 'android' || !NeerNetraGatt) return () => {};
  if (!emitter) {
    emitter = new NativeEventEmitter(NeerNetraGatt);
  }
  const sub = emitter.addListener('onNativeLandslideDetected', callback);
  return () => sub.remove();
};

export const subscribeToNativeStorm = (
  callback: (event: { dropHpa: number; currentHpa: number; timestamp: number }) => void
) => {
  if (Platform.OS !== 'android' || !NeerNetraGatt) return () => {};
  if (!emitter) {
    emitter = new NativeEventEmitter(NeerNetraGatt);
  }
  const sub = emitter.addListener('onNativeStormDetected', callback);
  return () => sub.remove();
};

export const subscribeToNativeSensorUpdates = (
  callback: (event: { lastVectorMagnitudeG: number; lastGyroOmega: number; lastPressureHpa: number; timestamp: number }) => void
) => {
  if (Platform.OS !== 'android' || !NeerNetraGatt) return () => {};
  if (!emitter) {
    emitter = new NativeEventEmitter(NeerNetraGatt);
  }
  const sub = emitter.addListener('onHardwareSensorUpdate', callback);
  return () => sub.remove();
};

export const isIgnoringBatteryOptimizations = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !NeerNetraGatt?.isIgnoringBatteryOptimizations) return true;
  try {
    return await NeerNetraGatt.isIgnoringBatteryOptimizations();
  } catch {
    return false;
  }
};

export const requestIgnoreBatteryOptimizations = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !NeerNetraGatt?.requestIgnoreBatteryOptimizations) return true;
  try {
    return await NeerNetraGatt.requestIgnoreBatteryOptimizations();
  } catch {
    return false;
  }
};

export const openUnusedAppRestrictionsSettings = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !NeerNetraGatt?.openUnusedAppRestrictionsSettings) return true;
  try {
    return await NeerNetraGatt.openUnusedAppRestrictionsSettings();
  } catch {
    return false;
  }
};

export const getBatteryOptimizationStatus = async (): Promise<{
  isIgnoringBatteryOptimizations: boolean;
  manufacturer: string;
  model: string;
} | null> => {
  if (Platform.OS !== 'android' || !NeerNetraGatt?.getBatteryOptimizationStatus) return null;
  try {
    return await NeerNetraGatt.getBatteryOptimizationStatus();
  } catch {
    return null;
  }
};

export interface AppPermissionsStatus {
  fineLocation: boolean;
  backgroundLocation: boolean;
  recordAudio: boolean;
  bluetooth: boolean;
  nearbyWifi: boolean;
  postNotifications: boolean;
  isIgnoringBatteryOptimizations: boolean;
}

export const playAudioChunk = async (base64Chunk: string): Promise<boolean> => {
  if (!NeerNetraGatt?.playAudioChunk) return false;
  try {
    return await NeerNetraGatt.playAudioChunk(base64Chunk);
  } catch (err: any) {
    console.warn('[GattBridge] playAudioChunk error:', err?.message);
    return false;
  }
};

export const stopAudioChunkPlayback = async (): Promise<boolean> => {
  if (!NeerNetraGatt?.stopAudioChunkPlayback) return false;
  try {
    return await NeerNetraGatt.stopAudioChunkPlayback();
  } catch (err: any) {
    console.warn('[GattBridge] stopAudioChunkPlayback error:', err?.message);
    return false;
  }
};

export const startAudioCaptureStream = async (): Promise<boolean> => {
  if (!NeerNetraGatt?.startAudioCaptureStream) return false;
  try {
    return await NeerNetraGatt.startAudioCaptureStream();
  } catch (err: any) {
    console.warn('[GattBridge] startAudioCaptureStream error:', err?.message);
    return false;
  }
};

export const stopAudioCaptureStream = async (): Promise<boolean> => {
  if (!NeerNetraGatt?.stopAudioCaptureStream) return false;
  try {
    return await NeerNetraGatt.stopAudioCaptureStream();
  } catch (err: any) {
    console.warn('[GattBridge] stopAudioCaptureStream error:', err?.message);
    return false;
  }
};

export const subscribeToAudioCapture = (
  callback: (event: { chunk: string; sampleRate: number; bytesRead: number }) => void
) => {
  if (Platform.OS !== 'android' || !NeerNetraGatt) return () => {};
  if (!emitter) {
    emitter = new NativeEventEmitter(NeerNetraGatt);
  }
  const sub = emitter.addListener('onNativeAudioChunkRecorded', callback);
  return () => sub.remove();
};

export const clearNativeMessageCache = async (): Promise<boolean> => {
  if (!NeerNetraGatt?.clearMessageCache) return false;
  try {
    return await NeerNetraGatt.clearMessageCache();
  } catch {
    return false;
  }
};

export const getAppPermissionsStatus = async (): Promise<AppPermissionsStatus | null> => {
  if (Platform.OS !== 'android' || !NeerNetraGatt?.getAppPermissionsStatus) return null;
  try {
    return await NeerNetraGatt.getAppPermissionsStatus();
  } catch {
    return null;
  }
};



