package com.neernetra.disaster;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.view.animation.ScaleAnimation;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * IncomingCallActivity
 * ====================
 * Full-screen, lock-screen-bypassing WhatsApp-style incoming call Activity for
 * NeerNetra offline BLE mesh walkie-talkie calls.
 */
public class IncomingCallActivity extends Activity {

    private static final String TAG = "NeerNetraIncomingCall";
    public static final String ACTION_DISMISS_INCOMING_CALL = "com.neernetra.DISMISS_INCOMING_CALL";


    private MediaPlayer ringtonePlayer;
    private Vibrator vibrator;
    private Handler autoTimeoutHandler;
    private Runnable autoTimeoutRunnable;
    private BroadcastReceiver dismissReceiver;

    private String callerName = "Nearby Citizen";
    private String callerId = "";
    private boolean isGroupCall = false;
    private String emergencyType = "CALL_REQ";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setupWindowFlags();

        Intent intent = getIntent();
        if (intent != null) {
            callerName = intent.getStringExtra("caller_name");
            if (callerName == null || callerName.trim().isEmpty()) {
                callerName = "Nearby Citizen";
            }
            callerId = intent.getStringExtra("caller_id");
            if (callerId == null) callerId = "MESH_NODE";
            isGroupCall = intent.getBooleanExtra("is_group_call", false);
            emergencyType = intent.getStringExtra("emergency_type");
            if (emergencyType == null) emergencyType = isGroupCall ? "GROUP_CALL" : "CALL_REQ";
        }

        // Register remote dismiss receiver — fires when caller hangs up (CALL_END/CALL_DECLINE)
        dismissReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.i(TAG, "📴 Remote dismiss broadcast received — closing incoming call screen immediately");
                dismissCall();
            }
        };
        IntentFilter filter = new IntentFilter(ACTION_DISMISS_INCOMING_CALL);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(dismissReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(dismissReceiver, filter);
        }

        View callView = buildCallInterface();
        setContentView(callView);

        startRinging();

        autoTimeoutHandler = new Handler(Looper.getMainLooper());
        autoTimeoutRunnable = () -> {
            Log.i(TAG, "Incoming call unanswered after 45s, auto-dismissing");
            dismissCall();
        };
        autoTimeoutHandler.postDelayed(autoTimeoutRunnable, 45000);
    }

    private void setupWindowFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        } else {
            //noinspection deprecation
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }

    private View buildCallInterface() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        root.setBackgroundColor(Color.parseColor("#080e1a"));
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(24), dp(48), dp(24), dp(48));

        TextView topPill = new TextView(this);
        topPill.setText(isGroupCall ? "🚨 GROUP EMERGENCY INTERCOM" : "📞 DIRECT BLE MESH CALL");
        topPill.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        topPill.setTextColor(isGroupCall ? Color.parseColor("#ef4444") : Color.parseColor("#38bdf8"));
        topPill.setTypeface(Typeface.DEFAULT_BOLD);
        topPill.setGravity(Gravity.CENTER);
        topPill.setPadding(dp(16), dp(8), dp(16), dp(8));

        GradientDrawable pillBg = new GradientDrawable();
        pillBg.setColor(isGroupCall ? Color.parseColor("#2a1215") : Color.parseColor("#0c2340"));
        pillBg.setCornerRadius(dp(20));
        pillBg.setStroke(dp(1), isGroupCall ? Color.parseColor("#ef4444") : Color.parseColor("#0284c7"));
        topPill.setBackground(pillBg);
        root.addView(topPill);

        View spacer1 = new View(this);
        spacer1.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f
        ));
        root.addView(spacer1);

        FrameLayout avatarContainer = new FrameLayout(this);
        LinearLayout.LayoutParams avatarParams = new LinearLayout.LayoutParams(dp(160), dp(160));
        avatarParams.gravity = Gravity.CENTER;
        avatarContainer.setLayoutParams(avatarParams);

        View waveRing = new View(this);
        FrameLayout.LayoutParams waveParams = new FrameLayout.LayoutParams(dp(160), dp(160));
        waveRing.setLayoutParams(waveParams);
        GradientDrawable waveBg = new GradientDrawable();
        waveBg.setShape(GradientDrawable.OVAL);
        waveBg.setColor(Color.TRANSPARENT);
        waveBg.setStroke(dp(2), isGroupCall ? Color.parseColor("#ef4444") : Color.parseColor("#10b981"));
        waveRing.setBackground(waveBg);

        ScaleAnimation pulse = new ScaleAnimation(
            0.7f, 1.25f, 0.7f, 1.25f,
            Animation.RELATIVE_TO_SELF, 0.5f,
            Animation.RELATIVE_TO_SELF, 0.5f
        );
        pulse.setDuration(1200);
        pulse.setRepeatCount(Animation.INFINITE);
        pulse.setRepeatMode(Animation.REVERSE);
        waveRing.startAnimation(pulse);
        avatarContainer.addView(waveRing);

        TextView coreAvatar = new TextView(this);
        FrameLayout.LayoutParams coreParams = new FrameLayout.LayoutParams(dp(120), dp(120));
        coreParams.gravity = Gravity.CENTER;
        coreAvatar.setLayoutParams(coreParams);
        coreAvatar.setGravity(Gravity.CENTER);
        coreAvatar.setText(isGroupCall ? "🚨" : "👤");
        coreAvatar.setTextSize(TypedValue.COMPLEX_UNIT_SP, 48);

        GradientDrawable coreBg = new GradientDrawable();
        coreBg.setShape(GradientDrawable.OVAL);
        coreBg.setColor(isGroupCall ? Color.parseColor("#991b1b") : Color.parseColor("#0369a1"));
        coreBg.setStroke(dp(3), Color.parseColor("#ffffff"));
        coreAvatar.setBackground(coreBg);
        avatarContainer.addView(coreAvatar);

        root.addView(avatarContainer);

        TextView nameView = new TextView(this);
        nameView.setText(callerName);
        nameView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 26);
        nameView.setTextColor(Color.WHITE);
        nameView.setTypeface(Typeface.DEFAULT_BOLD);
        nameView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams nameParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        );
        nameParams.topMargin = dp(24);
        nameView.setLayoutParams(nameParams);
        root.addView(nameView);

        TextView subView = new TextView(this);
        subView.setText(isGroupCall
            ? "Broadcast Alert • Rings all nearby mesh nodes"
            : "Offline BLE Walkie-Talkie Audio Call • Direct Link");
        subView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        subView.setTextColor(Color.parseColor("#94a3b8"));
        subView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        );
        subParams.topMargin = dp(8);
        subView.setLayoutParams(subParams);
        root.addView(subView);

        TextView badgeView = new TextView(this);
        badgeView.setText("⚡ 100% OFFLINE • ZERO INTERNET REQUIRED");
        badgeView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        badgeView.setTextColor(Color.parseColor("#10b981"));
        badgeView.setTypeface(Typeface.DEFAULT_BOLD);
        badgeView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams badgeParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        );
        badgeParams.topMargin = dp(10);
        badgeView.setLayoutParams(badgeParams);
        root.addView(badgeView);

        View spacer2 = new View(this);
        spacer2.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.2f
        ));
        root.addView(spacer2);

        LinearLayout actionRow = new LinearLayout(this);
        actionRow.setOrientation(LinearLayout.HORIZONTAL);
        actionRow.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        actionRow.setGravity(Gravity.CENTER);

        LinearLayout declineCol = new LinearLayout(this);
        declineCol.setOrientation(LinearLayout.VERTICAL);
        declineCol.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView declineBtn = new TextView(this);
        LinearLayout.LayoutParams btnParams1 = new LinearLayout.LayoutParams(dp(76), dp(76));
        declineBtn.setLayoutParams(btnParams1);
        declineBtn.setGravity(Gravity.CENTER);
        declineBtn.setText("✕");
        declineBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 28);
        declineBtn.setTextColor(Color.WHITE);
        declineBtn.setTypeface(Typeface.DEFAULT_BOLD);

        GradientDrawable redCircle = new GradientDrawable();
        redCircle.setShape(GradientDrawable.OVAL);
        redCircle.setColor(Color.parseColor("#dc2626"));
        redCircle.setStroke(dp(2), Color.parseColor("#f87171"));
        declineBtn.setBackground(redCircle);

        declineBtn.setOnClickListener(v -> {
            Log.i(TAG, "Call declined by user");
            dismissCall();
        });

        TextView declineLabel = new TextView(this);
        declineLabel.setText("Decline");
        declineLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        declineLabel.setTextColor(Color.parseColor("#94a3b8"));
        declineLabel.setPadding(0, dp(8), 0, 0);

        declineCol.addView(declineBtn);
        declineCol.addView(declineLabel);
        actionRow.addView(declineCol);

        View btnSpacer = new View(this);
        btnSpacer.setLayoutParams(new LinearLayout.LayoutParams(dp(80), 1));
        actionRow.addView(btnSpacer);

        LinearLayout answerCol = new LinearLayout(this);
        answerCol.setOrientation(LinearLayout.VERTICAL);
        answerCol.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView answerBtn = new TextView(this);
        LinearLayout.LayoutParams btnParams2 = new LinearLayout.LayoutParams(dp(76), dp(76));
        answerBtn.setLayoutParams(btnParams2);
        answerBtn.setGravity(Gravity.CENTER);
        answerBtn.setText("📞");
        answerBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 28);
        answerBtn.setTextColor(Color.WHITE);

        GradientDrawable greenCircle = new GradientDrawable();
        greenCircle.setShape(GradientDrawable.OVAL);
        greenCircle.setColor(Color.parseColor("#16a34a"));
        greenCircle.setStroke(dp(2), Color.parseColor("#4ade80"));
        answerBtn.setBackground(greenCircle);

        ScaleAnimation answerGlow = new ScaleAnimation(
            0.92f, 1.08f, 0.92f, 1.08f,
            Animation.RELATIVE_TO_SELF, 0.5f,
            Animation.RELATIVE_TO_SELF, 0.5f
        );
        answerGlow.setDuration(800);
        answerGlow.setRepeatCount(Animation.INFINITE);
        answerGlow.setRepeatMode(Animation.REVERSE);
        answerBtn.startAnimation(answerGlow);

        answerBtn.setOnClickListener(v -> {
            Log.i(TAG, "Call answered by user! Launching active call HUD...");
            answerCall();
        });

        TextView answerLabel = new TextView(this);
        answerLabel.setText("Answer");
        answerLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        answerLabel.setTextColor(Color.parseColor("#4ade80"));
        answerLabel.setTypeface(Typeface.DEFAULT_BOLD);
        answerLabel.setPadding(0, dp(8), 0, 0);

        answerCol.addView(answerBtn);
        answerCol.addView(answerLabel);
        actionRow.addView(answerCol);

        root.addView(actionRow);

        return root;
    }

    private void startRinging() {
        try {
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (ringtoneUri == null) {
                ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            }
            if (ringtoneUri == null) {
                ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            ringtonePlayer = new MediaPlayer();
            ringtonePlayer.setDataSource(this, ringtoneUri);
            ringtonePlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );
            ringtonePlayer.setLooping(true);
            ringtonePlayer.prepare();
            ringtonePlayer.start();
        } catch (Exception e) {
            Log.w(TAG, "Could not start looping ringtone: " + e.getMessage());
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vm != null) vibrator = vm.getDefaultVibrator();
            } else {
                //noinspection deprecation
                vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }

            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = new long[]{0, 1000, 1000, 1000};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    //noinspection deprecation
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not start vibrator: " + e.getMessage());
        }
    }

    private void stopRinging() {
        if (autoTimeoutHandler != null && autoTimeoutRunnable != null) {
            autoTimeoutHandler.removeCallbacks(autoTimeoutRunnable);
        }

        if (ringtonePlayer != null) {
            try {
                if (ringtonePlayer.isPlaying()) {
                    ringtonePlayer.stop();
                }
                ringtonePlayer.release();
            } catch (Exception ignored) {}
            ringtonePlayer = null;
        }

        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Exception ignored) {}
            vibrator = null;
        }
    }

    private void answerCall() {
        stopRinging();

        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        mainIntent.putExtra("emergency_type", emergencyType);
        mainIntent.putExtra("caller_name", callerName);
        mainIntent.putExtra("caller_id", callerId);
        mainIntent.putExtra("is_group_call", isGroupCall);
        mainIntent.putExtra("auto_answer", true);

        NeerNetraGattModule.setPendingEmergencyIntent(mainIntent);

        startActivity(mainIntent);
        finish();
    }

    private void dismissCall() {
        stopRinging();
        NeerNetraMeshService.stopEmergencyAlarm();
        try {
            android.app.NotificationManager nm = (android.app.NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(NeerNetraMeshService.EMERGENCY_NOTIFICATION_ID);
        } catch (Exception ignored) {}
        finish();
    }

    @Override
    protected void onDestroy() {
        stopRinging();
        if (dismissReceiver != null) {
            try {
                unregisterReceiver(dismissReceiver);
            } catch (Exception ignored) {}
            dismissReceiver = null;
        }
        super.onDestroy();
    }

    private int dp(int value) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            getResources().getDisplayMetrics()
        );
    }
}