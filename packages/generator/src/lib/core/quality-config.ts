/**
 * Central quality thresholds and weights for scoring and gating.
 * Single source of truth so tuning after distribution data changes one file.
 */

export interface GateThresholds {
  /** Below this weighted score → failed bucket (hard block). */
  hardBlock: number;
  /** Below this → marginal bucket (soft block, repair queue). Above → refined. */
  marginalMax: number;
  /** Standard minimum (refined). */
  standardMin: number;
  /** Anchor minimum (refined, high quality). */
  anchorMin: number;
}

export const QUALITY_CONFIG = {
  gateThresholds: {
    hardBlock: 1.8,
    marginalMax: 2.2,
    standardMin: 2.2,
    anchorMin: 2.6,
  } as GateThresholds,
  dimensionWeights: {
    executability: 0.25,
    atomicity: 0.2,
    connectivity: 0.2,
    epistemicHonesty: 0.15,
    depth: 0.2,
  },
  pipelineAlerts: {
    /** Exit 1 if fail rate exceeds this (e.g. 15%). */
    maxFailRate: 0.15,
    /** Warn (exit 0) if marginal rate exceeds this (e.g. 30%). */
    maxMarginalRate: 0.3,
  },
  /** Steps below this word count that start with vague verbs → penalized. */
  vagueVerbMinLength: 8,
  /** Steps above this word count with vague verb → not penalized (mechanism-rich). */
  mechanismRichMinLength: 12,
};

/**
 * Domain-specific quality overrides (longest prefix match wins).
 * Stricter domains require higher scores to reach standard/refined.
 */
export const DOMAIN_QUALITY_OVERRIDES: Record<string, Partial<GateThresholds>> = {
  "software.security": { marginalMax: 1.9, standardMin: 2.3 },
  "evm.":              { marginalMax: 2.0, standardMin: 2.4 },
  "ai.":               { marginalMax: 1.7, standardMin: 2.1 },
  "meta.":             { marginalMax: 1.6, standardMin: 2.0 },
};

/** Max repair+rescore attempts before a marginal KB is filed to the marginal bucket. */
export const MARGINAL_RESCORE_MAX = 2;

/**
 * Return gate thresholds for a domain, applying any domain-specific override (longest prefix match).
 * Falls back to default QUALITY_CONFIG thresholds when no override matches.
 */
export function getDomainThresholds(domain: string): GateThresholds {
  const base = QUALITY_CONFIG.gateThresholds;
  const overrideKey = Object.keys(DOMAIN_QUALITY_OVERRIDES)
    .filter((k) => domain.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  if (!overrideKey) return base;
  return { ...base, ...DOMAIN_QUALITY_OVERRIDES[overrideKey] };
}
