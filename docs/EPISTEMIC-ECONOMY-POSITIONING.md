# Alexandrian: Enabling a Machine-Readable Epistemic Economy Across Base, IPFS, and The Graph

**Purpose:** Executive positioning for grant reviewers at Base/Coinbase, IPFS, and The Graph. This document explains *why* each ecosystem component is structurally necessary and how the three layers combine to produce a machine-readable epistemic economy.

See also: [AI-RELIABILITY-SUBSTRATE.md](AI-RELIABILITY-SUBSTRATE.md) (problem statement) · [EPISTEMIC-ECONOMY-BRIEF.md](EPISTEMIC-ECONOMY-BRIEF.md) (compact protocol brief) · [EPISTEMIC-ECONOMY-VISION.md](EPISTEMIC-ECONOMY-VISION.md) (internal protocol analysis) · [EPISTEMIC-ECONOMY-MILESTONES.md](EPISTEMIC-ECONOMY-MILESTONES.md) (M1–M6 roadmap)

---

## Executive Positioning

Alexandrian establishes a deterministic identity and settlement layer for structured knowledge objects.

It is not a content platform. It is not a token marketplace.

It is a protocol layer that allows autonomous agents to economically coordinate around verifiable knowledge.

A machine-readable epistemic economy emerges when:

1. Knowledge has canonical identity — **Base**.
2. Knowledge artifacts are content-addressed and verifiable — **IPFS**.
3. Usage and lineage signals are indexed and discoverable — **The Graph**.
4. Agents coordinate by referencing shared, immutable identifiers.

Each ecosystem component is essential and non-redundant.

---

## 1. Base — Identity and Settlement Layer

Base provides the economic and identity substrate.

### What Alexandrian Uses Base For

- On-chain registration of `kbHash` (contentHash).
- Enforcement of acyclic lineage.
- Deterministic royalty routing.
- Economic conservation invariants.
- Replayable settlement events.
- Pull-based withdrawals.
- Public proof derivation.

The core primitive:

```text
kbHash = keccak256("KB_V1" || canonical(envelope))
```

The contract accepts this deterministic identity and:

- Makes it permanent.
- Prevents overwriting.
- Routes settlement along lineage.
- Emits machine-verifiable logs.

### Why Base Is Structurally Necessary

An epistemic economy requires:

- Neutral settlement.
- Immutable economic signals.
- Public verifiability.
- Deterministic replay.

Without Base:

- Settlement would be platform-custodial.
- Usage signals would be mutable.
- Attribution could be altered retroactively.

Base enables: *knowledge usage as an economically conserved, publicly replayable event.*

This transforms knowledge from content into an economically coupled primitive.

**Grant reference:** [grants/GRANT-COINBASE.md](grants/GRANT-COINBASE.md)

---

## 2. IPFS — Artifact Integrity Layer

Base anchors identity and settlement. IPFS anchors artifact bytes.

Each Knowledge Block includes:

```text
artifactHash = keccak256(artifact_bytes)
```

This hash:

- Commits to the artifact's exact byte representation.
- Is independent of storage location.
- Can be verified locally before settlement.

IPFS provides:

- Content-addressed storage.
- Storage-agnostic retrieval.
- Global distribution.
- Censorship resistance.

### Why IPFS Is Structurally Necessary

Without IPFS (or equivalent content-addressed storage):

- Knowledge artifacts would require centralized hosting.
- Integrity verification would require trusted APIs.
- Agents could not independently recompute artifact hashes.

IPFS ensures:

- The artifact is verifiable without trusting the publisher.
- The `kbHash` remains stable regardless of hosting.
- Knowledge remains portable across ecosystems.

IPFS provides *epistemic integrity*. Base provides *economic integrity*.

Together, they bind bytes → identity → value.

**Grant reference:** [grants/GRANT-IPFS.md](grants/GRANT-IPFS.md)

---

## 3. The Graph — Discovery and Signal Layer

Base emits raw events. IPFS stores artifacts. The Graph indexes:

- `KnowledgeBlock` entities.
- Settlement events.
- Royalty distributions.
- Lineage edges.
- Reputation metrics.

This enables:

- Query by `kbHash`.
- Query by domain.
- Query by `settlementCount`.
- Query by parent/child depth.
- Discovery by economic signal.

### Why The Graph Is Structurally Necessary

An epistemic economy requires signal visibility.

Settlement alone does not create market formation. Signals must be queryable.

The Graph provides:

- Deterministic indexing.
- Idempotent handlers.
- Reorg resilience.
- Public query interface.

Without indexing:

- Agents could verify identity.
- Agents could settle.
- But agents could not discover economically valuable knowledge efficiently.

The Graph transforms settlement events into: *discoverable epistemic signals.*

This is what allows ranking, filtering, signal accumulation, and market topology emergence.

**Grant reference:** [grants/GRANT-THE-GRAPH.md](grants/GRANT-THE-GRAPH.md)

---

## 4. The Full A2A Loop Across the Stack

The epistemic economy emerges when these layers interact.

### Step 1 — Publish (Base + IPFS)

- Agent publishes artifact to IPFS.
- Computes `artifactHash`.
- Constructs canonical envelope.
- Computes `kbHash`.
- Registers on Base.

Now the KB has:

- Immutable identity.
- Verifiable artifact commitment.
- Public lineage anchor.

### Step 2 — Derive (Base)

- Agent references prior `kbHash`.
- New KB created with `sources = [parentHash]`.
- DAG grows.

Attribution is structural and immutable.

### Step 3 — Use and Settle (Base)

- Agent consumes KB.
- Calls `settleQuery`.
- Settlement event emitted.
- Royalty propagates deterministically.
- Proof bundle derivable from logs.

Settlement becomes: payment + attribution routing + public usage signal.

### Step 4 — Index (The Graph)

Subgraph indexes:

- `settlementCount`
- `totalSettledValue`
- lineage depth
- derivation graph
- payer identity

Signals become queryable.

### Step 5 — Discover (The Graph)

Agents discover KBs by:

- Settlement volume.
- Derivation density.
- Domain filters.
- Reputation signals.

High-utility KBs accumulate signals. Low-utility KBs remain but fade in discovery.

Economic selection replaces moderation.

---

## 5. Why This Produces an Epistemic Economy

An economy emerges when:

- Contributions are attributable.
- Usage is measurable.
- Value flows predictably.
- Signals influence future behavior.

In Alexandrian:

| Property | Protocol mechanism |
|----------|--------------------|
| **Attribution** | Lineage DAG (`sources` in envelope) |
| **Usage measurement** | Settlement events (`settleQuery`) |
| **Value flow** | Royalty propagation through DAG |
| **Signal visibility** | Subgraph indexing via The Graph |

Agents coordinate around:

- Shared `kbHash` references.
- Verifiable artifacts.
- Public economic signals.

No central operator determines ranking. No platform custodies settlement. No mutation invalidates prior knowledge.

**The economy is emergent from protocol invariants.** See [protocol/INVARIANTS.md](protocol/INVARIANTS.md) for the nine enforced invariants (INV-1 through INV-9).

---

## 6. Ecosystem Contribution Summary

### Contribution to Base

- Generates structurally recurring settlement transactions.
- Anchors non-speculative, utility-driven value flow.
- Demonstrates economic primitives beyond token trading.
- Emits replayable proof-bearing transactions.

### Contribution to IPFS

- Drives content-addressed artifact publication.
- Couples CID storage to economic identity.
- Demonstrates integrity-first knowledge markets.
- Promotes storage-agnostic epistemic portability.

### Contribution to The Graph

- Produces deterministic, high-signal indexing use case.
- Exercises lineage indexing and settlement metrics.
- Enables queryable knowledge market topology.
- Demonstrates economic-signal-based discovery.

---

## 7. Grant-Aligned Positioning per Reviewer

### For The Graph reviewers

The subgraph is not a dashboard. It is the discovery layer of the protocol. Designed topology-first:

- Deterministic entity IDs (`contentHash.toLowerCase()`).
- Idempotent event handlers.
- Reorg-resilient indexing.
- Explicit subgraph verification in the test suite.
- No source-of-truth ambiguity — `contentHash` is simultaneously the off-chain kbId, on-chain registry key, and subgraph entity ID.

### For Base/Coinbase reviewers

Settlement is the core transaction type:

- Deterministic identity verified by any party.
- Economic invariants enforced on-chain (zero leakage).
- ABI stability gated by CI snapshot.
- Supply chain hygiene (`pnpm audit` blocks on high/critical CVEs).
- Hermetic tests — no network, no live chain, no wallet funding required for verification.

### For IPFS reviewers

Artifact integrity is cryptographically committed at publish time:

- `artifactHash = keccak256(artifact_bytes)` included in the canonical envelope.
- `kbHash` remains stable regardless of storage location or hosting provider.
- Any agent can re-derive and verify the artifact hash from IPFS bytes independently.
- Storage-agnostic: the protocol does not depend on IPFS being available to verify identity.

---

## 8. Final Positioning Statement

> Alexandrian M1 passes deterministic identity validation (25 canonical vectors, 57,000+ property permutations), enforces INV-1 through INV-9, conserves royalties under randomized DAG simulation, prevents cycles and duplicate sources, maintains ABI stability, has zero skipped tests, and passes security audit with no high/critical vulnerabilities — all reproducible via a single deterministic command.
>
> This test suite guarantees: deterministic identity across runtimes, immutable DAG enforcement, no economic leakage, no ABI regression, no high/critical dependency vulnerabilities, and fully reproducible verification.
>
> Alexandrian does not build a centralized knowledge marketplace. It provides Base with immutable identity and settlement, IPFS with artifact integrity and portability, and The Graph with discoverable economic signals. Together, these layers enable a machine-readable epistemic economy where autonomous agents publish structured knowledge, derive from prior contributions, settle usage trustlessly, accumulate public signals, and coordinate around shared, verifiable epistemic primitives.
>
> M1 delivers the Base identity and settlement substrate. Subsequent milestones operationalize discovery, ranking, and coordination on top of that invariant foundation. The economy is not speculative. It is the emergent behavior of identity + integrity + settlement + signal visibility across Base, IPFS, and The Graph.

---

## References

| Document | Purpose |
|----------|---------|
| [AI-RELIABILITY-SUBSTRATE.md](AI-RELIABILITY-SUBSTRATE.md) | Problem statement: Alexandrian as the missing substrate beneath AI reliability systems |
| [grants/GRANT-COINBASE.md](grants/GRANT-COINBASE.md) | Base Builders grant application |
| [grants/GRANT-THE-GRAPH.md](grants/GRANT-THE-GRAPH.md) | The Graph grant application |
| [grants/GRANT-IPFS.md](grants/GRANT-IPFS.md) | IPFS grant application |
| [EPISTEMIC-ECONOMY-VISION.md](EPISTEMIC-ECONOMY-VISION.md) | Internal protocol analysis: is this what we build? |
| [EPISTEMIC-ECONOMY-MILESTONES.md](EPISTEMIC-ECONOMY-MILESTONES.md) | M1–M6 roadmap with deliverable breakdown |
| [protocol/INVARIANTS.md](protocol/INVARIANTS.md) | Nine formal economic invariants (INV-1..INV-9) |
| [protocol/PROTOCOL-SPEC.md](protocol/PROTOCOL-SPEC.md) | Normative protocol specification (v2.0.0, frozen) |
| [M1-CERTIFICATION-REPORT.md](M1-CERTIFICATION-REPORT.md) | M1 certification report (9-stage, all PASS) |
| [grants/LIVE-DEMO-PROOF.md](grants/LIVE-DEMO-PROOF.md) | On-chain evidence: tx hashes, royalty math, subgraph queries |
| [M1-SCOPE-FREEZE.md](M1-SCOPE-FREEZE.md) | M1 scope (complete) and M2 deferral list |
| [VERIFY-M1.md](VERIFY-M1.md) | Verification commands and expected output |
