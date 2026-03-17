/**
 * Ontology enrichment — single place to suggest concept_id and invariant_id
 * for population of semantic.concepts and semantic.invariants.
 * Used by: generator, upgrade-seeds pipeline, repair. Keeps population logic
 * out of schema, retrieval, and docs (separation of concerns).
 */

import { getConceptIdsForDomainSignal } from "./concept-taxonomy.js";
import { buildKnowledgeOntology } from "./knowledge-ontology.js";
import type { KnowledgeOntology } from "./knowledge-ontology.js";

/** Map KB semantic.domain (or domain signal) to ontology domain_id for invariant lookup. */
const DOMAIN_SIGNAL_TO_ONTOLOGY_DOMAIN: Record<string, string> = {
  ui_ux: "ui_ux",
  "web.ux": "ui_ux",
  "web.frontend": "ui_ux",
  "web.ui": "ui_ux",
  api_backend: "api_backend",
  "web.backend": "api_backend",
  distributed: "distributed_systems",
  distributed_systems: "distributed_systems",
  cloud: "cloud_infrastructure",
  cloud_infrastructure: "cloud_infrastructure",
  security: "security",
  devops: "devops",
  data_engineering: "data_engineering",
  ai_systems: "ai_systems",
  ai_ml: "ai_systems",
  software_architecture: "software_architecture",
  architecture: "software_architecture",
  testing_quality: "testing_quality",
  testing: "testing_quality",
  observability: "observability",
  programming: "programming",
  networking: "networking",
  performance_engineering: "performance_engineering",
  performance: "performance_engineering",
};

let _cachedOntology: KnowledgeOntology | null = null;

function getOntology(): KnowledgeOntology {
  if (!_cachedOntology) _cachedOntology = buildKnowledgeOntology();
  return _cachedOntology;
}

/** Normalize domain string to ontology domain_id for invariant filtering. */
function toOntologyDomainId(domain: string): string | null {
  const d = (domain ?? "").toLowerCase().trim().replace(/\s+/g, "_");
  if (!d) return null;
  if (DOMAIN_SIGNAL_TO_ONTOLOGY_DOMAIN[d]) return DOMAIN_SIGNAL_TO_ONTOLOGY_DOMAIN[d];
  const firstSegment = d.split(/[._]/)[0];
  return DOMAIN_SIGNAL_TO_ONTOLOGY_DOMAIN[firstSegment] ?? null;
}

/**
 * Suggested concept_ids for a KB given its semantic.domain (and optional tags).
 * Use to populate semantic.concepts when absent. Generator and upgrade-seeds call this
 * so population logic lives in one place.
 */
export function getSuggestedConceptsForDomain(
  domain: string,
  _options?: { tags?: string[]; limit?: number }
): string[] {
  const limit = _options?.limit ?? 15;
  const ids = getConceptIdsForDomainSignal(domain);
  return ids.slice(0, limit);
}

/**
 * Suggested invariant_ids for a KB given its semantic.domain.
 * Use to populate semantic.invariants when desired. Same single-place contract as concepts.
 */
export function getSuggestedInvariantsForDomain(domain: string): string[] {
  const ontology = getOntology();
  const domainId = toOntologyDomainId(domain);
  if (!domainId) return [];
  return ontology.invariants
    .filter((inv) => inv.domain === domainId)
    .map((inv) => inv.invariant_id);
}

/**
 * Enrich semantic with suggested concepts and optionally invariants when missing.
 * Does not overwrite existing semantic.concepts / semantic.invariants.
 * Returns a new semantic-like object with concepts/invariants filled if they were empty.
 */
export function enrichSemanticFromOntology(
  domain: string,
  existing: { concepts?: string[]; invariants?: string[] },
  options?: { addInvariants?: boolean; conceptLimit?: number }
): { concepts: string[]; invariants?: string[] } {
  const concepts =
    existing.concepts?.length ? existing.concepts : getSuggestedConceptsForDomain(domain, { limit: options?.conceptLimit ?? 10 });
  const addInvariants = options?.addInvariants !== false;
  const invariants =
    addInvariants
      ? existing.invariants?.length ? existing.invariants : getSuggestedInvariantsForDomain(domain)
      : existing.invariants;
  return { concepts, ...(invariants?.length ? { invariants } : {}) };
}
