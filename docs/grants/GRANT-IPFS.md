# 🏛 Alexandrian Protocol

## IPFS / Filecoin — Grant Application

[![M1 Verification](https://github.com/alexandrianprotocol/alexandrian-protocol/actions/workflows/ci.yml/badge.svg)](https://github.com/alexandrianprotocol/alexandrian-protocol/actions/workflows/ci.yml)
[![M1 Live](https://img.shields.io/badge/M1-Live-2ea44f)](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000)
[![Deployed on Base](https://img.shields.io/badge/Base-Mainnet-0052FF)](https://basescan.org/address/0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000)
[![Indexed by The Graph](https://img.shields.io/badge/TheGraph-Indexed-6747ED)](https://api.studio.thegraph.com/query/1742359/alexandrian-protocol/version/latest)
[![Artifacts on IPFS](https://img.shields.io/badge/IPFS-Anchored-65C2CB)](https://ipfs.io/ipfs/bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y/kb-f/artifact.json)

Alexandrian is a deterministic knowledge identity and settlement layer. Integrity is on-chain — `artifactHash` committed to Base, enforced by hashing. IPFS is the portability layer — artifacts are retrievable from anywhere, by anyone, without centralized hosting. Without the on-chain hash commitment, portability means nothing. Without IPFS, the commitment is verifiable but the artifact is not accessible. Both are required.

---

## Summary

- M1 is live: deterministic KB identity and settlement anchored on Base mainnet.
- IPFS is the canonical artifact layer — not convenience storage, but the portability primitive that makes artifact bytes accessible without centralized hosting.
- Integrity is on-chain: `artifactHash` is committed to Base via `kbHash`. Verification is cryptographic: fetch CID bytes, recompute hash, compare to committed `artifactHash`. No trusted intermediary required.
- KB-F demonstrates the complete pin-first workflow — real CIDv1 stored on-chain, end-to-end verification passing from public data alone.
- Identity remains storage-independent — artifacts are re-pinnable without `kbHash` mutation.
- M2 funding hardens CID binding workflows, pinning redundancy, and artifact verification tooling.
- Protocol invariants remain unchanged; M2 strengthens artifact persistence, availability, and retrieval reliability.

---

## Independent Verification

Verify the live KB-F artifact end-to-end from public data:

```bash
pnpm run ipfs:kb-f:onchain -- --gateway https://ipfs.io
# Expected: integrity.verdict = "verified"
```

**Or manually:**

```
1. Fetch publish tx: 0x87288b5c76651cf92789437f9e29e5b1c68fea5fa3ca33b11c3dc5a875b5c10f
2. Read KBPublished event → kbHash
3. Call getKnowledgeBlock(kbHash) → read on-chain CID
4. Fetch https://ipfs.io/ipfs/<cid>/artifact.json
5. keccak256(bytes) == envelope.artifactHash  ✓ verified
```

**Live artifact:** [KB-F on IPFS](https://ipfs.io/ipfs/bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y/kb-f/artifact.json)

| Step | What It Proves |
|---|---|
| CID stored on-chain | Artifact pointer is immutable and public |
| `keccak256(bytes) == artifactHash` | Byte-level integrity is cryptographically enforced |
| No gateway dependency | Any IPFS node can serve and verify the artifact |
| Re-pinnable without identity drift | Storage location is independent of `kbHash` |

---

## The Problem

Modern AI stacks can generate outputs, retrieve information, orchestrate workflows, transfer value, persist artifacts, and index topology. What they lack is a foundational primitive: a canonical identity and settlement layer for structured knowledge.

Without it, knowledge cannot be:

- **Attributed** — contribution lacks protocol-level enforcement
- **Compounded** — derivation is reconstructed post hoc instead of encoded structurally
- **Discovered** — utility is measured privately rather than emitted as public signal
- **Retrieved efficiently** — the same work is regenerated instead of addressed by stable identity
- **Coordinated on** — agents have no shared, addressable reference for knowledge objects

This is not a limitation of intelligence. It is an identity and integrity gap.

Without content-addressed storage, identity can remain stable while content silently changes. An agent retrieving a KB by `kbHash` has no guarantee that the artifact bytes match the committed hash — unless retrieval and verification are bound together by protocol.

> For the full roadmap of where this leads: [`EPISTEMIC-ECONOMY-MILESTONES.md`](docs/EPISTEMIC-ECONOMY-MILESTONES.md) · [`AI-RELIABILITY-SUBSTRATE.md`](docs/AI-RELIABILITY-SUBSTRATE.md)

**Alexandrian is that layer. IPFS is the portability primitive it depends on.**

---

## Why IPFS Is Protocol-Critical

Without IPFS:

- Artifact bytes depend on centralized URLs — a server going down breaks retrieval
- Identity can remain stable while content silently changes — the hash is committed but the bytes are inaccessible
- Persistence depends on a single hosting service — no redundancy, no re-pinning
- Retrieval requires trusting a storage provider to serve the correct bytes

With IPFS:

- CIDs are content-addressed — the address is derived from the bytes, so different bytes produce a different address
- Retrieval is location-independent — any node can serve the same content
- Artifacts are portable — any participant can re-pin and serve without changing the CID
- Availability is redundant — multiple providers can pin the same CID independently

**What each layer actually does:**

| Layer | Role |
|---|---|
| `keccak256` hashing | Establishes integrity — the cryptographic commitment. If bytes change, the hash changes. |
| Base (on-chain) | Enforces the commitment — `artifactHash` stored immutably via `kbHash`. No one can change what was committed. |
| IPFS | Portability and availability — artifacts retrievable from any node, without centralized hosting. CIDs ensure you cannot serve different bytes under the same address. |

In Alexandrian:

- On-chain `artifactHash` commits to the artifact bytes — **this is where integrity lives**
- IPFS CID makes the artifact retrievable from anywhere — **this is what IPFS provides**
- The Graph indexes both for structured discovery

**Integrity is on-chain. Portability is IPFS.**

IPFS is not auxiliary storage. It is the availability layer that makes on-chain integrity commitments actionable — without it, the hash is committed but the artifact is unreachable.

---

## The Protocol

Three primitives. No token. ETH-native.

```text
kbHash = keccak256("KB_V1" || JCS(normalize(envelope)))
```

| Primitive | What It Does |
|---|---|
| **Deterministic identity** | Every KB has a stable, canonical address derived from its content — attributed, retrievable, and referenceable across systems |
| **Immutable lineage DAG** | Derivation is encoded on-chain, not reconstructed — knowledge compounds across contributors |
| **Settlement + royalty routing** | Usage triggers atomic, lineage-aware ETH settlement — attribution is enforced at the protocol level, not assumed |

Identity is content-derived. Lineage is immutable. Payment is automatic.

---

## Architecture

| Layer | Responsibility | IPFS Role |
|---|---|---|
| **Base** | Settlement rail + identity anchor | Commits `artifactHash` on-chain — this is where integrity lives |
| **IPFS** | Content vault — portable artifact retrieval | Makes the on-chain commitment actionable — bytes retrievable from any node, without centralized hosting |
| **The Graph** | Coordination surface — discovery, ranking, signals | Resolves what to fetch; IPFS provides where to fetch it from |

---

## CID Verification Workflow

The canonical artifact verification flow in Alexandrian:

```
Agent
  └── queries subgraph          (resolve KB identity + CID)
  └── retrieves: contentHash, artifactHash, CID
         │
         ▼
  fetch bytes from IPFS via CID
         │
         ▼
  recompute keccak256(bytes)
         │
         ▼
  compare: recomputedHash == artifactHash ?
         │
  ✓ verified → safe to consume
  ✗ mismatch → reject artifact
```

No centralized authority validates the artifact. Integrity is cryptographic and reproducible by any agent.

---

## KB-D and KB-F: IPFS Integration Record

### What KB-D accomplished

KB-D is registered on Base mainnet at publish tx [`0x83233ec...`](https://basescan.org/tx/0x83233ec285d3dbd06b715aa34c5de3f500789f1e685e2c20f2fe1d3384a7050c).

| Claim | Status |
|---|---|
| Canonical envelope format correct | ✅ |
| `kbHash` derivation deterministic | ✅ |
| `publishKB` succeeded on Base mainnet | ✅ |
| Local artifact hash verified (`match: true, bytes: 385`) | ✅ |
| IPFS pinning completed | ❌ — never executed |
| Real CID stored on-chain | ❌ — `cid = "demo"` permanent in registry |
| End-to-end gateway verification | ❌ — not possible without real CID |

KB-D proved the canonical hash mechanism and on-chain registration work correctly. The IPFS layer was scaffolded but not executed — `cid = "demo"` is an honest record of that state, not a protocol failure.

### What KB-F closes

| Gap in KB-D | KB-F fix |
|---|---|
| `cid = "demo"` on-chain | Pin first → real CIDv1 → `publishKB` → stored on-chain permanently |
| Envelope `artifactHash` ≠ IPFS file hash | KB-F envelope `artifactHash = keccak256(artifact.json bytes)` — same value IPFS verification checks |
| `artifactHash` only in off-chain `kb-record.json` | KB-F `artifactHash` in canonical envelope, committed on-chain via `kbHash` |

After KB-F, the full verification chain works from public data alone:

```
1. Fetch kbHash from KBPublished event
2. Call getKnowledgeBlock(kbHash) → read on-chain CID
3. Fetch https://ipfs.io/ipfs/<cid>/artifact.json
4. keccak256(bytes) == envelope.artifactHash  ✓
```

### KB-F workflow

```bash
# Pin artifact to IPFS
PINATA_JWT=<jwt> pnpm run ipfs:kb-f:pin

# Publish to Base mainnet with real CID on-chain
PRIVATE_KEY=<funded_key> pnpm run ipfs:kb-f:publish

# Full end-to-end verification
pnpm run ipfs:kb-f:onchain -- --gateway https://ipfs.io
# Expected: integrity.verdict = "verified"
```

---

## Protocol in Practice

### Publishing a Knowledge Block with IPFS

```
Agent (wallet)
  └── normalizes envelope         (JCS canonical form)
  └── pins artifact to IPFS       (pin-first workflow → real CIDv1)
  └── derives kbHash              (artifactHash from pinned bytes)
  └── calls publishKB             (identity + CID written on-chain)
         │
         ├── Base        — KB identity + CID anchored on-chain
         ├── IPFS        — artifact pinned, addressable by CID
         └── The Graph   — KnowledgeBlock node indexed, CID discoverable
```

### Querying and Verifying an Artifact

```
Agent (wallet)
  └── queries subgraph            (resolve KB by domain + signal)
  └── reads: contentHash, CID     (from indexed KnowledgeBlock)
  └── fetches bytes from IPFS     (via CID — any gateway or node)
  └── verifies: hash(bytes) == artifactHash
  └── calls settleQuery           (ETH routed atomically to contributors)
         │
         ├── Base        — settlement recorded on-chain
         ├── IPFS        — artifact integrity confirmed
         └── The Graph   — settlementCount updated, signal strengthened
```

---

## Storage + Pinning + Redundancy Model

### Storage Model

Artifacts are:
- Serialized canonical envelope
- Normalized deterministically
- Stored as IPFS objects
- Bound to `artifactHash`
- Referenced by CID in protocol metadata

Only CIDs are stored in metadata — never mutable URLs.

### Pinning Strategy

M2 enforces multi-layer pinning to avoid single-provider dependence:

| Layer | Provider | Role |
|---|---|---|
| Primary | Pinata | Active pinning + JWT-authenticated uploads |
| Secondary | Backup provider | Redundancy — independent of primary |
| Project-controlled | Self-hosted node | Sovereignty — no third-party dependency |
| Community | Optional mirrors | Decentralized availability |

**Policies:**
- Minimum 2 active pins per artifact
- Health monitoring for CID availability
- Periodic fetch-and-verify audit
- Size thresholds + timeout safeguards

### Failure Mode Handling

If artifact availability fails:
- `contentHash` identity remains canonical
- CID remains immutable
- Any node can rehydrate and re-pin the artifact
- Agents reject unverifiable bytes

Integrity and identity are decoupled from hosting location.

---

## Why This Benefits IPFS

Alexandrian is not passive blob storage. It is a protocol whose correctness depends on content-addressed portability.

- **Protocol-native CID binding** — `artifactHash` is committed on-chain; IPFS provides the retrieval layer that makes that commitment actionable
- **Re-pinnable without identity drift** — artifacts can migrate across providers without changing `kbHash` — portability is a protocol guarantee, not an operational assumption
- **Structured knowledge payloads** — KBs carry reasoning traces, evaluation artifacts, documentation, and dependency manifests — not arbitrary blobs
- **Real-world validation of content addressing at protocol level** — demonstrates IPFS as the portability layer for AI agent protocols, not just file hosting
- **Multi-provider pinning demand** — every KB publication generates pinning activity across redundant providers; activity scales with knowledge reuse
- **Decentralized availability** — no single gateway, no single provider; any node can serve and any agent can verify independently against the on-chain commitment

Integrity is enforced by hashing and the blockchain. IPFS makes that integrity accessible — artifacts retrievable by anyone, from anywhere, without trusting a centralized host. By making content-addressed portability protocol-critical rather than optional, Alexandrian demonstrates a class of AI-native protocols that depend on IPFS for availability, not convenience.

---

## M2 Funding Request — $25,000

**Milestone 2: Durable Artifact Infrastructure on IPFS**

M2 transitions Alexandrian from deterministic on-chain anchoring (M1) to production-grade artifact durability built natively on IPFS.

The focus is strengthening content-addressed persistence, enabling byte-level verification from CID alone, and ensuring Knowledge Blocks remain reproducible and retrievable under degraded network conditions.

This milestone makes Knowledge Block artifacts durable, independently verifiable, and resilient across provider and gateway failures.

---

### Scope Overview

| Workstream | Allocation | Est. Hours | Deliverable | Acceptance Criteria |
|------------|------------|------------|-------------|---------------------|
| Multi-Provider Pinning & Persistence Policy | 25% / $6,250 | 50h | Redundant pinning across 3+ providers + operational runbook | CID recovery succeeds under simulated provider failure |
| Artifact Verification Toolkit (CID-native) | 20% / $5,000 | 40h | CLI/SDK: CID fetch → canonical byte reconstruction → deterministic verdict | Byte-level hash verification passes reproducibly on reference corpus |
| Gateway Independence & Retrieval Hardening | 15% / $3,750 | 30h | Peer-first retrieval logic, retry/backoff, gateway fallback strategy | Successful retrieval without reliance on a single gateway |
| Canonical Content Packaging Standards | 15% / $3,750 | 30h | Byte-stable artifact packaging conventions for deterministic CID reproduction | Identical CIDs reproduced across separate environments |
| Data Availability Stress Testing | 15% / $3,750 | 30h | Network degradation simulation (node churn, provider outage) | Retrieval success ≥ 99% under failure scenarios |
| Documentation & Reproducible Verification Workflows | 10% / $2,500 | 20h | Public runbook + clean-room verification demo | End-to-end CID verification succeeds without privileged infrastructure |

| **Total** | **100% / $25,000** | **200h** | | |

---

### M2 Completion Criteria

M2 is complete when:

- Artifacts are pinned redundantly across independent IPFS providers.
- CID-based verification succeeds without reliance on centralized gateways.
- Canonical artifact packaging produces identical CIDs across environments.
- Retrieval remains stable under simulated provider and gateway failures.
- A third party can independently reproduce artifact integrity from CID alone.

---

### Strategic Impact for IPFS

M2 increases:

- Structured, long-lived CID usage for machine-readable knowledge artifacts  
- Multi-provider pinning demand  
- Deterministic, byte-stable content packaging standards  
- Gateway-independent verification workflows  
- Durable, reproducible artifact integrity for agent-based systems  

This milestone strengthens IPFS as the canonical storage layer for deterministic, content-addressed knowledge infrastructure.

**Execution priority:**
1. Mandatory CID-binding policy in publish flow
2. Open verification CLI — `fetch → hash → compare → verdict`
3. Multi-pin redundancy + failover runbook

**What this grant funds:**
- Pinning infrastructure and redundancy during M2 development
- Artifact verification tooling — open CLI and SDK path for any agent to verify independently
- Data availability hardening — retry/backoff policies for production retrieval reliability
- Canonical packaging standards — reusable conventions for all future KB artifact types

**What it does not fund:**
- Base contract work — covered under the Coinbase grant
- Subgraph indexing — covered under The Graph grant
- M3 scope — subscription model, tiered API, curation staking

**Reproducibility:** `pnpm verify` — [`VERIFY-M1.md`](docs/VERIFY-M1.md)

**Canonical scope:** [`M2-FUNDING-EXECUTION-PLAN.md`](docs/grants/M2-FUNDING-EXECUTION-PLAN.md)

---

## Evidence

| Capability | Mechanism | Evidence |
|---|---|---|
| Deterministic KB identity | JCS canonicalization + keccak256 domain separation | [`PROTOCOL-SPEC.md`](docs/protocol/PROTOCOL-SPEC.md) |
| Artifact integrity checks | Hash verification from retrieved bytes | [`canonical-envelope-spec.md`](docs/protocol/canonical-envelope-spec.md) |
| End-to-end proofability | On-chain settlement + artifact references | [`LIVE-DEMO-ARTIFACT.md`](docs/grants/LIVE-DEMO-ARTIFACT.md) |
| KB-F pin-first workflow | Real CIDv1 on-chain + verified artifact | [KB-F artifact](https://ipfs.io/ipfs/bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y/kb-f/artifact.json) |
| Deterministic consumption | Canonical vectors + conformance tests | `test-vectors/canonical/` · `test-vectors/v1/` |

---

## M1 Status

M1 is live on Base mainnet. All invariants hold.

| Capability | Status |
|---|---|
| Deterministic KB identity | ✅ Live |
| Immutable lineage DAG | ✅ Live |
| Settlement + royalty routing | ✅ Live |
| On-chain economic conservation | ✅ Verified |
| Subgraph indexing | ✅ Live |
| IPFS artifact anchoring (KB-F) | ✅ Live — real CIDv1, end-to-end verified |

Verify independently: `pnpm verify` — [`VERIFY-M1.md`](docs/VERIFY-M1.md)

---

## References

| Document | What It Contains |
|---|---|
| [`PROTOCOL-SPEC.md`](docs/protocol/PROTOCOL-SPEC.md) | Full protocol specification |
| [`canonical-envelope-spec.md`](docs/protocol/canonical-envelope-spec.md) | Canonical envelope format and hash scope |
| [`LIVE-DEMO-ARTIFACT.md`](docs/grants/LIVE-DEMO-ARTIFACT.md) | On-chain settlement transactions and royalty math |
| [`IPFS-KB-D-CLI-DEMO.md`](docs/grants/IPFS-KB-D-CLI-DEMO.md) | KB-D CLI demo and gap documentation |
| [`M2-FUNDING-EXECUTION-PLAN.md`](docs/grants/M2-FUNDING-EXECUTION-PLAN.md) | M2 scope and execution plan |
| [`VERIFY-M1.md`](docs/VERIFY-M1.md) | How to run verification locally |
| [`MAINNET-ADDRESSES.md`](docs/ops/MAINNET-ADDRESSES.md) | Deployed contract addresses |
| [`AI-RELIABILITY-SUBSTRATE.md`](docs/AI-RELIABILITY-SUBSTRATE.md) | Why deterministic KB identity is missing AI infrastructure |
| [`EPISTEMIC-ECONOMY-MILESTONES.md`](docs/EPISTEMIC-ECONOMY-MILESTONES.md) | Full protocol roadmap |
