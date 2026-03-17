# Taxonomies Required for the Knowledge Ontology Layer

The Knowledge Ontology Layer is the master concept registry that ties seeds, artifacts, invariants, and the composition engine into a coherent conceptual graph. Everything references it so vocabulary stays consistent and routing/composition can use concept relationships.

Below is the **list of taxonomies** needed to complete the implementation.

---

## 1. Domain Registry

**Purpose:** Major knowledge areas; every artifact and KB references a domain.

| Field | Type | Description |
|-------|------|-------------|
| `domain_id` | string | Stable id (e.g. `ui_ux`, `api_backend`) |
| `name` | string | Human name (e.g. "User Interface and User Experience") |
| `description` | string | Short description of the domain |

**Required domains (minimal set):**

- `ui_ux` — User Interface and User Experience
- `api_backend` — API and Backend Services
- `distributed_systems` — Distributed Systems
- `cloud_infrastructure` — Cloud Infrastructure
- `security` — Security Engineering
- `devops` — DevOps and Platform Engineering
- `data_engineering` — Data Engineering
- `ai_systems` — AI and ML Systems
- `software_architecture` — Software Architecture
- `testing_quality` — Testing and Quality
- `observability` — Observability and SRE
- `programming` — Programming Languages and Stacks
- `networking` — Networking
- `performance_engineering` — Performance Engineering

**Extended set (for senior-level system):**

- `human_behavior` — Human behavior observable through software (interaction, error, misuse, operational patterns)
- `technology_stack` — Programming language and technology stack decision frameworks
- `production_documentation` — Production-grade system design and engineering documentation practices

---

## 2. Concept Registry

**Purpose:** Core building blocks; all artifacts and KB seeds reference concepts by `concept_id` instead of free text.

| Field | Type | Description |
|-------|------|-------------|
| `concept_id` | string | Stable id (e.g. `UI_AUTH_LOGIN_FORM`, `API_AUTHENTICATION_ENDPOINT`) |
| `domain` | string | domain_id this concept belongs to |
| `name` | string | Short display name |
| `description` | string | What the concept means |
| `category` | string | Optional sub-group (e.g. component, pattern, layout) |
| `aliases` | string[] | Optional alternative names for matching |
| `related_concepts` | string[] | Other concept_ids for graph traversal |

**Naming convention:** `<DOMAIN>_<CATEGORY>_<CONCEPT>` (e.g. `UI_PATTERN_AUTH_LOGIN`, `SEC_AUTH_TOKEN`).

**Existing source:** `CONCEPT_TAXONOMY` in `concept-taxonomy.ts` (ConceptEntry). Ontology layer adds `aliases` and normalizes `domain` to snake_case domain_id.

---

## 3. Relationship Graph

**Purpose:** Connects concepts so agents can discover required artifacts and compose knowledge.

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | concept_id (source node) |
| `relationship` | string | Relationship type (see below) |
| `target` | string | concept_id (target node) |

**Relationship types:**

- `depends_on` — Source requires target (e.g. login form depends on auth API)
- `implements` — Source implements target (e.g. REST resource implements HTTP)
- `extends` — Source extends or specializes target
- `composes` — Source is composed of target(s)
- `validates` — Source validates target
- `references` — Source references target (weaker than depends_on)
- `applies_to` — Source pattern applies to target (existing in concept-taxonomy)
- `related_to` — General relation (existing)

**Existing source:** `CONCEPT_RELATIONSHIPS` in `concept-taxonomy.ts`. Ontology layer uses the same structure and may add types.

**Validation:** Every `source` and `target` must exist in the Concept Registry.

---

## 4. Technique Registry

**Purpose:** Methods used to generate or modify knowledge (derivation techniques).

| Field | Type | Description |
|-------|------|-------------|
| `technique_id` | string | Stable id (e.g. `TECH_DOMAIN_COMPOSITION`) |
| `name` | string | Short name |
| `description` | string | What the technique does |

**Suggested techniques:**

- `TECH_DOMAIN_COMPOSITION` — Combining knowledge from multiple domains into a complete solution
- `TECH_SEED_EXPANSION` — Expanding a seed into variants or children
- `TECH_ARTIFACT_INJECTION` — Injecting IPFS/reference artifacts into a KB
- `TECH_CONSTRAINT_VALIDATION` — Applying invariants and validation rules
- `TECH_PATTERN_INSTANTIATION` — Instantiating a design pattern for a context
- `TECH_SPECIALIZATION` — Narrowing a concept (derivation transformation)
- `TECH_GENERALIZATION` — Broadening a concept
- `TECH_ADAPTATION` — Adapting knowledge to another context

These can appear in derivation metadata and in the composition engine.

---

## 5. Invariant Registry

**Purpose:** Engineering invariants that artifacts and KBs can reference by id.

| Field | Type | Description |
|-------|------|-------------|
| `invariant_id` | string | Stable id (e.g. `INV_API_DETERMINISTIC_RESPONSE`) |
| `domain` | string | domain_id |
| `description` | string | The invariant statement |
| `related_concepts` | string[] | concept_ids this invariant applies to |

**Naming convention:** `INV_<DOMAIN>_<NAME>`.

**Examples:**

- `INV_API_DETERMINISTIC_RESPONSE` — API responses must be deterministic for identical requests
- `INV_UI_PRIMARY_ACTION_VISIBILITY` — Primary action must be clearly visible
- `INV_DIST_IDEMPOTENT_CONSUMER` — Message consumers must be idempotent
- `INV_SEC_INPUT_VALIDATION` — All external input must be validated

**Existing source:** High-value invariant seeds and anti-pattern seeds can be linked to invariant_ids once this registry exists.

---

## 6. Additional Domains (Senior-Level System)

These **taxonomies** extend the ontology for production-grade coverage. They are not required for the minimal ontology but complete the implementation for “senior-level” reasoning.

### 6.1 Human Behavior Observable Through Software

**Domain id:** `human_behavior` (or sub-domains under `ui_ux` / `reliability`).

**Concepts to add (examples):**

- User interaction behavior (scan vs read, abandon after friction, repeat failed actions, misunderstand ambiguous UI)
- Error behavior patterns (incorrect input, copy-paste mistakes, wrong assumptions)
- System misuse patterns (repeated retries, script abuse, high-frequency actions)
- Operational behavior (misconfigured env, wrong deployment steps, manual hotfixes)

**Use:** Product engineering, reliability, security, and UX KBs reference these for edge cases and mitigations.

### 6.2 Programming Language & Technology Stack Decision Framework

**Domain id:** `technology_stack` or `programming`.

**Concepts to add (examples):**

- Systems programming (C, C++, Rust) — when to use
- Backend service languages (Java, Go, Python, Node.js)
- Frontend languages and frameworks (JavaScript, TypeScript, React, Angular, Vue)
- Data & analytics languages (Python, R, SQL)
- Stack patterns: MEAN, MERN, LAMP, cloud-native (React + Node + PostgreSQL + K8s)

**Use:** Stack selection KBs and architecture KBs reference these for technology decisions.

### 6.3 Production-Grade System Design and Documentation Practices

**Domain id:** `production_documentation` or split across `software_architecture`, `devops`, `observability`.

**Concepts to add (examples):**

- Architecture documentation (system overview, component diagram, data flow, dependencies)
- API documentation (endpoints, request/response, error codes)
- Operational documentation (deployment, env config, runbooks, incident procedures)
- Architecture Decision Records (ADR)
- Observability and reliability documentation (metrics, SLOs, runbooks)

**Use:** Documentation generator and documentation artifacts reference these; KBs for “production system design” and “engineering documentation” link to them.

---

## 7. Ontology Storage and Validation

**Storage options:**

- Single file: `ontology.json` (ontology_version, domains, concepts, relationships, techniques, invariants)
- Split modules: `ontology/domains.json`, `ontology/concepts.json`, `ontology/relationships.json`, `ontology/techniques.json`, `ontology/invariants.json`

**Validation (validateOntology):**

- All `concept_id` values in the concept registry are unique
- Every `source` and `target` in relationships exists in the concept registry (or in a dedicated relationship node set)
- Every `domain` in concepts, domains, and invariants refers to an entry in the domain registry
- Every `related_concepts` and `aliases` array entries are valid (optional strict check)

---

## 8. How Artifacts and KB Seeds Use the Ontology

KBs reference the ontology via **`semantic.concepts`** and **`semantic.invariants`** (optional). These fields are part of the KBv2.4/v2.5 schema.

- **`semantic.concepts`** — Array of ontology concept_ids (e.g. `["UI_AUTH_LOGIN_FORM", "API_PATTERN_REST_RESOURCE"]`). When present, routing and retrieval use these for concept overlap and documentation concept_mapping; when absent, concepts are inferred from `semantic.domain`.
- **`semantic.invariants`** — Array of ontology invariant_ids (e.g. `["INV_API_DETERMINISTIC_RESPONSE", "INV_UI_PRIMARY_ACTION_VISIBILITY"]`). Enables composition and validation to align with the invariant registry.

**IPFS reference artifacts** (Universal Artifact Schema) may also include `concepts` and `invariants` in their metadata for the same purpose.

- **Documentation generator:** Uses `semantic.concepts` when present for the doc’s concept_mapping section; otherwise infers from domain.
- **Retrieval engine:** Uses `semantic.concepts` when present for ranking (concept overlap with task); otherwise uses domain-inferred concepts.
- **Composition engine:** Task → ontology lookup (concept_ids) → load KBs/artifacts that reference those concepts → compose into system plan.
- **Population:** Use `ontology-enrichment.ts`: `getSuggestedConceptsForDomain(domain)`, `getSuggestedInvariantsForDomain(domain)`, and `enrichSemanticFromOntology()` so generator and upgrade-seeds have one place for concept/invariant population.
- **Strict validation:** Use `ontology-compliance.ts`: `validateArtifactOntologyCompliance(artifact, ontology?)` as an optional step to reject or repair invalid concept_id/invariant_id. See `docs/IMPLEMENTATION-SEQUENCE.md` for separation of concerns and implementation order.

---

## 9. Summary Checklist

| # | Taxonomy | Purpose | Status in codebase |
|---|----------|---------|--------------------|
| 1 | Domain Registry | Master list of domains with name/description | Partially (CONCEPT_DOMAINS); add full registry |
| 2 | Concept Registry | concept_id, domain, name, description, aliases, related | CONCEPT_TAXONOMY; add aliases, normalize domain |
| 3 | Relationship Graph | source, relationship, target | CONCEPT_RELATIONSHIPS; add types extends, composes, validates, references |
| 4 | Technique Registry | technique_id, name, description | New |
| 5 | Invariant Registry | invariant_id, domain, description, related_concepts | New |
| 6a | Human behavior concepts | Sub-domain or domain for behavioral patterns | Extension |
| 6b | Language/stack concepts | Technology stack decision concepts | Extension |
| 6c | Production documentation concepts | Documentation and ADR concepts | Extension |

Implementing 1–5 completes the **core Knowledge Ontology Layer**. Adding 6a–6c extends it for senior-level, production-grade coverage.

---

## 10. Implementation (codebase)

- **Module:** `src/lib/knowledge-ontology.ts` — Types (`KnowledgeOntology`, `DomainEntry`, `ConceptEntryOntology`, `RelationshipEntry`, `TechniqueEntry`, `InvariantEntry`), `buildKnowledgeOntology()`, `validateOntology()`.
- **Domain registry:** In-code `DOMAIN_REGISTRY` (14 domains). Concepts and relationships come from `concept-taxonomy.ts`; techniques and invariants from in-code registries.
- **CLI:** `node dist/index.js --mode export-ontology` writes `staging/ontology.json`. Use `--split` to write `staging/ontology/domains.json`, `concepts.json`, `relationships.json`, `techniques.json`, `invariants.json`.
- **Validation:** Ensures concept ids are unique, relationship source/target exist in concepts, and domain references exist in the domain registry.
