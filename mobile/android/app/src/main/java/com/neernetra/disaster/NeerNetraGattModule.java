package com.neernetra.disaster;

import android.bluetooth.*;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.media.ToneGenerator;
import android.util.Log;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import android.content.Intent;
import android.os.Bundle;

import java.io.File;
import java.io.FileInputStream;

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
    public void startGattServer(String deviceName, Promise promise) {
        try {
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
    public void notifyAllClients(String base64Data, Promise promise) {
        try {
            int count = NeerNetraNativeMeshManager.getInstance(getReactApplicationContext()).notifyAllClients(base64Data);
            promise.resolve(count);
        } catch (Exception e) {
            promise.resolve(0);
        }
    }

    // ── Voice Recording & Playback ───────────────────────────────────────────
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
            try {
                ToneGenerator tg = new ToneGenerator(AudioManager.STREAM_MUSIC, 85);
                tg.startTone(ToneGenerator.TONE_PROP_ACK, 120);
            } catch (Exception ignored) {}

            if (mediaRecorder != null) {
                try { mediaRecorder.stop(); } catch (Exception ignored) {}
                try { mediaRecorder.release(); } catch (Exception ignored) {}
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

            byte[] amrHeader = new byte[] { 0x23, 0x21, 0x41, 0x4D, 0x52, 0x0A };
            if (bytes.length < 6 || bytes[0] != 0x23 || bytes[1] != 0x21 || bytes[2] != 0x41 ||
                bytes[3] != 0x4D || bytes[4] != 0x52 || bytes[5] != 0x0A) {
                byte[] repaired = new byte[amrHeader.length + bytes.length];
                System.arraycopy(amrHeader, 0, repaired, 0, amrHeader.length);
                System.arraycopy(bytes, 0, repaired, amrHeader.length, bytes.length);
                bytes = repaired;
            }

            final File tempPlayFile = File.createTempFile("ptt_play_", ".amr", getReactApplicationContext().getCacheDir());
            java.io.FileOutputStream fos = new java.io.FileOutputStream(tempPlayFile);
            fos.write(bytes);
            fos.close();

            mediaPlayer = new MediaPlayer();
            if (android.os.Build.VERSION.SDK_INT >= 21) {
                mediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                );
            } else {
                //noinspection deprecation
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC);
            }
            mediaPlayer.setVolume(1.0f, 1.0f);
            mediaPlayer.setDataSource(tempPlayFile.getAbsolutePath());
            mediaPlayer.setOnCompletionListener(mp -> {
                try { mp.release(); } catch (Exception ignored) {}
                tempPlayFile.delete();
                mediaPlayer = null;
            });
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                try { mp.release(); } catch (Exception ignored) {}
                tempPlayFile.delete();
                mediaPlayer = null;
                return true;
            });
            mediaPlayer.prepare();
            mediaPlayer.start();
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
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(Integer count) {}

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
            promise.resolve("Stopped");
        } catch (Exception e) {
            promise.reject("STOP_ERROR", e.getMessage());
        }
    }
}