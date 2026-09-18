package com.neernetra.disaster;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * NeerNetraMeshService
 * ====================
 * Persistent Android Foreground Service that runs 24/7 to guarantee:
 *  1. Native BLE Mesh & GATT Server remain active when app is closed/swiped away.
 *  2. Incoming walkie-talkie calls and SOS alarms trigger WhatsApp-style full-screen
 *     incoming call screen (IncomingCallActivity) and ring continuously.
 *  3. Holds PARTIAL_WAKE_LOCK preventing CPU sleep during disaster monitoring.
 */
public class NeerNetraMeshService extends Service {

    private static final String TAG = "NeerNetraMeshService";

    public static final String CHANNEL_MESH_ID = "neernetra_mesh_foreground_channel";
    public static final String CHANNEL_EMERGENCY_ID = "neernetra_emergency_wake_channel";
    public static final String CHANNEL_CHAT_ID = "neernetra_chat_channel";
    public static final int SERVICE_NOTIFICATION_ID = 4001;
    public static final int EMERGENCY_NOTIFICATION_ID = 4002;
    public static final int CHAT_NOTIFICATION_ID = 4003;

    public static final String ACTION_STOP_SERVICE = "ACTION_STOP_SERVICE";
    public static final String ACTION_DECLINE_CALL = "ACTION_DECLINE_CALL";

    private PowerManager.WakeLock partialWakeLock;
    private static PowerManager.WakeLock activeScreenLock;
    private static MediaPlayer emergencyPlayer;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "[MeshService] Initializing 24/7 NeerNetra Mesh Foreground Service");

        createNotificationChannels();
        acquirePartialWakeLock();

        // Start Foreground Service with safe fallback
        Notification notification = buildForegroundNotification();
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(SERVICE_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(SERVICE_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
            } else {
                startForeground(SERVICE_NOTIFICATION_ID, notification);
            }
        } catch (SecurityException se) {
            Log.w(TAG, "Starting FGS with connectedDevice failed (permissions pending), falling back: " + se.getMessage());
            try {
                startForeground(SERVICE_NOTIFICATION_ID, notification);
            } catch (Exception ignored) {}
        }

        // Boot 24/7 Native BLE Mesh Engine immediately
        try {
            NeerNetraNativeMeshManager.getInstance(this).startMeshEngine("NeerNetra-Node");
            Log.i(TAG, "[MeshService] Native BLE Mesh Engine initialized in 24/7 background service");
        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Failed to start native mesh engine: " + e.getMessage());
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP_SERVICE.equals(action)) {
                stopSelf();
                return START_NOT_STICKY;
            } else if (ACTION_DECLINE_CALL.equals(action)) {
                Log.i(TAG, "[MeshService] ACTION_DECLINE_CALL received, stopping alarm and cancelling notification");
                stopEmergencyAlarm();
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.cancel(EMERGENCY_NOTIFICATION_ID);
                }
                return START_STICKY;
            }
        }

        // Ensure mesh engine stays running
        try {
            NeerNetraNativeMeshManager.getInstance(this).startMeshEngine("NeerNetra-Node");
        } catch (Exception ignored) {}

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "[MeshService] Service destroying, releasing wake locks");
        releasePartialWakeLock();
        stopEmergencyAlarm();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    public static void startService(Context context) {
        try {
            Intent intent = new Intent(context, NeerNetraMeshService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            Log.i(TAG, "[MeshService] startService dispatched");
        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Failed to start service: " + e.getMessage());
        }
    }

    public static void stopService(Context context) {
        try {
            Intent intent = new Intent(context, NeerNetraMeshService.class);
            intent.setAction(ACTION_STOP_SERVICE);
            context.startService(intent);
        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Failed to stop service: " + e.getMessage());
        }
    }

    // ── WhatsApp-Style Lock Screen Wake-Up & Full Screen Activity Launch ─────
    public static void wakeScreenAndShowNotification(
            Context context,
            String title,
            String message,
            String emergencyType,
            @Nullable Bundle extras
    ) {
        Log.i(TAG, "🚨 WhatsApp-Style Incoming Call Triggered: " + title + " (" + emergencyType + ")");

        try {
            // 1. Wake physical phone screen
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                if (activeScreenLock != null && activeScreenLock.isHeld()) {
                    try { activeScreenLock.release(); } catch (Exception ignored) {}
                }
                @SuppressWarnings("deprecation")
                PowerManager.WakeLock screenLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "NeerNetra:ScreenWakeUpLock"
                );
                screenLock.acquire(8000); // 8 seconds screen wake (prevents 20s hang)
                activeScreenLock = screenLock;
            }

            // 2. Prepare Intent to launch WhatsApp-style IncomingCallActivity
            Intent callActivityIntent = new Intent(context, IncomingCallActivity.class);
            callActivityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            );
            callActivityIntent.putExtra("emergency_type", emergencyType);
            callActivityIntent.putExtra("title", title);
            callActivityIntent.putExtra("message", message);
            if (extras != null) {
                callActivityIntent.putExtras(extras);
            }

            int pFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                (int) System.currentTimeMillis(),
                callActivityIntent,
                pFlags
            );

            // 3. Answer Action (Launches MainActivity directly into active call)
            Intent answerIntent = new Intent(context, MainActivity.class);
            answerIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            );
            answerIntent.putExtra("emergency_type", emergencyType);
            answerIntent.putExtra("auto_answer", true);
            if (extras != null) {
                answerIntent.putExtras(extras);
            }

            PendingIntent answerPendingIntent = PendingIntent.getActivity(
                context,
                (int) System.currentTimeMillis() + 1,
                answerIntent,
                pFlags
            );

            // 4. Decline Action (Silences ringtone and cancels notification)
            Intent declineIntent = new Intent(context, NeerNetraMeshService.class);
            declineIntent.setAction(ACTION_DECLINE_CALL);
            PendingIntent declinePendingIntent = PendingIntent.getService(
                context,
                (int) System.currentTimeMillis() + 2,
                declineIntent,
                pFlags
            );

            // 5. Build high-priority Heads-up / Lock-screen CallStyle Notification
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    NotificationChannel emergencyChan = new NotificationChannel(
                        CHANNEL_EMERGENCY_ID,
                        "NeerNetra Emergency Calls & Alerts",
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    emergencyChan.setDescription("High priority lock-screen incoming calls and SOS alerts");
                    emergencyChan.enableLights(true);
                    emergencyChan.setLightColor(Color.RED);
                    emergencyChan.enableVibration(true);
                    emergencyChan.setVibrationPattern(new long[]{0, 1000, 1000, 1000});
                    emergencyChan.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                    emergencyChan.setBypassDnd(true);
                    nm.createNotificationChannel(emergencyChan);
                }

                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_EMERGENCY_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_CALL)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setAutoCancel(true)
                    .setFullScreenIntent(fullScreenPendingIntent, true) // Guarantees lock-screen wakeup
                    .setContentIntent(fullScreenPendingIntent)
                    .addAction(R.mipmap.ic_launcher, "DECLINE", declinePendingIntent)
                    .addAction(R.mipmap.ic_launcher, "ANSWER", answerPendingIntent)
                    .setVibrate(new long[]{0, 1000, 1000, 1000})
                    .setColor(Color.RED);

                nm.notify(EMERGENCY_NOTIFICATION_ID, builder.build());
            }

            // 6. Also start IncomingCallActivity directly
            context.startActivity(callActivityIntent);

        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Error in wakeScreenAndShowNotification: " + e.getMessage(), e);
        }
    }

    public static void playEmergencyAlarm(Context context) {
        try {
            stopEmergencyAlarm();
            Uri alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (alertUri == null) alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alertUri == null) alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            emergencyPlayer = new MediaPlayer();
            emergencyPlayer.setDataSource(context, alertUri);
            emergencyPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );
            emergencyPlayer.setLooping(true);
            emergencyPlayer.prepare();
            emergencyPlayer.start();
        } catch (Exception e) {
            Log.w(TAG, "[MeshService] Could not play alert ringtone: " + e.getMessage());
        }
    }

    public static void stopEmergencyAlarm() {
        if (activeScreenLock != null && activeScreenLock.isHeld()) {
            try {
                activeScreenLock.release();
            } catch (Exception ignored) {}
            activeScreenLock = null;
        }
        if (emergencyPlayer != null) {
            try {
                if (emergencyPlayer.isPlaying()) emergencyPlayer.stop();
                emergencyPlayer.release();
            } catch (Exception ignored) {}
            emergencyPlayer = null;
        }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            NotificationChannel meshChan = new NotificationChannel(
                CHANNEL_MESH_ID,
                "NeerNetra Mesh Background Service",
                NotificationManager.IMPORTANCE_LOW
            );
            meshChan.setDescription("Maintains continuous 24/7 Bluetooth mesh connectivity and emergency relay");
            meshChan.setShowBadge(false);
            nm.createNotificationChannel(meshChan);

            NotificationChannel alertChan = new NotificationChannel(
                CHANNEL_EMERGENCY_ID,
                "NeerNetra Emergency Calls & Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            alertChan.setDescription("High priority lock-screen incoming calls and SOS alerts");
            alertChan.enableLights(true);
            alertChan.setLightColor(Color.RED);
            alertChan.enableVibration(true);
            alertChan.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            alertChan.setBypassDnd(true);
            nm.createNotificationChannel(alertChan);

            NotificationChannel chatChan = new NotificationChannel(
                CHANNEL_CHAT_ID,
                "NeerNetra Mesh Messages",
                NotificationManager.IMPORTANCE_HIGH
            );
            chatChan.setDescription("Incoming chat messages from nearby mesh citizens");
            chatChan.enableLights(true);
            chatChan.setLightColor(Color.CYAN);
            chatChan.enableVibration(true);
            chatChan.setVibrationPattern(new long[]{0, 250, 150, 250});
            chatChan.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(chatChan);
        }
    }

    /**
     * Display a heads-up Notification for incoming offline BLE mesh chat messages
     * even when the app is completely closed or the screen is locked!
     */
    public static void showChatNotification(Context context, String senderName, String messageText) {
        try {
            // 1. Wake physical screen so the message is visible on the lock screen
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                @SuppressWarnings("deprecation")
                PowerManager.WakeLock screenLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "NeerNetra:ChatWakeUpLock"
                );
                screenLock.acquire(4000); // 4 seconds to illuminate lock screen
            }

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // Ensure Notification Channel has IMPORTANCE_HIGH and VISIBILITY_PUBLIC on Android 8+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel chatChan = new NotificationChannel(
                    CHANNEL_CHAT_ID,
                    "NeerNetra Mesh Messages",
                    NotificationManager.IMPORTANCE_HIGH
                );
                chatChan.setDescription("Incoming chat messages from nearby mesh citizens");
                chatChan.enableLights(true);
                chatChan.setLightColor(Color.CYAN);
                chatChan.enableVibration(true);
                chatChan.setVibrationPattern(new long[]{0, 250, 150, 250});
                chatChan.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                chatChan.setBypassDnd(true);
                nm.createNotificationChannel(chatChan);
            }

            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openAppIntent.putExtra("nav_screen", "Chat");

            int pFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                (int) System.currentTimeMillis(),
                openAppIntent,
                pFlags
            );

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            String title = (senderName != null && !senderName.isEmpty()) ? senderName : "Nearby Citizen";
            String text = (messageText != null && !messageText.isEmpty()) ? messageText : "New mesh message";

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_CHAT_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setDefaults(Notification.DEFAULT_ALL)
                .setVibrate(new long[]{0, 250, 150, 250})
                .setColor(Color.parseColor("#0EA5E9"))
                .setContentIntent(pendingIntent);

            int notiId = CHAT_NOTIFICATION_ID + (senderName != null ? Math.abs(senderName.hashCode() % 100) : 1);
            nm.notify(notiId, builder.build());
            Log.i(TAG, "💬 Showed lock-screen chat notification for: " + senderName + " (" + text + ")");
        } catch (Exception e) {
            Log.w(TAG, "showChatNotification error: " + e.getMessage());
        }
    }

    private Notification buildForegroundNotification() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, flags);

        return new NotificationCompat.Builder(this, CHANNEL_MESH_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("NeerNetra Emergency Mesh Active")
            .setContentText("Monitoring offline BLE mesh & emergency SOS relays 24/7")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build();
    }

    private void acquirePartialWakeLock() {
        try {
            if (partialWakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    partialWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "neernetra:MeshForegroundLock");
                    partialWakeLock.acquire();
                    Log.i(TAG, "[MeshService] Acquired PARTIAL_WAKE_LOCK for 24/7 mesh monitoring");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Failed to acquire wake lock: " + e.getMessage());
        }
    }

    private void releasePartialWakeLock() {
        try {
            if (partialWakeLock != null && partialWakeLock.isHeld()) {
                partialWakeLock.release();
                partialWakeLock = null;
                Log.i(TAG, "[MeshService] Released PARTIAL_WAKE_LOCK");
            }
        } catch (Exception ignored) {}
    }
}