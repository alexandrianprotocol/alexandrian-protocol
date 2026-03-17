# DAG Shape, Location Semantics, and Economics

## 1. payload.location — three states

The two-layer model (KB seed + optional IPFS knowledge module) requires three clear states:

| Value | Meaning |
|-------|---------|
| **inline** | Lightweight seed or derived KB; payload is only in the artifact. No separate IPFS module. |
| **ipfs** | The artifact’s payload is fetched from IPFS (this record is a stub). |
| **hybrid** | Seed-with-module: inline payload **and** references to IPFS modules via `artifact_refs`. This is the main case for seeds that reference the 50-artifact library. |
| **url** | Payload at an external URL (legacy). |

Set `location` to **hybrid** when `artifact_refs` is non-empty and the primary content is inline. The generator sets it automatically when the model returns `artifact_refs`.

---

## 2. Hub detection (DAG width vs depth)

A graph where everything attaches to the same popular seeds becomes hub-and-spoke: a few artifacts get thousands of children, dominate royalty flows, and become single points of semantic failure.

- **Soft limit:** Any artifact with **≥ 150 children** is flagged as a potential hub.
- **CLI:** `node dist/index.js --mode report-hubs` lists such artifacts (kb_id, child count, domain, title) for review.
- **Constant:** `MAX_CHILDREN_SOFT` in `src/lib/dag-monitoring.ts` (default 150). Tune for your indexer or parent-selection policy.
- **Recommendation:** During expansion, avoid over-attaching to the same seeds; prefer spreading children across depth and siblings so the DAG stays balanced.

---

## 3. Dependency warnings (artifact retirement)

When a seed is deprecated, artifacts that list it as a parent do not become invalid, but they depend on deprecated knowledge. Agents should be informed.

- **Schema:** Artifacts are immutable; do **not** add a field to the artifact. Status stays `identity.status: "active" | "deprecated" | "draft"`.
- **Indexer:** Add a **dependency_warnings** object to the **indexer response** (per artifact or per chain), not to the stored artifact.
- **Helper:** `getDependencyWarnings(records, kb_id)` in `src/lib/dag-monitoring.ts` returns `{ deprecated_ancestors: string[] }` — the list of deprecated kb_ids in the ancestor chain. The indexer should call this (or replicate the logic) when serving an artifact and include `dependency_warnings: getDependencyWarnings(records, artifact.kb_id)` in the response so clients can surface e.g. “This artifact has deprecated dependencies.”

---

## 4. Royalty skew and depth bonus (economic design)

Query settlement today distributes one level up. That implies:

- **Agent planning** and other entry-point artifacts are queried constantly → they accumulate the most royalty flow.
- **Security / specialist** artifacts are queried less often but in high-stakes contexts; they sit deeper in the DAG and get fewer settlements.

So royalty flows are skewed toward topologically central artifacts, not necessarily toward “more knowledge” or “deeper” knowledge.

**Design choice:** Decide whether that skew is acceptable. If you want to incentivize deep specialist knowledge, consider a **depth bonus**: a small royalty multiplier for artifacts deeper in the DAG (e.g. by `provenance.lineage.depth`). That would be implemented in the protocol/contract layer, not in the generator. This doc records the tradeoff for future protocol design.
