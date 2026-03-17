# Gaps, implementation summary, and registry/contract notes

This doc describes the gaps identified for the 10k KB system, what was implemented in the generator, and what you may need to change in the **registry contract** and **publish/indexer pipeline** when scaling to 10k.

---

## 1. Gaps we had (from RATING-10K-SYSTEM.md)

| Gap | Impact | Addressed? |
|-----|--------|------------|
| **Scale to 10k** | 100 seeds + 15 factories → hundreds of KBs, not 10k | ✅ **Yes** — expansion layer (Phase 3) grows the graph from seeds + L1 by (parent, other, transformation) until queue reaches target (default 10k). |
| **Content dedup** | Near-duplicate claim/summary could slip in | ✅ **Yes** — content fingerprint (normalized claim+summary hash); optional `contentFingerprintSet` in `buildRecord` and in all phases. |
| **Depth and layering** | No target shape; generator didn’t drive depth | ✅ **Yes** — `lineage.depth` set from parents in `derivedEnvelopeToArtifact`; `TARGET_SHAPE` and `--target` drive expansion; stats print by-depth and by-domain. |
| **Operational** | No progress, resume, or depth/domain stats | ✅ **Yes** — stats at end of run (by depth, top domains); `--target` and `--count`; expansion pass logging. |

---

## 2. What we implemented (generator)

### 2.1 Expansion layer (`src/lib/expansion.ts`)

- **Target shape:** `TARGET_SHAPE` (seeds 100, L1 500, L2 2500, L3 6900) and `TARGET_TOTAL` (10k).
- **Expandable:** Records with depth ≤ 1 (seeds + first-level derived).
- **Per (parentA, parentB, transformation):** Build one child with 2 parents, cross-domain; key `expansionKey(parentA, parentB, transformation)` avoids duplicate children.
- **Phase 3:** Run after seeds + derived; loop until queue size ≥ `targetTotal` or `maxCount` or no new KBs in a pass.

### 2.2 Content fingerprint dedup (`src/lib/builder.ts`, `queue.ts`)

- **`contentFingerprint(artifact)`:** Normalized (trim, lower, collapse whitespace) claim + summary → short hash.
- **`buildContentFingerprintSet(records)`:** Set of fingerprints for existing queue.
- **`buildRecord(..., contentFingerprintSet?)`:** If set provided and fingerprint already present → throw `DUPLICATE_CONTENT`.
- All phases (seeds, derived, expansion, ai-seeds) use fingerprint set and add new fingerprints after write.

### 2.3 Lineage depth (`src/lib/envelope-to-artifact.ts`)

- **`lineage.depth`:** `1 + max(parents’ lineage.depth)` (seeds = 0). So L1 = 1, L2 = 2, etc.

### 2.4 CLI and stats

- **Modes:** `seeds | derived | expansion | ai-seeds | all`. Default `all` runs seeds → derived → expansion.
- **Flags:** `--count <n>` (default 10000), `--target <n>` (default 10000) for expansion stop condition.
- **Stats:** At end of run, print by-depth counts (L0, L1, L2, …) and top domains.

### 2.5 AI-seed title similarity guard

- **Issue:** Multiple ai-seeds in the same domain (e.g. `ai.prompting` / prompt engineering) can get near-identical titles from the model (e.g. “Establishing Seed Prompt for Consistent AI Output” variants). Hashes differ but they are semantically redundant.
- **Guard:** Before accepting an AI-generated seed, we check whether any existing record in the same domain has a very similar title (normalized: lowercase, collapse spaces; skip if one title contains the other or word overlap is high). If so, we skip and log `[skip] title too similar to existing in domain`.
- **Manual review:** For domains like `ai.prompting` / prompt engineering, review staging for multiple seeds with nearly the same title and merge or delete redundant ones.

### 2.6 Publish order (topological)

- **Requirement:** The contract requires parents to exist before children. Publishing must follow lineage depth.
- **Helper:** `getPublishOrder(records)` in `lib/queue.ts` returns records sorted by `(lineage.depth, kbHash)`: L0 seeds first, then L1, L2, L3, L4. Use this order when iterating over the staging queue to call the registry (e.g. in a publish script).

### 2.7 Production-grade improvements (from technical review)

- **Semantic coherence:** Cross-domain parent pairs only allow transformations `composition`, `specialization`, `evaluation`; same-domain allows all 8 (including generalization, adaptation, variant, optimization, failure_mode). Reduces nonsensical combinations.
- **Depth-diverse expansion:** `selectOtherParentForExpansion(..., preferDepthDiverse: true)` prefers parents at a different depth (L0+L1→L2, L1+L2→L3) for deep reasoning chains.
- **Target shape:** L0 100, L1 500, L2 2500, L3 4000, L4 2500 (~10k). Expansion uses `isExpandable(r, 2)`; `MAX_EXPANSION_PASSES = 20` safety cap.
- **Fingerprint:** Content fingerprint includes **domain** so different domains do not false-dedup.
- **Stats:** Cross-domain %, avg parents, avg children/node for graph health.
- **AI epistemic_type:** Distribution (procedure 40%, fact 20%, analysis 20%, heuristic 10%, algorithm 10%) so AI does not produce only procedures.
- **Transformations:** Added generalization, adaptation, variant (8 total).
- **Domain compatibility matrix:** `getDomainPairPolicy(domainA, domainB)` → allow | synthesis_only | reject. Reject pairs (e.g. sql + software.security) skip expansion; synthesis_only forces composition only. Config: `config/domain-compatibility.ts`.
- **Schema (9.5-grade):** Optional `semantic.capabilities` (string[]) and `semantic.execution_class` (reasoning | transformation | evaluation | validation). ARA includes them when set. See SCHEMA-CONTRACT.md and RATING-SCHEMA-CONTRACT-COMPAT.md.
- **Pre-10k checklist:** Run 1k test first (`--count 1000 --target 1000`), check depth distribution, cross-domain %, duplicates, connectivity. See **PRE-10K-CHECKLIST.md**. Batch publish (e.g. publishKBBatch) recommended for contract to reduce 10k txs.

---

## 3. Registry and contract: do you need to change anything?

For **10k KBs**, the current **AlexandrianRegistryV2** design is already compatible in these ways:

- **No global cap:** There is no `maxBlocks` or similar; you can publish as many KBs as you want.
- **Per-KB storage:** Each KB is keyed by `contentHash`; storage is one `KnowledgeBlock` + `artifactHashes` + `cidDigest` + `attributionDAG` per KB. No on-chain list of “all KBs.”
- **MAX_PARENTS = 8:** Generator uses 2–3 parents; no change needed.
- **Seeds vs derived:** `isSeed` + `minimumRequiredParents` and empty parents for seeds are already enforced; generator complies.

So you **do not have to change the contract** for correctness or scale limits. You might still want to change or add things for **cost, operations, or indexing**:

### 3.1 Gas and publish cost (10k × publishKB)

- **What:** Each `publishKB` pays gas (storage, events). 10k publishes = 10k transactions (or batched if you add a batch API).
- **Options:**  
  - **Batch publish:** Add a function `publishKBBatch(bytes32[] contentHashes, ...)` that loops and emits events, so one transaction publishes many KBs (within gas limit per tx).  
  - **Stake:** If `minStakeAmount` is high, total stake for 10k KBs can be large; consider a lower stake for “protocol-seeded” KBs or a separate parameter.

### 3.2 Event size and indexer

- **What:** `KBPublished` includes `string domain`, `string cid`, `string embeddingCid`. Very long strings increase log size and indexer load.
- **Options:**  
  - Keep CIDs and domain in events (indexer needs them if you don’t store full CID on-chain).  
  - If indexer supports it, you could emit only `cidDigest` and have the indexer resolve CID from off-chain or a separate feed; then you could shorten event payloads.

### 3.3 Content hash and artifact hash

- **What:** Generator uses `kbHashFromArtifactV24` (JCS + keccak256) as the **content hash** for the registry. Contract expects `contentHash` and `artifactHash` (e.g. SHA256 of artifact).
- **Alignment:** Your publish pipeline must pass the same `contentHash` the generator produced (and the same `artifactHash` the generator/SDK uses). No contract change needed if the SDK and generator already agree on hashing.

### 3.4 Indexer and 10k scale

- **What:** Indexer (subgraph, Postgres, etc.) must handle 10k+ events and rebuild DAG from `KBPublished` + `AttributionLinked`.
- **Options:**  
  - Ensure indexer can process 10k publications (batch size, backpressure, restarts).  
  - If you add batch publish, indexer must handle many events in one block.

### 3.5 Optional: schema version or KB version on-chain

- **What:** Contract does not store schema version (e.g. v2.5) or artifact version. Indexer can infer from artifact JSON.
- **Options:** If you want on-chain filtering by schema, you could add an optional field or event parameter; not required for 10k.

---

## 4. Summary table

| Component | Change required for 10k? | Notes |
|-----------|--------------------------|--------|
| **Generator** | ✅ Implemented | Expansion, content dedup, depth, target shape, stats. |
| **Registry contract logic** | ❌ No | No cap, 2–3 parents within MAX_PARENTS. |
| **Registry gas / batching** | Optional | Batch publish and/or lower stake if you want to reduce cost. |
| **Event payload** | Optional | Shorten if indexer can get CIDs elsewhere. |
| **SDK / hashing** | Verify | Same `contentHash`/`artifactHash` as generator. |
| **Indexer** | Scale | Handle 10k events (and optional batch publish). |

---

## 5. Suggested next steps

1. **Run generator to 10k:** `--mode all --count 10000 --target 10000` (after seeds + derived in staging).  
2. **Verify hashing:** Ensure publish script uses the same `contentHash` (and optional `artifactHash`) as the generator.  
3. **Decide on batching:** If you want to publish 10k in fewer transactions, add and use `publishKBBatch` (or similar) and adjust indexer.  
4. **Tune stake/cost:** Adjust `minStakeAmount` or add a “seed” role if you need to minimize stake for 10k KBs.
