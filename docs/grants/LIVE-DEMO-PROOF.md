# Live Deployment Evidence — M1 Infrastructure Proof

## 1. Environment

- Network: Base Mainnet (`chainId = 8453`)
- Registry Contract: `0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000`
- Subgraph Endpoint: The Graph Studio (`latest`)
- Settlement Asset: ETH (no protocol token dependency)

This demo proves deterministic identity, DAG lineage, royalty routing, economic conservation, and indexed discovery on mainnet.

## 2. Deterministic Knowledge Block Identity

### Canonical Identity Formula

```text
contentHash = keccak256(JCS(canonical_envelope))
```

- Canonicalization: RFC 8785 JCS
- Hash: keccak256 (domain-separated in protocol spec)
- Identity independent of publisher, SDK, or subgraph runtime

### Verified Demo KBs

| KB | Role | Parents |
|---|---|---|
| KB-A | Root feature | — |
| KB-B | Derived from A | A |
| KB-C | Derived from A + B | A, B |
| KB-D | Derived from C | C |

Each KB has:
- deterministic `contentHash`,
- artifact commitment,
- immutable lineage registration.

## 3. On-Chain Evidence (Base Mainnet)

| Action | Tx Hash | Gas Used |
|---|---|---:|
| Publish KB-A | *(not individually recorded)* | — |
| Publish KB-B | *(not individually recorded)* | — |
| Publish KB-C | *(not individually recorded)* | — |
| Publish KB-D | [`0x83233ec285d3dbd06b715aa34c5de3f500789f1e685e2c20f2fe1d3384a7050c`](https://basescan.org/tx/0x83233ec285d3dbd06b715aa34c5de3f500789f1e685e2c20f2fe1d3384a7050c) | *(see receipt on Basescan)* |
| Settlement (`0.001 ETH` -> KB-D) | [`0x87288b5c76651cf92789437f9e29e5b1c68fea5fa3ca33b11c3dc5a875b5c10f`](https://basescan.org/tx/0x87288b5c76651cf92789437f9e29e5b1c68fea5fa3ca33b11c3dc5a875b5c10f) | *(see receipt on Basescan)* |
| Withdraw | [`0x79da1704354b4297882d3cd2045b966f0d9030d584ec35ec37910b6ced419ddd`](https://basescan.org/tx/0x79da1704354b4297882d3cd2045b966f0d9030d584ec35ec37910b6ced419ddd) | *(see receipt on Basescan)* |

### Royalty Structure

- B -> A = 10%
- C -> A = 5%
- C -> B = 15%
- D -> C = 20%

Settlement targeted **KB-D**.  
**KB-C received parent royalties** from that settlement path.

## 4. Economic Conservation Proof

For settlement of `0.001 ETH` on KB-D:

| Recipient | Amount | Share |
|---|---:|---:|
| Protocol treasury | `0.00002 ETH` | 2% |
| KB-D curator | `0.000784 ETH` | 78.4% |
| KB-C curator (parent royalty) | `0.000196 ETH` | 19.6% |

Invariant check:

```text
treasury + KB-D payout + parent royalty = settlementValue
0.00002 + 0.000784 + 0.000196 = 0.001
```

No wei created. No wei lost.

## 5. Indexed Topology Proof (The Graph)

The subgraph indexes deterministically:
- `KnowledgeBlock` entities (`id = contentHash.toLowerCase()`)
- lineage edges
- settlement events
- royalty distribution events

### Identity Query
Returns canonical `contentHash` and metadata.

### DAG Query
Returns:
- explicit parent/child relationships
- `parentCount` / `childCount` style topology fields (where available)

### Settlement Query
Returns:
- direct settlement records
- aggregated settlement counters (where materialized)
- payer-distribution views

Subgraph role is protocol discovery layer, not only analytics.

## 6. Artifact Integrity Layer (IPFS)

Artifact binding model:
- artifact commitment stored in protocol envelope / on-chain metadata path,
- CID references stored off-chain.

Verification flow:

```text
keccak256(downloaded_bytes) == artifactHash
```

Identity validity remains independent of storage location.

Reference implementation:
- deterministic KB-D package: `ipfs/kb-d/`
- CLI flow and acceptance criteria: `docs/grants/IPFS-KB-D-CLI-DEMO.md`

## 7. Determinism & Replay Guarantees

The system guarantees:
- same envelope -> same `contentHash` across implementations,
- deterministic keying across on-chain and indexing layers,
- reproducible canonical identity derivation from envelope bytes.

## 8. What This Demonstrates

This is not a mock. This is live infrastructure:
- deployed deterministic knowledge identity on Base,
- live ETH settlement with DAG royalty propagation,
- indexed topology/discovery on The Graph,
- verifiable artifact commitment model.

M1 establishes a deterministic, economically conserved, publicly queryable knowledge identity and settlement protocol.

## 9. Why This Must Be On-Chain

Alexandrian does not use blockchain for storage, compute, or indexing.  
It uses blockchain for one narrowly defined purpose: **neutral, atomic, economically conserved settlement of knowledge attribution**.

This rationale is directly evidenced by:
- Section 2 (deterministic identity),
- Section 3 (on-chain settlement actions),
- Section 5 (indexed discovery over immutable logs).

### 9.1 Atomic Royalty Routing Across a Lineage DAG

Each KB may derive from multiple parents. When settlement occurs, value must propagate in one atomic transaction:
- to the settled KB,
- to each upstream parent,
- by declared royalty basis points.

This prevents:
- intermediary interception,
- skipped contributors,
- partial payout states,
- race-condition payout drift.

Off-chain payout servers can compute splits, but cannot enforce atomic, non-custodial, trust-minimized distribution.

### 9.2 Settlement-Backed Proof of Knowledge Usage

Settlement is not only payment; it is usage proof:
- anchors kbId in on-chain logs,
- emits deterministic event records,
- becomes independently indexable through The Graph.

This yields:
- auditable usage signals,
- non-repudiable attribution,
- trustless discovery metrics.

If usage were off-chain, visibility and integrity depend on operator honesty.

### 9.3 Neutral Namespace and Identity Anchoring

KB identity is content-addressed:

```text
kbId = keccak256(JCS(envelope))
```

IPFS gives content integrity; chain anchoring gives shared namespace finality:
- canonical registry anchor,
- timestamped existence proofs,
- identity semantics independent of a single host.

### 9.4 Economic Conservation as Contract Invariant

Protocol settlement enforces:

```text
sum(distributed) + treasury == settlementValue
```

This prevents:
- hidden inflation,
- silent fee extraction,
- payout drift.

Settlement is a deterministic economic function, not discretionary server policy.

### 9.5 Why Not Git + IPFS + Server?

| Property | Git/IPFS/Server | Alexandrian On-Chain |
|---|---|---|
| Atomic royalty routing | Requires trusted operator | Contract-enforced |
| Neutral namespace anchor | Forkable competing registries | Canonical contract anchor |
| Economic conservation | Server accounting trust | EVM invariant enforcement |
| Public usage signals | Private or mutable logs | Immutable event logs |
| Non-custodial payouts | Custodian required | Direct withdrawal model |

The chain is not used for artifact storage. It is used to remove discretionary authority from settlement.

### 9.6 Why Base Specifically

Base enables:
- low-fee settlement viability,
- EVM composability,
- practical micro-settlement economics.

### 9.7 What Is Explicitly Not On-Chain

To keep chain usage minimal and purpose-built:
- artifact payloads -> IPFS,
- discovery queries -> subgraph,
- ranking algorithms -> off-chain,
- agent logic -> off-chain,
- coordination semantics -> future anchored layer.

On-chain scope remains:
- identity registration,
- lineage relationships,
- settlement routing,
- economic invariants.

### 9.8 Minimal Necessary Claim

Alexandrian does not claim all knowledge must be on-chain.  
It claims trustless economic attribution across independent agents requires a neutral atomic settlement layer.

Without on-chain settlement, the system is a structured registry + calculator.  
With it, it becomes a non-custodial knowledge identity and settlement primitive with verifiable economic signals.
