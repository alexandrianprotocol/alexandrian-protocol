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
  | "Rubric"
  // ── Evaluation types (M2 off-chain semantic — stored in IPFS artifact kbType) ──
  | "BestPractice"
  | "AntiPattern"
  | "SecurityRule"
  | "AuditChecklist"
  | "CodePattern"
  | "ViolationExample";

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
  /**
   * Enable debug mode — adds a `debug` object to the return value with full
   * selection metadata: subgraph hit count, after-filter count, domain/type
   * queries used, and per-KB reputation scores.
   * Useful during M2 iteration to understand why specific KBs were selected.
   * @default false
   */
  debug?: boolean;
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

/**
 * Debug metadata returned when `options.debug = true`.
 * Use this during M2 iteration to understand KB selection, ranking, and scoring.
 */
export interface EnhanceDebugInfo {
  /** Total KBs returned by the subgraph before any filtering. */
  subgraphHits: number;
  /** KBs remaining after client-side type filter. */
  afterTypeFilter: number;
  /** Domains queried (null = cross-domain / all). */
  domainsQueried: string[] | null;
  /** Types requested (null = no type filter). */
  typesRequested: string[] | null;
  /** Per-KB score after type-priority boost, in selection order. */
  scores: Array<{ contentHash: string; kbType: string; reputationScore: number; boost: number; finalScore: number }>;
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
  /**
   * Total KBs the subgraph returned before slicing to `limit`.
   * Use to detect "no KBs available" (0) vs "many available" (large).
   */
  kbsFound: number;
  /**
   * Average on-chain reputation score of the selected KBs (0–1000).
   * Low values (<100) suggest the matched KBs are newly published with no
   * settlement history — results are less battle-tested.
   */
  avgReputationScore: number;
  /**
   * True when `avgReputationScore < 100` or `kbsFound < 2`.
   * Signals that the retrieval may be weak — consider widening domains,
   * removing type filters, or falling back to a vector retriever.
   */
  lowConfidence: boolean;
  /** Present only when `options.debug = true`. */
  debug?: EnhanceDebugInfo;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SUBGRAPH =
  "https://api.studio.thegraph.com/query/1742359/alexandrian-protocol/version/latest";

/**
 * M2 type-priority boost applied on top of on-chain reputationScore during selection.
 *
 * Temporary boost to surface execution-ready KB types during M2 bootstrapping,
 * when many KBs share similar (low) reputation scores.
 * Structured types that produce execution-ready output rank above generic content.
 *
 * Boost is additive: finalScore = reputationScore + boost.
 * A boost of 20 equals ~20 extra reputation points.
 */
const TYPE_SELECTION_BOOST: Record<string, number> = {
  Practice:            20,  // execution-ready steps
  ComplianceChecklist: 18,  // structured criteria
  SecurityRule:        18,  // high-value security criteria
  AuditChecklist:      16,  // audit coverage
  Rubric:              14,  // scoring dimensions
  Feature:             10,  // deployable spec
  BestPractice:        10,
  AntiPattern:          8,
  CodePattern:          8,
};

/**
 * Enforce minimum type composition in the selected KB set.
 *
 * Ensures that if a `Practice` KB is available in the pool, it's included
 * in the result even if its raw reputationScore wouldn't put it in the top N.
 * This guarantees every response has at least one execution-ready KB.
 *
 * Does NOT demote existing high-scoring KBs — only swaps the last slot if needed.
 */
function enforceMinComposition(
  ranked: SubgraphKB[],
  limit: number,
): SubgraphKB[] {
  if (ranked.length === 0) return ranked;

  const topN = ranked.slice(0, limit);

  // If there's already a Practice in the top N, we're done
  const hasPractice = topN.some((kb) => kb.kbType === "Practice");
  if (hasPractice || topN.length < limit) return topN;

  // Find the first Practice in the remaining pool and swap in at last slot
  const practiceIdx = ranked.findIndex(
    (kb, i) => i >= limit && kb.kbType === "Practice"
  );
  if (practiceIdx === -1) return topN;

  // Swap: replace last slot with the Practice KB
  return [...topN.slice(0, limit - 1), ranked[practiceIdx]!];
}

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
      settlementCount
      totalSettledValue
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
      settlementCount
      totalSettledValue
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
  settlementCount?: string;
  totalSettledValue?: string;
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

/**
 * Type-specific agent behavior hints injected into each KB section.
 * Tells the LLM HOW to reason with the KB — execute, compare, score, filter, etc.
 */
const TYPE_AGENT_BEHAVIOR: Record<string, string> = {
  // Core on-chain types
  Practice:            "Execute the steps procedurally. Follow each step in order.",
  Feature:             "Treat as a deployable specification. Map acceptance criteria to implementation.",
  StateMachine:        "Model transitions. Validate guards before executing side effects.",
  PromptEngineering:   "Apply the template. Substitute variables. Respect model compatibility.",
  ComplianceChecklist: "Verify each requirement. Flag CRITICAL/HIGH severity items first.",
  Rubric:              "Score each dimension against its criteria. Report pass/fail with evidence.",
  // M2 extended types (semantic; stored in IPFS artifact)
  CaseStudy:           "Compare the past case to the current situation. Adapt the strategy — don't copy blindly.",
  DecisionFramework:   "Evaluate each option against all criteria. Show the scoring. Recommend the winner.",
  RiskModel:           "Rank risks by probability × impact. Prioritise mitigations accordingly.",
  Experiment:          "Verify the hypothesis matches the result. Note confounds and next steps.",
  // Generator off-chain types
  procedure:           "Execute the steps procedurally. Follow each step in order.",
  pattern:             "Identify the pattern in the current context. Apply with appropriate adaptation.",
  heuristic:           "Check whether the stated condition holds. Apply the rule-of-thumb only if it does.",
  constraint:          "Filter options against the boundary. Reject any approach that violates it.",
  evaluation:          "Apply the criteria to the artifact under review. Report score with rationale.",
  // Evaluation KB types (M2 off-chain semantic)
  BestPractice:        "Compare the artifact against this standard. Identify deviations explicitly.",
  AntiPattern:         "Check whether this anti-pattern appears in the artifact. Flag every instance found.",
  SecurityRule:        "Scan the artifact for violations. Classify each finding by severity: CRITICAL / HIGH / MEDIUM / LOW.",
  AuditChecklist:      "Verify each checklist item against the artifact. Mark PASS / FAIL / WARNING with supporting evidence.",
  CodePattern:         "Check whether the artifact follows this pattern. Explain any gaps and how to close them.",
  ViolationExample:    "Compare the artifact to this violation example. Note any structural similarities or identical issues.",
};

function extractByType(type: string, artifact: KBArtifact): string | null {
  if (!artifact) return null;

  // For checklist-primary types, prefer checklist over steps even when both are present.
  // SecurityRule, AuditChecklist, AntiPattern, and ViolationExample all store their
  // criteria as checklist items — treat them accordingly.
  const preferChecklist =
    type === "ComplianceChecklist" || type === "Rubric"    || type === "checklist" ||
    type === "SecurityRule"        || type === "AuditChecklist" ||
    type === "AntiPattern"         || type === "ViolationExample";

  if (preferChecklist && artifact.checklist && (artifact.checklist as unknown[]).length > 0) {
    return formatChecklist(artifact.checklist as Array<{ item: string; severity?: string; rationale?: string }>);
  }

  // steps-based (Practice, procedure, protocol — and fallback for all other types)
  if (artifact.steps && (artifact.steps as unknown[]).length > 0) {
    return formatSteps(artifact.steps as Array<{ id: string; action: string; rationale?: string }>);
  }

  // Checklist fallback for non-checklist types that happen to have one
  if (artifact.checklist && (artifact.checklist as unknown[]).length > 0) {
    return formatChecklist(artifact.checklist as Array<{ item: string; severity?: string; rationale?: string }>);
  }

  return null;
}

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
      const sev = item.severity ? `[${item.severity.toUpperCase()}] ` : "";
      const base = `${sev}item_${i + 1}: ${item.item}`;
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
  const type = (artifact?.kbType ?? kb.kbType) as string;
  const domain = artifact?.domain ?? kb.domain;
  const summary = artifact?.summary ?? "";

  const behavior = TYPE_AGENT_BEHAVIOR[type] ?? "Use the content to ground your response.";
  const content =
    (artifact ? extractByType(type, artifact) : null) ??
    (summary || "(artifact content unavailable — domain knowledge may be partial)");

  return [
    SECTION_DIVIDER,
    `${id} · ${title} (${type})`,
    `Domain: ${domain}`,
    `Hash: ${kb.contentHash.slice(0, 18)}...`,
    `Agent: ${behavior}`,
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
    "Each KB section includes an 'Agent:' line — this is a type-specific instruction.",
    "Follow it exactly: it tells you HOW to reason with that KB (execute, compare, score, filter, etc.).",
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
    debug: debugMode = false,
  } = options;

  const warnings: string[] = [];

  // ── 1. Cache key ────────────────────────────────────────────────────────────
  // The selection of KBs is determined by domains + types + limit, not by the
  // question itself — KB content doesn't change per-question.
  const cacheKey = `enhance:${(domains ?? []).sort().join(",")}:${(types ?? []).sort().join(",")}:${limit}`;

  // ── 2. Discover KBs (cache → subgraph) ─────────────────────────────────────
  let rawKBs: SubgraphKB[] | null = null;
  let servedFromCache = false;

  if (cache) {
    rawKBs = await cache.get<SubgraphKB[]>(cacheKey);
    if (rawKBs) servedFromCache = true;
  }

  if (!rawKBs) {
    try {
      rawKBs = await querySubgraph(subgraphUrl, domains, limit * 3); // over-fetch for type filtering + boost ranking
      if (cache && rawKBs.length > 0) {
        await cache.set(cacheKey, rawKBs, CACHE_TTL_SECONDS);
      }
    } catch (err) {
      warnings.push(`Subgraph unavailable: ${(err as Error).message}. No KBs injected.`);
      rawKBs = [];
    }
  }

  const subgraphHits = rawKBs.length;

  // ── 3. Type filter ──────────────────────────────────────────────────────────
  let filtered = rawKBs;
  if (types && types.length > 0) {
    filtered = rawKBs.filter((kb) => types.includes(kb.kbType as KBType));
  }
  const afterTypeFilter = filtered.length;

  // ── 4. Type-priority boost re-ranking ───────────────────────────────────────
  // During M2, many KBs share similar (new, low) reputation scores.
  // The boost lifts execution-ready types (Practice, ComplianceChecklist, etc.)
  // above generic KBs when scores are close, ensuring structured output.
  const boostedScores = filtered.map((kb) => {
    const boost = TYPE_SELECTION_BOOST[kb.kbType] ?? 0;
    return { kb, boost, finalScore: kb.reputationScore + boost };
  });
  boostedScores.sort((a, b) => b.finalScore - a.finalScore);
  const ranked = boostedScores.map((x) => x.kb);

  // ── 5. Minimum composition + slice to limit ─────────────────────────────────
  const selected = enforceMinComposition(ranked, limit);

  // Map to SelectedKB shape
  const kbsUsed: SelectedKB[] = selected.map((kb) => ({
    contentHash: kb.contentHash,
    domain: kb.domain,
    kbType: kb.kbType,
    cid: kb.cid,
    title: kb.domain, // overwritten from artifact after IPFS fetch
    summary: "",
    reputationScore: kb.reputationScore,
    queryFeeWei: kb.queryFee,
    royaltyBps: 0, // backfilled from artifact.provenance.royalty_bps
  }));

  // ── 6. Fetch artifacts from IPFS ────────────────────────────────────────────
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
    // Backfill title/summary/royaltyBps from artifact
    if (artifact.title) kbsUsed[i]!.title = artifact.title;
    if (artifact.summary) kbsUsed[i]!.summary = artifact.summary;
    const royaltyBps = (artifact as { provenance?: { royalty_bps?: number } }).provenance?.royalty_bps;
    if (typeof royaltyBps === "number") kbsUsed[i]!.royaltyBps = royaltyBps;
    return artifact;
  });

  const artifacts = await Promise.all(artifactPromises);

  // ── 7. Compose enriched prompt ──────────────────────────────────────────────
  const enrichedPrompt =
    kbsUsed.length > 0
      ? composeSystemPrompt(kbsUsed, artifacts)
      : "You are an expert assistant. Answer the user's question as accurately as possible.";

  if (kbsUsed.length === 0) {
    warnings.push("No KBs found for the specified domains/types. Using generic system prompt.");
  }

  // ── 8. Compute health metrics ────────────────────────────────────────────────
  const avgReputationScore =
    kbsUsed.length > 0
      ? Math.round(kbsUsed.reduce((sum, kb) => sum + kb.reputationScore, 0) / kbsUsed.length)
      : 0;

  const lowConfidence = avgReputationScore < 100 || subgraphHits < 2;

  if (lowConfidence && kbsUsed.length > 0) {
    warnings.push(
      `Low confidence: avgReputationScore=${avgReputationScore}, kbsFound=${subgraphHits}. ` +
      "Consider widening domains or removing type filters."
    );
  }

  // ── 9. Settlement preview ────────────────────────────────────────────────────
  const settlementPreview = buildSettlementPreview(kbsUsed, protocolFeeBps);

  // ── 10. Debug info (only when requested) ─────────────────────────────────────
  const debugInfo: EnhanceDebugInfo | undefined = debugMode
    ? {
        subgraphHits,
        afterTypeFilter,
        domainsQueried: domains ?? null,
        typesRequested: types ?? null,
        scores: selected.map((kb) => {
          const boost = TYPE_SELECTION_BOOST[kb.kbType] ?? 0;
          return {
            contentHash: kb.contentHash,
            kbType: kb.kbType,
            reputationScore: kb.reputationScore,
            boost,
            finalScore: kb.reputationScore + boost,
          };
        }),
      }
    : undefined;

  return {
    enrichedPrompt,
    kbsUsed,
    settlementPreview,
    fromCache: servedFromCache,
    warnings,
    kbsFound: subgraphHits,
    avgReputationScore,
    lowConfidence,
    ...(debugInfo !== undefined ? { debug: debugInfo } : {}),
  };
}
