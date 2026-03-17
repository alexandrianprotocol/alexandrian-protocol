/**
 * Ontology compliance — validate that KB semantic.concepts and semantic.invariants
 * reference only IDs that exist in the exported ontology. Separate from schema/structure
 * validation so it can be run optionally (e.g. strict CI) or as a dedicated step.
 */

import { buildKnowledgeOntology } from "./knowledge-ontology.js";
import type { KnowledgeOntology } from "./knowledge-ontology.js";

export interface OntologyComplianceResult {
  compliant: boolean;
  errors: string[];
  /** concept_ids in artifact that are not in ontology */
  unknown_concepts: string[];
  /** invariant_ids in artifact that are not in ontology */
  unknown_invariants: string[];
}

/**
 * Validate that every semantic.concepts and semantic.invariants id exists in the ontology.
 * Call this after schema validation when you want strict ontology compliance (e.g. before publish).
 */
export function validateArtifactOntologyCompliance(
  artifact: unknown,
  ontology?: KnowledgeOntology
): OntologyComplianceResult {
  const ont = ontology ?? buildKnowledgeOntology();
  const conceptIds = new Set(ont.concepts.map((c) => c.concept_id));
  const invariantIds = new Set(ont.invariants.map((i) => i.invariant_id));
  const errors: string[] = [];
  const unknown_concepts: string[] = [];
  const unknown_invariants: string[] = [];

  const semantic = (artifact as { semantic?: { concepts?: string[]; invariants?: string[] } })?.semantic;
  if (!semantic) return { compliant: true, errors: [], unknown_concepts: [], unknown_invariants: [] };

  const concepts = semantic.concepts ?? [];
  const invariants = semantic.invariants ?? [];

  for (const id of concepts) {
    if (!id || typeof id !== "string") continue;
    if (!conceptIds.has(id)) {
      unknown_concepts.push(id);
      errors.push(`semantic.concepts: unknown concept_id in ontology: ${id}`);
    }
  }
  for (const id of invariants) {
    if (!id || typeof id !== "string") continue;
    if (!invariantIds.has(id)) {
      unknown_invariants.push(id);
      errors.push(`semantic.invariants: unknown invariant_id in ontology: ${id}`);
    }
  }

  return {
    compliant: errors.length === 0,
    errors,
    unknown_concepts,
    unknown_invariants,
  };
}
