import { useChatStore, type Attachment } from '../../store/chatStore';
import { chatService } from '../../services/chatService';

// Mock services
jest.mock('../../services/chatService', () => ({
  chatService: {
    getHistory: jest.fn(),
    getChatDetails: jest.fn(),
    createNewChat: jest.fn(),
    updateChat: jest.fn(),
    chatCompleted: jest.fn(),
    streamCompletion: jest.fn(),
    generateTitle: jest.fn(),
    uploadFile: jest.fn(),
    stopTask: jest.fn(),
    getArchivedChats: jest.fn(),
    toggleArchiveChat: jest.fn(),
    archiveAllChats: jest.fn(),
    unarchiveAllChats: jest.fn(),
    deleteAllChats: jest.fn(),
  },
}));

jest.mock('../../services/adeService', () => ({
  adeService: {
    adeAction: jest.fn(),
    getStatus: jest.fn(),
  },
}));

const mockChatService = chatService as jest.Mocked<typeof chatService>;

function resetStore() {
  useChatStore.setState({
    currentChatId: null,
    userMessages: [],
    modelResponses: {},
    activeModels: ['athene-v2:latest'],
    isTyping: false,
    webSearchEnabled: false,
    codeInterpreterEnabled: false,
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 2048,
    currentTaskIds: [],
    currentEventSources: [],
    attachments: [],
    _stopRequested: false,
    _historyTimeoutId: null,
    history: [],
    archivedChats: [],
    modelVision: {},
  });
}

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

describe('chatStore', () => {
  describe('simple setters', () => {
    it('setSystemPrompt updates systemPrompt', () => {
      useChatStore.getState().setSystemPrompt('Be concise');
      expect(useChatStore.getState().systemPrompt).toBe('Be concise');
    });

    it('setTemperature updates temperature', () => {
      useChatStore.getState().setTemperature(1.5);
      expect(useChatStore.getState().temperature).toBe(1.5);
    });

    it('setMaxTokens updates maxTokens', () => {
      useChatStore.getState().setMaxTokens(4096);
      expect(useChatStore.getState().maxTokens).toBe(4096);
    });

    it('setWebSearchEnabled updates webSearchEnabled', () => {
      useChatStore.getState().setWebSearchEnabled(true);
      expect(useChatStore.getState().webSearchEnabled).toBe(true);
    });

    it('setCodeInterpreterEnabled updates codeInterpreterEnabled', () => {
      useChatStore.getState().setCodeInterpreterEnabled(true);
      expect(useChatStore.getState().codeInterpreterEnabled).toBe(true);
    });

    it('setModelVision updates vision for specific model', () => {
      useChatStore.getState().setModelVision('gpt-4', true);
      expect(useChatStore.getState().modelVision['gpt-4']).toBe(true);
    });
  });

  describe('attachment management', () => {
    const att1: Attachment = { type: 'image', uri: 'file:///img1.jpg' };
    const att2: Attachment = { type: 'file', uri: 'file:///doc.pdf', name: 'doc.pdf' };

    it('addAttachment appends to list', () => {
      useChatStore.getState().addAttachment(att1);
      expect(useChatStore.getState().attachments).toHaveLength(1);
      expect(useChatStore.getState().attachments[0]).toEqual(att1);
    });

    it('addAttachment preserves existing', () => {
      useChatStore.getState().addAttachment(att1);
      useChatStore.getState().addAttachment(att2);
      expect(useChatStore.getState().attachments).toHaveLength(2);
    });

    it('removeAttachment filters by URI', () => {
      useChatStore.getState().addAttachment(att1);
      useChatStore.getState().addAttachment(att2);
      useChatStore.getState().removeAttachment(att1.uri);
      expect(useChatStore.getState().attachments).toHaveLength(1);
      expect(useChatStore.getState().attachments[0].uri).toBe(att2.uri);
    });

    it('removeAttachment does nothing for non-existing URI', () => {
      useChatStore.getState().addAttachment(att1);
      useChatStore.getState().removeAttachment('file:///nonexistent');
      expect(useChatStore.getState().attachments).toHaveLength(1);
    });

    it('clearAttachments empties the list', () => {
      useChatStore.getState().addAttachment(att1);
      useChatStore.getState().addAttachment(att2);
      useChatStore.getState().clearAttachments();
      expect(useChatStore.getState().attachments).toEqual([]);
    });
  });

  describe('model management', () => {
    it('addModel adds to activeModels', () => {
      useChatStore.getState().addModel('gpt-4');
      expect(useChatStore.getState().activeModels).toContain('gpt-4');
    });

    it('addModel does not exceed 4 models', () => {
      useChatStore.getState().addModel('m2');
      useChatStore.getState().addModel('m3');
      useChatStore.getState().addModel('m4');
      // Now at 4 (including default athene-v2:latest)
      useChatStore.getState().addModel('m5');
      expect(useChatStore.getState().activeModels).toHaveLength(4);
      expect(useChatStore.getState().activeModels).not.toContain('m5');
    });

    it('addModel does not add duplicates', () => {
      useChatStore.getState().addModel('athene-v2:latest');
      expect(useChatStore.getState().activeModels).toHaveLength(1);
    });

    it('switchModel replaces model at index', () => {
      useChatStore.getState().addModel('gpt-4');
      useChatStore.getState().switchModel(0, 'llama');
      expect(useChatStore.getState().activeModels[0]).toBe('llama');
    });

    it('switchModel copies responses from old model if new has none', () => {
      useChatStore.setState({
        activeModels: ['old-model'],
        modelResponses: { 'old-model': { 'msg-1': 'response text' } },
      });

      useChatStore.getState().switchModel(0, 'new-model');
      expect(useChatStore.getState().modelResponses['new-model']).toEqual({ 'msg-1': 'response text' });
    });

    it('switchModel does nothing for out-of-bounds index', () => {
      const before = [...useChatStore.getState().activeModels];
      useChatStore.getState().switchModel(99, 'new');
      expect(useChatStore.getState().activeModels).toEqual(before);
    });
  });

  describe('startNewChat', () => {
    it('resets conversation state', async () => {
      useChatStore.setState({
        currentChatId: 'old-chat',
        userMessages: [{ id: '1', role: 'user', content: 'hi' }],
        modelResponses: { 'model': { '1': 'hello' } },
        isTyping: true,
        attachments: [{ type: 'image', uri: 'file:///x' }],
      });

      await useChatStore.getState().startNewChat();

      const state = useChatStore.getState();
      expect(state.currentChatId).toBeNull();
      expect(state.userMessages).toEqual([]);
      expect(state.modelResponses).toEqual({});
      expect(state.isTyping).toBe(false);
      expect(state.attachments).toEqual([]);
    });
  });

  describe('fetchHistory', () => {
    it('calls chatService.getHistory and sets history', async () => {
      const mockHistory = [{ id: 'c1', title: 'Chat 1' }];
      mockChatService.getHistory.mockResolvedValue(mockHistory);

      await useChatStore.getState().fetchHistory();

      expect(mockChatService.getHistory).toHaveBeenCalledWith(1);
      expect(useChatStore.getState().history).toEqual(mockHistory);
    });

    it('sets empty array when response is not array', async () => {
      mockChatService.getHistory.mockResolvedValue({ data: 'not array' } as any);

      await useChatStore.getState().fetchHistory();
      expect(useChatStore.getState().history).toEqual([]);
    });

    it('does not throw on error', async () => {
      mockChatService.getHistory.mockRejectedValue(new Error('fail'));

      await expect(useChatStore.getState().fetchHistory()).resolves.not.toThrow();
    });
  });

  describe('setCurrentChatId', () => {
    it('parses server messages into userMessages and modelResponses', async () => {
      mockChatService.getChatDetails.mockResolvedValue({
        chat: {
          messages: [
            { id: 'u1', role: 'user', content: 'Hello' },
            { id: 'a1', role: 'assistant', content: 'Hi there', model: 'gpt-4' },
            { id: 'u2', role: 'user', content: 'How are you?' },
            { id: 'a2', role: 'assistant', content: 'I am fine', model: 'gpt-4' },
          ],
        },
      });

      await useChatStore.getState().setCurrentChatId('chat-1');

      const state = useChatStore.getState();
      expect(state.currentChatId).toBe('chat-1');
      expect(state.userMessages).toHaveLength(2);
      expect(state.userMessages[0].content).toBe('Hello');
      expect(state.modelResponses['gpt-4']['u1']).toBe('Hi there');
      expect(state.modelResponses['gpt-4']['u2']).toBe('I am fine');
      expect(state.isTyping).toBe(false);
    });

    it('defaults model name to athene-v2:latest when missing', async () => {
      mockChatService.getChatDetails.mockResolvedValue({
        chat: {
          messages: [
            { id: 'u1', role: 'user', content: 'Hi' },
            { id: 'a1', role: 'assistant', content: 'Hello' },
          ],
        },
      });

      await useChatStore.getState().setCurrentChatId('c1');
      expect(useChatStore.getState().modelResponses['athene-v2:latest']).toBeDefined();
    });

    it('handles error by setting isTyping false', async () => {
      mockChatService.getChatDetails.mockRejectedValue(new Error('fail'));

      await useChatStore.getState().setCurrentChatId('bad-id');
      expect(useChatStore.getState().isTyping).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('does nothing when isTyping is true', async () => {
      useChatStore.setState({ isTyping: true });

      await useChatStore.getState().sendMessage('hello');
      expect(mockChatService.createNewChat).not.toHaveBeenCalled();
    });

    it('does nothing when text is empty and no attachments', async () => {
      await useChatStore.getState().sendMessage('   ');
      expect(mockChatService.createNewChat).not.toHaveBeenCalled();
    });

    it('creates new chat if currentChatId is null', async () => {
      const mockES = {
        close: jest.fn(),
        addEventListener: jest.fn(),
      };
      mockChatService.createNewChat.mockResolvedValue({ id: 'new-chat-1' });
      mockChatService.streamCompletion.mockResolvedValue(mockES as any);

      await useChatStore.getState().sendMessage('Hello');

      expect(mockChatService.createNewChat).toHaveBeenCalled();
      expect(useChatStore.getState().currentChatId).toBe('new-chat-1');
    });

    it('uploads attachments before creating chat', async () => {
      const mockES = { close: jest.fn() };
      mockChatService.uploadFile.mockResolvedValue({ id: 'f1', url: 'http://file', name: 'photo.jpg' });
      mockChatService.createNewChat.mockResolvedValue({ id: 'c1' });
      mockChatService.streamCompletion.mockResolvedValue(mockES as any);

      useChatStore.setState({
        attachments: [{ type: 'image' as const, uri: 'file:///photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg' }],
      });

      await useChatStore.getState().sendMessage('See image');

      expect(mockChatService.uploadFile).toHaveBeenCalledWith('file:///photo.jpg', 'photo.jpg', 'image/jpeg');
      // Attachments should be cleared after sending
      expect(useChatStore.getState().attachments).toEqual([]);
    });

    it('handles upload errors gracefully', async () => {
      const mockES = { close: jest.fn() };
      mockChatService.uploadFile.mockRejectedValue(new Error('upload fail'));
      mockChatService.createNewChat.mockResolvedValue({ id: 'c1' });
      mockChatService.streamCompletion.mockResolvedValue(mockES as any);

      useChatStore.setState({
        attachments: [{ type: 'file' as const, uri: 'file:///doc.pdf', name: 'doc.pdf' }],
      });

      // Should not throw
      await useChatStore.getState().sendMessage('See file');
      expect(useChatStore.getState().currentChatId).toBe('c1');
    });

    it('builds content parts with uploaded files', async () => {
      const mockES = { close: jest.fn() };
      mockChatService.uploadFile.mockResolvedValue({ id: 'f1', url: 'http://img', name: 'img.jpg', type: 'image' });
      mockChatService.createNewChat.mockResolvedValue({ id: 'c1' });
      mockChatService.streamCompletion.mockResolvedValue(mockES as any);

      useChatStore.setState({
        attachments: [{ type: 'image' as const, uri: 'file:///img.jpg', name: 'img.jpg' }],
      });

      await useChatStore.getState().sendMessage('Check this');

      // userMessages should contain structured content (array)
      const msg = useChatStore.getState().userMessages[0];
      expect(Array.isArray(msg.content)).toBe(true);
    });

    it('uses existing chatId when one is set', async () => {
      const mockES = { close: jest.fn() };
      mockChatService.streamCompletion.mockResolvedValue(mockES as any);

      useChatStore.setState({ currentChatId: 'existing-chat' });

      await useChatStore.getState().sendMessage('Hello');

      expect(mockChatService.createNewChat).not.toHaveBeenCalled();
    });

    it('calls streamCompletion for each active model', async () => {
      const mockES = { close: jest.fn() };
      mockChatService.createNewChat.mockResolvedValue({ id: 'c1' });
      mockChatService.streamCompletion.mockResolvedValue(mockES as any);

      useChatStore.setState({ activeModels: ['model-a', 'model-b'] });

      await useChatStore.getState().sendMessage('Test');

      expect(mockChatService.streamCompletion).toHaveBeenCalledTimes(2);
    });

    it('accumulates chunks in modelResponses via onChunk callback', async () => {
      let capturedOnChunk: ((chunk: string, taskId?: string) => void) | null = null;
      const mockES = { close: jest.fn() };

      mockChatService.createNewChat.mockResolvedValue({ id: 'c1' });
      mockChatService.streamCompletion.mockImplementation(async (payload: any, onChunk: any) => {
        capturedOnChunk = onChunk;
        return mockES;
      });

      await useChatStore.getState().sendMessage('Hello');

      // Simulate chunks
      capturedOnChunk!('Hello ');
      capturedOnChunk!('World');

      const responses = useChatStore.getState().modelResponses;
      const modelName = useChatStore.getState().activeModels[0];
      const userMsgId = useChatStore.getState().userMessages[0].id;
      expect(responses[modelName][userMsgId]).toBe('Hello World');
    });

    it('tracks taskIds from stream chunks', async () => {
      let capturedOnChunk: ((chunk: string, taskId?: string) => void) | null = null;
      const mockES = { close: jest.fn() };

      mockChatService.createNewChat.mockResolvedValue({ id: 'c1' });
      mockChatService.streamCompletion.mockImplementation(async (_: any, onChunk: any) => {
        capturedOnChunk = onChunk;
        return mockES;
      });

      await useChatStore.getState().sendMessage('Hello');
      capturedOnChunk!('chunk', 'task-123');

      expect(useChatStore.getState().currentTaskIds).toContain('task-123');
    });

    it('handles stream error callback', async () => {
      let capturedOnError: ((err: any) => void) | null = null;
      const mockES = { close: jest.fn() };

      mockChatService.createNewChat.mockResolvedValue({ id: 'c1' });
      mockChatService.streamCompletion.mockImplementation(async (_: any, __: any, onError: any) => {
        capturedOnError = onError;
        return mockES;
      });

      await useChatStore.getState().sendMessage('Hello');
      capturedOnError!(new Error('stream failed'));

      // After last model stream errors, isTyping should be false
      expect(useChatStore.getState().isTyping).toBe(false);
    });

    it('persists chat and generates title on stream close', async () => {
      let capturedClose: (() => void) | null = null;
      const originalClose = jest.fn();

      mockChatService.createNewChat.mockResolvedValue({ id: 'c1' });
      mockChatService.streamCompletion.mockImplementation(async (_: any, onChunk: any) => {
        onChunk('Response content');
        const es = {
          close: originalClose,
        };
        return es;
      });
      mockChatService.updateChat.mockResolvedValue(undefined);
      mockChatService.chatCompleted.mockResolvedValue(undefined);
      mockChatService.generateTitle.mockResolvedValue('Generated Title');
      mockChatService.getHistory.mockResolvedValue([]);

      await useChatStore.getState().sendMessage('Hello');

      // The close function should have been replaced
      // Get the ES from store and call close
      const es = useChatStore.getState().currentEventSources[0];
      if (es && typeof es.close === 'function') {
        await es.close();
      }

      // Wait for async operations
      await new Promise(r => setTimeout(r, 50));

      expect(mockChatService.updateChat).toHaveBeenCalled();
      expect(mockChatService.chatCompleted).toHaveBeenCalled();
    });

    it('handles createNewChat failure gracefully', async () => {
      const mockES = { close: jest.fn() };
      mockChatService.createNewChat.mockRejectedValue(new Error('create failed'));
      mockChatService.streamCompletion.mockResolvedValue(mockES as any);

      await useChatStore.getState().sendMessage('Hello');

      // Should still have added the user message
      expect(useChatStore.getState().userMessages).toHaveLength(1);
    });
  });

  describe('stopGeneration', () => {
    it('sets _stopRequested and isTyping false', async () => {
      const mockES = { close: jest.fn() };
      useChatStore.setState({
        isTyping: true,
        currentEventSources: [mockES],
        currentTaskIds: ['t1'],
      });
      mockChatService.stopTask.mockResolvedValue(undefined);

      await useChatStore.getState().stopGeneration();

      expect(useChatStore.getState()._stopRequested).toBe(true);
      expect(useChatStore.getState().isTyping).toBe(false);
      expect(mockES.close).toHaveBeenCalled();
      expect(mockChatService.stopTask).toHaveBeenCalledWith('t1');
    });

    it('clears currentTaskIds and currentEventSources', async () => {
      useChatStore.setState({
        currentEventSources: [{ close: jest.fn() }],
        currentTaskIds: ['t1', 't2'],
      });
      mockChatService.stopTask.mockResolvedValue(undefined);

      await useChatStore.getState().stopGeneration();

      expect(useChatStore.getState().currentTaskIds).toEqual([]);
      expect(useChatStore.getState().currentEventSources).toEqual([]);
    });
  });

  describe('fetchArchivedChats', () => {
    it('calls getArchivedChats and sets archivedChats', async () => {
      const archived = [{ id: 'a1', title: 'Archived' }];
      mockChatService.getArchivedChats.mockResolvedValue(archived);
      await useChatStore.getState().fetchArchivedChats();
      expect(useChatStore.getState().archivedChats).toEqual(archived);
    });

    it('sets empty array on non-array response', async () => {
      mockChatService.getArchivedChats.mockResolvedValue('bad' as any);
      await useChatStore.getState().fetchArchivedChats();
      expect(useChatStore.getState().archivedChats).toEqual([]);
    });

    it('does not throw on error', async () => {
      mockChatService.getArchivedChats.mockRejectedValue(new Error('fail'));
      await expect(useChatStore.getState().fetchArchivedChats()).resolves.not.toThrow();
    });
  });

  describe('toggleArchiveChat', () => {
    it('calls toggleArchiveChat then refreshes both lists', async () => {
      mockChatService.toggleArchiveChat.mockResolvedValue(undefined);
      mockChatService.getArchivedChats.mockResolvedValue([]);
      mockChatService.getHistory.mockResolvedValue([]);
      await useChatStore.getState().toggleArchiveChat('c1');
      expect(mockChatService.toggleArchiveChat).toHaveBeenCalledWith('c1');
      expect(mockChatService.getArchivedChats).toHaveBeenCalled();
      expect(mockChatService.getHistory).toHaveBeenCalled();
    });

    it('does not throw on error', async () => {
      mockChatService.toggleArchiveChat.mockRejectedValue(new Error('fail'));
      await expect(useChatStore.getState().toggleArchiveChat('c1')).resolves.not.toThrow();
    });
  });

  describe('archiveAllChats', () => {
    it('calls archiveAllChats then refreshes', async () => {
      mockChatService.archiveAllChats.mockResolvedValue(undefined);
      mockChatService.getHistory.mockResolvedValue([]);
      mockChatService.getArchivedChats.mockResolvedValue([]);
      await useChatStore.getState().archiveAllChats();
      expect(mockChatService.archiveAllChats).toHaveBeenCalled();
    });

    it('does not throw on error', async () => {
      mockChatService.archiveAllChats.mockRejectedValue(new Error('fail'));
      await expect(useChatStore.getState().archiveAllChats()).resolves.not.toThrow();
    });
  });

  describe('unarchiveAllChats', () => {
    it('calls unarchiveAllChats then refreshes', async () => {
      mockChatService.unarchiveAllChats.mockResolvedValue(undefined);
      mockChatService.getHistory.mockResolvedValue([]);
      mockChatService.getArchivedChats.mockResolvedValue([]);
      await useChatStore.getState().unarchiveAllChats();
      expect(mockChatService.unarchiveAllChats).toHaveBeenCalled();
    });

    it('does not throw on error', async () => {
      mockChatService.unarchiveAllChats.mockRejectedValue(new Error('fail'));
      await expect(useChatStore.getState().unarchiveAllChats()).resolves.not.toThrow();
    });
  });

  describe('deleteAllChats', () => {
    it('calls deleteAllChats then refreshes', async () => {
      mockChatService.deleteAllChats.mockResolvedValue(undefined);
      mockChatService.getHistory.mockResolvedValue([]);
      mockChatService.getArchivedChats.mockResolvedValue([]);
      await useChatStore.getState().deleteAllChats();
      expect(mockChatService.deleteAllChats).toHaveBeenCalled();
    });

    it('does not throw on error', async () => {
      mockChatService.deleteAllChats.mockRejectedValue(new Error('fail'));
      await expect(useChatStore.getState().deleteAllChats()).resolves.not.toThrow();
    });
  });

  describe('regenerateResponse', () => {
    it('does nothing when isTyping', async () => {
      useChatStore.setState({ isTyping: true });
      await useChatStore.getState().regenerateResponse('u1');
      expect(mockChatService.streamCompletion).not.toHaveBeenCalled();
    });

    it('sets isTyping false when messageId not found', async () => {
      useChatStore.setState({
        userMessages: [{ id: 'u1', role: 'user', content: 'hi' }],
      });
      await useChatStore.getState().regenerateResponse('nonexistent');
      expect(useChatStore.getState().isTyping).toBe(false);
    });

    it('clears existing responses for the target message', async () => {
      const mockES = { close: jest.fn(), addEventListener: jest.fn() };
      mockChatService.streamCompletion.mockResolvedValue(mockES as any);

      useChatStore.setState({
        userMessages: [{ id: 'u1', role: 'user', content: 'hi' }],
        modelResponses: { 'athene-v2:latest': { 'u1': 'old response' } },
        activeModels: ['athene-v2:latest'],
        currentChatId: 'chat-1',
      });

      await useChatStore.getState().regenerateResponse('u1');

      // Response for u1 should be cleared before re-streaming
      expect(useChatStore.getState().modelResponses['athene-v2:latest']?.['u1']).toBeUndefined();
    });
  });

  describe('editAndResend', () => {
    it('truncates messages after edited message and updates content', async () => {
      useChatStore.setState({
        userMessages: [
          { id: 'u1', role: 'user', content: 'original' },
          { id: 'u2', role: 'user', content: 'second' },
        ],
        modelResponses: {
          'athene-v2:latest': { 'u1': 'resp1', 'u2': 'resp2' },
        },
        activeModels: ['athene-v2:latest'],
      });

      // Mock regenerateResponse to prevent actual streaming
      const mockES = { close: jest.fn(), addEventListener: jest.fn() };
      mockChatService.streamCompletion.mockResolvedValue(mockES as any);

      await useChatStore.getState().editAndResend('u1', 'edited content');

      const state = useChatStore.getState();
      // Should have truncated to just u1
      expect(state.userMessages).toHaveLength(1);
      expect(state.userMessages[0].content).toBe('edited content');
      // Responses for u1 should be cleared, u2 should be gone
      expect(state.modelResponses['athene-v2:latest']?.['u2']).toBeUndefined();
    });

    it('does nothing for non-existing messageId', async () => {
      useChatStore.setState({
        userMessages: [{ id: 'u1', role: 'user', content: 'hi' }],
      });

      await useChatStore.getState().editAndResend('nonexistent', 'new');

      expect(useChatStore.getState().userMessages).toHaveLength(1);
      expect(useChatStore.getState().userMessages[0].content).toBe('hi');
    });
  });
});
