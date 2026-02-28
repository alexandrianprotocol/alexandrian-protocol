export type IndexerAdapter = {
  getCanonicalHead(domain: string): Promise<{
    contentHash: string;
    blockNumber: number;
    logIndex: number;
    timestamp?: number;
  } | null>;
  getProofSnapshot(contentHash: string): Promise<unknown>;
};

export class TheGraphIndexerAdapter implements IndexerAdapter {
  constructor(private readonly endpoint: string) {}

  async getCanonicalHead(domain: string): Promise<{
    contentHash: string;
    blockNumber: number;
    logIndex: number;
    timestamp?: number;
  } | null> {
    const query = `
      query PoolHead($domain: String!, $limit: Int!) {
        knowledgeBlocks(
          first: $limit
          where: { domain: $domain }
          orderBy: blockNumber
          orderDirection: asc
        ) {
          contentHash
          blockNumber
          publishLogIndex
          timestamp
        }
      }
    `;
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { domain, limit: 1000 },
      }),
    });
    const json = (await res.json()) as {
      data?: { knowledgeBlocks: Array<{ contentHash: string; blockNumber: string; publishLogIndex?: number | null; timestamp?: string }> };
      errors?: Array<{ message: string }>;
    };
    if (json.errors?.length) {
      throw new Error(`Subgraph: ${json.errors.map((e) => e.message).join("; ")}`);
    }
    const blocks = json.data?.knowledgeBlocks ?? [];
    const withIndex = blocks.filter((b) => b.publishLogIndex != null);
    if (withIndex.length === 0) return null;
    // Select earliest by (blockNumber, logIndex)
    withIndex.sort((a, b) => {
      const bnA = Number(a.blockNumber);
      const bnB = Number(b.blockNumber);
      if (bnA !== bnB) return bnA - bnB;
      return Number(a.publishLogIndex ?? 0) - Number(b.publishLogIndex ?? 0);
    });
    const head = withIndex[0]!;
    return {
      contentHash: head.contentHash,
      blockNumber: Number(head.blockNumber),
      logIndex: Number(head.publishLogIndex ?? 0),
      timestamp: head.timestamp ? Number(head.timestamp) : undefined,
    };
  }

  async getProofSnapshot(_contentHash: string): Promise<unknown> {
    // TODO: implement subgraph query for proof snapshot.
    return null;
  }
}
