/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { getCached, setCache, invalidateCache } from '../utils/apiCache';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/** Resolve TTL based on URL pattern */
function getTtlForUrl(url: string): number {
  if (url.includes('/models')) return 300_000;      // 5 min
  if (url.includes('/knowledge/')) return 120_000;   // 2 min
  if (url.includes('/chats/')) return 30_000;        // 30 s
  return 60_000;                                     // default 60 s
}

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const baseKey = await SecureStore.getItemAsync('token');

      if (baseKey) {
        config.headers.Authorization = `Bearer ${baseKey}`;
      }
    } catch (error) {
      console.error('[API Client] Erreur lors de la lecture du SecureStore', error);
    }

    // Serve from cache for GET requests (unless x-no-cache header is set)
    if (
      config.method === 'get' &&
      !config.headers['x-no-cache']
    ) {
      const fullUrl = `${config.baseURL ?? ''}${config.url ?? ''}`;
      const cached = getCached(fullUrl);
      if (cached !== null) {
        // Abort the real request and resolve with cached data
        config.adapter = () =>
          Promise.resolve({
            data: cached,
            status: 200,
            statusText: 'OK (cache)',
            headers: {},
            config,
          });
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
apiClient.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    const config = response.config;
    if (
      config?.method === 'get' &&
      !config.headers?.['x-no-cache'] &&
      response.status >= 200 &&
      response.status < 300
    ) {
      const fullUrl = `${config.baseURL ?? ''}${config.url ?? ''}`;
      const ttl = getTtlForUrl(fullUrl);
      setCache(fullUrl, response.data, ttl);
    }
    return response;
  },
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[API Client] Non autorisé. La clé est invalide ou expirée.');

      try {
        await SecureStore.deleteItemAsync('token');
        // Defer navigation to avoid calling router before it is mounted
        setTimeout(() => { try { router.replace('/sign-in'); } catch { /* router not ready */ } }, 0);
      } catch (e) {
        console.error('[API Client] Erreur lors de la suppression de la clé', e);
      }
    }

    return Promise.reject(error);
  }
);

export { invalidateCache };
export default apiClient;