# Production spec — KB artifact and registry

Design decisions and fixes applied so the registry and KB format are production-safe.

## 1. KB artifact spec

### Confidence (nullable)

- **Canonical form:** `"confidence": null` for unassessed; `0.0`–`1.0` for assessed.
- **Interpretation:** `null` = unknown weight; agents must not treat it as high confidence.
- Migrated or unassessed artifacts use `null` to preserve semantic honesty.

### execution_mode

- **Values:** `"automatic"` | `"advisory"`.
- **automatic:** Safe for autonomous execution (deterministic, trust_tier ≤ 2).
- **advisory:** Requires human review before execution.
- **Rule:** `if execution_mode == "advisory"` then require human approval.

## 2. Registry contract

- **Payments:** Pull payments only; `withdrawEarnings` / `withdrawStake` / `withdrawTreasury` use `call{value:}` (no `transfer()`).
- **Duplicate parents:** Enforced in `_validateAttributionShares`; no parent may appear more than once per KB.
- **queryFee:** `uint96` (supports up to ~79k ETH).
- **On-chain storage:** Minimal struct (curator, timestamp, queryFee, exists); `artifactHash` and `cidDigest` in separate mappings; full CID and domain/type emitted in `KBPublished` for indexer.
- **Indexes:** `blocksByType`, `blocksByDomain`, `derivedBlocks` removed; indexer reconstructs from `KBPublished` and `AttributionLinked` events.

## 3. Royalty propagation

- **Model:** One-level royalties per query.
- Each KB receives royalties only from **direct** children. When an agent queries a child, the child’s settlement pays its direct parents; propagation happens through graph usage, not recursive on-chain traversal.
- **Documented:** Royalties propagate one level per query; no recursive DAG settlement on-chain.

## 4. CID digest

- Registry stores **bytes32** digest of the CID (e.g. `keccak256(bytes(cid))`), not the full CID string.
- Full CID is emitted in `KBPublished` so the indexer can store and serve it.
- Verification: artifact → content hash; CID digest stored on-chain; indexer reconciles with event data.

## 5. Spam prevention (three layers)

| Layer        | Where        | Checks                                                                 |
|-------------|--------------|------------------------------------------------------------------------|
| **1. Generator** | Local/fast   | Schema validation, minimum parents, hash determinism                  |
| **2. Validator** | Off-chain    | Duplicate contentHash, embedding similarity, domain constraints       |
| **3. Registry**  | On-chain     | Parent existence, max parents, royalty bounds; no embeddings on-chain |

- Embedding reference: e.g. `text-embedding-3-large`; similarity threshold (e.g. cosine ≥ 0.92) is configurable off-chain.

## 6. Registry migration

- **Versioned registries:** V1, V2, V3; older registries remain read-only.
- **Global identity:** KB identified by `contentHash`; registry version does not change the hash.
- **Cross-registry parents:** Artifacts reference parents by hash; indexer resolves which registry holds that hash and merges into a unified graph.
- **Collision handling:** `contentHash` = `keccak256(JCS(artifact))` makes collisions practically impossible; if needed, `registryId + hash` can act as compound identifier.

## 7. Architecture

```
Generator → Validator → IPFS artifacts → Registry → Indexer → Agents
```

The registry stays minimal and durable; artifacts and heavy indexing live off-chain.
