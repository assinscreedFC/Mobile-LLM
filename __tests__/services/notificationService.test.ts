import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('../../services/apiClient', () => ({
  default: {
    post: jest.fn(),
  },
  __esModule: true,
}));

import { notificationService } from '../../services/notificationService';
import apiClient from '../../services/apiClient';
import { Platform } from 'react-native';

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.clearAllMocks();
  // Reset Platform.OS
  (Platform as any).OS = 'ios';
});

describe('notificationService', () => {
  describe('registerForPushNotifications', () => {
    it('returns null when not a physical device', async () => {
      // Temporarily override isDevice
      const originalIsDevice = Device.isDevice;
      Object.defineProperty(Device, 'isDevice', { value: false, writable: true });

      const result = await notificationService.registerForPushNotifications();
      expect(result).toBeNull();

      Object.defineProperty(Device, 'isDevice', { value: originalIsDevice, writable: true });
    });

    it('returns token when permission already granted', async () => {
      (mockNotifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      (mockNotifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'expo-push-token-123' });

      const result = await notificationService.registerForPushNotifications();
      expect(result).toBe('expo-push-token-123');
      expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permission when not already granted', async () => {
      (mockNotifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
      (mockNotifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      (mockNotifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'token-456' });

      const result = await notificationService.registerForPushNotifications();
      expect(result).toBe('token-456');
      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('returns null when permission denied', async () => {
      (mockNotifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
      (mockNotifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

      const result = await notificationService.registerForPushNotifications();
      expect(result).toBeNull();
    });

    it('sets up Android notification channel on Android', async () => {
      (Platform as any).OS = 'android';
      (mockNotifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      (mockNotifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'token' });

      await notificationService.registerForPushNotifications();
      expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', expect.objectContaining({
        name: 'default',
        importance: 5,
      }));
    });

    it('does not set up Android channel on iOS', async () => {
      (Platform as any).OS = 'ios';
      (mockNotifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      (mockNotifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'token' });

      await notificationService.registerForPushNotifications();
      expect(mockNotifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    });
  });

  describe('registerTokenWithBackend', () => {
    it('sends token to backend', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({});

      await notificationService.registerTokenWithBackend('push-token');
      expect(mockApiClient.post).toHaveBeenCalledWith('/users/push-token', { token: 'push-token' });
    });

    it('does not throw on backend error', async () => {
      (mockApiClient.post as jest.Mock).mockRejectedValue(new Error('fail'));

      await expect(notificationService.registerTokenWithBackend('tok')).resolves.not.toThrow();
    });
  });

  describe('scheduleLocal', () => {
    it('schedules a local notification', async () => {
      (mockNotifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notif-id');

      const result = await notificationService.scheduleLocal('Title', 'Body', 5);
      expect(result).toBe('notif-id');
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: { title: 'Title', body: 'Body', sound: true },
        trigger: { type: 'timeInterval', seconds: 5, repeats: false },
      });
    });

    it('defaults to 1 second delay', async () => {
      (mockNotifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('id');

      await notificationService.scheduleLocal('T', 'B');
      const call = (mockNotifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.trigger.seconds).toBe(1);
    });
  });

  describe('cancelAll', () => {
    it('cancels all scheduled notifications', async () => {
      await notificationService.cancelAll();
      expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });

  describe('getBadgeCount', () => {
    it('returns badge count', async () => {
      (mockNotifications.getBadgeCountAsync as jest.Mock).mockResolvedValue(3);

      expect(await notificationService.getBadgeCount()).toBe(3);
    });
  });

  describe('setBadgeCount', () => {
    it('sets badge count', async () => {
      await notificationService.setBadgeCount(5);
      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });
  });
});
