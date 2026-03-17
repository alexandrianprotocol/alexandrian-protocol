# Knowledge Retrieval & Ranking Engine (KRRE)

The KRRE determines **which KBs, artifacts, and ontology concepts** should load for a given task. It sits between task input and knowledge loading so agents get a small, relevant set instead of scanning thousands of items.

## Purpose

- **Input:** Natural-language task (e.g. "design a SaaS authentication system").
- **Output:** Ranked KB candidates, suggested artifacts, and concept IDs for that task.

Without retrieval ranking, agents may load 1000+ KBs; with the KRRE they load **20–40 highly relevant** KBs and a bounded set of artifacts.

## Pipeline

```
task
  ↓
concept extraction (task text + routed capabilities)
  ↓
ontology lookup (concept IDs)
  ↓
candidate KB retrieval (capability index)
  ↓
artifact retrieval (concepts → suggested artifacts + KB artifact_refs)
  ↓
ranking (concept overlap, domain match, procedural quality, artifact connections)
  ↓
top-K selection
```

## Stages

1. **Task analysis** — Task string is used to route to capabilities (existing capability router) and to extract concept signals (keyword match on ontology concept names/descriptions).
2. **Concept mapping** — Task + routed capabilities are mapped to canonical concept IDs via the concept taxonomy and domain-signal map.
3. **Candidate KB retrieval** — The capability index returns all KBs in the clusters that matched the task.
4. **Artifact retrieval** — For each concept, suggested artifacts are resolved; artifact_refs from top KBs are included.
5. **Ranking** — Each candidate KB is scored:
   - **Concept overlap** (0.35) — Overlap between task concepts and KB’s domain-derived concepts.
   - **Domain match** (0.25) — Whether the KB’s domain belongs to the routed capabilities.
   - **Procedural quality** (0.20) — Normalized procedural specificity score.
   - **Artifact connections** (0.20) — Whether the KB has artifact_refs (more refs → higher).
6. **Top-K** — Candidates are sorted by score; top-K KBs and top artifacts are returned.

## CLI

```bash
node dist/index.js --mode retrieve --task "design authentication system"
```

Options:

- `--task "..."` — **Required.** Task description.
- `--top-k 20` — Max KB candidates (default 20).
- `--top-artifacts 15` — Max artifact IDs (default 15).

Output: JSON with `task`, `concepts`, `related_concepts`, `kb_candidates`, `artifacts`, `routed_capabilities`.

Example:

```json
{
  "task": "design authentication system",
  "concepts": ["API_AUTHENTICATION", "SEC_TOKEN_JWT", "UI_PATTERN_AUTH_LOGIN"],
  "related_concepts": ["API_AUTH_JWT", "SEC_AUTHENTICATION", ...],
  "kb_candidates": [
    { "kb_hash": "0x1ad07cb3", "title": "Design Authentication API", "domain": "web.backend", "score": 0.82, ... }
  ],
  "artifacts": ["api_design_standards", "authentication_patterns", ...],
  "routed_capabilities": [ { "capability": "Backend", "score": 0.9 }, { "capability": "Security", "score": 0.85 } ]
}
```

Use this for debugging and for feeding downstream execution planning and agent tools.

## Module

- **`src/lib/knowledge-retrieval-engine.ts`**
  - `retrieve(task, pool, options?)` → `RetrievalResult`
  - Uses: capability-router, capability-clusters, concept-taxonomy, capability-routing-pipeline (procedural quality).

## Indexes

- **KB index:** Built from the staging queue; capability index maps capability name → list of `QueueRecord`. No separate persistent index file is required for the CLI; the queue is loaded and indexed in memory.
- **Artifact index:** Artifacts are resolved from concept taxonomy (`getSuggestedArtifactsForConcept`) and from KB `artifact_refs`.

For production (e.g. a long-running service), you can precompute and persist the capability index and optionally add vector embeddings for hybrid retrieval.

## Hybrid retrieval (future)

Best results often come from combining:

- **Symbolic** — concept IDs, tags, domains (current implementation).
- **Semantic** — embeddings of task and KB summary; nearest-neighbor search.

The current engine is fully symbolic. Adding task/KB embeddings and a vector index would allow hybrid scoring (e.g. 0.5 symbolic + 0.5 semantic).

## Integration

The retrieval output is designed to feed:

1. **Execution planner** — Plan steps from top KBs and attach artifacts.
2. **Agent tools** — An `alexandrian_retrieve` tool can call this and return the same structure to the agent.
3. **Documentation / derivation** — Top KBs and artifacts can be used to generate docs or derive new KBs.

See **AGENT-INTEGRATION.md** for how to expose this as an agent tool and combine with plan, derive, and document.
