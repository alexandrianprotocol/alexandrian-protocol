// ── Return types ─────────────────────────────────────────────────────────────

export type CanonicalHead = {
  contentHash: string;
  blockNumber: number;
  logIndex: number;
  timestamp?: number;
};

export type KBSummary = {
  id: string;
  contentHash: string;
  domain: string;
  settlementCount: string;
  totalSettledValue: string;
  uniquePayerCount: string;
  childCount: number;
  lineageDepth: number;
  lastSettledAt: string;
  reputationScore: number;
};

export type KBLineage = {
  id: string;
  contentHash: string;
  domain: string;
  lineageDepth: number;
  parents: Array<{ id: string; contentHash: string; domain: string; settlementCount: string }>;
  children: Array<{ id: string; contentHash: string; domain: string; settlementCount: string }>;
};

export type CuratorKB = {
  id: string;
  contentHash: string;
  domain: string;
  settlementCount: string;
  totalSettledValue: string;
  reputationScore: number;
  isSlashed: boolean;
};

// ── Interface ────────────────────────────────────────────────────────────────

export type IndexerAdapter = {
  /** Returns the earliest published KB in a domain (canonical head for pool resolution). */
  getCanonicalHead(domain: string): Promise<CanonicalHead | null>;

  /** Top KBs in a domain ordered by settlement count descending. */
  getTopKBsByDomain(domain: string, limit: number): Promise<KBSummary[]>;

  /** Top KBs globally ordered by total settled ETH value descending. */
  getSettlementRanking(limit: number): Promise<KBSummary[]>;

  /** Full lineage for a KB: its parents and children with depth and settlement data. */
  getKBLineage(contentHash: string): Promise<KBLineage | null>;

  /** KBs with the most derived children (cross-domain influence signal). */
  getCrossDomainReuse(limit: number): Promise<KBSummary[]>;

  /** All KBs published by a curator address with settlement signals. */
  getCuratorActivity(curatorAddress: string): Promise<CuratorKB[]>;
};

// ── Implementation ───────────────────────────────────────────────────────────

export class TheGraphIndexerAdapter implements IndexerAdapter {
  constructor(private readonly endpoint: string) {}

  // ── Internal fetch helper ─────────────────────────────────────────────────

  private async query<T>(
    gql: string,
    variables: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: gql, variables }),
    });
    const json = (await res.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
    };
    if (json.errors?.length) {
      throw new Error(`Subgraph: ${json.errors.map((e) => e.message).join("; ")}`);
    }
    return json.data as T;
  }

  // ── getCanonicalHead ──────────────────────────────────────────────────────
  // Returns the earliest published KB in a domain (by blockNumber + logIndex).
  // Used by SubgraphHeadSource for pool-head resolution.

  async getCanonicalHead(domain: string): Promise<CanonicalHead | null> {
    const gql = `
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
    type Data = {
      knowledgeBlocks: Array<{
        contentHash: string;
        blockNumber: string;
        publishLogIndex: string | null;
        timestamp: string;
      }>;
    };
    const data = await this.query<Data>(gql, { domain, limit: 1000 });
    const blocks = data.knowledgeBlocks ?? [];
    const withIndex = blocks.filter((b) => b.publishLogIndex != null);
    if (withIndex.length === 0) return null;

    withIndex.sort((a, b) => {
      const bnDiff = Number(a.blockNumber) - Number(b.blockNumber);
      if (bnDiff !== 0) return bnDiff;
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

  // ── getTopKBsByDomain ─────────────────────────────────────────────────────
  // Top KBs in a domain ranked by settlement activity.

  async getTopKBsByDomain(domain: string, limit: number): Promise<KBSummary[]> {
    const gql = `
      query TopKBsByDomain($domain: String!, $limit: Int!) {
        knowledgeBlocks(
          first: $limit
          where: { domain: $domain }
          orderBy: settlementCount
          orderDirection: desc
        ) {
          id
          contentHash
          domain
          settlementCount
          totalSettledValue
          uniquePayerCount
          childCount
          lineageDepth
          lastSettledAt
          reputationScore
        }
      }
    `;
    type Data = { knowledgeBlocks: KBSummary[] };
    const data = await this.query<Data>(gql, { domain, limit });
    return data.knowledgeBlocks ?? [];
  }

  // ── getSettlementRanking ──────────────────────────────────────────────────
  // Global top KBs by cumulative ETH settled — utility-weighted ranking.

  async getSettlementRanking(limit: number): Promise<KBSummary[]> {
    const gql = `
      query SettlementRanking($limit: Int!) {
        knowledgeBlocks(
          first: $limit
          orderBy: totalSettledValue
          orderDirection: desc
        ) {
          id
          contentHash
          domain
          settlementCount
          totalSettledValue
          uniquePayerCount
          childCount
          lineageDepth
          lastSettledAt
          reputationScore
        }
      }
    `;
    type Data = { knowledgeBlocks: KBSummary[] };
    const data = await this.query<Data>(gql, { limit });
    return data.knowledgeBlocks ?? [];
  }

  // ── getKBLineage ──────────────────────────────────────────────────────────
  // Full lineage for a single KB: parents (sources) + children (derivatives).

  async getKBLineage(contentHash: string): Promise<KBLineage | null> {
    const gql = `
      query KBLineage($id: ID!) {
        knowledgeBlock(id: $id) {
          id
          contentHash
          domain
          lineageDepth
          parents {
            parent {
              id
              contentHash
              domain
              settlementCount
            }
          }
          children {
            child {
              id
              contentHash
              domain
              settlementCount
            }
          }
        }
      }
    `;
    type Data = {
      knowledgeBlock: {
        id: string;
        contentHash: string;
        domain: string;
        lineageDepth: number;
        parents: Array<{
          parent: { id: string; contentHash: string; domain: string; settlementCount: string };
        }>;
        children: Array<{
          child: { id: string; contentHash: string; domain: string; settlementCount: string };
        }>;
      } | null;
    };
    const data = await this.query<Data>(gql, { id: contentHash.toLowerCase() });
    if (!data.knowledgeBlock) return null;

    const kb = data.knowledgeBlock;
    return {
      id: kb.id,
      contentHash: kb.contentHash,
      domain: kb.domain,
      lineageDepth: kb.lineageDepth,
      parents: kb.parents.map((e) => e.parent),
      children: kb.children.map((e) => e.child),
    };
  }

  // ── getCrossDomainReuse ───────────────────────────────────────────────────
  // KBs with the most derivatives — cross-domain influence leaders.

  async getCrossDomainReuse(limit: number): Promise<KBSummary[]> {
    const gql = `
      query CrossDomainReuse($limit: Int!) {
        knowledgeBlocks(
          first: $limit
          where: { childCount_gt: 0 }
          orderBy: childCount
          orderDirection: desc
        ) {
          id
          contentHash
          domain
          settlementCount
          totalSettledValue
          uniquePayerCount
          childCount
          lineageDepth
          lastSettledAt
          reputationScore
        }
      }
    `;
    type Data = { knowledgeBlocks: KBSummary[] };
    const data = await this.query<Data>(gql, { limit });
    return data.knowledgeBlocks ?? [];
  }

  // ── getCuratorActivity ────────────────────────────────────────────────────
  // All KBs published by a curator with settlement and reputation signals.

  async getCuratorActivity(curatorAddress: string): Promise<CuratorKB[]> {
    const gql = `
      query CuratorActivity($curator: Bytes!, $limit: Int!) {
        knowledgeBlocks(
          first: $limit
          where: { curator: $curator }
          orderBy: settlementCount
          orderDirection: desc
        ) {
          id
          contentHash
          domain
          settlementCount
          totalSettledValue
          reputationScore
          isSlashed
        }
      }
    `;
    type Data = { knowledgeBlocks: CuratorKB[] };
    const data = await this.query<Data>(gql, {
      curator: curatorAddress.toLowerCase(),
      limit: 1000,
    });
    return data.knowledgeBlocks ?? [];
  }

  // ── getProofSnapshot (stub) ───────────────────────────────────────────────

  async getProofSnapshot(_contentHash: string): Promise<unknown> {
    // TODO: implement subgraph query for proof snapshot (M2).
    return null;
  }
}
