import * as SecureStore from 'expo-secure-store';
import apiClient from '../../services/apiClient';

beforeEach(() => {
  (globalThis as any).__secureStoreReset();
});

describe('apiClient', () => {
  describe('configuration', () => {
    it('has JSON content-type header', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('has 10s timeout', () => {
      expect(apiClient.defaults.timeout).toBe(10000);
    });
  });

  describe('request interceptor - token injection', () => {
    it('adds Bearer token when token exists', async () => {
      await SecureStore.setItemAsync('token', 'test-token-123');

      // Use interceptors.request handlers directly
      const handlers = (apiClient.interceptors.request as any).handlers;
      const interceptor = handlers[0];
      const config = { headers: {} as Record<string, string> };
      const result = await interceptor.fulfilled(config);

      expect(result.headers.Authorization).toBe('Bearer test-token-123');
    });

    it('does not add Authorization when no token', async () => {
      const handlers = (apiClient.interceptors.request as any).handlers;
      const interceptor = handlers[0];
      const config = { headers: {} as Record<string, string> };
      const result = await interceptor.fulfilled(config);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor', () => {
    it('passes successful responses through', () => {
      const handlers = (apiClient.interceptors.response as any).handlers;
      const interceptor = handlers[0];
      const response = { data: 'ok', status: 200 };
      const result = interceptor.fulfilled(response);

      expect(result).toBe(response);
    });

    it('on 401: deletes token and rejects', async () => {
      await SecureStore.setItemAsync('token', 'old-token');

      const handlers = (apiClient.interceptors.response as any).handlers;
      const interceptor = handlers[0];
      const error = { response: { status: 401 } };

      await expect(interceptor.rejected(error)).rejects.toEqual(error);
      // Give setTimeout(0) a chance to run
      await new Promise(r => setTimeout(r, 10));

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
    });

    it('on non-401: rejects without deleting token', async () => {
      await SecureStore.setItemAsync('token', 'my-token');

      const handlers = (apiClient.interceptors.response as any).handlers;
      const interceptor = handlers[0];
      const error = { response: { status: 500 } };

      await expect(interceptor.rejected(error)).rejects.toEqual(error);

      // deleteItemAsync should not have been called (beyond the initial setItemAsync)
      const deleteCalls = (SecureStore.deleteItemAsync as jest.Mock).mock.calls;
      expect(deleteCalls.length).toBe(0);
    });
  });
});
