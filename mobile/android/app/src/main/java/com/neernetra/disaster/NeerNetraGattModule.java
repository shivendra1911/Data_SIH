package com.neernetra.disaster;

import android.bluetooth.*;
import android.bluetooth.le.*;
import android.content.Context;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.media.ToneGenerator;
import android.os.ParcelUuid;
import android.util.Log;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import android.content.Intent;
import android.os.Bundle;
import android.os.PowerManager;
import com.facebook.react.common.LifecycleState;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * NeerNetraGattModule
 * ====================
 * Native Android module for offline BLE Mesh & Real Voice Intercom:
 *  1. GATT Server (Peripheral mode) with WRITE + NOTIFY characteristics
 *  2. BLE Advertising with 128-bit Service UUID
 *  3. MTU 512 & Long Write buffering for zero packet loss
 *  4. Native Hardware Audio Recording (AMR-NB 8kHz, ~1.2 KB/sec) via MediaRecorder
 *  5. Direct Speaker Playback via MediaPlayer (STREAM_MUSIC)
 */
public class NeerNetraGattModule extends ReactContextBaseJavaModule {

    private static final String TAG = "NeerNetraGATT";

    // ── NeerNetra UUIDs (must match bluetoothMesh.ts) ───────────────────────
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

    private BluetoothManager bluetoothManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothGattServer gattServer;
    private BluetoothLeAdvertiser advertiser;
    private BluetoothGattCharacteristic notifyCharacteristic;

    private final List<BluetoothDevice> connectedCentrals = new ArrayList<>();
    private final Map<String, Integer> deviceMtus = new ConcurrentHashMap<>();
    private int rollingPacketId = 0;

    // Slice reassembly buffer for incoming writes from Centrals
    // Key: deviceAddress + "_" + packetId -> Map of sliceIdx to byte[]
    private final Map<String, Map<Integer, byte[]>> incomingWriteBuffers = new ConcurrentHashMap<>();
    private final Map<String, Integer> incomingWriteTotals = new ConcurrentHashMap<>();
    private final Map<String, Long> incomingWriteTimestamps = new ConcurrentHashMap<>();
    private boolean isRunning = false;

    // Audio recording & playback
    private MediaRecorder mediaRecorder;
    private File audioRecordFile;
    private MediaPlayer mediaPlayer;
    private static ReactApplicationContext staticReactContext;
    private static Intent pendingEmergencyIntent = null;

    public NeerNetraGattModule(ReactApplicationContext context) {
        super(context);
        staticReactContext = context;
    }

    public static void setPendingEmergencyIntent(Intent intent) {
        pendingEmergencyIntent = intent;
        if (staticReactContext != null && staticReactContext.hasActiveReactInstance()) {
            try {
                WritableMap map = Arguments.createMap();
                map.putString("emergency_type", intent.getStringExtra("emergency_type"));
                map.putString("caller_name", intent.getStringExtra("caller_name"));
                map.putBoolean("is_group_call", intent.getBooleanExtra("is_group_call", false));
                map.putString("caller_id", intent.getStringExtra("caller_id"));
                map.putString("title", intent.getStringExtra("title"));
                map.putString("message", intent.getStringExtra("message"));
                staticReactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onEmergencyWakeUp", map);
            } catch (Exception e) {
                Log.w(TAG, "Error emitting onEmergencyWakeUp: " + e.getMessage());
            }
        }
    }

    @ReactMethod
    public void getPendingEmergencyIntent(Promise promise) {
        if (pendingEmergencyIntent != null) {
            WritableMap map = Arguments.createMap();
            map.putString("emergency_type", pendingEmergencyIntent.getStringExtra("emergency_type"));
            map.putString("caller_name", pendingEmergencyIntent.getStringExtra("caller_name"));
            map.putBoolean("is_group_call", pendingEmergencyIntent.getBooleanExtra("is_group_call", false));
            map.putString("caller_id", pendingEmergencyIntent.getStringExtra("caller_id"));
            map.putString("title", pendingEmergencyIntent.getStringExtra("title"));
            map.putString("message", pendingEmergencyIntent.getStringExtra("message"));
            promise.resolve(map);
        } else {
            promise.resolve(null);
        }
    }

    @ReactMethod
    public void clearPendingEmergencyIntent(Promise promise) {
        pendingEmergencyIntent = null;
        NeerNetraMeshService.stopEmergencyAlarm();
        promise.resolve(true);
    }

    @ReactMethod
    public void startMeshForegroundService(Promise promise) {
        try {
            NeerNetraMeshService.startService(getReactApplicationContext());
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SERVICE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopMeshForegroundService(Promise promise) {
        try {
            NeerNetraMeshService.stopService(getReactApplicationContext());
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SERVICE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void wakeUpScreenAndShowCall(String callerName, boolean isGroupCall, String callerId, Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            Bundle b = new Bundle();
            b.putString("caller_name", callerName);
            b.putBoolean("is_group_call", isGroupCall);
            b.putString("caller_id", callerId);
            NeerNetraMeshService.wakeScreenAndShowNotification(
                ctx,
                isGroupCall ? "🚨 GROUP EMERGENCY CALL" : "📞 INCOMING EMERGENCY CALL",
                callerName + " is calling via offline BLE mesh...",
                isGroupCall ? "GROUP_CALL" : "CALL_REQ",
                b
            );
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("WAKE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void triggerNativeSosAlert(String senderName, String message, double lat, double lng, Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            Bundle b = new Bundle();
            b.putString("sender_name", senderName);
            b.putString("message", message);
            b.putDouble("latitude", lat);
            b.putDouble("longitude", lng);
            NeerNetraMeshService.wakeScreenAndShowNotification(
                ctx,
                "🚨 CRITICAL SOS DISTRESS BEACON",
                senderName + ": " + message,
                "SOS_ALERT",
                b
            );
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SOS_ERROR", e.getMessage());
        }
    }

    @Override
    public String getName() {
        return "NeerNetraGatt";
    }

    // ── Start GATT Server + BLE Advertising ──────────────────────────────────
    @ReactMethod
    public void startGattServer(String deviceName, Promise promise) {
        // Automatically start 24/7 background foreground service
        try {
            NeerNetraMeshService.startService(getReactApplicationContext());
        } catch (Exception ignored) {}

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
                String safeName = name.length() > 14 ? name.substring(0, 14) : name;
                bluetoothAdapter.setName(safeName);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not set Bluetooth adapter name: " + e.getMessage());
        }

        AdvertiseSettings settings = new AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .setTimeout(0) // continuous emergency broadcast
            .build();

        // 1. Primary packet: 128-bit UUID + 16-bit UUID (0x4E65) <= 25 bytes
        AdvertiseData data = new AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .addServiceUuid(new ParcelUuid(NEERNETRA_SERVICE_UUID))
            .addServiceUuid(new ParcelUuid(NEERNETRA_16BIT_UUID))
            .build();

        // 2. Scan response: Device name + NeerNetra signature
        AdvertiseData.Builder scanBuilder = new AdvertiseData.Builder()
            .setIncludeDeviceName(true)
            .setIncludeTxPowerLevel(false);
        try {
            scanBuilder.addManufacturerData(0x4E65, new byte[] { 'N', 'E', 'E', 'R' });
        } catch (Exception ignored) {}
        AdvertiseData scanResponse = scanBuilder.build();

        try {
            advertiser.startAdvertising(settings, data, scanResponse, advertiseCallback);
            Log.d(TAG, "BLE advertising started (128-bit + 16-bit UUID + ScanResponse Name/MFR)");
        } catch (Exception e) {
            Log.w(TAG, "startAdvertising call exception, falling back: " + e.getMessage());
            try {
                AdvertiseData fallbackData = new AdvertiseData.Builder()
                    .setIncludeDeviceName(true)
                    .addServiceUuid(new ParcelUuid(NEERNETRA_SERVICE_UUID))
                    .build();
                advertiser.startAdvertising(settings, fallbackData, advertiseCallback);
            } catch (Exception ex) {
                Log.e(TAG, "Fallback advertising error: " + ex.getMessage());
            }
        }
    }

    // ── Send data to ALL currently connected central devices (MTU-Safe Slicing) ───
    @ReactMethod
    public void notifyAllClients(String base64Data, Promise promise) {
        if (!isRunning || notifyCharacteristic == null || gattServer == null) {
            promise.resolve(0);
            return;
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

                        boolean sent = false;
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
                        Log.w(TAG, "Notification failed for device " + device.getAddress() + ": " + t.getMessage());
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

            Log.d(TAG, "Notified " + notified + " connected centrals (" + data.length + " bytes)");
            promise.resolve(notified);
        } catch (Throwable e) {
            Log.e(TAG, "notifyAllClients error: " + e.getMessage());
            promise.resolve(0);
        }
    }

    private boolean sendRawNotification(BluetoothDevice device, byte[] data) {
        if (gattServer == null || notifyCharacteristic == null || device == null) return false;
        try {
            notifyCharacteristic.setValue(data);
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                return gattServer.notifyCharacteristicChanged(device, notifyCharacteristic, false, data) == 0;
            } else {
                return gattServer.notifyCharacteristicChanged(device, notifyCharacteristic, false);
            }
        } catch (Throwable t) {
            Log.w(TAG, "sendRawNotification failed for " + device.getAddress() + ": " + t.getMessage());
            return false;
        }
    }

    private boolean sendSlicedNotification(BluetoothDevice device, byte[] data, int maxAttrLen) {
        int headerSize = 4; // [0x53, pktId, seq, total]
        int slicePayloadSize = Math.max(64, maxAttrLen - headerSize);
        int totalSlices = (int) Math.ceil((double) data.length / slicePayloadSize);
        if (totalSlices > 255) totalSlices = 255;

        int pktId;
        synchronized (this) {
            pktId = (rollingPacketId++) & 0xFF;
        }

        Log.d(TAG, "Slicing notification for " + device.getAddress() + " into " + totalSlices + " slices (sliceSize=" + slicePayloadSize + ")");

        for (int i = 0; i < totalSlices; i++) {
            int start = i * slicePayloadSize;
            int end = Math.min(start + slicePayloadSize, data.length);
            int len = end - start;

            byte[] chunk = new byte[headerSize + len];
            chunk[0] = (byte) 0x53; // 'S' for slice frame
            chunk[1] = (byte) pktId;
            chunk[2] = (byte) i;
            chunk[3] = (byte) totalSlices;
            System.arraycopy(data, start, chunk, headerSize, len);

            boolean sent = sendRawNotification(device, chunk);
            if (!sent) {
                Log.w(TAG, "Slice " + i + "/" + totalSlices + " notification failed for " + device.getAddress() + ", aborting");
                return false;
            }

            // Pacing delay between sequential slice notifications to prevent buffer overflow
            if (i < totalSlices - 1) {
                try { Thread.sleep(32); } catch (InterruptedException ignored) {}
            }
        }
        return true;
    }

    // ── Native Voice Walkie-Talkie Recording & Audio Playback ────────────────
    @ReactMethod
    public void playPttTone(String type, Promise promise) {
        try {
            ToneGenerator tg = new ToneGenerator(AudioManager.STREAM_MUSIC, 90);
            if ("start".equalsIgnoreCase(type)) {
                tg.startTone(ToneGenerator.TONE_PROP_BEEP, 100);
            } else if ("roger".equalsIgnoreCase(type)) {
                tg.startTone(ToneGenerator.TONE_PROP_ACK, 140);
            } else if ("incoming".equalsIgnoreCase(type)) {
                tg.startTone(ToneGenerator.TONE_PROP_BEEP2, 180);
            } else {
                tg.startTone(ToneGenerator.TONE_PROP_BEEP, 80);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void startVoiceRecording(Promise promise) {
        try {
            if (mediaRecorder != null) {
                try { mediaRecorder.release(); } catch (Exception ignored) {}
                mediaRecorder = null;
            }

            // Audible PTT chirp on mic activation
            try {
                ToneGenerator tg = new ToneGenerator(AudioManager.STREAM_MUSIC, 85);
                tg.startTone(ToneGenerator.TONE_PROP_BEEP, 90);
            } catch (Exception ignored) {}

            audioRecordFile = File.createTempFile("ptt_rec_", ".amr", getReactApplicationContext().getCacheDir());

            if (android.os.Build.VERSION.SDK_INT >= 31) {
                mediaRecorder = new MediaRecorder(getReactApplicationContext());
            } else {
                //noinspection deprecation
                mediaRecorder = new MediaRecorder();
            }

            mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.AMR_NB);
            mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AMR_NB);
            mediaRecorder.setOutputFile(audioRecordFile.getAbsolutePath());
            mediaRecorder.prepare();
            mediaRecorder.start();
            Log.d(TAG, "Native audio recording started: " + audioRecordFile.getAbsolutePath());
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start audio recording: " + e.getMessage(), e);
            promise.reject("RECORD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopVoiceRecording(Promise promise) {
        try {
            // Audible Roger Beep on mic release
            try {
                ToneGenerator tg = new ToneGenerator(AudioManager.STREAM_MUSIC, 85);
                tg.startTone(ToneGenerator.TONE_PROP_ACK, 120);
            } catch (Exception ignored) {}

            if (mediaRecorder != null) {
                try {
                    mediaRecorder.stop();
                } catch (Exception stopErr) {
                    Log.w(TAG, "mediaRecorder.stop notice: " + stopErr.getMessage());
                }
                try {
                    mediaRecorder.release();
                } catch (Exception ignored) {}
                mediaRecorder = null;
            }

            if (audioRecordFile != null && audioRecordFile.exists() && audioRecordFile.length() > 6) {
                byte[] bytes = new byte[(int) audioRecordFile.length()];
                FileInputStream fis = new FileInputStream(audioRecordFile);
                int readBytes = fis.read(bytes);
                fis.close();
                audioRecordFile.delete();

                String base64Audio = android.util.Base64.encodeToString(bytes, 0, readBytes, android.util.Base64.NO_WRAP);
                Log.d(TAG, "Native audio recording finished: " + readBytes + " bytes");
                promise.resolve(base64Audio);
            } else {
                if (audioRecordFile != null && audioRecordFile.exists()) {
                    audioRecordFile.delete();
                }
                promise.resolve("");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop audio recording: " + e.getMessage(), e);
            promise.reject("STOP_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void playVoiceAudio(String base64Audio, Promise promise) {
        try {
            if (base64Audio == null || base64Audio.trim().isEmpty()) {
                promise.resolve(false);
                return;
            }
            if (mediaPlayer != null) {
                try { mediaPlayer.stop(); mediaPlayer.release(); } catch (Exception ignored) {}
                mediaPlayer = null;
            }
            byte[] bytes = android.util.Base64.decode(base64Audio.trim(), android.util.Base64.NO_WRAP);
            if (bytes == null || bytes.length == 0) {
                promise.resolve(false);
                return;
            }

            // Ensure valid AMR-NB magic header: 0x23, 0x21, 0x41, 0x4D, 0x52, 0x0A ("#!AMR\n")
            byte[] amrHeader = new byte[] { 0x23, 0x21, 0x41, 0x4D, 0x52, 0x0A };
            if (bytes.length < 6 || bytes[0] != 0x23 || bytes[1] != 0x21 || bytes[2] != 0x41 ||
                bytes[3] != 0x4D || bytes[4] != 0x52 || bytes[5] != 0x0A) {
                Log.w(TAG, "Voice burst missing valid AMR-NB header. Prepending valid header...");
                byte[] repaired = new byte[amrHeader.length + bytes.length];
                System.arraycopy(amrHeader, 0, repaired, 0, amrHeader.length);
                System.arraycopy(bytes, 0, repaired, amrHeader.length, bytes.length);
                bytes = repaired;
            }

            final File tempPlayFile = File.createTempFile("ptt_play_", ".amr", getReactApplicationContext().getCacheDir());
            FileOutputStream fos = new FileOutputStream(tempPlayFile);
            fos.write(bytes);
            fos.close();

            // Force audio route to loudspeaker / speakerphone at boosted volume
            AudioManager audioManager = (AudioManager) getReactApplicationContext().getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                try {
                    audioManager.setMode(AudioManager.MODE_NORMAL);
                    audioManager.setSpeakerphoneOn(true);
                    int maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                    int currentVol = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
                    if (currentVol < maxVol * 0.8) {
                        audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, (int)(maxVol * 0.9), 0);
                    }
                } catch (Exception ignored) {}

                if (android.os.Build.VERSION.SDK_INT >= 31) {
                    try {
                        List<AudioDeviceInfo> devices = audioManager.getAvailableCommunicationDevices();
                        for (AudioDeviceInfo dev : devices) {
                            if (dev.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                                audioManager.setCommunicationDevice(dev);
                                break;
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }

            mediaPlayer = new MediaPlayer();
            if (android.os.Build.VERSION.SDK_INT >= 21) {
                mediaPlayer.setAudioAttributes(
                    new android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                );
            } else {
                //noinspection deprecation
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC);
            }
            mediaPlayer.setVolume(1.0f, 1.0f);
            mediaPlayer.setDataSource(tempPlayFile.getAbsolutePath());
            mediaPlayer.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override
                public void onCompletion(MediaPlayer mp) {
                    try { mp.release(); } catch (Exception ignored) {}
                    tempPlayFile.delete();
                    mediaPlayer = null;
                }
            });
            mediaPlayer.setOnErrorListener(new MediaPlayer.OnErrorListener() {
                @Override
                public boolean onError(MediaPlayer mp, int what, int extra) {
                    try { mp.release(); } catch (Exception ignored) {}
                    tempPlayFile.delete();
                    mediaPlayer = null;
                    return true;
                }
            });
            mediaPlayer.prepare();
            mediaPlayer.start();
            Log.d(TAG, "Playing incoming voice audio through phone speaker (" + bytes.length + " bytes)");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to play voice audio: " + e.getMessage(), e);
            promise.reject("PLAY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopVoiceAudio(Promise promise) {
        try {
            if (mediaPlayer != null) {
                try { mediaPlayer.stop(); mediaPlayer.release(); } catch (Exception ignored) {}
                mediaPlayer = null;
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("STOP_PLAY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Required for React Native NativeEventEmitter
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // Required for React Native NativeEventEmitter
    }

    // ── Stop GATT Server + Advertising ───────────────────────────────────────
    @ReactMethod
    public void stopGattServer(Promise promise) {
        try {
            if (advertiser != null) advertiser.stopAdvertising(advertiseCallback);
            if (gattServer != null) gattServer.close();
            if (mediaPlayer != null) {
                try { mediaPlayer.release(); } catch (Exception ignored) {}
                mediaPlayer = null;
            }
            if (mediaRecorder != null) {
                try { mediaRecorder.release(); } catch (Exception ignored) {}
                mediaRecorder = null;
            }
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
                sendEvent("onCentralConnected", device.getAddress());
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                Log.d(TAG, "Central disconnected: " + device.getAddress());
                deviceMtus.remove(device.getAddress());
                synchronized (connectedCentrals) {
                    connectedCentrals.remove(device);
                }
                sendEvent("onCentralDisconnected", device.getAddress());
            }
        }

        @Override
        public void onMtuChanged(BluetoothDevice device, int mtu) {
            Log.d(TAG, "Central " + device.getAddress() + " negotiated MTU: " + mtu);
            deviceMtus.put(device.getAddress(), Math.max(mtu, 512));
        }

        @Override
        public void onCharacteristicWriteRequest(BluetoothDevice device,
                int requestId, BluetoothGattCharacteristic characteristic,
                boolean preparedWrite, boolean responseNeeded,
                int offset, byte[] value) {

            if (characteristic.getUuid().equals(WRITE_CHAR_UUID)) {
                if (preparedWrite) {
                    if (value != null) {
                        prepareWriteBuffer.write(value, 0, value.length);
                    }
                    if (responseNeeded) {
                        gattServer.sendResponse(device, requestId,
                            BluetoothGatt.GATT_SUCCESS, offset, value);
                    }
                    return;
                }

                if (value != null && value.length > 0) {
                    handleIncomingRawOrSlicedWrite(device.getAddress(), value);
                }
            }

            if (responseNeeded) {
                gattServer.sendResponse(device, requestId,
                    BluetoothGatt.GATT_SUCCESS, 0, null);
            }
        }

        @Override
        public void onExecuteWrite(BluetoothDevice device, int requestId, boolean execute) {
            if (execute) {
                byte[] fullData = prepareWriteBuffer.toByteArray();
                prepareWriteBuffer.reset();
                if (fullData.length > 0) {
                    checkAndTriggerBackgroundWake(device.getAddress(), fullData);
                    String base64 = android.util.Base64.encodeToString(fullData, android.util.Base64.NO_WRAP);
                    Log.d(TAG, "Executed long packet write from " + device.getAddress() + " (" + fullData.length + " bytes)");
                    WritableMap params = Arguments.createMap();
                    params.putString("fromDevice", device.getAddress());
                    params.putString("data", base64);
                    sendEventMap("onPacketReceived", params);
                }
            } else {
                prepareWriteBuffer.reset();
            }
            if (gattServer != null) {
                gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null);
            }
        }

        @Override
        public void onDescriptorWriteRequest(BluetoothDevice device, int requestId,
                BluetoothGattDescriptor descriptor, boolean preparedWrite,
                boolean responseNeeded, int offset, byte[] value) {
            if (descriptor != null && value != null) {
                descriptor.setValue(value);
            }
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
            if (errorCode == AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED) {
                Log.d(TAG, "BLE advertising was already started — treating as success");
                sendEvent("onAdvertisingStarted", "already_started");
                return;
            }
            if (errorCode == AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE) {
                Log.w(TAG, "BLE advertisement packet too large, retrying with minimal UUID...");
                try {
                    AdvertiseSettings minimalSettings = new AdvertiseSettings.Builder()
                        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                        .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                        .setConnectable(true)
                        .build();
                    AdvertiseData minimalData = new AdvertiseData.Builder()
                        .addServiceUuid(new ParcelUuid(NEERNETRA_SERVICE_UUID))
                        .build();
                    advertiser.startAdvertising(minimalSettings, minimalData, advertiseCallback);
                    return;
                } catch (Exception retryEx) {
                    Log.e(TAG, "Minimal retry advertising error: " + retryEx.getMessage());
                }
            }
            sendEvent("onAdvertisingFailed", String.valueOf(errorCode));
        }
    };

    // ── Handle Incoming Raw or Sliced Write Packets ──────────────────────────
    private void handleIncomingRawOrSlicedWrite(String deviceAddress, byte[] value) {
        try {
            // Clean up any stale slice buffers older than 10 seconds
            long now = System.currentTimeMillis();
            for (Map.Entry<String, Long> entry : new ArrayList<>(incomingWriteTimestamps.entrySet())) {
                if (now - entry.getValue() > 10000) {
                    incomingWriteBuffers.remove(entry.getKey());
                    incomingWriteTotals.remove(entry.getKey());
                    incomingWriteTimestamps.remove(entry.getKey());
                }
            }

            if (value.length >= 4 && value[0] == (byte) 0x53) {
                // Sliced packet: [0x53, pktId, seq, total, ...data]
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
                    // All slices received! Reconstruct full packet
                    ByteArrayOutputStream fullOut = new ByteArrayOutputStream();
                    for (int s = 0; s < total; s++) {
                        byte[] part = buffer.get(s);
                        if (part != null) {
                            fullOut.write(part, 0, part.length);
                        }
                    }
                    incomingWriteBuffers.remove(bufferKey);
                    incomingWriteTotals.remove(bufferKey);
                    incomingWriteTimestamps.remove(bufferKey);

                    byte[] fullBytes = fullOut.toByteArray();
                    checkAndTriggerBackgroundWake(deviceAddress, fullBytes);
                    String base64 = android.util.Base64.encodeToString(fullBytes, android.util.Base64.NO_WRAP);
                    Log.d(TAG, "Reassembled sliced write from " + deviceAddress + " (" + fullBytes.length + " bytes across " + total + " slices)");

                    WritableMap params = Arguments.createMap();
                    params.putString("fromDevice", deviceAddress);
                    params.putString("data", base64);
                    sendEventMap("onPacketReceived", params);
                }
            } else {
                // Direct un-sliced packet
                checkAndTriggerBackgroundWake(deviceAddress, value);
                String base64 = android.util.Base64.encodeToString(value, android.util.Base64.NO_WRAP);
                Log.d(TAG, "Received direct packet from " + deviceAddress + " (" + value.length + " bytes)");

                WritableMap params = Arguments.createMap();
                params.putString("fromDevice", deviceAddress);
                params.putString("data", base64);
                sendEventMap("onPacketReceived", params);
            }
        } catch (Exception e) {
            Log.e(TAG, "handleIncomingRawOrSlicedWrite error: " + e.getMessage());
        }
    }

    private void checkAndTriggerBackgroundWake(String deviceAddress, byte[] data) {
        try {
            if (data == null || data.length < 5) return;

            Context ctx = getReactApplicationContext();
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            boolean isScreenOn = pm != null && pm.isInteractive();
            boolean isBackground = ctx instanceof ReactApplicationContext &&
                ((ReactApplicationContext) ctx).getLifecycleState() != LifecycleState.RESUMED;

            if (!isScreenOn || isBackground) {
                String raw = new String(data, StandardCharsets.UTF_8);
                if (raw.contains("\"t\":7") || raw.contains("\"t\": 7")) {
                    // Call request
                    String callerName = "Nearby Citizen";
                    boolean isGroup = raw.contains("GROUP_CALL") || raw.contains("\"isGroupCall\":true") || raw.contains("\"isGroupCall\": true");
                    try {
                        JSONObject jo = new JSONObject(raw);
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

                    NeerNetraMeshService.wakeScreenAndShowNotification(
                        ctx,
                        isGroup ? "🚨 GROUP EMERGENCY CALL" : "📞 INCOMING EMERGENCY CALL",
                        callerName + " is calling via BLE mesh...",
                        isGroup ? "GROUP_CALL" : "CALL_REQ",
                        b
                    );
                } else if (raw.contains("\"t\":3") || raw.contains("\"t\": 3")) {
                    // SOS Distress
                    Bundle b = new Bundle();
                    b.putString("caller_id", deviceAddress);
                    NeerNetraMeshService.wakeScreenAndShowNotification(
                        ctx,
                        "🚨 CRITICAL SOS DISTRESS BEACON",
                        "Emergency distress beacon received via offline BLE mesh!",
                        "SOS_ALERT",
                        b
                    );
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "checkAndTriggerBackgroundWake exception: " + e.getMessage());
        }
    }

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
