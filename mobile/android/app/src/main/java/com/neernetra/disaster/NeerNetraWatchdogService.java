package com.neernetra.disaster;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

/**
 * NeerNetraWatchdogService
 * Runs in an isolated Linux process (:watchdog) to guard NeerNetraMeshService
 * against aggressive OEM background killing (Vivo, Xiaomi, Samsung, Oppo).
 */
public class NeerNetraWatchdogService extends Service {
    private static final String TAG = "NeerNetraWatchdog";
    private static final String CHANNEL_ID = "neernetra_watchdog_channel";
    private static final int NOTIFICATION_ID = 9002;

    private final IBinder binder = new WatchdogBinder();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable heartbeatRunnable;

    public class WatchdogBinder extends Binder {
        public NeerNetraWatchdogService getService() {
            return NeerNetraWatchdogService.this;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "Watchdog Service initialized in isolated process");
        startWatchdogForeground();

        heartbeatRunnable = new Runnable() {
            @Override
            public void run() {
                checkAndResurrectMainMeshService();
                scheduleNextAlarmHeartbeat();
                handler.postDelayed(this, 5 * 60 * 1000); // Check every 5 minutes
            }
        };
        handler.postDelayed(heartbeatRunnable, 30 * 1000);
    }

    private void startWatchdogForeground() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "NeerNetra Guardian Watchdog",
                    NotificationManager.IMPORTANCE_MIN
                );
                channel.setDescription("Background guardian ensuring disaster resilience mesh persistence");
                channel.setShowBadge(false);
                nm.createNotificationChannel(channel);
            }

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("NeerNetra Sentinel Active")
                .setContentText("Hardware-offloaded 24/7 disaster mesh guardian running")
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .build();

            startForeground(NOTIFICATION_ID, notification);
        } catch (Exception e) {
            Log.w(TAG, "Watchdog startForeground exception: " + e.getMessage());
        }
    }

    private void checkAndResurrectMainMeshService() {
        try {
            Intent meshIntent = new Intent(this, NeerNetraMeshService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(this, meshIntent);
            } else {
                startService(meshIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Could not ping/start NeerNetraMeshService: " + e.getMessage());
        }
    }

    private void scheduleNextAlarmHeartbeat() {
        try {
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                Intent restartIntent = new Intent(this, RestartServiceReceiver.class);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent pi = PendingIntent.getBroadcast(this, 8888, restartIntent, flags);
                long triggerAt = SystemClock.elapsedRealtime() + 15 * 60 * 1000;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                } else {
                    am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "scheduleNextAlarmHeartbeat error: " + e.getMessage());
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        checkAndResurrectMainMeshService();
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "Watchdog Service onDestroy called. Triggering immediate resurrection!");
        if (heartbeatRunnable != null) {
            handler.removeCallbacks(heartbeatRunnable);
        }
        checkAndResurrectMainMeshService();
        super.onDestroy();
    }
}
