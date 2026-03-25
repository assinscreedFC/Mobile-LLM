import { getCached, setCache, invalidateCache, clearCache } from '../../utils/apiCache';

beforeEach(() => {
  clearCache();
  jest.spyOn(Date, 'now').mockRestore();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('apiCache', () => {
  describe('getCached', () => {
    it('returns null for missing key', () => {
      expect(getCached('nonexistent')).toBeNull();
    });

    it('returns null for expired key', () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      setCache('key1', { value: 42 }, 100);

      // Advance time past expiry
      jest.spyOn(Date, 'now').mockReturnValue(now + 200);
      expect(getCached('key1')).toBeNull();
    });

    it('returns data for valid (non-expired) key', () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      setCache('key1', { value: 42 }, 5000);

      // Still within TTL
      jest.spyOn(Date, 'now').mockReturnValue(now + 1000);
      expect(getCached('key1')).toEqual({ value: 42 });
    });
  });

  describe('setCache', () => {
    it('stores and retrieves data', () => {
      setCache('mykey', 'hello', 60000);
      expect(getCached('mykey')).toBe('hello');
    });

    it('overwrites existing key', () => {
      setCache('k', 'v1', 60000);
      setCache('k', 'v2', 60000);
      expect(getCached('k')).toBe('v2');
    });

    it('evicts oldest entry when at MAX_ENTRIES (50)', () => {
      // Fill cache to capacity
      for (let i = 0; i < 50; i++) {
        setCache(`key-${i}`, i, 60000);
      }

      // All 50 entries should be present
      expect(getCached('key-0')).toBe(0);
      expect(getCached('key-49')).toBe(49);

      // Adding one more should evict the oldest (key-0)
      setCache('key-50', 50, 60000);
      expect(getCached('key-0')).toBeNull();
      expect(getCached('key-50')).toBe(50);
    });

    it('does not evict when updating an existing key at capacity', () => {
      for (let i = 0; i < 50; i++) {
        setCache(`key-${i}`, i, 60000);
      }

      // Update existing key — should NOT evict
      setCache('key-0', 'updated', 60000);
      expect(getCached('key-0')).toBe('updated');
      expect(getCached('key-1')).toBe(1);
    });
  });

  describe('invalidateCache', () => {
    it('removes entries matching pattern', () => {
      setCache('/chats/1', 'a', 60000);
      setCache('/chats/2', 'b', 60000);
      setCache('/models', 'c', 60000);

      invalidateCache('/chats');

      expect(getCached('/chats/1')).toBeNull();
      expect(getCached('/chats/2')).toBeNull();
      expect(getCached('/models')).toBe('c');
    });

    it('does nothing when no keys match', () => {
      setCache('key1', 'val', 60000);
      invalidateCache('nonexistent');
      expect(getCached('key1')).toBe('val');
    });
  });

  describe('clearCache', () => {
    it('removes all entries', () => {
      setCache('a', 1, 60000);
      setCache('b', 2, 60000);

      clearCache();

      expect(getCached('a')).toBeNull();
      expect(getCached('b')).toBeNull();
    });
  });
});
