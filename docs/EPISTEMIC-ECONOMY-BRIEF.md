# Alexandrian Protocol — Epistemic Economy Brief

See also: [EPISTEMIC-ECONOMY-POSITIONING.md](EPISTEMIC-ECONOMY-POSITIONING.md) · [EPISTEMIC-ECONOMY-MILESTONES.md](EPISTEMIC-ECONOMY-MILESTONES.md) · [AI-RELIABILITY-SUBSTRATE.md](AI-RELIABILITY-SUBSTRATE.md)

---

**M1 is live on mainnet at [`0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000`](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000).**

Verify: `pnpm verify` — [`VERIFY-M1.md`](VERIFY-M1.md)

---

## What Alexandrian Is

Alexandrian is a deterministic identity and settlement protocol for structured knowledge objects.

The settlement layer already provides neutral, low-cost on-chain transactions. Content-addressed storage already provides portable, verifiable artifact hosting. The indexing layer already provides deterministic event indexing. What does not yet exist is a protocol that binds these into a single knowledge primitive — one where identity, artifact portability, and economic settlement are enforced together.

Alexandrian introduces that primitive.

**What it is not:**
- Not a content hosting platform
- Not a speculative token economy
- Not an NFT system
- Not a moderation layer
- Not an AI model or orchestration framework

It is infrastructure. It is a new economic primitive: **settlement-as-usage-proof.**

---

## Minimal Mental Model

- A **KB** is an immutable, content-addressed knowledge object
- **Settlement** proves usage and routes value to contributors
- **Lineage** encodes attribution — who built on what
- **Discovery** surfaces economically valuable KBs via signals

No mutation. No central ranking authority. No trusted intermediary.

---

## Three Layers, One Primitive
```
Settlement layer   →  Identity + on-chain truth
Artifact storage   →  Portability (bytes retrievable anywhere)
Indexing layer     →  Signal discovery (settlement + lineage queryable)
```

| Layer | What It Already Does | What Alexandrian Adds |
|---|---|---|
| **Settlement layer** | Neutral, low-cost on-chain transactions | Knowledge identity anchored on-chain — `kbHash` permanent, attribution structural |
| **Artifact storage** | Content-addressed, location-independent retrieval | Portability bound to economic identity — `artifactHash` committed on-chain |
| **Indexing layer** | Deterministic event indexing | A new signal category: knowledge usage settlement — queryable, rankable, composable |

Each layer composes into something it could not produce alone. **Integrity is on-chain. Portability is in the artifact storage layer. Signal is in the indexing layer.**

---

## Core Primitives
```text
kbHash       = keccak256("KB_V1" || JCS(normalize(envelope)))
artifactHash = keccak256(artifact_bytes)
entityId     = contentHash.toLowerCase()   // same key across all three layers
```

| Invariant | Enforced By |
|---|---|
| Identity determinism | Canonical serialization + keccak256 |
| Immutability | No overwrite — updates create new KBs |
| Attribution | Lineage DAG — `sources` in envelope |
| Economic conservation | Royalty routing invariants, zero leakage |
| Artifact verifiability | `keccak256(fetched_bytes) == artifactHash` |
| Storage independence | `kbHash` stable regardless of hosting provider |

---

## The A2A Loop
```
1. Publish     Agent pins artifact to artifact storage → computes kbHash → calls publishKB
                   Settlement layer: identity anchored
                   Artifact storage: bytes available by CID
                   Indexing layer:   KB indexed, discoverable

2. Derive      Agent references parentHash in envelope → calls publishKB
                   Settlement layer: derivation edge immutable in DAG
                   Indexing layer:   lineage extended

3. Settle      Agent verifies artifact → calls settleQuery(kbHash, value)
                   Settlement layer: royalty routed to contributors
                   Indexing layer:   settlementCount updated, signal strengthened

4. Discover    Agent queries indexing layer by domain + settlementCount + lineageDepth
                   Indexing layer:   returns ranked KBs
                   Artifact storage: artifact retrievable by CID
```

No centralized orchestrator. Economic selection replaces moderation.

---

## Why Now

Autonomous agents are increasing in capability. On-chain settlement is low-cost and scalable. Content-addressed storage is widely adopted. Deterministic indexing infrastructure is mature.

What has not yet emerged is a shared economic identity layer for structured knowledge — one that composes these now-mature components into a single deterministic primitive.

Alexandrian introduces that layer now because the infrastructure it depends on is ready.

---

## M1 Status

| Component | Status |
|---|---|
| Mainnet deployment | ✅ Live |
| Deterministic identity | ✅ 25 canonical vectors, 57,000+ property permutations |
| Royalty propagation | ✅ Zero-wei conservation verified |
| Economic invariants | ✅ INV-1 through INV-9 documented and tested |
| Signal indexing | ✅ Live and queryable |
| Artifact anchoring | ✅ KB-F fully anchored — real CIDv1, end-to-end verified |
| Test suite | ✅ Hermetic — zero skips, zero network dependencies |

M1 delivers the identity and settlement substrate. M2 makes it observable and discoverable in production.

---

## References

| Document | What It Contains |
|---|---|
| [`EPISTEMIC-ECONOMY-POSITIONING.md`](EPISTEMIC-ECONOMY-POSITIONING.md) | Full A2A loop, per-layer integration detail |
| [`EPISTEMIC-ECONOMY-MILESTONES.md`](EPISTEMIC-ECONOMY-MILESTONES.md) | M1–M6 roadmap |
| [`AI-RELIABILITY-SUBSTRATE.md`](AI-RELIABILITY-SUBSTRATE.md) | Eight capability gaps Alexandrian addresses |
| [`protocol/INVARIANTS.md`](protocol/INVARIANTS.md) | Nine enforced invariants (INV-1–INV-9) |
| [`protocol/PROTOCOL-SPEC.md`](protocol/PROTOCOL-SPEC.md) | Normative specification (v2.0.0, frozen) |
| [`grants/LIVE-DEMO-PROOF.md`](grants/LIVE-DEMO-PROOF.md) | On-chain evidence: tx hashes, royalty math |
| [`VERIFY-M1.md`](VERIFY-M1.md) | Verification commands and expected output |
