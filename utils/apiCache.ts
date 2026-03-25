/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

interface CacheEntry {
  data: unknown;
  expiry: number;
}

const MAX_ENTRIES = 50;
const cache = new Map<string, CacheEntry>();

export function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key: string, data: unknown, ttlMs: number): void {
  // LRU eviction if at capacity
  if (cache.size >= MAX_ENTRIES && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

export function invalidateCache(pattern: string): void {
  for (const key of [...cache.keys()]) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

export function clearCache(): void {
  cache.clear();
}
