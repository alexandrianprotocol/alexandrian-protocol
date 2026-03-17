# Schema contract — required vs optional

Single source of truth for validators, indexers, and downstream consumers.

## Required for all artifacts

| Section | Fields | Notes |
|--------|--------|--------|
| **identity** | kb_id, epistemic_type, title, version, status, is_seed, schema | kb_id filled at build; schema v2.4 or v2.5 |
| **claim** | statement, confidence, falsifiable | confidence may be null (unassessed) |
| **semantic** | summary, tags, domain, difficulty | Optional: capabilities (string[]), execution_class (reasoning \| transformation \| evaluation \| validation). |
| **knowledge_inputs** | minimum_required, recommended, composition_type, used | composition_type deprecated (use transformation) |
| **reasoning** | requires, contradicts, related | |
| **execution** | trust_tier, execution_mode, determinism, idempotent | |
| **validation** | success_conditions, failure_conditions, metrics | |
| **payload** | artifact_type, location, interface, inline_artifact | interface: inputs, outputs, parameters |
| **evidence** | sources, benchmarks, notes | |
| **provenance** | author, royalty_bps, lineage | author.address set at publish |

## Required for derived only

| Field | Rule |
|-------|------|
| **knowledge_inputs.used** | length 2 or 3 (reasoning-edge rule) |
| **knowledge_inputs.transformation** | one of: specialization, composition, optimization, failure_mode, evaluation |

## Optional

| Field | Purpose |
|-------|---------|
| **payload.location** | `inline` (default) \| `ipfs` \| `url` \| `hybrid`. Use **hybrid** when the KB has inline content and references IPFS modules via artifact_refs (seed-with-module). |
| **state_transition** | GDKR: input_state, output_state. Set for seeds in capability loop; leave unset for derived. |
| **execution.cost_estimate** | time_complexity, expected_latency_ms, expected_token_cost, resource_class. Agent strategy selection. |
| **execution.preconditions** | string[] e.g. "tool:postgres_available". Lets agents skip artifacts they can't satisfy. |
| **payload.interface.\*.default** | Default for parameters (v2.5). |
| **semantic.capabilities** | string[] e.g. task_planning, goal_decomposition. Improves retrieval beyond domain. |
| **semantic.execution_class** | reasoning \| transformation \| evaluation \| validation. Helps agents pick artifacts by role. |

## Deprecated

| Field | Use instead |
|-------|-------------|
| **knowledge_inputs.composition_type** | **transformation** for derivation semantics. Keep for backward compatibility; new artifacts can set "merge". |

## Seeds vs derived

- **Seeds:** knowledge_inputs.used = []. state_transition set when seed is in capability loop (planning, validation, error recovery, etc.).
- **Derived:** knowledge_inputs.used length 2–3, transformation set. state_transition left unset (state graph stays seed-centric).

---

## Traceability and dual-layer (v2.5)

These optional additions make artifacts more machine-reasoning and audit-friendly without restructuring the schema.

### reasoning.requires

- **Before:** `requires: string[]` (kb_ids only).
- **Now:** `requires: (string | { kb_id: string, reason?: string })[]`. Each entry may include a **reason** explaining why this KB is required (for reasoning engines and auditing). Backward compatible: plain strings still valid.

### knowledge_inputs.used

- **Before:** `used: { kb_id, role }[]`.
- **Now:** each entry may include **contribution** (string): what this parent contributed. Optional; improves traceability and composition.

### validation.success_conditions / failure_conditions

- **Before:** `string[]`.
- **Now:** `(string | { id?: string, condition: string })[]`. Optional **id** anchors a condition for machine comparison across artifacts (e.g. content-addressed `kb_hash#cond_0`). No global registry; ids are local or derived. Backward compatible: plain strings still valid.

### narrative (optional)

- **New:** top-level **narrative?: { purpose?, design_rationale?, context? }**. Semantic compression: keep the artifact core small and machine-readable; put human explanations (purpose, rationale, context) here. Recommended for seeds and high-value anchors; optional for standard artifacts.
