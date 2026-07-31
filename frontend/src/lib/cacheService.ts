// High-Performance In-Memory API Cache & Request Deduplication Engine
export interface CacheOptions {
  ttlMs?: number; // Default 60,000ms (1 minute)
  forceRefresh?: boolean;
}

const memoryCache = new Map<string, { data: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Executes an async fetch function with in-memory caching and request deduplication.
 * Prevents multiple identical requests from firing simultaneously.
 */
export async function dedupeAndCacheFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const ttl = options.ttlMs ?? 60000;

  // 1. Return cached data if valid and not forcing refresh
  if (!options.forceRefresh && memoryCache.has(key)) {
    const cached = memoryCache.get(key)!;
    if (Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }
  }

  // 2. Return active in-flight Promise if request is already in progress
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }

  // 3. Execute request and cache result
  const requestPromise = (async () => {
    try {
      const data = await fetchFn();
      memoryCache.set(key, { data, timestamp: Date.now() });
      return data;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, requestPromise);
  return requestPromise;
}

/**
 * Invalidates a specific key or all keys matching a prefix in the cache.
 */
export function invalidateCache(keyPrefix?: string) {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
    }
  }
}
