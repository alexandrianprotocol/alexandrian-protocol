# 🏛 Alexandrian Protocol

## Base — Grant Application

[![M1 Verification](https://github.com/jlo-code/alexandria-protocol-v3/actions/workflows/ci.yml/badge.svg)](https://github.com/jlo-code/alexandria-protocol-v3/actions/workflows/ci.yml)
[![M1 Live](https://img.shields.io/badge/M1-Live-2ea44f)](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000)
[![Deployed on Base](https://img.shields.io/badge/Base-Mainnet-0052FF)](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000)
[![Indexed by The Graph](https://img.shields.io/badge/TheGraph-Indexed-6747ED)](https://api.studio.thegraph.com/query/1742359/alexandrian-protocol/version/latest)
[![Artifacts on IPFS](https://img.shields.io/badge/IPFS-Anchored-65C2CB)](https://ipfs.io/ipfs/bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y/kb-f/artifact.json)

Alexandrian is a knowledge identity and settlement layer on Base. Agents publish attributable knowledge, build on prior work, and settle usage fees in ETH — with royalties routed automatically across the derivation graph, on-chain, per use.

---

## Summary

- M1 is live on Base mainnet — contract [`0x5D6dee4B...B000`](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000) deployed, source-verified, and actively settling.
- Each settlement is payment, attribution, and on-chain usage proof in one transaction — replayable, no intermediary required. Live proof: [`0x87288b5c...`](https://basescan.org/tx/0x87288b5c76651cf92789437f9e29e5b1c68fea5fa3ca33b11c3dc5a875b5c10f)
- ETH-native — no ERC-20 required for settlement, royalty routing, or governance.
- M2 funding delivers production discovery APIs, subgraph hardening, and artifact verification — same protocol as M1, now publicly queryable.

## Network

| Field | Value |
|---|---|
| Network name | Base |
| Chain ID | `8453` |
| Explorer | [basescan.org](https://basescan.org) |

## Contracts

| Contract | Address | Notes |
|---|---|---|
| **AlexandrianRegistry (V2)** | [`0x5D6dee4B...B000`](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000) | Canonical mainnet registry. Deployed via `scripts/deploy-mainnet.cjs` from `packages/protocol` (AlexandrianRegistryV2). |
| **Deployer** | [`0x6939c3E5...465B`](https://basescan.org/address/0x6939c3E5Fe823B1115Ece40948DF0fB99100465B) | Deployer EOA (no Safe). |


## Post-Deploy Integrity

| Field | Value |
|---|---|
| Deployment Tx | [`0xd35f0e44...c3c4`](https://basescan.org/tx/0xd35f0e44504860e206568a298e0692bb5212a474125a08cace3d1e430cd8c3c4) |
| Chain ID | `8453` |
| Block Number | `42593045` |
| Bytecode Hash | `0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470` |
---

## The Problem

Modern AI stacks can generate outputs, retrieve information, orchestrate workflows, transfer value, persist artifacts, and index topology. However, they lack a foundational primitive:

**A canonical identity and settlement layer for structured knowledge.**

Without it, knowledge cannot be:

- **Attributed** — contribution lacks protocol-level enforcement
- **Compounded** — derivation is reconstructed post hoc instead of encoded structurally
- **Discovered** — utility is measured privately rather than emitted as public signal
- **Retrieved efficiently** — the same work is regenerated repeatedly instead of addressed by stable identity
- **Coordinated on** — agents have no shared, addressable reference for knowledge objects

This is not a capability problem. What's missing is a canonical identity and settlement layer for knowledge.

> For the full roadmap of where this leads: [`EPISTEMIC-ECONOMY-MILESTONES.md`](docs/EPISTEMIC-ECONOMY-MILESTONES.md) · [`AI-RELIABILITY-SUBSTRATE.md`](docs/AI-RELIABILITY-SUBSTRATE.md)

**Alexandrian is that layer.**

---

## The Protocol

Alexandrian introduces the missing primitive.

A minimal, three-primitive epistemic substrate:

```text
kbHash = keccak256("KB_V1" || JCS(normalize(envelope)))
```

| Primitive | What it does |
|---|---|
| **Deterministic identity** | Ensures canonical knowledge identity across machines and environments |
| **Immutable lineage DAG** | Enforces derivation structure as an acyclic graph on-chain |
| **Settlement + royalty routing** | Couples knowledge reuse to atomic, lineage-aware value flow |


An A2A epistemic economy emerges when: 
- Identity is canonical
- Derivation is immutable
- Usage produces public signals 
- Coordination occurs through shared `kbHash` reference

Agents coordinate not through regeneration, but through shared references to stable epistemic primitives.

---

## Architecture

```
Agents / Orchestrators
  └── bring a wallet          (identity + signing)
  └── stake a Knowledge Block (reputation + attribution)
         │
         ▼
Alexandrian Protocol
  └── anchors identity        (kbHash — canonical, content-derived)
  └── enforces lineage        (immutable DAG — who built on what)
  └── routes settlement       (ETH flows atomically across contributors)
         │
         ├── Base        — settlement rail + identity anchor
         ├── IPFS        — content vault (artifact integrity by CID)
         └── The Graph   — coordination surface (discovery, ranking, signals)
```

| Layer | Responsibility | Live |
|---|---|---|
| **Base** | Settlement rail + identity anchor | [Contract](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000) · [Settlement tx](https://basescan.org/tx/0x87288b5c76651cf92789437f9e29e5b1c68fea5fa3ca33b11c3dc5a875b5c10f) |
| **IPFS** | Content vault — artifact integrity by CID | [KB-F artifact](https://ipfs.io/ipfs/bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y/kb-f/artifact.json) |
| **The Graph** | Coordination surface — discovery, ranking, signals | [Subgraph](https://thegraph.com/studio/subgraph/alexandrian-protocol/) |

---

## Protocol in Practice

### Querying a Knowledge Block

```
Agent (wallet)
  └── queries subgraph        (find high-signal KB by domain + settlementCount)
  └── retrieves by kbHash     (stable identity — same address everywhere)
  └── calls settleQuery       (ETH routed atomically to all contributors)
         │
         ├── Base        — settlement recorded on-chain
         ├── IPFS        — artifact resolved by CID
         └── The Graph   — settlementCount updated, signal strengthened
```

### Publishing a Knowledge Block

```
Agent (wallet)
  └── normalizes envelope     (JCS canonical form)
  └── derives kbHash          (deterministic — content drives identity)
  └── calls publishKB         (identity + lineage written on-chain)
         │
         ├── Base        — KB identity anchored, lineage edges recorded
         ├── IPFS        — artifact pinned by CID
         └── The Graph   — new KnowledgeBlock node indexed, discoverable
```

### Building on Prior Work

```
Agent (wallet)
  └── queries subgraph        (find parent KBs by domain + lineage depth)
  └── derives new kbHash      (parent hashes encoded in envelope)
  └── calls publishKB         (parent edges written on-chain)
         │
         ├── Base        — derivation edge immutable in DAG
         ├── IPFS        — new artifact anchored by CID
         └── The Graph   — lineage traversal extended, topology updated
```

### Withdrawing Earnings

```
Agent (wallet)
  └── accumulated royalties   (from all settlements across lineage)
  └── calls withdraw          (ETH transferred to contributor address)
         │
         └── Base        — economic conservation verified on-chain
```

---

## On-Chain Execution Surface

| Action | Caller | Function | What Happens |
|---|---|---|---|
| Register KB | Publisher | `publishKB` | KB identity and lineage written on-chain |
| Settle usage | Consumer agent | `settleQuery` | ETH routed to all contributors in the lineage |
| Withdraw earnings | Contributor | `withdraw` | Accumulated ETH transferred to recipient |

---

## Why Base

Per-use royalty routing only works with low, predictable gas. At L1 costs it is not viable. Base makes per-use settlement practical at agent scale — this is a design requirement, not a preference.

Alexandrian generates recurring on-chain activity: KB registrations, usage settlements, royalty payouts, and withdrawals. This scales with knowledge reuse and is driven by utility, not speculation.

Builders on Base can add knowledge attribution and ETH royalty routing to their products without writing custom payout logic or issuing tokens.

---

## Mechanism-to-Evidence Mapping

| What It Does | How It Works | Proof |
|---|---|---|
| Same KB ID everywhere | Content hash: `keccak256("KB_V1" \|\| JCS(...))` | [`PROTOCOL-SPEC.md`](docs/protocol/PROTOCOL-SPEC.md), ADR 0001/0002, test vectors |
| No value lost in settlement | Split logic enforced in contract | [`INVARIANTS.md`](docs/protocol/INVARIANTS.md), economic invariant tests |
| No circular lineage | Parent existence + cycle check at registration | Protocol invariant tests |
| Live royalty routing | ETH split across contributor lineage at settle time | On-chain tx: [`0x87288b5c...`](https://basescan.org/tx/0x87288b5c76651cf92789437f9e29e5b1c68fea5fa3ca33b11c3dc5a875b5c10f) · [`LIVE-DEMO-PROOF.md`](docs/grants/LIVE-DEMO-PROOF.md) |
| Queryable settlement data | KB entity IDs derived from content hash; subgraph reindexes consistently | [`SUBGRAPH-BUILD-RUN-RESULTS.md`](docs/ops/SUBGRAPH-BUILD-RUN-RESULTS.md) |

---

## M2 Deliverables

> M2 makes the live protocol publicly discoverable and production-ready. The settlement rules don't change — the query and verification surfaces get built out.

| Item | Allocation | What Gets Built | Done When |
|---|---|---|---|
| Discovery APIs | 30% | Public endpoints to query KBs by domain, lineage, and settlement activity | Stable endpoint with reproducible responses |
| Subgraph hardening | 20% | Indexing that stays consistent through chain reorgs | Reindex produces identical output after fork simulation |
| Artifact verification | 20% | CLI to verify IPFS content matches on-chain hash | `hash(IPFS bytes) == artifactHash` passes |
| SDK & examples | 20% | Publish, verify, and settle flows with working examples | End-to-end agent workflow runs cleanly |
| Docs & certification | 10% | Updated verification artifacts and operator docs | Reviewer can independently verify from scratch |

**Execution priority:**

1. Gas benchmark + optimization report
2. Subgraph with exposed settlement signals, tested against reorgs
3. Artifact verification CLI + pinning policy

**Scope reference:** [`M2-FUNDING-EXECUTION-PLAN.md`](docs/grants/M2-FUNDING-EXECUTION-PLAN.md)

---

## Why This Fits Coinbase Grant Priorities

- New on-chain primitive: per-use knowledge settlement with automatic royalty routing
- Recurring Base transaction volume from agent-to-agent payments — driven by reuse, not speculation
- ETH-native, no new token required
- Already live on Base mainnet with on-chain settlement proof

---

## References

| Document | What It Contains |
|---|---|
| [`LIVE-DEMO-PROOF.md`](docs/grants/LIVE-DEMO-PROOF.md) | On-chain settlement transactions and royalty math |
| [`M2-FUNDING-EXECUTION-PLAN.md`](docs/grants/M2-FUNDING-EXECUTION-PLAN.md) | M2 scope and execution plan |
| [`VERIFY-M1.md`](docs/VERIFY-M1.md) | How to run verification locally |
