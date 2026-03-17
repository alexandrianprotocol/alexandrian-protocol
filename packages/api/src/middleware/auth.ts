import {
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from "fastify";

// ── Key registry ───────────────────────────────────────────────────────────

export type Tier = "free" | "pro" | "enterprise";

interface KeyRecord {
  tier: Tier;
}

/**
 * Parses API_KEYS env var.
 *
 * Simple format:  key1,key2,key3                → all assigned "free"
 * Tiered format:  key1:pro,key2:enterprise,key3  → per-key tier
 */
function buildKeyRegistry(): Map<string, KeyRecord> {
  const raw = (process.env.API_KEYS ?? "").trim();
  const registry = new Map<string, KeyRecord>();
  if (!raw) return registry;

  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const [key, tier] = trimmed.split(":");
    if (key) {
      registry.set(key, { tier: (tier as Tier) ?? "free" });
    }
  }
  return registry;
}

const KEY_REGISTRY = buildKeyRegistry();

// ── Helpers ───────────────────────────────────────────────────────────────

const SKIP_AUTH_PATHS = new Set(["/health"]);

function extractKey(req: FastifyRequest): string | undefined {
  const xApiKey = req.headers["x-api-key"];
  if (xApiKey) return Array.isArray(xApiKey) ? xApiKey[0] : xApiKey;

  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);

  return undefined;
}

// ── Plugin ────────────────────────────────────────────────────────────────

export const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("apiKey", "");
  fastify.decorateRequest("tier", "free");

  fastify.addHook(
    "onRequest",
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (SKIP_AUTH_PATHS.has(req.routerPath ?? req.url)) return;

      const key = extractKey(req);
      if (!key) {
        return reply.code(401).send({
          error: "Unauthorized",
          message: "Provide an API key via X-Api-Key header or Authorization: Bearer <key>",
        });
      }

      const record = KEY_REGISTRY.get(key);
      if (!record) {
        return reply.code(401).send({
          error: "Unauthorized",
          message: "Invalid API key",
        });
      }

      // Attach to request for downstream use
      (req as FastifyRequest & { apiKey: string; tier: Tier }).apiKey = key;
      (req as FastifyRequest & { apiKey: string; tier: Tier }).tier = record.tier;
    }
  );
};
