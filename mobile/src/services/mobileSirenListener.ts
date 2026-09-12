import { Vibration, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

const SUPABASE_REST_URL = 'https://nratutjgjodkbysxyxem.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'sb_publishable_sqCaR-QnTPSE2PVW3FmCtg_AKwBWJpN';

let sirenSound: Audio.Sound | null = null;
let sirenNotificationId: string | null = null;
let webAudioCtx: any = null;
let webOscillator: any = null;
let webWobbleInterval: any = null;

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
    console.warn('[WebSiren] Web Audio oscillator error:', e);
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

async function setupSirenNotificationChannel() {
  if (Platform.OS !== 'android') return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[MobileSirenListener] Notification permission not granted');
    }
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

async function startSirenSound() {
  if (Platform.OS === 'web') {
    startWebSiren();
    return;
  }
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    if (!sirenSound) {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/emergency_siren.wav'),
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      sirenSound = sound;
    } else {
      await sirenSound.setIsLoopingAsync(true);
      await sirenSound.setVolumeAsync(1.0);
      await sirenSound.playAsync();
    }
  } catch (err) {
    console.warn('[MobileSirenListener] expo-av siren error:', err);
  }
}

async function stopSirenSound() {
  if (Platform.OS === 'web') {
    stopWebSiren();
    return;
  }
  try {
    if (sirenSound) {
      await sirenSound.stopAsync();
      await sirenSound.unloadAsync();
      sirenSound = null;
    }
  } catch (err) {
    console.warn('[MobileSirenListener] expo-av stop error:', err);
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
}

type SirenCallback = (event: MobileSirenEvent) => void;

class MobileSirenListener {
  private timer: any = null;
  private isAlarmActive: boolean = false;
  private lastProcessedTimestamp: string = '';
  private callback: SirenCallback | null = null;
  private speechInterval: any = null;

  public start(callback: SirenCallback) {
    this.callback = callback;
    if (this.timer) clearInterval(this.timer);

    // Initial check immediately
    this.checkSirenStatus();

    // Poll every 4 seconds for immediate responsive alarm forcing
    this.timer = setInterval(() => {
      this.checkSirenStatus();
    }, 4000);

    console.log('[MobileSirenListener] Background emergency siren listener started.');
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.silenceAlarm();
    console.log('[MobileSirenListener] Background emergency siren listener stopped.');
  }

  private async checkSirenStatus() {
    try {
      // 1. Direct Cloud Query to Supabase sos_alerts (works across cellular 4G/5G anywhere)
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

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[0];
          const createdAt = latest.created_at || '';

          // Only process if newer or current state differs
          if (latest.status === 'ACTIVE_SIREN') {
            let noteObj: any = {};
            try {
              noteObj = latest.notes ? JSON.parse(latest.notes) : {};
            } catch {
              noteObj = { message: latest.notes };
            }

            if (!this.isAlarmActive || this.lastProcessedTimestamp !== createdAt) {
              this.lastProcessedTimestamp = createdAt;
              this.triggerAlarm(
                noteObj.message || '🚨 EMERGENCY CIVIL DEFENSE ALARM ACTIVATED! Evacuate immediately uphill!',
                noteObj.zone_name || 'Danger Zone',
                noteObj.authorized_by || 'NDRF / SDMA Command'
              );
            }
            return;
          } else if (latest.status === 'HALTED_SIREN') {
            if (this.isAlarmActive) {
              this.lastProcessedTimestamp = createdAt;
              this.silenceAlarm();
            }
            return;
          }
        }
      }
    } catch (err) {
      // Offline or network lag - silent failover
    }
  }

  private triggerAlarm(message: string, zoneName: string, authorizedBy: string) {
    this.isAlarmActive = true;
    console.log('[MobileSirenListener] 🚨 CIVIL DEFENSE SIREN FORCED ON DEVICE!', zoneName);

    // 1. Post High-Priority Heads-up System Notification
    postSirenNotification(zoneName, message);

    // 2. Play Real Siren Sound via expo-av
    startSirenSound();

    // 3. High-decibel continuous vibration pattern (repeating)
    try {
      Vibration.cancel();
      Vibration.vibrate([0, 800, 400, 800, 400, 1200], true);
    } catch {}

    // 4. Clear loud emergency spoken voice alert (repeats every 9 seconds)
    const speakAlert = () => {
      try {
        Speech.stop();
        Speech.speak(
          'Emergency Alert! Civil defense siren activated for ' +
            zoneName +
            '. Move uphill to high ground immediately!',
          {
            rate: 1.0,
            pitch: 1.15,
          }
        );
      } catch {}
    };

    speakAlert();
    if (this.speechInterval) clearInterval(this.speechInterval);
    this.speechInterval = setInterval(speakAlert, 9000);

    // 5. Notify App UI to force open the Emergency Red Zone Modal
    if (this.callback) {
      this.callback({
        active: true,
        message,
        zoneName,
        authorizedBy,
      });
    }
  }

  public silenceAlarm() {
    if (!this.isAlarmActive) return;
    this.isAlarmActive = false;
    console.log('[MobileSirenListener] Siren silenced/halted by operator.');

    // Stop real audio siren sound
    stopSirenSound();

    // Dismiss push notification
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
      Speech.speak('Emergency siren has been halted.', { rate: 1.0 });
    } catch {}

    if (this.callback) {
      this.callback({ active: false });
    }
  }
}

export const mobileSirenListener = new MobileSirenListener();
