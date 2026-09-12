/**
 * NeerNetra BLE Advertiser Service
 * ==================================
 * Runs the Android BLE GATT Server + BLE Peripheral Advertiser.
 * This makes the phone DISCOVERABLE to other NeerNetra phones.
 *
 * Uses react-native-ble-advertiser for Android BLE advertising.
 * 
 * Call `startAdvertising(deviceName)` on app launch.
 * Call `stopAdvertising()` on app background/close.
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { NEERNETRA_SERVICE_UUID } from './bluetoothMesh';

// react-native-ble-advertiser exposes BLEAdvertiser
let BLEAdvertiser: any = null;
try {
  const mod = require('react-native-ble-advertiser');
  BLEAdvertiser = mod?.default || mod || NativeModules.BLEAdvertiser;
} catch (e) {
  console.warn('[BLEAdvertiser] react-native-ble-advertiser not available in this environment');
}

let isAdvertising = false;

/**
 * Start advertising this phone as a NeerNetra BLE peripheral.
 * Other phones scanning for NEERNETRA_SERVICE_UUID will find this phone.
 */
export const startBLEAdvertising = async (deviceName: string): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    console.log('[BLEAdvertiser] Advertising only supported on Android');
    return false;
  }
  if (!BLEAdvertiser) {
    console.warn('[BLEAdvertiser] Module not available');
    return false;
  }
  if (isAdvertising) return true;

  try {
    // Use company ID 0xFFFF (generic) with NeerNetra identifier
    BLEAdvertiser.setCompanyId(0xFFFF);

    await BLEAdvertiser.broadcast(
      NEERNETRA_SERVICE_UUID,
      [0x4E, 0x65, 0x65, 0x72], // 'Neer' in ASCII as manufacturer data
      {
        advertiseMode: BLEAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
        txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_HIGH,
        connectable: true,
        includeDeviceName: false,
        includeTxPowerLevel: false,
      }
    );

    isAdvertising = true;
    console.log(`[BLEAdvertiser] Now advertising as "${deviceName}" with NeerNetra service UUID`);
    return true;
  } catch (err: any) {
    console.warn('[BLEAdvertiser] Failed to start advertising:', err?.message);
    return false;
  }
};

/**
 * Stop BLE advertising (call when app goes to background or exits)
 */
export const stopBLEAdvertising = async (): Promise<void> => {
  if (!BLEAdvertiser || !isAdvertising) return;
  try {
    await BLEAdvertiser.stopBroadcast();
    isAdvertising = false;
    console.log('[BLEAdvertiser] Advertising stopped');
  } catch (err: any) {
    console.warn('[BLEAdvertiser] Failed to stop advertising:', err?.message);
  }
};

export const isCurrentlyAdvertising = () => isAdvertising;
