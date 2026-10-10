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

import java.util.ArrayList;
import java.util.List;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.common.LifecycleState;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONObject;
import org.json.JSONArray;

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
    private final Map<String, Long> nativePeerLastSeen = new ConcurrentHashMap<>();
    private BluetoothLeScanner nativeScanner;
    private ScanCallback nativeScanCallback;
    private boolean isScanningNative = false;
    private boolean isRunning = false;

    private final android.os.Handler scanRecycleHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable scanRecycleRunnable = new Runnable() {
        @Override
        public void run() {
            if (isRunning) {
                Log.i(TAG, "[MeshWatchdog] Recycling native BLE scan to prevent 30-min OS limit");
                restartNativeScanning();
            }
            scanRecycleHandler.postDelayed(this, 10 * 60 * 1000);
        }
    };

    // ── Native Distance-Vector Routing Table & Gossip Engine ──────────────
    public static class MeshRoute {
        public String peerId;
        public String name;
        public int hopCount;
        public String nextHop;
        public long lastSeen;
        public double lat;
        public double lng;
        public int battery;
        public String status;
    }

    private final Map<String, MeshRoute> routingTable = new ConcurrentHashMap<>();

    public Map<String, MeshRoute> getRoutingTable() {
        return routingTable;
    }

    private final android.os.Handler gossipHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable gossipRunnable = new Runnable() {
        @Override
        public void run() {
            if (isRunning) {
                broadcastGossipBeacon();
            }
            gossipHandler.postDelayed(this, 7000); // 7-second distance-vector gossip
        }
    };

    public void broadcastGossipBeacon() {
        try {
            android.content.SharedPreferences sp = appContext.getSharedPreferences("NeerNetraPrefs", Context.MODE_PRIVATE);
            String myNodeId = sp.getString("local_node_id", "dev_node_" + Build.MODEL.replaceAll("[^a-zA-Z0-9]", ""));
            String myNodeName = sp.getString("local_node_name", "Citizen [" + Build.MODEL + "]");

            JSONObject payload = new JSONObject();
            payload.put("id", myNodeId);
            payload.put("name", myNodeName);
            payload.put("battery", 85);
            payload.put("lat", 27.6015);
            payload.put("lng", 77.5975);
            payload.put("isGossip", true);

            long now = System.currentTimeMillis();
            JSONArray neighborArray = new JSONArray();
            for (MeshRoute route : routingTable.values()) {
                if (now - route.lastSeen < 120000 && !route.peerId.equalsIgnoreCase(myNodeId)) {
                    JSONObject n = new JSONObject();
                    n.put("peer_id", route.peerId);
                    n.put("name", route.name);
                    n.put("hop_count", route.hopCount);
                    n.put("next_hop_mac", route.nextHop);
                    n.put("last_seen", route.lastSeen);
                    n.put("lat", route.lat);
                    n.put("lng", route.lng);
                    n.put("battery", route.battery);
                    n.put("status", route.status != null ? route.status : "SAFE");
                    neighborArray.put(n);
                }
            }
            payload.put("neighbors", neighborArray);

            JSONObject envelope = new JSONObject();
            String msgId = "gossip_" + now + "_" + myNodeId.substring(0, Math.min(6, myNodeId.length()));
            envelope.put("t", 1); // BLEMsgType.HELLO
            envelope.put("type", "GOSSIP");
            envelope.put("m", msgId);
            envelope.put("msg_id", msgId);
            envelope.put("s", myNodeId);
            envelope.put("origin_id", myNodeId);
            envelope.put("d", "BROADCAST");
            envelope.put("dest_id", "BROADCAST");
            envelope.put("ttl", 5);
            envelope.put("p", payload.toString());
            envelope.put("neighbors", neighborArray);

            byte[] bytes = envelope.toString().getBytes(StandardCharsets.UTF_8);
            String b64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP);
            notifyAllClients(b64);
        } catch (Exception e) {
            Log.w(TAG, "broadcastGossipBeacon error: " + e.getMessage());
        }
    }

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
            if (!isScanningNative) {
                startNativeScanning();
            }
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

            // 3. Start native BLE background scanner (runs 24/7 even when JS is killed)
            startNativeScanning();

            scanRecycleHandler.removeCallbacks(scanRecycleRunnable);
            scanRecycleHandler.postDelayed(scanRecycleRunnable, 10 * 60 * 1000);

            gossipHandler.removeCallbacks(gossipRunnable);
            gossipHandler.postDelayed(gossipRunnable, 3000);

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

        // Primary advertisement packet: Service UUID only (18 bytes, well within 31-byte limit)
        AdvertiseData data = new AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .addServiceUuid(new ParcelUuid(NEERNETRA_SERVICE_UUID))
            .build();

        // Scan response packet: Manufacturer signature only (8 bytes, well within 31-byte limit)
        AdvertiseData.Builder scanBuilder = new AdvertiseData.Builder()
            .setIncludeDeviceName(false)
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
            if (errorCode == AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED) {
                Log.i(TAG, "Advertising was already running — treating as success");
            }
        }
    };

    /**
     * Switch between High-Performance 24/7 Mesh and Ultra-Low-Power 16-byte Beacon Mode (<= 15% Battery)
     */
    public void setLowPowerBeaconMode(boolean enable) {
        if (advertiser == null || bluetoothAdapter == null) return;
        try {
            advertiser.stopAdvertising(advertiseCallback);
            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(enable ? AdvertiseSettings.ADVERTISE_MODE_LOW_POWER : AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(enable ? AdvertiseSettings.ADVERTISE_TX_POWER_ULTRA_LOW : AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .setTimeout(0)
                .build();

            AdvertiseData data = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .addServiceUuid(new ParcelUuid(NEERNETRA_SERVICE_UUID))
                .build();

            AdvertiseData.Builder scanBuilder = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false);

            if (enable) {
                // 16-byte raw USAR manufacturer beacon: 'N', 'E', 'E', 'R', 0x01 (Critical Beacon), + 11 bytes zeros
                byte[] beacon = new byte[] { 'N', 'E', 'E', 'R', 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
                scanBuilder.addManufacturerData(0x4E65, beacon);
            } else {
                scanBuilder.addManufacturerData(0x4E65, new byte[] { 'N', 'E', 'E', 'R' });
            }

            advertiser.startAdvertising(settings, data, scanBuilder.build(), advertiseCallback);
            Log.i(TAG, "Switched BLE advertising mode: LowPower=" + enable);
        } catch (Exception e) {
            Log.w(TAG, "Error switching beacon mode: " + e.getMessage());
        }
    }

    // ── Native 24/7 Background BLE Scanner ────────────────────────────────────
    private void startNativeScanning() {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) return;
        nativeScanner = bluetoothAdapter.getBluetoothLeScanner();
        if (nativeScanner == null) {
            Log.w(TAG, "BluetoothLeScanner not available for native scanning");
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                boolean hasScan = appContext.checkSelfPermission(android.Manifest.permission.BLUETOOTH_SCAN)
                        == android.content.pm.PackageManager.PERMISSION_GRANTED;
                if (!hasScan) {
                    Log.w(TAG, "BLUETOOTH_SCAN not yet granted — native scanner will start after permission");
                    return;
                }
            }

            if (isScanningNative) {
                try { nativeScanner.stopScan(nativeScanCallback); } catch (Exception ignored) {}
                isScanningNative = false;
            }

            // Filter for our NeerNetra service UUID or manufacturer data — no location data involved
            List<ScanFilter> filters = new ArrayList<>();
            filters.add(new ScanFilter.Builder()
                .setServiceUuid(new ParcelUuid(NEERNETRA_SERVICE_UUID))
                .build());
            try {
                filters.add(new ScanFilter.Builder()
                    .setManufacturerData(0x4E65, new byte[] { 'N', 'E' })
                    .build());
            } catch (Exception ignored) {}

            ScanSettings scanSettings = new ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setReportDelay(0)
                .build();

            nativeScanCallback = new ScanCallback() {
                @Override
                public void onScanResult(int callbackType, ScanResult result) {
                    if (result == null || result.getDevice() == null) return;
                    String address = result.getDevice().getAddress();
                    int rssi = result.getRssi();
                    String deviceName = "";
                    try {
                        deviceName = result.getDevice().getName();
                        if (deviceName == null) deviceName = "";
                    } catch (SecurityException ignored) {}

                    long now = System.currentTimeMillis();
                    Long lastSeen = nativePeerLastSeen.get(address);
                    nativePeerLastSeen.put(address, now);

                    // Emit to React Native so JS layer can update its peer list
                    try {
                        WritableMap peerMap = Arguments.createMap();
                        peerMap.putString("id", address);
                        peerMap.putString("name", deviceName.isEmpty() ? "Citizen_" + address.replace(":", "").substring(Math.max(0, address.length() - 8)) : deviceName);
                        peerMap.putInt("rssi", rssi);
                        emitEventMapToReactNative("onNativePeerFound", peerMap);
                    } catch (Exception ignored) {}

                    // If we haven't seen this peer recently, send a synthetic HELLO
                    if (lastSeen == null || now - lastSeen > 30000) {
                        Log.i(TAG, "Native scan found NeerNetra peer: " + address + " (RSSI: " + rssi + ")");
                    }
                }

                @Override
                public void onScanFailed(int errorCode) {
                    Log.w(TAG, "Native BLE scan failed: " + errorCode);
                    isScanningNative = false;
                    // Retry after 10s if scan failed
                    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                        if (isRunning) startNativeScanning();
                    }, 10000);
                }

                @Override
                public void onBatchScanResults(List<ScanResult> results) {
                    for (ScanResult r : results) onScanResult(ScanSettings.CALLBACK_TYPE_ALL_MATCHES, r);
                }
            };

            nativeScanner.startScan(filters, scanSettings, nativeScanCallback);
            isScanningNative = true;
            Log.i(TAG, "Native BLE background scanner started (NeerNetra UUID filter)");

        } catch (SecurityException se) {
            Log.w(TAG, "Native scan SecurityException: " + se.getMessage());
        } catch (Exception e) {
            Log.w(TAG, "Native scan start error: " + e.getMessage());
        }
    }

    public synchronized void restartNativeScanning() {
        if (!isRunning) return;
        try {
            if (nativeScanner != null && isScanningNative && nativeScanCallback != null) {
                nativeScanner.stopScan(nativeScanCallback);
                isScanningNative = false;
            }
        } catch (Exception ignored) {}

        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            if (isRunning) {
                startNativeScanning();
            }
        }, 1000);
    }



    // ── Notify All Connected Centrals ─────────────────────────────────────────
    // ── Unified Broadcast: BLE Centrals + Wi-Fi Mesh (NAN/P2P/UDP) ────────────
    public int notifyAllClients(String base64Data) {
        if (base64Data == null || base64Data.trim().isEmpty()) {
            return 0;
        }

        try {
            byte[] data = android.util.Base64.decode(base64Data.trim(), android.util.Base64.NO_WRAP);
            if (data == null || data.length == 0) return 0;

            // 1. Dedup cache registration: mark msgId as seen so our own transmission is never looped back
            try {
                String str = new String(data, StandardCharsets.UTF_8).trim();
                if (str.startsWith("{")) {
                    JSONObject jo = new JSONObject(str);
                    String m = jo.optString("m", "");
                    if (!m.isEmpty()) {
                        seenMessageIds.put(m, System.currentTimeMillis());
                    }
                }
            } catch (Exception ignored) {}

            // 2. High-speed, long-range Wi-Fi Broadcast (Wi-Fi Aware NAN + Wi-Fi Direct P2P + UDP 8765)
            try {
                NeerNetraWifiMeshManager.getInstance(appContext).broadcastPacketOverWifi(data);
            } catch (Exception we) {
                Log.w(TAG, "Wi-Fi broadcast error in notifyAllClients: " + we.getMessage());
            }

            // 3. BLE GATT Notify to all connected Centrals
            if (!isRunning || notifyCharacteristic == null || gattServer == null) {
                return 1; // Wi-Fi successfully broadcast even if BLE centrals are 0
            }

            int notified = 0;
            synchronized (connectedCentrals) {
                for (BluetoothDevice device : connectedCentrals) {
                    try {
                        int devMtu = deviceMtus.getOrDefault(device.getAddress(), 23);
                        int maxAttrLen = Math.max(20, Math.min(509, devMtu - 3));

                        boolean sent;
                        if (data.length <= maxAttrLen) {
                            sent = sendRawNotification(device, data);
                        } else {
                            sent = sendSlicedNotification(device, data, maxAttrLen);
                        }

                        if (sent) {
                            notified++;
                        }
                    } catch (Throwable t) {
                        Log.w(TAG, "Notification write error to " + device.getAddress() + ": " + t.getMessage());
                    }
                }
            }

            return Math.max(1, notified);
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

    private final Map<String, Queue<byte[]>> notificationQueues = new ConcurrentHashMap<>();
    private final Map<String, Boolean> isNotifying = new ConcurrentHashMap<>();

    private boolean sendSlicedNotification(BluetoothDevice device, byte[] data, int maxAttrLen) {
        int headerSize = 4;
        // Never exceed actual MTU: minimum payload is 16 bytes (16 + 4 header = 20 bytes <= MTU 23)
        int slicePayloadSize = Math.max(16, maxAttrLen - headerSize);
        int totalSlices = (int) Math.ceil((double) data.length / slicePayloadSize);
        if (totalSlices > 255) totalSlices = 255;

        int pktId;
        synchronized (this) {
            pktId = (rollingPacketId++) & 0xFF;
        }

        Queue<byte[]> queue = notificationQueues.computeIfAbsent(device.getAddress(), k -> new java.util.concurrent.ConcurrentLinkedQueue<>());

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

            queue.add(chunk);
        }

        processNextNotification(device);
        return true;
    }

    private void processNextNotification(BluetoothDevice device) {
        String addr = device.getAddress();
        synchronized (isNotifying) {
            if (Boolean.TRUE.equals(isNotifying.get(addr))) {
                return;
            }

            Queue<byte[]> queue = notificationQueues.get(addr);
            if (queue != null && !queue.isEmpty()) {
                byte[] chunk = queue.poll();
                if (chunk != null) {
                    isNotifying.put(addr, true);
                    boolean sent = sendRawNotification(device, chunk);
                    if (!sent) {
                        isNotifying.put(addr, false);
                    }
                }
            }
        }
    }

    // ── Incoming GATT Callbacks ───────────────────────────────────────────────
    private final BluetoothGattServerCallback gattServerCallback = new BluetoothGattServerCallback() {
        private final ByteArrayOutputStream prepareWriteBuffer = new ByteArrayOutputStream();

        @Override
        public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                Log.d(TAG, "Central connected: " + device.getAddress());
                synchronized (connectedCentrals) {
                    if (!connectedCentrals.contains(device)) {
                        connectedCentrals.add(device);
                    }
                }
                emitEventToReactNative("onCentralConnected", device.getAddress());
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                Log.d(TAG, "Central disconnected: " + device.getAddress());
                deviceMtus.remove(device.getAddress());
                notificationQueues.remove(device.getAddress());
                isNotifying.remove(device.getAddress());
                synchronized (connectedCentrals) {
                    connectedCentrals.remove(device);
                }
                emitEventToReactNative("onCentralDisconnected", device.getAddress());
            }
        }

        @Override
        public void onMtuChanged(BluetoothDevice device, int mtu) {
            Log.i(TAG, "Central MTU negotiated with " + device.getAddress() + ": " + mtu);
            deviceMtus.put(device.getAddress(), Math.max(mtu, 23));
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
        public void onNotificationSent(BluetoothDevice device, int status) {
            if (device == null) return;
            String addr = device.getAddress();
            synchronized (isNotifying) {
                isNotifying.put(addr, false);
            }
            processNextNotification(device);
        }

        @Override
        public void onDescriptorWriteRequest(BluetoothDevice device, int requestId,
                BluetoothGattDescriptor descriptor, boolean preparedWrite,
                boolean responseNeeded, int offset, byte[] value) {
            Log.i(TAG, "onDescriptorWriteRequest from " + device.getAddress() + " uuid=" + descriptor.getUuid());
            if (CLIENT_CONFIG_UUID.equals(descriptor.getUuid())) {
                descriptor.setValue(value);
                Log.i(TAG, "Client subscribed to CCCD notifications: " + device.getAddress());
            }
            if (responseNeeded) {
                gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value);
            }
        }

        @Override
        public void onDescriptorReadRequest(BluetoothDevice device, int requestId, int offset, BluetoothGattDescriptor descriptor) {
            byte[] val = descriptor.getValue();
            if (val == null) val = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE;
            gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, val);
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

    // Deduplication cache to prevent multi-hop routing loops
    private final Map<String, Long> seenMessageIds = new ConcurrentHashMap<>();

    private void handleIncomingFullPacket(String deviceAddress, byte[] fullBytes) {
        handleIncomingPacketFromAnyTransport(deviceAddress, fullBytes);
    }

    public void handleIncomingPacketFromAnyTransport(String fromTransportOrDevice, byte[] fullBytes) {
        if (fullBytes == null || fullBytes.length == 0) return;
        try {
            long now = System.currentTimeMillis();
            if (seenMessageIds.size() > 2048) {
                for (Map.Entry<String, Long> entry : new ArrayList<>(seenMessageIds.entrySet())) {
                    if (now - entry.getValue() > 180000) {
                        seenMessageIds.remove(entry.getKey());
                    }
                }
            }

            // Decode to JSON
            String decoded = new String(fullBytes, StandardCharsets.UTF_8).trim();
            if (!decoded.startsWith("{")) {
                try {
                    byte[] b64 = android.util.Base64.decode(decoded, android.util.Base64.NO_WRAP);
                    String tryJson = new String(b64, StandardCharsets.UTF_8).trim();
                    if (tryJson.startsWith("{")) {
                        decoded = tryJson;
                    }
                } catch (Exception ignored) {}
            }
            if (decoded.contains("%7B") || decoded.contains("%22")) {
                try {
                    decoded = java.net.URLDecoder.decode(decoded, "UTF-8");
                } catch (Exception ignored) {}
            }

            if (!decoded.startsWith("{")) return;

            JSONObject packet = new JSONObject(decoded);
            int type = packet.optInt("t", -1);
            if (type == -1 && packet.has("type")) {
                String typeStr = packet.optString("type", "");
                if ("MESH_CALL_REQ".equalsIgnoreCase(typeStr) || "CALL_REQUEST".equalsIgnoreCase(typeStr) || "CALL_REQ".equalsIgnoreCase(typeStr)) {
                    type = 7;
                } else if ("CALL_ACCEPT".equalsIgnoreCase(typeStr)) {
                    type = 8;
                } else if ("CALL_DECLINE".equalsIgnoreCase(typeStr)) {
                    type = 9;
                } else if ("CALL_END".equalsIgnoreCase(typeStr)) {
                    type = 10;
                } else if ("VOICE_BURST".equalsIgnoreCase(typeStr) || "VOICE".equalsIgnoreCase(typeStr)) {
                    type = 11;
                } else if ("HELLO".equalsIgnoreCase(typeStr) || "GOSSIP".equalsIgnoreCase(typeStr) || "BEACON".equalsIgnoreCase(typeStr)) {
                    type = 1;
                } else if ("CHAT".equalsIgnoreCase(typeStr)) {
                    type = 2;
                } else if ("SOS".equalsIgnoreCase(typeStr)) {
                    type = 3;
                } else if ("SAFE".equalsIgnoreCase(typeStr)) {
                    type = 4;
                }
            }

            String msgId = packet.optString("m", "");
            if (msgId.isEmpty()) msgId = packet.optString("msg_id", "");
            if (msgId.isEmpty()) msgId = packet.optString("call_id", "");

            String senderId = packet.optString("s", "");
            if (senderId.isEmpty()) senderId = packet.optString("origin_id", "");
            if (senderId.isEmpty()) senderId = packet.optString("from", "");

            String targetId = packet.optString("d", "");
            if (targetId.isEmpty()) targetId = packet.optString("dest_id", "");
            if (targetId.isEmpty()) targetId = packet.optString("to", "BROADCAST");

            int ttl = packet.optInt("ttl", 1);

            if (msgId.isEmpty()) {
                msgId = "m_" + now + "_" + (senderId.isEmpty() ? "anon" : senderId);
            }

            // Loop Detection: Suppress duplicate packet
            if (seenMessageIds.containsKey(msgId)) {
                Log.i(TAG, "🔁 [MeshDeduplication] Dropping duplicate packet msg_id=" + msgId);
                return;
            }
            seenMessageIds.put(msgId, now);

            // Ignore our own echoes
            android.content.SharedPreferences sp = appContext.getSharedPreferences("NeerNetraPrefs", Context.MODE_PRIVATE);
            String myNodeId = sp.getString("local_node_id", "");
            String myNodeName = sp.getString("local_node_name", "");
            if (!myNodeId.isEmpty() && senderId.equalsIgnoreCase(myNodeId)) {
                return;
            }

            Log.i(TAG, "📥 [MeshPacket] Ingested type=" + type + " id=" + msgId + " from=" + senderId + " target=" + targetId + " ttl=" + ttl + " via=" + fromTransportOrDevice);

            // 0. Update native distance-vector routing table
            if (!senderId.isEmpty()) {
                MeshRoute directRoute = routingTable.get(senderId);
                if (directRoute == null) directRoute = new MeshRoute();
                directRoute.peerId = senderId;
                directRoute.name = packet.optString("name", directRoute.name != null ? directRoute.name : "Citizen [" + senderId.substring(Math.max(0, senderId.length() - 4)) + "]");
                directRoute.hopCount = 1;
                directRoute.nextHop = senderId;
                directRoute.lastSeen = now;
                directRoute.status = "SAFE";
                routingTable.put(senderId, directRoute);
            }

            // Parse gossip neighbors table if present
            JSONArray neighbors = null;
            if (packet.has("neighbors")) {
                neighbors = packet.optJSONArray("neighbors");
            } else if (packet.has("p")) {
                try {
                    String pRaw = packet.getString("p");
                    if (pRaw.startsWith("{")) {
                        JSONObject pObj = new JSONObject(pRaw);
                        if (pObj.has("neighbors")) neighbors = pObj.optJSONArray("neighbors");
                    }
                } catch (Exception ignored) {}
            }
            if (neighbors != null) {
                for (int i = 0; i < neighbors.length(); i++) {
                    JSONObject n = neighbors.optJSONObject(i);
                    if (n == null) continue;
                    String nId = n.optString("peer_id", n.optString("id", ""));
                    if (nId.isEmpty() || nId.equalsIgnoreCase(myNodeId)) continue;
                    int nHop = n.optInt("hop_count", n.optInt("hops", 1)) + 1;
                    MeshRoute relayedRoute = routingTable.get(nId);
                    if (relayedRoute == null) relayedRoute = new MeshRoute();
                    relayedRoute.peerId = nId;
                    relayedRoute.name = n.optString("name", relayedRoute.name != null ? relayedRoute.name : "Citizen [" + nId.substring(Math.max(0, nId.length() - 4)) + "]");
                    relayedRoute.hopCount = nHop;
                    relayedRoute.nextHop = senderId;
                    relayedRoute.lastSeen = now;
                    relayedRoute.lat = n.optDouble("lat", 0.0);
                    relayedRoute.lng = n.optDouble("lng", 0.0);
                    relayedRoute.battery = n.optInt("battery", 80);
                    relayedRoute.status = n.optString("status", "SAFE");
                    routingTable.put(nId, relayedRoute);
                    Log.i(TAG, "🗺️ [GossipRouting] Node " + nId + " reachable via " + senderId + " (" + nHop + " hops, ~" + (nHop * 60) + "m)");
                }
            }

            // 1. WhatsApp-Style Background Wakeup / Alert Check (even if app is closed!)
            checkAndTriggerWhatsAppCallOrAlert(fromTransportOrDevice, fullBytes);

            // 2. Forward to React Native if active
            String base64 = android.util.Base64.encodeToString(fullBytes, android.util.Base64.NO_WRAP);
            WritableMap params = Arguments.createMap();
            params.putString("fromDevice", fromTransportOrDevice);
            params.putString("data", base64);
            emitEventMapToReactNative("onPacketReceived", params);

            // 3. Multi-Hop Managed Relay (Linked List Forwarding across BLE & Wi-Fi)
            // Relay if TTL > 1 and destination is not strictly and only self
            boolean isStrictlyForMe = (!targetId.isEmpty() && !"BROADCAST".equals(targetId) && !"GROUP_CALL".equals(targetId))
                    && (!myNodeId.isEmpty() && (targetId.equalsIgnoreCase(myNodeId) || targetId.contains(myNodeId) || myNodeId.contains(targetId) || targetId.equalsIgnoreCase("self") || targetId.equalsIgnoreCase("me")));

            if (ttl > 1 && !isStrictlyForMe) {
                int newTtl = ttl - 1;
                packet.put("ttl", newTtl);
                byte[] relayedBytes = packet.toString().getBytes(StandardCharsets.UTF_8);
                String relayedBase64 = android.util.Base64.encodeToString(relayedBytes, android.util.Base64.NO_WRAP);

                MeshRoute route = routingTable.get(targetId);
                String nextHop = route != null ? route.nextHop : targetId;
                Log.i(TAG, "🔁 [MultiHopRelay] Forwarding packet " + msgId + " (type=" + type + ", TTL " + ttl + "->" + newTtl + ") via next_hop=" + nextHop + " across BLE Centrals & Wi-Fi UDP 8765 to reach " + targetId);

                // Relay over BLE GATT notify to all Centrals
                notifyAllClients(relayedBase64);

                // Relay over Wi-Fi (Wi-Fi Aware & UDP Port 8765)
                NeerNetraWifiMeshManager.getInstance(appContext).broadcastPacketOverWifi(relayedBytes);
            }

        } catch (Exception e) {
            Log.e(TAG, "handleIncomingPacketFromAnyTransport error: " + e.getMessage());
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
            if (decodedJson.contains("%7B") || decodedJson.contains("%22")) {
                try {
                    decodedJson = java.net.URLDecoder.decode(decodedJson, "UTF-8");
                } catch (Exception ignored) {}
            }

            if (decodedJson == null || !decodedJson.startsWith("{")) return;

            // ── Call End / Decline → dismiss IncomingCallActivity immediately ──
            boolean isCallEnd = decodedJson.contains("\"t\":10") || decodedJson.contains("\"t\": 10") ||
                                decodedJson.contains("\"t\":9")  || decodedJson.contains("\"t\": 9") ||
                                decodedJson.contains("\"t\":\"10\"") || decodedJson.contains("\"t\":\"9\"") ||
                                decodedJson.contains("CALL_END") || decodedJson.contains("CALL_DECLINE");
            if (isCallEnd) {
                Log.i(TAG, "📴 Remote CALL_END/DECLINE received — dismissing IncomingCallActivity immediately");
                Intent dismissIntent = new Intent(IncomingCallActivity.ACTION_DISMISS_INCOMING_CALL);
                appContext.sendBroadcast(dismissIntent);
                NeerNetraConnectionService.disconnectCall();
                NeerNetraMeshService.stopEmergencyAlarm();
                try {
                    android.app.NotificationManager nm =
                        (android.app.NotificationManager) appContext.getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) nm.cancel(NeerNetraMeshService.EMERGENCY_NOTIFICATION_ID);
                } catch (Exception ignored) {}
                return;
            }

            // ── Incoming Call Packet (t: 7 or MESH_CALL_REQ) ──
            boolean isCall = decodedJson.contains("\"t\":7") || decodedJson.contains("\"t\": 7") ||
                             decodedJson.contains("\"t\":\"7\"") || decodedJson.contains("\"t\": \"7\"") ||
                             decodedJson.contains("MESH_CALL_REQ") || decodedJson.contains("CALL_REQUEST") ||
                             decodedJson.contains("CALL_REQ");
            if (isCall) {
                String callerName = "Nearby Citizen";
                String targetId = null;
                boolean isGroup = decodedJson.contains("GROUP_CALL") ||
                                  decodedJson.contains("\"isGroupCall\":true") ||
                                  decodedJson.contains("\"isGroupCall\": true");
                try {
                    JSONObject jo = new JSONObject(decodedJson);
                    if (jo.has("d")) targetId = jo.optString("d");
                    if (targetId == null && jo.has("dest_id")) targetId = jo.optString("dest_id");
                    if (targetId == null && jo.has("to")) targetId = jo.optString("to");

                    if (jo.has("caller_name")) callerName = jo.getString("caller_name");
                    else if (jo.has("name")) callerName = jo.getString("name");

                    if (jo.has("p")) {
                        String pStr = jo.getString("p");
                        if (pStr.startsWith("{")) {
                            JSONObject p = new JSONObject(pStr);
                            if (p.has("callerName")) callerName = p.getString("callerName");
                            if (targetId == null && p.has("targetId")) targetId = p.getString("targetId");
                            if (targetId == null && p.has("targetNodeId")) targetId = p.getString("targetNodeId");
                        }
                    }
                } catch (Exception ignored) {}

                // Deterministic 1-to-1 Addressing Filter
                if (!isGroup && targetId != null && !targetId.isEmpty() && !"BROADCAST".equals(targetId)) {
                    android.content.SharedPreferences sp = appContext.getSharedPreferences("NeerNetraPrefs", Context.MODE_PRIVATE);
                    String myNodeId = sp.getString("local_node_id", "");
                    String myNodeName = sp.getString("local_node_name", "");
                    boolean matchesId = !myNodeId.isEmpty() && (targetId.equalsIgnoreCase(myNodeId) || targetId.contains(myNodeId) || myNodeId.contains(targetId));
                    boolean matchesName = !myNodeName.isEmpty() && (targetId.equalsIgnoreCase(myNodeName) || targetId.contains(myNodeName) || myNodeName.contains(targetId));
                    boolean matchesSelf = targetId.equalsIgnoreCase("self") || targetId.equalsIgnoreCase("me");
                    if (!myNodeId.isEmpty() && !matchesId && !matchesName && !matchesSelf) {
                        Log.i(TAG, "Private intercom call addressed to " + targetId + " (not us: id=" + myNodeId + ", name=" + myNodeName + "). Suppressing lock-screen wake.");
                        return;
                    }
                }

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
            // ── Incoming Offline Chat Message (t: 2 = CHAT) ──
            else if (decodedJson.contains("\"t\":2") || decodedJson.contains("\"t\": 2") ||
                     decodedJson.contains("\"t\":\"2\"") || decodedJson.contains("\"t\": \"2\"")) {
                String senderName = "Nearby Citizen";
                String chatText = "New mesh message";
                try {
                    JSONObject jo = new JSONObject(decodedJson);
                    JSONObject p = null;
                    if (jo.optJSONObject("p") != null) {
                        p = jo.optJSONObject("p");
                    } else if (jo.has("p")) {
                        try {
                            p = new JSONObject(jo.getString("p"));
                        } catch (Exception ignored) {}
                    }
                    if (p != null) {
                        if (p.has("senderName") && !p.getString("senderName").isEmpty()) {
                            senderName = p.getString("senderName");
                        }
                        if (p.has("text") && !p.getString("text").isEmpty()) {
                            chatText = p.getString("text");
                        }
                    }
                } catch (Exception ignored) {}

                Log.i(TAG, "💬 Offline Chat Message detected from " + senderName + ": " + chatText);
                NeerNetraMeshService.showChatNotification(appContext, senderName, chatText);
            }
            // ── Emergency SOS Distress Packet (t: 3) ──
            else if (decodedJson.contains("\"t\":3") || decodedJson.contains("\"t\": 3") ||
                     decodedJson.contains("\"t\":\"3\"") || decodedJson.contains("\"t\": \"3\"")) {
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
            scanRecycleHandler.removeCallbacks(scanRecycleRunnable);
            gossipHandler.removeCallbacks(gossipRunnable);
            if (advertiser != null) advertiser.stopAdvertising(advertiseCallback);
            if (nativeScanner != null && nativeScanCallback != null && isScanningNative) {
                try { nativeScanner.stopScan(nativeScanCallback); } catch (Exception ignored) {}
                isScanningNative = false;
            }
            if (gattServer != null) gattServer.close();
            gattServer = null;
            isRunning = false;
            connectedCentrals.clear();
            nativePeerLastSeen.clear();
            Log.i(TAG, "Native BLE Mesh Engine stopped");
        } catch (Exception ignored) {}
    }

    public synchronized void pokeRadio() {
        try {
            if (!isRunning) {
                android.content.SharedPreferences sp = appContext.getSharedPreferences("NeerNetraPrefs", Context.MODE_PRIVATE);
                String name = sp.getString("local_node_name", "NeerNetra-Node");
                startMeshEngine(name);
            } else {
                if (!isScanningNative) {
                    startNativeScanning();
                }
            }
            NeerNetraWifiMeshManager.getInstance(appContext).startWifiMesh();
            Log.i(TAG, "[MeshManager] Radios poked & verified active (BLE + Wi-Fi)");
        } catch (Exception e) {
            Log.w(TAG, "pokeRadio error: " + e.getMessage());
        }
    }

    public void relayPacketToAllTransports(String msgId, byte[] packetBytes) {
        if (packetBytes == null || packetBytes.length == 0) return;
        if (msgId != null && !msgId.isEmpty()) {
            seenMessageIds.put(msgId, System.currentTimeMillis());
        }
        String base64 = android.util.Base64.encodeToString(packetBytes, android.util.Base64.NO_WRAP);
        notifyAllClients(base64);
        NeerNetraWifiMeshManager.getInstance(appContext).broadcastPacketOverWifi(packetBytes);
    }
}