import * as SecureStore from 'expo-secure-store';
import { login, logout, checkAuthStatus } from '../../services/authService';
import apiClient from '../../services/apiClient';
import { ValidationError } from '../../utils/validation';

jest.mock('../../services/apiClient', () => ({
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
  __esModule: true,
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  (globalThis as any).__secureStoreReset();
  jest.clearAllMocks();
});

describe('authService', () => {
  describe('login', () => {
    it('stores token in SecureStore on success and returns true', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { token: 'abc-token-123' },
      });

      const result = await login('user@test.com', 'password');

      expect(result).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith('/auths/signin', {
        email: 'user@test.com',
        password: 'password',
      });
      const stored = await SecureStore.getItemAsync('token');
      expect(stored).toBe('abc-token-123');
    });

    it('throws when server returns no token', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: {},
      });

      await expect(login('user@test.com', 'validPass1')).rejects.toThrow(
        "Le serveur n'a pas renvoyé de clé d'authentification."
      );
    });

    it('throws on network error', async () => {
      const error = { request: {}, message: 'Network Error' };
      (mockApiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(login('user@test.com', 'validPass1')).rejects.toBe(error);
    });

    it('throws on 401 response', async () => {
      const error = { response: { status: 401 } };
      (mockApiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(login('user@test.com', 'validPass1')).rejects.toBe(error);
    });

    it('throws ValidationError for invalid email', async () => {
      await expect(login('not-an-email', 'validPass1')).rejects.toThrow(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('throws ValidationError for short password', async () => {
      await expect(login('user@test.com', 'abc')).rejects.toThrow(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('trims email before validation', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { token: 'tok' },
      });

      await login('  user@test.com  ', 'password');

      expect(mockApiClient.post).toHaveBeenCalledWith('/auths/signin', {
        email: 'user@test.com',
        password: 'password',
      });
    });
  });

  describe('logout', () => {
    it('deletes token from SecureStore', async () => {
      await SecureStore.setItemAsync('token', 'to-delete');
      await logout();

      const token = await SecureStore.getItemAsync('token');
      expect(token).toBeNull();
    });

    it('handles SecureStore error gracefully (no throw)', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Storage fail'));
      await expect(logout()).resolves.not.toThrow();
    });
  });

  describe('checkAuthStatus', () => {
    it('returns false when no token in SecureStore', async () => {
      const result = await checkAuthStatus();
      expect(result).toBe(false);
    });

    it('returns true when token exists and /models responds OK', async () => {
      await SecureStore.setItemAsync('token', 'valid-token');
      (mockApiClient.get as jest.Mock).mockResolvedValue({ data: [] });

      const result = await checkAuthStatus();
      expect(result).toBe(true);
      expect(mockApiClient.get).toHaveBeenCalledWith('/models');
    });

    it('returns false and clears token on 401', async () => {
      await SecureStore.setItemAsync('token', 'expired-token');
      (mockApiClient.get as jest.Mock).mockRejectedValue({
        response: { status: 401 },
      });

      const result = await checkAuthStatus();
      expect(result).toBe(false);
      const token = await SecureStore.getItemAsync('token');
      expect(token).toBeNull();
    });

    it('returns false on network error without clearing token', async () => {
      await SecureStore.setItemAsync('token', 'my-token');
      (mockApiClient.get as jest.Mock).mockRejectedValue({
        message: 'Network Error',
      });

      const result = await checkAuthStatus();
      expect(result).toBe(false);
      // Token should still be there (no response.status === 401)
      const token = await SecureStore.getItemAsync('token');
      expect(token).toBe('my-token');
    });
  });
});
