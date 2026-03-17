/**
 * Concept canonicalization — map semantic variants to a single concept key
 * to prevent KB inflation (e.g. apply_circuit_breaker, enforce_circuit_breaker_pattern → circuit_breaker).
 *
 * Used in triangle/duplicate detection so conceptually identical artifacts are treated as one.
 */

/** Canonical concept stems. Any action/domain/title containing one of these maps to that stem. */
const CANONICAL_CONCEPT_STEMS = [
  "circuit_breaker",
  "saga",
  "reentrancy",
  "checks_effects",
  "sanitization",
  "secret_management",
  "event_emission",
  "indexed_event",
  "compensating_transaction",
  "retry_backoff",
  "rate_limiting",
  "authorization",
  "input_validation",
  "dependency_graph",
  "hierarchical_planning",
  "task_decomposition",
  "goal_definition",
  "context_compression",
  "semantic_search",
  "tool_invocation",
  "error_recovery",
  "guardrails",
  "schema_validation",
  "contract_pattern",
  "attribution",
] as const;

/** Normalize token for matching (lowercase, collapse non-alphanumeric to underscore). */
function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Return the canonical concept key for a given text (domain, title, or action).
 * If any CANONICAL_CONCEPT_STEMS appears as a substring, return that stem.
 * Otherwise return the normalized last segment (e.g. "architecture" from "software.architecture").
 */
export function canonicalizeConceptFromText(text: string, fallback: string): string {
  if (!text || typeof text !== "string") return fallback;
  const norm = normalizeToken(text);
  for (const stem of CANONICAL_CONCEPT_STEMS) {
    if (norm.includes(stem)) return stem;
  }
  return fallback;
}

/**
 * Canonical concept for an artifact: domain + title + first step action.
 * Used in triangle key so variants (apply_circuit_breaker, enforce_circuit_breaker_pattern)
 * map to the same concept and can be detected as semantic duplicates.
 */
export function canonicalConcept(
  domain: string,
  title: string,
  firstAction: string
): string {
  const combined = [domain, title, firstAction].filter(Boolean).join(" ");
  const fallback = domain
    ? normalizeToken(domain.split(".").pop() ?? domain)
    : "general";
  return canonicalizeConceptFromText(combined, fallback);
}
