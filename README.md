# Alexandrian Grant M1 Release Surface

[![M1 Verification](https://github.com/jlo-code/alexandria-protocol-v3/actions/workflows/ci.yml/badge.svg)](https://github.com/jlo-code/alexandria-protocol-v3/actions/workflows/ci.yml)

Alexandrian Protocol is a deterministic, content-addressed knowledge registry and settlement layer for AI systems. Knowledge identity is anchored on Base, full artifacts are stored on IPFS, and discovery topology is queryable via The Graph. Each Knowledge Block (KB) identity is derived from canonical content, not metadata, so the same envelope yields the same kbId across runtimes.

This directory is the reviewer-ready M1 surface.

It is intentionally split from the dev surface and includes only:
- Protocol + SDK packages required for M1 verification.
- Deterministic test vectors and M1 test suites.
- M1 documentation and deployment anchors.

To publish this folder as a standalone GitHub repository, use `EXPORT.md`.
Docs sync behavior is documented in `docs/SYNC-POLICY.md`.

## Executive Summary

> Alexandrian is a deterministic, content-addressed knowledge registry and settlement layer. Layer 1 (Base) anchors canonical KB identity and enforces lineage DAG + economic settlement. Layer 2 (IPFS) stores full immutable artifacts that can be independently verified against on-chain artifact commitments. Layer 3 (The Graph) indexes topology and economic usage signals so agents can discover, rank, and verify reusable knowledge without a centralized resolver. M1 delivers deterministic identity, acyclic lineage, settlement and attribution primitives, proof vectors, and live deployment evidence. The protocol is verified through conformance vectors, invariants, and deterministic tests; live settlement and indexing proofs are included in the grant artifacts.

## Grant Reviewer TL;DR

- M1 is live: deterministic KB identity, DAG lineage, and settlement are implemented and verifiable.
- Every KB has canonical identity (`kbHash`) from canonical envelope content, not publisher metadata.
- Reuse is economically coupled: settlements emit public, replayable signals and route royalties by lineage.
- Verification is reproducible from a single command: `pnpm verify`.
- M2 extends the same invariants into production discovery and signal-weighted selection (no identity rule changes).
- Coordination (M5) builds on shared `kbHash` references; governance/scale (M6) extends deployment, not core semantics.

## How The Three Layers Work Together

| Layer | Responsibility | Mechanism | Evidence |
|---|---|---|---|
| Layer 1: Identity + Settlement (Base) | Canonical kbId, DAG lineage, atomic settlement, royalty routing | `contentHash = keccak256("KB_V1" || JCS(canonical_envelope))`; contract enforces invariants and settlement routing | `docs/protocol/PROTOCOL-SPEC.md`, `docs/protocol/INVARIANTS.md`, `docs/grants/LIVE-DEMO-PROOF.md` |
| Layer 2: Artifact Storage (IPFS) | Store full payloads and evidence artifacts as content-addressed bytes | Artifact bytes pinned by CID; integrity validated against committed artifact hash | `docs/protocol/canonical-envelope-spec.md`, `docs/grants/LIVE-DEMO-PROOF.md` |
| Layer 3: Discovery + Topology (The Graph) | Queryable lineage, settlement activity, and discovery signals | Deterministic entity IDs from `contentHash.toLowerCase()`, idempotent event indexing | `docs/ops/SUBGRAPH-BUILD-RUN-RESULTS.md`, `docs/grants/GRANT-THE-GRAPH.md` |

## What This Is Not

- Not a model provider.
- Not a vector database.
- Not a centralized memory API.
- Not token-dependent economics.
- Not dependent on a single proprietary indexer.

## 60-Second Reviewer Path

From `release/grant-m1`:

```bash
pnpm install
pnpm verify
```

Single command for full M1 verification:

```bash
pnpm verify
```

## Runtime (Pinned)

- Node.js: `20.x` (known good: `20.19.0`)
- pnpm: `9.x` (known good: `9.0.0`)

Known-good matrix:

| OS | Node | pnpm | Status |
|---|---|---|---|
| Ubuntu latest (GitHub Actions) | 20.19.0 | 9.0.0 | Pass (CI) |
| Windows 11 | 20.x | 9.x | Pass (local) |

## What `pnpm verify` Runs

1. Build required M1 packages (`protocol`, `sdk-core`, `sdk-adapters`).
2. Execute M1 test surface:
   - Protocol contract tests.
   - Conformance tests.
   - Vitest suites: `specification`, `invariants`, `demonstration`, `determinism`, `property`, `composition`.
3. Print deterministic verification summary.

## Machine-Readable Epistemic Economy for A2A

### Executive Summary

Alexandrian establishes a deterministic identity and settlement layer for structured knowledge objects. In M1, it delivers immutable Knowledge Block (KB) identity, acyclic lineage, and trustless royalty routing on Base mainnet.

An epistemic economy for A2A emerges when:
- knowledge objects have canonical, verifiable identity,
- lineage is enforced as a directed acyclic graph (DAG),
- settlement emits public, replayable usage signals,
- discovery ranks knowledge by those signals,
- agents coordinate by referencing shared, verifiable `kbHash` identities.

M1 delivers the substrate (identity, lineage, settlement). M2-M4 operationalize discovery and ranking signals. M5 adds structured A2A coordination semantics. M6 hardens governance and scale.

### 1. Deterministic Knowledge Identity (Foundation of A2A)

Canonical identity:

```text
kbHash = keccak256("KB_V1" || JCS(normalize(envelope)))
```

Properties:
- same envelope gives same `kbHash` across machines,
- independent of publisher,
- independent of storage location,
- verifiable offline before chain interaction.

For A2A systems this provides shared object identity, deterministic referencing, and no dependency on centralized resolvers.

### 2. Immutable Lineage (Epistemic Topology)

Each KB declares explicit parents (`sources`). The protocol enforces:
- no self-reference,
- no cycles,
- no mutation,
- max parent constraints.

Resulting topology:

```text
G = (V, E)
V = kbHash identities
E = derivation edges
```

This makes provenance and contribution machine-checkable.

### 3. Settlement as Usage Proof (Economic Coupling)

Settlement binds economics to epistemic identity:

```text
Settle(K, amount) -> deterministic royalty propagation
```

Key invariants:
- economic conservation,
- royalty-share cap enforcement,
- pull-based withdrawals,
- proof derivable from logs,
- settlement only valid for identity-valid KBs.

Settlement is simultaneously payment, attribution routing, and public signal emission.

### 4. Public Signal Accumulation (Market Formation)

Indexed signals include:
- `settlementCount`,
- `totalSettledValue`,
- `uniquePayerCount`,
- derivation depth,
- parent and child counts.

Feedback loop:

```text
Agent uses KB -> settlement emitted -> signal indexed -> discovery influenced -> next agent selection
```

This is market-based epistemic filtering.

### 5. Role Differentiation (Machine-Native Participation)

| Role | Protocol Primitive |
|---|---|
| Creator | `publishKB` |
| Refiner | `publishKB` (with parents) |
| Consumer | `settleQuery` |
| Curator | bundle/domain references |
| Evaluator | rubric/assessment KBs |

Roles emerge from protocol behavior, not platform permissions.

### 6. A2A Coordination Layer (M5)

Coordination objects add:
- task schemas referencing `kbHash` identities,
- constraint-bound state transitions,
- multi-agent continuation semantics,
- deterministic task settlement hooks.

Because identity, lineage verification, and settlement primitives are already shared, agents can coordinate without ambiguity.

### 7. Governance by Adoption, Not Mutation

Governance does not mutate identity:
- upgrades are new KBs,
- forks are new branches,
- legitimacy emerges through reuse and settlement,
- canonicality emerges via adoption signals.

This preserves historical truth and deterministic replay.

### 8. Milestone Execution Path

| Milestone | Contribution to A2A Epistemic Economy |
|---|---|
| M1 | Deterministic identity and settlement substrate |
| M2 | Discovery and exposed economic signals |
| M3 | Market topology and role tooling |
| M4 | Ranking and epistemic filtering |
| M5 | Coordination semantics for multi-agent workflows |
| M6 | Multi-chain scale and decentralized governance |

Invariants remain unchanged across milestones:
- KB hash never changes,
- updates create new KBs,
- lineage remains acyclic,
- settlement remains conserved.

### Final Positioning

Alexandrian is not a centralized knowledge marketplace. It provides:
- deterministic knowledge identity,
- lineage-aware attribution,
- economically conserved settlement,
- publicly indexable usage signals.

These primitives enable a machine-readable epistemic economy for A2A coordination where contribution, reuse, and refinement are verifiable, attributable, and economically coupled.

Read more:
- `docs/AI-RELIABILITY-SUBSTRATE.md` — infrastructure gap: the missing deterministic identity and settlement primitive; what it unlocks (persistent knowledge, compounding, structured derivation, auditable lineage, public telemetry)
- `docs/EPISTEMIC-ECONOMY-POSITIONING.md` — executive positioning: why Base, IPFS, and The Graph are each structurally necessary; full A2A loop; gold-standard grant statement
- `docs/EPISTEMIC-ECONOMY-BRIEF.md` — compact protocol brief: architecture overview, per-layer rationale, A2A loop diagram, ecosystem impact, M1 status table
- `docs/protocol/PROTOCOL-SPEC.md`
- `docs/protocol/INVARIANTS.md`
- `docs/EPISTEMIC-ECONOMY-MILESTONES.md`
- `docs/grants/M2-FUNDING-EXECUTION-PLAN.md`
- `docs/grants/LIVE-DEMO-PROOF.md`
- `docs/VERIFY-M1.md`

## Immutable Reference Anchors

- Registry deployment manifest: `packages/protocol/deployments/AlexandrianRegistryV2.json`
- Seed KB IDs: `seeds/publish-order.json`
- Envelope and proof vectors: `test-vectors/canonical/` and `test-vectors/v1/`
- Protocol spec: `docs/protocol/PROTOCOL-SPEC.md`
- M2 funding execution strategy: `docs/grants/M2-FUNDING-EXECUTION-PLAN.md`

## Scope Boundary (Out of Scope)

The following are intentionally excluded from this release surface:
- M2 and later implementation scope (roadmap context is included for reviewer continuity).
- Infrastructure stacks and operational environments (Docker, live service orchestration).
- Historical reviewer collateral and development-only artifacts.

## Proof Of Run

After running `pnpm verify`, record evidence in:
- `PROOF-OF-RUN.md` using `PROOF-OF-RUN.template.md`

Include:
- Commit hash
- Timestamp (UTC)
- Exact command
- Pass/fail result

## Freeze Policy

This surface is release-oriented:
- Stability over refactors.
- No behavior changes without matching invariant/vector updates.
- Changes should preserve deterministic identity and invariant guarantees.
