import {
  buildConversation,
  getDisplayText,
  getImageUrls,
  buildModelItem,
  buildHistoryPayload,
  type Message,
} from '../../utils/messageHelpers';

describe('messageHelpers', () => {
  describe('getDisplayText', () => {
    it('returns string content as-is', () => {
      expect(getDisplayText('Hello world')).toBe('Hello world');
    });

    it('returns empty string for empty string', () => {
      expect(getDisplayText('')).toBe('');
    });

    it('extracts text from array of content parts', () => {
      const content = [
        { type: 'text', text: 'Hello' },
        { type: 'image_url', url: 'http://img' },
        { type: 'text', text: 'World' },
      ];
      expect(getDisplayText(content)).toBe('Hello\nWorld');
    });

    it('returns empty string for array with no text parts', () => {
      const content = [{ type: 'image_url', url: 'http://img' }];
      expect(getDisplayText(content)).toBe('');
    });

    it('converts other types to string', () => {
      expect(getDisplayText(42 as any)).toBe('42');
      expect(getDisplayText(null as any)).toBe('null');
    });
  });

  describe('getImageUrls', () => {
    it('returns empty array for string content', () => {
      expect(getImageUrls('Hello world')).toEqual([]);
    });

    it('extracts image URLs from content array', () => {
      const content = [
        { type: 'image_url', image_url: { url: 'https://example.com/img.jpg' } },
        { type: 'text', text: 'describe this' },
        { type: 'image_url', image_url: { url: '/files/abc123' } },
      ];
      expect(getImageUrls(content)).toEqual([
        'https://example.com/img.jpg',
        '/files/abc123',
      ]);
    });

    it('returns empty array when no image_url parts', () => {
      const content = [{ type: 'text', text: 'hello' }];
      expect(getImageUrls(content)).toEqual([]);
    });

    it('filters out entries with missing url', () => {
      const content = [
        { type: 'image_url', image_url: {} },
        { type: 'image_url', image_url: { url: 'valid.jpg' } },
      ];
      expect(getImageUrls(content)).toEqual(['valid.jpg']);
    });
  });

  describe('buildConversation', () => {
    it('returns empty array for empty messages', () => {
      const result = buildConversation([], {}, 'gpt-4');
      expect(result).toEqual([]);
    });

    it('builds conversation with user messages and model responses', () => {
      const userMessages: Message[] = [
        { id: 'u1', role: 'user', content: 'Hello' },
        { id: 'u2', role: 'user', content: 'How are you?' },
      ];
      const modelResponses: Record<string, string> = {
        u1: 'Hi there!',
        u2: 'I am fine.',
      };

      const result = buildConversation(userMessages, modelResponses, 'gpt-4');

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ id: 'u1', role: 'user', content: 'Hello' });
      expect(result[1]).toEqual({ id: 'gpt-4-u1', role: 'assistant', content: 'Hi there!' });
      expect(result[2]).toEqual({ id: 'u2', role: 'user', content: 'How are you?' });
      expect(result[3]).toEqual({ id: 'gpt-4-u2', role: 'assistant', content: 'I am fine.' });
    });

    it('includes user messages without responses', () => {
      const userMessages: Message[] = [
        { id: 'u1', role: 'user', content: 'Hello' },
        { id: 'u2', role: 'user', content: 'Again' },
      ];
      const modelResponses: Record<string, string> = {
        u1: 'Response',
        // u2 has no response
      };

      const result = buildConversation(userMessages, modelResponses, 'model');

      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
      expect(result[2].role).toBe('user');
      expect(result[2].content).toBe('Again');
    });
  });

  describe('buildModelItem', () => {
    it('builds model item with vision enabled', () => {
      const item = buildModelItem('gpt-4-vision', true);

      expect(item.id).toBe('gpt-4-vision');
      expect(item.name).toBe('gpt-4-vision');
      expect(item.object).toBe('model');
      expect(item.info.meta.capabilities.vision).toBe(true);
      expect(item.info.meta.capabilities.file_upload).toBe(true);
      expect(item.info.meta.capabilities.web_search).toBe(true);
    });

    it('builds model item with vision disabled', () => {
      const item = buildModelItem('llama', false);

      expect(item.id).toBe('llama');
      expect(item.info.meta.capabilities.vision).toBe(false);
    });

    it('includes all required fields', () => {
      const item = buildModelItem('test-model', false);

      expect(item).toHaveProperty('connection_type', 'local');
      expect(item).toHaveProperty('tags');
      expect(item).toHaveProperty('actions');
      expect(item).toHaveProperty('filters');
      expect(Array.isArray(item.tags)).toBe(true);
      expect(Array.isArray(item.actions)).toBe(true);
      expect(Array.isArray(item.filters)).toBe(true);
    });
  });

  describe('buildHistoryPayload', () => {
    it('returns empty payload for no messages', () => {
      const result = buildHistoryPayload([], {}, ['gpt-4'], new Map(), Date.now());

      expect(result.historyMessages).toEqual({});
      expect(result.messagesArray).toEqual([]);
      expect(result.lastMsgId).toBeNull();
    });

    it('builds payload with user messages and responses', () => {
      const userMessages: Message[] = [
        { id: 'u1', role: 'user', content: 'Hello' },
      ];
      const modelResponses = {
        'gpt-4': { u1: 'Hi there!' },
      };
      const stableIds = new Map<string, string>();
      stableIds.set('gpt-4::u1', 'a1');

      const result = buildHistoryPayload(
        userMessages,
        modelResponses,
        ['gpt-4'],
        stableIds,
        1000,
      );

      expect(result.historyMessages['u1']).toBeDefined();
      expect(result.historyMessages['u1'].role).toBe('user');
      expect(result.historyMessages['u1'].content).toBe('Hello');
      expect(result.historyMessages['u1'].childrenIds).toContain('a1');
      expect(result.historyMessages['u1'].parentId).toBeNull();

      expect(result.historyMessages['a1']).toBeDefined();
      expect(result.historyMessages['a1'].role).toBe('assistant');
      expect(result.historyMessages['a1'].content).toBe('Hi there!');
      expect(result.historyMessages['a1'].parentId).toBe('u1');
      expect(result.historyMessages['a1'].model).toBe('gpt-4');

      expect(result.lastMsgId).toBe('a1');
      expect(result.messagesArray).toHaveLength(2);
    });

    it('handles multiple user messages with chaining', () => {
      const userMessages: Message[] = [
        { id: 'u1', role: 'user', content: 'First' },
        { id: 'u2', role: 'user', content: 'Second' },
      ];
      const modelResponses = {
        'gpt-4': { u1: 'Reply 1', u2: 'Reply 2' },
      };
      const stableIds = new Map<string, string>();
      stableIds.set('gpt-4::u1', 'a1');
      stableIds.set('gpt-4::u2', 'a2');

      const result = buildHistoryPayload(
        userMessages,
        modelResponses,
        ['gpt-4'],
        stableIds,
        1000,
      );

      // u2's parentId should be a1 (the last assistant message)
      expect(result.historyMessages['u2'].parentId).toBe('a1');
      expect(result.lastMsgId).toBe('a2');
      expect(result.messagesArray).toHaveLength(4);
    });

    it('preserves non-string content as-is', () => {
      const userMessages: Message[] = [
        { id: 'u1', role: 'user', content: [{ type: 'text', text: 'hello' }] },
      ];

      const result = buildHistoryPayload(
        userMessages,
        {},
        ['gpt-4'],
        new Map(),
        1000,
      );

      expect(result.historyMessages['u1'].content).toEqual([{ type: 'text', text: 'hello' }]);
    });

    it('generates UUID when stableIds has no mapping', () => {
      const userMessages: Message[] = [
        { id: 'u1', role: 'user', content: 'Hi' },
      ];
      const modelResponses = {
        'gpt-4': { u1: 'Hello' },
      };

      const result = buildHistoryPayload(
        userMessages,
        modelResponses,
        ['gpt-4'],
        new Map(), // no stable IDs
        1000,
      );

      // Should still have an assistant message with a generated UUID
      const assistantIds = Object.keys(result.historyMessages).filter(k => k !== 'u1');
      expect(assistantIds).toHaveLength(1);
      expect(result.historyMessages[assistantIds[0]].role).toBe('assistant');
    });
  });
});
