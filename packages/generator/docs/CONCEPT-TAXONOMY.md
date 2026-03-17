# Concept Taxonomy for Engineering

Stable, hierarchical ontology of canonical engineering concepts. Format: **`<DOMAIN>_<CATEGORY>_<CONCEPT>`**. Used for routing, artifact composition, and KB seed classification.

## Structure

- **concept_id**: Stable identifier (e.g. `UI_COMPONENT_BUTTON`, `DIST_PATTERN_CIRCUIT_BREAKER`).
- **domain**: Top-level domain (UI_UX, API_BACKEND, DISTRIBUTED_SYSTEMS, CLOUD_INFRASTRUCTURE, SECURITY, DEVOPS, DATA_ENGINEERING, AI_SYSTEMS, SOFTWARE_ARCHITECTURE, TESTING_QUALITY, OBSERVABILITY, etc.).
- **category**: Subdivision within domain (component, pattern, protocol, layer, …).
- **name**: Human-readable name.
- **description**: Short description.
- **related_concepts**: Optional list of concept_ids.

Relationships (e.g. `depends_on`, `applies_to`) are stored separately in **CONCEPT_RELATIONSHIPS** and can be traversed via **getRelatedConcepts** / **getRelationshipsFor**.

## Top-level domains

| Domain | Role |
|--------|------|
| UI_UX | Frontend components, layout, patterns, accessibility, design systems |
| API_BACKEND | Protocols, patterns, auth, layers |
| DISTRIBUTED_SYSTEMS | Patterns, consistency, consensus, messaging, infra |
| CLOUD_INFRASTRUCTURE | Platform, storage, network, compute, IaC |
| SECURITY | Auth, encryption, validation, secrets, assessment |
| DEVOPS | CI/CD, deployment, observability, incident |
| DATA_ENGINEERING | Models, storage, pipelines, processing |
| AI_SYSTEMS | Models, training, evaluation, deployment |
| SOFTWARE_ARCHITECTURE | Patterns, boundaries, techniques, principles |
| TESTING_QUALITY | Test types, techniques, quality tools |
| OBSERVABILITY | Metrics, logging, tracing, alerting, dashboards |

(Plus PROGRAMMING, NETWORKING, PERFORMANCE_ENGINEERING for future expansion.)

## Usage

### Routing

Map task text to concepts, then to artifacts:

- Task: “build login page” → concepts: `UI_PATTERN_AUTH_LOGIN`, `API_AUTH_JWT` → artifacts: `ui_login_patterns`, `api_design_standards`.

### Artifact composition

- **getSuggestedArtifactsForConcept(concept_id)** returns suggested artifact names for that concept (e.g. `UI_PATTERN_AUTH_LOGIN` → `ui_login_patterns`, `ui_form_patterns`).
- Composition engine can resolve concept_ids to artifact_refs and merge invariants/procedures from those artifacts.

### KB seed classification

Seeds can carry a **concepts** array of concept_ids instead of (or in addition to) free-text domain/tags:

```json
{
  "semantic": {
    "domain": "ui_ux",
    "concepts": ["UI_PATTERN_AUTH_LOGIN", "UI_ACCESSIBILITY_WCAG"]
  }
}
```

(If your schema supports an optional `concepts` field, the taxonomy provides the canonical IDs.)

### Concept graph

- **getConcept(id)**: Get one concept.
- **getConceptsByDomain(domain)**: All concepts in a domain.
- **getConceptsByCategory(domain, category)**: Filter by category.
- **getRelatedConcepts(id)**: Related concept_ids (from `related_concepts` and relationship targets).
- **getRelationshipsFor(id)**: Relationships where this concept is source.
- **conceptDomainToArtifactDomain(domain)**: Map taxonomy domain to artifact-library domain slug.

## Scaling to ~2000 concepts

Current module holds a **representative subset** (~200 concepts). To scale:

1. Add concepts to **CONCEPT_TAXONOMY** in the same format; keep **concept_id** stable and unique.
2. Add **CONCEPT_RELATIONSHIPS** for depends_on, applies_to, implements, etc.
3. Extend **getSuggestedArtifactsForConcept** (or a config file) so high-value concept_ids map to artifact names for composition.
4. Optional: export taxonomy to JSON (e.g. for indexer or external tools) via a small script or `--mode export-concept-taxonomy`.

## File location

- **Types and data**: `src/lib/concept-taxonomy.ts`
- **Integration**: Capability router and artifact library can be extended to accept concept_ids; composition can use **getSuggestedArtifactsForConcept** and **getRelatedConcepts** to drive artifact selection.
