package com.neernetra.disaster;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * BootReceiver
 * ============
 * Listens for system boot or app update events and automatically restarts
 * NeerNetraMeshService so citizens are protected 24/7 even after phone reboots.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "NeerNetraBoot";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        Log.i(TAG, "[BootReceiver] Received system action: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {

            try {
                NeerNetraMeshService.startService(context);
                Log.i(TAG, "[BootReceiver] Successfully started NeerNetraMeshService on boot/update");
            } catch (Exception e) {
                Log.e(TAG, "[BootReceiver] Failed to start NeerNetraMeshService on boot: " + e.getMessage());
            }
        }
    }
}
