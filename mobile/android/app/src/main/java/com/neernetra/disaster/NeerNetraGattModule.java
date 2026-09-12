package com.neernetra.disaster;

import android.bluetooth.*;
import android.bluetooth.le.*;
import android.content.Context;
import android.os.ParcelUuid;
import android.util.Log;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.*;

/**
 * NeerNetraGattModule
 * ====================
 * Native Android module that runs the BLE GATT Server (peripheral mode).
 * This makes the phone discoverable by other NeerNetra phones as a BLE peripheral.
 *
 * How it works:
 *  1. Creates a GATT Server with NeerNetra service UUID
 *  2. Adds two characteristics: WRITE (incoming) + NOTIFY (outgoing)
 *  3. Starts BLE advertising so other phones can find this one
 *  4. When another phone writes to our WRITE characteristic → fires JS event
 *  5. JS can call `notifyAllClients(data)` to send data to all connected centrals
 */
public class NeerNetraGattModule extends ReactContextBaseJavaModule {

    private static final String TAG = "NeerNetraGATT";

    // ── NeerNetra UUIDs (must match bluetoothMesh.ts) ───────────────────────
    private static final UUID NEERNETRA_SERVICE_UUID =
        UUID.fromString("4E656572-4E65-7472-6100-000000000001");
    private static final UUID WRITE_CHAR_UUID =
        UUID.fromString("4E656572-4E65-7472-6100-000000000002");
    private static final UUID NOTIFY_CHAR_UUID =
        UUID.fromString("4E656572-4E65-7472-6100-000000000003");
    private static final UUID CLIENT_CONFIG_UUID =
        UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    private BluetoothManager bluetoothManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothGattServer gattServer;
    private BluetoothLeAdvertiser advertiser;
    private BluetoothGattCharacteristic notifyCharacteristic;

    private final List<BluetoothDevice> connectedCentrals = new ArrayList<>();
    private boolean isRunning = false;

    public NeerNetraGattModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "NeerNetraGatt";
    }

    // ── Start GATT Server + BLE Advertising ──────────────────────────────────
    @ReactMethod
    public void startGattServer(String deviceName, Promise promise) {
        if (isRunning) {
            promise.resolve("Already running");
            return;
        }

        try {
            Context ctx = getReactApplicationContext();
            bluetoothManager = (BluetoothManager) ctx.getSystemService(Context.BLUETOOTH_SERVICE);
            bluetoothAdapter = bluetoothManager.getAdapter();

            if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
                promise.reject("BT_DISABLED", "Bluetooth is not enabled");
                return;
            }

            // ── Create GATT Server ────────────────────────────────────────────
            gattServer = bluetoothManager.openGattServer(ctx, gattServerCallback);

            BluetoothGattService service =
                new BluetoothGattService(NEERNETRA_SERVICE_UUID,
                    BluetoothGattService.SERVICE_TYPE_PRIMARY);

            // WRITE characteristic (other phones write messages to us)
            BluetoothGattCharacteristic writeChar = new BluetoothGattCharacteristic(
                WRITE_CHAR_UUID,
                BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE |
                BluetoothGattCharacteristic.PROPERTY_WRITE,
                BluetoothGattCharacteristic.PERMISSION_WRITE
            );

            // NOTIFY characteristic (we push messages to connected phones)
            notifyCharacteristic = new BluetoothGattCharacteristic(
                NOTIFY_CHAR_UUID,
                BluetoothGattCharacteristic.PROPERTY_NOTIFY |
                BluetoothGattCharacteristic.PROPERTY_INDICATE,
                BluetoothGattCharacteristic.PERMISSION_READ
            );

            BluetoothGattDescriptor cccd = new BluetoothGattDescriptor(
                CLIENT_CONFIG_UUID,
                BluetoothGattDescriptor.PERMISSION_READ |
                BluetoothGattDescriptor.PERMISSION_WRITE
            );
            cccd.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
            notifyCharacteristic.addDescriptor(cccd);

            service.addCharacteristic(writeChar);
            service.addCharacteristic(notifyCharacteristic);
            gattServer.addService(service);

            Log.d(TAG, "GATT Server started with NeerNetra service");

            // ── Start BLE Advertising ─────────────────────────────────────────
            startAdvertising(deviceName);

            isRunning = true;
            promise.resolve("GATT server started — advertising as: " + deviceName);

        } catch (Exception e) {
            Log.e(TAG, "Failed to start GATT server", e);
            promise.reject("GATT_ERROR", e.getMessage());
        }
    }

    private void startAdvertising(String name) {
        advertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
        if (advertiser == null) {
            Log.w(TAG, "BLE advertising not supported on this device");
            return;
        }

        try {
            if (name != null && !name.isEmpty()) {
                String safeName = name.length() > 24 ? name.substring(0, 24) : name;
                bluetoothAdapter.setName(safeName);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not set Bluetooth adapter name: " + e.getMessage());
        }

        AdvertiseSettings settings = new AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setConnectable(true)
            .setTimeout(0) // never stop
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .build();

        // 1. Primary advertisement packet: contains 128-bit Service UUID (18 bytes <= 31 bytes)
        AdvertiseData data = new AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .addServiceUuid(new ParcelUuid(NEERNETRA_SERVICE_UUID))
            .build();

        // 2. Scan response packet: carries device name without overflowing 31-byte advertising limit
        AdvertiseData scanResponse = new AdvertiseData.Builder()
            .setIncludeDeviceName(true)
            .build();

        advertiser.startAdvertising(settings, data, scanResponse, advertiseCallback);
        Log.d(TAG, "BLE advertising started — discoverable to other NeerNetra phones (UUID + ScanResponse)");
    }

    // ── Send data to ALL currently connected central devices ─────────────────
    @ReactMethod
    public void notifyAllClients(String base64Data, Promise promise) {
        if (!isRunning || notifyCharacteristic == null) {
            promise.reject("NOT_RUNNING", "GATT server not started");
            return;
        }

        byte[] data = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
        notifyCharacteristic.setValue(data);

        int notified = 0;
        synchronized (connectedCentrals) {
            for (BluetoothDevice device : connectedCentrals) {
                boolean sent = gattServer.notifyCharacteristicChanged(
                    device, notifyCharacteristic, false);
                if (sent) notified++;
            }
        }

        Log.d(TAG, "Notified " + notified + " connected centrals");
        promise.resolve(notified);
    }

    // ── Stop GATT Server + Advertising ───────────────────────────────────────
    @ReactMethod
    public void stopGattServer(Promise promise) {
        try {
            if (advertiser != null) advertiser.stopAdvertising(advertiseCallback);
            if (gattServer != null) gattServer.close();
            isRunning = false;
            connectedCentrals.clear();
            Log.d(TAG, "GATT Server stopped");
            promise.resolve("Stopped");
        } catch (Exception e) {
            promise.reject("STOP_ERROR", e.getMessage());
        }
    }

    // ── GATT Server Callbacks ─────────────────────────────────────────────────
    private final BluetoothGattServerCallback gattServerCallback = new BluetoothGattServerCallback() {

        @Override
        public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                Log.d(TAG, "Central connected: " + device.getAddress());
                synchronized (connectedCentrals) {
                    if (!connectedCentrals.contains(device)) {
                        connectedCentrals.add(device);
                    }
                }
                sendEvent("onCentralConnected", device.getAddress());
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                Log.d(TAG, "Central disconnected: " + device.getAddress());
                synchronized (connectedCentrals) {
                    connectedCentrals.remove(device);
                }
                sendEvent("onCentralDisconnected", device.getAddress());
            }
        }

        @Override
        public void onCharacteristicWriteRequest(BluetoothDevice device,
                int requestId, BluetoothGattCharacteristic characteristic,
                boolean preparedWrite, boolean responseNeeded,
                int offset, byte[] value) {

            if (characteristic.getUuid().equals(WRITE_CHAR_UUID)) {
                String base64 = android.util.Base64.encodeToString(value, android.util.Base64.DEFAULT);
                Log.d(TAG, "Received packet from " + device.getAddress() + " (" + value.length + " bytes)");

                // Send to JS
                WritableMap params = Arguments.createMap();
                params.putString("fromDevice", device.getAddress());
                params.putString("data", base64);
                sendEventMap("onPacketReceived", params);
            }

            if (responseNeeded) {
                gattServer.sendResponse(device, requestId,
                    BluetoothGatt.GATT_SUCCESS, 0, null);
            }
        }

        @Override
        public void onDescriptorWriteRequest(BluetoothDevice device, int requestId,
                BluetoothGattDescriptor descriptor, boolean preparedWrite,
                boolean responseNeeded, int offset, byte[] value) {
            if (responseNeeded) {
                gattServer.sendResponse(device, requestId,
                    BluetoothGatt.GATT_SUCCESS, 0, null);
            }
        }

        @Override
        public void onServiceAdded(int status, BluetoothGattService service) {
            Log.d(TAG, "NeerNetra GATT service added, status=" + status);
        }
    };

    // ── Advertise Callback ────────────────────────────────────────────────────
    private final AdvertiseCallback advertiseCallback = new AdvertiseCallback() {
        @Override
        public void onStartSuccess(AdvertiseSettings settings) {
            Log.d(TAG, "BLE advertising started successfully");
            sendEvent("onAdvertisingStarted", "success");
        }

        @Override
        public void onStartFailure(int errorCode) {
            Log.e(TAG, "BLE advertising failed: " + errorCode);
            sendEvent("onAdvertisingFailed", String.valueOf(errorCode));
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    private void sendEvent(String eventName, String data) {
        try {
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, data);
        } catch (Exception ignored) {}
    }

    private void sendEventMap(String eventName, WritableMap data) {
        try {
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, data);
        } catch (Exception ignored) {}
    }
}
