## Alexandrian Indexer Specification (High-Level)

This document captures the required behavior of the Alexandrian indexer for the current schema, with emphasis on:

- `epistemic_type` (declarative | procedural | evaluative)
- `kb_type` (procedure, pattern, invariant, constraint, evaluation, transformation, protocol, artifact_spec, context, anti_pattern, heuristic)
- Agent Retrieval Artifact (ARA) fields `et` and `kt`
- Compound query **GetByType(epistemic_type, kb_type, domain)**

### 1. Inputs (Events)

- `ArtifactPublished(artifact: KBv24Artifact)`
- `ArtifactDeprecated(kb_id)`
- `ExecutionOutcome(kb_id, success:boolean, timestamp, metadata)`
- `ArtifactRetired(kb_id)`

### 2. Stored Structures

- **Provenance DAG**: parents → children from `knowledge_inputs.used` and `provenance.lineage.depth`.
- **Reasoning graph**: optional `state_transition` edges (input_state → output_state).
- **Concept index**: from `semantic.concepts` and ontology.
- **Capability index**: from `semantic.domain`, `semantic.tags`, `semantic.capabilities`.
- **Type index**: compound `(epistemic_type, kb_type, domain)` from identity and semantic.
- **Execution stats**: success rate, last_execution_timestamp, execution_count per kb.
- **Agent Retrieval Artifacts (ARA)**: compact projection including `et` (epistemic_type) and `kt` (kb_type).

### 3. ARA Fields (for reference)

From `types/artifact.ts`:

- `h`: kb_id
- `cap`: capabilities (domain/tags)
- `i`/`o`: interface I/O names
- `t`: token cost estimate
- `p`: parent count
- `d`: domain
- `st`: optional state transition
- `ec`: optional execution class
- `et`: `EpistemicType` (declarative | procedural | evaluative)
- `kt`: `KBType` (procedure, pattern, invariant, constraint, evaluation, transformation, protocol, artifact_spec, context, anti_pattern, heuristic)

### 4. Required Queries

- `GetArtifact(kb_id)` → full artifact or ARA + pointer to storage.
- `GetNeighbors(kb_id)` → parents, children, and related reasoning edges.
- `RouteTask(task_description)` → thin wrapper over KRRE + capability routing (outside this file).
- `GetDeprecatedWarnings(kb_id)` → list of ancestors/descendants with deprecated status.
- **`GetByType(epistemic_type, kb_type, domain)`**:
  - Input:
    - `epistemic_type` ∈ {`declarative`, `procedural`, `evaluative`}
    - `kb_type` ∈ KBType enum
    - `domain` = semantic.domain (prefix match allowed)
  - Output:
    - Ordered list of ARA handles or kb_ids, sorted by:
      1. `execution.trust_tier` (higher first, or policy-defined)
      2. `execution` success rate from `ExecutionOutcome` events
  - Backed by a **compound index** over `(et, kt, d)` from ARA.

### 5. Context KB Semantics

For `kb_type: "context"`:

- The indexer/materializer must interpret the single `context_result` output as a `ContextKBOutput`:
  - `kb_ids: string[]`
  - `by_type?: Record<string, string[]>`
- Evaluating a context KB (e.g. as part of `RouteTask`) should:
  - Use internal indexes or queries to populate `ContextKBOutput`.
  - Sort candidates by trust tier and success rate.
  - **Enforce a hard cap** (e.g. `kb_ids.length <= 40`) and truncate beyond that cap before returning to agents.
  - Return the ordered, truncated `kb_ids` (and optional `by_type`) as the starting set for downstream retrieval/routing.

### 6. Consistency Notes

- All ontology IDs referenced in `semantic.concepts` / `semantic.invariants` must exist in the exported ontology (enforced by `ontology-compliance` step, not by the indexer).
- The indexer treats artifacts as immutable; status changes (deprecated/retired) are expressed through separate events and reflected in query results, not by mutating stored artifact content.

