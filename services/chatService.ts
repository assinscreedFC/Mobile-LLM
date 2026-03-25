/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import apiClient from './apiClient';
import EventSource from 'react-native-sse';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://pleiade.mi.parisdescartes.fr/api/v1';
const BASE_URL_CHAT = BASE_URL.replace('/api/v1', '/api');

/**
 * Service Chat calqué sur les specs de l'API Pleiade (Open WebUI)
 */
export const chatService = {

  getAvailableModels: async () => {
    try {
      const response = await apiClient.get('/models');
      const models = response.data.data || response.data || [];
      return models.map((model: any) => ({
        id: model.id || model.name,
        name: model.id || model.name,
        size: model.size ? `${(model.size / 1e9).toFixed(1)}B` :
          model.parameter_size || '',
        vision: model.info?.meta?.capabilities?.vision ?? false,
        _raw: model,
      }));
    } catch (error) {
      console.error('[Chat Service] Erreur modèles:', error);
      return [{ id: 'athene-v2:latest', name: 'athene-v2:latest', size: '', _raw: null }];
    }
  },

  createNewChat: async (modelName: string, userMessage?: { id: string; content: string }) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const historyMessages: Record<string, any> = {};
    const messagesArray: any[] = [];

    if (userMessage) {
      const msgObj = {
        id: userMessage.id,
        parentId: null,
        childrenIds: [],
        role: 'user',
        content: userMessage.content,
        timestamp,
        models: [modelName],
      };
      historyMessages[userMessage.id] = msgObj;
      messagesArray.push(msgObj);
    }

    const payload = {
      chat: {
        id: '',
        title: 'Nouvelle conversation',
        models: [modelName],
        params: {},
        history: {
          messages: historyMessages,
          currentId: userMessage?.id || null,
        },
        messages: messagesArray,
        tags: [],
        timestamp: Date.now(),
      },
      folder_id: null,
    };
    const response = await apiClient.post('/chats/new', payload);
    return response.data;
  },

  updateChat: async (chatId: string, chatData: any) => {
    const response = await apiClient.post(`/chats/${chatId}`, chatData);
    return response.data;
  },

  getHistory: async (page: number = 1) => {
    const response = await apiClient.get(
      `/chats/?page=${page}&include_folders=true&include_pinned=true`
    );
    return response.data;
  },

  deleteChat: async (chatId: string) => {
    await apiClient.delete(`/chats/${chatId}`);
  },

  uploadFile: async (uri: string, filename?: string, mimeType?: string) => {
    const resolvedFilename = filename ?? 'upload';
    const resolvedMimeType = mimeType ?? 'application/octet-stream';
    try {
      const token = await SecureStore.getItemAsync('token');
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: resolvedMimeType,
        name: resolvedFilename,
      } as any);

      const response = await fetch(`${BASE_URL}/files/?process=true`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

      const data = await response.json();
      return {
        id: data.id,
        name: data.filename || resolvedFilename,
        url: data.path,
        meta: data.meta,
        mimeType: resolvedMimeType,
      };
    } catch (error) {
      console.error('[Chat Service] Erreur upload fichier:', error);
      return null;
    }
  },

  attachWebpage: async (url: string, collectionName: string = '') => {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Seuls les protocoles HTTP/HTTPS sont autorisés');
      }
      if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)) {
        throw new Error('Les URLs vers des réseaux privés ne sont pas autorisées');
      }

      const response = await apiClient.post('/retrieval/process/web', {
        url,
        collection_name: collectionName,
      });
      return response.data;
    } catch (error) {
      console.error('[Chat Service] Erreur attach webpage:', error);
      return null;
    }
  },

  streamCompletion: async (
    payload: any,
    onChunk: (text: string, taskId?: string) => void,
    onError: (err: any) => void
  ) => {
    const token = await SecureStore.getItemAsync('token');
    const url = `${BASE_URL_CHAT}/chat/completions`;

    const eventSource = new EventSource(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ...payload, stream: true }),
    });

    eventSource.addEventListener('message', (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        return;
      }
      try {
        const json = JSON.parse(event.data);
        const content = json.choices?.[0]?.delta?.content || '';
        const taskId = json.task_id;
        onChunk(content, taskId);
      } catch (e) {
        console.warn('[SSE] Chunk malformé:', e, event.data);
      }
    });

    eventSource.addEventListener('error', (event) => {
      console.error('[SSE] Erreur de connexion');
      onError(event);
      eventSource.close();
    });

    return eventSource;
  },

  chatCompleted: async (payload: any) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const response = await fetch(`${BASE_URL_CHAT}/chat/completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (error) {
      console.error('[Chat Service] Erreur chat completed:', error);
      return null;
    }
  },

  stopTask: async (taskId: string) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      await fetch(`${BASE_URL_CHAT}/chat/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ task_id: taskId }),
      });
    } catch (error) {
      console.error('[Chat Service] Erreur stop task:', error);
    }
  },

  getChatDetails: async (chatId: string) => {
    const response = await apiClient.get(`/chats/${chatId}`);
    return response.data;
  },

  getKnowledge: async (page: number = 1) => {
    try {
      const response = await apiClient.get(`/knowledge/?page=${page}`);
      return response.data;
    } catch (error) {
      console.error('[Chat Service] Erreur knowledge:', error);
      return { items: [], total: 0 };
    }
  },

  generateTitle: async (chatId: string, modelName: string, messages: any[]) => {
    try {
      const response = await apiClient.post('/tasks/title/completions', {
        model: modelName,
        messages,
        chat_id: chatId,
      });

      const content = response.data?.choices?.[0]?.message?.content || '';
      let title = 'Nouvelle conversation';
      try {
        const parsed = JSON.parse(content);
        title = parsed.title || title;
      } catch {
        if (content.trim()) title = content.trim();
      }

      if (title !== 'Nouvelle conversation') {
        await apiClient.post(`/chats/${chatId}`, {
          chat: { title },
        });
      }

      return title;
    } catch (error) {
      console.error('[Chat Service] Erreur génération titre:', error);
      return null;
    }
  },
};