import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { playEmergencyAlert } from './emergencyAudio';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const setupEmergencyNotificationChannels = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('red_zone_alerts', {
      name: 'RED ZONE FLASH FLOOD ALERTS',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      sound: 'default',
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
      },
      bypassDnd: true,
    });
  }
};

export const triggerRedZoneEmergencyAlert = async (
  zoneName: string,
  probability: number,
  triggerCause: string
) => {
  try {
    await setupEmergencyNotificationChannels();

    // 1. Show notification banner
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚨 RED ALERT: FLASH FLOOD IN ${zoneName.toUpperCase()}`,
        body: `CRITICAL EVACUATION WARNING! AI Probability: ${probability.toFixed(1)}%. Cause: ${triggerCause}. Head to high ground immediately!`,
        data: { alert_color: 'RED', zoneName, probability },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // trigger immediately
    });

    // 2. ALSO play emergency audio alarm — bypasses silent/DnD mode
    // This is the KEY difference: notification alone won't wake people up,
    // but STREAM_ALARM audio plays even when phone is completely silent.
    await playEmergencyAlert();

    console.log('[NotificationService] RED ZONE Critical Emergency Alert triggered with AUDIO!');
  } catch (error) {
    console.warn('[NotificationService] Failed to dispatch notification:', error);
  }
};
