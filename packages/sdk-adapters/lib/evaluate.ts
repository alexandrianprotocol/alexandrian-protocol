/**
 * evaluate — Alexandrian Protocol evaluation engine.
 *
 * Extends the query-enhancement pattern into a higher-value retrieval mode:
 * instead of retrieving KBs as *knowledge*, evaluation mode retrieves them as
 * *criteria* — rules, checklists, anti-patterns — and composes a prompt that
 * instructs the LLM to JUDGE an artifact against those criteria.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 * Low-level (direct):
 * ```ts
 * const evaluation = await evaluateArtifact(myCode, "review", { focus: "SQL injection" });
 * const response = await llm.complete(evaluation.evaluationPrompt);
 * const findings = parseFindings(response);
 * ```
 *
 * High-level (via the `alexandrian` singleton — preferred):
 * ```ts
 * const evaluation = await alexandrian.review(myCode, { focus: "SQL injection" });
 * const evaluation = await alexandrian.audit(apiSpec);
 * const evaluation = await alexandrian.compare(myImpl, referenceImpl);
 * const findings   = alexandrian.parseFindings(llmOutput);
 * ```
 *
 * The SDK never calls an LLM — `evaluationPrompt` is returned so you can pass it
 * to whatever LLM you use, exactly like `enrichedPrompt` from `enhanceQuery()`.
 *
 * ── Output format ─────────────────────────────────────────────────────────────
 * The evaluation prompt instructs the LLM to return a JSON object:
 * ```json
 * {
 *   "findings": [
 *     { "severity": "critical", "category": "SQL Injection", "description": "...",
 *       "kbRef": "KB-2, item 3", "kbTitle": "...", "suggestion": "..." }
 *   ],
 *   "checklistCoverage": [
 *     { "item": "Validate all inputs", "status": "fail", "kbRef": "KB-1, item 1" }
 *   ],
 *   "summary": "Two critical vulnerabilities found..."
 * }
 * ```
 * Use `parseFindings(llmOutput)` to extract this into typed objects.
 */

import {
  enhanceQuery,
  type EnhanceQueryOptions,
  type KBType,
  type SelectedKB,
  type SettlementPreview,
} from "./enhanceQuery.js";
import { inferDomains } from "./inferDomains.js";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Which evaluation task is being performed. */
export type EvaluationMode = "review" | "audit" | "compare";

/** Severity levels for evaluation findings, ordered most → least severe. */
export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

/**
 * A single structured finding produced by the LLM when evaluated against KB criteria.
 * Parsed from the LLM's JSON output by `parseFindings()`.
 */
export interface EvaluationFinding {
  /** How severe the issue is. */
  severity: FindingSeverity;
  /** Short category label, e.g. "SQL Injection", "Missing Rate Limiting". */
  category: string;
  /** Description of the problem — what it is and why it matters. */
  description: string;
  /** Which KB and item the finding is anchored to, e.g. "KB-2, item 3". */
  kbRef: string;
  /** Title of the KB that flagged this issue. */
  kbTitle: string;
  /** Concrete, actionable fix suggestion. */
  suggestion?: string;
}

/** Checklist item result from the evaluation. */
export interface EvaluationChecklistItem {
  /** The checklist item text from the KB. */
  item: string;
  /** Whether the artifact passes, fails, or partially covers the item. */
  status: "pass" | "fail" | "warning" | "na";
  /** Which KB and item this covers, e.g. "KB-1, item 4". */
  kbRef?: string;
}

/** Structured output returned by `parseFindings()`. */
export interface ParsedFindings {
  findings: EvaluationFinding[];
  checklistCoverage: EvaluationChecklistItem[];
  /** 1–2 sentence overall assessment from the LLM. */
  summary: string;
}

/**
 * Options for evaluation tasks.
 * Extends `EnhanceQueryOptions` (the standard KB discovery options) with
 * evaluation-specific fields. `domains` is optional here — when omitted they are
 * auto-inferred from the mode + focus query string, matching the behaviour of
 * `AlexandrianQueryClient.enhance()`.
 */
export interface EvaluationOptions extends Omit<EnhanceQueryOptions, "domains"> {
  /**
   * Domain filter — e.g. `["engineering.api.security"]`.
   * Auto-inferred from the evaluation mode + focus when omitted.
   */
  domains?: string[];
  /**
   * Narrow the evaluation focus.
   * Appended to the auto-generated query that drives KB selection.
   * @example "SQL injection and input validation"
   * @example "rate limiting and authentication"
   */
  focus?: string;

  /**
   * Maximum number of criteria KBs to inject.
   * Higher values give the LLM more rules to check against — at the cost of
   * a larger prompt. Set to 8+ for thorough audits, 4 for quick reviews.
   * @default 6
   */
  limit?: number;
}

/**
 * Return value from `evaluateArtifact()`.
 * Pass `evaluationPrompt` as the system message to your LLM.
 */
export interface EvaluationQuery {
  /**
   * Evaluation prompt — pass as the LLM's system message.
   *
   * Contains:
   * - Task description and mode
   * - The artifact under review (verbatim)
   * - KB criteria sections (same format as `enrichedPrompt` from `enhanceQuery()`)
   * - Structured JSON output instructions
   */
  evaluationPrompt: string;

  /** Criteria KBs used, re-ranked by evaluation type priority. */
  kbsUsed: SelectedKB[];

  /** Economic cost preview for settling the criteria KBs used. */
  settlementPreview: SettlementPreview;

  /** True if KB metadata was served from cache. */
  fromCache: boolean;

  /** Warnings (e.g. artifact fetch failures, no criteria KBs found). */
  warnings: string[];

  /** Which evaluation mode was used. */
  taskMode: EvaluationMode;

  /**
   * Number of high-value criteria KBs found (SecurityRule, AuditChecklist,
   * AntiPattern, ViolationExample, BestPractice, ComplianceChecklist).
   * A value of 0 means the evaluation will rely only on general Practice KBs.
   */
  criteriaCount: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTION_DIVIDER = "═══════════════════════════════════════════════";
const ARTIFACT_DIVIDER = "══════════════════════════════════════════════════════════════";

const DEFAULT_EVAL_LIMIT = 6;

/**
 * Auto-generated query strings by mode.
 * These drive domain inference and KB selection — the artifact text is NOT
 * sent to the subgraph; only this query string is used for KB discovery.
 */
const MODE_QUERIES: Record<EvaluationMode, string> = {
  review:  "code review best practices anti-patterns issues improvement",
  audit:   "security audit vulnerabilities compliance checklist rules",
  compare: "best practice comparison standard patterns implementation",
};

/** Human-readable task descriptions injected into the evaluation prompt header. */
const MODE_DESCRIPTIONS: Record<EvaluationMode, string> = {
  review:  "Code Review — identify issues, violations, and improvement opportunities",
  audit:   "Security Audit — map vulnerabilities against rules and compliance checklists",
  compare: "Best Practice Comparison — score the implementation against the provided standard",
};

/**
 * Default KB types to retrieve per mode.
 * User can override via `options.types`.
 * Types are listed in priority order (highest first).
 *
 * Note: M1 on-chain types (Practice, ComplianceChecklist, Rubric, Feature) are
 * included in every mode so the evaluation works with the existing corpus.
 * M2 specialty types (SecurityRule, AuditChecklist, AntiPattern, etc.) appear
 * first so they rank higher once M2 seeds are published.
 */
const MODE_DEFAULT_TYPES: Record<EvaluationMode, KBType[]> = {
  review:  ["AntiPattern", "BestPractice", "CodePattern", "Practice", "ComplianceChecklist", "ViolationExample", "Feature", "Rubric"],
  audit:   ["SecurityRule", "AuditChecklist", "AntiPattern", "ViolationExample", "ComplianceChecklist", "Practice", "Rubric"],
  compare: ["BestPractice", "Rubric", "AuditChecklist", "CodePattern", "Practice", "ComplianceChecklist"],
};

/**
 * Priority scores for re-ranking KBs before slicing to limit.
 * Higher = ranked first so it survives the limit slice.
 * Default priority for any unknown type is 1.
 */
const TYPE_PRIORITY: Record<string, number> = {
  SecurityRule:        10,
  AuditChecklist:       9,
  AntiPattern:          9,
  ViolationExample:     8,
  BestPractice:         7,
  ComplianceChecklist:  7,
  CodePattern:          6,
  Rubric:               6,
  Practice:             5,
  Feature:              3,
  CaseStudy:            2,
};

/**
 * KB types that count as "criteria" KBs for `criteriaCount`.
 *
 * Includes both:
 * - M2 specialty types (SecurityRule, AuditChecklist, etc.) — after seed generation
 * - M1 on-chain types (ComplianceChecklist, Rubric, Practice) — available now
 *
 * This ensures `criteriaCount > 0` with the existing corpus so callers can
 * distinguish "has criteria" from "running blind" before M2 seeds are published.
 */
const CRITERIA_TYPES = new Set([
  // M2 specialty types — present after seed generation
  "SecurityRule", "AuditChecklist", "AntiPattern", "ViolationExample", "BestPractice",
  // M1 on-chain types that function as evaluation criteria — present now
  "ComplianceChecklist", "Rubric", "Practice",
]);

// ── Prompt composition ────────────────────────────────────────────────────────

function composeEvaluationPrompt(
  artifact: string,
  mode: EvaluationMode,
  kbsUsed: SelectedKB[],
  comparisonTarget?: string,
  focus?: string,
): string {
  const taskDesc = MODE_DESCRIPTIONS[mode];
  const focusLine = focus ? `Focus: ${focus}` : "";

  // ── Artifact block ─────────────────────────────────────────────────────────
  const artifactBlock = [
    `${ARTIFACT_DIVIDER}`,
    "ARTIFACT UNDER REVIEW",
    `${ARTIFACT_DIVIDER}`,
    artifact.trim(),
    `${ARTIFACT_DIVIDER}`,
  ].join("\n");

  // ── Comparison standard block (compare mode only) ──────────────────────────
  const comparisonBlock =
    mode === "compare" && comparisonTarget
      ? [
          "",
          `${ARTIFACT_DIVIDER}`,
          "COMPARISON STANDARD",
          `${ARTIFACT_DIVIDER}`,
          comparisonTarget.trim(),
          `${ARTIFACT_DIVIDER}`,
        ].join("\n")
      : "";

  // ── KB criteria sections ───────────────────────────────────────────────────
  const criteriaSections =
    kbsUsed.length > 0
      ? [
          "",
          SECTION_DIVIDER,
          "EVALUATION CRITERIA (Alexandrian Knowledge Base)",
          SECTION_DIVIDER,
          ...kbsUsed.map((kb, i) => formatCriteriaSection(kb, i)),
          "",
        ].join("\n")
      : [
          "",
          "NOTE: No structured criteria KBs were found. Apply general engineering",
          "best practices — but flag that this evaluation lacks KB-anchored evidence.",
          "",
        ].join("\n");

  // ── Output format instructions ─────────────────────────────────────────────
  const outputFormat = [
    SECTION_DIVIDER,
    "OUTPUT FORMAT — respond with this exact JSON schema:",
    SECTION_DIVIDER,
    JSON.stringify(
      {
        findings: [
          {
            severity:    "critical | high | medium | low | info",
            category:    "<short category name, e.g. 'SQL Injection'>",
            description: "<what the problem is and why it matters>",
            kbRef:       "<KB-N, item M — e.g. 'KB-2, item 3'>",
            kbTitle:     "<title of the KB that flagged this issue>",
            suggestion:  "<concrete, actionable fix>",
          },
        ],
        checklistCoverage: [
          {
            item:   "<checklist item text from the KB>",
            status: "pass | fail | warning | na",
            kbRef:  "<KB-N, item M>",
          },
        ],
        summary: "<1-2 sentence overall assessment of the artifact>",
      },
      null,
      2
    ),
    SECTION_DIVIDER,
  ].join("\n");

  // ── Final assembly ─────────────────────────────────────────────────────────
  return [
    "You are a structured evaluator. Evaluate the provided artifact using ONLY",
    "the Alexandrian Knowledge Base criteria below as your evaluation framework.",
    "Every finding MUST cite a specific KB by ID and item number.",
    "Do NOT give generic advice — all findings must be anchored to the criteria.",
    "",
    `TASK: ${taskDesc}`,
    ...(focusLine ? [`${focusLine}`] : []),
    "",
    artifactBlock,
    comparisonBlock,
    criteriaSections,
    outputFormat,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

function formatCriteriaSection(kb: SelectedKB, index: number): string {
  const id = `KB-${index + 1}`;
  // Use the TYPE_AGENT_BEHAVIOR hint by reference from enhanceQuery (KB title/type carry it)
  // Here we just output the metadata — the TYPE_AGENT_BEHAVIOR hints were already baked
  // into the enhanceQuery flow; we reproduce the key ones inline for criteria context.
  const criteriaNote = CRITERIA_AGENT_NOTE[kb.kbType] ?? "Apply this KB as an evaluation criterion.";

  const lines = [
    SECTION_DIVIDER,
    `${id} · ${kb.title} (${kb.kbType})`,
    `Domain: ${kb.domain}`,
    `Hash: ${kb.contentHash.slice(0, 18)}...`,
    `Criterion: ${criteriaNote}`,
    SECTION_DIVIDER,
  ];

  // Append summary as criteria context if available
  if (kb.summary) {
    lines.push(kb.summary);
  }

  return lines.join("\n");
}

/**
 * Short criterion instructions shown inline in the evaluation prompt.
 * These are stripped-down versions of TYPE_AGENT_BEHAVIOR for the evaluation context.
 */
const CRITERIA_AGENT_NOTE: Record<string, string> = {
  SecurityRule:        "Flag every violation found. Classify by severity.",
  AuditChecklist:      "Verify each item. Mark PASS / FAIL / WARNING.",
  AntiPattern:         "Check whether this anti-pattern appears. Flag every instance.",
  ViolationExample:    "Check for structural similarity to this violation.",
  BestPractice:        "Identify deviations from this standard.",
  ComplianceChecklist: "Verify each requirement. Flag CRITICAL / HIGH items first.",
  CodePattern:         "Check whether the artifact follows this pattern. Explain gaps.",
  Rubric:              "Score each dimension. Report pass / fail with evidence.",
  Practice:            "Verify the artifact follows these steps. Note any skipped steps.",
};

// ── Re-ranking ────────────────────────────────────────────────────────────────

function rerankByEvaluationPriority(kbs: SelectedKB[], limit: number): SelectedKB[] {
  return [...kbs]
    .sort((a, b) => {
      const pa = TYPE_PRIORITY[a.kbType] ?? 1;
      const pb = TYPE_PRIORITY[b.kbType] ?? 1;
      if (pb !== pa) return pb - pa; // highest priority first
      // Tie-break by reputation score (already sorted desc from subgraph)
      return b.reputationScore - a.reputationScore;
    })
    .slice(0, limit);
}

// ── Core evaluation function ──────────────────────────────────────────────────

/**
 * evaluateArtifact — retrieve criteria KBs and compose an evaluation prompt.
 *
 * This is the low-level entry point. You typically call this via
 * `alexandrian.review()`, `alexandrian.audit()`, or `alexandrian.compare()`.
 *
 * @param artifact          The code, system spec, or text to evaluate (verbatim).
 * @param mode              Evaluation mode: "review", "audit", or "compare".
 * @param options           KB discovery, caching, focus narrowing, and limit.
 * @param comparisonTarget  (compare mode only) The reference standard to compare against.
 * @returns                 `EvaluationQuery` — pass `evaluationPrompt` to your LLM.
 *
 * @example
 * const evaluation = await evaluateArtifact(myCode, "review", {
 *   focus: "SQL injection",
 *   cache: new MemoryCacheAdapter(),
 * });
 * // evaluation.evaluationPrompt → pass as LLM system message
 */
export async function evaluateArtifact(
  artifact: string,
  mode: EvaluationMode,
  options: EvaluationOptions = {},
  comparisonTarget?: string,
): Promise<EvaluationQuery> {
  const {
    focus,
    limit: desiredLimit = DEFAULT_EVAL_LIMIT,
    // Remaining fields are forwarded to enhanceQuery
    ...enhanceOptions
  } = options;

  // ── Build the KB discovery query ───────────────────────────────────────────
  // The artifact itself is NOT sent to the subgraph — only a mode+focus string
  // is used for domain inference and KB selection.
  const baseQuery = MODE_QUERIES[mode];
  const discoveryQuery = focus ? `${baseQuery} ${focus}` : baseQuery;

  // ── Resolve KB types ───────────────────────────────────────────────────────
  // User can override via options.types; otherwise use mode defaults.
  const resolvedTypes =
    enhanceOptions.types && enhanceOptions.types.length > 0
      ? enhanceOptions.types
      : MODE_DEFAULT_TYPES[mode];

  // ── Resolve domains ────────────────────────────────────────────────────────
  const hasDomains = enhanceOptions.domains && enhanceOptions.domains.length > 0;
  const resolvedDomains = hasDomains
    ? enhanceOptions.domains
    : (inferDomains(discoveryQuery) ?? undefined);

  // ── Fetch KBs via enhanceQuery — over-fetch to allow re-ranking ───────────
  // We fetch desiredLimit * 3 so the re-ranking has enough candidates to pick from.
  const enhanced = await enhanceQuery(discoveryQuery, {
    ...enhanceOptions,
    domains: resolvedDomains,
    types: resolvedTypes,
    limit: desiredLimit * 3,
  });

  // ── Re-rank by evaluation type priority, slice to desired limit ───────────
  const rankedKBs = rerankByEvaluationPriority(enhanced.kbsUsed, desiredLimit);

  // ── Compose evaluation prompt ──────────────────────────────────────────────
  const evaluationPrompt = composeEvaluationPrompt(
    artifact,
    mode,
    rankedKBs,
    comparisonTarget,
    focus,
  );

  // ── Count criteria KBs ────────────────────────────────────────────────────
  const criteriaCount = rankedKBs.filter((kb) => CRITERIA_TYPES.has(kb.kbType)).length;

  if (criteriaCount === 0) {
    enhanced.warnings.push(
      "No high-value criteria KBs found (SecurityRule, AuditChecklist, AntiPattern, etc.). " +
      "Evaluation will rely on general Practice KBs — results may be less precise."
    );
  }

  return {
    evaluationPrompt,
    kbsUsed:          rankedKBs,
    settlementPreview: enhanced.settlementPreview,
    fromCache:         enhanced.fromCache,
    warnings:          enhanced.warnings,
    taskMode:          mode,
    criteriaCount,
  };
}

// ── parseFindings ─────────────────────────────────────────────────────────────

/**
 * parseFindings — extract structured evaluation findings from LLM output.
 *
 * Looks for a `\`\`\`json ... \`\`\`` fenced block first, then tries to parse
 * the first `{...}` object found in the output. Returns `null` on parse failure
 * — never throws. Validate the result before use if strict typing is required.
 *
 * @param llmOutput  Raw string response from the LLM.
 * @returns          Typed `ParsedFindings` or `null` if the output cannot be parsed.
 *
 * @example
 * const findings = parseFindings(llmResponse);
 * if (findings) {
 *   const critical = findings.findings.filter(f => f.severity === "critical");
 * }
 */
export function parseFindings(llmOutput: string): ParsedFindings | null {
  if (!llmOutput || typeof llmOutput !== "string") return null;

  // Strategy 1: fenced JSON block  ```json ... ```
  const fenced = llmOutput.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) {
    const result = tryParseFindings(fenced[1].trim());
    if (result) return result;
  }

  // Strategy 2: first { ... } object in the response
  const braceStart = llmOutput.indexOf("{");
  const braceEnd   = llmOutput.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    const result = tryParseFindings(llmOutput.slice(braceStart, braceEnd + 1));
    if (result) return result;
  }

  return null;
}

function tryParseFindings(jsonStr: string): ParsedFindings | null {
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    // Validate minimum shape
    if (!parsed || typeof parsed !== "object") return null;

    const findings: EvaluationFinding[] = Array.isArray(parsed["findings"])
      ? (parsed["findings"] as EvaluationFinding[])
      : [];

    const checklistCoverage: EvaluationChecklistItem[] = Array.isArray(
      parsed["checklistCoverage"]
    )
      ? (parsed["checklistCoverage"] as EvaluationChecklistItem[])
      : [];

    const summary: string =
      typeof parsed["summary"] === "string" ? parsed["summary"] : "";

    return { findings, checklistCoverage, summary };
  } catch {
    return null;
  }
}
