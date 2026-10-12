package com.neernetra.disaster;

import android.bluetooth.*;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.AudioTrack;
import android.media.AudioFocusRequest;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.media.ToneGenerator;
import android.util.Log;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;

import java.io.File;
import java.io.FileInputStream;
import java.util.List;

/**
 * NeerNetraGattModule
 * ====================
 * React Native bridge module that connects to the 24/7 native NeerNetraNativeMeshManager
 * and provides hardware voice recording / audio playback for the walkie-talkie.
 */
public class NeerNetraGattModule extends ReactContextBaseJavaModule {

    private static final String TAG = "NeerNetraGATT";

    private static ReactApplicationContext staticReactContext;
    private static Intent pendingEmergencyIntent = null;

    // Hardware Audio recording & playback
    private MediaRecorder mediaRecorder;
    private File audioRecordFile;
    private MediaPlayer mediaPlayer;
    private AudioTrack audioTrack;
    private AudioRecord audioRecord;
    private Thread audioCaptureThread;
    private volatile boolean isRecordingStream = false;
    private AudioFocusRequest audioFocusRequest;
    private static final int SAMPLE_RATE_16K = 16000;
    private static final int SAMPLE_RATE_8K = 8000;

    public NeerNetraGattModule(ReactApplicationContext context) {
        super(context);
        staticReactContext = context;
    }

    public static ReactApplicationContext getStaticReactContext() {
        return staticReactContext;
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
                map.putBoolean("auto_answer", intent.getBooleanExtra("auto_answer", false));
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
            map.putBoolean("auto_answer", pendingEmergencyIntent.getBooleanExtra("auto_answer", false));
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
                callerName + " is calling via BLE mesh...",
                isGroupCall ? "GROUP_CALL" : "CALL_REQ",
                b
            );
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("WAKE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void triggerNativeSosAlert(String alertTitle, String alertBody, String senderId, Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            Bundle b = new Bundle();
            b.putString("caller_id", senderId);

            NeerNetraMeshService.wakeScreenAndShowNotification(
                ctx,
                alertTitle,
                alertBody,
                "SOS_ALERT",
                b
            );
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SOS_ERROR", e.getMessage());
        }
    }

    /**
     * Immediately dismiss the IncomingCallActivity on THIS device.
     * Called when the user ends a call from the active call HUD, so the incoming
     * screen on the remote side is closed with zero delay.
     */
    @ReactMethod
    public void dismissIncomingCall(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            android.content.Intent dismissIntent = new android.content.Intent(
                IncomingCallActivity.ACTION_DISMISS_INCOMING_CALL
            );
            ctx.sendBroadcast(dismissIntent);
            // Disconnect Telecom connection
            NeerNetraConnectionService.disconnectCall();
            // Also silence any alarm that's playing
            NeerNetraMeshService.stopEmergencyAlarm();
            // Cancel emergency notification
            android.app.NotificationManager nm =
                (android.app.NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(NeerNetraMeshService.EMERGENCY_NOTIFICATION_ID);
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void showChatNotification(String senderName, String messageText, Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            NeerNetraMeshService.showChatNotification(ctx, senderName, messageText);
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @Override
    public String getName() {
        return "NeerNetraGatt";
    }

    @ReactMethod
    public void setLocalNodeId(String nodeId, Promise promise) {
        try {
            android.content.SharedPreferences sp = getReactApplicationContext().getSharedPreferences("NeerNetraPrefs", Context.MODE_PRIVATE);
            sp.edit().putString("local_node_id", nodeId).commit();
            NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).refreshAdvertising();
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void setLowPowerBeaconMode(boolean enable, Promise promise) {
        try {
            NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).setLowPowerBeaconMode(enable);
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void startGattServer(String deviceName, Promise promise) {
        try {
            android.content.SharedPreferences sp = getReactApplicationContext().getSharedPreferences("NeerNetraPrefs", Context.MODE_PRIVATE);
            android.content.SharedPreferences.Editor editor = sp.edit();
            editor.putString("local_node_name", deviceName);
            if (!sp.contains("local_node_id") || sp.getString("local_node_id", "").isEmpty()) {
                editor.putString("local_node_id", deviceName);
            }
            editor.apply();

            // Ensure 24/7 service is active
            NeerNetraMeshService.startService(getReactApplicationContext());

            // Start native mesh engine
            boolean success = NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).startMeshEngine(deviceName);
            if (success) {
                promise.resolve("GATT server active via NeerNetraNativeMeshManager");
            } else {
                promise.reject("GATT_ERROR", "Failed to start native GATT server");
            }
        } catch (Exception e) {
            Log.e(TAG, "startGattServer error", e);
            promise.reject("GATT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getKnownPeers(Promise promise) {
        try {
            WritableArray array = Arguments.createArray();
            android.content.SharedPreferences sp = getReactApplicationContext().getSharedPreferences("NeerNetraPrefs", Context.MODE_PRIVATE);
            String myNodeId = sp.getString("local_node_id", "");
            String myNodeName = sp.getString("local_node_name", "");

            java.util.Map<String, NeerNetraNativeMeshManager.MeshRoute> routes =
                NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).getRoutingTable();
            long now = System.currentTimeMillis();
            for (NeerNetraNativeMeshManager.MeshRoute r : routes.values()) {
                if (r == null || r.peerId == null) continue;
                if (!myNodeId.isEmpty() && (r.peerId.equalsIgnoreCase(myNodeId) || r.peerId.contains(myNodeId) || myNodeId.contains(r.peerId))) continue;
                if (!myNodeName.isEmpty() && r.name != null && (r.name.equalsIgnoreCase(myNodeName) || r.name.contains(myNodeName) || myNodeName.contains(r.name))) continue;
                if (NeerNetraNativeMeshManager.isTestOrSimulatedPeer(r.peerId, r.name)) continue;
                if (r.hopCount > NeerNetraNativeMeshManager.MAX_HOP_COUNT) continue;
                if (now - r.lastSeen > 120000) continue; // Do not return stale peers older than 2 minutes

                WritableMap map = Arguments.createMap();
                map.putString("id", r.peerId);
                map.putString("name", r.name != null ? r.name : ("Citizen [" + r.peerId + "]"));
                int hops = r.hopCount > 0 ? r.hopCount : 1;
                map.putInt("hopCount", hops);
                map.putString("nextHop", r.nextHop != null ? r.nextHop : r.peerId);
                map.putDouble("lastSeen", (double) r.lastSeen);
                map.putDouble("lat", r.lat);
                map.putDouble("lng", r.lng);
                map.putInt("battery", r.battery > 0 ? r.battery : 85);
                int rssi = -60 - (hops > 1 ? (hops * 5) : 0);
                map.putInt("rssi", rssi);
                map.putInt("distanceMeters", hops <= 1 ? 45 : (hops * 200));
                String status = (now - r.lastSeen > 240000 && !"SOS".equals(r.status)) ? "IDLE" : (r.status != null ? r.status : "SAFE");
                map.putString("status", status);
                map.putString("role", hops > 1 ? "Mesh Relay Node" : "Citizen Node");
                array.pushMap(map);
            }
            promise.resolve(array);
        } catch (Exception e) {
            Log.e(TAG, "getKnownPeers error", e);
            promise.reject("GET_KNOWN_PEERS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void clearTestPeers(Promise promise) {
        try {
            NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).clearTestPeers();
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "clearTestPeers error", e);
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void clearAllPeers(Promise promise) {
        try {
            NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).clearAllPeers();
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "clearAllPeers error", e);
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void notifyAllClients(String base64Data, Promise promise) {
        try {
            int count = NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).notifyAllClients(base64Data);
            promise.resolve(count);
        } catch (Exception e) {
            promise.resolve(0);
        }
    }

    @ReactMethod
    public void triggerWifiDirectCall(String targetNodeId, String callerName, Promise promise) {
        try {
            android.content.SharedPreferences sp = getReactApplicationContext().getSharedPreferences("NeerNetraPrefs", Context.MODE_PRIVATE);
            String myNodeId = sp.getString("local_node_id", "dev_node_" + Build.MODEL.replaceAll("[^a-zA-Z0-9]", ""));
            String myNodeName = sp.getString("local_node_name", Build.MODEL);

            org.json.JSONObject payload = new org.json.JSONObject();
            payload.put("callerId", myNodeId);
            payload.put("callerName", (callerName != null && !callerName.isEmpty()) ? callerName : myNodeName);
            payload.put("targetId", targetNodeId);
            payload.put("transport", "wifi_direct");
            payload.put("isWifiDirectCall", true);
            payload.put("timestamp", System.currentTimeMillis());

            org.json.JSONObject envelope = new org.json.JSONObject();
            envelope.put("t", 7); // CALL_REQUEST
            envelope.put("m", "wcall_" + System.currentTimeMillis() + "_" + (myNodeId.length() > 6 ? myNodeId.substring(0, 6) : myNodeId));
            envelope.put("s", myNodeId);
            envelope.put("name", myNodeName);
            envelope.put("d", targetNodeId != null ? targetNodeId : "BROADCAST");
            envelope.put("ttl", 10);
            envelope.put("p", payload.toString());

            byte[] packetBytes = envelope.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            String b64 = android.util.Base64.encodeToString(packetBytes, android.util.Base64.NO_WRAP);
            NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).notifyAllClients(b64);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("WIFI_CALL_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void broadcastWifiBeacon(Promise promise) {
        try {
            NeerNetraWifiMeshManager.getInstance(getReactApplicationContext()).broadcastWifiHelloBeacon();
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void triggerWifiDirectMessage(String targetNodeId, String messageText, Promise promise) {
        try {
            android.content.SharedPreferences sp = getReactApplicationContext().getSharedPreferences("NeerNetraPrefs", Context.MODE_PRIVATE);
            String myNodeId = sp.getString("local_node_id", "dev_node_" + Build.MODEL.replaceAll("[^a-zA-Z0-9]", ""));
            String myNodeName = sp.getString("local_node_name", Build.MODEL);

            org.json.JSONObject payload = new org.json.JSONObject();
            payload.put("senderId", myNodeId);
            payload.put("senderName", myNodeName);
            payload.put("text", messageText);
            payload.put("transport", "wifi_direct");
            payload.put("targetId", targetNodeId != null ? targetNodeId : "BROADCAST");
            payload.put("timestamp", System.currentTimeMillis());

            org.json.JSONObject envelope = new org.json.JSONObject();
            envelope.put("t", 2); // BLEMsgType.CHAT
            envelope.put("m", "wmsg_" + System.currentTimeMillis() + "_" + (myNodeId.length() > 6 ? myNodeId.substring(0, 6) : myNodeId));
            envelope.put("s", myNodeId);
            envelope.put("name", myNodeName);
            envelope.put("d", targetNodeId != null ? targetNodeId : "BROADCAST");
            envelope.put("ttl", 10);
            envelope.put("p", payload.toString());

            byte[] packetBytes = envelope.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            String b64 = android.util.Base64.encodeToString(packetBytes, android.util.Base64.NO_WRAP);
            NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).notifyAllClients(b64);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("WIFI_MSG_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void triggerWifiDirectVoiceBurst(String targetNodeId, String base64Audio, boolean isGroupCall, Promise promise) {
        try {
            if (base64Audio == null || base64Audio.trim().isEmpty()) {
                promise.resolve(false);
                return;
            }

            android.content.SharedPreferences sp = getReactApplicationContext().getSharedPreferences("NeerNetraPrefs", Context.MODE_PRIVATE);
            String myNodeId = sp.getString("local_node_id", "dev_node_" + Build.MODEL.replaceAll("[^a-zA-Z0-9]", ""));
            String myNodeName = sp.getString("local_node_name", Build.MODEL);

            String dest = (isGroupCall || targetNodeId == null || targetNodeId.isEmpty() || "GROUP_CALL".equals(targetNodeId)) ? "BROADCAST" : targetNodeId;

            org.json.JSONObject payload = new org.json.JSONObject();
            payload.put("audio", base64Audio.trim());
            payload.put("senderId", myNodeId);
            payload.put("senderName", myNodeName);
            payload.put("targetId", dest);
            payload.put("targetNodeId", dest);
            payload.put("isGroupCall", isGroupCall);
            payload.put("transport", "wifi_direct");
            payload.put("timestamp", System.currentTimeMillis());

            org.json.JSONObject envelope = new org.json.JSONObject();
            envelope.put("t", 11); // VOICE_BURST
            envelope.put("type", "VOICE_BURST");
            envelope.put("m", "wvoice_" + System.currentTimeMillis() + "_" + (myNodeId.length() > 6 ? myNodeId.substring(0, 6) : myNodeId));
            envelope.put("s", myNodeId);
            envelope.put("name", myNodeName);
            envelope.put("d", dest);
            envelope.put("ttl", 10);
            envelope.put("audio", base64Audio.trim());
            envelope.put("p", payload.toString());

            byte[] packetBytes = envelope.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            String b64 = android.util.Base64.encodeToString(packetBytes, android.util.Base64.NO_WRAP);
            NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).notifyAllClients(b64);
            Log.i(TAG, "🎙️ Native Wi-Fi voice burst dispatched (" + base64Audio.length() + " chars) to " + dest);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "triggerWifiDirectVoiceBurst error: " + e.getMessage(), e);
            promise.reject("WIFI_VOICE_ERROR", e.getMessage());
        }
    }

    // ── Safe Tone Generator Helper (Auto-released to prevent AudioTrack exhaustion) ──
    public static void playToneSafely(int toneType, int durationMs) {
        new Thread(() -> {
            ToneGenerator tg = null;
            try {
                tg = new ToneGenerator(AudioManager.STREAM_MUSIC, 85);
                tg.startTone(toneType, durationMs);
                Thread.sleep(durationMs + 30);
            } catch (Exception ignored) {
            } finally {
                if (tg != null) {
                    try { tg.release(); } catch (Exception ignored) {}
                }
            }
        }).start();
    }

    // ── Voice Recording & Playback ───────────────────────────────────────────
    @ReactMethod
    public void playPttTone(String type, Promise promise) {
        try {
            int tone = ToneGenerator.TONE_PROP_BEEP;
            int dur = 80;
            if ("start".equalsIgnoreCase(type)) {
                tone = ToneGenerator.TONE_PROP_BEEP;
                dur = 100;
            } else if ("roger".equalsIgnoreCase(type)) {
                tone = ToneGenerator.TONE_PROP_ACK;
                dur = 140;
            } else if ("incoming".equalsIgnoreCase(type)) {
                tone = ToneGenerator.TONE_PROP_BEEP2;
                dur = 180;
            }
            playToneSafely(tone, dur);
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

            playToneSafely(ToneGenerator.TONE_PROP_BEEP, 70);

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
            try {
                mediaRecorder.prepare();
                mediaRecorder.start();
            } catch (Exception prepErr) {
                Log.w(TAG, "MediaRecorder MIC failed, retrying with DEFAULT audio source: " + prepErr.getMessage());
                try { mediaRecorder.reset(); } catch (Exception ignored) {}
                mediaRecorder.setAudioSource(MediaRecorder.AudioSource.DEFAULT);
                mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.AMR_NB);
                mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AMR_NB);
                mediaRecorder.setOutputFile(audioRecordFile.getAbsolutePath());
                mediaRecorder.prepare();
                mediaRecorder.start();
            }
            Log.d(TAG, "Native audio recording started: " + audioRecordFile.getAbsolutePath());
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start audio recording: " + e.getMessage(), e);
            if (mediaRecorder != null) {
                try { mediaRecorder.release(); } catch (Exception ignored) {}
                mediaRecorder = null;
            }
            promise.reject("RECORD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopVoiceRecording(Promise promise) {
        try {
            playToneSafely(ToneGenerator.TONE_PROP_ACK, 100);

            if (mediaRecorder != null) {
                try {
                    mediaRecorder.stop();
                } catch (RuntimeException re) {
                    Log.w(TAG, "MediaRecorder stop runtime exception (short record): " + re.getMessage());
                } catch (Exception ignored) {}
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

    // ── Audio Focus & Speakerphone Helpers ─────────────────────────────────
    private boolean acquireAudioFocus(AudioManager am) {
        if (am == null) return false;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(playbackAttributes)
                    .setAcceptsDelayedFocusGain(true)
                    .setOnAudioFocusChangeListener(focusChange -> {
                        Log.d(TAG, "Audio focus changed: " + focusChange);
                    })
                    .build();
                int res = am.requestAudioFocus(audioFocusRequest);
                return res == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
            } else {
                //noinspection deprecation
                int res = am.requestAudioFocus(null, AudioManager.STREAM_VOICE_CALL, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
                return res == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
            }
        } catch (Exception e) {
            Log.w(TAG, "acquireAudioFocus error: " + e.getMessage());
            return false;
        }
    }

    private void abandonAudioFocus(AudioManager am) {
        if (am == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                am.abandonAudioFocusRequest(audioFocusRequest);
                audioFocusRequest = null;
            } else {
                //noinspection deprecation
                am.abandonAudioFocus(null);
            }
        } catch (Exception e) {
            Log.w(TAG, "abandonAudioFocus error: " + e.getMessage());
        }
    }

    private void enableSpeakerphone(AudioManager am, boolean enable) {
        if (am == null) return;
        try {
            if (enable) {
                am.setMode(AudioManager.MODE_IN_COMMUNICATION);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    List<AudioDeviceInfo> devices = am.getAvailableCommunicationDevices();
                    for (AudioDeviceInfo device : devices) {
                        if (device.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                            am.setCommunicationDevice(device);
                            break;
                        }
                    }
                }
                am.setSpeakerphoneOn(true);
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    am.clearCommunicationDevice();
                }
                am.setSpeakerphoneOn(false);
                am.setMode(AudioManager.MODE_NORMAL);
            }
        } catch (Exception e) {
            Log.w(TAG, "enableSpeakerphone error: " + e.getMessage());
        }
    }

    @ReactMethod
    public void playAudioChunk(String base64Chunk, Promise promise) {
        try {
            if (base64Chunk == null || base64Chunk.trim().isEmpty()) {
                if (promise != null) promise.resolve(false);
                return;
            }
            byte[] pcmData = android.util.Base64.decode(base64Chunk.trim(), android.util.Base64.NO_WRAP);
            if (pcmData == null || pcmData.length == 0) {
                if (promise != null) promise.resolve(false);
                return;
            }

            final AudioManager audioManager = (AudioManager) getReactApplicationContext().getSystemService(Context.AUDIO_SERVICE);
            acquireAudioFocus(audioManager);
            enableSpeakerphone(audioManager, true);

            // Ensure stream volumes are unmuted for audible playback
            try {
                int musicVol = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
                int maxMusic = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                if (musicVol < maxMusic / 4 && maxMusic > 0) {
                    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, (int)(maxMusic * 0.75), 0);
                }
                int callVol = audioManager.getStreamVolume(AudioManager.STREAM_VOICE_CALL);
                int maxCall = audioManager.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL);
                if (callVol < maxCall / 4 && maxCall > 0) {
                    audioManager.setStreamVolume(AudioManager.STREAM_VOICE_CALL, (int)(maxCall * 0.75), 0);
                }
            } catch (Exception ignored) {}

            if (audioTrack == null || audioTrack.getState() != AudioTrack.STATE_INITIALIZED) {
                int channelConfig = AudioFormat.CHANNEL_OUT_MONO;
                int audioFormat = AudioFormat.ENCODING_PCM_16BIT;
                int sampleRate = SAMPLE_RATE_16K;
                int minBufSize = AudioTrack.getMinBufferSize(sampleRate, channelConfig, audioFormat);
                if (minBufSize <= 0) {
                    sampleRate = SAMPLE_RATE_8K;
                    minBufSize = AudioTrack.getMinBufferSize(sampleRate, channelConfig, audioFormat);
                }
                int bufferSize = Math.max(minBufSize * 2, 8192);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    // Try USAGE_MEDIA first for loud speaker output, fallback to USAGE_VOICE_COMMUNICATION
                    try {
                        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build();
                        AudioFormat format = new AudioFormat.Builder()
                            .setSampleRate(sampleRate)
                            .setChannelMask(channelConfig)
                            .setEncoding(audioFormat)
                            .build();
                        audioTrack = new AudioTrack(audioAttributes, format, bufferSize, AudioTrack.MODE_STREAM, AudioManager.AUDIO_SESSION_ID_GENERATE);
                    } catch (Exception e) {
                        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build();
                        AudioFormat format = new AudioFormat.Builder()
                            .setSampleRate(sampleRate)
                            .setChannelMask(channelConfig)
                            .setEncoding(audioFormat)
                            .build();
                        audioTrack = new AudioTrack(audioAttributes, format, bufferSize, AudioTrack.MODE_STREAM, AudioManager.AUDIO_SESSION_ID_GENERATE);
                    }
                } else {
                    //noinspection deprecation
                    audioTrack = new AudioTrack(AudioManager.STREAM_MUSIC, sampleRate, channelConfig, audioFormat, bufferSize, AudioTrack.MODE_STREAM);
                }

                if (audioTrack.getState() != AudioTrack.STATE_INITIALIZED) {
                    // Fallback to STREAM_VOICE_CALL
                    //noinspection deprecation
                    audioTrack = new AudioTrack(AudioManager.STREAM_VOICE_CALL, sampleRate, channelConfig, audioFormat, bufferSize, AudioTrack.MODE_STREAM);
                }
            }

            if (audioTrack != null && audioTrack.getState() == AudioTrack.STATE_INITIALIZED) {
                if (audioTrack.getPlayState() != AudioTrack.PLAYSTATE_PLAYING) {
                    audioTrack.play();
                }
                audioTrack.write(pcmData, 0, pcmData.length);
                if (promise != null) promise.resolve(true);
            } else {
                if (promise != null) promise.resolve(false);
            }
        } catch (Exception e) {
            Log.e(TAG, "playAudioChunk error: " + e.getMessage(), e);
            if (promise != null) promise.reject("CHUNK_PLAY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopAudioChunkPlayback(Promise promise) {
        try {
            if (audioTrack != null) {
                try {
                    audioTrack.stop();
                    audioTrack.flush();
                    audioTrack.release();
                } catch (Exception ignored) {}
                audioTrack = null;
            }
            final AudioManager audioManager = (AudioManager) getReactApplicationContext().getSystemService(Context.AUDIO_SERVICE);
            abandonAudioFocus(audioManager);
            enableSpeakerphone(audioManager, false);
            if (promise != null) promise.resolve(true);
        } catch (Exception e) {
            if (promise != null) promise.reject("STOP_CHUNK_PLAY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void startAudioCaptureStream(Promise promise) {
        try {
            if (isRecordingStream) {
                promise.resolve(true);
                return;
            }

            int sampleRate = SAMPLE_RATE_16K;
            int channelConfig = AudioFormat.CHANNEL_IN_MONO;
            int audioFormat = AudioFormat.ENCODING_PCM_16BIT;
            int minBufSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat);
            if (minBufSize <= 0) {
                sampleRate = SAMPLE_RATE_8K;
                minBufSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat);
            }
            int bufferSize = Math.max(minBufSize * 2, 4096);

            int audioSource = MediaRecorder.AudioSource.VOICE_COMMUNICATION;
            try {
                audioRecord = new AudioRecord(audioSource, sampleRate, channelConfig, audioFormat, bufferSize);
            } catch (Exception e) {
                audioRecord = new AudioRecord(MediaRecorder.AudioSource.MIC, sampleRate, channelConfig, audioFormat, bufferSize);
            }

            if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
                sampleRate = SAMPLE_RATE_8K;
                audioRecord = new AudioRecord(MediaRecorder.AudioSource.MIC, sampleRate, channelConfig, audioFormat, bufferSize);
            }

            if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
                promise.reject("RECORD_INIT_FAIL", "Failed to initialize AudioRecord");
                return;
            }

            audioRecord.startRecording();
            isRecordingStream = true;

            final int finalSampleRate = sampleRate;
            final int chunkSize = 1600;
            audioCaptureThread = new Thread(() -> {
                byte[] buffer = new byte[chunkSize * 2];
                while (isRecordingStream) {
                    if (audioRecord == null) break;
                    int read = audioRecord.read(buffer, 0, buffer.length);
                    if (read > 0 && staticReactContext != null && staticReactContext.hasActiveReactInstance()) {
                        String base64Chunk = android.util.Base64.encodeToString(buffer, 0, read, android.util.Base64.NO_WRAP);
                        WritableMap map = Arguments.createMap();
                        map.putString("chunk", base64Chunk);
                        map.putInt("sampleRate", finalSampleRate);
                        map.putInt("bytesRead", read);
                        try {
                            staticReactContext
                                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                                .emit("onNativeAudioChunkRecorded", map);
                        } catch (Exception ignored) {}
                    }
                }
            }, "NeerNetraAudioCaptureThread");
            audioCaptureThread.setPriority(Thread.MAX_PRIORITY);
            audioCaptureThread.start();

            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "startAudioCaptureStream error: " + e.getMessage(), e);
            promise.reject("START_CAPTURE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopAudioCaptureStream(Promise promise) {
        try {
            isRecordingStream = false;
            if (audioCaptureThread != null) {
                try { audioCaptureThread.interrupt(); } catch (Exception ignored) {}
                audioCaptureThread = null;
            }
            if (audioRecord != null) {
                try {
                    audioRecord.stop();
                    audioRecord.release();
                } catch (Exception ignored) {}
                audioRecord = null;
            }
            if (promise != null) promise.resolve(true);
        } catch (Exception e) {
            if (promise != null) promise.reject("STOP_CAPTURE_ERROR", e.getMessage());
        }
    }

    private static MediaPlayer staticMediaPlayer = null;
    private static AudioFocusRequest staticAudioFocusRequest = null;
    private static String lastPlayedAudioHash = "";
    private static long lastPlayedAudioTime = 0;

    public static synchronized boolean playVoiceAudioStatic(Context context, String base64Audio) {
        if (context == null || base64Audio == null || base64Audio.trim().isEmpty()) {
            return false;
        }
        try {
            String trimmedAudio = base64Audio.trim();
            long now = System.currentTimeMillis();
            // Audio deduplication fingerprint: sample 30 chars from audio string
            String hash = trimmedAudio.length() > 40 ? trimmedAudio.substring(10, 40) : trimmedAudio;
            if ((now - lastPlayedAudioTime < 2500) && hash.equals(lastPlayedAudioHash)) {
                Log.d(TAG, "🔊 Audio already played within 2.5s, ignoring duplicate trigger");
                return true;
            }
            lastPlayedAudioHash = hash;
            lastPlayedAudioTime = now;

            if (staticMediaPlayer != null) {
                try { staticMediaPlayer.stop(); staticMediaPlayer.release(); } catch (Exception ignored) {}
                staticMediaPlayer = null;
            }
            byte[] bytes = android.util.Base64.decode(trimmedAudio, android.util.Base64.NO_WRAP);
            if (bytes == null || bytes.length == 0) return false;

            byte[] amrHeader = new byte[] { 0x23, 0x21, 0x41, 0x4D, 0x52, 0x0A };
            if (bytes.length < 6 || bytes[0] != 0x23 || bytes[1] != 0x21 || bytes[2] != 0x41 ||
                bytes[3] != 0x4D || bytes[4] != 0x52 || bytes[5] != 0x0A) {
                byte[] repaired = new byte[amrHeader.length + bytes.length];
                System.arraycopy(amrHeader, 0, repaired, 0, amrHeader.length);
                System.arraycopy(bytes, 0, repaired, amrHeader.length, bytes.length);
                bytes = repaired;
            }

            final File tempPlayFile = File.createTempFile("ptt_play_", ".amr", context.getCacheDir());
            java.io.FileOutputStream fos = new java.io.FileOutputStream(tempPlayFile);
            fos.write(bytes);
            fos.close();

            final AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                // Enforce MODE_NORMAL so all media routes to the loudest main bottom speaker
                try {
                    audioManager.setMode(AudioManager.MODE_NORMAL);
                    audioManager.setSpeakerphoneOn(true);
                } catch (Exception ignored) {}

                // Request Audio Focus for media playback
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build();
                        staticAudioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                            .setAudioAttributes(playbackAttributes)
                            .setAcceptsDelayedFocusGain(true)
                            .build();
                        audioManager.requestAudioFocus(staticAudioFocusRequest);
                    } else {
                        //noinspection deprecation
                        audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
                    }
                } catch (Exception ignored) {}

                // Unmute and enforce loud volume on STREAM_MUSIC (>=90%)
                try {
                    int maxMusic = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                    int currentMusic = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
                    if (currentMusic < (int)(maxMusic * 0.85) && maxMusic > 0) {
                        audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, (int)(maxMusic * 0.90), 0);
                    }
                } catch (Exception ignored) {}
            }

            staticMediaPlayer = new MediaPlayer();
            if (android.os.Build.VERSION.SDK_INT >= 21) {
                staticMediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                );
            } else {
                staticMediaPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC);
            }
            staticMediaPlayer.setVolume(1.0f, 1.0f);
            staticMediaPlayer.setDataSource(tempPlayFile.getAbsolutePath());

            staticMediaPlayer.setOnCompletionListener(mp -> {
                try { mp.release(); } catch (Exception ignored) {}
                tempPlayFile.delete();
                staticMediaPlayer = null;
                if (audioManager != null && staticAudioFocusRequest != null) {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            audioManager.abandonAudioFocusRequest(staticAudioFocusRequest);
                        }
                    } catch (Exception ignored) {}
                    staticAudioFocusRequest = null;
                }
            });

            staticMediaPlayer.setOnErrorListener((mp, what, extra) -> {
                try { mp.release(); } catch (Exception ignored) {}
                tempPlayFile.delete();
                staticMediaPlayer = null;
                return true;
            });

            staticMediaPlayer.prepare();
            staticMediaPlayer.start();
            Log.i(TAG, "🔊 Native voice audio playing on loudspeaker (" + bytes.length + " bytes AMR)");
            return true;
        } catch (Exception e) {
            Log.w(TAG, "playVoiceAudioStatic error: " + e.getMessage());
            return false;
        }
    }

    @ReactMethod
    public void playVoiceAudio(String base64Audio, Promise promise) {
        boolean ok = playVoiceAudioStatic(getReactApplicationContext(), base64Audio);
        if (ok) {
            promise.resolve(true);
        } else {
            // Fallback to PCM AudioTrack playback
            playAudioChunk(base64Audio, promise);
        }
    }

    @ReactMethod
    public void stopVoiceAudio(Promise promise) {
        try {
            if (mediaPlayer != null) {
                try { mediaPlayer.stop(); mediaPlayer.release(); } catch (Exception ignored) {}
                mediaPlayer = null;
            }
            AudioManager audioManager = (AudioManager) getReactApplicationContext().getSystemService(Context.AUDIO_SERVICE);
            abandonAudioFocus(audioManager);
            enableSpeakerphone(audioManager, false);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("STOP_PLAY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(Integer count) {}

    @ReactMethod
    public void clearMessageCache(Promise promise) {
        try {
            NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).clearMessageCache();
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void getAppPermissionsStatus(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            WritableMap map = Arguments.createMap();

            boolean fineLocation = ctx.checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            boolean backgroundLocation = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                backgroundLocation = ctx.checkSelfPermission(android.Manifest.permission.ACCESS_BACKGROUND_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            }

            boolean recordAudio = ctx.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED;

            boolean bluetooth = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                boolean scan = ctx.checkSelfPermission(android.Manifest.permission.BLUETOOTH_SCAN) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                boolean adv = ctx.checkSelfPermission(android.Manifest.permission.BLUETOOTH_ADVERTISE) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                boolean conn = ctx.checkSelfPermission(android.Manifest.permission.BLUETOOTH_CONNECT) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                bluetooth = scan && adv && conn;
            }

            boolean nearbyWifi = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                nearbyWifi = ctx.checkSelfPermission(android.Manifest.permission.NEARBY_WIFI_DEVICES) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            }

            boolean postNotifications = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                postNotifications = ctx.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            }

            boolean isIgnoringBatteryOpt = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    isIgnoringBatteryOpt = pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
                }
            }

            map.putBoolean("fineLocation", fineLocation);
            map.putBoolean("backgroundLocation", backgroundLocation);
            map.putBoolean("recordAudio", recordAudio);
            map.putBoolean("bluetooth", bluetooth);
            map.putBoolean("nearbyWifi", nearbyWifi);
            map.putBoolean("postNotifications", postNotifications);
            map.putBoolean("isIgnoringBatteryOptimizations", isIgnoringBatteryOpt);

            promise.resolve(map);
        } catch (Exception e) {
            promise.reject("PERM_STATUS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopGattServer(Promise promise) {
        try {
            NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).stopMeshEngine();
            if (mediaPlayer != null) {
                try { mediaPlayer.release(); } catch (Exception ignored) {}
                mediaPlayer = null;
            }
            if (mediaRecorder != null) {
                try { mediaRecorder.release(); } catch (Exception ignored) {}
                mediaRecorder = null;
            }
            stopAudioChunkPlayback(null);
            stopAudioCaptureStream(null);
            promise.resolve("Stopped");
        } catch (Exception e) {
            promise.reject("STOP_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getHardwareSensorStatus(Promise promise) {
        try {
            WritableMap map = Arguments.createMap();
            map.putBoolean("accelerometer", NeerNetraMeshService.isAccelerometerAvailable);
            map.putString("accelerometerName", NeerNetraMeshService.accelerometerName);
            map.putBoolean("gyroscope", NeerNetraMeshService.isGyroscopeAvailable);
            map.putString("gyroscopeName", NeerNetraMeshService.gyroscopeName);
            map.putBoolean("barometer", NeerNetraMeshService.isPressureAvailable);
            map.putString("barometerName", NeerNetraMeshService.pressureName);
            map.putBoolean("isBackgroundMonitoringActive", true);
            map.putBoolean("nativeCollapseSentinelActive", true);
            map.putBoolean("nativeLandslideSentinelActive", true);
            map.putDouble("lastVectorMagnitudeG", (double) NeerNetraMeshService.lastVectorMagnitudeG);
            map.putDouble("lastGyroOmega", (double) NeerNetraMeshService.lastGyroOmega);
            map.putDouble("lastPressureHpa", (double) NeerNetraMeshService.lastPressureHpa);
            promise.resolve(map);
        } catch (Exception e) {
            promise.reject("SENSOR_STATUS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void isIgnoringBatteryOptimizations(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) getReactApplicationContext().getSystemService(Context.POWER_SERVICE);
                boolean ignoring = pm != null && pm.isIgnoringBatteryOptimizations(getReactApplicationContext().getPackageName());
                promise.resolve(ignoring);
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void requestIgnoreBatteryOptimizations(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getReactApplicationContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getReactApplicationContext().startActivity(intent);
                promise.resolve(true);
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getReactApplicationContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getReactApplicationContext().startActivity(intent);
                promise.resolve(true);
            } catch (Exception ex) {
                promise.reject("BATTERY_OPT_ERROR", ex.getMessage());
            }
        }
    }

    @ReactMethod
    public void openUnusedAppRestrictionsSettings(Promise promise) {
        try {
            // Android 11+ (API 30+) "Pause app activity if unused" settings
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getReactApplicationContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("UNUSED_APP_RESTRICTIONS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getBatteryOptimizationStatus(Promise promise) {
        try {
            WritableMap map = Arguments.createMap();
            boolean isIgnoring = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) getReactApplicationContext().getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    isIgnoring = pm.isIgnoringBatteryOptimizations(getReactApplicationContext().getPackageName());
                }
            }
            map.putBoolean("isIgnoringBatteryOptimizations", isIgnoring);
            map.putString("manufacturer", Build.MANUFACTURER);
            map.putString("model", Build.MODEL);
            promise.resolve(map);
        } catch (Exception e) {
            promise.reject("STATUS_ERROR", e.getMessage());
        }
    }

    public static void notifyNativeSensorUpdate(float vm, float gyro, float pressure) {
        if (staticReactContext != null && staticReactContext.hasActiveReactInstance()) {
            try {
                WritableMap map = Arguments.createMap();
                map.putDouble("lastVectorMagnitudeG", (double) vm);
                map.putDouble("lastGyroOmega", (double) gyro);
                map.putDouble("lastPressureHpa", (double) pressure);
                map.putDouble("timestamp", (double) System.currentTimeMillis());
                staticReactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onHardwareSensorUpdate", map);
            } catch (Exception ignored) {}
        }
    }

    public static void notifyNativeCollapseEvent(float peakG, long freeFallMs) {
        if (staticReactContext != null && staticReactContext.hasActiveReactInstance()) {
            try {
                WritableMap map = Arguments.createMap();
                map.putDouble("peakG", (double) peakG);
                map.putDouble("freeFallDurationMs", (double) freeFallMs);
                map.putDouble("timestamp", (double) System.currentTimeMillis());
                staticReactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onNativeCollapseDetected", map);
            } catch (Exception e) {
                Log.w(TAG, "Error emitting onNativeCollapseDetected: " + e.getMessage());
            }
        }
    }

    public static void notifyNativeLandslideEvent(float tremorG, long durationMs) {
        if (staticReactContext != null && staticReactContext.hasActiveReactInstance()) {
            try {
                WritableMap map = Arguments.createMap();
                map.putDouble("tremorG", (double) tremorG);
                map.putDouble("durationMs", (double) durationMs);
                map.putDouble("timestamp", (double) System.currentTimeMillis());
                staticReactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onNativeLandslideDetected", map);
            } catch (Exception e) {
                Log.w(TAG, "Error emitting onNativeLandslideDetected: " + e.getMessage());
            }
        }
    }

    public static void notifyNativeStormEvent(float dropHpa, float currentHpa) {
        if (staticReactContext != null && staticReactContext.hasActiveReactInstance()) {
            try {
                WritableMap map = Arguments.createMap();
                map.putDouble("dropHpa", (double) dropHpa);
                map.putDouble("currentHpa", (double) currentHpa);
                map.putDouble("timestamp", (double) System.currentTimeMillis());
                staticReactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onNativeStormDetected", map);
            } catch (Exception e) {
                Log.w(TAG, "Error emitting onNativeStormDetected: " + e.getMessage());
            }
        }
    }
}