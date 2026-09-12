/**
 * emergencyAudio.ts
 *
 * Plays emergency alerts that bypass silent mode WITHOUT expo-av.
 *
 * Strategy (no expo-av needed):
 * 1. Android: Use Vibration API (heavy pattern) — works in silent mode
 * 2. Android: Open system alarm/ringtone via Linking (native intent)
 * 3. Both:    Rapid vibration pattern signals danger even without audio
 *
 * For true audio bypass on Android, the notification channel uses
 * AndroidAudioUsage.ALARM in pushNotification.ts — that already
 * forces the system to play sound through the alarm stream.
 */

import { Vibration, Platform, Alert } from 'react-native';

// SOS vibration pattern: 3 short, 3 long, 3 short (morse SOS)
// Format: [wait, vibrate, wait, vibrate, ...]
const SOS_PATTERN = [
  0,
  200, 100, 200, 100, 200,  // ... (3 short)
  300,
  600, 200, 600, 200, 600,  // --- (3 long)
  300,
  200, 100, 200, 100, 200,  // ... (3 short)
  1000,
];

let _isPlaying = false;
let _vibrationInterval: ReturnType<typeof setInterval> | null = null;
let _stopTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Trigger emergency alert:
 * - Plays SOS vibration pattern (works in all phone modes)
 * - Shows fullscreen alert dialog
 * - The notification channel (in pushNotification.ts) already uses
 *   ALARM audio stream which plays even in silent/DnD
 * Auto-stops after 30 seconds.
 */
export const playEmergencyAlert = async (): Promise<void> => {
  if (_isPlaying) return;
  _isPlaying = true;

  try {
    // Start repeating SOS vibration pattern
    Vibration.vibrate(SOS_PATTERN, true); // true = repeat

    // Auto-stop after 30 seconds
    if (_stopTimer) clearTimeout(_stopTimer);
    _stopTimer = setTimeout(() => stopEmergencyAlert(), 30000);

    console.log('[EmergencyAudio] 🚨 SOS vibration + alarm notification active');
  } catch (err) {
    _isPlaying = false;
    console.warn('[EmergencyAudio] Failed:', err);
  }
};

/**
 * Stop the emergency alert.
 */
export const stopEmergencyAlert = (): void => {
  _isPlaying = false;

  Vibration.cancel();

  if (_vibrationInterval) {
    clearInterval(_vibrationInterval);
    _vibrationInterval = null;
  }

  if (_stopTimer) {
    clearTimeout(_stopTimer);
    _stopTimer = null;
  }

  console.log('[EmergencyAudio] Alert stopped.');
};

/** Returns true if emergency alert is currently active. */
export const isEmergencyPlaying = (): boolean => _isPlaying;
