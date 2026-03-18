/**
 * UpstashCacheAdapter — serverless-compatible Redis cache via Upstash REST API.
 *
 * Uses Upstash's HTTP-based Redis API — no native TCP socket required.
 * Works in Vercel serverless functions, Cloudflare Workers, and any
 * environment that supports fetch().
 *
 * Setup:
 *   1. Create a Redis database at https://console.upstash.com
 *   2. Copy the REST URL and REST token
 *   3. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
 *
 * @example
 * const cache = UpstashCacheAdapter.fromEnv();
 * const enhanced = await enhanceQuery(question, { cache, domains: [...] });
 */

import type { CacheAdapter } from "../enhanceQuery.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UpstashResponse<T = unknown> {
  result: T;
  error?: string;
}

// ── Implementation ────────────────────────────────────────────────────────────

export class UpstashCacheAdapter implements CacheAdapter {
  constructor(
    private readonly restUrl: string,
    private readonly restToken: string
  ) {}

  // ── Factory ────────────────────────────────────────────────────────────────

  /**
   * Build from environment variables.
   * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
   * Returns null if either variable is missing (safe — callers can skip cache).
   */
  static fromEnv(): UpstashCacheAdapter | null {
    const url = process.env["UPSTASH_REDIS_REST_URL"];
    const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
    if (!url || !token) return null;
    return new UpstashCacheAdapter(url, token);
  }

  // ── Internal fetch ─────────────────────────────────────────────────────────

  private async command<T>(commands: (string | number)[]): Promise<T> {
    const url = `${this.restUrl}/${commands.map(encodeURIComponent).join("/")}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.restToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Upstash HTTP error: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as UpstashResponse<T>;
    if (json.error) {
      throw new Error(`Upstash Redis error: ${json.error}`);
    }
    return json.result;
  }

  // ── CacheAdapter interface ─────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.command<string | null>(["GET", key]);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      // Cache miss / parse error — treat as miss, never throw
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds !== undefined) {
        // SET key value EX ttl
        await this.command(["SET", key, serialized, "EX", ttlSeconds]);
      } else {
        await this.command(["SET", key, serialized]);
      }
    } catch {
      // Cache write failure is non-fatal — log and continue
      console.warn(`[UpstashCacheAdapter] set(${key}) failed — continuing without cache`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.command(["DEL", key]);
    } catch {
      // Non-fatal
    }
  }
}

// ── Key builders — shared conventions across the pipeline ─────────────────────

/** KB metadata keyed by contentHash. TTL: 24h. */
export const kbMetaKey = (contentHash: string) => `kb:meta:${contentHash.toLowerCase()}`;

/** Top KBs in a domain, ordered by reputation. TTL: 1h. */
export const domainKey = (domain: string) => `domain:top:${domain}`;

/** Top KBs in a domain filtered by type. TTL: 1h. */
export const domainTypeKey = (domain: string, kbType: string) =>
  `domain:top:${domain}:type:${kbType}`;

/** enhanceQuery selection result for a given options hash. TTL: 24h. */
export const enhanceCacheKey = (domains: string[], types: string[], limit: number) =>
  `enhance:${[...domains].sort().join(",")}:${[...types].sort().join(",")}:${limit}`;
