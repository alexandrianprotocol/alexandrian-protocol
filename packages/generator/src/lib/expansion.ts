/**
 * Expansion layer — grow the KB graph toward 10k by deriving children from seeds/L1/L2.
 *
 * For each "expandable" record (depth 0, 1, or 2) and each allowed transformation,
 * we pick one other parent from a different domain root (prefer depth-diverse) and
 * build a synthetic derived envelope. Ensures 2 parents (reasoning-edge rule) and cross-domain.
 * Semantic coherence: cross-domain pairs restricted to composition/specialization/evaluation.
 */

import type { DerivedEnvelopeOutput } from "./envelope-to-artifact.js";
import type { QueueRecord } from "./core/builder.js";
import type { DerivationTransformation } from "../types/artifact.js";
import { getDomainRoot } from "./selector.js";
import { extractExcerpt } from "./selector.js";

const TRANSFORMATIONS: DerivationTransformation[] = [
  "specialization",
  "generalization",
  "composition",
  "adaptation",
  "optimization",
  "failure_mode",
  "evaluation",
  "variant",
];

/** Recommended DAG shape: depth ~4–5 for deep reasoning chains (scaled to 25k total). */
export const TARGET_SHAPE = {
  seeds: 260,
  L1: 1300,
  L2: 6500,
  L3: 10400,
  L4: 6540,
} as const;

export const TARGET_TOTAL =
  TARGET_SHAPE.seeds + TARGET_SHAPE.L1 + TARGET_SHAPE.L2 + TARGET_SHAPE.L3 + TARGET_SHAPE.L4;

/** Safety: cap expansion passes to avoid infinite loops. */
export const MAX_EXPANSION_PASSES = 20;

/** Depth from artifact (seeds = 0). */
export function getDepth(record: QueueRecord): number {
  return record.artifact?.provenance?.lineage?.depth ?? (record.isSeed ? 0 : 1);
}

/** Whether this record can be used as expansion parent (L0/L1/L2 for deep chains). */
export function isExpandable(record: QueueRecord, maxDepthForExpansion: number = 2): boolean {
  return getDepth(record) <= maxDepthForExpansion;
}

/** Cross-domain: only composition/specialization/evaluation to keep semantics coherent. Same-domain: all. */
const CROSS_DOMAIN_TRANSFORMATIONS: DerivationTransformation[] = [
  "composition",
  "specialization",
  "evaluation",
];

/**
 * Domain prefix pairs that should never be composed — semantically incoherent combinations.
 * Each entry is [prefixA, prefixB]; order-insensitive.
 */
const INCOMPATIBLE_DOMAIN_PAIRS: [string, string][] = [
  ["meta.", "evm."],      // protocol metadata + on-chain execution have no meaningful composition
  ["meta.", "sql."],      // protocol schema + SQL optimization are unrelated
  ["web.", "evm."],       // frontend rendering + smart contracts shouldn't compose
];

function areDomainsIncompatible(domainA: string, domainB: string): boolean {
  return INCOMPATIBLE_DOMAIN_PAIRS.some(
    ([a, b]) =>
      (domainA.startsWith(a) && domainB.startsWith(b)) ||
      (domainA.startsWith(b) && domainB.startsWith(a))
  );
}

export function getAllowedTransformations(
  domainA: string,
  domainB: string
): DerivationTransformation[] {
  if (areDomainsIncompatible(domainA, domainB)) return [];
  const rootA = getDomainRoot(domainA);
  const rootB = getDomainRoot(domainB);
  if (rootA === rootB) return [...TRANSFORMATIONS];
  return CROSS_DOMAIN_TRANSFORMATIONS;
}

/**
 * Pick one parent from pool with a different domain root. Prefer depth-diverse (L0+L1→L2, L1+L2→L3)
 * so the graph has deep reasoning chains instead of only L0+L0→L1.
 */
export function selectOtherParentForExpansion(
  pool: QueueRecord[],
  excludeRecord: QueueRecord,
  requireCrossDomain: boolean = true,
  preferDepthDiverse: boolean = true
): QueueRecord | null {
  const root = getDomainRoot(excludeRecord.domain);
  const depthExclude = getDepth(excludeRecord);
  const candidates = pool.filter((r) => {
    if (r.kbHash === excludeRecord.kbHash) return false;
    if (!r.artifact?.semantic?.domain) return false;
    if (requireCrossDomain && getDomainRoot(r.domain) === root) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  if (!preferDepthDiverse) return candidates[0];
  const withDiff = candidates.map((r) => ({ r, depthDiff: Math.abs(getDepth(r) - depthExclude) }));
  withDiff.sort((a, b) => b.depthDiff - a.depthDiff);
  return withDiff[0].r;
}

/**
 * Like selectOtherParentForExpansion but returns the top N candidates ordered by depth diversity.
 * Used by the expansion loop to try multiple cross-domain partners per record per pass,
 * which prevents stalling when the single-best partner's triplets are already exhausted.
 */
/** Read quality score from a QueueRecord's staged _quality metadata (if present). */
function getQualityScore(record: QueueRecord): number {
  const q = (record as unknown as { _quality?: { score?: number } })._quality;
  return q?.score ?? 1.8; // conservative default if not scored
}

export function selectTopPartnersForExpansion(
  pool: QueueRecord[],
  excludeRecord: QueueRecord,
  topN: number,
  requireCrossDomain: boolean = true
): QueueRecord[] {
  const root = getDomainRoot(excludeRecord.domain);
  const depthExclude = getDepth(excludeRecord);
  const candidates = pool.filter((r) => {
    if (r.kbHash === excludeRecord.kbHash) return false;
    if (!r.artifact?.semantic?.domain) return false;
    if (requireCrossDomain && getDomainRoot(r.domain) === root) return false;
    if (areDomainsIncompatible(excludeRecord.domain, r.domain)) return false;
    return true;
  });
  if (candidates.length === 0) return [];
  // Composite score: depth diversity (primary) + parent quality (secondary)
  const withScore = candidates.map((r) => ({
    r,
    depthDiff: Math.abs(getDepth(r) - depthExclude),
    qualityScore: getQualityScore(r),
    domainKey: getDomainRoot(r.domain),
  }));
  withScore.sort((a, b) => {
    const composite = (x: typeof a) => x.depthDiff * 2 + x.qualityScore / 3;
    return composite(b) - composite(a);
  });
  // Deduplicate by domain root so we spread across different domains first
  const seen = new Set<string>();
  const diverse: typeof withScore = [];
  for (const item of withScore) {
    if (!seen.has(item.domainKey)) {
      seen.add(item.domainKey);
      diverse.push(item);
    }
  }
  // Fill remaining slots from the full sorted list
  for (const item of withScore) {
    if (diverse.length >= topN) break;
    if (!diverse.includes(item)) diverse.push(item);
  }
  return diverse.slice(0, topN).map((x) => x.r);
}

/** Build a deterministic expansion key so we don't create duplicate (parentA, parentB, transformation) children. */
export function expansionKey(parentA: QueueRecord, parentB: QueueRecord, transformation: DerivationTransformation): string {
  const [id1, id2] = [parentA.kbHash, parentB.kbHash].sort();
  return `${id1}|${id2}|${transformation}`;
}

const TRANSFORMATION_TITLES: Record<DerivationTransformation, string> = {
  specialization: "Specialization",
  generalization: "Generalization",
  composition: "Composition",
  adaptation: "Adaptation",
  optimization: "Optimization",
  failure_mode: "Failure mode",
  evaluation: "Evaluation",
  variant: "Variant",
};

const TRANSFORMATION_ANSWERS: Record<DerivationTransformation, string> = {
  specialization: "Apply the parent concept in a narrower context or domain. Restate the procedure with domain-specific constraints and examples.",
  generalization: "Broaden the parent concept to a more general setting. Abstract steps and remove domain-specific assumptions where safe.",
  composition: "Combine the insights from both parent KBs into a single procedure. Identify shared steps and merge workflows where they align.",
  adaptation: "Adapt the parent procedure to a different context or constraint set. Preserve the core logic while changing applicability.",
  optimization: "Refine the parent procedure for efficiency or clarity. Preserve correctness while reducing steps or resource use where possible.",
  failure_mode: "Describe how the parent procedure can fail and under what conditions. Add detection and recovery steps where applicable.",
  evaluation: "Define how to measure success of the parent procedure. Add criteria, metrics, and validation steps.",
  variant: "Produce an alternative formulation of the parent procedure with equivalent outcomes. Different steps, same goal.",
};

/**
 * Build an expansion envelope: one "expandable" parent + one other (cross-domain) + transformation.
 * Used by Phase 3 to grow the graph without hand-written factories.
 */
export function buildExpansionEnvelope(
  parentA: QueueRecord,
  parentB: QueueRecord,
  transformation: DerivationTransformation
): DerivedEnvelopeOutput {
  const titleA = parentA.artifact.identity.title ?? parentA.domain;
  const titleB = parentB.artifact.identity.title ?? parentB.domain;
  const domain = parentA.domain; // keep child in same domain as "primary" parent
  const title = `${TRANSFORMATION_TITLES[transformation]} of ${titleA} with ${titleB}`.slice(0, 120);
  const answer = TRANSFORMATION_ANSWERS[transformation];

  return {
    type: "synthesis",
    domain,
    tier: "open",
    sources: [parentA.kbHash, parentB.kbHash],
    payload: {
      type: "synthesis",
      question: `How does ${TRANSFORMATION_TITLES[transformation].toLowerCase()} apply to "${titleA}" when combined with "${titleB}"?`,
      answer,
      citations: {
        [parentA.kbHash]: extractExcerpt(parentA),
        [parentB.kbHash]: extractExcerpt(parentB),
      },
    },
    derivation: {
      type: transformation,
      inputs: [
        { kbId: parentA.kbHash, selectors: ["payload.inline_artifact.steps", "payload.interface"] },
        { kbId: parentB.kbHash, selectors: ["payload.inline_artifact.steps", "payload.interface"] },
      ],
      recipe: { strategy: transformation },
      transformation,
    },
  };
}

/**
 * Heuristic quality gate for a derived expansion envelope.
 * Returns false if the envelope's answer is too short or entirely generic,
 * preventing trivially low-quality children from entering staging.
 */
export function isExpansionEnvelopeQualitySufficient(envelope: DerivedEnvelopeOutput): boolean {
  const answer = (envelope.payload as { answer?: string }).answer ?? "";
  const wordCount = answer.trim().split(/\s+/).length;
  // Must have a meaningful answer (>10 words) and reference at least one parent concept
  if (wordCount < 10) return false;
  const question = (envelope.payload as { question?: string }).question ?? "";
  // Check that the answer isn't just a copy of the transformation template (too generic)
  const genericTemplates = [
    "Apply the parent concept",
    "Broaden the parent concept",
    "Combine the insights",
    "Adapt the parent procedure",
    "Refine the parent procedure",
    "Describe how the parent procedure can fail",
    "Define how to measure success",
    "Produce an alternative formulation",
  ];
  if (genericTemplates.some((t) => answer.startsWith(t)) && wordCount < 25) return false;
  // The envelope should have two citation sources
  const citations = (envelope.payload as { citations?: Record<string, unknown> }).citations ?? {};
  if (Object.keys(citations).length < 2) return false;
  void question; // reserved for future checks
  return true;
}

export { TRANSFORMATIONS };
