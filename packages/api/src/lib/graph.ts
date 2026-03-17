/**
 * graph.ts — Subgraph query client for the Alexandrian KB graph.
 *
 * Reads from The Graph subgraph. All writes go through the protocol contract
 * directly (publishKB etc.) — this client is read-only.
 */

export interface KBRecord {
  contentHash: string;
  domain: string;
  kbType: string;
  trustTier: string;
  curator: string;
  queryFee: string;
  cid: string;
  embeddingCid: string;
  timestamp: string;
  blockNumber: string;
  queryVolume: number;
  reputationScore: number;
  parents: Array<{ parentHash: string; royaltyShareBps: number; relationship: string }>;
}

export interface PageInfo {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ── Internal ──────────────────────────────────────────────────────────────

const SUBGRAPH_URL = process.env.SUBGRAPH_URL ?? "";

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (!SUBGRAPH_URL) throw new Error("SUBGRAPH_URL is not configured");

  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Subgraph request failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(`Subgraph error: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  if (!json.data) throw new Error("Subgraph returned no data");
  return json.data;
}

// ── Shared fragment ────────────────────────────────────────────────────────

const KB_FIELDS = `
  contentHash
  domain
  kbType
  trustTier
  curator
  queryFee
  cid
  embeddingCid
  timestamp
  blockNumber
  queryVolume
  reputationScore
  parents {
    parentHash
    royaltyShareBps
    relationship
  }
`;

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch a single KB by its content hash.
 */
export async function getKBByHash(hash: string): Promise<KBRecord | null> {
  const data = await gql<{ knowledgeBlock: KBRecord | null }>(
    `query KB($hash: ID!) {
       knowledgeBlock(id: $hash) { ${KB_FIELDS} }
     }`,
    { hash: hash.toLowerCase() }
  );
  return data.knowledgeBlock;
}

/**
 * List KBs in a domain (supports sub-domain prefix matching).
 * Returns paginated results ordered by reputation descending.
 */
export async function listKBsByDomain(
  domain: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ kbs: KBRecord[]; pageInfo: PageInfo }> {
  const skip = (page - 1) * pageSize;

  const data = await gql<{
    knowledgeBlocks: KBRecord[];
    knowledgeBlocksCount: { count: number } | null;
  }>(
    `query Domain($domain: String!, $skip: Int!, $first: Int!) {
       knowledgeBlocks(
         where: { domain_starts_with: $domain }
         orderBy: reputationScore
         orderDirection: desc
         skip: $skip
         first: $first
       ) { ${KB_FIELDS} }
     }`,
    { domain, skip, first: pageSize }
  );

  const kbs = data.knowledgeBlocks ?? [];

  return {
    kbs,
    pageInfo: {
      total: -1, // subgraph doesn't return total count cheaply; use -1 as signal
      page,
      pageSize,
      hasMore: kbs.length === pageSize,
    },
  };
}

/**
 * Full-text search over KB titles and domains via subgraph fulltext index.
 * Falls back to domain_contains if fulltext index is not deployed.
 */
export async function searchKBs(
  query: string,
  domain?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ kbs: KBRecord[]; pageInfo: PageInfo }> {
  const skip = (page - 1) * pageSize;

  const whereClause = domain
    ? `{ domain_starts_with: $domain, domain_contains: $q }`
    : `{ domain_contains: $q }`;

  // Attempt simple substring match on domain; subgraph fulltext requires
  // a deployed fulltext index (add later when subgraph schema is updated).
  const data = await gql<{ knowledgeBlocks: KBRecord[] }>(
    `query Search($q: String!, $domain: String, $skip: Int!, $first: Int!) {
       knowledgeBlocks(
         where: ${whereClause}
         orderBy: reputationScore
         orderDirection: desc
         skip: $skip
         first: $first
       ) { ${KB_FIELDS} }
     }`,
    { q: query.toLowerCase(), domain: domain ?? "", skip, first: pageSize }
  );

  const kbs = data.knowledgeBlocks ?? [];
  return {
    kbs,
    pageInfo: { total: -1, page, pageSize, hasMore: kbs.length === pageSize },
  };
}
