package com.neernetra.disaster;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

/**
 * EmergencyTriggerReceiver
 * Exported BroadcastReceiver enabling external broadcast triggers (via ADB or mesh daemons)
 * to immediately wake the physical device screen and present IncomingCallActivity or Emergency Siren
 * even when the app is swiped away, in the background, or device is screen-locked.
 */
public class EmergencyTriggerReceiver extends BroadcastReceiver {
    private static final String TAG = "EmergencyTriggerReceiver";
    public static final String ACTION_TRIGGER_INCOMING_CALL = "com.neernetra.disaster.TRIGGER_INCOMING_CALL";
    public static final String ACTION_TRIGGER_EMERGENCY_SIREN = "com.neernetra.disaster.TRIGGER_EMERGENCY_SIREN";
    public static final String ACTION_TRIGGER_COLLAPSE = "com.neernetra.disaster.TRIGGER_COLLAPSE";
    public static final String ACTION_TRIGGER_LANDSLIDE = "com.neernetra.disaster.TRIGGER_LANDSLIDE";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Log.i(TAG, "🚨 EmergencyTriggerReceiver broadcast received: " + action);

        if (ACTION_TRIGGER_INCOMING_CALL.equals(action)) {
            String callerName = intent.getStringExtra("caller_name");
            if (callerName == null || callerName.trim().isEmpty()) {
                callerName = "Rescue-Team-Alpha";
            }
            String callerId = intent.getStringExtra("caller_id");
            if (callerId == null || callerId.trim().isEmpty()) {
                callerId = "NDRF_ALPHA";
            }
            boolean isGroup = intent.getBooleanExtra("is_group_call", false);
            String emergencyType = intent.getStringExtra("emergency_type");
            if (emergencyType == null || emergencyType.trim().isEmpty()) {
                emergencyType = isGroup ? "GROUP_CALL" : "CALL_REQ";
            }

            Bundle extras = new Bundle();
            extras.putString("caller_name", callerName);
            extras.putString("caller_id", callerId);
            extras.putBoolean("is_group_call", isGroup);
            extras.putString("emergency_type", emergencyType);

            NeerNetraMeshService.wakeScreenAndShowNotification(
                context,
                isGroup ? "🚨 GROUP EMERGENCY CALL" : "📞 INCOMING EMERGENCY CALL",
                callerName + " is calling via BLE mesh...",
                emergencyType,
                extras
            );
        } else if (ACTION_TRIGGER_EMERGENCY_SIREN.equals(action)) {
            String title = intent.getStringExtra("title");
            if (title == null || title.trim().isEmpty()) {
                title = "🚨 EMERGENCY CIVIL DEFENSE SIREN";
            }
            String message = intent.getStringExtra("message");
            if (message == null || message.trim().isEmpty()) {
                message = "Immediate High-Ground Evacuation Ordered! Move to safe haven now.";
            }
            String emergencyType = intent.getStringExtra("emergency_type");
            if (emergencyType == null || emergencyType.trim().isEmpty()) {
                emergencyType = "SIREN";
            }

            Bundle extras = new Bundle();
            extras.putString("title", title);
            extras.putString("message", message);
            extras.putString("emergency_type", emergencyType);

            NeerNetraMeshService.wakeScreenAndShowNotification(
                context,
                title,
                message,
                emergencyType,
                extras
            );
        } else if (ACTION_TRIGGER_COLLAPSE.equals(action)) {
            float peakG = intent.getFloatExtra("peak_g", 4.8f);
            long freeFallMs = intent.getLongExtra("free_fall_ms", 350L);

            Intent svcIntent = new Intent(context, NeerNetraMeshService.class);
            svcIntent.setAction(NeerNetraMeshService.ACTION_TRIGGER_COLLAPSE);
            svcIntent.putExtra("peak_g", peakG);
            svcIntent.putExtra("free_fall_ms", freeFallMs);
            try {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    context.startForegroundService(svcIntent);
                } else {
                    context.startService(svcIntent);
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to dispatch collapse trigger to MeshService: " + e.getMessage());
            }
        } else if (ACTION_TRIGGER_LANDSLIDE.equals(action)) {
            String title = intent.getStringExtra("title");
            if (title == null || title.trim().isEmpty()) {
                title = "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS";
            }
            String message = intent.getStringExtra("message");
            if (message == null || message.trim().isEmpty()) {
                message = "⛰️ LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS — EVACUATE NOW";
            }
            String emergencyType = "LANDSLIDE";

            Bundle extras = new Bundle();
            extras.putString("title", title);
            extras.putString("message", message);
            extras.putString("emergency_type", emergencyType);
            extras.putString("sector_id", intent.getStringExtra("sector_id"));

            NeerNetraMeshService.wakeScreenAndShowNotification(
                context,
                title,
                message,
                emergencyType,
                extras
            );
        }
    }
}
