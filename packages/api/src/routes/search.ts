import { FastifyPluginAsync } from "fastify";
import { searchKBs } from "../lib/graph.js";

export const searchRoute: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /search
   *
   * Search KBs by query string. Matches against domain names (substring).
   * When the subgraph fulltext index is deployed this will be upgraded to
   * proper text search over title and summary fields.
   *
   * Query params:
   *   q        — search term (required)
   *   domain   — optional domain prefix filter (e.g. "software.security")
   *   page     — 1-based page number (default: 1)
   *   pageSize — results per page (default: 20, max: 100)
   */
  fastify.get<{
    Querystring: { q?: string; domain?: string; page?: string; pageSize?: string };
  }>("/", async (req, reply) => {
    const { q, domain } = req.query;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));

    if (!q || q.trim().length < 2) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "q must be at least 2 characters",
      });
    }

    const { kbs, pageInfo } = await searchKBs(q.trim(), domain, page, pageSize).catch(
      (err) => {
        req.log.error({ err }, "subgraph error during search");
        throw err;
      }
    );

    return reply.send({
      query: q.trim(),
      domain: domain ?? null,
      page: pageInfo.page,
      pageSize: pageInfo.pageSize,
      hasMore: pageInfo.hasMore,
      count: kbs.length,
      results: kbs.map((kb) => ({
        hash: kb.contentHash,
        domain: kb.domain,
        kbType: kb.kbType,
        trustTier: kb.trustTier,
        curator: kb.curator,
        cid: kb.cid,
        publishedAt: Number(kb.timestamp),
        reputation: {
          score: kb.reputationScore,
          queryVolume: kb.queryVolume,
        },
      })),
    });
  });
};
