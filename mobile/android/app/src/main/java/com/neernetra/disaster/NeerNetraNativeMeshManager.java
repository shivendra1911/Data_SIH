package com.neernetra.disaster;

import android.bluetooth.*;
import android.bluetooth.le.*;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.ParcelUuid;
import android.os.PowerManager;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.common.LifecycleState;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * NeerNetraNativeMeshManager
 * =========================
 * Persistent singleton manager that hosts the native BluetoothGattServer,
 * BluetoothLeAdvertiser, and BLE Scanner for the NeerNetra offline mesh.
 *
 * Runs 24/7 inside NeerNetraMeshService so incoming walkie-talkie calls and
 * SOS distress beacons are received even when the app is completely closed.
 */
public class NeerNetraNativeMeshManager {

    private static final String TAG = "NeerNetraMeshManager";

    private static final UUID NEERNETRA_SERVICE_UUID =
        UUID.fromString("4E656572-4E65-7472-6100-000000000001");
    private static final UUID NEERNETRA_16BIT_UUID =
        UUID.fromString("00004E65-0000-1000-8000-00805F9B34FB");
    private static final UUID WRITE_CHAR_UUID =
        UUID.fromString("4E656572-4E65-7472-6100-000000000002");
    private static final UUID NOTIFY_CHAR_UUID =
        UUID.fromString("4E656572-4E65-7472-6100-000000000003");
    private static final UUID CLIENT_CONFIG_UUID =
        UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    private static NeerNetraNativeMeshManager instance;
    private final Context appContext;

    private BluetoothManager bluetoothManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothGattServer gattServer;
    private BluetoothLeAdvertiser advertiser;
    private BluetoothGattCharacteristic notifyCharacteristic;

    private final List<BluetoothDevice> connectedCentrals = new ArrayList<>();
    private final Map<String, Integer> deviceMtus = new ConcurrentHashMap<>();
    private int rollingPacketId = 0;

    private final Map<String, Map<Integer, byte[]>> incomingWriteBuffers = new ConcurrentHashMap<>();
    private final Map<String, Integer> incomingWriteTotals = new ConcurrentHashMap<>();
    private final Map<String, Long> incomingWriteTimestamps = new ConcurrentHashMap<>();
    private boolean isRunning = false;

    private NeerNetraNativeMeshManager(Context context) {
        this.appContext = context.getApplicationContext();
        this.bluetoothManager = (BluetoothManager) appContext.getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager != null) {
            this.bluetoothAdapter = bluetoothManager.getAdapter();
        }
    }

    public static synchronized NeerNetraNativeMeshManager getInstance(Context context) {
        if (instance == null) {
            instance = new NeerNetraNativeMeshManager(context);
        }
        return instance;
    }

    public synchronized boolean startMeshEngine(String deviceName) {
        if (isRunning && gattServer != null) {
            Log.i(TAG, "Mesh engine already active");
            return true;
        }

        try {
            if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
                Log.w(TAG, "Bluetooth not enabled, cannot start mesh engine");
                return false;
            }

            // ── Runtime permission check (Android 12+ requires BLUETOOTH_CONNECT at runtime) ──
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                boolean hasConnect = appContext.checkSelfPermission(android.Manifest.permission.BLUETOOTH_CONNECT)
                        == android.content.pm.PackageManager.PERMISSION_GRANTED;
                if (!hasConnect) {
                    Log.w(TAG, "BLUETOOTH_CONNECT not yet granted — will retry when permission is given by user.");
                    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                        startMeshEngine(deviceName != null ? deviceName : "NeerNetra-Node");
                    }, 4000);
                    return false;
                }
            }

            // 1. Open GATT Server
            gattServer = bluetoothManager.openGattServer(appContext, gattServerCallback);
            if (gattServer == null) {
                Log.e(TAG, "openGattServer returned null");
                return false;
            }

            BluetoothGattService service = new BluetoothGattService(
                NEERNETRA_SERVICE_UUID,
                BluetoothGattService.SERVICE_TYPE_PRIMARY
            );

            BluetoothGattCharacteristic writeChar = new BluetoothGattCharacteristic(
                WRITE_CHAR_UUID,
                BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE |
                BluetoothGattCharacteristic.PROPERTY_WRITE,
                BluetoothGattCharacteristic.PERMISSION_WRITE
            );

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

            // 2. Start BLE Advertising
            startAdvertising(deviceName);

            isRunning = true;
            Log.i(TAG, "24/7 Native BLE Mesh Engine successfully started!");
            return true;

        } catch (SecurityException se) {
            Log.e(TAG, "startMeshEngine SecurityException (permission not granted yet): " + se.getMessage());
            // Auto-retry once React Native grants BLE permissions
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                startMeshEngine(deviceName != null ? deviceName : "NeerNetra-Node");
            }, 5000);
            return false;
        } catch (Exception e) {
            Log.e(TAG, "startMeshEngine exception: " + e.getMessage(), e);
            return false;
        }
    }

    private void startAdvertising(String name) {
        if (bluetoothAdapter == null) return;
        advertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
        if (advertiser == null) {
            Log.w(TAG, "BLE advertising not supported on this device");
            return;
        }

        try {
            if (name != null && !name.isEmpty()) {
                String safeName = name.length() > 14 ? name.substring(0, 14) : name;
                bluetoothAdapter.setName(safeName);
            }
        } catch (Exception ignored) {}

        AdvertiseSettings settings = new AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .setTimeout(0)
            .build();

        AdvertiseData data = new AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .addServiceUuid(new ParcelUuid(NEERNETRA_SERVICE_UUID))
            .addServiceUuid(new ParcelUuid(NEERNETRA_16BIT_UUID))
            .build();

        AdvertiseData.Builder scanBuilder = new AdvertiseData.Builder()
            .setIncludeDeviceName(true)
            .setIncludeTxPowerLevel(false);
        try {
            scanBuilder.addManufacturerData(0x4E65, new byte[] { 'N', 'E', 'E', 'R' });
        } catch (Exception ignored) {}

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                boolean hasAdv = appContext.checkSelfPermission(android.Manifest.permission.BLUETOOTH_ADVERTISE)
                        == android.content.pm.PackageManager.PERMISSION_GRANTED;
                if (!hasAdv) {
                    Log.w(TAG, "BLUETOOTH_ADVERTISE not yet granted — will advertise when permitted");
                    return;
                }
            }
            advertiser.startAdvertising(settings, data, scanBuilder.build(), advertiseCallback);
            Log.i(TAG, "Native BLE advertising started for NeerNetra");
        } catch (SecurityException se) {
            Log.w(TAG, "Advertising SecurityException: " + se.getMessage());
        } catch (Exception e) {
            Log.w(TAG, "Advertising start error: " + e.getMessage());
        }
    }

    private final AdvertiseCallback advertiseCallback = new AdvertiseCallback() {
        @Override
        public void onStartSuccess(AdvertiseSettings settingsInEffect) {
            Log.i(TAG, "BLE Advertising active 24/7 (Power: " + settingsInEffect.getTxPowerLevel() + ")");
        }

        @Override
        public void onStartFailure(int errorCode) {
            Log.w(TAG, "BLE Advertising failed with error code: " + errorCode);
        }
    };

    // ── Notify All Connected Centrals ─────────────────────────────────────────
    public int notifyAllClients(String base64Data) {
        if (!isRunning || notifyCharacteristic == null || gattServer == null) {
            return 0;
        }

        try {
            byte[] data = android.util.Base64.decode(base64Data.trim(), android.util.Base64.NO_WRAP);
            int notified = 0;
            List<BluetoothDevice> deadDevices = new ArrayList<>();

            synchronized (connectedCentrals) {
                for (BluetoothDevice device : connectedCentrals) {
                    try {
                        int devMtu = deviceMtus.containsKey(device.getAddress()) ? deviceMtus.get(device.getAddress()) : 512;
                        int maxAttrLen = Math.max(20, Math.min(509, devMtu - 3));

                        boolean sent;
                        if (data.length <= maxAttrLen) {
                            sent = sendRawNotification(device, data);
                        } else {
                            sent = sendSlicedNotification(device, data, maxAttrLen);
                        }

                        if (sent) {
                            notified++;
                        } else {
                            deadDevices.add(device);
                        }
                    } catch (Throwable t) {
                        deadDevices.add(device);
                    }
                }

                if (!deadDevices.isEmpty()) {
                    connectedCentrals.removeAll(deadDevices);
                    for (BluetoothDevice dead : deadDevices) {
                        deviceMtus.remove(dead.getAddress());
                    }
                }
            }

            return notified;
        } catch (Throwable e) {
            Log.e(TAG, "notifyAllClients error: " + e.getMessage());
            return 0;
        }
    }

    private boolean sendRawNotification(BluetoothDevice device, byte[] data) {
        if (gattServer == null || notifyCharacteristic == null || device == null) return false;
        try {
            notifyCharacteristic.setValue(data);
            if (Build.VERSION.SDK_INT >= 33) {
                return gattServer.notifyCharacteristicChanged(device, notifyCharacteristic, false, data) == 0;
            } else {
                return gattServer.notifyCharacteristicChanged(device, notifyCharacteristic, false);
            }
        } catch (Throwable t) {
            return false;
        }
    }

    private boolean sendSlicedNotification(BluetoothDevice device, byte[] data, int maxAttrLen) {
        int headerSize = 4;
        int slicePayloadSize = Math.max(64, maxAttrLen - headerSize);
        int totalSlices = (int) Math.ceil((double) data.length / slicePayloadSize);
        if (totalSlices > 255) totalSlices = 255;

        int pktId;
        synchronized (this) {
            pktId = (rollingPacketId++) & 0xFF;
        }

        for (int i = 0; i < totalSlices; i++) {
            int start = i * slicePayloadSize;
            int end = Math.min(start + slicePayloadSize, data.length);
            int len = end - start;

            byte[] chunk = new byte[headerSize + len];
            chunk[0] = (byte) 0x53;
            chunk[1] = (byte) pktId;
            chunk[2] = (byte) i;
            chunk[3] = (byte) totalSlices;
            System.arraycopy(data, start, chunk, headerSize, len);

            boolean sent = sendRawNotification(device, chunk);
            if (!sent) return false;

            if (i < totalSlices - 1) {
                try { Thread.sleep(32); } catch (InterruptedException ignored) {}
            }
        }
        return true;
    }

    // ── Incoming GATT Callbacks ───────────────────────────────────────────────
    private final BluetoothGattServerCallback gattServerCallback = new BluetoothGattServerCallback() {
        private final ByteArrayOutputStream prepareWriteBuffer = new ByteArrayOutputStream();

        @Override
        public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                Log.d(TAG, "Central connected: " + device.getAddress());
                deviceMtus.put(device.getAddress(), 512);
                synchronized (connectedCentrals) {
                    if (!connectedCentrals.contains(device)) {
                        connectedCentrals.add(device);
                    }
                }
                emitEventToReactNative("onCentralConnected", device.getAddress());
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                Log.d(TAG, "Central disconnected: " + device.getAddress());
                deviceMtus.remove(device.getAddress());
                synchronized (connectedCentrals) {
                    connectedCentrals.remove(device);
                }
                emitEventToReactNative("onCentralDisconnected", device.getAddress());
            }
        }

        @Override
        public void onMtuChanged(BluetoothDevice device, int mtu) {
            deviceMtus.put(device.getAddress(), Math.max(mtu, 512));
        }

        @Override
        public void onCharacteristicWriteRequest(BluetoothDevice device,
                int requestId, BluetoothGattCharacteristic characteristic,
                boolean preparedWrite, boolean responseNeeded,
                int offset, byte[] value) {

            if (characteristic.getUuid().equals(WRITE_CHAR_UUID)) {
                if (preparedWrite) {
                    if (value != null) prepareWriteBuffer.write(value, 0, value.length);
                    if (responseNeeded) {
                        gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value);
                    }
                    return;
                }

                if (value != null && value.length > 0) {
                    handleIncomingRawOrSlicedWrite(device.getAddress(), value);
                }
            }

            if (responseNeeded) {
                gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null);
            }
        }

        @Override
        public void onExecuteWrite(BluetoothDevice device, int requestId, boolean execute) {
            if (execute) {
                byte[] fullData = prepareWriteBuffer.toByteArray();
                prepareWriteBuffer.reset();
                if (fullData.length > 0) {
                    handleIncomingFullPacket(device.getAddress(), fullData);
                }
            } else {
                prepareWriteBuffer.reset();
            }
            gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null);
        }
    };

    private void handleIncomingRawOrSlicedWrite(String deviceAddress, byte[] value) {
        try {
            long now = System.currentTimeMillis();
            for (Map.Entry<String, Long> entry : new ArrayList<>(incomingWriteTimestamps.entrySet())) {
                if (now - entry.getValue() > 10000) {
                    incomingWriteBuffers.remove(entry.getKey());
                    incomingWriteTotals.remove(entry.getKey());
                    incomingWriteTimestamps.remove(entry.getKey());
                }
            }

            if (value.length >= 4 && value[0] == (byte) 0x53) {
                int pktId = value[1] & 0xFF;
                int seq = value[2] & 0xFF;
                int total = value[3] & 0xFF;
                String bufferKey = deviceAddress + "_" + pktId;

                Map<Integer, byte[]> buffer = incomingWriteBuffers.get(bufferKey);
                if (buffer == null) {
                    buffer = new ConcurrentHashMap<>();
                    incomingWriteBuffers.put(bufferKey, buffer);
                    incomingWriteTotals.put(bufferKey, total);
                    incomingWriteTimestamps.put(bufferKey, now);
                }

                int sliceLen = value.length - 4;
                byte[] sliceData = new byte[sliceLen];
                System.arraycopy(value, 4, sliceData, 0, sliceLen);
                buffer.put(seq, sliceData);

                if (buffer.size() >= total) {
                    ByteArrayOutputStream fullOut = new ByteArrayOutputStream();
                    for (int s = 0; s < total; s++) {
                        byte[] part = buffer.get(s);
                        if (part != null) fullOut.write(part, 0, part.length);
                    }
                    incomingWriteBuffers.remove(bufferKey);
                    incomingWriteTotals.remove(bufferKey);
                    incomingWriteTimestamps.remove(bufferKey);

                    handleIncomingFullPacket(deviceAddress, fullOut.toByteArray());
                }
            } else {
                handleIncomingFullPacket(deviceAddress, value);
            }
        } catch (Exception e) {
            Log.e(TAG, "handleIncomingRawOrSlicedWrite error: " + e.getMessage());
        }
    }

    private void handleIncomingFullPacket(String deviceAddress, byte[] fullBytes) {
        try {
            // 1. WhatsApp-Style Background Wakeup Check (even if app is closed!)
            checkAndTriggerWhatsAppCallOrAlert(deviceAddress, fullBytes);

            // 2. Forward to React Native if active
            String base64 = android.util.Base64.encodeToString(fullBytes, android.util.Base64.NO_WRAP);
            WritableMap params = Arguments.createMap();
            params.putString("fromDevice", deviceAddress);
            params.putString("data", base64);
            emitEventMapToReactNative("onPacketReceived", params);
        } catch (Exception e) {
            Log.e(TAG, "handleIncomingFullPacket error: " + e.getMessage());
        }
    }

    private void checkAndTriggerWhatsAppCallOrAlert(String deviceAddress, byte[] data) {
        if (data == null || data.length < 5) return;
        try {
            // Check if raw bytes are already JSON (primary path over BLE write)
            String decodedJson = new String(data, StandardCharsets.UTF_8).trim();
            if (!decodedJson.startsWith("{")) {
                try {
                    byte[] jsonBytes = android.util.Base64.decode(decodedJson, android.util.Base64.NO_WRAP);
                    String tryJson = new String(jsonBytes, StandardCharsets.UTF_8).trim();
                    if (tryJson.startsWith("{")) {
                        decodedJson = tryJson;
                    }
                } catch (Exception ignored) {}
            }

            if (decodedJson == null || !decodedJson.startsWith("{")) return;

            // ── Call End / Decline → dismiss IncomingCallActivity immediately ──
            if (decodedJson.contains("\"t\":10") || decodedJson.contains("\"t\": 10") ||
                decodedJson.contains("\"t\":9")  || decodedJson.contains("\"t\": 9")) {
                Log.i(TAG, "📴 Remote CALL_END/DECLINE received — dismissing IncomingCallActivity immediately");
                Intent dismissIntent = new Intent(IncomingCallActivity.ACTION_DISMISS_INCOMING_CALL);
                appContext.sendBroadcast(dismissIntent);
                NeerNetraMeshService.stopEmergencyAlarm();
                try {
                    android.app.NotificationManager nm =
                        (android.app.NotificationManager) appContext.getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) nm.cancel(NeerNetraMeshService.EMERGENCY_NOTIFICATION_ID);
                } catch (Exception ignored) {}
                return;
            }

            // ── Incoming Call Packet (t: 7) ──
            if (decodedJson.contains("\"t\":7") || decodedJson.contains("\"t\": 7")) {
                String callerName = "Nearby Citizen";
                boolean isGroup = decodedJson.contains("GROUP_CALL") ||
                                  decodedJson.contains("\"isGroupCall\":true") ||
                                  decodedJson.contains("\"isGroupCall\": true");
                try {
                    JSONObject jo = new JSONObject(decodedJson);
                    if (jo.has("p")) {
                        String pStr = jo.getString("p");
                        JSONObject p = new JSONObject(pStr);
                        if (p.has("callerName")) callerName = p.getString("callerName");
                    }
                } catch (Exception ignored) {}

                Bundle b = new Bundle();
                b.putString("caller_name", callerName);
                b.putBoolean("is_group_call", isGroup);
                b.putString("caller_id", deviceAddress);

                Log.i(TAG, "🚨 WhatsApp-Style Incoming Call detected from " + callerName + "! Waking device...");
                NeerNetraMeshService.wakeScreenAndShowNotification(
                    appContext,
                    isGroup ? "🚨 GROUP EMERGENCY CALL" : "📞 INCOMING EMERGENCY CALL",
                    callerName + " is calling via BLE mesh...",
                    isGroup ? "GROUP_CALL" : "CALL_REQ",
                    b
                );
            }
            // ── Incoming Offline Chat Message (t: 1) ──
            else if (decodedJson.contains("\"t\":1") || decodedJson.contains("\"t\": 1")) {
                String senderName = "Nearby Citizen";
                String chatText = "New mesh message";
                try {
                    JSONObject jo = new JSONObject(decodedJson);
                    if (jo.has("p")) {
                        String pStr = jo.getString("p");
                        JSONObject p = new JSONObject(pStr);
                        if (p.has("senderName")) senderName = p.getString("senderName");
                        if (p.has("text")) chatText = p.getString("text");
                    }
                } catch (Exception ignored) {}

                Log.i(TAG, "💬 Offline Chat Message detected from " + senderName + ": " + chatText);
                NeerNetraMeshService.showChatNotification(appContext, senderName, chatText);
            }
            // ── Emergency SOS Distress Packet (t: 3) ──
            else if (decodedJson.contains("\"t\":3") || decodedJson.contains("\"t\": 3")) {
                Bundle b = new Bundle();
                b.putString("caller_id", deviceAddress);
                NeerNetraMeshService.wakeScreenAndShowNotification(
                    appContext,
                    "🚨 CRITICAL SOS DISTRESS BEACON",
                    "Emergency distress beacon received via offline BLE mesh!",
                    "SOS_ALERT",
                    b
                );
            }
        } catch (Exception e) {
            Log.w(TAG, "checkAndTriggerWhatsAppCallOrAlert error: " + e.getMessage());
        }
    }

    private void emitEventToReactNative(String eventName, String data) {
        try {
            ReactApplicationContext rc = NeerNetraGattModule.getStaticReactContext();
            if (rc != null && rc.hasActiveReactInstance()) {
                rc.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                  .emit(eventName, data);
            }
        } catch (Exception ignored) {}
    }

    private void emitEventMapToReactNative(String eventName, WritableMap data) {
        try {
            ReactApplicationContext rc = NeerNetraGattModule.getStaticReactContext();
            if (rc != null && rc.hasActiveReactInstance()) {
                rc.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                  .emit(eventName, data);
            }
        } catch (Exception ignored) {}
    }

    public synchronized void stopMeshEngine() {
        try {
            if (advertiser != null) advertiser.stopAdvertising(advertiseCallback);
            if (gattServer != null) gattServer.close();
            gattServer = null;
            isRunning = false;
            connectedCentrals.clear();
            Log.i(TAG, "Native BLE Mesh Engine stopped");
        } catch (Exception ignored) {}
    }
}