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
 * Persistent Android Foreground Service that ensures:
 *  1. BLE Mesh, SOS monitoring, and GATT server remain 100% active when the app is closed/minimized.
 *  2. Acquires PARTIAL_WAKE_LOCK to prevent CPU sleep during disaster emergency relays.
 *  3. Wakes up locked phone screen via SCREEN_BRIGHT_WAKE_LOCK and displays full-screen heads-up
 *     UI for incoming calls and emergency SOS alerts.
 *  4. Plays high-priority alarm / siren audio on STREAM_ALARM bypassing silent/Do-Not-Disturb mode.
 */
public class NeerNetraMeshService extends Service {

    private static final String TAG = "NeerNetraMeshService";

    public static final String CHANNEL_MESH_ID = "neernetra_mesh_foreground_channel";
    public static final String CHANNEL_EMERGENCY_ID = "neernetra_emergency_wake_channel";
    public static final int SERVICE_NOTIFICATION_ID = 4001;
    public static final int EMERGENCY_NOTIFICATION_ID = 4002;

    private PowerManager.WakeLock partialWakeLock;
    private static MediaPlayer emergencyPlayer;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "[MeshService] Initializing 24/7 NeerNetra Mesh Foreground Service");

        createNotificationChannels();
        acquirePartialWakeLock();

        // Start in foreground immediately
        Notification notification = buildForegroundNotification();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(SERVICE_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(SERVICE_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
        } else {
            startForeground(SERVICE_NOTIFICATION_ID, notification);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "[MeshService] onStartCommand received, flag: " + flags + ", startId: " + startId);

        if (intent != null && "ACTION_STOP_SERVICE".equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

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

    // ── Static Helper: Start Service ──────────────────────────────────────────
    public static void startService(Context context) {
        try {
            Intent intent = new Intent(context, NeerNetraMeshService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            Log.i(TAG, "[MeshService] startService dispatched successfully");
        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Failed to start foreground service: " + e.getMessage());
        }
    }

    // ── Static Helper: Stop Service ───────────────────────────────────────────
    public static void stopService(Context context) {
        try {
            Intent intent = new Intent(context, NeerNetraMeshService.class);
            intent.setAction("ACTION_STOP_SERVICE");
            context.startService(intent);
        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Failed to stop service: " + e.getMessage());
        }
    }

    // ── Static Helper: Lockscreen Wake-Up & Full-Screen Intent ────────────────
    public static void wakeScreenAndShowNotification(
            Context context,
            String title,
            String message,
            String emergencyType,
            @Nullable Bundle extras
    ) {
        Log.i(TAG, "[MeshService] 🚨 Triggering Lock Screen Wake-Up: " + title + " (" + emergencyType + ")");

        try {
            // 1. Wake the physical phone screen
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                @SuppressWarnings("deprecation")
                PowerManager.WakeLock screenLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "NeerNetra:ScreenWakeUpLock"
                );
                screenLock.acquire(15000); // Keep screen lit for 15s to view incoming call/alert
            }

            // 2. Build full-screen intent to launch MainActivity over lock screen
            Intent fullScreenIntent = new Intent(context, MainActivity.class);
            fullScreenIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            );
            fullScreenIntent.putExtra("emergency_type", emergencyType);
            fullScreenIntent.putExtra("title", title);
            fullScreenIntent.putExtra("message", message);
            if (extras != null) {
                fullScreenIntent.putExtras(extras);
            }

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                (int) System.currentTimeMillis(),
                fullScreenIntent,
                flags
            );

            // 3. Play high-priority siren / ringtone on ALARM stream
            playEmergencyAlarm(context);

            // 4. Build high-priority Heads-up / Lock-screen notification
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
                    emergencyChan.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 1000});
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
                    .setFullScreenIntent(pendingIntent, true) // Crucial for lock-screen wake-up
                    .setContentIntent(pendingIntent)
                    .setVibrate(new long[]{0, 500, 200, 500, 200, 1000})
                    .setColor(Color.RED);

                nm.notify(EMERGENCY_NOTIFICATION_ID, builder.build());
            }

            // 5. Also launch activity directly
            context.startActivity(fullScreenIntent);

        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Error in wakeScreenAndShowNotification: " + e.getMessage(), e);
        }
    }

    public static void playEmergencyAlarm(Context context) {
        try {
            stopEmergencyAlarm();
            Uri alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (alertUri == null) {
                alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            }
            if (alertUri == null) {
                alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            emergencyPlayer = new MediaPlayer();
            emergencyPlayer.setDataSource(context, alertUri);
            emergencyPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );
            emergencyPlayer.setLooping(false);
            emergencyPlayer.prepare();
            emergencyPlayer.start();
        } catch (Exception e) {
            Log.w(TAG, "[MeshService] Could not play alert ringtone: " + e.getMessage());
        }
    }

    public static void stopEmergencyAlarm() {
        if (emergencyPlayer != null) {
            try {
                if (emergencyPlayer.isPlaying()) {
                    emergencyPlayer.stop();
                }
                emergencyPlayer.release();
            } catch (Exception ignored) {}
            emergencyPlayer = null;
        }
    }

    // ── Notifications & Channels ──────────────────────────────────────────────
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
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && (partialWakeLock == null || !partialWakeLock.isHeld())) {
                partialWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NeerNetra:MeshServiceCpuWakeLock");
                partialWakeLock.acquire();
                Log.i(TAG, "[MeshService] Partial WakeLock acquired successfully");
            }
        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Error acquiring partial wakelock: " + e.getMessage());
        }
    }

    private void releasePartialWakeLock() {
        try {
            if (partialWakeLock != null && partialWakeLock.isHeld()) {
                partialWakeLock.release();
                partialWakeLock = null;
                Log.i(TAG, "[MeshService] Partial WakeLock released");
            }
        } catch (Exception ignored) {}
    }
}
