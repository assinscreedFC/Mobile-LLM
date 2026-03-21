/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const ADE_BASE_URL = process.env.EXPO_PUBLIC_ADE_API_URL || 'http://localhost:8001';

const adeClient = axios.create({
  baseURL: ADE_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Injecter le même token Bearer que l'app principale
adeClient.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('[ADE Service] Erreur SecureStore', error);
  }
  return config;
});

// --- Types ---

export interface ADEEvent {
  summary: string;
  start: string | null;
  end: string | null;
  location: string;
  description: string;
}

export interface ADEResource {
  name: string;
  resource_id: number;
  project_id: number;
}

export interface ADERoutine {
  name: string;
  cron: string;
  action: string;
  params: Record<string, any>;
}

// --- Service ---

export const adeService = {

  login: async (casUsername: string, casPassword: string): Promise<void> => {
    await adeClient.post('/ade/login', {
      cas_username: casUsername,
      cas_password: casPassword,
    });
  },

  setIcalUrl: async (icalUrl: string): Promise<void> => {
    await adeClient.post('/ade/ical-url', { ical_url: icalUrl });
  },

  loginWithCookies: async (cookies: Record<string, string>): Promise<{ status: string; authenticated: boolean }> => {
    const { data } = await adeClient.post('/ade/login/cookies', { cookies });
    return data;
  },

  getStatus: async (): Promise<{
    authenticated: boolean;
    has_credentials: boolean;
    project_id: number | null;
    resources_count: number;
  }> => {
    const { data } = await adeClient.get('/ade/status');
    return data;
  },

  getSchedule: async (weeks: number = 4, resourceIds?: number[]): Promise<{
    events: ADEEvent[];
    ical_url: string | null;
  }> => {
    const params: any = { weeks };
    if (resourceIds?.length) {
      params.resource_ids = resourceIds.join(',');
    }
    const { data } = await adeClient.get('/ade/schedule', { params });
    return data;
  },

  search: async (query: string): Promise<Record<string, any>[]> => {
    const { data } = await adeClient.get('/ade/search', { params: { q: query } });
    return data.results || [];
  },

  getProjects: async (): Promise<Record<string, any>[]> => {
    const { data } = await adeClient.get('/ade/projects');
    return data.projects || [];
  },

  setProject: async (projectId: number): Promise<void> => {
    await adeClient.post(`/ade/project/${projectId}`);
  },

  remember: async (name: string, resourceId: number, projectId: number): Promise<void> => {
    await adeClient.post('/ade/remember', {
      name,
      resource_id: resourceId,
      project_id: projectId,
    });
  },

  getResources: async (): Promise<ADEResource[]> => {
    const { data } = await adeClient.get('/ade/resources');
    return data;
  },

  removeResource: async (name: string): Promise<void> => {
    await adeClient.delete(`/ade/resources/${encodeURIComponent(name)}`);
  },

  getIcalUrl: async (resourceIds?: number[], weeks: number = 4): Promise<string> => {
    const params: any = { weeks };
    if (resourceIds?.length) {
      params.resource_ids = resourceIds.join(',');
    }
    const { data } = await adeClient.get('/ade/ical', { params });
    return data.ical_url;
  },

  addRoutine: async (name: string, cron: string, action: string, params: Record<string, any> = {}): Promise<void> => {
    await adeClient.post('/ade/routines', { name, cron, action, params });
  },

  getRoutines: async (): Promise<ADERoutine[]> => {
    const { data } = await adeClient.get('/ade/routines');
    return data;
  },

  removeRoutine: async (name: string): Promise<void> => {
    await adeClient.delete(`/ade/routines/${encodeURIComponent(name)}`);
  },

  // --- Navigation interactive Playwright ---

  adeAction: async (action: string, params: Record<string, string> = {}): Promise<any> => {
    const { data } = await adeClient.post('/ade/action', { action, params }, { timeout: 120000 });
    return data;
  },
};
