import { Vibration, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLastKnownLocation } from './locationTracker';

const SUPABASE_REST_URL = 'https://nratutjgjodkbysxyxem.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'sb_publishable_sqCaR-QnTPSE2PVW3FmCtg_AKwBWJpN';
const SILENCED_SIRENS_KEY = '@neernetra_silenced_sirens_v1';

// Only treat sirens issued within the last 10 minutes as "active"
const SIREN_RECENCY_MS = 10 * 60 * 1000;

let sirenNotificationId: string | null = null;
let webAudioCtx: any = null;
let webOscillator: any = null;
let webWobbleInterval: any = null;
let webAudioUnlocked = false;

// ─── Web Audio Helpers ────────────────────────────────────────────────────────

function unlockWebAudio() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || webAudioUnlocked) return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  const handler = () => {
    if (!webAudioCtx) {
      webAudioCtx = new AudioContextClass();
    }
    if (webAudioCtx.state === 'suspended') {
      webAudioCtx.resume().then(() => {
        webAudioUnlocked = true;
      });
    } else {
      webAudioUnlocked = true;
    }
    document.removeEventListener('click', handler);
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('keydown', handler);
  };

  document.addEventListener('click', handler, { once: true });
  document.addEventListener('touchstart', handler, { once: true });
  document.addEventListener('keydown', handler, { once: true });
}

function startWebSiren() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!webAudioCtx) {
      webAudioCtx = new AudioContextClass();
    }
    if (webAudioCtx.state === 'suspended') {
      webAudioCtx.resume();
    }
    if (webOscillator) {
      try { webOscillator.stop(); webOscillator.disconnect(); } catch {}
      webOscillator = null;
    }
    webOscillator = webAudioCtx.createOscillator();
    const gainNode = webAudioCtx.createGain();

    webOscillator.type = 'sawtooth';
    webOscillator.frequency.setValueAtTime(600, webAudioCtx.currentTime);

    let high = true;
    if (webWobbleInterval) clearInterval(webWobbleInterval);
    webWobbleInterval = setInterval(() => {
      if (!webAudioCtx || !webOscillator) return;
      const targetFreq = high ? 950 : 500;
      try {
        webOscillator.frequency.exponentialRampToValueAtTime(targetFreq, webAudioCtx.currentTime + 0.4);
      } catch {}
      high = !high;
    }, 450);

    gainNode.gain.setValueAtTime(0.35, webAudioCtx.currentTime);
    webOscillator.connect(gainNode);
    gainNode.connect(webAudioCtx.destination);
    webOscillator.start();
  } catch (e) {
    console.warn('[MobileSirenListener] Web Audio oscillator error:', e);
  }
}

function stopWebSiren() {
  if (Platform.OS !== 'web') return;
  try {
    if (webWobbleInterval) {
      clearInterval(webWobbleInterval);
      webWobbleInterval = null;
    }
    if (webOscillator) {
      webOscillator.stop();
      webOscillator.disconnect();
      webOscillator = null;
    }
  } catch {}
}

function postWebNotification(zoneName: string, message: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`🚨 CIVIL DEFENSE SIREN: ${zoneName}`, {
          body: message || 'Immediate high-ground evacuation ordered by NDRF / SDMA!',
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification(`🚨 CIVIL DEFENSE SIREN: ${zoneName}`, {
              body: message || 'Immediate high-ground evacuation ordered by NDRF / SDMA!',
            });
          }
        });
      }
    }
  } catch {}
}

// ─── Android Notification Channel ────────────────────────────────────────────

async function setupSirenNotificationChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('civil_defense_siren_channel', {
      name: '🚨 CIVIL DEFENSE EMERGENCY SIREN',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 800, 400, 800, 400, 1200],
      lightColor: '#FF0000',
      sound: 'default',
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
      bypassDnd: true,
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (err) {
    console.warn('[MobileSirenListener] Notification channel setup error:', err);
  }
}

async function postSirenNotification(zoneName: string, message: string) {
  if (Platform.OS === 'web') {
    postWebNotification(zoneName, message);
    return;
  }
  try {
    await setupSirenNotificationChannel();
    sirenNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 CIVIL DEFENSE EMERGENCY SIREN ACTIVATED',
        body: `${zoneName}: ${message || 'Immediate high-ground evacuation ordered by NDRF / SDMA! Move to safe haven now.'}`,
        data: { isSiren: true, zoneName, message },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true,
        color: '#dc2626',
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[MobileSirenListener] Notification post error:', err);
  }
}

async function dismissSirenNotification() {
  if (Platform.OS === 'web') return;
  try {
    if (sirenNotificationId) {
      await Notifications.dismissNotificationAsync(sirenNotificationId);
      sirenNotificationId = null;
    }
    await Notifications.dismissAllNotificationsAsync();
  } catch (err) {
    console.warn('[MobileSirenListener] Notification dismiss error:', err);
  }
}

export interface MobileSirenEvent {
  active: boolean;
  message?: string;
  zoneName?: string;
  authorizedBy?: string;
  dispatchedAt?: string;
}

type SirenCallback = (event: MobileSirenEvent) => void;

class MobileSirenListener {
  private timer: any = null;
  private isAlarmActive: boolean = false;
  private lastProcessedTimestamp: string = '';
  private processedSirenTimestamps: Set<string> = new Set();
  private silencedSirenTimestamps: Set<string> = new Set();
  private callback: SirenCallback | null = null;
  private speechInterval: any = null;

  constructor() {
    this.loadSilencedState();
  }

  private async loadSilencedState() {
    try {
      const stored = await AsyncStorage.getItem(SILENCED_SIRENS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.silencedSirenTimestamps = new Set(parsed);
        }
      }
    } catch {}
  }

  public start(callback: SirenCallback) {
    this.callback = callback;
    if (this.timer) clearInterval(this.timer);

    if (Platform.OS === 'web') {
      unlockWebAudio();
    }

    this.checkSirenStatus();

    // Poll every 4 seconds
    this.timer = setInterval(() => {
      this.checkSirenStatus();
    }, 4000);

    console.log('[MobileSirenListener] ✅ Emergency siren listener active.');
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.silenceAlarm(false);
  }

  private async checkSirenStatus() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(
        `${SUPABASE_REST_URL}/sos_alerts?device_id=eq.ADMIN_SIREN_DISPATCH&order=created_at.desc&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!res.ok) return;

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[0];
        const createdAt = latest.created_at || '';
        const sirenId = latest.id || createdAt;

        // 1. If this siren was already silenced by the citizen, DO NOT re-trigger!
        if (this.silencedSirenTimestamps.has(createdAt) || this.silencedSirenTimestamps.has(sirenId)) {
          return;
        }

        // 2. Recency guard: Ignore sirens older than 10 minutes
        const sirenAge = Date.now() - new Date(createdAt).getTime();
        const isFresh = sirenAge < SIREN_RECENCY_MS;

        if (latest.status === 'ACTIVE_SIREN') {
          if (!isFresh) {
            if (this.isAlarmActive && this.lastProcessedTimestamp === createdAt) {
              this.silenceAlarm(false);
            }
            return;
          }

          let noteObj: any = {};
          try {
            noteObj = latest.notes ? JSON.parse(latest.notes) : {};
          } catch {
            noteObj = { message: latest.notes };
          }

          // Proximity guard: Don't sound alarms on citizens who are far from the disaster zone (> 40km)
          if (latest.lat && latest.lng) {
            try {
              const loc = await getLastKnownLocation();
              if (loc && loc.lat && loc.lng) {
                const dLat = (latest.lat - loc.lat) * (Math.PI / 180);
                const dLng = (latest.lng - loc.lng) * (Math.PI / 180);
                const a =
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(loc.lat * (Math.PI / 180)) *
                    Math.cos(latest.lat * (Math.PI / 180)) *
                    Math.sin(dLng / 2) *
                    Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distKm = 6371 * c;

                const isUniversal =
                  noteObj.action === 'BROADCAST_ALL' ||
                  noteObj.zone_id === 'all_sectors' ||
                  noteObj.is_universal === true ||
                  latest.device_id === 'ADMIN_SIREN_DISPATCH';

                if (distKm > 40 && !isUniversal) {
                  // The siren is in another district / valley. Citizen in safe zone should not receive false alarms.
                  return;
                }
              }
            } catch {}
          }

          // 3. ONLY trigger once for this specific siren dispatch!
          if (!this.processedSirenTimestamps.has(createdAt) && !this.processedSirenTimestamps.has(sirenId)) {
            this.processedSirenTimestamps.add(createdAt);
            this.processedSirenTimestamps.add(sirenId);
            this.lastProcessedTimestamp = createdAt;

            console.log('[MobileSirenListener] 🚨 Fresh ACTIVE_SIREN broadcast detected from Web!');
            this.triggerAlarm(
              noteObj.message || '🚨 EMERGENCY CIVIL DEFENSE ALARM ACTIVATED! Evacuate immediately uphill!',
              noteObj.zone_name || 'Danger Zone',
              noteObj.authorized_by || 'NDRF / SDMA Command',
              createdAt
            );
          }
          return;
        } else if (latest.status === 'HALTED_SIREN') {
          if (this.isAlarmActive) {
            console.log('[MobileSirenListener] HALTED_SIREN received — silencing alarm.');
            this.silenceAlarm(false);
          }
          return;
        }
      }
    } catch {}
  }

  private triggerAlarm(message: string, zoneName: string, authorizedBy: string, dispatchedAt: string) {
    this.isAlarmActive = true;
    console.log('[MobileSirenListener] 🚨 CIVIL DEFENSE SIREN SOUNDING ON DEVICE!', zoneName);

    postSirenNotification(zoneName, message);
    if (Platform.OS === 'web') {
      startWebSiren();
    }

    try {
      Vibration.vibrate([0, 1000, 400, 1000, 400, 1500], true);
    } catch {}

    const speakAlert = () => {
      try {
        Speech.speak(
          'Emergency Alert! Civil defense siren activated for ' +
            zoneName +
            '. Move uphill to high ground immediately!',
          { rate: 1.0, pitch: 1.15 }
        );
      } catch {}
    };

    speakAlert();
    if (this.speechInterval) clearInterval(this.speechInterval);
    this.speechInterval = setInterval(speakAlert, 9000);

    if (this.callback) {
      this.callback({
        active: true,
        message,
        zoneName,
        authorizedBy,
        dispatchedAt,
      });
    }
  }

  public async markSirenSilenced(dispatchedAt?: string) {
    if (dispatchedAt) {
      this.silencedSirenTimestamps.add(dispatchedAt);
    }
    if (this.lastProcessedTimestamp) {
      this.silencedSirenTimestamps.add(this.lastProcessedTimestamp);
    }
    try {
      await AsyncStorage.setItem(
        SILENCED_SIRENS_KEY,
        JSON.stringify(Array.from(this.silencedSirenTimestamps))
      );
    } catch {}
    this.silenceAlarm(false);
  }

  public silenceAlarm(markAsAcknowledged: boolean = true) {
    this.isAlarmActive = false;
    console.log('[MobileSirenListener] Siren silenced by citizen.');

    stopWebSiren();
    dismissSirenNotification();

    try {
      Vibration.cancel();
    } catch {}

    if (this.speechInterval) {
      clearInterval(this.speechInterval);
      this.speechInterval = null;
    }

    try {
      Speech.stop();
    } catch {}

    if (this.callback) {
      this.callback({ active: false });
    }
  }
}

export const mobileSirenListener = new MobileSirenListener();
