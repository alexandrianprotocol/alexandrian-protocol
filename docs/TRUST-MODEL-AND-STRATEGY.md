# Alexandrian Protocol — Trust Model and Strategy

```yaml
document:
  id: TRUST-001
  version: 1.0.0
  owner: protocol-team
  status: stable
  classification: public
  last_reviewed: "2026-02-25"
  schema_version: "1.0"
  depends_on:
    - PROTO-STD-001
    - PROTO-CONF-001
    - SEC-001
    - PROTO-001
```

> **Mixed document:** §1–§4 are **normative** (trust boundaries, verification requirements).
> §5–§8 are **non-normative** (enforcement strategy, roadmap).
>
> For normative hashing and canonicalization rules, see [STANDARDS.md](STANDARDS.md)
> and [PROTOCOL-SPEC-001](protocol/PROTOCOL-SPEC.md).
> For the trust primitive (what is signed/hashed/stored/verified), receipt format, agent identity, and gap analysis vs Step 1, see [AGENT-TRUST-ENVELOPE.md](AGENT-TRUST-ENVELOPE.md).

---

## 1. Normative Trust Model

### 1.1 The Four-Layer Stack

```
┌────────────────────────────────────────────────────────────────┐
│  Application Layer — Agents                                     │
│  Intent is agent-defined. Protocol cannot constrain intent.     │
├────────────────────────────────────────────────────────────────┤
│  SDK / Stamp Layer — Policy                                     │
│  What clients accept/reject. Enforcement above protocol min.    │
├────────────────────────────────────────────────────────────────┤
│  Infrastructure Layer — Operator                               │
│  Subgraph indexing. Tooling. No privileged settlement access.   │
├────────────────────────────────────────────────────────────────┤
│  Protocol Layer — Truth                                         │
│  Identity derivation rules. Settlement events. Invariants.      │
└────────────────────────────────────────────────────────────────┘
```

> **Normative:** The Protocol Layer is authoritative. Layers above it MAY add policy
> but MUST NOT contradict or circumvent protocol-layer rules.

### 1.2 Does the Contract Recompute kbHash?

**No.** The contract accepts a precomputed `contentHash` (kbHash) as a parameter and does not recompute it.

```solidity
function publishKB(
  bytes32 contentHash,   // ← precomputed by caller (kbHash value)
  address curator,
  KBType kbType,
  string calldata domain,
  uint256 queryFee,
  string calldata cid,
  AttributionLink[] calldata parents
) external payable;
```

The contract uses `contentHash` (kbHash) as the primary key for `knowledgeBlocks`, `stakes`, `reputation`,
and `attributionDAG`. It does not hash the envelope.

> **Normative:** Any caller that publishes a KB MUST compute `kbHash` per STANDARDS.md §5
> before submitting to the contract.

> **Normative:** Off-chain verification MUST recompute `kbHash` from the envelope and
> compare to the on-chain registered value. This is the caller's responsibility, not the contract's.

> **Informative:** This keeps consensus-critical canonicalization in the spec and reference
> implementation, not in bytecode. It allows the hashing algorithm to evolve (in a new major
> version) without a contract upgrade.

### 1.3 Protocol vs SDK vs Stamp

| Layer | Role | Authority |
|-------|------|-----------|
| **Protocol (truth)** | Identity derivation rules + settlement events | Normative — enforced by contract + VirtualRegistry |
| **SDK (policy)** | Client-side enforcement — what is accepted/rejected before RPC | Normative to the extent it enforces the protocol minimum |
| **Stamp (signal)** | Off-chain attestation — optional, brand-issued | Non-normative — does not affect identity |

> **Normative:** A stamp MUST NOT alter `kbHash` derivation.
> A stamp is evidence that verification was performed, not a substitute for it.

### 1.4 Operator (Infrastructure) Scope

> **Normative:** The operator (Infrastructure layer) has NO privileged access to settlement
> routing, royalty attribution, or KB identity. The contract enforces economic rules
> independently of any off-chain operator.

---

## 2. On-Chain Trust Properties

### 2.1 Immutability

Once registered, a KB's `kbHash` is permanent:

- `AlreadyPublished` revert: a `contentHash` (kbHash) slot can never be overwritten.
- No account (including deployer, admin, or publisher) can modify, delete, or retransfer KB identity.
- The contract is NOT upgradeable (no proxy pattern).

### 2.2 Admin Scope (Bounded Privilege)

The admin role is limited to operational controls that do not affect KB identity or royalty routing:

| Admin capability | Scope | KB identity affected? |
|-----------------|-------|----------------------|
| Pause / unpause contract | Emergency halt only | No |
| Slash a KB (with reason) | Marks KB invalid; terminal; irreversible | No — identity preserved |
| Update `protocolFeeBps` | Affects future settlements; bounded by cap | No |
| Grant / revoke roles | Admin hygiene | No |

> **Normative:** Admin actions MUST NOT retroactively alter the `kbHash` or royalty shares
> of any registered KB.

### 2.3 Slashing

Slashing is terminal and irreversible:

- A slashed KB cannot be settled or cited in new KBs.
- The KB record remains in the registry (for historical provenance).
- Slashing requires the admin role; no self-slash mechanism exists.

---

## 3. Off-Chain Trust Properties

### 3.1 Subgraph Trust

The subgraph is a **read cache**, not a source of truth.

| Property | On-chain contract | Subgraph |
|----------|-----------------|---------|
| Source of truth | ✅ Yes | ❌ No |
| Reorg-safe | ✅ Yes | ⚠ Idempotent handlers; cached |
| Proof-valid | ✅ Yes | ❌ No — requires RPC |
| Query-friendly | ⚠ Limited | ✅ Yes |

> **Normative:** Settlement proof verification MUST use on-chain RPC confirmation.
> Subgraph data MAY be used for discovery and display but MUST NOT be the sole basis
> for a settlement proof.

### 3.2 SDK Trust

The SDK enforces:
- Protocol invariants before any RPC call (via VirtualRegistry)
- Typed error handling with stable error codes
- `kbHash` verification in `verifyStrict()`

The SDK is NOT a trusted oracle. Any party can call the contract directly.
Protocol invariants are enforced redundantly: SDK (before submission) and contract (on-chain).

---

## 4. Verification Modes (Normative)

### 4.1 Strict Verification (`verifyStrict`)

A strict verifier MUST:

1. Recompute `artifactHash = keccak256(JCS(artifactObject))` and assert equals `envelope.artifactHash`.
2. Recompute `kbHash = keccak256("KB_V1" || JCS(envelopeNormalized))` and assert equals the on-chain value.
3. Enforce invariants INV-001 through INV-007.
4. Return structured pass/fail with typed reason codes — not only a boolean.

### 4.2 Proof-Bearing Verification

Extends strict verification:

1. Validates proof bundle schema (see [protocol/proof-spec-v1.md](protocol/proof-spec-v1.md)).
2. Confirms settlement transaction via on-chain RPC (NOT subgraph alone).
3. Confirms querier address matches the proof bundle.
4. Confirms value paid satisfies settlement rules at block of settlement.

### 4.3 Stamp-Augmented Verification (Non-normative)

A stamp is an optional, off-chain signed object attesting that strict verification was run:

```json
{
  "stampVersion": "1",
  "issuer": "alexandrian.foundation",
  "issuedAt": "2026-02-25T00:00:00Z",
  "protocolVersion": "1.0",
  "kbId": "0x...",
  "artifactHash": "0x...",
  "checks": {
    "canonicalization": true,
    "invariants": true,
    "schemaLint": true
  },
  "signature": "0x..."
}
```

> **Normative:** Stamps MUST NOT substitute on-chain settlement verification for proof-bearing citations.

---

## 5. Enforcement Strategy (Non-normative)

> **Informative:** This section describes the economic enforcement strategy for the Alexandrian
> settlement model. It is non-normative and subject to evolution.

### 5.1 The Settlement Incentive

"Optional settlement" is self-defeating because:
- Proof bundles are only produced by on-chain settlement.
- Applications requiring proof-bearing citations reject unsettled usage.
- Curators earn royalties only from on-chain settlement.

An agent that previews without settling cannot produce verifiable attribution.

### 5.2 Free Preview Is a Feature, Not a Loophole

Free preview enables evaluation, indexing, and offline development.
It does NOT confer economic validity or proof-bearing citation rights.

SDK enforcement: proofs are only produced for settled usage. Unsettled queries are labeled
"informational" — no DRM, no friction, just correct semantics.

### 5.3 Payer vs Querier Semantics

Define explicitly (important for subgraph correctness and reputation):

| Term | Value |
|------|-------|
| **payer** | `event.transaction.from` — the EOA that sent ETH |
| **querier** | The credited identity from the `QuerySettled` event parameter |

These may be the same address (direct use) or different (paymaster pattern).
Reputation SHOULD be incremented by payer identity (not querier) to resist wash trading.

---

## 6. Reputation Hardening (Non-normative)

The current reputation model is based on settlement volume. Known attack vectors and planned mitigations:

| Attack | Current status | Planned mitigation (M2+) |
|--------|---------------|--------------------------|
| Wash trading (self-settlement) | Not blocked | Unique payer weighting; diminishing returns per payer |
| Sybil-funded settlement | Not blocked | Minimum settlement fee for rep impact |
| Rep inflation via low-value queries | Not blocked | Time-windowed decay; minimum fee threshold |

Minimum viable hardening for M2+: `msg.value >= MIN_REP_FEE` as a gate on reputation increment.
If only one measure is implemented, this is the highest-leverage choice.

---

## 7. Governance Optics (Non-normative)

For protocol credibility with auditors and grant reviewers:

| Mechanism | Recommendation | M1 Status |
|-----------|----------------|-----------|
| `protocolFeeBps` cap | Max cap (e.g. 500 bps) enforced in contract | ⚠ Admin-only currently |
| Fee change delay | Timelock or multisig before fee change takes effect | ⚠ Planned M2+ |
| Slash with reason code | Emit `SlashReason` enum with event | ⚠ Planned M2+ |
| Pause scope | Emergency-only; document what pause does NOT touch | ✅ Documented |
| Admin key | Transition to multisig post-M1 | ⚠ Planned M2+ |

---

## 8. Known Accepted Risks (Non-normative)

Tracked in [security/threat-model.yaml](security/threat-model.yaml):

| Threat | ID | Acceptance rationale |
|--------|-----|---------------------|
| Curator spoofing | TM-004 | `curator` is attribution only; `msg.sender` is provable. Application-layer enforcement deferred to M2+. |
| Publisher repudiation | TM-008 | Blockchain tx history is immutable. Key management is the caller's responsibility. |
| Free preview misuse | — | Preview is designed to be free. Economic validity requires settlement. |
| Graph node downtime | TM-007 | On-chain data queryable via RPC. Subgraph is a read cache. |

---

## References

- [STANDARDS.md](STANDARDS.md) — Normative protocol rules
- [CONFORMANCE.md](CONFORMANCE.md) — Conformance specification
- [SECURITY-CHECKLIST.md](SECURITY-CHECKLIST.md) — Audit checklist
- [security/threat-model.yaml](security/threat-model.yaml) — STRIDE threat model
- [protocol/SEPARATION-OF-CONCERNS.md](protocol/SEPARATION-OF-CONCERNS.md) — Layer boundary audit
- [protocol/proof-spec-v1.md](protocol/proof-spec-v1.md) — Proof bundle schema
- [IMPLEMENTATION-NOTES.md](IMPLEMENTATION-NOTES.md) — Non-normative engineering notes

---

## Out of scope

This document does not cover:
- Agent application logic or intent
- Storage backend trust models (IPFS, Filecoin)
- Governance mechanisms beyond M1 (M2+ scope)
- Multi-party computation or threshold signing (M2+)
- Full API layer trust model (M2+)
