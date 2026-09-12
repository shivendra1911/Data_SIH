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

/**
 * Request notification permissions and register the device FCM token with backend.
 */
export const registerForPushNotificationsAsync = async (
  deviceUuid: string,
  zoneId: string = 'chamoli_01'
): Promise<string | null> => {
  try {
    await setupEmergencyNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NotificationService] Notification permission not granted by user.');
      return null;
    }

    // Attempt to retrieve the native device push token (FCM token on Android)
    let pushToken: string | null = null;
    try {
      const deviceTokenData = await Notifications.getDevicePushTokenAsync();
      pushToken = deviceTokenData.data;
      console.log('[NotificationService] Acquired native device FCM push token:', pushToken);
    } catch (deviceTokenErr) {
      console.log('[NotificationService] Native token fallback, attempting Expo push token:', deviceTokenErr);
      try {
        const expoTokenData = await Notifications.getExpoPushTokenAsync();
        pushToken = expoTokenData.data;
        console.log('[NotificationService] Acquired Expo push token:', pushToken);
      } catch (expoTokenErr) {
        console.warn('[NotificationService] Could not acquire push token:', expoTokenErr);
      }
    }

    if (pushToken) {
      const { registerPushTokenApi } = require('./api');
      await registerPushTokenApi(deviceUuid, pushToken, zoneId);
    }

    return pushToken;
  } catch (err) {
    console.warn('[NotificationService] Error initializing push notifications:', err);
    return null;
  }
};
