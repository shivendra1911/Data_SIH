package com.neernetra.disaster;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.content.ContextCompat;

/**
 * RestartServiceReceiver
 * Catches alarms and watchdog triggers to reliably resurrect NeerNetraMeshService
 * even if the app is killed by aggressive OEM task managers or swiped from Recents.
 */
public class RestartServiceReceiver extends BroadcastReceiver {
    private static final String TAG = "RestartServiceReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.i(TAG, "Watchdog/Resurrection broadcast received. Starting NeerNetraMeshService...");
        try {
            Intent serviceIntent = new Intent(context, NeerNetraMeshService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start NeerNetraMeshService from receiver: " + e.getMessage(), e);
        }
    }
}
