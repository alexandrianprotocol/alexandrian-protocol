# 10k Artifacts: Reasoning Edges, Not Nodes

**Core rule:** Generate reasoning edges. Every non-seed artifact derives from other artifacts.

- **Derived_KB = f(parent_KB_1, parent_KB_2, … parent_KB_n)**
- The DAG grows like research papers (citation graph), not like isolated blog posts.

## Schema constraints (enforced)

1. **2–3 parents only**  
   Every non-seed artifact MUST reference **2 or 3** parents (`knowledge_inputs.used.length` in [2, 3]).  
   Enforced in: `builder.ts`, `validator.ts`.

2. **One reasoning transformation**  
   Each derived KB introduces exactly **one** of the five safe expansions (`knowledge_inputs.transformation`):  
   - **specialization** — narrow the concept  
   - **composition** — combine two techniques  
   - **optimization** — improve a method  
   - **failure_mode** — explain how something fails  
   - **evaluation** — measure whether something works  

3. **Cross-domain rule**  
   Selected parents must span **at least 2 distinct domain roots** (e.g. `agent` + `software`).  
   Enforced in: `selector.ts` (`selectParents(..., requireCrossDomain: true)`).  
   Prevents domain silos and forces cross-domain knowledge.

## Generator pipeline

```
seed artifacts
     → expansion candidates (factories with requiredDomains)
     → parent selection (2–3, cross-domain)
     → artifact generation (envelope → artifact with transformation)
     → deduplication (content hash)
     → graph validation (used.length 2–3, transformation set)
```

## Agent Retrieval Artifact (ARA)

- **Schema:** `alexandrian.kb.agent.v1`
- **Purpose:** ~80–200 byte object for capability discovery; indexer stores ARA; agents rank by capability/cost then fetch full artifact from IPFS if needed.
- **Derivation:** Deterministic projection from full artifact (`artifactToRetrievalArtifact()` in `lib/agent-retrieval.ts`). No drift.
- **Fields (short keys):** `h` (hash), `cap` (capabilities), `i` (inputs), `o` (outputs), `t` (token cost), `p` (parent count), `d` (domain).

## Ideal graph shape (target)

- **Seeds:** ~50–100  
- **First expansions:** ~300  
- **Second expansions:** ~2000  
- **Third+:** ~7000  
- **Depth:** 5–7 layers  

Most knowledge graphs never exceed depth 2; this design targets a deep reasoning DAG.

## Connectivity rule

Every artifact must reference at least one artifact from a **different domain** (different top-level segment).  
Enforced by requiring `requiredDomains` with ≥2 distinct roots and `selectParents(..., requireCrossDomain: true)`.

## Duplicate / dead-end policy (off-chain)

- **Deduplication:** Run `embedding_similarity(claim.statement, semantic.summary)` &lt; threshold (e.g. 0.90) in validator layer; reject if too similar.
- **Dead-ends:** Reject artifacts with no possible expansions (e.g. pure definitions or “history of X”).  
  Generator can check `artifact_has_possible_expansions` (e.g. procedure/algorithm types can spawn specialization, failure_mode, evaluation children).
