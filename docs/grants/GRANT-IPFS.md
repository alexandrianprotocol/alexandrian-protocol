# IPFS — Grant Application

## Project Title
Alexandrian Protocol — Verifiable Knowledge Artifacts on IPFS

## One-Line Positioning
Alexandrian is a deterministic, content-addressed knowledge registry and settlement layer: identity anchored on Base, artifacts stored on IPFS, topology queryable via The Graph.

## Compact Reviewer Summary

- M1 is live: deterministic KB identity and settlement are anchored on Base.
- IPFS is the canonical artifact layer for retrieval portability, not convenience storage.
- Verification is cryptographic: fetch CID bytes, hash bytes, compare to committed artifact hash.
- Identity remains storage-independent; artifacts are re-pin-able without kbHash mutation.
- M2 funding is used for pinning reliability, artifact verification tooling, and retrieval hardening.
- Protocol invariants remain unchanged; M2 strengthens operational trust and availability.

## Executive Summary
Alexandrian turns reusable knowledge into a verifiable and economically attributable primitive.  
On-chain identity and settlement are already live on Base in M1. This IPFS grant request focuses on hardening Layer 2: artifact storage, pinning reliability, and byte-level verification workflows so agents can trust that retrieved artifacts match protocol commitments.

Each KB is identified deterministically from canonical envelope content. Artifact payloads are stored on IPFS and validated by recomputing hash commitments from retrieved bytes. This removes dependence on centralized hosting while preserving deterministic identity and reproducible verification.

## Why IPFS Is Critical In This Stack

| Layer | Responsibility | Why IPFS matters |
|---|---|---|
| Layer 1: Base | Canonical identity + settlement truth | Anchors identity and economics, but not full payload bytes |
| Layer 2: IPFS | Artifact bytes, docs, manifests | Durable, content-addressed storage and independent retrieval |
| Layer 3: The Graph | Discovery and topology queries | Resolves what to fetch; IPFS provides what to verify |

Without IPFS, artifacts depend on centralized storage operators. With IPFS, storage can be replaced without identity drift, because verification is hash-based.

## Problem Statement
AI systems can reference knowledge identifiers, but artifact access is often centralized and unverifiable at retrieval time. This creates:
- hosting trust assumptions,
- brittle links,
- weak reproducibility for downstream agents.

Alexandrian solves this by binding storage to protocol commitments: retrieve bytes by CID, recompute artifact commitment, accept/reject deterministically.

## Verification Path (IPFS-Centric)
1. Resolve KB identity and metadata from protocol/index.
2. Fetch artifact bytes via CID from IPFS.
3. Recompute artifact hash from bytes.
4. Compare against committed artifact hash in canonical envelope.
5. Accept if equal; reject on mismatch.

This gives storage-agnostic integrity with deterministic replay.

## Mechanism-to-Evidence Table

| Capability | Mechanism | Evidence |
|---|---|---|
| Deterministic KB identity | JCS canonicalization + keccak256 domain separation | `docs/protocol/PROTOCOL-SPEC.md` |
| Artifact integrity checks | Hash verification from retrieved bytes | `docs/protocol/canonical-envelope-spec.md` |
| End-to-end proofability | On-chain settlement + artifact references | `docs/grants/LIVE-DEMO-PROOF.md` |
| Deterministic consumption | Canonical vectors and conformance tests | `test-vectors/canonical/`, `test-vectors/v1/` |

## Proposed IPFS Grant Deliverables (M2)

| Budget Item | Allocation | Deliverable | Acceptance Metric |
|---|---:|---|---|
| Pinning and persistence policy | 25% | Multi-provider pinning strategy and runbook | Recovery and persistence checks pass |
| Artifact verification toolkit | 25% | CLI/SDK path for CID fetch + hash verification | Deterministic verify pass on sample corpus |
| Data availability hardening | 20% | Retry/backoff + resolver policy for IPFS retrieval | Stable retrieval across failure simulations |
| Content packaging standards | 15% | Canonical artifact packaging conventions and docs | Validation tests pass for all package fixtures |
| Public examples and docs | 15% | Reference workflows + reproducible demo scripts | Clean-room replay passes |

## M2 Scope and Funding Use (Canonical, Cross-Grant)

For reviewer clarity, M2 is standardized as "Live Economy and Discovery":
- same protocol invariants as M1, now live and discoverable,
- production discovery APIs over subgraph-indexed topology,
- exposed ranking signals (settlement + lineage counts),
- SDK hardening and IPFS/content resolution where needed.

Funding is used to deliver and harden those surfaces, not to change protocol identity rules:
- CID-bound artifact workflows and verification tooling,
- data-availability and pinning reliability hardening,
- discovery/query integration for agent retrieval flows,
- SDK reliability and integration examples,
- reproducible verification and certification artifacts.

Canonical M2 scope reference:
- `docs/grants/M2-FUNDING-EXECUTION-PLAN.md`

## M2 Execution Priority (Funding-Optimized)
For full execution sequencing, critique simulation, and cross-grant hardening targets, see:
- `docs/grants/M2-FUNDING-EXECUTION-PLAN.md`

IPFS-priority implementation subset:
1. mandatory CID-binding policy in publish flow,
2. open verification CLI (`fetch -> hash -> compare -> verdict`),
3. multi-pin redundancy + failover runbook.

## Why This Fits IPFS Funding Goals
- Strengthens decentralized artifact availability for a live protocol.
- Uses content addressing as a first-class integrity primitive.
- Reduces centralized resolver/storage dependence.
- Produces reusable verification tooling for agent ecosystems.

## Why This Benefits IPFS

Alexandrian separates identity from storage.

On-chain:
- `artifactHash` commitment

Off-chain:
- CID-bound artifact payload

Verification rule:

```text
keccak256(downloaded_bytes) == artifactHash
```

This ensures that storage location is irrelevant to identity. Integrity is enforced cryptographically.

IPFS is not used as convenience storage. It functions as the canonical artifact layer for:
- Structured knowledge payloads
- Documentation
- Dependency manifests
- Evaluation artifacts
- Extended reasoning traces

Because identity is bound to `artifactHash`, artifacts can be:
- Retrieved from any IPFS node
- Pinned across providers
- Mirrored without identity drift
- Verified independently of publisher

If a centralized server disappears, identity remains valid.  
If a hosting provider changes, verification remains intact.

This architecture strengthens IPFS’s core value proposition:

Content-addressed storage with verifiable integrity and portability.

By binding economic attribution to content-addressed artifacts, Alexandrian demonstrates a real protocol-level integration of IPFS, not passive blob storage.

## KB-D and KB-F: Staged IPFS Binding Demonstration

The protocol was developed in two stages for IPFS integration. This section documents exactly what each stage accomplished, what gap exists, and how KB-F closes it. Reviewers should treat this as an honest architectural record, not an apology.

### What KB-D accomplished

KB-D is registered on Base mainnet at publish tx `0x83233ec285d3dbd06b715aa34c5de3f500789f1e685e2c20f2fe1d3384a7050c`.

| Claim | Status | Verification |
|---|---|---|
| Canonical envelope format correct | ✅ | Test suite: `pnpm run test:m1` |
| `kbHash` derivation deterministic | ✅ | `keccak256("KB_V1" + JCS(normalizeForHash(envelope)))` |
| `publishKB` succeeded on Base mainnet | ✅ | `pnpm run ipfs:kb-d:onchain` |
| Registry stores and returns KB data correctly | ✅ | `getKnowledgeBlock(kbHash)` returns `exists: true` |
| Local artifact hash verified | ✅ | `pnpm run ipfs:kb-d:verify:file` → `match: true, bytes: 385` |
| IPFS pinning completed | ❌ | Never executed — no Pinata upload was run |
| Real CID stored on-chain | ❌ | `cid = "demo"` permanent in registry — no `updateCID` function exists |
| End-to-end gateway verification | ❌ | Not possible without a real CID on-chain |

### The gap: two separate things called "artifactHash"

This is the root of the KB-D limitation and requires precise explanation.

**In KB-D's canonical envelope** (`ipfs/kb-d-feature.json`):
```json
"artifactHash": "0x0862b3088fc12815fa433a4b0193ea7a163c488d756828e47f58e80f109c45e6"
```
This is `keccak256(JCS(payload))` — computed by `artifactHashFromPayload(payload)` in `canonical.ts`. It is committed on-chain via `kbHash`.

**In KB-D's `ipfs/kb-d/kb-record.json`**:
```json
"artifactHash": "0x23a62a34315b12e04aa5fc42954b850b63bba44669f8cff73f090434cfd219e3"
```
This is `keccak256(artifact.json bytes)` — the hash of the IPFS artifact file, used by `ipfs-kb-d-onchain.mjs` to verify bytes fetched from IPFS.

**These are different hashes from different sources.** The on-chain `kbHash` commits to the first value. The second exists only in `kb-record.json`. A reviewer cannot verify the IPFS artifact solely from on-chain data — the artifact hash relationship is off-chain only.

### Why cid is not in the hash scope

In `AlexandrianRegistryV2`, `publishKB` accepts `cid` as a separate parameter. In `canonical.ts`, the `HASH_SCOPE_KEYS` are:

```
["type", "domain", "sources", "artifactHash", "tier", "payload", "derivation"]
```

`cid` is intentionally absent. KB identity (`kbHash`) is independent of storage location — artifacts can be re-pinned to new providers without changing KB identity. The consequence is that KB-D could register with `cid = "demo"` and have a fully valid `kbHash`, because identity does not depend on the storage pointer.

### What KB-F demonstrates

KB-F closes both gaps using the pin-first workflow:

| Gap in KB-D | KB-F fix |
|---|---|
| `cid = "demo"` on-chain (permanent) | Pin first → receive real CIDv1 → pass to `publishKB` → stored on-chain permanently |
| Envelope `artifactHash` ≠ IPFS file hash | KB-F envelope uses `artifactHash = keccak256(artifact.json bytes)` — the same value IPFS verification checks |
| `artifactHash` only in off-chain `kb-record.json` | KB-F's `artifactHash` is in the canonical envelope, committed on-chain via `kbHash` |

After KB-F is published, the full verification chain works from public data alone:

```
1. Fetch kbHash from publish tx KBPublished event
2. Call getKnowledgeBlock(kbHash) → read on-chain cid
3. Fetch https://ipfs.io/ipfs/<cid>/artifact.json
4. keccak256(bytes) == envelope.artifactHash  ← both derivable from public data
```

### KB-F workflow

```bash
# Step 1 — compute artifactHash, upload artifact directory to IPFS
PINATA_JWT=<jwt> pnpm run ipfs:kb-f:pin

# Step 2 — publish to Base mainnet with real CID on-chain
PRIVATE_KEY=<funded_key> pnpm run ipfs:kb-f:publish

# Step 3 — full end-to-end verification
pnpm run ipfs:kb-f:onchain -- --gateway https://ipfs.io
# Expected: integrity.verdict = "verified"
```

The `publish-kb-f.mjs` script builds the canonical envelope from `ipfs/kb-f-template.json` plus the `artifactHash` written by the pin step, computes `kbHash`, and calls `publishKB` with the real CIDv1. The `kbHash` and `publishTx` are written back to `kb-record.json`.

### Summary

KB-D proved the canonical hash mechanism and on-chain registration work correctly. The IPFS layer was scaffolded but not executed — `cid = "demo"` is an honest record of that state, not a protocol failure. KB-F demonstrates the complete three-layer binding using the pin-first workflow that all production KBs should follow.

## Current Status
- M1 identity/settlement is live on Base mainnet.
- Canonical vectors and deterministic tests are in place.
- IPFS is already part of the architecture; grant accelerates production hardening of availability and verification workflows.
- KB-D demonstrates canonical hash mechanism and on-chain registration; local artifact hash verified (`match: true, bytes: 385`). IPFS pin not completed — see gap documentation above.
- KB-F scaffolded with pin-first workflow; ready to execute with Pinata JWT and funded Base wallet.
- Utility proof script (`pnpm run ipfs:kb-d:utility`) demonstrates expressiveness + scale + verifiability.
- Live on-chain check (`pnpm run ipfs:kb-d:onchain`) resolves KB hash from publish tx and reads CID from Base mainnet registry.

## References
- `docs/protocol/PROTOCOL-SPEC.md`
- `docs/protocol/canonical-envelope-spec.md`
- `docs/grants/LIVE-DEMO-PROOF.md`
- `docs/grants/IPFS-KB-D-CLI-DEMO.md`
- `docs/AI-RELIABILITY-SUBSTRATE.md` — problem statement: Alexandrian as the missing deterministic identity substrate beneath AI reliability systems
- `docs/EPISTEMIC-ECONOMY-BRIEF.md` — compact protocol brief: architecture overview, per-layer rationale, A2A loop, ecosystem impact, M1 status table
- `docs/EPISTEMIC-ECONOMY-POSITIONING.md` — executive positioning: why Base, IPFS, and The Graph are each structurally necessary; full A2A loop; gold-standard grant statement
- `docs/VERIFY-M1.md`
- `docs/M1-SCOPE-FREEZE.md`
