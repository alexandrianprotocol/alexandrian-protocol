/**
 * CacheAdapter — generic async key/value cache interface.
 *
 * sdk-core ships a MemoryCacheAdapter for testing and development.
 * Production implementations (Upstash Redis, etc.) live in sdk-adapters
 * and conform to this interface so enhanceQuery() stays dependency-free.
 */

// ── Interface ─────────────────────────────────────────────────────────────────

export interface CacheAdapter {
  /** Retrieve a cached value. Returns null on miss or expiry. */
  get<T>(key: string): Promise<T | null>;

  /** Store a value with an optional TTL in seconds. */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /** Remove a key from the cache. No-op if the key does not exist. */
  del(key: string): Promise<void>;
}

// ── In-memory implementation ──────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt?: number; // ms timestamp
}

/**
 * MemoryCacheAdapter — process-local Map-backed cache.
 *
 * Suitable for: unit tests, local development, single-process Vercel
 * serverless instances (warm-instance reuse).
 * Not suitable for: distributed deployments where consistency across
 * instances is required — use UpstashCacheAdapter in that case.
 *
 * Max-size eviction: when the store reaches `maxEntries`, the oldest
 * inserted key is evicted before any new write (insertion-order FIFO).
 */
export class MemoryCacheAdapter implements CacheAdapter {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    // Evict oldest entry if at capacity
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /** Visible for testing — number of entries currently stored. */
  get size(): number {
    return this.store.size;
  }

  /** Visible for testing — flush all entries. */
  clear(): void {
    this.store.clear();
  }
}
