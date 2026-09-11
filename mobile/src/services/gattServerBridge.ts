/**
 * NeerNetra GATT Server JS Bridge
 * =================================
 * Calls the native Android NeerNetraGattModule via NativeModules.
 * This starts the phone as a BLE Peripheral (GATT Server + Advertiser).
 *
 * Must be called ONCE on app start. Then the phone is discoverable
 * by any other NeerNetra phone scanning for NEERNETRA_SERVICE_UUID.
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
  onPacketReceived: (fromDevice: string, base64Data: string) => void
): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  if (!NeerNetraGatt) {
    console.warn('[GattBridge] NeerNetraGatt native module not found. Is android/ built?');
    return false;
  }

  try {
    const result = await NeerNetraGatt.startGattServer(deviceName);
    console.log('[GattBridge] GATT Server started:', result);

    // Listen for packets written by remote centrals
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
