/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import apiClient from './apiClient';
import { invalidateCache } from '../utils/apiCache';
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
    invalidateCache('/chats');
    return response.data;
  },

  updateChat: async (chatId: string, chatData: any) => {
    const response = await apiClient.post(`/chats/${chatId}`, chatData);
    invalidateCache('/chats');
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
    invalidateCache('/chats');
  },

  // --- Data Controls / Archived Chats ---
  getArchivedChats: async (page: number = 1) => {
    const response = await apiClient.get(
      `/chats/archived?page=${page}&order_by=updated_at&direction=desc`
    );
    return response.data;
  },

  toggleArchiveChat: async (chatId: string) => {
    const response = await apiClient.post(`/chats/${chatId}/archive`);
    invalidateCache('/chats');
    return response.data;
  },

  archiveAllChats: async () => {
    const response = await apiClient.post("/chats/archive/all");
    invalidateCache('/chats');
    return response.data;
  },

  unarchiveAllChats: async () => {
    const response = await apiClient.post("/chats/unarchive/all");
    invalidateCache('/chats');
    return response.data;
  },

  exportAllChats: async () => {
    const response = await apiClient.get("/chats/all");
    return response.data;
  },

  exportAllArchivedChats: async () => {
    const response = await apiClient.get("/chats/all/archived");
    return response.data;
  },

  importChats: async (chats: any[]) => {
    const response = await apiClient.post("/chats/import", { chats });
    invalidateCache('/chats');
    return response.data;
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

    const body = JSON.stringify({ ...payload, stream: true });

    // Use fetch for payloads with files — react-native-sse EventSource
    // doesn't reliably transmit file references in POST bodies
    const hasFiles = payload.files?.length > 0
      || payload.messages?.some((m: any) => m.files?.length > 0);
    console.log('[SSE] hasFiles:', hasFiles, 'payload.files:', payload.files?.length, 'msg.files:', payload.messages?.filter((m: any) => m.files?.length > 0).length);
    if (hasFiles) {
      // Mimic EventSource interface so streamingSlice can override .close()
      const fetchES: any = {
        _closed: false,
        _ready: null as Promise<void> | null,
        close() { this._closed = true; },
        addEventListener() {},
        removeEventListener() {},
      };
      fetchES._ready = (async () => {
        try {
          // Log the exact payload being sent
          const parsed = JSON.parse(body);
          console.log('[FETCH BODY] model:', parsed.model,
            'files:', JSON.stringify(parsed.files?.map((f: any) => ({type:f.type,id:f.id}))),
            'msg_files:', parsed.messages?.filter((m: any) => m.files).length,
            'vision:', parsed.model_item?.info?.meta?.capabilities?.vision,
            'body_size:', body.length);

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body,
          });
          console.log('[FETCH RESP] status:', response.status, 'ct:', response.headers.get('content-type'));
          const responseText = await response.text();
          console.log('[FETCH RESP] length:', responseText.length, 'first200:', responseText.substring(0, 200));
          for (const line of responseText.split('\n')) {
            if (fetchES._closed) break;
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const json = JSON.parse(line.substring(6));
                const content = json.choices?.[0]?.delta?.content || '';
                onChunk(content, json.task_id);
              } catch {}
            }
          }
          // Call .close() which by now has been overridden by streamingSlice
          // with persistence logic (ADE loop, updateChat, chatCompleted)
          if (!fetchES._closed) {
            fetchES.close();
          }
        } catch (err) {
          onError(err);
        }
      })();
      return fetchES;
    }

    const eventSource = new EventSource(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body,
    });

    eventSource.addEventListener('message', (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        return;
      }
      try {
        const json = JSON.parse(event.data ?? '');
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
      const response = await apiClient.post('/chat/completed', payload, {
        baseURL: BASE_URL_CHAT,
      });
      return response.data;
    } catch (error) {
      console.error('[Chat Service] Erreur chat completed:', error);
      return null;
    }
  },

  stopTask: async (taskId: string) => {
    try {
      await apiClient.post('/chat/stop', { task_id: taskId }, {
        baseURL: BASE_URL_CHAT,
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

  deleteAllChats: async () => {
    const response = await apiClient.delete("/chats/");
    invalidateCache('/chats');
    return response.data;
  },
};

