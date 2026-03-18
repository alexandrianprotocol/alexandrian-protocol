/**
 * enhanceQuery — Alexandrian Protocol query enhancement.
 *
 * Selects the most relevant Knowledge Blocks for a question, fetches their
 * IPFS artifacts, and composes an enriched system prompt that gives any LLM
 * expert-level, attributed context before it answers.
 *
 * Flow:
 *   1. Discover top KBs by domain from the subgraph (via Redis cache first)
 *   2. Fetch each KB artifact from IPFS (with gateway fallback + timeout)
 *   3. Compose enriched system prompt from artifact content
 *   4. Return prompt + KB selection metadata + settlement preview
 *
 * The actual LLM call and on-chain settlement are the caller's responsibility.
 * enhanceQuery() is purely about KB selection and context injection.
 */

import type { CacheAdapter } from "@alexandrian/sdk-core";

// ── Types ─────────────────────────────────────────────────────────────────────

export type KBType =
  | "Practice"
  | "Feature"
  | "StateMachine"
  | "PromptEngineering"
  | "ComplianceChecklist"
  | "Rubric";

export interface EnhanceQueryOptions {
  /** Subgraph endpoint URL — defaults to Alexandrian mainnet subgraph. */
  subgraphUrl?: string;
  /** Domain filter — e.g. ["engineering.api.security"]. Queries all domains if omitted. */
  domains?: string[];
  /** KB type filter — applied client-side after subgraph fetch. */
  types?: KBType[];
  /** Maximum number of KBs to inject. Default: 4. */
  limit?: number;
  /** IPFS gateway URLs to try in order. Falls back to next on timeout/error. */
  ipfsGateways?: string[];
  /** Per-gateway fetch timeout in ms. Default: 5000. */
  timeoutMs?: number;
  /** Cache adapter for KB metadata (Redis in production, MemoryCache in dev). */
  cache?: CacheAdapter;
  /** Protocol fee in basis points. Default: 500 (5%). Must match on-chain value. */
  protocolFeeBps?: number;
}

export interface SelectedKB {
  contentHash: string;
  domain: string;
  kbType: string;
  cid: string;
  title: string;
  summary: string;
  reputationScore: number;
  queryFeeWei: string;
  royaltyBps: number;
}

export interface SettlementPreview {
  /** Total ETH that would be sent with settleQuery() for each KB. */
  perQueryFeeEth: Record<string, number>;
  /** Total ETH across all KBs used. */
  totalEth: number;
  protocolFeeBps: number;
  protocolFeeEth: number;
  distributableEth: number;
  distribution: Array<{
    contentHash: string;
    domain: string;
    royaltyBps: number;
    ethReceived: number;
  }>;
}

export interface EnhancedQuery {
  /** System prompt with KB context injected — pass directly to LLM. */
  enrichedPrompt: string;
  /** The KBs whose content was injected, in selection order. */
  kbsUsed: SelectedKB[];
  /** Economic preview of what settling these KBs would cost. */
  settlementPreview: SettlementPreview;
  /** True if the result was served from cache. */
  fromCache: boolean;
  /** Warnings (e.g. KB artifact fetch failed, using partial context). */
  warnings: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SUBGRAPH =
  "https://api.studio.thegraph.com/query/1742359/alexandrian-protocol/version/latest";

const DEFAULT_GATEWAYS = [
  "https://ipfs.io/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://gateway.pinata.cloud/ipfs",
];

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_LIMIT = 4;
const DEFAULT_PROTOCOL_FEE_BPS = 500; // 5%
const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const WEI_PER_ETH = 1e18;

// ── Subgraph query ────────────────────────────────────────────────────────────

const KB_DISCOVERY_QUERY = `
  query EnhanceQueryDiscover($domains: [String!]!, $limit: Int!) {
    knowledgeBlocks(
      first: $limit
      where: { domain_in: $domains, isSlashed: false }
      orderBy: reputationScore
      orderDirection: desc
    ) {
      contentHash
      domain
      kbType
      cid
      queryFee
      reputationScore
      royaltyConfig { royaltyBps }
    }
  }
`;

// Query without domain filter — used when no domains specified
const KB_DISCOVERY_QUERY_ALL = `
  query EnhanceQueryDiscoverAll($limit: Int!) {
    knowledgeBlocks(
      first: $limit
      where: { isSlashed: false }
      orderBy: reputationScore
      orderDirection: desc
    ) {
      contentHash
      domain
      kbType
      cid
      queryFee
      reputationScore
      royaltyConfig { royaltyBps }
    }
  }
`;

interface SubgraphKB {
  contentHash: string;
  domain: string;
  kbType: string;
  cid: string;
  queryFee: string;
  reputationScore: number;
  royaltyConfig?: { royaltyBps: number } | null;
}

async function querySubgraph(
  endpoint: string,
  domains?: string[],
  limit = 20
): Promise<SubgraphKB[]> {
  const hasDomains = domains && domains.length > 0;
  const body = hasDomains
    ? { query: KB_DISCOVERY_QUERY, variables: { domains, limit } }
    : { query: KB_DISCOVERY_QUERY_ALL, variables: { limit } };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Subgraph fetch failed: ${res.status}`);

  const json = (await res.json()) as {
    data?: { knowledgeBlocks: SubgraphKB[] };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(`Subgraph error: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  return json.data?.knowledgeBlocks ?? [];
}

// ── IPFS artifact fetch ───────────────────────────────────────────────────────

/** Artifact JSON structure (schemaVersion 2.5). */
interface KBArtifact {
  title?: string;
  summary?: string;
  kbType?: string;
  domain?: string;
  steps?: Array<{
    id: string;
    action: string;
    rationale?: string;
  }>;
  checklist?: Array<{
    item: string;
    severity?: string;
    rationale?: string;
  }>;
  capabilities?: string[];
  tags?: string[];
  [key: string]: unknown;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchArtifactFromIPFS(
  cid: string,
  gateways: string[],
  timeoutMs: number
): Promise<KBArtifact | null> {
  for (const gateway of gateways) {
    const url = `${gateway}/${cid}`;
    try {
      const res = await fetchWithTimeout(url, timeoutMs);
      if (!res.ok) continue;
      const json = (await res.json()) as KBArtifact;
      return json;
    } catch {
      // Try next gateway
    }
  }
  return null;
}

// ── Prompt composition ────────────────────────────────────────────────────────

const SECTION_DIVIDER = "═══════════════════════════════════════════════";

function formatSteps(
  steps: Array<{ id: string; action: string; rationale?: string }>
): string {
  return steps
    .map((s) => {
      const base = `${s.id}: ${s.action}`;
      return s.rationale ? `${base}\n  → ${s.rationale.slice(0, 180)}` : base;
    })
    .join("\n");
}

function formatChecklist(
  items: Array<{ item: string; severity?: string; rationale?: string }>
): string {
  return items
    .map((item, i) => {
      const severity = item.severity ? `[${item.severity.toUpperCase()}] ` : "";
      const base = `${severity}item_${i + 1}: ${item.item}`;
      return item.rationale ? `${base}\n  → ${item.rationale.slice(0, 180)}` : base;
    })
    .join("\n");
}

function formatArtifactSection(
  kb: SelectedKB,
  artifact: KBArtifact | null,
  index: number
): string {
  const id = `KB-${index + 1}`;
  const title = artifact?.title ?? kb.domain;
  const type = artifact?.kbType ?? kb.kbType;
  const domain = artifact?.domain ?? kb.domain;
  const summary = artifact?.summary ?? "";

  let content = "";

  if (artifact?.steps && artifact.steps.length > 0) {
    content = formatSteps(artifact.steps);
  } else if (artifact?.checklist && artifact.checklist.length > 0) {
    content = formatChecklist(artifact.checklist);
  } else if (summary) {
    content = summary;
  } else {
    content = "(artifact content unavailable — domain knowledge may be partial)";
  }

  return [
    SECTION_DIVIDER,
    `${id} · ${title} (${type})`,
    `Domain: ${domain}`,
    `Hash: ${kb.contentHash.slice(0, 18)}...`,
    SECTION_DIVIDER,
    content,
  ].join("\n");
}

function composeSystemPrompt(
  kbs: SelectedKB[],
  artifacts: Array<KBArtifact | null>
): string {
  const sections = kbs.map((kb, i) => formatArtifactSection(kb, artifacts[i] ?? null, i));

  return [
    "You are an expert assistant. Your responses are grounded exclusively in the following",
    `Knowledge Block${kbs.length > 1 ? "s" : ""} from the Alexandrian Protocol. Every`,
    "recommendation must reference the specific KB and step or checklist item it derives from.",
    "Do not answer from general knowledge if the KB procedures cover the question.",
    "",
    ...sections,
    "",
    SECTION_DIVIDER,
    "RESPONSE FORMAT",
    SECTION_DIVIDER,
    "Structure your response in clear sections. Cite KB IDs and step/item numbers inline.",
    "Be specific and actionable — not generic advice. Use markdown formatting.",
  ].join("\n");
}

// ── Settlement preview ────────────────────────────────────────────────────────

function buildSettlementPreview(
  kbs: SelectedKB[],
  protocolFeeBps: number
): SettlementPreview {
  const perQueryFeeEth: Record<string, number> = {};

  let totalEth = 0;
  for (const kb of kbs) {
    const feeEth = Number(kb.queryFeeWei) / WEI_PER_ETH;
    perQueryFeeEth[kb.contentHash] = feeEth;
    totalEth += feeEth;
  }

  const protocolFeeEth = totalEth * (protocolFeeBps / 10_000);
  const distributableEth = totalEth - protocolFeeEth;
  const perKB = kbs.length > 0 ? distributableEth / kbs.length : 0;

  const distribution = kbs.map((kb) => ({
    contentHash: kb.contentHash,
    domain: kb.domain,
    royaltyBps: kb.royaltyBps,
    ethReceived: Number(perKB.toFixed(8)),
  }));

  return {
    perQueryFeeEth,
    totalEth: Number(totalEth.toFixed(8)),
    protocolFeeBps,
    protocolFeeEth: Number(protocolFeeEth.toFixed(8)),
    distributableEth: Number(distributableEth.toFixed(8)),
    distribution,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * enhanceQuery — select relevant KBs and build an enriched system prompt.
 *
 * @param question   The user's raw question or agent intent string.
 * @param options    KB discovery, IPFS, and economic configuration.
 * @returns          Enriched prompt, KB metadata, settlement preview, warnings.
 *
 * @example
 * const enhanced = await enhanceQuery("How do I secure my login endpoint?", {
 *   domains: ["engineering.api.security"],
 *   subgraphUrl: MAINNET_SUBGRAPH_URL,
 *   cache: new MemoryCacheAdapter(),
 * });
 * // Pass enhanced.enrichedPrompt as the system message to your LLM call
 * // Then call settleQuery() for each kb in enhanced.kbsUsed
 */
export async function enhanceQuery(
  question: string,
  options: EnhanceQueryOptions = {}
): Promise<EnhancedQuery> {
  const {
    subgraphUrl = DEFAULT_SUBGRAPH,
    domains,
    types,
    limit = DEFAULT_LIMIT,
    ipfsGateways = DEFAULT_GATEWAYS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cache,
    protocolFeeBps = DEFAULT_PROTOCOL_FEE_BPS,
  } = options;

  const warnings: string[] = [];

  // ── 1. Cache key ────────────────────────────────────────────────────────────
  // The selection of KBs is determined by domains + types + limit, not by the
  // question itself — KB content doesn't change per-question.
  const cacheKey = `enhance:${(domains ?? []).sort().join(",")}:${(types ?? []).sort().join(",")}:${limit}`;

  // ── 2. Discover KBs (cache → subgraph) ─────────────────────────────────────
  let rawKBs: SubgraphKB[] | null = null;

  if (cache) {
    rawKBs = await cache.get<SubgraphKB[]>(cacheKey);
  }

  if (!rawKBs) {
    try {
      rawKBs = await querySubgraph(subgraphUrl, domains, limit * 3); // over-fetch for type filtering
      if (cache && rawKBs.length > 0) {
        await cache.set(cacheKey, rawKBs, CACHE_TTL_SECONDS);
      }
    } catch (err) {
      warnings.push(`Subgraph unavailable: ${(err as Error).message}. No KBs injected.`);
      rawKBs = [];
    }
  }

  // ── 3. Type filter + trim to limit ─────────────────────────────────────────
  let filtered = rawKBs;
  if (types && types.length > 0) {
    filtered = rawKBs.filter((kb) => types.includes(kb.kbType as KBType));
  }
  const selected = filtered.slice(0, limit);

  // Map to SelectedKB shape
  const kbsUsed: SelectedKB[] = selected.map((kb) => ({
    contentHash: kb.contentHash,
    domain: kb.domain,
    kbType: kb.kbType,
    cid: kb.cid,
    title: kb.domain, // will be overwritten from artifact if fetch succeeds
    summary: "",
    reputationScore: kb.reputationScore,
    queryFeeWei: kb.queryFee,
    royaltyBps: kb.royaltyConfig?.royaltyBps ?? 0,
  }));

  // ── 4. Fetch artifacts from IPFS ────────────────────────────────────────────
  const artifactPromises = kbsUsed.map(async (kb, i) => {
    if (!kb.cid) {
      warnings.push(`KB ${kb.contentHash.slice(0, 10)}... has no CID — skipping artifact fetch.`);
      return null;
    }
    const artifact = await fetchArtifactFromIPFS(kb.cid, ipfsGateways, timeoutMs);
    if (!artifact) {
      warnings.push(`Artifact fetch failed for CID ${kb.cid} — partial context for KB ${i + 1}.`);
      return null;
    }
    // Backfill title/summary from artifact
    if (artifact.title) kbsUsed[i]!.title = artifact.title;
    if (artifact.summary) kbsUsed[i]!.summary = artifact.summary;
    return artifact;
  });

  const artifacts = await Promise.all(artifactPromises);

  // ── 5. Compose enriched prompt ──────────────────────────────────────────────
  const enrichedPrompt =
    kbsUsed.length > 0
      ? composeSystemPrompt(kbsUsed, artifacts)
      : "You are an expert assistant. Answer the user's question as accurately as possible.";

  if (kbsUsed.length === 0) {
    warnings.push("No KBs found for the specified domains/types. Using generic system prompt.");
  }

  // ── 6. Settlement preview ────────────────────────────────────────────────────
  const settlementPreview = buildSettlementPreview(kbsUsed, protocolFeeBps);

  return {
    enrichedPrompt,
    kbsUsed,
    settlementPreview,
    fromCache: false,
    warnings,
  };
}
