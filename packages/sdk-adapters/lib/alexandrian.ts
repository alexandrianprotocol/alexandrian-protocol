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

import { enhanceQuery, type EnhanceQueryOptions, type EnhancedQuery, type OutputMode } from "./enhanceQuery.js";
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
  readonly defaults: AlexandrianEnhanceOptions;

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
//   Both `engineering.*` (M2 format) and `cybersecurity.*` / `antipattern.*` /
//   `regulatory.*` (live subgraph format) are included so presets work against existing
//   indexed KBs as well as newly published M2 KBs.
//
// Each preset has:
//   - types:      ordered preference list (drives selection + ranking boost)
//   - domains:    optional domain filter (omit to auto-infer from query)
//   - outputMode: controls prompt structure ("steps" | "checklist" | "framework")
//   - limit:      optional override (quickFix=2, deepDive=6, else default=4)

function preset(opts: AlexandrianEnhanceOptions): AlexandrianQueryClient {
  return new AlexandrianQueryClient(opts);
}

export const PRESETS = {
  // ── Debugging ─────────────────────────────────────────────────────────────
  /**
   * Debug-oriented preset. Surfaces step-by-step diagnostic practices and
   * code-pattern KBs. Ideal for "why is X broken" and "fix this error" queries.
   *
   * @example
   * const result = await alexandrian.presets.debug.enhance("Why is my Promise chain swallowing errors?");
   */
  debug: preset({
    types: ["Practice", "CodePattern", "AntiPattern", "BestPractice"],
    outputMode: "steps" as OutputMode,
  }),

  // ── Refactoring ───────────────────────────────────────────────────────────
  /**
   * Refactoring preset. Retrieves best-practice and anti-pattern KBs to guide
   * safe structural improvement without changing observable behaviour.
   *
   * @example
   * const result = await alexandrian.presets.refactor.enhance("How do I remove this God object?");
   */
  refactor: preset({
    types: ["Practice", "BestPractice", "AntiPattern", "CodePattern"],
    outputMode: "steps" as OutputMode,
  }),

  // ── Performance ───────────────────────────────────────────────────────────
  /**
   * Performance optimisation preset. Surfaces implementation practices and
   * rubric KBs for measuring before/after improvements.
   *
   * @example
   * const result = await alexandrian.presets.performance.enhance("How do I reduce latency in my API?");
   */
  performance: preset({
    types: ["Practice", "BestPractice", "Feature", "Rubric"],
    outputMode: "steps" as OutputMode,
  }),

  // ── Architecture ──────────────────────────────────────────────────────────
  /**
   * Architecture and design preset. Returns feature specs, decision frameworks,
   * and best-practice KBs structured as a decision framework.
   *
   * @example
   * const result = await alexandrian.presets.architecture.enhance("How do I design a multi-tenant SaaS backend?");
   */
  architecture: preset({
    types: ["Practice", "Feature", "BestPractice", "Rubric"],
    outputMode: "framework" as OutputMode,
  }),

  // ── Security ──────────────────────────────────────────────────────────────
  /**
   * Security review and audit preset. Retrieves security rules, audit checklists,
   * anti-patterns, and violation examples — outputs a severity-ranked checklist.
   *
   * @example
   * const evaluation = await alexandrian.presets.security.review(expressMiddleware);
   * const findings   = alexandrian.parseFindings(llmOutput);
   */
  security: preset({
    types: ["SecurityRule", "AuditChecklist", "AntiPattern", "ViolationExample", "ComplianceChecklist"],
    domains: [
      "cybersecurity.threat_detection",
      "cybersecurity.vulnerability_analysis",
      "antipattern.security",
      "auth.access_control",
      "engineering.api.security",
      "engineering.compliance",
    ],
    outputMode: "checklist" as OutputMode,
  }),

  // ── Compliance ────────────────────────────────────────────────────────────
  /**
   * Compliance audit preset (OWASP, SOC2, GDPR, PCI, HIPAA, ISO27001).
   * Returns compliance checklists and rubrics for structured pass/fail assessment.
   *
   * @example
   * const evaluation = await alexandrian.presets.compliance.audit(apiSpec);
   */
  compliance: preset({
    types: ["AuditChecklist", "ComplianceChecklist", "Rubric", "BestPractice"],
    domains: [
      "regulatory.soc2",
      "regulatory.gdpr",
      "regulatory.pci",
      "regulatory.hipaa",
      "regulatory.iso27001",
      "engineering.compliance",
    ],
    outputMode: "checklist" as OutputMode,
  }),

  // ── Reliability ───────────────────────────────────────────────────────────
  /**
   * Reliability and resilience preset. Surfaces practices for fault tolerance,
   * retry strategies, circuit breakers, and SLO design.
   *
   * @example
   * const result = await alexandrian.presets.reliability.enhance("How do I make my service handle network failures?");
   */
  reliability: preset({
    types: ["Practice", "ComplianceChecklist", "BestPractice", "Feature"],
    outputMode: "steps" as OutputMode,
  }),

  // ── RAG ───────────────────────────────────────────────────────────────────
  /**
   * RAG pipeline and retrieval engineering preset. Retrieves practices and
   * state-machine KBs for building knowledge retrieval systems.
   *
   * @example
   * const result = await alexandrian.presets.rag.enhance("How do I build a hybrid BM25 + vector retrieval pipeline?");
   */
  rag: preset({
    types: ["Practice", "Feature", "StateMachine", "PromptEngineering"],
    domains: [
      "rag.systems",
      "agent.memory",
      "engineering.agent",
    ],
    outputMode: "steps" as OutputMode,
  }),

  // ── Agent design ──────────────────────────────────────────────────────────
  /**
   * AI agent design preset. Surfaces state machines, prompting practices,
   * and feature specs for building reliable LLM-based agents.
   *
   * @example
   * const result = await alexandrian.presets.agentDesign.enhance("How do I build a ReAct agent with memory?");
   */
  agentDesign: preset({
    types: ["Practice", "StateMachine", "PromptEngineering", "Feature"],
    domains: [
      "agent.planning",
      "agent.memory",
      "agent.reasoning",
      "rag.systems",
      "engineering.agent",
    ],
    outputMode: "framework" as OutputMode,
  }),

  // ── Evaluation ────────────────────────────────────────────────────────────
  /**
   * Evaluation and scoring preset. Retrieves rubrics, audit checklists, and
   * best-practice KBs for structured LLM-as-judge evaluation.
   *
   * @example
   * const result = await alexandrian.presets.evaluation.enhance("How do I evaluate my RAG pipeline output quality?");
   */
  evaluation: preset({
    types: ["Rubric", "AuditChecklist", "ComplianceChecklist", "BestPractice"],
    outputMode: "checklist" as OutputMode,
  }),

  // ── Fullstack ─────────────────────────────────────────────────────────────
  /**
   * Full-stack engineering preset. Cross-domain query across API, frontend,
   * database, and infrastructure patterns. Good for end-to-end feature questions.
   *
   * @example
   * const result = await alexandrian.presets.fullstack.enhance("How do I implement real-time notifications?");
   */
  fullstack: preset({
    types: ["Practice", "Feature", "BestPractice", "CodePattern"],
    // No domain filter — auto-inferred from query, covers all engineering domains
    outputMode: "steps" as OutputMode,
  }),

  // ── Quick fix ─────────────────────────────────────────────────────────────
  /**
   * Quick-fix preset. Returns only the top 2 KBs — minimum viable context for
   * fast answers. Best for simple one-liner fixes and quick how-tos.
   *
   * @example
   * const result = await alexandrian.presets.quickFix.enhance("How do I parse a URL in Node.js?");
   */
  quickFix: preset({
    types: ["Practice", "CodePattern", "AntiPattern"],
    limit: 2,
    outputMode: "steps" as OutputMode,
  }),

  // ── Deep dive ─────────────────────────────────────────────────────────────
  /**
   * Deep-dive preset. Injects up to 6 KBs across types for thorough, multi-angle
   * analysis. Best for architecture decisions and complex implementation questions.
   *
   * @example
   * const result = await alexandrian.presets.deepDive.enhance("How do I design a distributed cache?");
   */
  deepDive: preset({
    types: ["Practice", "Feature", "BestPractice", "Rubric", "CodePattern"],
    limit: 6,
    outputMode: "framework" as OutputMode,
  }),

  // ── Production-ready ──────────────────────────────────────────────────────
  /**
   * Production-readiness preset. Surfaces compliance checklists, practices, and
   * rubrics for validating that a system is ready for production traffic.
   *
   * @example
   * const result = await alexandrian.presets.productionReady.review(serviceSpec);
   */
  productionReady: preset({
    types: ["ComplianceChecklist", "Practice", "BestPractice", "Rubric"],
    outputMode: "checklist" as OutputMode,
  }),

  // ── Coding (general) ──────────────────────────────────────────────────────
  /**
   * General-purpose software engineering preset.
   * Covers practices, patterns, and anti-patterns across all engineering domains.
   * Domain is auto-inferred from query text.
   *
   * @example
   * const result = await alexandrian.presets.coding.enhance("How do I implement rate limiting?");
   * const review = await alexandrian.presets.coding.review(myCode);
   */
  coding: preset({
    types: ["Practice", "CodePattern", "BestPractice", "Feature", "AntiPattern"],
    // No domain filter — auto-inferred from query
  }),

  // ── Agent memory (legacy alias) ───────────────────────────────────────────
  /**
   * @deprecated Use `agentDesign` instead. Kept for backwards compatibility.
   */
  agentMemory: preset({
    types: ["Practice", "StateMachine", "PromptEngineering", "Feature"],
    domains: [
      "agent.planning",
      "agent.memory",
      "agent.reasoning",
      "rag.systems",
      "engineering.agent",
    ],
    outputMode: "framework" as OutputMode,
  }),
} as const;

export type PresetName = keyof typeof PRESETS;

// ── Composable presets ─────────────────────────────────────────────────────────

/**
 * Compose two or more preset clients into a single client.
 *
 * Merges `types` and `domains` (deduplicated). Later presets win on scalar
 * fields (`outputMode`, `limit`, `cache`). Use when a task spans multiple concerns.
 *
 * @example
 * // Zero-config multi-concern query: security + performance
 * const client = mergePresets(alexandrian.presets.security, alexandrian.presets.performance);
 * const result = await client.enhance("Is my Redis caching strategy safe and fast?");
 *
 * @example
 * // Composable audit: compliance + security
 * const client = mergePresets(alexandrian.presets.compliance, alexandrian.presets.security);
 * const evaluation = await client.audit(apiSpec);
 */
export function mergePresets(...clients: AlexandrianQueryClient[]): AlexandrianQueryClient {
  const merged = clients.reduce<AlexandrianEnhanceOptions>((acc, client) => {
    const d = client.defaults;
    return {
      ...acc,
      ...d,
      // Deduplicate arrays — later presets append, not replace
      types: d.types
        ? ([...new Set([...(acc.types ?? []), ...d.types])] as typeof d.types)
        : acc.types,
      domains: d.domains
        ? [...new Set([...(acc.domains ?? []), ...d.domains])]
        : acc.domains,
    };
  }, {});
  return new AlexandrianQueryClient(merged);
}
