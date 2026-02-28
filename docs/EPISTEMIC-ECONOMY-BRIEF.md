# Alexandrian Protocol — Epistemic Economy Brief

**Compact overview for grant reviewers.** For detailed per-reviewer positioning and the full A2A loop analysis, see [EPISTEMIC-ECONOMY-POSITIONING.md](EPISTEMIC-ECONOMY-POSITIONING.md). For the M1–M6 roadmap, see [EPISTEMIC-ECONOMY-MILESTONES.md](EPISTEMIC-ECONOMY-MILESTONES.md).

---

## Executive Summary

Alexandrian is a deterministic knowledge identity and settlement protocol for autonomous agents.

It transforms structured knowledge into:

- An immutable, content-addressed identity — **Base**
- A verifiable artifact commitment — **IPFS**
- A discoverable economic signal surface — **The Graph**

Together, these layers enable a machine-readable epistemic economy where agents publish, derive, use, and economically coordinate around verifiable knowledge primitives.

**M1 is live and deployed on Base mainnet** at [`0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000`](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000).

---

## Architecture Overview

```
IPFS        →  Artifact integrity (bytes)
Base        →  Identity + settlement (economics)
The Graph   →  Discovery + signal indexing
```

Each layer is essential and non-redundant. Identity does not depend on storage location. Discovery does not affect settlement invariants.

| Layer | Responsibility | Mechanism |
|-------|---------------|-----------|
| **Base** | Identity + settlement | `contentHash = keccak256("KB_V1" \|\| JCS(envelope))`; DAG enforcement; royalty routing |
| **IPFS** | Artifact integrity | `artifactHash = keccak256(artifact_bytes)`; CID-bound storage; publisher-independent verification |
| **The Graph** | Discovery + signals | `entityId = contentHash.toLowerCase()`; idempotent indexing; settlement metrics |

---

## 1. Base — Identity and Settlement Layer

### What Runs on Base

- Deterministic Knowledge Block (KB) identity (`kbHash`)
- Immutable lineage (acyclic DAG)
- Settlement routing with royalty propagation
- Economic conservation enforcement
- Pull-based withdrawals
- Replayable proof derivation from logs

**Identity primitive:**

```text
kbHash = keccak256("KB_V1" || canonical(envelope))
```

**Settlement primitive:**

```text
Settle(K, amount) → deterministic royalty distribution
```

### Why Base Is Critical

An epistemic economy requires neutral settlement, immutable economic signals, public verifiability, and deterministic replay. Without Base, settlement would be platform-custodial and usage signals would be mutable.

Base provides:

- Low-cost recurring transactions (knowledge settlement)
- Structurally recurring economic activity (non-speculative)
- Verifiable proof-bearing events
- Immutable economic history

Alexandrian contributes to Base:

- Utility-driven on-chain volume
- Royalty-routing transaction flows
- A new economic primitive: **settlement-as-usage-proof**

---

## 2. IPFS — Artifact Integrity Layer

Each KB commits to:

```text
artifactHash = keccak256(artifact_bytes)
```

The artifact is stored on IPFS and referenced via CID. The artifact hash is embedded in the canonical envelope, making artifact integrity a protocol-level commitment, not a storage-level assumption.

### Why IPFS Is Critical

An epistemic economy requires byte-level integrity verification, storage-agnostic portability, censorship-resistant artifact hosting, and publisher-independent verification.

IPFS ensures:

- Knowledge artifacts can be verified locally before settlement.
- Storage location does not affect identity.
- Agents do not trust a centralized API for content retrieval.

IPFS binds artifact integrity to Base-anchored identity.

**Grant reference:** [grants/GRANT-IPFS.md](grants/GRANT-IPFS.md)

---

## 3. The Graph — Discovery and Signal Layer

Base emits settlement and lineage events. The Graph indexes them into queryable knowledge topology.

Indexed signals include:

- `settlementCount`
- `totalSettledValue`
- lineage (parent/child edges)
- derivation depth
- payer metrics

### Why The Graph Is Critical

Settlement creates signals. Signals must be discoverable.

The Graph enables query by `kbHash`, query by domain, ranking by economic activity, derivation topology exploration, and reorg-safe idempotent indexing.

Without indexing, agents could verify knowledge and settle — but could not efficiently discover high-utility knowledge. The Graph turns settlement events into a **machine-readable market surface**.

Entity ID derivation ensures the same `contentHash` is the key across all three layers simultaneously — the off-chain `kbId`, the on-chain registry key, and the subgraph entity ID.

**Grant reference:** [grants/GRANT-THE-GRAPH.md](grants/GRANT-THE-GRAPH.md)

---

## 4. The A2A Epistemic Economy Loop

```
1. Agent publishes KB (IPFS + Base)
      ↓
2. KB identity becomes immutable (Base)
      ↓
3. Another agent derives from it (Base lineage)
      ↓
4. Agent uses KB and settles (Base)
      ↓
5. Royalty propagates to ancestors (Base)
      ↓
6. Settlement event indexed (The Graph)
      ↓
7. Discovery surfaces high-utility KBs (The Graph)
      ↓
8. Future agents select based on signals
```

This creates:

- Attribution-aware value flow
- Public usage signals
- Market-based epistemic filtering
- Non-custodial agent coordination

No centralized ranking authority is required. Selection emerges from usage.

---

## 5. Ecosystem Impact

### Base

- Generates recurring, utility-driven transactions.
- Demonstrates non-speculative on-chain economic routing.
- Anchors proof-bearing knowledge settlement.
- Expands Base's role as infrastructure for agent-native economies.

### IPFS

- Drives content-addressed artifact publication.
- Couples CID storage to economic identity.
- Demonstrates integrity-first knowledge markets.
- Promotes portable, storage-agnostic verification.

### The Graph

- Exercises deterministic indexing at economic-signal scale.
- Provides a high-signal, real-world indexing use case.
- Enables discoverable knowledge market topology.
- Supports ranking by settlement-derived signals.

---

## 6. Current Status (M1)

| Component | Status |
|-----------|--------|
| Base mainnet deployment | ✓ Live at `0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000` |
| Deterministic identity | ✓ 25 canonical vectors, 57,000+ property permutations |
| Royalty propagation | ✓ Enforced; zero-wei conservation verified |
| Economic invariants | ✓ INV-1 through INV-9 documented and tested |
| Subgraph schema and mappings | ✓ Studio ID 1742359, v0.1.0, live |
| IPFS artifact commitment | ✓ Integrated; KB-F fully anchored (CID + artifactHash) |
| Test suite | ✓ Hermetic; zero skips; zero network dependencies |

M1 delivers the identity and settlement substrate.

Subsequent milestones add:

- Signal-based ranking (M2)
- Reputation hardening (M3–M4)
- Coordination objects for multi-agent workflows (M5)
- Multi-chain and governance expansion (M6)

Core invariants remain unchanged across all milestones.

---

## One-Sentence Positioning

> Alexandrian integrates Base (settlement), IPFS (artifact integrity), and The Graph (signal discovery) to create the foundational infrastructure for a machine-readable epistemic economy where autonomous agents coordinate through verifiable, economically coupled knowledge primitives.

---

## References

| Document | Purpose |
|----------|---------|
| [AI-RELIABILITY-SUBSTRATE.md](AI-RELIABILITY-SUBSTRATE.md) | Problem statement: Alexandrian as the missing substrate beneath AI reliability systems |
| [EPISTEMIC-ECONOMY-POSITIONING.md](EPISTEMIC-ECONOMY-POSITIONING.md) | Detailed per-reviewer positioning; full A2A loop; gold-standard grant statement |
| [EPISTEMIC-ECONOMY-MILESTONES.md](EPISTEMIC-ECONOMY-MILESTONES.md) | M1–M6 roadmap with deliverable breakdown |
| [EPISTEMIC-ECONOMY-VISION.md](EPISTEMIC-ECONOMY-VISION.md) | Internal protocol analysis: is this what we build? |
| [grants/GRANT-COINBASE.md](grants/GRANT-COINBASE.md) | Base Builders grant application |
| [grants/GRANT-THE-GRAPH.md](grants/GRANT-THE-GRAPH.md) | The Graph grant application |
| [grants/GRANT-IPFS.md](grants/GRANT-IPFS.md) | IPFS grant application |
| [protocol/INVARIANTS.md](protocol/INVARIANTS.md) | Nine formal economic invariants (INV-1..INV-9) |
| [protocol/PROTOCOL-SPEC.md](protocol/PROTOCOL-SPEC.md) | Normative protocol specification (v2.0.0, frozen) |
| [M1-CERTIFICATION-REPORT.md](M1-CERTIFICATION-REPORT.md) | M1 certification report (9-stage, all PASS) |
| [grants/LIVE-DEMO-PROOF.md](grants/LIVE-DEMO-PROOF.md) | On-chain evidence: tx hashes, royalty math, subgraph queries |
| [VERIFY-M1.md](VERIFY-M1.md) | Verification commands and expected output |
