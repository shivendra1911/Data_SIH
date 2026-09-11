import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
    });
  }
};

export const triggerRedZoneEmergencyAlert = async (zoneName: string, probability: number, triggerCause: string) => {
  try {
    await setupEmergencyNotificationChannels();

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
    console.log('[NotificationService] RED ZONE Critical Emergency Alert triggered!');
  } catch (error) {
    console.warn('[NotificationService] Failed to dispatch notification:', error);
  }
};
