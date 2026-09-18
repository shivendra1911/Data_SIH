/**
 * NeerNetra GATT Server JS Bridge
 * =================================
 * Calls the native Android NeerNetraGattModule via NativeModules.
 * This runs the phone as a BLE Peripheral (GATT Server + Advertiser)
 * and handles native hardware audio recording and speaker playback.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

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
  onCentralDisconnected?: (clientAddress: string) => void
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

    return true;
  } catch (err: any) {
    console.warn('[GattBridge] Failed to start GATT server:', err?.message);
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

