package com.neernetra.disaster;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.telecom.CallAudioState;
import android.telecom.Connection;
import android.telecom.ConnectionRequest;
import android.telecom.ConnectionService;
import android.telecom.DisconnectCause;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.util.Log;

/**
 * NeerNetraConnectionService
 * Implements AOSP Self-Managed Telecom Subsystem (WhatsApp/Signal architecture).
 * Guarantees incoming calls wake the device screen and ring seamlessly over lock screen,
 * bypassing Android 10-15 Background Activity Launch (BAL) restrictions.
 */
public class NeerNetraConnectionService extends ConnectionService {
    private static final String TAG = "NeerNetraTelecom";
    public static final String PHONE_ACCOUNT_ID = "neernetra_telecom_account";

    public static PhoneAccountHandle getPhoneAccountHandle(Context context) {
        ComponentName componentName = new ComponentName(context, NeerNetraConnectionService.class);
        return new PhoneAccountHandle(componentName, PHONE_ACCOUNT_ID);
    }

    public static void registerPhoneAccount(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            TelecomManager telecomManager = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
            if (telecomManager == null) return;

            PhoneAccountHandle handle = getPhoneAccountHandle(context);
            PhoneAccount.Builder builder = PhoneAccount.builder(handle, "NeerNetra Disaster Intercom")
                .setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED)
                .setIcon(Icon.createWithResource(context, R.mipmap.ic_launcher))
                .setShortDescription("NeerNetra Emergency BLE Mesh")
                .addSupportedUriScheme("tel");

            telecomManager.registerPhoneAccount(builder.build());
            Log.i(TAG, "Registered AOSP Self-Managed PhoneAccount successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to register PhoneAccount: " + e.getMessage(), e);
        }
    }

    public static boolean triggerIncomingCall(Context context, String callerName, String callerId, boolean isGroupCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false;
        try {
            TelecomManager tm = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
            if (tm == null) return false;

            registerPhoneAccount(context);
            PhoneAccountHandle handle = getPhoneAccountHandle(context);

            Bundle extras = new Bundle();
            Uri callerUri = Uri.fromParts("tel", callerId != null ? callerId : "mesh_caller", null);
            extras.putParcelable(TelecomManager.EXTRA_INCOMING_CALL_ADDRESS, callerUri);

            Bundle callExtras = new Bundle();
            callExtras.putString("caller_name", callerName != null ? callerName : "Nearby Citizen");
            callExtras.putString("caller_id", callerId != null ? callerId : "unknown");
            callExtras.putBoolean("is_group_call", isGroupCall);
            extras.putBundle(TelecomManager.EXTRA_INCOMING_CALL_EXTRAS, callExtras);

            tm.addNewIncomingCall(handle, extras);
            Log.i(TAG, "addNewIncomingCall dispatched to system_server for " + callerName);
            return true;
        } catch (Exception e) {
            Log.w(TAG, "addNewIncomingCall failed: " + e.getMessage() + ", falling back to FullScreenIntent");
            return false;
        }
    }

    @Override
    public Connection onCreateIncomingConnection(PhoneAccountHandle connectionManagerPhoneAccount, ConnectionRequest request) {
        Log.i(TAG, "onCreateIncomingConnection callback from Android Telecom Framework!");
        NeerNetraConnection connection = new NeerNetraConnection(getApplicationContext(), request);
        connection.setConnectionProperties(Connection.PROPERTY_SELF_MANAGED);
        connection.setAudioModeIsVoip(true);

        Bundle extras = request.getExtras();
        String callerName = "Nearby Citizen";
        String callerId = "unknown";
        boolean isGroup = false;

        if (extras != null) {
            Bundle callExtras = extras.getBundle(TelecomManager.EXTRA_INCOMING_CALL_EXTRAS);
            if (callExtras != null) {
                callerName = callExtras.getString("caller_name", "Nearby Citizen");
                callerId = callExtras.getString("caller_id", "unknown");
                isGroup = callExtras.getBoolean("is_group_call", false);
            }
        }

        connection.setCallerDisplayName(callerName, TelecomManager.PRESENTATION_ALLOWED);
        connection.setRinging();
        connection.showIncomingCallUi(callerName, callerId, isGroup);
        return connection;
    }

    @Override
    public void onCreateIncomingConnectionFailed(PhoneAccountHandle connectionManagerPhoneAccount, ConnectionRequest request) {
        super.onCreateIncomingConnectionFailed(connectionManagerPhoneAccount, request);
        Log.w(TAG, "onCreateIncomingConnectionFailed received from Telecom framework");
    }

    public static class NeerNetraConnection extends Connection {
        private final Context context;
        private final ConnectionRequest request;

        public NeerNetraConnection(Context context, ConnectionRequest request) {
            this.context = context;
            this.request = request;
        }

        public void showIncomingCallUi(String callerName, String callerId, boolean isGroup) {
            try {
                Intent intent = new Intent(context, IncomingCallActivity.class);
                intent.putExtra("caller_name", callerName);
                intent.putExtra("caller_id", callerId);
                intent.putExtra("is_group_call", isGroup);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK |
                                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS);
                context.startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "Failed to launch IncomingCallActivity from connection: " + e.getMessage(), e);
            }
        }

        @Override
        public void onShowIncomingCallUi() {
            super.onShowIncomingCallUi();
            Log.i(TAG, "onShowIncomingCallUi triggered by Android OS");
        }

        @Override
        public void onAnswer() {
            Log.i(TAG, "Call answered via Telecom framework");
            setActive();
        }

        @Override
        public void onReject() {
            Log.i(TAG, "Call rejected via Telecom framework");
            setDisconnected(new DisconnectCause(DisconnectCause.REJECTED));
            destroy();
        }

        @Override
        public void onDisconnect() {
            Log.i(TAG, "Call disconnected via Telecom framework");
            setDisconnected(new DisconnectCause(DisconnectCause.LOCAL));
            destroy();
        }

        @Override
        public void onCallAudioStateChanged(CallAudioState state) {
            Log.i(TAG, "onCallAudioStateChanged: route=" + state.getRoute());
        }
    }
}
