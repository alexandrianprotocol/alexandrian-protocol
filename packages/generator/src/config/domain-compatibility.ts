/**
 * Domain compatibility matrix — semantic coherence for expansion.
 *
 * Prevents nonsensical parent pairs (e.g. sql.optimization + software.security → reject)
 * and forces synthesis-only for distant domains (e.g. sql.optimization + agent.memory → composition only).
 * Same-domain or compatible domains get full allowed transformations via getAllowedTransformations().
 */

import { getDomainRoot } from "../lib/selector.js";

export type DomainPairPolicy = "allow" | "synthesis_only" | "reject";

/** Pairs of domain roots that must not be combined (nonsensical or low-value). */
const REJECT_PAIRS: [string, string][] = [
  ["sql", "software"],   // sql.optimization + software.security → reject
  ["evm", "agent"],      // evm.solidity + agent.memory → reject (unless synthesis)
  ["database", "security"],
];

/** Pairs that may only use composition (synthesis); no specialization/optimization etc. across these roots. */
const SYNTHESIS_ONLY_PAIRS: [string, string][] = [
  ["sql", "agent"],      // sql.optimization + agent.memory → synthesis only
  ["database", "agent"],
  ["evm", "software"],   // evm + software.security → synthesis only
];

function normalizeRoot(root: string): string {
  return root.toLowerCase().trim();
}

function pairKey(rootA: string, rootB: string): string {
  const [a, b] = [normalizeRoot(rootA), normalizeRoot(rootB)].sort();
  return `${a}|${b}`;
}

const REJECT_SET = new Set(REJECT_PAIRS.map(([a, b]) => pairKey(a, b)));
const SYNTHESIS_ONLY_SET = new Set(SYNTHESIS_ONLY_PAIRS.map(([a, b]) => pairKey(a, b)));

/**
 * Returns whether (domainA, domainB) is allowed for expansion, and if so whether only composition is allowed.
 * - reject: skip this parent pair (semantic nonsense or abuse).
 * - synthesis_only: allow only composition (cross-domain synthesis).
 * - allow: use full getAllowedTransformations() (same root or compatible).
 */
export function getDomainPairPolicy(domainA: string, domainB: string): DomainPairPolicy {
  const rootA = normalizeRoot(getDomainRoot(domainA));
  const rootB = normalizeRoot(getDomainRoot(domainB));
  if (rootA === rootB) return "allow";
  const key = pairKey(rootA, rootB);
  if (REJECT_SET.has(key)) return "reject";
  if (SYNTHESIS_ONLY_SET.has(key)) return "synthesis_only";
  return "allow";
}
