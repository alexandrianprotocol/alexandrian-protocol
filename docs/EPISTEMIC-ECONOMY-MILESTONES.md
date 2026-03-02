# Milestones: Towards a Machine-Readable Epistemic Economy


See also: [EPISTEMIC-ECONOMY-BRIEF.md](EPISTEMIC-ECONOMY-BRIEF.md) · [EPISTEMIC-ECONOMY-POSITIONING.md](EPISTEMIC-ECONOMY-POSITIONING.md)

---

## Progression

M1 establishes the invariant substrate.
M2 makes it observable and discoverable.
M3 structures participation and market roles.
M4 enables economic selection and signal filtering.
M5 introduces optional coordination semantics on top of KBs.
M6 decentralizes control and expands to scale.

Each milestone adds capability without changing core invariants. KB hash never changes. The DAG is immutable. Settlement is conserved.

---

## Overview

| Milestone | Theme | One-Line Outcome |
|---|---|---|
| **M1** ✅ | Core primitive | Deterministic KB identity, lineage DAG, settlement, and proof — live on mainnet |
| **M2** | Live economy + discovery | Agents can find and settle KBs in production — economic signals observable |
| **M3** | Market topology + roles | Curators and evaluators are first-class — domains, bundles, reputation-weighted discovery |
| **M4** | Signal filtering | Economic selection is implemented — high-utility KBs surface, low-utility fade |
| **M5** *(optional)* | Coordination layer | Task-level semantics on top of KBs — multi-agent coordination without ambiguity |
| **M6** | Scale + governance | Multi-chain deployment, decentralized governance, A2A verification |

---

## M1 — Core Primitive and Transaction Layer ✅

**Goal:** A deterministic, content-addressed knowledge registry with settlement and proof.

**Delivered:**
- KB identity: `contentHash = keccak256("KB_V1" || JCS(normalize(envelope)))` — deterministic, canonical, permanent
- Registry: `publishKB`, lineage DAG, royalty routing, `settleQuery`, `withdrawEarnings`
- SDK: publish, settle, verify — conformance tests passing
- 25 canonical vectors, 57,000+ property permutations, INV-1 through INV-9 enforced
- Mainnet: [`0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000`](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000)

**M1 completion means:** Any agent can publish a KB, reference prior work, settle a query, and have royalties distributed atomically — all verifiable independently via `pnpm verify`.

---

## M2 — Live Economy and Discovery

**Goal:** The same protocol, live and discoverable. Agents can find KBs and use settlement in production.

**Deliverables:**
- Hosted signal index with production query endpoint — 5+ agent-grade reference queries
- Discovery API: find KBs by domain, type, recent settlement
- Ranking signals exposed: `settlementCount`, `lineageDepth`, `uniquePayerCount`
- SDK hardening: retry/backoff, result types through public API, browser bundle
- Deterministic replay/reorg harness — zero entity drift after reindex
- Artifact storage hardened — multi-provider pinning, availability verified

**M2 completion means:** An agent can query the signal index, discover a high-signal KB by domain, fetch the artifact from artifact storage, verify it, and settle — without any centralized intermediary. The economic loop is observable in production.

---

## M3 — Market Topology and Roles

**Goal:** The DAG is explicitly a market topology. Curators and evaluators are first-class participants.

**Deliverables:**
- Curator and evaluator publish flows — bundle and domain views
- Optional attestations (Rubric KBs) linked to knowledge objects
- Reputation-weighted discovery — settlement volume + curator reputation
- Cross-implementation conformance — at least one additional language passes canonical test vectors

**M3 completion means:** Roles are representable — creators, curators, refiners, evaluators, consumers. Discovery is reputation-weighted. The market topology is navigable.

---

## M4 — Signal Filtering and Economic Selection

**Goal:** Noise is naturally filtered by the economy. High-utility KBs surface. Low-utility KBs remain on-chain but fade.

**Deliverables:**
- Reference count and derivation success exposed by signal index
- Discovery ranked by: reference count, settlement count, derivation count, reputation weight, domain trust
- No deletion — economic irrelevance, not moderation
- Optional semantic indexing: embedding search without changing protocol identity

**M4 completion means:** An agent querying for KBs in a domain gets results ranked by real economic signal — not curated lists, not moderation queues. The protocol selects.

---

## M5 — Coordination Layer *(optional)*

**Goal:** Task-level coordination on top of KBs. KB remains the epistemic primitive — coordination is an additional layer.

**Deliverables:**
- Coordination objects (VCO-style): task step schema referencing KBs by `contentHash`
- Task state machine: defined states and transitions agents can share
- Minimal constraint language: machine-checkable step validity without changing KB hashing

**M5 completion means:** Multiple agents can coordinate on a shared task, reference the same KBs as evidence, and continue without ambiguity — while attribution and settlement remain at the KB level.

Note: M5 is explicitly optional. M1–M4 produce a complete, useful protocol without it.

---

## M6 — Scale and Governance

**Goal:** Production-scale epistemic economy — multiple chains, decentralized governance, agent-to-agent verification.

**Deliverables:**
- Multi-chain deployment: same protocol on additional chains, cross-chain identity strategy
- Decentralized governance: fee parameters and slashing thresholds governed by stake or DAO
- A2A protocol: standardized proof request/verify across implementations

**M6 completion means:** The protocol is governance-hardened and globally deployable. No single operator controls parameters. Any agent on any supported chain can participate.

---

## What Stays Invariant Across All Milestones

- **KB hash never changes.** Updates create new KBs.
- **DAG is immutable.** No in-place mutation. Lineage is acyclic.
- **Settlement is conserved.** Zero economic leakage per transaction.
- **Identity is content-derived.** `kbHash` is stable regardless of hosting, indexer, or chain.

---

## Dependency Map
```
M1 ✅  →  M2  →  M3  →  M4
                      →  M5 (optional, builds on M2–M4)
                      →  M6 (assumes healthy M2–M4 economy)
```
