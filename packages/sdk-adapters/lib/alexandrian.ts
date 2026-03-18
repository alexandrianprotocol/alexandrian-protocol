/**
 * alexandrian — 1-line integration client for the Alexandrian Protocol.
 *
 * Zero-config API. No blockchain exposure. No API keys.
 * Domains are auto-inferred from your query text.
 *
 * Usage (the happy path):
 * ```ts
 * import { alexandrian } from "@alexandrian/sdk-adapters";
 *
 * const { enrichedPrompt, kbsUsed } = await alexandrian.enhance(
 *   "How do I secure my login endpoint?"
 * );
 *
 * // Pass enrichedPrompt as your LLM system message
 * const response = await openai.chat.completions.create({
 *   model: "gpt-4o-mini",
 *   messages: [
 *     { role: "system", content: enrichedPrompt },
 *     { role: "user",   content: question },
 *   ],
 * });
 * ```
 *
 * Advanced usage with explicit options:
 * ```ts
 * const result = await alexandrian.enhance(query, {
 *   domains:  ["engineering.api.security", "engineering.evm"],
 *   types:    ["ComplianceChecklist", "Practice"],
 *   limit:    6,
 *   cache:    new MemoryCacheAdapter(),
 * });
 * ```
 *
 * Browser (no Node.js required):
 * ```html
 * <script type="module">
 *   import { alexandrian } from "https://cdn.jsdelivr.net/npm/@alexandrian/sdk-adapters/dist/index.js";
 *   const { enrichedPrompt } = await alexandrian.enhance("How do I design a REST API?");
 * </script>
 * ```
 */

import { enhanceQuery, type EnhanceQueryOptions, type EnhancedQuery } from "./enhanceQuery.js";
import { inferDomains } from "./inferDomains.js";
import { UpstashCacheAdapter } from "./adapters/upstash.js";
import {
  evaluateArtifact,
  parseFindings,
  type EvaluationMode,
  type EvaluationOptions,
  type EvaluationQuery,
  type ParsedFindings,
} from "./evaluate.js";
import type { SelectedKB } from "./enhanceQuery.js";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Options accepted by `alexandrian.enhance()`. All fields are optional. */
export type AlexandrianEnhanceOptions = Omit<EnhanceQueryOptions, "domains"> & {
  /**
   * Domain filter — e.g. `["engineering.api.security"]`.
   * When omitted, domains are auto-inferred from the query text.
   * Pass an empty array to force a cross-domain (all domains) query.
   */
  domains?: string[];
};

// ── AlexandrianClient ─────────────────────────────────────────────────────────

/**
 * `AlexandrianQueryClient` is the facade for the 1-line `alexandrian.enhance()` API.
 *
 * Instantiate with optional defaults to override globally for all `enhance()` calls.
 * The default export `alexandrian` is a pre-built instance with no configuration.
 *
 * Named `AlexandrianQueryClient` (not `AlexandrianClient`) to avoid collision with
 * the ethers-based `AlexandrianClient` blockchain adapter also exported from this package.
 */
export class AlexandrianQueryClient {
  private readonly defaults: AlexandrianEnhanceOptions;

  /**
   * When no cache is provided in defaults, automatically uses UpstashCacheAdapter
   * if UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set in the environment.
   * Set `cache: null` to explicitly disable caching.
   */
  constructor(defaults: AlexandrianEnhanceOptions = {}) {
    const cache = defaults.cache !== undefined
      ? defaults.cache
      : UpstashCacheAdapter.fromEnv() ?? undefined;
    this.defaults = { ...defaults, cache };
  }

  /**
   * Enhance a query with Alexandrian Protocol KB context.
   *
   * - Auto-infers domains from the query text (unless `options.domains` is set).
   * - Fetches the top-ranked KBs from the live subgraph.
   * - Fetches IPFS artifacts and composes an enriched system prompt.
   * - Returns the enriched prompt ready to pass to any LLM.
   *
   * @param query    The user's raw question or agent intent string.
   * @param options  Optional overrides for domains, types, limit, cache, etc.
   */
  async enhance(
    query: string,
    options: AlexandrianEnhanceOptions = {}
  ): Promise<EnhancedQuery> {
    // Merge caller options with defaults (caller wins)
    const merged: AlexandrianEnhanceOptions = { ...this.defaults, ...options };

    // Auto-infer domains when not explicitly provided
    const hasDomains = merged.domains && merged.domains.length > 0;
    const resolvedDomains = hasDomains
      ? merged.domains
      : (inferDomains(query) ?? undefined);

    return enhanceQuery(query, { ...merged, domains: resolvedDomains });
  }

  /**
   * Create a new client instance with different defaults.
   * Useful for building per-tenant or per-domain clients.
   *
   * @example
   * const securityClient = alexandrian.withDefaults({
   *   domains: ["engineering.api.security"],
   *   types: ["ComplianceChecklist"],
   * });
   */
  withDefaults(defaults: AlexandrianEnhanceOptions): AlexandrianQueryClient {
    return new AlexandrianQueryClient({ ...this.defaults, ...defaults });
  }

  // ── Evaluation API ─────────────────────────────────────────────────────────
  //
  // These methods shift the retrieval pattern from "knowledge retrieval" to
  // "criteria retrieval": retrieved KBs become evaluation rules, and the LLM
  // becomes a structured evaluator rather than an answer generator.
  //
  // All three methods return `EvaluationQuery.evaluationPrompt` — pass it as
  // your LLM system message, then call `parseFindings()` on the response.

  /**
   * Code review: retrieve best-practice, anti-pattern, and code-pattern KBs
   * as evaluation criteria, then compose a structured evaluation prompt that
   * instructs the LLM to identify issues and suggest fixes.
   *
   * @param artifact  The code or implementation to review (verbatim string).
   * @param options   Optional KB discovery, caching, and focus narrowing.
   *
   * @example
   * const evaluation = await alexandrian.review(myExpressMiddleware, {
   *   focus: "SQL injection and input validation",
   * });
   * const response = await openai.chat.completions.create({
   *   messages: [
   *     { role: "system", content: evaluation.evaluationPrompt },
   *     { role: "user",   content: "Review the code and return findings JSON." },
   *   ],
   * });
   * const findings = alexandrian.parseFindings(response.choices[0].message.content);
   */
  async review(
    artifact: string,
    options: EvaluationOptions = {},
  ): Promise<EvaluationQuery> {
    return evaluateArtifact(artifact, "review", {
      ...this.defaults,
      ...options,
    });
  }

  /**
   * Security audit: retrieve security rules, audit checklists, and anti-pattern KBs
   * as evaluation criteria, then compose a structured prompt that instructs the LLM
   * to map vulnerabilities against those rules.
   *
   * @param artifact  The code, API spec, system description, or config to audit.
   * @param options   Optional KB discovery, caching, and focus narrowing.
   *
   * @example
   * const evaluation = await alexandrian.audit(apiRoutes, {
   *   focus: "authentication and authorization",
   * });
   */
  async audit(
    artifact: string,
    options: EvaluationOptions = {},
  ): Promise<EvaluationQuery> {
    return evaluateArtifact(artifact, "audit", {
      ...this.defaults,
      ...options,
    });
  }

  /**
   * Best-practice comparison: retrieve best-practice, rubric, and code-pattern KBs,
   * then compose a prompt that scores the implementation against a reference standard.
   *
   * @param artifact         The implementation to compare (verbatim string).
   * @param standard         The reference standard or expected implementation to compare against.
   * @param options          Optional KB discovery, caching, and focus narrowing.
   *
   * @example
   * const evaluation = await alexandrian.compare(myCacheImpl, referenceCacheImpl, {
   *   focus: "cache invalidation and TTL handling",
   * });
   */
  async compare(
    artifact: string,
    standard: string,
    options: EvaluationOptions = {},
  ): Promise<EvaluationQuery> {
    return evaluateArtifact(artifact, "compare", { ...this.defaults, ...options }, standard);
  }

  /**
   * Extract structured evaluation findings from an LLM response.
   *
   * Parses the JSON object produced when the LLM follows the evaluation prompt's
   * output format instructions. Returns `null` on failure — never throws.
   *
   * @param llmOutput  Raw string response from the LLM.
   * @returns          Typed `ParsedFindings` or `null` if unparseable.
   *
   * @example
   * const findings = alexandrian.parseFindings(llmResponse);
   * const critical = findings?.findings.filter(f => f.severity === "critical");
   */
  parseFindings(llmOutput: string): ParsedFindings | null {
    return parseFindings(llmOutput);
  }

  // ── Presets ────────────────────────────────────────────────────────────────
  //
  // Pre-configured client instances for the most common use cases.
  // Each preset has the right KB types and domains wired in — no config needed.
  //
  // Usage: alexandrian.presets.security.review(code)
  //        alexandrian.presets.compliance.audit(policyDoc)
  //        alexandrian.presets.coding.enhance("How do I design a REST API?")

  /**
   * Pre-configured clients for common use cases.
   *
   * ```ts
   * // Zero-config code review
   * const eval = await alexandrian.presets.security.review(code);
   *
   * // Zero-config compliance audit
   * const eval = await alexandrian.presets.compliance.audit(apiSpec);
   *
   * // Zero-config engineering Q&A
   * const result = await alexandrian.presets.coding.enhance("How do I implement rate limiting?");
   * ```
   */
  get presets(): typeof PRESETS {
    return PRESETS;
  }

  // ── Settlement ─────────────────────────────────────────────────────────────

  /**
   * Build a settlement summary from an enhanced or evaluation query result.
   *
   * Returns the list of KBs that should be settled, with their fees and the
   * total ETH required. Pass to your `AlexandrianSDK.settleCitation()` calls.
   *
   * This helper is intentionally thin — the actual on-chain call requires a
   * connected ethers signer, so it lives in `@alexandrian/sdk-adapters`'s
   * `AlexandrianSDK` (the blockchain adapter class), not here.
   *
   * @example
   * const result  = await alexandrian.enhance(query);
   * const toSettle = alexandrian.settlementSummary(result.kbsUsed);
   * // { kbs: [...], totalEthRequired: 0.0004 }
   * // Then: for (const kb of toSettle.kbs) await sdk.settleCitation(kb.contentHash, agentAddress);
   */
  settlementSummary(kbsUsed: SelectedKB[]): {
    kbs: Array<{ contentHash: string; domain: string; title: string; feeEth: number }>;
    totalEthRequired: number;
  } {
    const WEI_PER_ETH = 1e18;
    const kbs = kbsUsed.map((kb) => ({
      contentHash: kb.contentHash,
      domain:      kb.domain,
      title:       kb.title,
      feeEth:      Number(kb.queryFeeWei) / WEI_PER_ETH,
    }));
    const totalEthRequired = kbs.reduce((sum, kb) => sum + kb.feeEth, 0);
    return { kbs, totalEthRequired };
  }
}

// ── Default export — zero-config instance ─────────────────────────────────────

/**
 * Zero-config Alexandrian client.
 *
 * `alexandrian.enhance(query)` is the full 1-line integration path:
 *   1. Infers domains from your query text
 *   2. Fetches top KBs from the live subgraph
 *   3. Fetches IPFS artifacts
 *   4. Returns enrichedPrompt ready for any LLM
 *
 * Presets for instant value with no config:
 *   alexandrian.presets.security.review(code)
 *   alexandrian.presets.compliance.audit(spec)
 *   alexandrian.presets.coding.enhance(question)
 *   alexandrian.presets.agentMemory.enhance(taskDescription)
 *
 * No API keys. No config. No blockchain required.
 */
export const alexandrian = new AlexandrianQueryClient();

// ── Presets ────────────────────────────────────────────────────────────────────
//
// Pre-configured client instances with domain + type defaults for common use cases.
// All presets extend AlexandrianQueryClient — they have enhance(), review(), audit(),
// compare(), and parseFindings() available.
//
// Domain coverage:
//   Both `engineering.*` (future M2 format) and `cybersecurity.*` / `antipattern.*` /
//   `regulatory.*` (live subgraph format) are included so presets work against existing
//   indexed KBs as well as newly published M2 KBs.

/**
 * Pre-configured security review and audit client.
 *
 * @example
 * const evaluation = await alexandrian.presets.security.review(expressMiddleware);
 * const findings   = alexandrian.parseFindings(llmOutput);
 */
const securityPreset = new AlexandrianQueryClient({
  types: ["SecurityRule", "AuditChecklist", "AntiPattern", "ViolationExample", "ComplianceChecklist"],
  domains: [
    // Generator domain format (live subgraph)
    "cybersecurity.threat_detection",
    "cybersecurity.vulnerability_analysis",
    "antipattern.security",
    "auth.access_control",
    // M2 format
    "engineering.api.security",
    "engineering.compliance",
  ],
});

/**
 * Pre-configured compliance audit client (OWASP, SOC2, GDPR, PCI, HIPAA).
 *
 * @example
 * const evaluation = await alexandrian.presets.compliance.audit(apiSpec);
 */
const compliancePreset = new AlexandrianQueryClient({
  types: ["AuditChecklist", "ComplianceChecklist", "Rubric", "BestPractice"],
  domains: [
    // Generator domain format (live subgraph)
    "regulatory.soc2",
    "regulatory.gdpr",
    "regulatory.pci",
    "regulatory.hipaa",
    "regulatory.iso27001",
    // M2 format
    "engineering.compliance",
  ],
});

/**
 * Pre-configured software engineering client (practices, patterns, architecture).
 *
 * @example
 * const result = await alexandrian.presets.coding.enhance("How do I implement rate limiting?");
 * const review = await alexandrian.presets.coding.review(myCode);
 */
const codingPreset = new AlexandrianQueryClient({
  types: ["Practice", "CodePattern", "BestPractice", "Feature", "AntiPattern"],
  // No domain filter — auto-inferred from query so it works across all engineering domains
});

/**
 * Pre-configured AI agent and LLM engineering client.
 *
 * @example
 * const result = await alexandrian.presets.agentMemory.enhance("How do I build a ReAct agent?");
 */
const agentMemoryPreset = new AlexandrianQueryClient({
  types: ["Practice", "StateMachine", "PromptEngineering", "Feature"],
  domains: [
    // Generator domain format (live subgraph)
    "agent.planning",
    "agent.memory",
    "agent.reasoning",
    "rag.systems",
    // M2 format
    "engineering.agent",
  ],
});

/**
 * Named preset instances — access via `alexandrian.presets.*` or import directly.
 *
 * | Preset       | Best for                                          |
 * |-------------|---------------------------------------------------|
 * | security    | Code review, security audits, vulnerability check |
 * | compliance  | OWASP, SOC2, GDPR, PCI, HIPAA checklists         |
 * | coding      | General engineering Q&A, code review, patterns   |
 * | agentMemory | AI agent design, LLM prompting, RAG pipelines    |
 */
export const PRESETS = {
  security:    securityPreset,
  compliance:  compliancePreset,
  coding:      codingPreset,
  agentMemory: agentMemoryPreset,
} as const;

export type PresetName = keyof typeof PRESETS;
