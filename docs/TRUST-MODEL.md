# Alexandrian Protocol — Trust Model (Auditor-Facing)

**Purpose:** Explicit, one-place answers for: who computes identity, who is source of truth, what the contract assumes vs verifies, and how economic rounding works. This document supports security audits and grant reviews.

**Companion:** [TRUST-MODEL-AND-STRATEGY.md](TRUST-MODEL-AND-STRATEGY.md) — broader trust boundaries and enforcement strategy.

---

## 1. Who computes KB identity (kbHash)?

**Off-chain.** The protocol does not compute `kbHash` on-chain.

- **Caller (publisher) responsibility:** Before calling `publishKB(contentHash, ...)`, the caller MUST compute `contentHash` as:
  ```text
  kbHash = "0x" + hex(keccak256(UTF8("KB_V1" || JCS(normalize(envelope)))))
  ```
  using the normative rules in [PROTOCOL-SPEC.md](protocol/PROTOCOL-SPEC.md) §2 and [canonical-spec.json](protocol/canonical-spec.json).

- **Contract behavior:** The contract accepts `contentHash` as an opaque `bytes32` and uses it as the primary key for registry state. It does **not** recompute or validate the hash against an envelope.

- **Verifier responsibility:** Any party that needs to verify that an on-chain KB matches a claimed envelope MUST recompute `kbHash` from the envelope (using the same formula) and compare to the on-chain `contentHash`. Verification is deterministic and does not require the contract.

**Implication:** Identity correctness is enforced by **economic and social accountability** (publishing a wrong hash creates a broken or unresolvable KB), not by on-chain validation. This keeps consensus-critical canonicalization in the spec and reference implementation, not in bytecode.

---

## 2. Who is source of truth?

| Layer | Source of truth for |
|-------|----------------------|
| **KB identity (kbHash)** | The normative formula (spec + reference impl). Contract stores whatever `contentHash` the caller submitted. |
| **Existence and lineage** | On-chain registry. Only registered `contentHash` values are valid targets for settlement and lineage. |
| **Settlement and royalties** | On-chain. Events and balances are authoritative. |
| **Indexing / discovery** | Subgraph or other indexers are **projections**. They reflect on-chain events; they do not define identity. See [CONSENSUS-CRITICAL.md](protocol/CONSENSUS-CRITICAL.md) §4. |

---

## 3. What the contract assumes vs verifies

| Item | Contract assumes | Contract verifies |
|------|-------------------|-------------------|
| **contentHash** | Caller computed it correctly per spec. | Not verified. Stored as given. |
| **Parents exist** | Caller only references already-registered KBs. | Yes — `publishKB` requires each `parentHash` to exist (`ParentNotRegistered` otherwise). |
| **No self-reference** | — | Yes — parent cannot equal the KB’s own `contentHash`. |
| **Attribution BPS** | Sum of parent BPS ≤ 10000 (after protocol fee). | Yes — `_validateAttributionShares` enforces. |
| **Settlement amount** | Caller sends exactly `kb.queryFee`. | Yes — `msg.value == kb.queryFee` required. |
| **Slashed state** | — | Yes — slashed KBs cannot be queried; slashed parents skipped for royalties. |

---

## 4. What is NOT guaranteed by the protocol

- **Semantic correctness** of payload or artifact.
- **Availability** of artifact bytes (IPFS or other storage is out of scope).
- **Uniqueness** of (domain, type, payload) — multiple KBs can describe similar content with different hashes if envelope or lineage differs.
- **Ranking or quality** — the protocol does not rank, recommend, or assign epistemic authority.

---

## 5. Economic rounding model

Settlement and royalty distribution use **integer division** in fixed-point basis points. No floating point.

- **Protocol fee:** `protocolFee = (msg.value * protocolFeesBps) / 10000`. Remainder stays in `distributable`.
- **Parent royalty:** For each parent, `share = (distributable * links[i].royaltyShareBps) / 10000`. Truncation is toward zero.
- **Curator remainder:** `curatorAmount = distributable - parentTotal`. Any rounding “dust” from parent truncation **accrues to the direct curator** of the queried KB.

**Invariants:**

- No wei is **created**: `Σ (parent shares) + curatorAmount ≤ distributable`, with equality in the absence of truncation; any truncation reduces the sum, and the remainder is exactly `curatorAmount`.
- No wei is **destroyed**: total wei leaving the contract (protocolFee + parent payouts + curator payout) does not exceed `msg.value`.

**Documentation:** Implementations MUST use integer division only. No rounding that creates or destroys wei. See [INVARIANTS.md](protocol/INVARIANTS.md) §9 (Royalty Constraint) and [FORMAL-DEFINITIONS.md](FORMAL-DEFINITIONS.md) §2.2 (Economic conservation).
