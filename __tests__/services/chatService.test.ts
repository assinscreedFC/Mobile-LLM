import * as SecureStore from 'expo-secure-store';
import { MockEventSource } from '../__mocks__/eventSource';

// Mock apiClient
jest.mock('../../services/apiClient', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
  __esModule: true,
}));

import apiClient from '../../services/apiClient';
import { chatService } from '../../services/chatService';

const mockApi = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).__secureStoreReset();
  (globalThis.fetch as jest.Mock).mockReset();
});

describe('chatService', () => {
  describe('getAvailableModels', () => {
    it('maps response.data.data to model objects', async () => {
      (mockApi.get as jest.Mock).mockResolvedValue({
        data: {
          data: [
            { id: 'gpt-4', name: 'GPT-4', size: 5e9, info: { meta: { capabilities: { vision: true } } } },
            { id: 'llama', name: 'Llama', parameter_size: '7B' },
          ],
        },
      });

      const models = await chatService.getAvailableModels();
      expect(models).toHaveLength(2);
      expect(models[0]).toEqual({
        id: 'gpt-4',
        name: 'gpt-4',
        size: '5.0B',
        vision: true,
        _raw: expect.any(Object),
      });
      expect(models[1].size).toBe('7B');
      expect(models[1].vision).toBe(false);
    });

    it('returns fallback model on error', async () => {
      (mockApi.get as jest.Mock).mockRejectedValue(new Error('Network'));

      const models = await chatService.getAvailableModels();
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('athene-v2:latest');
    });
  });

  describe('createNewChat', () => {
    it('sends correct payload and returns response.data', async () => {
      (mockApi.post as jest.Mock).mockResolvedValue({ data: { id: 'chat-1' } });

      const result = await chatService.createNewChat('gpt-4', { id: 'msg-1', content: 'Hello' });
      expect(result).toEqual({ id: 'chat-1' });
      expect(mockApi.post).toHaveBeenCalledWith('/chats/new', expect.objectContaining({
        chat: expect.objectContaining({
          models: ['gpt-4'],
          title: 'Nouvelle conversation',
        }),
      }));
    });

    it('sends payload without messages when userMessage is undefined', async () => {
      (mockApi.post as jest.Mock).mockResolvedValue({ data: { id: 'chat-2' } });

      await chatService.createNewChat('gpt-4');
      const payload = (mockApi.post as jest.Mock).mock.calls[0][1];
      expect(payload.chat.messages).toEqual([]);
    });
  });

  describe('updateChat', () => {
    it('POSTs to /chats/{chatId}', async () => {
      (mockApi.post as jest.Mock).mockResolvedValue({ data: 'ok' });

      const result = await chatService.updateChat('chat-1', { chat: { title: 'New' } });
      expect(mockApi.post).toHaveBeenCalledWith('/chats/chat-1', { chat: { title: 'New' } });
      expect(result).toBe('ok');
    });
  });

  describe('getHistory', () => {
    it('GETs /chats/ with page parameter', async () => {
      (mockApi.get as jest.Mock).mockResolvedValue({ data: [{ id: '1' }] });

      const result = await chatService.getHistory(2);
      expect(mockApi.get).toHaveBeenCalledWith('/chats/?page=2&include_folders=true&include_pinned=true');
      expect(result).toEqual([{ id: '1' }]);
    });

    it('defaults page to 1', async () => {
      (mockApi.get as jest.Mock).mockResolvedValue({ data: [] });

      await chatService.getHistory();
      expect(mockApi.get).toHaveBeenCalledWith('/chats/?page=1&include_folders=true&include_pinned=true');
    });
  });

  describe('deleteChat', () => {
    it('DELETEs /chats/{chatId}', async () => {
      (mockApi.delete as jest.Mock).mockResolvedValue({});

      await chatService.deleteChat('chat-1');
      expect(mockApi.delete).toHaveBeenCalledWith('/chats/chat-1');
    });
  });

  describe('uploadFile', () => {
    it('creates FormData and returns file info on success', async () => {
      await SecureStore.setItemAsync('token', 'test-token');
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'f1', filename: 'doc.pdf', path: '/files/f1', meta: {} }),
      });

      const result = await chatService.uploadFile('file:///doc.pdf', 'doc.pdf', 'application/pdf');
      expect(result).toEqual({
        id: 'f1',
        name: 'doc.pdf',
        url: '/files/f1',
        meta: {},
        mimeType: 'application/pdf',
      });
    });

    it('returns null on error', async () => {
      (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('fail'));

      const result = await chatService.uploadFile('file:///bad');
      expect(result).toBeNull();
    });

    it('uses default filename and mimeType', async () => {
      await SecureStore.setItemAsync('token', 'tok');
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'f2', path: '/f2', meta: {} }),
      });

      const result = await chatService.uploadFile('file:///img');
      expect(result?.name).toBe('upload');
      expect(result?.mimeType).toBe('application/octet-stream');
    });
  });

  describe('attachWebpage', () => {
    it('rejects non-http protocols', async () => {
      const result = await chatService.attachWebpage('ftp://example.com');
      expect(result).toBeNull();
    });

    it('rejects localhost', async () => {
      const result = await chatService.attachWebpage('http://localhost:3000');
      expect(result).toBeNull();
    });

    it('rejects private IPs', async () => {
      expect(await chatService.attachWebpage('http://127.0.0.1')).toBeNull();
      expect(await chatService.attachWebpage('http://10.0.0.1')).toBeNull();
      expect(await chatService.attachWebpage('http://192.168.1.1')).toBeNull();
      expect(await chatService.attachWebpage('http://172.16.0.1')).toBeNull();
    });

    it('sends valid URL to API', async () => {
      (mockApi.post as jest.Mock).mockResolvedValue({ data: { status: 'ok' } });

      const result = await chatService.attachWebpage('https://example.com', 'col-1');
      expect(mockApi.post).toHaveBeenCalledWith('/retrieval/process/web', {
        url: 'https://example.com',
        collection_name: 'col-1',
      });
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('streamCompletion', () => {
    it('creates EventSource and wires onChunk/onError', async () => {
      await SecureStore.setItemAsync('token', 'stream-token');

      const onChunk = jest.fn();
      const onError = jest.fn();

      const es = await chatService.streamCompletion(
        { model: 'gpt-4', messages: [] },
        onChunk,
        onError
      );

      expect(es).toBeDefined();
      // The ES is a MockEventSource, simulate a chunk
      (es as unknown as MockEventSource).__emitChunk('Hello', 'task-1');
      expect(onChunk).toHaveBeenCalledWith('Hello', 'task-1');

      // Simulate [DONE]
      (es as unknown as MockEventSource).__emitDone();
      expect(es.close).toHaveBeenCalled();
    });

    it('calls onError on error event', async () => {
      await SecureStore.setItemAsync('token', 'tok');
      const onChunk = jest.fn();
      const onError = jest.fn();

      const es = await chatService.streamCompletion({ model: 'x', messages: [] }, onChunk, onError);
      (es as unknown as MockEventSource).__emitError({ message: 'fail' });

      expect(onError).toHaveBeenCalled();
      expect(es.close).toHaveBeenCalled();
    });
  });

  describe('chatCompleted', () => {
    it('POSTs payload and returns data', async () => {
      (mockApi.post as jest.Mock).mockResolvedValue({ data: { ok: true } });

      const result = await chatService.chatCompleted({ model: 'x', messages: [] });
      expect(result).toEqual({ ok: true });
    });

    it('returns null on error', async () => {
      (mockApi.post as jest.Mock).mockRejectedValue(new Error('fail'));

      const result = await chatService.chatCompleted({ model: 'x' });
      expect(result).toBeNull();
    });
  });

  describe('stopTask', () => {
    it('POSTs task_id', async () => {
      (mockApi.post as jest.Mock).mockResolvedValue({});

      await chatService.stopTask('task-123');
      expect(mockApi.post).toHaveBeenCalledWith(
        '/chat/stop',
        { task_id: 'task-123' },
        expect.any(Object)
      );
    });

    it('handles error gracefully', async () => {
      (mockApi.post as jest.Mock).mockRejectedValue(new Error('fail'));
      await expect(chatService.stopTask('bad')).resolves.not.toThrow();
    });
  });

  describe('getChatDetails', () => {
    it('GETs /chats/{chatId}', async () => {
      (mockApi.get as jest.Mock).mockResolvedValue({ data: { id: 'c1', chat: {} } });

      const result = await chatService.getChatDetails('c1');
      expect(mockApi.get).toHaveBeenCalledWith('/chats/c1');
      expect(result).toEqual({ id: 'c1', chat: {} });
    });
  });

  describe('getKnowledge', () => {
    it('returns data on success', async () => {
      (mockApi.get as jest.Mock).mockResolvedValue({ data: { items: ['a'], total: 1 } });

      const result = await chatService.getKnowledge(1);
      expect(result).toEqual({ items: ['a'], total: 1 });
    });

    it('returns empty on error', async () => {
      (mockApi.get as jest.Mock).mockRejectedValue(new Error('fail'));

      const result = await chatService.getKnowledge();
      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('generateTitle', () => {
    it('parses JSON title from response', async () => {
      (mockApi.post as jest.Mock)
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: '{"title":"Mon Chat"}' } }] },
        })
        .mockResolvedValueOnce({ data: 'ok' });

      const title = await chatService.generateTitle('c1', 'gpt-4', []);
      expect(title).toBe('Mon Chat');
    });

    it('falls back to raw content when JSON parse fails', async () => {
      (mockApi.post as jest.Mock)
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'Simple Title' } }] },
        })
        .mockResolvedValueOnce({ data: 'ok' });

      const title = await chatService.generateTitle('c1', 'gpt-4', []);
      expect(title).toBe('Simple Title');
    });

    it('does not update chat when title is default', async () => {
      (mockApi.post as jest.Mock).mockResolvedValueOnce({
        data: { choices: [{ message: { content: 'Nouvelle conversation' } }] },
      });

      const title = await chatService.generateTitle('c1', 'gpt-4', []);
      expect(title).toBe('Nouvelle conversation');
      // Only 1 call (title generation), no update call
      expect(mockApi.post).toHaveBeenCalledTimes(1);
    });

    it('returns null on error', async () => {
      (mockApi.post as jest.Mock).mockRejectedValue(new Error('fail'));

      const title = await chatService.generateTitle('c1', 'gpt-4', []);
      expect(title).toBeNull();
    });
  });

  describe('getArchivedChats', () => {
    it('returns archived chats data', async () => {
      (mockApi.get as jest.Mock).mockResolvedValue({ data: [{ id: 'a1' }] });
      const result = await chatService.getArchivedChats(1);
      expect(result).toEqual([{ id: 'a1' }]);
      expect(mockApi.get).toHaveBeenCalledWith('/chats/archived?page=1&order_by=updated_at&direction=desc');
    });
  });

  describe('toggleArchiveChat', () => {
    it('posts to archive endpoint', async () => {
      (mockApi.post as jest.Mock).mockResolvedValue({ data: { archived: true } });
      const result = await chatService.toggleArchiveChat('c1');
      expect(mockApi.post).toHaveBeenCalledWith('/chats/c1/archive');
      expect(result).toEqual({ archived: true });
    });
  });

  describe('archiveAllChats', () => {
    it('posts to archive all endpoint', async () => {
      (mockApi.post as jest.Mock).mockResolvedValue({ data: { count: 5 } });
      const result = await chatService.archiveAllChats();
      expect(mockApi.post).toHaveBeenCalledWith('/chats/archive/all');
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('unarchiveAllChats', () => {
    it('posts to unarchive all endpoint', async () => {
      (mockApi.post as jest.Mock).mockResolvedValue({ data: { count: 3 } });
      const result = await chatService.unarchiveAllChats();
      expect(mockApi.post).toHaveBeenCalledWith('/chats/unarchive/all');
      expect(result).toEqual({ count: 3 });
    });
  });

  describe('exportAllChats', () => {
    it('gets all chats', async () => {
      (mockApi.get as jest.Mock).mockResolvedValue({ data: [{ id: 'c1' }] });
      const result = await chatService.exportAllChats();
      expect(mockApi.get).toHaveBeenCalledWith('/chats/all');
      expect(result).toEqual([{ id: 'c1' }]);
    });
  });

  describe('exportAllArchivedChats', () => {
    it('gets all archived chats', async () => {
      (mockApi.get as jest.Mock).mockResolvedValue({ data: [] });
      const result = await chatService.exportAllArchivedChats();
      expect(mockApi.get).toHaveBeenCalledWith('/chats/all/archived');
      expect(result).toEqual([]);
    });
  });

  describe('importChats', () => {
    it('posts chats to import endpoint', async () => {
      (mockApi.post as jest.Mock).mockResolvedValue({ data: { imported: 2 } });
      const chats = [{ id: '1' }, { id: '2' }];
      const result = await chatService.importChats(chats);
      expect(mockApi.post).toHaveBeenCalledWith('/chats/import', { chats });
      expect(result).toEqual({ imported: 2 });
    });
  });

  describe('deleteAllChats', () => {
    it('deletes all chats', async () => {
      (mockApi.delete as jest.Mock).mockResolvedValue({ data: { deleted: 10 } });
      const result = await chatService.deleteAllChats();
      expect(mockApi.delete).toHaveBeenCalledWith('/chats/');
      expect(result).toEqual({ deleted: 10 });
    });
  });
});
