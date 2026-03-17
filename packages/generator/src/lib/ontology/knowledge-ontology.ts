/**
 * Knowledge Ontology Layer — master concept registry that ties seeds, artifacts,
 * invariants, and composition into a coherent conceptual graph.
 * All artifacts and KB seeds reference this ontology (concept_id, invariant_id).
 */

import { CONCEPT_TAXONOMY, CONCEPT_RELATIONSHIPS } from "./concept-taxonomy.js";
import type { ConceptEntry, ConceptRelationship } from "./concept-taxonomy.js";
import { conceptDomainToArtifactDomain } from "./concept-taxonomy.js";

export const ONTOLOGY_VERSION = "1.0";
export const ONTOLOGY_SCHEMA = "alexandrian.ontology.v1";

/** Domain registry entry. */
export interface DomainEntry {
  domain_id: string;
  name: string;
  description: string;
}

/** Concept entry in ontology (concept registry). May include aliases. */
export interface ConceptEntryOntology {
  concept_id: string;
  domain: string;
  name: string;
  description: string;
  category?: string;
  aliases?: string[];
  related_concepts?: string[];
}

/** Relationship entry (relationship graph). */
export type OntologyRelationshipType =
  | "depends_on"
  | "implements"
  | "extends"
  | "composes"
  | "validates"
  | "references"
  | "applies_to"
  | "related_to";

export interface RelationshipEntry {
  source: string;
  relationship: OntologyRelationshipType;
  target: string;
}

/** Technique registry entry (derivation/generation techniques). */
export interface TechniqueEntry {
  technique_id: string;
  name: string;
  description: string;
}

/** Invariant registry entry. */
export interface InvariantEntry {
  invariant_id: string;
  domain: string;
  description: string;
  related_concepts?: string[];
}

/** Full ontology root (single JSON file). */
export interface KnowledgeOntology {
  ontology_version: string;
  schema: string;
  domains: DomainEntry[];
  concepts: ConceptEntryOntology[];
  relationships: RelationshipEntry[];
  techniques: TechniqueEntry[];
  invariants: InvariantEntry[];
}

/** Domain registry: domain_id → name, description. */
const DOMAIN_REGISTRY: DomainEntry[] = [
  { domain_id: "ui_ux", name: "User Interface and User Experience", description: "Concepts related to interface design and usability" },
  { domain_id: "api_backend", name: "API and Backend Services", description: "API design, services, and backend patterns" },
  { domain_id: "distributed_systems", name: "Distributed Systems", description: "Distributed architecture, consistency, resilience" },
  { domain_id: "cloud_infrastructure", name: "Cloud Infrastructure", description: "Cloud platforms, deployment, scaling" },
  { domain_id: "security", name: "Security Engineering", description: "Authentication, authorization, validation, secrets" },
  { domain_id: "devops", name: "DevOps and Platform Engineering", description: "CI/CD, deployment, infrastructure" },
  { domain_id: "data_engineering", name: "Data Engineering", description: "Data pipelines, storage, ETL" },
  { domain_id: "ai_systems", name: "AI and ML Systems", description: "Models, training, inference" },
  { domain_id: "software_architecture", name: "Software Architecture", description: "System design, patterns, boundaries" },
  { domain_id: "testing_quality", name: "Testing and Quality", description: "Unit, integration, e2e, quality" },
  { domain_id: "observability", name: "Observability and SRE", description: "Logging, metrics, tracing, SRE" },
  { domain_id: "programming", name: "Programming and Stacks", description: "Languages and technology stack decisions" },
  { domain_id: "networking", name: "Networking", description: "Network protocols and communication" },
  { domain_id: "performance_engineering", name: "Performance Engineering", description: "Latency, throughput, optimization" },
];

/** Technique registry. */
const TECHNIQUE_REGISTRY: TechniqueEntry[] = [
  { technique_id: "TECH_DOMAIN_COMPOSITION", name: "Domain Composition", description: "Combining knowledge artifacts from multiple domains to generate a complete solution." },
  { technique_id: "TECH_SEED_EXPANSION", name: "Seed Expansion", description: "Expanding a seed KB into variants or child derivations." },
  { technique_id: "TECH_ARTIFACT_INJECTION", name: "Artifact Injection", description: "Injecting IPFS or reference artifacts into a KB." },
  { technique_id: "TECH_CONSTRAINT_VALIDATION", name: "Constraint Validation", description: "Applying invariants and validation rules to artifacts." },
  { technique_id: "TECH_PATTERN_INSTANTIATION", name: "Pattern Instantiation", description: "Instantiating a design pattern for a specific context." },
  { technique_id: "TECH_SPECIALIZATION", name: "Specialization", description: "Narrowing a concept in a derivation." },
  { technique_id: "TECH_GENERALIZATION", name: "Generalization", description: "Broadening a concept in a derivation." },
  { technique_id: "TECH_ADAPTATION", name: "Adaptation", description: "Adapting knowledge to another context or domain." },
];

/** Invariant registry (core set). */
const INVARIANT_REGISTRY: InvariantEntry[] = [
  { invariant_id: "INV_API_DETERMINISTIC_RESPONSE", domain: "api_backend", description: "API responses must be deterministic for identical requests.", related_concepts: ["API_PATTERN_REST_RESOURCE"] },
  { invariant_id: "INV_UI_PRIMARY_ACTION_VISIBILITY", domain: "ui_ux", description: "Primary action must be clearly visible and affordant.", related_concepts: ["UI_COMPONENT_BUTTON", "UI_PATTERN_AUTH_LOGIN"] },
  { invariant_id: "INV_DIST_IDEMPOTENT_CONSUMER", domain: "distributed_systems", description: "Message consumers must be idempotent to allow safe retries.", related_concepts: ["DIST_QUEUE_MESSAGE", "DIST_PATTERN_CIRCUIT_BREAKER"] },
  { invariant_id: "INV_SEC_INPUT_VALIDATION", domain: "security", description: "All external input must be validated and sanitized.", related_concepts: ["SEC_INPUT_VALIDATION", "API_PATTERN_REST_RESOURCE"] },
  { invariant_id: "INV_OBS_TRACE_PROPAGATION", domain: "observability", description: "Distributed traces must propagate context across service boundaries.", related_concepts: ["OBS_TRACING_DISTRIBUTED", "API_SERVICE_LAYER"] },
];

/** Artifact domain (from concept taxonomy) → ontology domain_id (must match DOMAIN_REGISTRY). */
const ARTIFACT_DOMAIN_TO_ONTOLOGY_DOMAIN: Record<string, string> = {
  ui_ux: "ui_ux",
  api_backend: "api_backend",
  distributed: "distributed_systems",
  cloud: "cloud_infrastructure",
  security: "security",
  devops: "devops",
  data_engineering: "data_engineering",
  ai_systems: "ai_systems",
  architecture: "software_architecture",
  programming: "programming",
  testing: "testing_quality",
  observability: "observability",
  networking: "networking",
  performance: "performance_engineering",
};

/** Map ConceptTaxonomyDomain to ontology domain_id (snake_case, must exist in DOMAIN_REGISTRY). */
function toOntologyDomain(domain: string): string {
  const d = domain ?? "";
  if (!d) return "";
  const artifactDomain = conceptDomainToArtifactDomain(d as import("./concept-taxonomy.js").ConceptTaxonomyDomain);
  return (ARTIFACT_DOMAIN_TO_ONTOLOGY_DOMAIN[artifactDomain] ?? artifactDomain) || d.toLowerCase().replace(/\s+/g, "_");
}

/** Convert ConceptEntry to ConceptEntryOntology (add aliases placeholder, normalize domain). */
function toOntologyConcept(c: ConceptEntry): ConceptEntryOntology {
  const domain = toOntologyDomain(c.domain);
  return {
    concept_id: c.concept_id,
    domain,
    name: c.name,
    description: c.description,
    category: c.category,
    related_concepts: c.related_concepts,
    aliases: [], // Optional: add from a map or leave for manual enrichment
  };
}

/** Map existing relationship type to OntologyRelationshipType. */
function toOntologyRelationship(r: ConceptRelationship): RelationshipEntry {
  return {
    source: r.source,
    relationship: r.relationship as OntologyRelationshipType,
    target: r.target,
  };
}

/** Build the full Knowledge Ontology from concept taxonomy + registries. */
export function buildKnowledgeOntology(): KnowledgeOntology {
  return {
    ontology_version: ONTOLOGY_VERSION,
    schema: ONTOLOGY_SCHEMA,
    domains: [...DOMAIN_REGISTRY],
    concepts: CONCEPT_TAXONOMY.map(toOntologyConcept),
    relationships: CONCEPT_RELATIONSHIPS.map(toOntologyRelationship),
    techniques: [...TECHNIQUE_REGISTRY],
    invariants: [...INVARIANT_REGISTRY],
  };
}

export interface OntologyValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate ontology: unique concept ids, relationship references, domain references. */
export function validateOntology(ontology: KnowledgeOntology): OntologyValidationResult {
  const errors: string[] = [];
  const conceptIds = new Set(ontology.concepts.map((c) => c.concept_id));
  const domainIds = new Set(ontology.domains.map((d) => d.domain_id));

  for (const c of ontology.concepts) {
    if (!c.concept_id) errors.push("Concept missing concept_id");
    if (!domainIds.has(c.domain)) errors.push(`Concept ${c.concept_id} references unknown domain: ${c.domain}`);
    if (c.related_concepts) {
      for (const r of c.related_concepts) {
        if (!conceptIds.has(r)) errors.push(`Concept ${c.concept_id} related_concepts references unknown: ${r}`);
      }
    }
  }

  for (const r of ontology.relationships) {
    if (!conceptIds.has(r.source)) errors.push(`Relationship source not in concepts: ${r.source}`);
    if (!conceptIds.has(r.target)) errors.push(`Relationship target not in concepts: ${r.target}`);
  }

  for (const inv of ontology.invariants) {
    if (!domainIds.has(inv.domain)) errors.push(`Invariant ${inv.invariant_id} references unknown domain: ${inv.domain}`);
    if (inv.related_concepts) {
      for (const rc of inv.related_concepts) {
        if (!conceptIds.has(rc)) errors.push(`Invariant ${inv.invariant_id} related_concepts references unknown: ${rc}`);
      }
    }
  }

  const techniqueIds = new Set(ontology.techniques.map((t) => t.technique_id));
  if (techniqueIds.size !== ontology.techniques.length) {
    errors.push("Duplicate technique_id in techniques registry");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
