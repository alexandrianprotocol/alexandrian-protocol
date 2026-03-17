import { FastifyPluginAsync } from "fastify";
import { listKBsByDomain } from "../lib/graph.js";

export const domainRoute: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /domain/:domain
   *
   * Lists KBs in a domain, ordered by reputation score descending.
   * Supports sub-domain prefix matching (e.g. "software.security" returns
   * "software.security.cors", "software.security.csrf", etc.)
   *
   * Query params:
   *   page     — 1-based page number (default: 1)
   *   pageSize — results per page (default: 20, max: 100)
   */
  fastify.get<{
    Params: { domain: string };
    Querystring: { page?: string; pageSize?: string };
  }>("/:domain", async (req, reply) => {
    const { domain } = req.params;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));

    if (!domain || domain.length > 128) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "domain must be a non-empty string up to 128 characters",
      });
    }

    const { kbs, pageInfo } = await listKBsByDomain(domain, page, pageSize).catch((err) => {
      req.log.error({ err }, "subgraph error listing domain");
      throw err;
    });

    return reply.send({
      domain,
      page: pageInfo.page,
      pageSize: pageInfo.pageSize,
      hasMore: pageInfo.hasMore,
      count: kbs.length,
      kbs: kbs.map((kb) => ({
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
