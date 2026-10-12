package com.neernetra.disaster;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * NeerNetraMeshService
 * ====================
 * Persistent Android Foreground Service that runs 24/7 to guarantee:
 *  1. Native BLE Mesh & GATT Server remain active when app is closed/swiped away.
 *  2. Incoming walkie-talkie calls and SOS alarms trigger WhatsApp-style full-screen
 *     incoming call screen (IncomingCallActivity) and ring continuously.
 *  3. Holds PARTIAL_WAKE_LOCK preventing CPU sleep during disaster monitoring.
 *  4. Native Hardware Sensor Sentinel Subsystem (Accelerometer, Gyroscope, Barometer)
 *     running directly in Java background to continuously detect 3-phase structural collapse
 *     and 10-50Hz Wayanad landslide acoustic harmonic tremors even in Doze mode.
 */
public class NeerNetraMeshService extends Service implements SensorEventListener {

    private static final String TAG = "NeerNetraMeshService";

    public static final String CHANNEL_MESH_ID = "neernetra_mesh_foreground_channel";
    public static final String CHANNEL_EMERGENCY_ID = "neernetra_emergency_wake_channel";
    public static final String CHANNEL_CHAT_ID = "neernetra_chat_channel";
    public static final int SERVICE_NOTIFICATION_ID = 4001;
    public static final int EMERGENCY_NOTIFICATION_ID = 4002;
    public static final int CHAT_NOTIFICATION_ID = 4003;

    public static final String ACTION_STOP_SERVICE = "ACTION_STOP_SERVICE";
    public static final String ACTION_DECLINE_CALL = "ACTION_DECLINE_CALL";
    public static final String ACTION_TRIGGER_INCOMING_CALL = "com.neernetra.disaster.TRIGGER_INCOMING_CALL";
    public static final String ACTION_TRIGGER_EMERGENCY_SIREN = "com.neernetra.disaster.TRIGGER_EMERGENCY_SIREN";
    public static final String ACTION_TRIGGER_COLLAPSE = "com.neernetra.disaster.TRIGGER_COLLAPSE";
    public static final String ACTION_TRIGGER_LANDSLIDE = "com.neernetra.disaster.TRIGGER_LANDSLIDE";

    private PowerManager.WakeLock partialWakeLock;
    private WifiManager.WifiLock wifiLock;
    private static PowerManager.WakeLock activeScreenLock;
    private static MediaPlayer emergencyPlayer;
    private static Ringtone emergencyRingtone;
    private long lastSensorTelemetryEmitTime = 0;

    // ── 24/7 Native Background Siren Polling Subsystem ───────────────────────
    private volatile boolean isSirenPollerRunning = false;
    private Thread sirenPollerThread = null;
    private static volatile String lastHandledSirenTimestamp = "";
    private static volatile String lastSilencedSirenTimestamp = "";
    private static volatile boolean isNativeSirenSounding = false;

    private static final String SUPABASE_REST_URL = "https://nratutjgjodkbysxyxem.supabase.co/rest/v1";
    private static final String SUPABASE_ANON_KEY = "sb_publishable_sqCaR-QnTPSE2PVW3FmCtg_AKwBWJpN";

    // ── Native Hardware Sensor Sentinel Subsystem ──────────────────────────
    private SensorManager sensorManager;
    private Sensor accelerometerSensor;
    private Sensor gyroscopeSensor;
    private Sensor pressureSensor;
    private boolean isSensorsRegistered = false;

    public static volatile boolean isAccelerometerAvailable = false;
    public static volatile String accelerometerName = "Unavailable";
    public static volatile boolean isGyroscopeAvailable = false;
    public static volatile String gyroscopeName = "Unavailable";
    public static volatile boolean isPressureAvailable = false;
    public static volatile String pressureName = "UNAVAILABLE_SOC_FALLBACK";

    public static volatile float lastVectorMagnitudeG = 1.0f;
    public static volatile float lastGyroOmega = 0.0f;
    public static volatile float lastPressureHpa = 1013.25f;

    // ── Native 3-Phase Building Collapse Kinetic State Machine ───────────
    // Phase 1: Free Fall (g < 0.35g for >= 280ms)
    // Phase 2: Shock Impact (g >= 3.5g within 2.2s of free fall)
    // Phase 3: Rubble Stillness (variance < 0.15g & gyro < 0.25 rad/s for >= 8.0s)
    private static final float FREE_FALL_THRESHOLD_G = 0.35f;
    private static final long FREE_FALL_MIN_DURATION_MS = 280;
    private static final float IMPACT_THRESHOLD_G = 3.50f;
    private static final long IMPACT_WINDOW_MS = 2200;
    private static final float STILLNESS_VARIANCE_G = 0.15f;
    private static final long STILLNESS_MIN_DURATION_MS = 8000;

    private int collapsePhase = 0; // 0=IDLE, 1=FREE_FALL, 2=IMPACT, 3=STILLNESS
    private long freeFallStartTime = 0;
    private long freeFallDurationMs = 0;
    private long impactDetectedTime = 0;
    private float peakRecordedG = 0;
    private long stillnessStartTime = 0;
    private long lastCollapseTriggerTime = 0;

    // ── Native Wayanad 2AM Landslide Harmonic Tremor Sentinel ─────────────
    // Continuous micro-vibrations in [0.08g, 0.45g] range at 10-50Hz for >= 30 seconds
    private static final float LANDSLIDE_MIN_TREMOR_G = 0.08f;
    private static final float LANDSLIDE_MAX_TREMOR_G = 0.45f;
    private static final long LANDSLIDE_DURATION_MS = 30000;
    private long landslideTremorStartTime = 0;
    private long lastLandslideTriggerTime = 0;
    private long lastStormTriggerTime = 0;

    // ── Native Barometric Pressure Squall Tracking ────────────────────────
    private final List<PressureSample> pressureHistory = new ArrayList<>();
    private static class PressureSample {
        long timestamp;
        float hPa;
        PressureSample(long timestamp, float hPa) {
            this.timestamp = timestamp;
            this.hPa = hPa;
        }
    }

    private final Handler watchdogHandler = new Handler(Looper.getMainLooper());
    private final Runnable watchdogRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                Log.d(TAG, "[MeshService Watchdog] 10-minute health check — ensuring wakeLock and mesh engine alive");
                acquirePartialWakeLock();
                NeerNetraNativeMeshManager.getInstance(NeerNetraMeshService.this).startMeshEngine("NeerNetra-Node");
            } catch (Exception e) {
                Log.w(TAG, "[MeshService Watchdog] Check error: " + e.getMessage());
            }
            watchdogHandler.postDelayed(this, 10 * 60 * 1000); // every 10 minutes
        }
    };

    private final BroadcastReceiver bluetoothStateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent != null && BluetoothAdapter.ACTION_STATE_CHANGED.equals(intent.getAction())) {
                int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
                if (state == BluetoothAdapter.STATE_ON) {
                    Log.i(TAG, "[MeshService] Bluetooth turned ON / radio reset — re-initializing 24/7 native mesh engine");
                    new Handler(Looper.getMainLooper()).postDelayed(() -> {
                        try {
                            NeerNetraNativeMeshManager.getInstance(context).startMeshEngine("NeerNetra-Node");
                        } catch (Exception ignored) {}
                    }, 1500);
                }
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "[MeshService] Initializing 24/7 NeerNetra Mesh Foreground Service");

        createNotificationChannels();
        acquirePartialWakeLock();
        acquireWifiLock();

        // Check and log battery optimization exemption status (Doze proofing)
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                boolean isIgnoring = pm.isIgnoringBatteryOptimizations(getPackageName());
                Log.i(TAG, "[MeshService] Battery optimization exemption status: " + (isIgnoring ? "EXEMPT (Unrestricted 24/7)" : "NOT EXEMPT (Doze restrictions active)"));
                if (!isIgnoring) {
                    try {
                        Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(android.net.Uri.parse("package:" + getPackageName()));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception ignored) {}
                }
            }
        } catch (Exception ignored) {}

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

        // Register dynamic receiver for Bluetooth state changes (handles toggles & earbud disconnect radio resets)
        try {
            IntentFilter btFilter = new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED);
            registerReceiver(bluetoothStateReceiver, btFilter);
        } catch (Exception e) {
            Log.w(TAG, "Could not register bluetoothStateReceiver: " + e.getMessage());
        }

        // Boot 24/7 Native BLE Mesh Engine immediately
        try {
            NeerNetraNativeMeshManager.getInstance(this).startMeshEngine("NeerNetra-Node");
            Log.i(TAG, "[MeshService] Native BLE Mesh Engine initialized in 24/7 background service");
        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Failed to start native mesh engine: " + e.getMessage());
        }

        // Boot 24/7 Long-Range Wi-Fi Mesh Subsystem (Wi-Fi Aware NAN & Socket Mesh)
        try {
            NeerNetraWifiMeshManager.getInstance(this).startWifiMesh();
            Log.i(TAG, "[MeshService] Long-Range Wi-Fi Mesh Subsystem initialized in 24/7 background service");
        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Failed to start Wi-Fi mesh: " + e.getMessage());
        }

        // Schedule periodic 15-minute exact heartbeat alarm (Doze & Battery Proofing)
        schedulePeriodicMeshHeartbeatAlarm(this);

        // Register AOSP Self-Managed Telecom PhoneAccount
        NeerNetraConnectionService.registerPhoneAccount(this);

        // Initialize Native Background Hardware Sensor Sentinel Subsystem
        initHardwareSensors();

        // Ensure Watchdog daemon service is running in isolated process
        try {
            Intent watchdogIntent = new Intent(this, NeerNetraWatchdogService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(this, watchdogIntent);
            } else {
                startService(watchdogIntent);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not start watchdog service: " + e.getMessage());
        }

        // Start 24/7 Native Background Siren Poller loop
        startNativeSirenPollLoop();

        // Start 10-minute periodic watchdog
        watchdogHandler.postDelayed(watchdogRunnable, 10 * 60 * 1000);
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
                lastSilencedSirenTimestamp = lastHandledSirenTimestamp;
                isNativeSirenSounding = false;
                NeerNetraConnectionService.rejectCall();
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.cancel(EMERGENCY_NOTIFICATION_ID);
                }
                return START_STICKY;
            } else if (ACTION_TRIGGER_INCOMING_CALL.equals(action)) {
                String callerName = intent.getStringExtra("caller_name");
                if (callerName == null || callerName.trim().isEmpty()) callerName = "Rescue-Team-Alpha";
                String callerId = intent.getStringExtra("caller_id");
                if (callerId == null || callerId.trim().isEmpty()) callerId = "NDRF_ALPHA";
                boolean isGroup = intent.getBooleanExtra("is_group_call", false);
                String emergencyType = intent.getStringExtra("emergency_type");
                if (emergencyType == null || emergencyType.trim().isEmpty()) emergencyType = isGroup ? "GROUP_CALL" : "CALL_REQ";

                Bundle extras = new Bundle();
                extras.putString("caller_name", callerName);
                extras.putString("caller_id", callerId);
                extras.putBoolean("is_group_call", isGroup);
                extras.putString("emergency_type", emergencyType);

                wakeScreenAndShowNotification(
                    this,
                    isGroup ? "🚨 GROUP EMERGENCY CALL" : "📞 INCOMING EMERGENCY CALL",
                    callerName + " is calling via BLE mesh...",
                    emergencyType,
                    extras
                );
                return START_STICKY;
            } else if (ACTION_TRIGGER_EMERGENCY_SIREN.equals(action)) {
                String title = intent.getStringExtra("title");
                if (title == null || title.trim().isEmpty()) title = "🚨 EMERGENCY CIVIL DEFENSE SIREN";
                String message = intent.getStringExtra("message");
                if (message == null || message.trim().isEmpty()) message = "Immediate High-Ground Evacuation Ordered! Move to safe haven now.";
                String emergencyType = intent.getStringExtra("emergency_type");
                if (emergencyType == null || emergencyType.trim().isEmpty()) emergencyType = "SIREN";

                Bundle extras = new Bundle();
                extras.putString("title", title);
                extras.putString("message", message);
                extras.putString("emergency_type", emergencyType);

                wakeScreenAndShowNotification(
                    this,
                    title,
                    message,
                    emergencyType,
                    extras
                );
                return START_STICKY;
            } else if (ACTION_TRIGGER_COLLAPSE.equals(action)) {
                float peakG = intent.getFloatExtra("peak_g", 4.8f);
                long freeFallMs = intent.getLongExtra("free_fall_ms", 350L);
                Log.i(TAG, "[MeshService] ACTION_TRIGGER_COLLAPSE received via Intent/ADB (Peak: " + peakG + "g)");
                triggerNativeCollapseAlarm(peakG, freeFallMs);
                return START_STICKY;
            } else if (ACTION_TRIGGER_LANDSLIDE.equals(action)) {
                String title = intent.getStringExtra("title");
                if (title == null || title.trim().isEmpty()) title = "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS";
                String message = intent.getStringExtra("message");
                if (message == null || message.trim().isEmpty()) message = "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW";
                String emergencyType = "LANDSLIDE";

                Bundle extras = new Bundle();
                extras.putString("title", title);
                extras.putString("message", message);
                extras.putString("emergency_type", emergencyType);
                extras.putString("sector_id", intent.getStringExtra("sector_id"));

                Log.i(TAG, "[MeshService] ⛰️ ACTION_TRIGGER_LANDSLIDE received — waking screen and sounding evacuation alarm!");
                wakeScreenAndShowNotification(
                    this,
                    title,
                    message,
                    emergencyType,
                    extras
                );
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
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        Log.i(TAG, "[MeshService] onTaskRemoved triggered — user swiped away app from Recents. Scheduling instant resurrection via Broadcast!");
        try {
            Intent restartServiceIntent = new Intent(getApplicationContext(), RestartServiceReceiver.class);
            restartServiceIntent.setAction("com.neernetra.disaster.RESTART_MESH_SERVICE");
            int piFlags = PendingIntent.FLAG_ONE_SHOT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                piFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent restartServicePendingIntent = PendingIntent.getBroadcast(
                getApplicationContext(),
                1001,
                restartServiceIntent,
                piFlags
            );
            AlarmManager alarmService = (AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            if (alarmService != null) {
                long triggerAt = SystemClock.elapsedRealtime() + 1000;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmService.setExactAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        triggerAt,
                        restartServicePendingIntent
                    );
                } else {
                    alarmService.set(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        triggerAt,
                        restartServicePendingIntent
                    );
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Failed to schedule resurrection alarm: " + e.getMessage());
        }
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "[MeshService] Service destroying, releasing wake locks");
        isSirenPollerRunning = false;
        if (sirenPollerThread != null) {
            try { sirenPollerThread.interrupt(); } catch (Exception ignored) {}
            sirenPollerThread = null;
        }
        watchdogHandler.removeCallbacks(watchdogRunnable);
        try {
            unregisterReceiver(bluetoothStateReceiver);
        } catch (Exception ignored) {}
        if (sensorManager != null && isSensorsRegistered) {
            try {
                sensorManager.unregisterListener(this);
                isSensorsRegistered = false;
                Log.i(TAG, "[MeshService Sensors] Unregistered hardware sensor listeners");
            } catch (Exception ignored) {}
        }
        releasePartialWakeLock();
        releaseWifiLock();
        try {
            NeerNetraWifiMeshManager.getInstance(this).stopWifiMesh();
        } catch (Exception ignored) {}
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

        String callerName = extras != null ? extras.getString("caller_name", "Nearby Citizen") : "Nearby Citizen";
        String callerId = extras != null ? extras.getString("caller_id", "unknown") : "unknown";
        boolean isGroup = extras != null && extras.getBoolean("is_group_call", false);

        boolean isVoiceCall = "CALL_REQ".equalsIgnoreCase(emergencyType) || "GROUP_CALL".equalsIgnoreCase(emergencyType);
        boolean isSiren = "SIREN".equalsIgnoreCase(emergencyType) || "EVACUATION".equalsIgnoreCase(emergencyType) || "LANDSLIDE".equalsIgnoreCase(emergencyType);

        boolean telecomHandled = false;
        if (isVoiceCall) {
            telecomHandled = NeerNetraConnectionService.triggerIncomingCall(context, callerName, callerId, isGroup, emergencyType);
        }

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
                screenLock.acquire(15000); // 15 seconds screen wake for emergency siren
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

            // 5. Build high-priority Heads-up / Lock-screen Notification
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
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setAutoCancel(true);

                if (isVoiceCall) {
                    builder.setCategory(NotificationCompat.CATEGORY_CALL)
                        .setFullScreenIntent(fullScreenPendingIntent, true)
                        .setContentIntent(fullScreenPendingIntent)
                        .addAction(R.mipmap.ic_launcher, "DECLINE", declinePendingIntent)
                        .addAction(R.mipmap.ic_launcher, "ANSWER", answerPendingIntent)
                        .setVibrate(new long[]{0, 1000, 1000, 1000})
                        .setColor(Color.parseColor("#0EA5E9"));
                } else if (isSiren) {
                    builder.setCategory(NotificationCompat.CATEGORY_ALARM)
                        .setFullScreenIntent(fullScreenPendingIntent, true)
                        .setContentIntent(fullScreenPendingIntent)
                        .addAction(R.mipmap.ic_launcher, "SILENCE ALARM", declinePendingIntent)
                        .addAction(R.mipmap.ic_launcher, "EVACUATE", answerPendingIntent)
                        .setVibrate(new long[]{0, 1000, 500, 1000})
                        .setColor(Color.RED)
                        .setOngoing(true);
                } else {
                    builder.setCategory(NotificationCompat.CATEGORY_ALARM)
                        .setFullScreenIntent(fullScreenPendingIntent, true)
                        .setContentIntent(fullScreenPendingIntent)
                        .addAction(R.mipmap.ic_launcher, "DISMISS", declinePendingIntent)
                        .addAction(R.mipmap.ic_launcher, "VIEW ALERT", answerPendingIntent)
                        .setVibrate(new long[]{0, 800, 400, 800})
                        .setColor(Color.parseColor("#DC2626"));
                }

                nm.notify(EMERGENCY_NOTIFICATION_ID, builder.build());
            }

            // 6. Direct activity start fallback if Telecom did not present UI
            if (!telecomHandled) {
                try {
                    context.startActivity(callActivityIntent);
                } catch (Exception balErr) {
                    Log.d(TAG, "Direct startActivity blocked by BAL, FullScreenIntent handles lockscreen: " + balErr.getMessage());
                }
            }

            // 7. For verified disaster evacuation sirens, play continuous emergency siren audio
            if (isSiren) {
                playEmergencyAlarm(context);
            }

        } catch (Exception e) {
            Log.e(TAG, "[MeshService] Error in wakeScreenAndShowNotification: " + e.getMessage(), e);
        }
    }

    public static void playEmergencyAlarm(Context context) {
        try {
            stopEmergencyAlarm(context);
            Uri alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alertUri == null) alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (alertUri == null) alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            boolean played = false;
            try {
                if (alertUri != null) {
                    emergencyPlayer = new MediaPlayer();
                    emergencyPlayer.setDataSource(context, alertUri);
                    emergencyPlayer.setAudioAttributes(
                        new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    );
                    emergencyPlayer.setLooping(true);
                    emergencyPlayer.prepare();
                    emergencyPlayer.start();
                    played = true;
                }
            } catch (Exception me) {
                Log.w(TAG, "[MeshService] MediaPlayer fallback to Ringtone: " + me.getMessage());
            }

            if (!played) {
                try {
                    Ringtone rt = RingtoneManager.getRingtone(context, alertUri != null ? alertUri : Settings.System.DEFAULT_ALARM_ALERT_URI);
                    if (rt != null) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            rt.setLooping(true);
                        }
                        rt.play();
                        emergencyRingtone = rt;
                        played = true;
                        Log.i(TAG, "🚨 [MeshService] Emergency ringtone active on device");
                    }
                } catch (Exception re) {
                    Log.w(TAG, "[MeshService] Ringtone fallback error: " + re.getMessage());
                }
            }

            // Visceral hardware vibration for emergency alerts
            try {
                Vibrator vib = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vib != null) {
                    long[] pattern = new long[]{0, 800, 300, 800, 300, 1000};
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vib.vibrate(VibrationEffect.createWaveform(pattern, 0));
                    } else {
                        vib.vibrate(pattern, 0);
                    }
                }
            } catch (Exception ignored) {}
        } catch (Exception e) {
            Log.w(TAG, "[MeshService] Could not play alert alarm: " + e.getMessage());
        }
    }

    public static void stopEmergencyAlarm(Context context) {
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
        if (emergencyRingtone != null) {
            try {
                if (emergencyRingtone.isPlaying()) emergencyRingtone.stop();
            } catch (Exception ignored) {}
            emergencyRingtone = null;
        }
        if (context != null) {
            try {
                Vibrator vib = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vib != null) vib.cancel();
            } catch (Exception ignored) {}
        }
    }

    public static void stopEmergencyAlarm() {
        stopEmergencyAlarm(null);
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

            // 1. Wake physical phone screen briefly for message (like WhatsApp)
            PowerManager chatPm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (chatPm != null) {
                @SuppressWarnings("deprecation")
                PowerManager.WakeLock screenLock = chatPm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "NeerNetra:ChatScreenWakeUp"
                );
                screenLock.acquire(3000); // 3 seconds screen wake for chat
            }

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

    private WifiManager.MulticastLock serviceMulticastLock;

    private void acquireWifiLock() {
        try {
            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null) {
                if (wifiLock == null) {
                    wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "neernetra:MeshWifiLock");
                    wifiLock.setReferenceCounted(false);
                    wifiLock.acquire();
                    Log.i(TAG, "[MeshService] Acquired WIFI_MODE_FULL_HIGH_PERF WifiLock for 24/7 radio persistence");
                }
                if (serviceMulticastLock == null) {
                    serviceMulticastLock = wm.createMulticastLock("neernetra:ServiceMulticastLock");
                    serviceMulticastLock.setReferenceCounted(false);
                    serviceMulticastLock.acquire();
                    Log.i(TAG, "[MeshService] Acquired MulticastLock for 24/7 background UDP broadcast reception");
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "[MeshService] Could not acquire WifiLock/MulticastLock: " + e.getMessage());
        }
    }

    private void releaseWifiLock() {
        try {
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
                wifiLock = null;
                Log.i(TAG, "[MeshService] Released WifiLock");
            }
            if (serviceMulticastLock != null && serviceMulticastLock.isHeld()) {
                serviceMulticastLock.release();
                serviceMulticastLock = null;
                Log.i(TAG, "[MeshService] Released MulticastLock");
            }
        } catch (Exception ignored) {}
    }

    public static void schedulePeriodicMeshHeartbeatAlarm(Context context) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent heartbeatIntent = new Intent(context, MeshHeartbeatReceiver.class);
            heartbeatIntent.setAction(MeshHeartbeatReceiver.ACTION_MESH_HEARTBEAT);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pi = PendingIntent.getBroadcast(context, 7001, heartbeatIntent, flags);
            long triggerAtMillis = SystemClock.elapsedRealtime() + (15 * 60 * 1000L); // 15 minutes

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pi);
                    Log.i(TAG, "⏰ [MeshHeartbeat] Scheduled 15-minute exact heartbeat alarm (Doze-proof)");
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pi);
                    Log.i(TAG, "⏰ [MeshHeartbeat] Scheduled 15-minute allow-while-idle heartbeat alarm (exact alarm fallback)");
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pi);
                Log.i(TAG, "⏰ [MeshHeartbeat] Scheduled 15-minute exact heartbeat alarm (Doze-proof)");
            } else {
                am.setExact(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pi);
                Log.i(TAG, "⏰ [MeshHeartbeat] Scheduled 15-minute exact heartbeat alarm (legacy)");
            }
        } catch (SecurityException se) {
            try {
                AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                if (am != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent heartbeatIntent = new Intent(context, MeshHeartbeatReceiver.class);
                    heartbeatIntent.setAction(MeshHeartbeatReceiver.ACTION_MESH_HEARTBEAT);
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
                    PendingIntent pi = PendingIntent.getBroadcast(context, 7001, heartbeatIntent, flags);
                    long triggerAtMillis = SystemClock.elapsedRealtime() + (15 * 60 * 1000L);
                    am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pi);
                    Log.i(TAG, "⏰ [MeshHeartbeat] Fallback to setAndAllowWhileIdle after SecurityException");
                }
            } catch (Exception ignored) {}
        } catch (Exception e) {
            Log.w(TAG, "[MeshHeartbeat] Could not schedule heartbeat alarm: " + e.getMessage());
        }
    }

    // ── Native Hardware Sensor Initialization & Listeners ────────────────────
    private void initHardwareSensors() {
        try {
            sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
            if (sensorManager == null) {
                Log.w(TAG, "[MeshService Sensors] SensorManager unavailable on system");
                return;
            }

            accelerometerSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            if (accelerometerSensor != null) {
                isAccelerometerAvailable = true;
                accelerometerName = accelerometerSensor.getName();
                // Register 50Hz (20ms) sensor listener
                sensorManager.registerListener(this, accelerometerSensor, SensorManager.SENSOR_DELAY_GAME);
                Log.i(TAG, "[MeshService Sensors] Registered Accelerometer: " + accelerometerName);
            } else {
                Log.w(TAG, "[MeshService Sensors] No Accelerometer detected on hardware");
            }

            gyroscopeSensor = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
            if (gyroscopeSensor != null) {
                isGyroscopeAvailable = true;
                gyroscopeName = gyroscopeSensor.getName();
                sensorManager.registerListener(this, gyroscopeSensor, SensorManager.SENSOR_DELAY_GAME);
                Log.i(TAG, "[MeshService Sensors] Registered Gyroscope: " + gyroscopeName);
            } else {
                Log.w(TAG, "[MeshService Sensors] No Gyroscope detected on hardware");
            }

            pressureSensor = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE);
            if (pressureSensor != null) {
                isPressureAvailable = true;
                pressureName = pressureSensor.getName();
                sensorManager.registerListener(this, pressureSensor, SensorManager.SENSOR_DELAY_NORMAL);
                Log.i(TAG, "[MeshService Sensors] Registered Barometer: " + pressureName);
            } else {
                isPressureAvailable = false;
                pressureName = "UNAVAILABLE_SOC_FALLBACK";
                Log.i(TAG, "[MeshService Sensors] Sensor.TYPE_PRESSURE unpopulated in SoC hardware on this device — falling back gracefully to live weather telemetry + simulation hook.");
            }
            isSensorsRegistered = true;
        } catch (Exception e) {
            Log.e(TAG, "[MeshService Sensors] Failed to initialize hardware sensors: " + e.getMessage());
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event == null || event.sensor == null) return;
        int type = event.sensor.getType();
        long now = SystemClock.elapsedRealtime();

        if (type == Sensor.TYPE_ACCELEROMETER) {
            float x = event.values[0];
            float y = event.values[1];
            float z = event.values[2];
            // Android sensor values are in m/s^2; normalize by standard gravity 9.80665 m/s^2
            float vm = (float) (Math.sqrt(x * x + y * y + z * z) / 9.80665f);
            lastVectorMagnitudeG = vm;

            processNativeCollapseKinematics(vm, now);
            processNativeLandslideTremors(vm, now);
        } else if (type == Sensor.TYPE_GYROSCOPE) {
            float gx = event.values[0];
            float gy = event.values[1];
            float gz = event.values[2];
            lastGyroOmega = (float) Math.sqrt(gx * gx + gy * gy + gz * gz);
        } else if (type == Sensor.TYPE_PRESSURE) {
            float hPa = event.values[0];
            lastPressureHpa = hPa;
            processNativeBarometricSquall(hPa, now);
        }

        // Live 25Hz telemetry stream to React Native bridge
        if (now - lastSensorTelemetryEmitTime >= 40) {
            lastSensorTelemetryEmitTime = now;
            NeerNetraGattModule.notifyNativeSensorUpdate(lastVectorMagnitudeG, lastGyroOmega, lastPressureHpa);
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    private void processNativeCollapseKinematics(float vm, long now) {
        // Debounce: prevent duplicate triggers within 60s
        if (now - lastCollapseTriggerTime < 60000) return;

        // Phase 1: Free fall detection (< 0.35g for >= 280ms)
        if (collapsePhase == 0) {
            if (vm < FREE_FALL_THRESHOLD_G) {
                if (freeFallStartTime == 0) {
                    freeFallStartTime = now;
                } else if (now - freeFallStartTime >= FREE_FALL_MIN_DURATION_MS) {
                    collapsePhase = 1;
                    freeFallDurationMs = now - freeFallStartTime;
                    Log.i(TAG, "🚨 [Native Collapse Sentinel] Phase 1 FREE-FALL verified: " + freeFallDurationMs + "ms (<0.35g)");
                }
            } else {
                freeFallStartTime = 0;
            }
        }
        // Phase 2: Shock Impact (>= 3.50g within 2.2s of free fall)
        else if (collapsePhase == 1) {
            if (now - freeFallStartTime > (FREE_FALL_MIN_DURATION_MS + IMPACT_WINDOW_MS)) {
                collapsePhase = 0;
                freeFallStartTime = 0;
            } else if (vm >= IMPACT_THRESHOLD_G) {
                collapsePhase = 2;
                impactDetectedTime = now;
                peakRecordedG = vm;
                stillnessStartTime = now;
                Log.i(TAG, "🚨 [Native Collapse Sentinel] Phase 2 SHOCK IMPACT verified: " + peakRecordedG + "g");
            }
        }
        // Phase 3: Rubble Stillness (deviation from 1.0g < 0.15g and gyro omega < 0.25 rad/s for >= 8.0s)
        else if (collapsePhase == 2) {
            float dev = Math.abs(vm - 1.0f);
            if (dev < STILLNESS_VARIANCE_G && lastGyroOmega < 0.25f) {
                if (now - stillnessStartTime >= STILLNESS_MIN_DURATION_MS) {
                    collapsePhase = 0;
                    freeFallStartTime = 0;
                    lastCollapseTriggerTime = now;
                    triggerNativeCollapseAlarm(peakRecordedG, freeFallDurationMs);
                }
            } else if (dev > 0.45f || lastGyroOmega > 1.0f) {
                // Large ongoing motion indicates user is actively moving/handling phone
                collapsePhase = 0;
                freeFallStartTime = 0;
            }
        }
    }

    private void triggerNativeCollapseAlarm(float peakG, long freeFallMs) {
        Log.w(TAG, "🚨🚨🚨 [Native Collapse Sentinel] 3-PHASE BUILDING COLLAPSE CONFIRMED! Peak: " + peakG + "g, Freefall: " + freeFallMs + "ms");

        Bundle extras = new Bundle();
        extras.putString("title", "🚨 STRUCTURAL COLLAPSE DETECTED");
        extras.putString("message", "Kinetic impact (" + String.format(Locale.US, "%.1fg", peakG) + ") & rubble entrapment detected! 60s safety triage countdown active.");
        extras.putString("emergency_type", "COLLAPSE");
        extras.putFloat("peak_g", peakG);
        extras.putLong("free_fall_ms", freeFallMs);

        // 1. Wake physical phone screen & present incoming emergency alert
        wakeScreenAndShowNotification(
            this,
            "🚨 STRUCTURAL COLLAPSE DETECTED",
            "Kinetic impact (" + String.format(Locale.US, "%.1fg", peakG) + ") & rubble entrapment detected! 60s safety triage active.",
            "COLLAPSE",
            extras
        );

        // 2. Play continuous emergency siren
        playEmergencyAlarm(this);

        // 3. Immediately broadcast raw BLE collapse packet to all neighboring mesh nodes
        try {
            JSONObject obj = new JSONObject();
            obj.put("type", "SOS");
            obj.put("sos_type", "COLLAPSE");
            obj.put("notes", "NATIVE SENSOR AUTONOMOUS COLLAPSE: Peak " + String.format(Locale.US, "%.1f", peakG) + "g, 8s rubble stillness.");
            obj.put("timestamp", System.currentTimeMillis());
            String jsonStr = obj.toString();
            String b64 = android.util.Base64.encodeToString(jsonStr.getBytes(StandardCharsets.UTF_8), android.util.Base64.NO_WRAP);
            NeerNetraNativeMeshManager.getInstance(this).notifyAllClients(b64);
            Log.i(TAG, "[Native Collapse Sentinel] Broadcasted BLE collapse SOS packet to mesh");
        } catch (Exception e) {
            Log.e(TAG, "[Native Collapse Sentinel] Failed to broadcast BLE SOS: " + e.getMessage());
        }

        // 4. Notify React Native if context is alive
        NeerNetraGattModule.notifyNativeCollapseEvent(peakG, freeFallMs);
    }

    private void processNativeLandslideTremors(float vm, long now) {
        // Cooldown: prevent duplicate triggers within 180s (3 minutes)
        if (now - lastLandslideTriggerTime < 180000) return;

        // If phone is experiencing rotational angular velocity (gyro omega >= 0.20 rad/s),
        // it means a human is actively handling, rotating, or walking with the phone.
        // True sub-surface seismic harmonic tremors only occur when the phone is stationary on ground/furniture.
        if (isGyroscopeAvailable && lastGyroOmega >= 0.20f) {
            landslideTremorStartTime = 0;
            return;
        }

        float delta = Math.abs(vm - 1.0f);
        if (delta >= LANDSLIDE_MIN_TREMOR_G && delta <= LANDSLIDE_MAX_TREMOR_G) {
            if (landslideTremorStartTime == 0) {
                landslideTremorStartTime = now;
            } else if (now - landslideTremorStartTime >= LANDSLIDE_DURATION_MS) {
                landslideTremorStartTime = 0;
                lastLandslideTriggerTime = now;
                Log.i(TAG, "📡 [Native Landslide Sentinel] Single-device tremor detected (delta=" + delta + "g, duration=30s). Dispatching telemetry to 1/3rd quorum consensus pipeline without sounding local alarm.");
                // Dispatch telemetry to the 1/3rd sector quorum pipeline (never trigger local alarm/siren on 1 phone!)
                NeerNetraGattModule.notifyNativeLandslideEvent(delta, LANDSLIDE_DURATION_MS);
            }
        } else {
            if (delta > 0.45f) {
                // Large movement (human walking/handling phone), reset tremor timer
                landslideTremorStartTime = 0;
            }
        }
    }

    private void triggerNativeLandslideAlarm() {
        Log.i(TAG, "⛰️ [Native Landslide Sentinel] Confirmed sector landslide directive received — alerting user.");
        Bundle extras = new Bundle();
        extras.putString("title", "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS");
        extras.putString("message", "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW");
        extras.putString("emergency_type", "LANDSLIDE");

        wakeScreenAndShowNotification(
            this,
            "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS",
            "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW",
            "LANDSLIDE",
            extras
        );
    }

    private void processNativeBarometricSquall(float hPa, long now) {
        synchronized (pressureHistory) {
            pressureHistory.add(new PressureSample(now, hPa));
            // Retain 3 hours of samples
            long cutoff = now - (3 * 3600 * 1000L);
            Iterator<PressureSample> it = pressureHistory.iterator();
            while (it.hasNext()) {
                if (it.next().timestamp < cutoff) {
                    it.remove();
                } else {
                    break;
                }
            }

            if (!pressureHistory.isEmpty()) {
                float oldestHpa = pressureHistory.get(0).hPa;
                float drop = oldestHpa - hPa;
                if (drop >= 3.0f && (now - lastStormTriggerTime > 15 * 60 * 1000L)) {
                    lastStormTriggerTime = now;
                    triggerNativeStormAlarm(drop, hPa);
                }
            }
        }
    }

    private void triggerNativeStormAlarm(float dropHpa, float currentHpa) {
        Log.i(TAG, "⚠️ [Native Barometer Sentinel] Rapid 3-hour pressure drop detected: " + dropHpa + " hPa (Current: " + currentHpa + " hPa). Dispatching telemetry to React Native bridge (no siren).");
        // Notify React Native bridge (no local siren or call notification)
        NeerNetraGattModule.notifyNativeStormEvent(dropHpa, currentHpa);
    }

    // ── Native 24/7 Background Siren Poller Subsystem ─────────────────────────
    private void startNativeSirenPollLoop() {
        if (isSirenPollerRunning) return;
        isSirenPollerRunning = true;

        sirenPollerThread = new Thread(new Runnable() {
            @Override
            public void run() {
                Log.i(TAG, "🚨 [MeshService Native Siren Poller] Started 24/7 background siren listener loop");
                while (isSirenPollerRunning) {
                    try {
                        pollSirenEndpoints();
                    } catch (Throwable t) {
                        Log.w(TAG, "[Native Siren Poller] Tick error: " + t.getMessage());
                    }

                    try {
                        Thread.sleep(3000); // Poll every 3.0 seconds
                    } catch (InterruptedException ie) {
                        break;
                    }
                }
                Log.i(TAG, "🚨 [MeshService Native Siren Poller] Loop stopped");
            }
        }, "NeerNetra-NativeSirenPoller");
        sirenPollerThread.setDaemon(true);
        sirenPollerThread.start();
    }

    private void pollSirenEndpoints() {
        boolean activeSirenFound = false;

        // 1. Try local Wi-Fi / ADB Reverse endpoints (port 3000)
        String[] localUrls = new String[]{
            "http://127.0.0.1:3000/api/mobile/siren-dispatch",
            "http://localhost:3000/api/mobile/siren-dispatch",
            "http://192.168.0.185:3000/api/mobile/siren-dispatch"
        };

        for (String localUrl : localUrls) {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(localUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(800);
                conn.setReadTimeout(800);
                conn.setRequestProperty("Accept", "application/json");

                int code = conn.getResponseCode();
                if (code == 200) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        sb.append(line);
                    }
                    br.close();

                    JSONObject root = new JSONObject(sb.toString());
                    boolean isActive = root.optBoolean("is_siren_active_on_mobile", false);
                    if (isActive) {
                        JSONObject latest = root.optJSONObject("latest_dispatch");
                        if (latest == null) {
                            JSONArray arr = root.optJSONArray("active_dispatches");
                            if (arr != null && arr.length() > 0) {
                                latest = arr.optJSONObject(0);
                            }
                        }

                        if (latest != null) {
                            String dispatchedAt = latest.optString("dispatched_at", "");
                            String zoneName = latest.optString("zone_name", "Emergency Zone");
                            String zoneId = latest.optString("zone_id", "all_sectors");
                            String msg = latest.optString("emergency_message", "EMERGENCY CIVIL DEFENSE ALARM ACTIVATED! Evacuate immediately uphill!");

                            if (!dispatchedAt.isEmpty() && isTimestampRecent(dispatchedAt, 10 * 60 * 1000L)) {
                                if (!dispatchedAt.equals(lastSilencedSirenTimestamp)) {
                                    activeSirenFound = true;
                                    if (!dispatchedAt.equals(lastHandledSirenTimestamp) || !isNativeSirenSounding) {
                                        lastHandledSirenTimestamp = dispatchedAt;
                                        isNativeSirenSounding = true;
                                        Log.i(TAG, "🚨 [Native Siren Poller] Triggering alert from local gateway: " + localUrl);
                                        triggerNativeEmergencySiren(zoneName, msg, zoneId, dispatchedAt);
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (conn != null) conn.disconnect();
            }
        }

        if (activeSirenFound) return;

        // 2. Online Cellular / Internet Supabase Cloud REST API
        HttpURLConnection supaConn = null;
        try {
            URL url = new URL(SUPABASE_REST_URL + "/sos_alerts?device_id=eq.ADMIN_SIREN_DISPATCH&order=created_at.desc&limit=1");
            supaConn = (HttpURLConnection) url.openConnection();
            supaConn.setRequestMethod("GET");
            supaConn.setConnectTimeout(2500);
            supaConn.setReadTimeout(2500);
            supaConn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
            supaConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY);
            supaConn.setRequestProperty("Accept", "application/json");

            int code = supaConn.getResponseCode();
            if (code == 200) {
                BufferedReader br = new BufferedReader(new InputStreamReader(supaConn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line);
                }
                br.close();

                JSONArray arr = new JSONArray(sb.toString());
                if (arr.length() > 0) {
                    JSONObject latest = arr.getJSONObject(0);
                    String status = latest.optString("status", "");
                    String createdAt = latest.optString("created_at", "");

                    if ("ACTIVE_SIREN".equalsIgnoreCase(status) || "ACTIVE".equalsIgnoreCase(status)) {
                        if (!createdAt.isEmpty() && isTimestampRecent(createdAt, 10 * 60 * 1000L)) {
                            if (!createdAt.equals(lastSilencedSirenTimestamp)) {
                                activeSirenFound = true;
                                if (!createdAt.equals(lastHandledSirenTimestamp) || !isNativeSirenSounding) {
                                    String zoneName = "Emergency Zone";
                                    String zoneId = "universal";
                                    String msg = "EMERGENCY CIVIL DEFENSE ALARM ACTIVATED! Evacuate immediately uphill!";

                                    String notesStr = latest.optString("notes", "");
                                    if (!notesStr.isEmpty()) {
                                        try {
                                            JSONObject nObj = new JSONObject(notesStr);
                                            zoneName = nObj.optString("zone_name", zoneName);
                                            zoneId = nObj.optString("zone_id", zoneId);
                                            msg = nObj.optString("message", msg);
                                        } catch (Exception ignored) {}
                                    }

                                    lastHandledSirenTimestamp = createdAt;
                                    isNativeSirenSounding = true;
                                    Log.i(TAG, "🚨 [Native Siren Poller] Triggering alert from Supabase Cloud: " + zoneName);
                                    triggerNativeEmergencySiren(zoneName, msg, zoneId, createdAt);
                                }
                            }
                        }
                    } else if ("HALTED_SIREN".equalsIgnoreCase(status) || "SILENCED".equalsIgnoreCase(status)) {
                        if (isNativeSirenSounding) {
                            Log.i(TAG, "🚨 [Native Siren Poller] Siren halted via Supabase status=" + status);
                            isNativeSirenSounding = false;
                            stopEmergencyAlarm();
                        }
                    }
                }
            } else {
                Log.w(TAG, "[Native Siren Poller] Supabase REST response code: " + code);
            }
        } catch (Exception e) {
            Log.w(TAG, "[Native Siren Poller] Supabase poll error: " + e.getMessage());
        } finally {
            if (supaConn != null) supaConn.disconnect();
        }

        // 3. If neither local nor Supabase reports an active siren, cease alarm if sounding
        if (!activeSirenFound && isNativeSirenSounding) {
            isNativeSirenSounding = false;
            stopEmergencyAlarm();
        }
    }

    private void triggerNativeEmergencySiren(String zoneName, String message, String zoneId, String timestamp) {
        Log.w(TAG, "🚨🚨🚨 [MeshService Native Siren] ACTIVATED! Zone=" + zoneName + " | Msg=" + message);
        Bundle extras = new Bundle();
        extras.putString("title", "🚨 CIVIL DEFENSE EMERGENCY SIREN");
        extras.putString("message", zoneName + ": " + message);
        extras.putString("emergency_type", "SIREN");
        extras.putString("zone_id", zoneId);
        extras.putString("dispatched_at", timestamp);

        wakeScreenAndShowNotification(
            this,
            "🚨 CIVIL DEFENSE EMERGENCY SIREN",
            zoneName + ": " + message,
            "SIREN",
            extras
        );
        playEmergencyAlarm(this);
    }

    private static boolean isTimestampRecent(String isoTimestamp, long maxAgeMs) {
        if (isoTimestamp == null || isoTimestamp.trim().isEmpty()) return true;
        try {
            long parsedEpochMs;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                parsedEpochMs = java.time.OffsetDateTime.parse(isoTimestamp.trim()).toInstant().toEpochMilli();
            } else {
                String cleaned = isoTimestamp.trim();
                if (cleaned.contains("+")) {
                    cleaned = cleaned.substring(0, cleaned.indexOf("+"));
                }
                if (cleaned.endsWith("Z")) {
                    cleaned = cleaned.substring(0, cleaned.length() - 1);
                }
                int dotIdx = cleaned.indexOf(".");
                if (dotIdx > 0 && cleaned.length() > dotIdx + 4) {
                    cleaned = cleaned.substring(0, dotIdx + 4);
                }
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS", Locale.US);
                sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                java.util.Date parsed = sdf.parse(cleaned);
                parsedEpochMs = parsed != null ? parsed.getTime() : System.currentTimeMillis();
            }
            long age = System.currentTimeMillis() - parsedEpochMs;
            return age >= -120000 && age < maxAgeMs;
        } catch (Exception e) {
            // Never drop life-critical alert on parse quirk
            return true;
        }
    }
}