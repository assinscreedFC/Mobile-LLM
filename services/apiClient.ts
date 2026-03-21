/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

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

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
apiClient.interceptors.response.use(
  (response) => {
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

export default apiClient;