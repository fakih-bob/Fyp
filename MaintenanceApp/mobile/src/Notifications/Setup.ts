// src/notifications/setup.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  // TS is happy because we return the new NotificationBehavior shape
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // <- new
    shouldShowList: true,   // <- new
  }),
});

// Android channel (safe to run once)
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
  }).catch(console.warn);
}
