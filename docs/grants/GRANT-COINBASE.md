# Coinbase — Grant Application (Base)

## Project Title
Alexandrian Protocol — Deterministic Knowledge Identity and Settlement on Base

## One-Line Positioning
Alexandrian is a deterministic, content-addressed knowledge registry and settlement layer: identity anchored on Base, artifacts stored on IPFS, topology queryable via The Graph.

## Compact Reviewer Summary

- M1 is live on Base mainnet with deterministic KB identity, lineage DAG enforcement, and settlement routing.
- Each settlement event is both payment and machine-verifiable usage evidence.
- Royalty propagation routes value across derivation lineage without custodial intermediaries.
- ETH-native operation avoids token dependency for correctness.
- M2 funding is used for production discovery surfaces, subgraph hardening, and artifact verification integration.
- Identity and hashing invariants remain stable; M2 hardens operations, not semantics.

## Executive Summary
AI systems repeatedly recompute the same knowledge, but that compute has no durable identity, attribution, or settlement. Alexandrian introduces a settlement layer for reusable knowledge on Base: each KB is canonically hashed, lineage is enforced as a DAG, and query payments are atomically routed across the royalty graph. M1 is live on Base mainnet with verified contract deployment, live settlement evidence, deterministic conformance vectors, and invariant test enforcement.

## The Problem
Today, AI knowledge reuse has no native payment primitive:
- no canonical identity for reusable artifacts,
- no trust-minimized attribution graph,
- no on-chain settlement for reuse events.

Result: regenerated work is economically invisible and attribution is non-verifiable.

## The Solution (Three-Layer Architecture)

| Layer | Responsibility | Mechanism |
|---|---|---|
| Layer 1: Base (on-chain) | Identity + settlement | `contentHash = keccak256("KB_V1" || JCS(normalize(envelope)))`; DAG lineage checks; atomic `settleQuery` routing |
| Layer 2: IPFS (artifact bytes) | Immutable payload storage | KB payloads pinned by CID; artifact integrity checked by recomputing hash from bytes |
| Layer 3: The Graph (query plane) | Discovery + topology | Deterministic indexed entities from `contentHash`, lineage edges, settlement-derived signals |

## Why Base

1. ETH-native settlement primitive  
No speculative token dependency; settlement and royalties route directly in ETH.

2. Micropayment viability  
Observed gas envelope supports low-value agent settlements:
- `publishKB` ~400k–500k gas
- `settleQuery` ~150k–180k gas (observed baseline ~152k; test threshold 182k)
- `withdraw` ~50k gas

3. Live Base evidence  
Mainnet contract deployed and source verified:
- Contract: `0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000`
- Chain: Base Mainnet (8453)
- Settlement proof: `0x87288b5c76651cf92789437f9e29e5b1c68fea5fa3ca33b11c3dc5a875b5c10f`

## Why This Benefits Base

Alexandrian introduces a new on-chain economic primitive: deterministic knowledge settlement with atomic royalty propagation.

Unlike one-time NFT mints or speculative token activity, Alexandrian generates structurally recurring transaction volume through:
- Knowledge Block registrations
- Micropayment settlement events
- Royalty routing across lineage DAGs
- Withdrawal transactions

If agents reuse knowledge artifacts, settlement accumulates over time. This creates recurring, utility-driven on-chain activity rather than event-driven speculation.

The protocol is ETH-denominated. There is no native token required for settlement, governance, or routing. This aligns directly with Base’s objective of strengthening ETH-native infrastructure without introducing additional asset fragmentation or governance overhead.

Base’s low transaction costs make micro-settlement economically viable. On mainnet Ethereum, per-use royalty routing would be cost-prohibitive. On Base, settlement can function as infrastructure, not as a luxury feature.

If adopted, Alexandrian becomes a reusable primitive:
- A shared identity layer
- A royalty-aware settlement router
- A composable attribution registry

Other builders on Base can integrate knowledge attribution without designing their own token or payout logic.

In short, Alexandrian expands Base’s economic surface area from financial flows to programmable knowledge settlement, increasing sustained transaction activity, protocol depth, and builder composability.

## Mechanism-to-Evidence Table

| Capability | Mechanism | Evidence |
|---|---|---|
| Deterministic identity | JCS canonicalization + keccak256 with `KB_V1` domain separation | `docs/protocol/PROTOCOL-SPEC.md`, ADR 0001/0002 |
| Economic conservation | Contract settlement splits + invariant tests | `docs/protocol/INVARIANTS.md`, `tests/invariants/economic-invariants.test.ts` |
| Acyclic lineage | Parent existence + cycle exclusion in registration rules | `tests/invariants/protocol-invariants.test.ts` |
| Live settlement | On-chain transaction with royalty routing | `docs/grants/LIVE-DEMO-PROOF.md` |
| Deterministic indexing | `contentHash`-derived entity IDs | `docs/ops/SUBGRAPH-BUILD-RUN-RESULTS.md` |

## M2 Deliverables (Base-Aligned)

| Budget Item | Allocation | Deliverable | Acceptance Metric |
|---|---:|---|---|
| Discovery and query surfaces | 30% | Production-grade discovery APIs over indexed topology | Stable endpoint + reproducible query responses |
| Subgraph hardening | 20% | Replay/reorg-safe derived metric indexing | Deterministic reindex parity |
| IPFS artifact binding | 20% | CID pinning and byte-level artifact verification path | `hash(IPFS bytes) == artifactHash` validation pass |
| SDK and integrator tooling | 20% | Hardened SDK flows + examples | End-to-end publish/verify/settle examples |
| Certification and docs | 10% | Updated conformance artifacts and operator docs | Release evidence checklist complete |

## M2 Scope and Funding Use (Canonical, Cross-Grant)

For reviewer clarity, M2 is standardized as "Live Economy and Discovery":
- same protocol invariants as M1, now live and discoverable,
- production discovery APIs over subgraph-indexed topology,
- exposed ranking signals (settlement + lineage counts),
- SDK hardening and IPFS/content resolution where needed.

Funding is used to deliver and harden those surfaces, not to change protocol identity rules:
- live infra + hosted indexing,
- deterministic replay/reorg hardening,
- artifact verification and IPFS binding workflows,
- SDK reliability and integration examples,
- reproducible verification and certification artifacts.

Canonical M2 scope reference:
- `docs/grants/M2-FUNDING-EXECUTION-PLAN.md`

## M2 Execution Priority (Funding-Optimized)
For M2 execution sequencing and reviewer-risk closure, see:
- `docs/grants/M2-FUNDING-EXECUTION-PLAN.md`

Base-priority implementation subset:
1. gas benchmark + optimization report,
2. replay-tested subgraph-derived settlement signals,
3. CID-bound artifact verification CLI and pinning policy.

## Why This Fits Coinbase Grant Priorities
- Introduces a new on-chain primitive (knowledge settlement, not another app abstraction).
- Drives Base transaction utility through reusable agent-to-agent payment flows.
- Uses ETH-native payment routing with deterministic proofability.
- Built and evidenced on Base mainnet now, not speculative.

## References
- `docs/grants/LIVE-DEMO-PROOF.md`
- `docs/AI-RELIABILITY-SUBSTRATE.md` — problem statement: Alexandrian as the missing deterministic identity substrate beneath AI reliability systems
- `docs/EPISTEMIC-ECONOMY-BRIEF.md` — compact protocol brief: architecture overview, per-layer rationale, A2A loop, ecosystem impact, M1 status table
- `docs/EPISTEMIC-ECONOMY-POSITIONING.md` — executive positioning: why Base, IPFS, and The Graph are each structurally necessary; full A2A loop; gold-standard grant statement
- `docs/ops/MAINNET-ADDRESSES.md`
- `docs/protocol/PROTOCOL-SPEC.md`
- `docs/protocol/INVARIANTS.md`
- `docs/M1-SCOPE-FREEZE.md`
- `docs/VERIFY-M1.md`
