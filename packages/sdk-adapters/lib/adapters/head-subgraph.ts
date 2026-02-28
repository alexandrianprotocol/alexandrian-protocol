import type { HeadSource } from "./types.js";
import type { PoolHead } from "../pools.js";
import type { IndexerAdapter } from "./indexer.js";

export class SubgraphHeadSource implements HeadSource {
  constructor(
    private readonly config: {
      indexer: IndexerAdapter;
      fallback?: HeadSource;
    }
  ) {}

  async getCanonicalHead(poolId: string): Promise<PoolHead | null> {
    try {
      const head = await this.config.indexer.getCanonicalHead(poolId);
      if (!head) return null;
      return {
        poolId,
        versionId: head.contentHash,
        contentHash: head.contentHash,
        finalized: true,
        stakeTotal: 0n,
        timestamp: head.timestamp ?? 0,
      };
    } catch {
      if (this.config.fallback) return this.config.fallback.getCanonicalHead(poolId);
      throw new Error("Subgraph head resolution failed");
    }
  }
}
