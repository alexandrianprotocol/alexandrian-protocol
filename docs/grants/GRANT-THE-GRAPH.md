# The Graph — Grant Application

## Project Title
Alexandrian Protocol — Deterministic Knowledge Topology and Discovery Layer

## One-Line Positioning
Alexandrian is a deterministic, content-addressed knowledge registry and settlement layer: identity anchored on Base, artifacts stored on IPFS, topology queryable via The Graph.

## Compact Reviewer Summary

- M1 is live: deterministic KB identity, lineage DAG, and settlement are implemented and reproducible.
- The Graph is the protocol discovery layer, not a dashboard.
- Deterministic entity IDs (`contentHash.toLowerCase()`) and idempotent handlers support replay-stable indexing.
- Settlement and lineage metrics become machine-consumable ranking signals for agent discovery.
- M2 funding is used for replay/reorg hardening, derived signal indexing, and production query surfaces.
- Protocol identity invariants remain unchanged across M2 delivery.

## Why The Graph Is Load-Bearing
The subgraph is not a dashboard. It is the discovery layer of the protocol.  
Without indexed topology and settlement signals, agents cannot discover reusable KBs without a centralized resolver.

## Three-Layer Architecture Context

| Layer | Responsibility | The Graph Relationship |
|---|---|---|
| Layer 1: Base | Canonical identity + settlement truth | Source events and state are indexed, never redefined |
| Layer 2: IPFS | Artifact payload bytes + CID references | CID/artifact metadata surfaced alongside topology |
| Layer 3: The Graph | Discovery, ranking signals, lineage traversal | Canonical query plane for agents and integrators |

## What Is Indexed
- KB registrations (`contentHash` as canonical key)
- Lineage edges (parent/child + relationship metadata)
- Settlement events and payouts
- Curator-level and KB-level economic activity counters

Entity IDs are deterministic (`contentHash.toLowerCase()`), enabling replay-stable indexing.

## Economic Signal Taxonomy

| Signal | How Derived | Agent Use Case |
|---|---|---|
| Settlement volume | `sum(QuerySettled.value)` per KB | Utility-weighted ranking |
| Settlement count | `count(QuerySettled)` per KB | Popularity trend |
| Unique payer count | `count(distinct payer)` per KB | Breadth of reuse |
| Lineage depth | DAG traversal depth | Provenance depth scoring |
| Parent/child fanout | edge counts by KB | Influence/topology analysis |
| Domain clustering | grouping by KB domain | Domain-specific discovery |
| Curator activity score | join activity and payout metrics | Trust-weighted routing |

## IPFS ↔ Graph Coordination
KB metadata (CID, artifact type, schema/version markers) is indexed alongside settlement and lineage signals so agents can resolve:
1. where the artifact bytes live (IPFS),
2. how it is linked in topology (The Graph),
3. and how it performs economically (settlement signals),
in one query workflow without a centralized API.

## Reorg Safety and Determinism
- Idempotent handler model and deterministic entity IDs.
- Replay/reindex should converge to the same entity state.
- No centralized fallback API required for correctness.

## Mechanism-to-Evidence Table

| Capability | Mechanism | Evidence |
|---|---|---|
| Deterministic entity identity | `contentHash`-based IDs | `docs/ops/SUBGRAPH-BUILD-RUN-RESULTS.md` |
| Idempotent indexing model | Event-derived entities, deterministic keys | `docs/ops/SUBGRAPH-BUILD-RUN-RESULTS.md` |
| Topology discovery | Parent/child edge indexing | `docs/grants/LIVE-DEMO-PROOF.md` |
| Settlement observability | Query settlement + payout indexing | `docs/grants/LIVE-DEMO-PROOF.md` |
| Protocol-verifiable identity | JCS + keccak256 spec invariants | `docs/protocol/PROTOCOL-SPEC.md` |

## M2 Deliverables (The Graph-Aligned)

| Budget Item | Allocation | Deliverable | Acceptance Metric |
|---|---:|---|---|
| Subgraph hardening | 30% | Derived metrics + deterministic handlers | Replay parity pass |
| Reorg/replay harness | 20% | Rewind/reindex deterministic test suite | Zero entity drift after replay |
| Public query surfaces | 20% | Production endpoint + documented query pack | 5+ executable reference queries |
| SDK integration | 20% | Discovery APIs integrated with SDK adapters | Integration test coverage pass |
| Documentation and vectors | 10% | Query docs + topology evidence vectors | Published and reproducible artifacts |

## M2 Scope and Funding Use (Canonical, Cross-Grant)

For reviewer clarity, M2 is standardized as "Live Economy and Discovery":
- same protocol invariants as M1, now live and discoverable,
- production discovery APIs over subgraph-indexed topology,
- exposed ranking signals (settlement + lineage counts),
- SDK hardening and IPFS/content resolution where needed.

Funding is used to deliver and harden those surfaces, not to change protocol identity rules:
- live infra + hosted indexing,
- deterministic replay/reorg hardening,
- agent-grade discovery/query endpoints,
- SDK reliability and integration examples,
- reproducible verification and certification artifacts.

Canonical M2 scope reference:
- `docs/grants/M2-FUNDING-EXECUTION-PLAN.md`

## M2 Execution Priority (Funding-Optimized)
For full M2 hardening design and critique-response checklist, see:
- `docs/grants/M2-FUNDING-EXECUTION-PLAN.md`

The Graph-priority implementation subset:
1. deterministic replay/reorg harness with entity-store diffing,
2. materialized derived economic signals,
3. production query library for agent-grade discovery.

## Why This Fits The Graph
- Topology-first protocol with deterministic identity semantics.
- No proprietary resolver dependency.
- High-value indexing target: lineage + economic signals for machine actors.
- Already live with Base deployment and queryable artifacts; grant accelerates production hardening.

## Why This Benefits The Graph

In Alexandrian, the subgraph is not a dashboard.

It is the discovery layer of the protocol.

Knowledge Blocks form a lineage DAG with settlement events flowing through that topology. Without indexed projection of:
- Parent/child relationships
- Settlement aggregation
- Derived economic signals

agents cannot discover reusable knowledge without centralized infrastructure.

The subgraph indexes:
- Deterministic `KnowledgeBlock` entities (`id = contentHash`)
- `ParentEdge` relationships
- Settlement events
- Derived metrics such as:
  - `totalSettlement`
  - `settlementCount`
  - `uniquePayerCount`
  - `childCount`
  - `lineageDepth`

These derived signals are not cosmetic analytics. They are the ranking substrate that enables:
- Economic-weighted knowledge discovery
- Domain clustering
- Provenance depth filtering
- Reuse-density analysis

The protocol is topology-first. Without indexed relationships, the system degrades into isolated registry entries.

By making The Graph the canonical discovery layer, Alexandrian demonstrates a protocol that depends on structured indexing, not optional analytics. This increases subgraph query complexity, multi-entity joins, and protocol-native data relationships.

It is a real-world case of a protocol whose usability depends on deterministic indexing.

## References
- `docs/grants/LIVE-DEMO-PROOF.md`
- `docs/AI-RELIABILITY-SUBSTRATE.md` — problem statement: Alexandrian as the missing deterministic identity substrate beneath AI reliability systems
- `docs/EPISTEMIC-ECONOMY-BRIEF.md` — compact protocol brief: architecture overview, per-layer rationale, A2A loop, ecosystem impact, M1 status table
- `docs/EPISTEMIC-ECONOMY-POSITIONING.md` — executive positioning: why Base, IPFS, and The Graph are each structurally necessary; full A2A loop; gold-standard grant statement
- `docs/ops/SUBGRAPH-BUILD-RUN-RESULTS.md`
- `docs/protocol/PROTOCOL-SPEC.md`
- `docs/protocol/INVARIANTS.md`
- `docs/M1-SCOPE-FREEZE.md`
- `docs/VERIFY-M1.md`
