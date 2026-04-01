/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiClient from './apiClient';

let notificationsModulePromise: Promise<any> | null = null;
let notificationHandlerConfigured = false;

function isAndroidExpoGo() {
  return Platform.OS === 'android' && Constants.appOwnership === 'expo';
}

async function getNotificationsModule() {
  if (isAndroidExpoGo()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications');
  }

  const Notifications = await notificationsModulePromise;

  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    notificationHandlerConfigured = true;
  }

  return Notifications;
}

export const notificationService = {
  /** Request notification permissions and get push token */
  registerForPushNotifications: async (): Promise<string | null> => {
    if (!Device.isDevice) {
      console.warn('[Notifications] Must use physical device for push notifications');
      return null;
    }

    if (isAndroidExpoGo()) {
      console.warn('[Notifications] Android Expo Go does not support remote push notifications on SDK 53+; skipping registration');
      return null;
    }

    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
      });
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      return tokenData.data;
    } catch (e) {
      console.warn('[Notifications] Could not get push token:', e);
      return null;
    }
  },

  /** Send push token to backend (if supported) */
  registerTokenWithBackend: async (token: string): Promise<void> => {
    try {
      await apiClient.post('/users/push-token', { token });
    } catch (error) {
      // Backend may not support push tokens yet - fail silently
      console.warn('[Notifications] Failed to register token with backend:', error);
    }
  },

  /** Schedule a local notification */
  scheduleLocal: async (title: string, body: string, seconds: number = 1): Promise<string> => {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      throw new Error('Notifications unavailable in Android Expo Go');
    }

    return Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    });
  },

  /** Cancel all scheduled notifications */
  cancelAll: async (): Promise<void> => {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /** Get badge count */
  getBadgeCount: async (): Promise<number> => {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return 0;
    return Notifications.getBadgeCountAsync();
  },

  /** Set badge count */
  setBadgeCount: async (count: number): Promise<void> => {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;
    await Notifications.setBadgeCountAsync(count);
  },
};
