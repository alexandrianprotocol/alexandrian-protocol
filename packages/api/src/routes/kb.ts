import { FastifyPluginAsync } from "fastify";
import { getKBByHash } from "../lib/graph.js";
import { fetchKBArtifact } from "../lib/ipfs.js";

export const kbRoute: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /kb/:hash
   *
   * Returns on-chain KB metadata plus the IPFS artifact if the gateway
   * is configured. Hash must be a 0x-prefixed keccak256 hex string.
   */
  fastify.get<{ Params: { hash: string }; Querystring: { artifact?: string } }>(
    "/:hash",
    async (req, reply) => {
      const { hash } = req.params;

      if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "hash must be a 0x-prefixed 32-byte hex string",
        });
      }

      const kb = await getKBByHash(hash).catch((err) => {
        req.log.error({ err }, "subgraph error");
        return null;
      });

      if (!kb) {
        return reply.code(404).send({ error: "Not Found", message: `KB ${hash} not found` });
      }

      // Optionally inline the IPFS artifact (default: true when CID present)
      const includeArtifact = req.query.artifact !== "false" && !!kb.cid;
      let artifact: Record<string, unknown> | null = null;

      if (includeArtifact) {
        artifact = await fetchKBArtifact(kb.cid, null).catch(() => null);
      }

      return reply.send({
        hash: kb.contentHash,
        domain: kb.domain,
        kbType: kb.kbType,
        trustTier: kb.trustTier,
        curator: kb.curator,
        queryFee: kb.queryFee,
        cid: kb.cid,
        embeddingCid: kb.embeddingCid,
        publishedAt: Number(kb.timestamp),
        blockNumber: Number(kb.blockNumber),
        reputation: {
          score: kb.reputationScore,
          queryVolume: kb.queryVolume,
        },
        parents: kb.parents,
        artifact: artifact ?? undefined,
      });
    }
  );
};
