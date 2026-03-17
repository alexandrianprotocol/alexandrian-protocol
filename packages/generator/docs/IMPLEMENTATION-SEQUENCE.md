# Implementation Sequence & Separation of Concerns

This document captures the right order to implement protocol layers and how to keep concerns separated so no single component owns schema, ontology, repair, and indexing.

---

## 1. Separation of Concerns

| Concern | Owner | Responsibility | Does not own |
|--------|--------|----------------|--------------|
| **Schema & structure** | `validator.ts` | Required fields, types, step count, interface shape, artifact_refs format | Ontology IDs, repair prompts, indexer state |
| **Step graph / data flow** | `validator.ts` | Step inputs must exist in interface or previous step produces (STEP_GRAPH guard) | Semantic quality, epistemic depth |
| **Ontology reference validity** | `ontology-compliance.ts` | Every `semantic.concepts` / `semantic.invariants` id exists in exported ontology | Schema validity, population logic |
| **Population (concepts/invariants)** | `ontology-enrichment.ts` | Suggest concept_id and invariant_id from domain; enrich when missing | Validation, retrieval scoring |
| **Retrieval & ranking** | `knowledge-retrieval-engine.ts` | Task → concepts → candidate KBs → ranking using concept overlap, domain, procedural quality | Enrichment, validation |
| **Documentation** | `documentation-artifact.ts` | Build doc from KB; use `semantic.concepts` when present, else infer from domain | Ontology building, validation |
| **Repair (AI)** | Upgrade-seeds pipeline | Dimension-scoped repair (Executability+Connectivity first, then Epistemic+Depth); immutable field guard; audit log | Schema rules, ontology compliance |
| **Indexer** | Indexer spec + impl | Events → graph state; queries (GetArtifact, GetNeighbors, RouteTask, GetDeprecatedWarnings); no validation logic | Validator, repair, ontology |

**Principles:**

- **Validator** is the single source of truth for “is this artifact structurally valid?” including step graph. It does not call the ontology.
- **Ontology compliance** is an optional, separate check: “do declared concept/invariant IDs exist?” Run after schema validation when you need strict compliance (e.g. pre-publish).
- **Enrichment** is the single place that says “for this domain, these are the suggested concepts/invariants.” Generator and upgrade-seeds call it; they do not duplicate domain→concept mapping.
- **Repair** uses validator (and optionally ontology-compliance) as gates; it does not re-encode schema or step-graph rules in JS.

---

## 2. Implementation Order

Correct sequence so each layer rests on a solid previous one:

1. **Validator completeness**  
   Ensure TS validator has every rule the JS repair script relies on (including step graph guard, correctness/determinism if used, metric formula if added). Document every rule it enforces. Do not merge two incomplete validators.

2. **Upgrade-seeds integration**  
   One AI repair path: upgrade-seeds CLI as thin wrapper over TS pipeline. Dimension-scoped repair: attempt 1 = Executability + Connectivity; attempt 2 = Epistemic Honesty + Depth. Exit code contract: non-zero when any artifact is flagged for regeneration or validation fails.

3. **Derivation contracts**  
   Schema block for parent–child consistency (allowed transformations, required inherited fields). Validator enforces it.

4. **Indexer spec**  
   Full 10–15 page spec: events consumed, data structures maintained, query surface, consistency guarantees. Not a one-pager; underspec leads to an underspecified indexer.

5. **Execution feedback loop**  
   Indexer collects execution outcomes; routing weight adjustment only after baseline data exists.

---

## 3. Immediate Improvements (Already Done or To Do)

| Item | Status | Notes |
|------|--------|--------|
| Step graph guard | Done | Validator: step inputs must be in interface or previous step produces (`STEP_GRAPH` error). |
| Ontology enrichment module | Done | `ontology-enrichment.ts`: `getSuggestedConceptsForDomain`, `getSuggestedInvariantsForDomain`, `enrichSemanticFromOntology`. Single place for population. |
| Ontology compliance check | Done | `ontology-compliance.ts`: `validateArtifactOntologyCompliance(artifact, ontology?)`. Optional strict step. |
| Dimension-scoped repair | To do | Attempt 1: Executability + Connectivity. Attempt 2: Epistemic Honesty + Depth. Prevents model trading off one dimension against another. |
| Exit code contract | To do | upgrade-seeds (or TS pipeline) exits non-zero when any artifact fails validation or is flagged for regeneration; CI can gate on it. |
| Consolidate validators | To do | Document all rules in JS repair script; port to TS validator as canonical; then reduce JS to thin CLI over TS. |

---

## 4. Deferred but Not Dropped

- **family_id:** Add to schema as optional; generator inherits from seed. Do not require or build indexer queries on it until artifact count justifies families.
- **Knowledge decay / routing weight:** Define `last_execution_timestamp` and `execution_count` in indexer schema now; do not implement routing weight adjustment until there is enough execution volume for a baseline.
- **Transformation vocabulary:** Before making transformation a closed enum, audit staging for values (e.g. `"merge"`); add migration mapping if current values are outside the new set (e.g. specialization, generalization, composition, adaptation, optimization, failure_mode, evaluation, variant).

---

## 5. Indexer Spec Scope

The indexer is the component that makes everything else work and has received the least design attention. The spec should be **full** (10–15 pages), not one page, and include:

- **Events consumed:** ArtifactPublished, ArtifactDeprecated, ExecutionOutcome, ArtifactRetired (or equivalent).
- **Data structures:** Provenance DAG, reasoning graph, concept index, capability index, execution stats.
- **Query surface:** GetArtifact, GetNeighbors, RouteTask, GetDeprecatedWarnings — with inputs, outputs, and guarantees.
- **Consistency:** Ordering, idempotency, and how deprecated/retired state propagates.

Writing this to the level of precision that allows someone to build the indexer is a prerequisite for scaling to 10k+ artifacts.

---

## 6. Where Population Fits

- **Generator / upgrade-seeds:** Call `getSuggestedConceptsForDomain(domain)` and optionally `getSuggestedInvariantsForDomain(domain)` from `ontology-enrichment.ts` to set `semantic.concepts` and `semantic.invariants` when absent.
- **Extra domains (6a–6c):** When human_behavior, technology_stack, production_documentation are added to DOMAIN_REGISTRY and concept/invariant data, enrichment and retrieval will use them as long as KBs set (or inference sets) `semantic.concepts` / `semantic.invariants`.
- **Validation:** Use `validateArtifactOntologyCompliance()` in a separate “ontology compliance” step or CI gate so invalid concept_id/invariant_id are rejected or repaired; keep this separate from schema validation.
