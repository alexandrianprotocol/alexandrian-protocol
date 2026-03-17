# Rating: 10k KB generation system

Assessment of the current pipeline for producing 10k operational, agent-useful Knowledge Blocks.

---

## Summary score: **7.5 / 10** — ready for a first 10k run with clear gaps to close later

---

## What’s strong

| Area | Rating | Notes |
|------|--------|--------|
| **Schema design** | 8/10 | Single canonical artifact (v2.5); structured steps + interface + cost_estimate; optional state_transition and preconditions. Clear split: full artifact on IPFS, ARA for discovery. No duplicate concepts. |
| **Reasoning-edge rules** | 8/10 | 2–3 parents and transformation enforce “edges not nodes.” Cross-domain parent selection avoids silos. Validator and builder enforce these; generator emits compliant artifacts. |
| **Generator pipeline** | 7/10 | Seeds (100 super-seeds) → derived (15 factories, 2–3 parents, cross-domain) → dedup → write. Deterministic hash, staging queue. Straightforward to run. |
| **Agent-facing surface** | 8/10 | ARA (~80–200 B) with h, cap, i, o, t, p, d, st. Goal-directed routing possible when state_transition is set. Cost and parent count support strategy selection. |
| **Registry alignment** | 8/10 | Minimal on-chain (curator, timestamp, queryFee, exists, artifactHash, cidDigest). Event-driven indexes. No schema bloat on-chain. |

---

## What’s missing or weak

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| **Scale to 10k** | High | Today: 100 seeds + 15 derived factories → hundreds of KBs per run, not 10k. Need either many more factories, or an **expansion layer**: from each seed/first-level KB, generate 2–5 children by transformation (specialization, failure_mode, evaluation) and domain. Automate “expansion candidates” so the graph grows to 10k. |
| **Embedding dedup** | Medium | No embedding or similarity check in the generator. Duplicate or near-duplicate content can slip in. Add a **validator-layer** step: before accept, check claim/summary similarity (e.g. embedding cosine &lt; 0.92) against existing pool, or run this in indexer and reject at publish. |
| **Dead-end filter** | Low | “Artifacts that can’t produce children” aren’t filtered. Purely definitional or historical KBs could clutter the graph. Optional: score or tag “expandable” (procedure/algorithm + clear interface) and prefer those as parents, or add a simple heuristic (e.g. has state_transition or transformation → expandable). |
| **Depth and layering** | Medium | No explicit “depth” or “layer” in the artifact. Indexer can compute from parent graph, but generator doesn’t target a shape (e.g. ~50 seeds, ~300 L1, ~2k L2, ~7k L3). Add a **target shape** to the design and drive factory/expansion counts to hit it. |
| **AI scale** | Medium | AI-generated seeds work but are limited by spec count and API cost. For 10k, either scale specs and batching, or use AI mainly for **expansion** (one parent + transformation → new title/claim/steps) with human review or sampling. |

---

## Dimension-by-dimension

- **Correctness (does it build valid artifacts?)** — 9/10. Validator and builder catch almost all invalid cases; relaxed “output in produces” keeps valid hand-written artifacts from failing.
- **Completeness (can it reach 10k?)** — 5/10. Pipeline is correct but not scaled. Need expansion strategy and more factories or automated expansion.
- **Agent usefulness (retrieval, cost, execution, planning?)** — 8/10. ARA, cost_estimate, interface, structured steps, and optional state_transition and preconditions give agents what they need for discovery and execution.
- **Maintainability (schema and code clarity?)** — 8/10. Schema contract doc, deprecations, and single-purpose fields keep the system understandable. Generator and validator are a bit dense but organized.
- **Operational (run, debug, iterate?)** — 7/10. Modes (seeds, derived, ai-seeds, all), staging/pending, and dedup work. Lacking: progress/resume, dry-run, and clear metrics (e.g. depth distribution, domain counts).

---

## Verdict

The system is **ready for a first 10k run** in the sense that:

- Artifacts are well-shaped (reasoning edges, 2–3 parents, transformation, optional GDKR and preconditions).
- The generator produces valid, consistent KBs and the registry/indexer story is clear.

To **actually reach 10k and make the graph deep and non-redundant**, the next steps are:

1. **Expansion layer** — From seeds and L1 derived, auto-generate children by transformation and domain (and optionally AI) to reach 10k with target depth/layer counts.
2. **Dedup** — Add embedding or text-similarity check (generator or validator/indexer) to avoid near-duplicate content.
3. **Target shape** — Define desired counts per depth/layer and drive factory and expansion logic to hit them.
4. **Operational tweaks** — Progress, resume, and basic stats (depth, domain, transformation) to tune the run.

**Bottom line:** Design and schema are in good shape; the main gap is **scaling the generator (expansion + dedup + shape)** to go from hundreds to 10k without losing quality or graph structure.
