/**
 * Dimension-level scoring for upgraded seeds (UpgradedKBEntry).
 *
 * Goal: provide a rubric-compatible score and classification so the upgrade
 * pipeline can reason about executability/atomicity/epistemic honesty/depth.
 *
 * NOTE: This operates purely on UpgradedKBEntry (title/summary/procedure/etc.).
 * It does NOT modify entries or call OpenAI; it only scores and explains.
 */

import type { UpgradedKBEntry } from "../upgraded-kb-entry.js";
import { QUALITY_CONFIG, getDomainThresholds } from "../core/quality-config.js";

export interface DimensionScores {
  executability: 1 | 2 | 3;
  atomicity: 1 | 2 | 3;
  epistemicHonesty: 1 | 2 | 3;
  depth: 1 | 2 | 3;
  /** Weighted score on [1,3], 2.x ≈ standard, <1.8 = reject/marginal. */
  weighted: number;
  classification: "anchor" | "standard" | "marginal" | "reject";
  failureReasons: string[];
}

/**
 * Boilerplate step phrases that AI models emit as vague compliance moves.
 * A step containing any of these is always classified as vague by the scorer,
 * regardless of length or the presence of assert clauses — because the phrases
 * themselves carry no domain-specific mechanism knowledge.
 */
const BOILERPLATE_STEP_PHRASES_SCORING: RegExp[] = [
  /\bdomain-appropriate\s+tooling\b/i,
  /\binvoking\s+the\s+target\s+API\s+with\s+the\s+specified\s+parameters\b/i,
];

/** Identify procedurally vague steps in a plain-text procedure array. */
export function identifyVagueSteps(steps: string[]): string[] {
  const vagueVerbStart =
    /^(identify|implement|adjust|optimize|monitor|consider|ensure|review|handle|manage|use|apply|add|create|update|check|merge|detect|classify|iterate|integrate|combine|validate|define|build|deploy|collect|generate|process|compare|transform|evaluate|assess|configure|setup|enable|perform)\s/i;

  const { vagueVerbMinLength, mechanismRichMinLength } = QUALITY_CONFIG;

  function isVagueStep(step: string): boolean {
    const trimmed = step.trim();
    const words = trimmed.split(/\s+/).length;
    const startsWithVagueVerb = vagueVerbStart.test(trimmed);

    // Boilerplate AI phrases are always vague regardless of length or assertions.
    if (BOILERPLATE_STEP_PHRASES_SCORING.some((p) => p.test(trimmed))) return true;

    // Short vague step: definitely bad.
    if (startsWithVagueVerb && words < vagueVerbMinLength) return true;

    // Long step even with a vague verb: probably fine.
    if (words >= mechanismRichMinLength) return false;

    // Medium-length step with vague verb: still treat as vague.
    return startsWithVagueVerb;
  }

  return steps.filter((s) => isVagueStep(s)).map((s) => `"${s.slice(0, 60)}..."`);
}

/**
 * Score connectivity (1–3). Without corpus: proxy via references and tags.
 * With corpusIndex (domain → titles): can do real parent/cross-domain check later.
 */
export function scoreConnectivity(
  entry: UpgradedKBEntry,
  _corpusIndex?: Map<string, string[]>
): 1 | 2 | 3 {
  const hasReferences = (entry.references?.length ?? 0) >= 2;
  const referencesAreSpecific = (entry.references ?? []).every(
    (r) => r.length > 10 && !/^(https?:|www\.)/i.test(r)
  );
  const domainNorm = (entry as { domain?: string }).domain?.replace(/\s+/g, "") ?? "";
  const hasCrossdomainSignal = (entry.tags ?? []).some((t) => {
    const tagAsDomain = t.replace(/_/g, ".");
    return domainNorm && !domainNorm.includes(tagAsDomain) && tagAsDomain.length > 2;
  });

  if (hasReferences && referencesAreSpecific && hasCrossdomainSignal) return 3;
  if (hasReferences) return 2;
  return 1;
}

/** Detect trivially true numeric formulas that give no meaningful quality signal. */
function isTautology(expr: string): boolean {
  const trimmed = expr.trim();
  return (
    /^[\w.[\]'"]+\s*[<>]=?\s*0(?:\.0+)?\s*$/i.test(trimmed) ||
    /^[\w.[\]'"]+\s*<\s*100(?:\.0+)?\s*$/i.test(trimmed) ||
    /^[\w.[\]'"]+\s*!=\s*null\s*$/i.test(trimmed) ||
    /^[\w.[\]'"]+\s*[<>]=?\s*Infinity\s*$/i.test(trimmed)
  );
}

/** Detect measurable verification assertions beyond digit-only numeric comparisons. */
function hasMeasurableVerificationSignal(expr: string): boolean {
  return (
    /[<>=!]=?\s*(?:\d+(?:\.\d+)?(?:ms|s|m|h|%|kb|mb|gb|tb|gwei|wei)?|true|false|null)\b/i.test(expr) ||
    /[<>=!]=?\s*['"][^'"]+['"]/.test(expr) ||
    /[<>=!]=?\s*[a-z_][a-z0-9_]*(?:\([^)]*\))?/i.test(expr) ||
    /==\s*[A-Z][A-Z0-9 _.-]*/.test(expr) ||
    /\bassertEqual\s*\(/i.test(expr) ||
    /\b(?:assert|contains|matches|exists|len|count|hash|diff|query|is_directed_acyclic_graph)\s*\(/i.test(expr) ||
    /\bassert\s+(?:no\s+\w+|result\s+is\s+empty|all\b.+\bunique|all\b.+\bdefined|all\b.+\bcorrect|all\b.+\breachable)\b/i.test(expr) ||
    /\bassert\s+.+\s+is\s+(?:true|false|empty|unique|deallocated|navigable|correct)\b/i.test(expr) ||
    /\bassert\s+.+\s+matches\s+expected\b/i.test(expr) ||
    /\bassert\s+unique\s+\w+/i.test(expr) ||
    /\bassert\s+retry\s+\w+\s+(?:increase|grow)\s+exponentially\b/i.test(expr) ||
    /\bassert\s+identical\s+\w+\b/i.test(expr) ||
    /\bimplies\b/i.test(expr) ||
    /\bHTTP\s+\d{3}\b/i.test(expr) ||
    /\b\d+(?:\.\d+)?%\b/.test(expr) ||
    /±\s*\d+(?:\.\d+)?%/.test(expr) ||
    /\bnot\s+\*\b/.test(expr)
  );
}

/** Heuristic dimension scoring over an UpgradedKBEntry. Optional domain enables domain-aware executability patterns and thresholds. */
export function scoreDimensions(entry: UpgradedKBEntry, domain?: string): DimensionScores {
  const reasons: string[] = [];

  // ── Executability (1–3) ──────────────────────────────────────────────────
  // Heuristic: penalize if many steps are short/medium and vague; reward mechanism-rich steps.
  // Domain-aware: extend universal patterns with domain-specific constructs.
  const totalSteps = entry.procedure.length;
  const vague = identifyVagueSteps(entry.procedure);
  const vagueRatio = totalSteps > 0 ? vague.length / totalSteps : 1;
  const domainRoot = (domain ?? "").split(".")[0].toLowerCase();
  const UNIVERSAL_PATTERNS = [
    /using\s+[A-Z]/, // "using JWT", "using Redis"
    /via\s+\w+/, // "via pg_stat_statements"
    /\d+\s*(ms|s|%|MB|KB)/i, // concrete thresholds
    /SELECT|INSERT|UPDATE/i, // SQL
    /[a-z_]+\([^)]+\)/, // function calls
    /--[a-z]/, // CLI flags
    />|<|>=|<=|===/, // comparisons
  ];
  const DOMAIN_EXTRA_PATTERNS: Record<string, RegExp[]> = {
    evm: [/\.call\(/, /\.send\(/, /require\(/, /0x[a-fA-F0-9]{6}/, /\bgwei\b/i, /\bgas\b/i],
    ai: [/\btemperature\b/, /\btop_p\b/, /\bmax_tokens\b/, /tokens?[:=\s]\d/i, /\bembedding\b/i],
    web: [/fetch\(/, /res\.status/, /querySelector/, /\bHTTP\s+[A-Z]+/, /[45]\d{2}/],
    meta: [/keccak|sha256/i, /0x[a-fA-F0-9]{40}/, /ipfs:\/\//, /alexandrian\.kb\.v\d/],
  };
  const allPatterns = [...UNIVERSAL_PATTERNS, ...(DOMAIN_EXTRA_PATTERNS[domainRoot] ?? [])];
  const mechanismRichSteps = entry.procedure.filter((step) =>
    allPatterns.some((p) => p.test(step))
  ).length;

  let executability: 1 | 2 | 3;
  if (totalSteps === 0 || vagueRatio > 0.66) {
    executability = 1;
  } else if (vagueRatio > 0.33) {
    executability = 2;
  } else if (mechanismRichSteps >= 2) {
    // Score 3 requires low vague ratio AND concrete mechanisms in at least 2 steps.
    executability = 3;
  } else {
    executability = 2;
  }

  // Boost executability when several steps contain concrete mechanisms,
  // even if they start with otherwise vague verbs.
  if (mechanismRichSteps >= 3 && executability === 1) {
    executability = 2;
  }
  if (executability === 1) {
    reasons.push(
      `executability:low — ${vague.length}/${totalSteps} steps are vague (procedural verbs without concrete mechanisms): ${vague.join(
        ", "
      )}`
    );
  }

  // ── Atomicity (1–3) ──────────────────────────────────────────────────────
  // Score 1 if title is generic or combines multiple concepts (compound signals).
  // Score 3 if title is specific and summary is concise. Score 2 otherwise.
  const titleWords = entry.title.trim().split(/\s+/).length;
  const summaryWords = entry.summary.trim().split(/\s+/).length;
  const isGenericTitle = /derived|generated|artifact|kb$/i.test(entry.title);
  const COMPOUND_SIGNALS = [" and ", " with ", " plus ", " & ", "combination of", "overview of"];
  const hasCompoundConcept = COMPOUND_SIGNALS.some((s) => entry.title.toLowerCase().includes(s));
  let atomicity: 1 | 2 | 3;
  if (isGenericTitle || titleWords === 0 || hasCompoundConcept) atomicity = 1;
  else if (summaryWords <= 60) atomicity = 3;
  else atomicity = 2;
  if (atomicity === 1) {
    const reason = hasCompoundConcept
      ? `atomicity:low — title "${entry.title}" combines multiple concepts (compound signal detected)`
      : `atomicity:low — title "${entry.title}" is generic or missing`;
    reasons.push(reason);
  }

  // ── Epistemic Honesty (1–3) ──────────────────────────────────────────────
  // Graduated: formula+no-vague=3, formula-with-vague-or-tautology=2, no-real-formula=1.
  const verification = entry.verification ?? [];
  const VAGUE_WORDS = /\b(acceptable|reasonable|appropriate|sufficient|adequate)\b/i;
  const hasRealFormula = verification.some(
    (v) => hasMeasurableVerificationSignal(v) && !isTautology(v)
  );
  const hasAnyFormula = verification.some((v) => hasMeasurableVerificationSignal(v));
  const hasVagueVerification = verification.some((v) => VAGUE_WORDS.test(v));
  let epistemicHonesty: 1 | 2 | 3;
  if (hasRealFormula && !hasVagueVerification) {
    epistemicHonesty = 3;
  } else if (hasAnyFormula || hasRealFormula) {
    // Has a formula but also vague language, or formula is tautological
    epistemicHonesty = 2;
  } else {
    epistemicHonesty = 1;
  }
  if (epistemicHonesty === 1) {
    reasons.push(
      `epistemic_honesty:low — verification lacks measurable formulas or uses only vague language: ${verification.slice(0, 2).join(" | ")}`
    );
  }

  // ── Depth (1–3) ──────────────────────────────────────────────────────────
  // Simple heuristic: longer, more specific procedure steps → more depth.
  const longStepWordMin = QUALITY_CONFIG.mechanismRichMinLength;
  const longSteps = entry.procedure.filter((s) => s.trim().split(/\s+/).length > longStepWordMin).length;
  const hasFailureModes = (entry.failure_modes ?? []).length > 0;
  let depth: 1 | 2 | 3;
  if (longSteps >= 2 && hasFailureModes) depth = 3;
  else if (longSteps >= 1 || hasFailureModes) depth = 2;
  else depth = 1;
  if (depth === 1) {
    reasons.push(
      "depth:low — procedure steps and/or failure_modes lack domain-specific mechanism detail (short, generic statements)."
    );
  }

  // ── Connectivity (1–3) ───────────────────────────────────────────────────
  // Without corpus: proxy via references and tags. With corpusIndex: real parent/domain lookup.
  const connectivity = scoreConnectivity(entry, undefined);

  // ── Weighted score & classification ──────────────────────────────────────
  const w = QUALITY_CONFIG.dimensionWeights;
  const weightedRaw =
    executability * w.executability +
    atomicity * w.atomicity +
    epistemicHonesty * w.epistemicHonesty +
    depth * w.depth +
    connectivity * w.connectivity;
  const weighted = Math.round(weightedRaw * 100) / 100;
  const anyOne = [executability, atomicity, epistemicHonesty, depth].includes(1);
  const t = domain ? getDomainThresholds(domain) : QUALITY_CONFIG.gateThresholds;
  let classification: DimensionScores["classification"];
  if (weighted >= t.anchorMin && !anyOne) classification = "anchor";
  else if (weighted >= t.standardMin && !anyOne) classification = "standard";
  else if (weighted >= t.hardBlock) classification = "marginal";
  else classification = "reject";

  return {
    executability,
    atomicity,
    epistemicHonesty,
    depth,
    weighted,
    classification,
    failureReasons: reasons,
  };
}

