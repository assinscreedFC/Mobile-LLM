/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { notificationService } from '../services/notificationService';

export function useNotifications() {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any | null>(null);
  const notificationListener = useRef<{ remove: () => void } | null>(null);
  const responseListener = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    const isAndroidExpoGo =
      Platform.OS === 'android' && Constants.appOwnership === 'expo';

    if (isAndroidExpoGo) {
      return;
    }

    let isMounted = true;

    // Register for push notifications
    notificationService.registerForPushNotifications().then(token => {
      if (token && isMounted) {
        setPushToken(token);
        notificationService.registerTokenWithBackend(token);
      }
    });

    import('expo-notifications').then((Notifications) => {
      if (!isMounted) return;

      // Listen for incoming notifications
      notificationListener.current = Notifications.addNotificationReceivedListener(n => {
        setNotification(n);
      });

      // Listen for notification interactions (taps)
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        // Could navigate to specific chat based on notification data
        console.log('[Notifications] User tapped notification:', response.notification.request.content.data);
      });
    });

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return { pushToken, notification };
}
