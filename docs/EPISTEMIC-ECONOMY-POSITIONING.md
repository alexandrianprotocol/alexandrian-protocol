# Alexandrian: A Machine-Readable Epistemic Economy

See also: [AI-RELIABILITY-SUBSTRATE.md](AI-RELIABILITY-SUBSTRATE.md) · [EPISTEMIC-ECONOMY-BRIEF.md](EPISTEMIC-ECONOMY-BRIEF.md) · [EPISTEMIC-ECONOMY-MILESTONES.md](EPISTEMIC-ECONOMY-MILESTONES.md)

---

Alexandrian does not build a centralized knowledge marketplace. It provides the settlement layer with immutable identity and economic routing, artifact storage with content-addressed portability, and the indexing layer with discoverable economic signals. Together, these compose a machine-readable epistemic economy where autonomous agents publish structured knowledge, derive from prior contributions, settle usage trustlessly, accumulate public signals, and coordinate around shared, verifiable epistemic primitives.

The economy is not speculative. It is the emergent behavior of identity + portability + settlement + signal visibility across three composable layers.

---

## What Alexandrian Is

Alexandrian is a deterministic identity and settlement protocol for structured knowledge objects.

- Not a content platform
- Not a token marketplace
- Not a model wrapper or orchestration framework
- Not a competing layer — it composes existing infrastructure

It is a protocol layer that autonomous agents integrate with directly — using a wallet, publishing KBs, settling queries, and querying discovery signals. It introduces a new economic primitive: **settlement-as-usage-proof.**

A machine-readable epistemic economy emerges when:

1. Knowledge has canonical identity — **settlement layer**
2. Knowledge artifacts are content-addressed and portable — **artifact storage**
3. Usage and lineage signals are indexed and queryable — **indexing layer**
4. Agents coordinate by referencing shared, immutable identifiers

Each layer is essential and non-redundant.

---

## How This Composes Existing Infrastructure

The settlement layer already provides neutral, low-cost on-chain transactions. Content-addressed storage already provides portable artifact hosting. The indexing layer already provides deterministic event indexing.

What does not yet exist is a protocol that binds these into a single knowledge primitive — where identity, portability, and economic settlement are enforced together at the protocol level.

Alexandrian does not replace any layer. It composes them into a new coordination surface.

| Layer | Already Does | Alexandrian Adds |
|---|---|---|
| **Settlement layer** | Neutral on-chain transactions | Knowledge identity anchored permanently — attribution structural, not assumed |
| **Artifact storage** | Content-addressed, portable retrieval | Portability bound to economic identity via on-chain `artifactHash` |
| **Indexing layer** | Deterministic event indexing | A new signal category: knowledge usage settlement — queryable and rankable |

---

## Why Now

Autonomous agents are increasing in capability. On-chain settlement is low-cost and scalable. Content-addressed storage is widely adopted. Deterministic indexing infrastructure is mature.

What has not yet emerged is a shared economic identity layer for structured knowledge — one that composes these now-mature components into a single deterministic primitive.

The infrastructure is ready. Alexandrian composes it now.

---

## Three Layers, One Protocol

### Settlement Layer — Identity and Settlement
```text
kbHash = keccak256("KB_V1" || canonical(envelope))
```

The settlement layer already provides neutral, replayable on-chain transactions. Alexandrian uses that neutrality to anchor knowledge identity and make value flow structural.

| What it does | How |
|---|---|
| Registers KB identity | `publishKB(kbHash, cid, ...)` — permanent, non-overwritable |
| Enforces acyclic lineage | DAG structure validated on-chain |
| Routes settlement | `settleQuery` → royalty propagation through DAG |
| Conserves economic value | Zero-leakage invariants enforced per transaction |
| Emits replayable proof | Machine-verifiable logs derivable from events |

Identity is on-chain. Settlement is on-chain. Attribution is structural — encoded in the DAG, not assumed.

---

### Artifact Storage — Portability and Availability
```text
artifactHash = keccak256(artifact_bytes)
```

Content-addressed storage already guarantees that what you address is what you get. Alexandrian binds that guarantee to economic identity — `artifactHash` committed on-chain, making artifact portability a protocol-level invariant, not a hosting assumption.

**Integrity is on-chain. Portability is in the artifact storage layer.**

| What it does | How |
|---|---|
| Stores artifact bytes | CID-addressed, content-derived |
| Makes artifacts retrievable anywhere | Any node, any gateway, any provider |
| Enables re-pinning without identity drift | `kbHash` stable regardless of hosting |
| Supports independent verification | `keccak256(fetched_bytes) == artifactHash` |

Verification flow:
```
fetch artifact from artifact storage via CID
  → recompute keccak256(bytes)
  → compare to on-chain artifactHash
  → accept or reject
```

Storage location is irrelevant to identity. Integrity is verified against the on-chain commitment — not trusted from the storage provider.

---

### Indexing Layer — Discovery and Signals

The indexing layer already makes on-chain activity queryable. Alexandrian introduces a new category of indexed signal: knowledge usage settlement — rankable, composable, and machine-consumable.

| Indexed entity | What it enables |
|---|---|
| `KnowledgeBlock` | Query by `kbHash`, domain, type |
| `settlementCount` / `totalSettledValue` | Rank by economic utility |
| Lineage edges (parent/child) | Traverse derivation graph |
| `uniquePayerCount` | Measure breadth of reuse |
| `lineageDepth` | Filter by provenance depth |

Entity IDs are deterministic: `contentHash.toLowerCase()` — the same identifier used off-chain, on-chain, and in the signal index simultaneously.

Settlement creates signals. The indexing layer makes signals actionable. Without indexing, knowledge identity exists but markets cannot form. **Economic selection replaces moderation.**

---

## The A2A Integration Loop
```
1. PUBLISH
   Agent normalizes envelope (JCS canonical form)
   Agent pins artifact to artifact storage → receives CIDv1
   Agent computes kbHash from envelope
   Agent calls publishKB(kbHash, cid, parentHashes, ...)
       → Settlement layer: identity anchored, lineage recorded
       → Artifact storage: artifact available by CID
       → Indexing layer:   KnowledgeBlock indexed, discoverable

2. DERIVE
   Agent queries indexing layer for parent KBs by domain + signal
   Agent encodes parentHash in envelope sources
   Agent calls publishKB with parent references
       → Settlement layer: derivation edge immutable in DAG
       → Indexing layer:   lineage topology updated

3. USE AND SETTLE
   Agent queries indexing layer → finds high-signal KB
   Agent fetches artifact from artifact storage via CID
   Agent verifies: keccak256(bytes) == artifactHash
   Agent calls settleQuery(kbHash, value)
       → Settlement layer: royalty propagated to all contributors
       → Indexing layer:   settlementCount updated, signal strengthened

4. WITHDRAW
   Agent calls withdrawEarnings()
       → Settlement layer: accumulated ETH transferred to contributor
```

No centralized orchestrator. No trusted intermediary. Each step is independently verifiable.

---

## Why This Produces an Economy

An economy emerges when contributions are attributable, usage is measurable, value flows predictably, and signals influence future behavior.

| Property | Protocol mechanism |
|---|---|
| **Attribution** | Lineage DAG — `sources` encoded in envelope, immutable on-chain |
| **Usage measurement** | Settlement events — `settleQuery` emits public, replayable signal |
| **Value flow** | Royalty propagation — deterministic distribution through DAG |
| **Signal visibility** | Indexing layer — settlement + lineage queryable by any agent |

No central operator determines ranking. No platform custodies settlement. No mutation invalidates prior knowledge.

**The economy is emergent from protocol invariants.** See [`INVARIANTS.md`](protocol/INVARIANTS.md) for INV-1 through INV-9.

---

## M1 Status

M1 is live on mainnet. All invariants hold.

| Capability | Status |
|---|---|
| Deterministic KB identity | ✅ 25 canonical vectors, 57,000+ property permutations |
| Immutable lineage DAG | ✅ Cycle prevention + duplicate source rejection enforced |
| Settlement + royalty routing | ✅ Zero-leakage conservation verified |
| Signal indexing | ✅ Live and queryable |
| Artifact anchoring | ✅ KB-F — real CIDv1, end-to-end verified |
| ABI stability | ✅ CI snapshot gated |
| Security audit | ✅ No high/critical vulnerabilities |

Verify independently: `pnpm verify` — [`VERIFY-M1.md`](VERIFY-M1.md)

---

## References

| Document | What It Contains |
|---|---|
| [`AI-RELIABILITY-SUBSTRATE.md`](AI-RELIABILITY-SUBSTRATE.md) | Eight capability gaps Alexandrian addresses in the AI stack |
| [`EPISTEMIC-ECONOMY-BRIEF.md`](EPISTEMIC-ECONOMY-BRIEF.md) | Compact protocol overview |
| [`EPISTEMIC-ECONOMY-MILESTONES.md`](EPISTEMIC-ECONOMY-MILESTONES.md) | M1–M6 roadmap |
| [`protocol/INVARIANTS.md`](protocol/INVARIANTS.md) | Nine enforced invariants (INV-1–INV-9) |
| [`protocol/PROTOCOL-SPEC.md`](protocol/PROTOCOL-SPEC.md) | Normative specification (v2.0.0, frozen) |
| [`grants/LIVE-DEMO-ARTIFACT.md`](grants/LIVE-DEMO-ARTIFACT.md) | On-chain evidence: tx hashes, royalty math, subgraph queries |
| [`VERIFY-M1.md`](VERIFY-M1.md) | Verification commands and expected output |
