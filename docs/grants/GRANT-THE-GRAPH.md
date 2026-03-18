# 🏛 Alexandrian Protocol

> *Turning collective expert knowledge into programmable context for AI agents.*

## The Graph — Grant Application

[![M1 Verification](https://github.com/alexandrianprotocol/alexandrian-protocol/actions/workflows/ci.yml/badge.svg)](https://github.com/alexandrianprotocol/alexandrian-protocol/actions/workflows/ci.yml)
[![M1 Live](https://img.shields.io/badge/M1-Live-2ea44f)](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000)
[![Deployed on Base](https://img.shields.io/badge/Base-Mainnet-0052FF)](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000)
[![Indexed by The Graph](https://img.shields.io/badge/TheGraph-Indexed-6747ED)](https://api.studio.thegraph.com/query/1742359/alexandrian-protocol/version/latest)
[![Artifacts on IPFS](https://img.shields.io/badge/IPFS-Anchored-65C2CB)](https://ipfs.io/ipfs/bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y/kb-f/artifact.json)

Alexandrian is a deterministic knowledge identity and settlement layer. Agents attribute, compound, discover, and coordinate through structured on-chain identity and lineage signals indexed by The Graph. Without deterministic indexing, knowledge remains isolated and non-composable.

---

## Summary

- M1 is live: deterministic KB identity, lineage DAG, and settlement routing deployed on Base.
- The Graph indexes canonical identity (`contentHash`), lineage edges, and settlement events into a deterministic query layer.
- Settlement events are indexed into replay-stable, machine-consumable economic signals.
- Entity IDs are deterministic and derived solely from on-chain state.
- Agents publish, discover, retrieve, and coordinate directly through the subgraph — without centralized orchestration.
- M2 funding hardens replay/reorg determinism, materializes derived signals, and exposes production-grade query surfaces.
- Protocol identity invariants remain unchanged; M2 hardens indexing determinism and discovery surfaces.

---

## Independent Verification

Run these queries against the live subgraph to independently verify settlement routing, royalty distribution, and lineage topology.

**Endpoint:** [alexandrian-protocol](https://api.studio.thegraph.com/query/1742359/alexandrian-protocol/version/latest)

### Settlement Query

```graphql
{
  settlements(first: 5, orderBy: timestamp, orderDirection: desc) {
    txHash
    value
    timestamp
    kb {
      contentHash
      settlementCount
      totalSettledValue
    }
    payer { id }
    royalties {
      recipient { id }
      kb { id }
      amount
    }
  }
}
```

| Field | What It Proves |
|---|---|
| `txHash` | On-chain settlement event is replayable |
| `value` | ETH amount settled per query |
| `kb.contentHash` | KB identity is deterministic and indexed |
| `kb.settlementCount` | Derived signal is materialized and queryable |
| `kb.totalSettledValue` | Cumulative economic activity per KB |
| `payer.id` | Settlement caller is recorded |
| `royalties.recipient` | Royalty routing is indexed across lineage |
| `royalties.amount` | Economic conservation is verifiable on-chain |

### Lineage Traversal Query

```graphql
{
  knowledgeBlocks(first: 10, orderBy: settlementCount, orderDirection: desc) {
    id
    contentHash
    domain
    settlementCount
    totalSettledValue
    lineageDepth
    parents {
      parent {
        id
        contentHash
        settlementCount
      }
    }
    children {
      child {
        id
        contentHash
      }
    }
  }
}
```

| Field | What It Proves |
|---|---|
| `contentHash` | KB identity is stable and content-derived |
| `settlementCount` | Economic signal is materialized per KB |
| `lineageDepth` | DAG depth is indexed and traversable |
| `parents` / `children` | Multi-entity lineage joins are queryable |
| `domain` | Domain-scoped discovery is supported |

---

## The Problem

Modern AI stacks can generate outputs, retrieve information, orchestrate workflows, transfer value, persist artifacts, and index topology. What they lack is a deterministic, canonical identity and settlement layer for structured knowledge.

Without it, knowledge cannot be:

- **Attributed** — contribution lacks protocol-level enforcement
- **Compounded** — derivation is reconstructed post hoc instead of encoded structurally
- **Discovered** — utility is measured privately rather than emitted as public signal
- **Retrieved efficiently** — the same work is regenerated instead of addressed by stable identity
- **Coordinated on** — agents have no shared, addressable reference for knowledge objects

This is not a limitation of intelligence. It is an identity and indexing gap.

Attributable knowledge requires deterministic projection of identity, lineage, and usage into a structured query plane. Without it, artifacts remain isolated — unable to compound, unable to be built upon, ephemeral by default.

> For the full roadmap of where this leads: [`EPISTEMIC-ECONOMY-MILESTONES.md`](docs/EPISTEMIC-ECONOMY-MILESTONES.md) · [`AI-RELIABILITY-SUBSTRATE.md`](docs/AI-RELIABILITY-SUBSTRATE.md)

---

## Why The Graph Is Protocol-Critical

No indexed topology → no lineage traversal.
No derived signals → no economic ranking.
No subgraph → centralized resolver required.

The protocol's usability depends on deterministic indexing of multi-entity relationships and derived signals. The subgraph is not auxiliary — it is required infrastructure. This drives multi-entity joins, derived signal computation, and protocol-native query complexity unlike static NFT indexes or dashboards.

---

## The Protocol

Three primitives. Deterministic by construction. Indexed by The Graph.

```text
kbHash = keccak256("KB_V1" || JCS(normalize(envelope)))
```

| Primitive | What It Does |
|---|---|
| **Deterministic identity** | Every KB has a stable, canonical address — attributed, retrievable, rankable, and referenceable across agents and systems |
| **Immutable lineage DAG** | Derivation is encoded on-chain, not reconstructed — knowledge compounds across contributors |
| **Settlement + royalty routing** | Usage triggers atomic, lineage-aware ETH settlement — attribution is enforced at the protocol level, not assumed |

Agents retrieve KBs by identity, rank them by settlement signal, and coordinate through shared `kbHash` references. The Graph is the surface that makes all three possible.

Identity is content-derived. Lineage is enforced on-chain. Settlement is atomic and lineage-aware.

---

## Agent Coordination via The Graph

Agents don't just consume indexed knowledge — they contribute to it and coordinate through it.

Each protocol action updates the shared, indexed state that all agents query:

| Agent Action | Protocol Call | What Gets Indexed |
|---|---|---|
| Publish knowledge | `publishKB` | New `KnowledgeBlock` node + lineage edges added to DAG |
| Settle usage | `settleQuery` | Settlement event updates signal weight of the KB |
| Build on prior work | `publishKB` with parents | New derivation edges extend the indexed topology |
| Withdraw earnings | `withdraw` | Curator activity signal updated |

The subgraph becomes a live, shared coordination surface:

- Agents **broadcast** reuse through settlement events — publicly indexed, observable by any agent
- Agents **publish** new knowledge and lineage — immediately queryable by peers
- Agents **discover** high-signal KBs by querying settlement volume, derivation density, and domain
- Agents **coordinate** around shared `kbHash` references without a centralized orchestrator

---

## Deterministic Entity Model

All entities derive strictly from on-chain events:

- `KnowledgeBlock.id = contentHash.toLowerCase()`
- `ParentEdge.id = parentHash + childHash`
- `Settlement.id = txHash + logIndex`
- Derived fields computed from indexed events only

Properties:

- No mutable primary keys
- No randomness or external data dependencies
- Idempotent handlers
- Full reindex from genesis converges to identical entity state
- All entity state is reconstructable from indexed events without external mutation

The subgraph is replay-deterministic by construction.

---

## What Is Indexed

The subgraph indexes four core entity types. All fields are derived strictly from on-chain events — no external mutation, no centralized fallback.

**`KnowledgeBlock`**

| Field | Type | Description |
|---|---|---|
| `id` | `ID` | `contentHash.toLowerCase()` — stable, deterministic entity key |
| `contentHash` | `Bytes32` | Canonical KB identity derived from content |
| `domain` | `String` | KB subject area — enables domain-scoped discovery |
| `creator` | `Address` | Publishing agent address |
| `artifactHash` | `Bytes32` | IPFS content integrity anchor |
| `settlementCount` | `BigInt` | Number of times KB has been settled |
| `totalSettledValue` | `BigInt` | Cumulative ETH settled against this KB |
| `uniquePayerCount` | `BigInt` | Distinct agents that have settled this KB |
| `lineageDepth` | `Int` | DAG depth from root — provenance scoring |
| `childCount` | `Int` | Number of derived KBs — influence signal |
| `lastSettledAt` | `BigInt` | Timestamp of most recent settlement |

**`ParentEdge`**

| Field | Type | Description |
|---|---|---|
| `id` | `ID` | `parentHash + childHash` — deterministic edge key |
| `parent` | `KnowledgeBlock` | Source KB in derivation relationship |
| `child` | `KnowledgeBlock` | Derived KB |
| `relationshipType` | `String` | Derivation metadata |

**`Settlement`**

| Field | Type | Description |
|---|---|---|
| `id` | `ID` | `txHash + logIndex` — deterministic event key |
| `txHash` | `Bytes32` | On-chain transaction reference |
| `value` | `BigInt` | ETH amount settled |
| `timestamp` | `BigInt` | Block timestamp |
| `kb` | `KnowledgeBlock` | KB being settled |
| `payer` | `Address` | Consuming agent |

**`RoyaltyDistribution`**

| Field | Type | Description |
|---|---|---|
| `id` | `ID` | Deterministic per-payout key |
| `recipient` | `Address` | Contributor receiving royalty |
| `kb` | `KnowledgeBlock` | KB in the lineage receiving attribution |
| `amount` | `BigInt` | ETH amount distributed |
| `settlement` | `Settlement` | Parent settlement event |

The on-chain contract remains the source of truth. CID metadata and artifact references are indexed alongside identity and settlement signals, enabling artifact resolution, topology traversal, and economic evaluation in a single query workflow.

---

## Why This Benefits The Graph

Alexandrian is a protocol whose operational loop — publish, settle, discover, coordinate — depends entirely on structured indexing.

**What this means for The Graph:**

- **High query complexity** — agents issue multi-entity joins across `KnowledgeBlock`, `ParentEdge`, `Settlement`, and `RoyaltyDistribution` in every discovery workflow
- **Ongoing subgraph activity** — every KB publication, settlement, and withdrawal generates new indexed state; activity scales with knowledge reuse, not speculation
- **Derived signal computation** — `settlementCount`, `lineageDepth`, `uniquePayerCount` are not cosmetic counters; they are the ranking substrate agents depend on
- **Protocol-native relationships** — lineage DAG traversal requires multi-hop joins that stress-test subgraph indexing in ways static schemas do not
- **Determinism as a requirement** — the protocol's correctness guarantees depend on replay-stable indexing; this is a real-world validation of The Graph's determinism properties
- **Agent-grade query surfaces** — M2 delivers 5+ documented reference queries that demonstrate production-level subgraph usage patterns

The indexed DAG is the coordination layer. By making The Graph protocol-critical rather than optional, Alexandrian demonstrates a class of AI-native protocols that generate sustained, high-complexity subgraph demand.

---

## Economic Signal Layer

These materialized fields are derived solely from indexed events and form the protocol's ranking substrate:

| Signal | How Derived | Agent Use Case |
|---|---|---|
| `settlementCount` | `count(QuerySettled)` per KB | Popularity trend |
| `totalSettledValue` | `sum(QuerySettled.value)` per KB | Utility-weighted ranking |
| `uniquePayerCount` | `count(distinct payer)` per KB | Breadth of reuse |
| `childCount` | Edge counts by KB | Influence/topology analysis |
| `lineageDepth` | DAG traversal depth | Provenance depth scoring |
| `lastSettledAt` | Latest settlement timestamp | Recency signal |
| Domain clustering | Grouping by KB domain | Domain-specific discovery |
| Curator activity score | Join activity and payout metrics | Trust-weighted routing |

---

## Replay & Reorg Determinism

M2 introduces:

- Full reindex-from-genesis harness
- Deterministic entity-store diffing against canonical snapshots
- Fork simulation + block rewind tests
- Derived field recomputation checks
- Zero entity drift acceptance criteria

Reindexing and replay must converge to identical entity state. No centralized resolver or fallback API is required for correctness.

---

## M2 Funding Request — $20,000

M2 is **Live Economy and Discovery** — the same protocol as M1, now hardened for agent-grade query surfaces, deterministic replay, and production indexing.

| Workstream | Allocation | Hours | Deliverable | Acceptance Criteria |
|---|---|---|---|---|
| Subgraph hardening | 30% / $6,000 | 40h | Idempotent handlers + replay-stable derived metrics | Reindex parity pass |
| Replay / reorg harness | 20% / $4,000 | 25h | Fork + rewind test suite with entity-store diffing | Zero entity drift |
| Production query layer | 20% / $4,000 | 25h | Documented agent-grade query pack + public endpoint | 5+ reference queries |
| SDK integration | 20% / $4,000 | 25h | Discovery adapters + integration examples | Integration test coverage |
| Docs + verification | 10% / $2,000 | 15h | Reproducible verification artifacts | `pnpm verify` from clean state |
| **Total** | **100% / $20,000** | **130h** | | |

**Execution priority:**
1. Deterministic replay/reorg harness with entity-store diffing
2. Materialized derived economic signals
3. Production query library for agent-grade discovery

**What this grant funds:**
- Hosted subgraph infrastructure during M2 hardening
- Replay/reorg harness — real-world validation of The Graph's determinism guarantees
- Derived signal materialization — `settlementCount`, `lineageDepth`, `uniquePayerCount` as production ranking substrate
- 5+ agent-grade reference queries with documented patterns

**Canonical scope:** [`M2-FUNDING-EXECUTION-PLAN.md`](docs/grants/M2-FUNDING-EXECUTION-PLAN.md)

---

## References

| Document | What It Contains |
|---|---|
| [`LIVE-DEMO-ARTIFACT.md`](docs/grants/LIVE-DEMO-ARTIFACT.md) | On-chain settlement transactions and royalty math |
| [`SUBGRAPH-BUILD-RUN-RESULTS.md`](docs/ops/SUBGRAPH-BUILD-RUN-RESULTS.md) | Subgraph build and indexing results |
| [`M2-FUNDING-EXECUTION-PLAN.md`](docs/grants/M2-FUNDING-EXECUTION-PLAN.md) | M2 scope and execution plan |
| [`VERIFY-M1.md`](docs/VERIFY-M1.md) | How to run verification locally |
| [`MAINNET-ADDRESSES.md`](docs/ops/MAINNET-ADDRESSES.md) | Deployed contract addresses |
