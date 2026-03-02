# Live Deployment Artifact — M1 Infrastructure

Alexandrian M1 is live on Base mainnet. This document provides independently verifiable record for every M1 claim — deterministic identity, economic conservation, DAG royalty routing, and indexed discovery. All claims can be verified from public data using the commands and queries below. No trusted SDK, no operator access required.

## Environment

| | |
|---|---|
| Network | Base Mainnet (`chainId = 8453`) |
| Registry Contract | [`0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000`](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000#code) |
| Subgraph Endpoint | `__alexandrian-protocol__` |
| Settlement Asset | ETH (no protocol token dependency) |

## Document Map

| For | See |
|---|---|
| Protocol invariants this settlement satisfies | `protocol/INVARIANTS.md` |
| How to run the full M1 test suite | `VERIFY-M1.md` |
| Canonical identity specification | `protocol/PROTOCOL-SPEC.md` |
| Subgraph schema definitions | `subgraph/schema.graphql` |

---

## 1. Reproduce This

Any reviewer can independently verify all M1 claims from public data.

### 1.1 Re-derive the conservation proof from the settlement receipt
```bash
cast tx 0x87288b5c76651cf92789437f9e29e5b1c68fea5fa3ca33b11c3dc5a875b5c10f \
  --rpc-url https://mainnet.base.org
```

Expected: internal transfers sum to exactly `0.001 ETH`.

| Recipient | Amount | Share |
|---|---:|---:|
| Protocol treasury | `0.00002 ETH` | 2% |
| KB-D curator | `0.000784 ETH` | 78.4% |
| KB-C curator (parent royalty) | `0.000196 ETH` | 19.6% |
```text
0.00002 + 0.000784 + 0.000196 = 0.001
```

No wei created. No wei lost.

### 1.2 Verify contentHash determinism

Re-derive KB-D's `contentHash` from the envelope bytes and confirm it matches the on-chain registration — independent of any live chain:
```bash
pnpm verify:m1
```

All tests pass. No chain connection required. The test suite re-derives `keccak256(JCS(envelope))` for each demo KB, asserts identity is stable across runs, and exercises key-order independence and cross-implementation equivalence.

> **JCS (JSON Canonicalization Scheme, RFC 8785)** ensures the same JSON object always produces the same byte sequence regardless of key ordering, whitespace, or serialization library. This is what makes `contentHash` deterministic across independent implementations.

### 1.3 Query the subgraph for settlement and lineage data

Endpoint: `__alexandrian-protocol__`

**Settlement query**
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

| Field | What it proves |
|---|---|
| `txHash` | On-chain settlement event is replayable |
| `value` | ETH amount settled per query |
| `kb.contentHash` | KB identity is deterministic and indexed |
| `kb.settlementCount` | Derived signal is materialized and queryable |
| `kb.totalSettledValue` | Cumulative economic activity per KB |
| `payer.id` | Settlement caller is recorded |
| `royalties.recipient` | Royalty routing is indexed across lineage |
| `royalties.amount` | Economic conservation is verifiable on-chain |

**Lineage traversal query**
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

| Field | What it proves |
|---|---|
| `contentHash` | KB identity is stable and content-derived |
| `settlementCount` | Economic signal is materialized per KB |
| `lineageDepth` | DAG depth is indexed and traversable |
| `parents` / `children` | Multi-entity lineage joins are queryable |
| `domain` | Domain-scoped discovery is supported |

### 1.4 Verify artifact hash against IPFS
```bash
# Download the KB-D artifact package
ipfs get <CID from kb-d envelope>

# Re-derive the hash
keccak256 kb-d/artifact.json
```

Expected output matches `artifactHash` stored in the KB-D on-chain envelope. Identity holds independent of storage location.

---

## 2. Deterministic Knowledge Block Identity

### Canonical Identity Formula
```text
contentHash = keccak256(JCS(canonical_envelope))
```

- Canonicalization: RFC 8785 JCS — same JSON always produces the same bytes regardless of key order or serialization library
- Hash: keccak256 (domain-separated per protocol spec)
- Identity independent of publisher, SDK, or subgraph runtime

### Verified Demo KBs

| KB | Role | Parents |
|---|---|---|
| KB-A | Root feature | — |
| KB-B | Derived from A | A |
| KB-C | Derived from A + B | A, B |
| KB-D | Derived from C | C |

Each KB has a deterministic `contentHash`, artifact commitment, and immutable lineage registration.

---

## 3. On-Chain Evidence (Base Mainnet)

| Action | Tx Hash |
|---|---|
| Publish KB-D | [`0x83233ec285d3dbd06b715aa34c5de3f500789f1e685e2c20f2fe1d3384a7050c`](https://basescan.org/tx/0x83233ec285d3dbd06b715aa34c5de3f500789f1e685e2c20f2fe1d3384a7050c) |
| Settlement (`0.001 ETH` → KB-D) | [`0x87288b5c76651cf92789437f9e29e5b1c68fea5fa3ca33b11c3dc5a875b5c10f`](https://basescan.org/tx/0x87288b5c76651cf92789437f9e29e5b1c68fea5fa3ca33b11c3dc5a875b5c10f) |
| Withdraw | [`0x79da1704354b4297882d3cd2045b966f0d9030d584ec35ec37910b6ced419ddd`](https://basescan.org/tx/0x79da1704354b4297882d3cd2045b966f0d9030d584ec35ec37910b6ced419ddd) |

> KB-A, KB-B, and KB-C publish transactions were not individually recorded. Their `contentHash` values and lineage registrations are verifiable via the subgraph lineage traversal query in Section 1.3.

### Royalty Structure

- B → A = 10%
- C → A = 5%
- C → B = 15%
- D → C = 20%

Settlement targeted **KB-D**. **KB-C received parent royalties** from that settlement path.

---

## 4. Economic Conservation Proof

For settlement of `0.001 ETH` on KB-D:

| Recipient | Amount | Share |
|---|---:|---:|
| Protocol treasury | `0.00002 ETH` | 2% |
| KB-D curator | `0.000784 ETH` | 78.4% |
| KB-C curator (parent royalty) | `0.000196 ETH` | 19.6% |
```text
treasury + KB-D payout + parent royalty = settlementValue
0.00002 + 0.000784 + 0.000196 = 0.001
```

No wei created. No wei lost.

---

## 5. Indexed Topology Proof (The Graph)

The subgraph indexes deterministically from on-chain events:

- `KnowledgeBlock` entities (`id = contentHash.toLowerCase()`)
- Lineage edges
- Settlement events
- Royalty distribution events

Run the queries in Section 1.3 against the live endpoint to verify. The subgraph is the protocol's discovery layer — not an analytics add-on.

---

## 6. Artifact Integrity Layer (IPFS)

Artifact binding model:
- Artifact commitment stored in protocol envelope / on-chain metadata path
- CID references stored off-chain

Verification flow:
```text
keccak256(downloaded_bytes) == artifactHash
```

Identity validity remains independent of storage location. Reference implementation and CLI acceptance criteria: `docs/grants/IPFS-KB-D-CLI-DEMO.md`

---

## 7. Determinism & Replay Guarantees

- Same envelope → same `contentHash` across implementations
- Deterministic keying across on-chain and indexing layers
- Reproducible canonical identity derivation from envelope bytes

---

## 8. Why This Must Be On-Chain

This section addresses the design question reviewers most commonly raise: why does knowledge attribution require a blockchain at all?

Alexandrian uses blockchain for one narrowly defined purpose: **neutral, atomic, economically conserved settlement of knowledge attribution**. Artifact payloads go to IPFS. Discovery queries go to the subgraph. Ranking, agent logic, and coordination semantics are off-chain. On-chain scope is limited to identity registration, lineage relationships, settlement routing, and economic invariant enforcement.

### 8.1 Atomic Royalty Routing Across a Lineage DAG

Each KB may derive from multiple parents. Settlement propagates value atomically — to the settled KB and each upstream parent by declared royalty basis points — in a single transaction. This prevents intermediary interception, skipped contributors, partial payout states, and race-condition payout drift. Off-chain payout servers can compute splits; they cannot enforce atomic, non-custodial distribution.

### 8.2 Settlement-Backed Proof of Knowledge Usage

Settlement is usage proof: it anchors `kbId` in on-chain logs, emits deterministic event records, and becomes independently indexable through The Graph. This yields auditable usage signals, non-repudiable attribution, and trustless discovery metrics. Off-chain usage signals depend on operator honesty.

### 8.3 Neutral Namespace and Identity Anchoring

IPFS gives content integrity. Chain anchoring gives shared namespace finality: canonical registry anchor, timestamped existence proofs, identity semantics independent of a single host.

### 8.4 Economic Conservation as Contract Invariant
```text
sum(distributed) + treasury == settlementValue
```

This is an EVM invariant, not discretionary server policy. It prevents hidden inflation, silent fee extraction, and payout drift.

### 8.5 Why Not Git + IPFS + Server?

| Property | Git/IPFS/Server | Alexandrian On-Chain |
|---|---|---|
| Atomic royalty routing | Requires trusted operator | Contract-enforced |
| Neutral namespace anchor | Forkable competing registries | Canonical contract anchor |
| Economic conservation | Server accounting trust | EVM invariant enforcement |
| Public usage signals | Private or mutable logs | Immutable event logs |
| Non-custodial payouts | Custodian required | Direct withdrawal model |

### 8.6 Why Base Specifically

Base enables low-fee settlement viability, EVM composability, and practical micro-settlement economics.

### 8.7 What Is Explicitly Not On-Chain

| Layer | Location |
|---|---|
| Artifact payloads | IPFS |
| Discovery queries | Subgraph |
| Ranking algorithms | Off-chain |
| Agent logic | Off-chain |
| Coordination semantics | Future anchored layer |
| Identity registration | **On-chain** |
| Lineage relationships | **On-chain** |
| Settlement routing | **On-chain** |
| Economic invariants | **On-chain** |
