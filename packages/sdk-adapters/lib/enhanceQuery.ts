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
  | "ViolationExample"
  // ── Planning & orchestration (M2) ───────────────────────────────────────────
  | "TaskDecomposition"
  | "AgentRole";

/**
 * Controls how the enriched prompt is structured.
 *
 * - `"steps"`      — ordered execution steps; ideal for "how do I…" and command queries.
 * - `"checklist"`  — criteria-first; ideal for audits, reviews, and compliance checks.
 * - `"comparison"` — side-by-side against a standard; ideal for rubric/best-practice queries.
 * - `"framework"`  — high-level decision structure; ideal for architecture and design queries.
 * - `"auto"`       — (default) inferred from query intent: command verbs → steps, everything else → framework.
 */
export type OutputMode = "steps" | "checklist" | "comparison" | "framework" | "auto";

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
   * Output mode — controls how the enriched prompt is structured.
   * `"auto"` (default) detects command-intent queries and switches to `"steps"` automatically.
   */
  outputMode?: OutputMode;
  /**
   * Enable debug mode — adds a `debug` object to the return value with full
   * selection metadata: subgraph hit count, after-filter count, domain/type
   * queries used, and per-KB reputation scores.
   * Useful during M2 iteration to understand why specific KBs were selected.
   * @default false
   */
  debug?: boolean;
  /**
   * Enable deterministic mode — applies a stable secondary sort (contentHash tiebreaker)
   * so the same domains/types/limit always yield the same KB set and order.
   * Adds a determinism notice to the enriched prompt header.
   * @default false
   */
  deterministicMode?: boolean;
}

/** A potential conflict between directive KBs with diverging recommendations. */
export interface ConflictHint {
  /** KB position labels involved (e.g. ["KB-1", "KB-3"]). */
  kbIds: string[];
  /** The kbType that appears multiple times. */
  kbType: string;
  /** Human-readable note explaining the potential conflict. */
  note: string;
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
  /**
   * One-line explanation of why this KB was selected.
   * E.g. "Matched 'rate limiting' + priority type (Practice) + high reputation"
   */
  retrievalReason: string;
  /** Unix timestamp (seconds) of the block when this KB was published. */
  publishedAt?: number;
  /**
   * Trust signal derived from on-chain stake amount.
   * "staked" = publisher locked ETH (HumanStaked proxy).
   * "unstaked" = zero-stake bootstrap / agent-published.
   */
  trustSignal?: "staked" | "unstaked";
  /** Parent KB IDs from the lineage DAG (contentHash hex strings). */
  parents?: string[];
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
  /**
   * Resolved output mode after intent detection.
   * When `options.outputMode` is `"auto"` (default), this reflects whether
   * command intent was detected (→ `"steps"`) or not (→ `"framework"`).
   */
  outputMode: Exclude<OutputMode, "auto">;
  /**
   * True when the query was classified as a command-intent query
   * (starts with an imperative verb like "implement", "fix", "build", etc.).
   * Command-intent queries get boosted Practice + CodePattern selection
   * and a steps-first prompt structure.
   */
  commandIntent: boolean;
  /**
   * KB coverage quality based on result set size, reputation, and type diversity.
   * - "high": 5+ KBs found, avg reputation ≥150, 2+ distinct types.
   * - "medium": 2+ KBs found, avg reputation ≥30.
   * - "low": sparse results or very new KB set.
   */
  coverage: "high" | "medium" | "low";
  /**
   * The effective retrieval query — shows inferred domains, type filters, and
   * detected intent. Useful for surfacing in UI ("Enhanced Query: ...").
   */
  enhancedQuery: string;
  /**
   * Suggested follow-up queries derived from the KB types and output mode used.
   * Present 1–3 as "What to explore next" in your UI.
   */
  suggestions: string[];
  /**
   * Potential KB conflicts: 2+ directive KBs of the same type from different
   * domains that may give diverging recommendations. Empty when none detected.
   */
  conflicts: ConflictHint[];
  /** Present only when `options.debug = true`. */
  debug?: EnhanceDebugInfo;
}

// ── Intent detection ──────────────────────────────────────────────────────────

/**
 * Command-intent verb prefixes that signal "tell me HOW to do this".
 * These queries benefit most from step-by-step Practice KBs.
 */
const COMMAND_VERB_PREFIXES = [
  "how do i", "how to", "how can i",
  "implement", "write", "build", "create", "add",
  "fix", "debug", "solve", "resolve",
  "refactor", "optimize", "improve", "migrate",
  "set up", "setup", "configure", "deploy",
  "make", "generate", "design",
];

/**
 * Detect command-intent from query text.
 * Returns true when the query starts with an imperative verb or a "how to" phrase.
 */
function detectCommandIntent(query: string): boolean {
  const q = query.toLowerCase().trimStart();
  return COMMAND_VERB_PREFIXES.some((prefix) => q.startsWith(prefix));
}

/**
 * Resolve the effective output mode given the query intent.
 */
function resolveOutputMode(
  mode: OutputMode,
  commandIntent: boolean,
): Exclude<OutputMode, "auto"> {
  if (mode !== "auto") return mode;
  return commandIntent ? "steps" : "framework";
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SUBGRAPH =
  "https://api.studio.thegraph.com/query/1742359/alexandrian-protocol/version/latest";

/**
 * Base type-priority boost applied on top of on-chain reputationScore during selection.
 *
 * Temporary boost to surface execution-ready KB types during M2 bootstrapping,
 * when many KBs share similar (low) reputation scores.
 * Structured types that produce execution-ready output rank above generic content.
 *
 * Boost is additive: finalScore = reputationScore + baseBoost + commandBoost.
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
 * Additional boost applied on top of `TYPE_SELECTION_BOOST` when command intent is detected.
 * Ensures "how do I / implement / fix / build" queries always surface execution-ready KBs.
 */
const COMMAND_INTENT_BOOST: Record<string, number> = {
  Practice:    30,  // step-by-step execution — highest priority for command queries
  CodePattern: 25,  // concrete implementation pattern
  Feature:     15,  // deployable specification
};

/**
 * Enforce minimum type composition in the selected KB set.
 *
 * Rules:
 * - Always: if a `Practice` KB is in the pool but not top-N, swap in at last slot.
 * - commandMode=true: also ensure at least one `CodePattern` or `Feature` is present
 *   (swap in at second-to-last slot if limit > 2 and neither type is already selected).
 *
 * Does NOT demote existing high-scoring KBs — only swaps the last 1–2 slots if needed.
 */
function enforceMinComposition(
  ranked: SubgraphKB[],
  limit: number,
  commandMode = false,
): SubgraphKB[] {
  if (ranked.length === 0) return ranked;

  let result = ranked.slice(0, limit);

  // ── Rule 1: guarantee at least one Practice ──────────────────────────────
  const hasPractice = result.some((kb) => kb.kbType === "Practice");
  if (!hasPractice && result.length >= limit) {
    const practiceIdx = ranked.findIndex((kb, i) => i >= limit && kb.kbType === "Practice");
    if (practiceIdx !== -1) {
      result = [...result.slice(0, limit - 1), ranked[practiceIdx]!];
    }
  }

  // ── Rule 2 (commandMode): also guarantee CodePattern or Feature ───────────
  if (commandMode && limit > 2) {
    const hasExecType = result.some(
      (kb) => kb.kbType === "CodePattern" || kb.kbType === "Feature"
    );
    if (!hasExecType) {
      const execIdx = ranked.findIndex(
        (kb, i) => i >= limit && (kb.kbType === "CodePattern" || kb.kbType === "Feature")
      );
      if (execIdx !== -1) {
        // Swap second-to-last slot (last is already reserved for Practice guarantee)
        result = [
          ...result.slice(0, limit - 2),
          ranked[execIdx]!,
          result[result.length - 1]!,
        ];
      }
    }
  }

  return result;
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
      timestamp
      stakeAmount
      uniquePayerCount
      parents {
        parent {
          id
        }
      }
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
      timestamp
      stakeAmount
      uniquePayerCount
      parents {
        parent {
          id
        }
      }
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
  timestamp?: string;         // BigInt — unix seconds at publish time
  stakeAmount?: string;       // BigInt — 0 = zero-stake bootstrap
  uniquePayerCount?: string;  // BigInt — unique consumer count (usage strength)
  parents?: Array<{ parent: { id: string } }>; // lineage DAG edges
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

/** Artifact JSON structure (schemaVersion 2.5 / 2.6). */
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

  const trustBadge = kb.trustSignal === "staked" ? " [staked]" : kb.trustSignal === "unstaked" ? " [unstaked]" : "";
  const behavior = TYPE_AGENT_BEHAVIOR[type] ?? "Use the content to ground your response.";
  const content =
    (artifact ? extractByType(type, artifact) : null) ??
    (summary || "(artifact content unavailable — domain knowledge may be partial)");

  const lines = [
    SECTION_DIVIDER,
    `${id} · ${title} (${type})${trustBadge}`,
    `Domain: ${domain}`,
    `Hash: ${kb.contentHash.slice(0, 18)}... | Retrieved: ${kb.retrievalReason}`,
  ];

  if (kb.parents && kb.parents.length > 0) {
    lines.push(`Builds on: ${kb.parents.length} parent KB${kb.parents.length > 1 ? "s" : ""} (lineage depth ${kb.parents.length})`);
  }

  lines.push(`Agent: ${behavior}`, SECTION_DIVIDER, content);

  return lines.join("\n");
}

/** Output-mode-specific prompt contracts injected after the KB sections. */
const OUTPUT_MODE_CONTRACT: Record<Exclude<OutputMode, "auto">, string[]> = {
  steps: [
    "RESPONSE CONTRACT",
    "─────────────────",
    "1. Lead with a numbered step list derived directly from the Practice or CodePattern KBs above.",
    "2. Every step MUST cite its source KB and step ID (e.g. KB-1, step s3).",
    "3. Include a working code snippet for any step that involves code.",
    "4. End with a one-line 'What to do next' — the single most important follow-up action.",
    "DO NOT provide generic advice not grounded in the KBs above.",
    "DO NOT skip the code snippet if the KB has one.",
  ],
  checklist: [
    "RESPONSE CONTRACT",
    "─────────────────",
    "1. Output a markdown checklist — each item maps to a checklist item from the KBs above.",
    "2. Format: `- [ ] [SEVERITY] Item description (KB-N, item_X)`",
    "3. Group by severity: CRITICAL → HIGH → MEDIUM → LOW.",
    "4. For every CRITICAL or HIGH item: add a one-line remediation.",
    "5. End with a risk summary: N critical, M high, K medium, J low issues found.",
    "DO NOT add items not present in the KBs above.",
  ],
  comparison: [
    "RESPONSE CONTRACT",
    "─────────────────",
    "1. For each Rubric or BestPractice KB: evaluate the artifact against each dimension.",
    "2. Format: `### [Dimension] — PASS / FAIL / PARTIAL` followed by supporting evidence.",
    "3. Include a score tally: X/Y dimensions passed.",
    "4. End with a prioritised improvement list (most impactful first).",
    "DO NOT give a verdict without citing the specific KB criterion it maps to.",
  ],
  framework: [
    "RESPONSE CONTRACT",
    "─────────────────",
    "1. Structure your response as: Context → Options → Recommendation → Trade-offs.",
    "2. Every claim MUST be grounded in a specific KB (cite KB-N inline).",
    "3. If the KBs contain a decision framework or state machine: apply it explicitly.",
    "4. End with a concrete 'Start here' — one action the reader can take immediately.",
    "DO NOT answer from general knowledge when the KBs cover the topic.",
  ],
};

function composeSystemPrompt(
  kbs: SelectedKB[],
  artifacts: Array<KBArtifact | null>,
  outputMode: Exclude<OutputMode, "auto"> = "framework",
): string {
  const sections = kbs.map((kb, i) => formatArtifactSection(kb, artifacts[i] ?? null, i));
  const contract = OUTPUT_MODE_CONTRACT[outputMode];

  return [
    "You are an expert system. Your responses are grounded exclusively in the following",
    `Knowledge Block${kbs.length > 1 ? "s" : ""} from the Alexandrian Protocol.`,
    "Each KB section includes an 'Agent:' instruction — follow it exactly.",
    "It tells you HOW to reason with that KB: execute steps, verify criteria, score dimensions, or apply a framework.",
    "",
    ...sections,
    "",
    SECTION_DIVIDER,
    ...contract,
    SECTION_DIVIDER,
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

// ── Retrieval intelligence helpers ───────────────────────────────────────────

/**
 * Derive trust signal from on-chain stake amount.
 * "staked" = publisher locked ETH (proxy for HumanStaked tier).
 * "unstaked" = zero-stake bootstrap / agent-published.
 */
function deriveTrustSignal(stakeAmount?: string): "staked" | "unstaked" | undefined {
  if (stakeAmount === undefined) return undefined;
  try {
    return BigInt(stakeAmount) > 0n ? "staked" : "unstaked";
  } catch {
    return undefined;
  }
}

/**
 * Build a one-line explanation of why a KB was selected.
 * Surfaces matched query tokens, type priority boost, and usage signals.
 */
function buildRetrievalReason(
  query: string,
  kb: SubgraphKB,
  artifact: KBArtifact | null,
): string {
  const tokens = query.toLowerCase().split(/[\s,;.?!]+/).filter((t) => t.length > 3);
  const domainParts = kb.domain.toLowerCase().split(".");
  const titleTokens = (artifact?.title ?? "").toLowerCase().split(/\s+/);
  const tagTokens = ((artifact?.tags ?? []) as string[]).map((t) => t.toLowerCase());

  const matchedTokens = tokens.filter(
    (t) =>
      domainParts.some((p) => p.includes(t) || t.includes(p)) ||
      titleTokens.some((p) => p.includes(t) || t.includes(p)) ||
      tagTokens.some((p) => p.includes(t)),
  );

  const signals: string[] = [];

  if (matchedTokens.length > 0) {
    signals.push(`matched '${matchedTokens.slice(0, 2).join("' + '")}'`);
  } else {
    signals.push(`domain ${kb.domain}`);
  }

  const typeBoost = TYPE_SELECTION_BOOST[kb.kbType] ?? 0;
  if (typeBoost >= 18) {
    signals.push(`priority type (${kb.kbType})`);
  }

  if (kb.reputationScore >= 200) {
    signals.push("high reputation");
  } else if (Number(kb.uniquePayerCount ?? "0") > 3) {
    signals.push(`${kb.uniquePayerCount} unique consumers`);
  } else if (Number(kb.settlementCount ?? "0") > 5) {
    signals.push(`${kb.settlementCount} settlements`);
  }

  return signals.join(" + ");
}

/**
 * Compute KB coverage quality from retrieval result statistics.
 * "high": 5+ KBs found, avg reputation ≥150, 2+ distinct types.
 * "medium": 2+ KBs found, avg reputation ≥30.
 * "low": sparse results or very new KB set.
 */
function computeCoverage(
  kbsFound: number,
  avgRepScore: number,
  kbsUsed: SelectedKB[],
): "high" | "medium" | "low" {
  const typeCount = new Set(kbsUsed.map((kb) => kb.kbType)).size;
  if (kbsFound >= 5 && avgRepScore >= 150 && typeCount >= 2) return "high";
  if (kbsFound >= 2 && avgRepScore >= 30) return "medium";
  return "low";
}

/**
 * Generate 2–3 follow-up query suggestions based on KB types used and output mode.
 */
function buildSuggestions(
  kbsUsed: SelectedKB[],
  outputMode: Exclude<OutputMode, "auto">,
): string[] {
  const types = new Set(kbsUsed.map((kb) => kb.kbType));
  const suggestions: string[] = [];

  if (
    types.has("SecurityRule") || types.has("AuditChecklist") ||
    types.has("AntiPattern") || types.has("ViolationExample")
  ) {
    suggestions.push("audit this implementation for compliance requirements");
    suggestions.push("test authentication and authorization edge cases");
  } else if (types.has("Practice") || types.has("CodePattern") || types.has("BestPractice")) {
    suggestions.push("optimize this implementation for production load");
    suggestions.push("write unit tests covering this pattern");
  } else if (types.has("Feature") || types.has("StateMachine")) {
    suggestions.push("validate acceptance criteria against requirements");
    suggestions.push("design error handling and fallback strategies");
  } else if (types.has("Rubric") || types.has("ComplianceChecklist")) {
    suggestions.push("apply this checklist to your real implementation");
    suggestions.push("document gaps and schedule remediation");
  }

  if (suggestions.length === 0) {
    suggestions.push("explore related best practices for this domain");
    suggestions.push("review for edge cases and failure modes");
  }

  if (suggestions.length < 3) {
    if (outputMode === "steps") {
      suggestions.push("generate tests for each implementation step");
    } else if (outputMode === "checklist") {
      suggestions.push("prioritize and schedule the remediation items");
    } else {
      suggestions.push("prototype the recommended approach as a proof of concept");
    }
  }

  return suggestions.slice(0, 3);
}

/**
 * Build the enhanced query string that reveals what retrieval used:
 * the original query + inferred domains, type filters, and detected intent.
 */
function buildEnhancedQuery(
  query: string,
  domains: string[] | undefined,
  types: KBType[] | undefined,
  commandIntent: boolean,
): string {
  const parts: string[] = [query];
  if (domains?.length) parts.push(`[domains: ${domains.join(", ")}]`);
  if (types?.length) parts.push(`[types: ${types.join(", ")}]`);
  if (commandIntent) parts.push("[intent: implementation]");
  return parts.join(" ");
}

/** KB types whose directives can conflict when multiple instances appear in one selection. */
const DIRECTIVE_KB_TYPES = new Set([
  "Practice", "BestPractice", "SecurityRule", "Feature",
]);

/**
 * Detect potential conflicts: 2+ directive KBs of the same type from different
 * top-level domains may give diverging recommendations.
 */
function detectConflicts(kbsUsed: SelectedKB[]): ConflictHint[] {
  const conflicts: ConflictHint[] = [];
  const byType = new Map<string, SelectedKB[]>();

  for (const kb of kbsUsed) {
    if (!DIRECTIVE_KB_TYPES.has(kb.kbType)) continue;
    const existing = byType.get(kb.kbType) ?? [];
    existing.push(kb);
    byType.set(kb.kbType, existing);
  }

  for (const [type, kbs] of byType) {
    if (kbs.length < 2) continue;
    const topDomains = new Set(kbs.map((kb) => kb.domain.split(".")[0]));
    if (topDomains.size > 1) {
      const kbIds = kbs.map((kb) => `KB-${kbsUsed.indexOf(kb) + 1}`);
      conflicts.push({
        kbIds,
        kbType: type,
        note: `Multiple ${type} KBs from different domains (${[...topDomains].join(", ")}) — recommendations may differ. Prefer the domain most relevant to your context.`,
      });
    }
  }

  return conflicts;
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
    outputMode: rawOutputMode = "auto",
    debug: debugMode = false,
    deterministicMode = false,
  } = options;

  // ── Intent detection ──────────────────────────────────────────────────────
  const commandIntent = detectCommandIntent(question);
  const outputMode = resolveOutputMode(rawOutputMode, commandIntent);

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
  // Base boost lifts structured types; command-intent boost additionally lifts
  // Practice + CodePattern when the query is imperative ("implement", "fix", etc.).
  const boostedScores = filtered.map((kb) => {
    const base    = TYPE_SELECTION_BOOST[kb.kbType] ?? 0;
    const cmdBoost = commandIntent ? (COMMAND_INTENT_BOOST[kb.kbType] ?? 0) : 0;
    const boost    = base + cmdBoost;
    return { kb, boost, finalScore: kb.reputationScore + boost };
  });
  boostedScores.sort((a, b) => {
    const scoreDiff = b.finalScore - a.finalScore;
    if (deterministicMode && scoreDiff === 0) {
      // Stable secondary sort by contentHash for fully deterministic selection
      return a.kb.contentHash.localeCompare(b.kb.contentHash);
    }
    return scoreDiff;
  });
  const ranked = boostedScores.map((x) => x.kb);

  // ── 5. Minimum composition + slice to limit ─────────────────────────────────
  const selected = enforceMinComposition(ranked, limit, commandIntent);

  // Map to SelectedKB shape (retrievalReason backfilled after artifact fetch)
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
    retrievalReason: "", // backfilled after artifact fetch
    publishedAt: kb.timestamp ? Number(kb.timestamp) : undefined,
    trustSignal: deriveTrustSignal(kb.stakeAmount),
    parents: kb.parents?.map((e) => e.parent.id).filter(Boolean),
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
    // Backfill title/summary/royaltyBps/retrievalReason from artifact
    if (artifact.title) kbsUsed[i]!.title = artifact.title;
    if (artifact.summary) kbsUsed[i]!.summary = artifact.summary;
    const royaltyBps = (artifact as { provenance?: { royalty_bps?: number } }).provenance?.royalty_bps;
    if (typeof royaltyBps === "number") kbsUsed[i]!.royaltyBps = royaltyBps;
    kbsUsed[i]!.retrievalReason = buildRetrievalReason(question, selected[i]!, artifact);
    return artifact;
  });

  const artifacts = await Promise.all(artifactPromises);

  // Backfill retrievalReason for KBs whose artifact fetch failed
  kbsUsed.forEach((kb, i) => {
    if (!kb.retrievalReason) {
      kb.retrievalReason = buildRetrievalReason(question, selected[i]!, null);
    }
  });

  // ── 7. Compose enriched prompt ──────────────────────────────────────────────
  const deterministicHeader = deterministicMode
    ? "[DETERMINISTIC MODE: KB selection is locked. Reproducible outputs are expected.]\n\n"
    : "";
  const enrichedPrompt =
    kbsUsed.length > 0
      ? deterministicHeader + composeSystemPrompt(kbsUsed, artifacts, outputMode)
      : "You are an expert system. Answer the user's question as accurately as possible.";

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

  // ── 11. Compute new intelligence fields ──────────────────────────────────────
  const coverage = computeCoverage(subgraphHits, avgReputationScore, kbsUsed);
  const suggestions = buildSuggestions(kbsUsed, outputMode);
  const enhancedQuery = buildEnhancedQuery(question, domains, types, commandIntent);
  const conflicts = detectConflicts(kbsUsed);

  return {
    enrichedPrompt,
    kbsUsed,
    settlementPreview,
    fromCache: servedFromCache,
    warnings,
    kbsFound: subgraphHits,
    avgReputationScore,
    lowConfidence,
    outputMode,
    commandIntent,
    coverage,
    enhancedQuery,
    suggestions,
    conflicts,
    ...(debugInfo !== undefined ? { debug: debugInfo } : {}),
  };
}
