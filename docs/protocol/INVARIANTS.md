```yaml
document:
  id: PROTO-003
  version: 1.0.0
  owner: protocol-team
  status: stable
  classification: public
  last_reviewed: "2026-02-27"
  schema_version: "1.0"
  depends_on: [PROTO-001]
```

# Alexandrian Protocol — Invariants

**Status:** Normative — this is the single authoritative source for protocol invariants
**Tier:** Tier 0 (consensus-critical)
**Spec reference:** [PROTOCOL-SPEC.md](PROTOCOL-SPEC.md) §6
> **One source of truth:** This file defines the invariants normatively. Rationale and worked examples are in the test files listed in [M1-INVARIANT-TEST-MAP.md](../milestones/M1-INVARIANT-TEST-MAP.md).

All protocol guarantees with mathematical precision. Implementations MUST uphold these invariants. Violation means non-compliance.

---

## 1. Deterministic Identity and KB Equivalence

**Informal:** The kbId of a KB is a pure function of its content and lineage. No timestamp, curator, or nonce affects it.

**Formal:**

```
∀ E (canonical envelope):
  kbId(E) = "0x" || hex( keccak256( "KB_V1" || JCS(normalize(E)) ) )

  where normalize(E) = E with sources sorted lexicographically
```

**Identity equivalence:**

For Knowledge Blocks \( K_1 \) and \( K_2 \):

```
Identity(K₁) = Identity(K₂)  ⇔  kbHash₁ = kbHash₂
```

- Identity equality is **structural**, not semantic.
- Two semantically identical payloads with different envelopes are distinct KBs.
- Identity is independent of storage location, registry implementation, or resolver.

**Canonical equivalence class:**

Two KBs are **structurally equivalent** iff:

```
JCS(normalize(E₁)) = JCS(normalize(E₂))
```

**Constraints:**
- Hash preimage MUST NOT include: timestamp, curator address, signature, nonce
- Same logical envelope (after source sort) MUST yield same kbId in all implementations

---

## 1.5 KB Immutability (No In-Place Update)

**Informal:** A KB hash must never change. If it changes, it is not immutable; if it is mutable, it is not content-addressed; if it is not content-addressed, anchoring is meaningless. Therefore: a KB hash cannot represent a live, evolving thing. **Updates cannot modify a KB; they must create new KBs.**

**Formal:**

- There is no in-place update of a registered KB. Any change in content or lineage yields a new envelope and thus a new `kbHash`.
- Evolution is by **creating new KBs** that reference prior KBs in `sources`. The repository grows as a **DAG** of distinct snapshots.
- Optional “latest” or “current” pointer is a convenience layer only; it is not part of KB identity and is not consensus-critical.

**Constraints:**
- Implementations MUST NOT allow mutation of an existing KB’s identity (kbHash) or envelope.
- New state MUST be registered as a new KB with a new kbHash; prior snapshot(s) MUST appear in `sources` when lineage is declared.

---

## 1.6 Permanent Retention (No Deletion of Anchored KBs)

**Informal:** Old KB versions must always be kept. Not optionally. Not conditionally. If you remove old versions, you stop being a protocol: replay, auditability, historical verification, and reproducibility break. After anchoring, a KB is **permanent**. Protocols accumulate history; applications overwrite history. This protocol is append-only.

**Formal:**

- Once a KB is registered (anchored on-chain), its identity (kbHash) and the fact of its existence MUST remain available for resolution and verification. Implementations MUST NOT delete or revoke anchored KBs for the purpose of “replacing” or “updating” content; evolution is by creating new KBs that reference prior KBs in `sources`.
- Deprecation is metadata only (e.g. status flags in resolver or payload). The KB snapshot itself MUST NOT be deleted.
- Deletion (or revocation) is only acceptable when the KB was invalid, violated protocol invariants, or was never finalized (e.g. rejected before anchoring). After anchoring → permanent.
- Coordination and tasks reference explicit KB hashes; those hashes MUST remain resolvable so that replay and stateHash verification succeed. Historical pinning requires permanent retention.

**Constraints:**
- Implementations MUST retain anchored KB metadata (kbHash, lineage, artifactHash) for the lifetime of the system.
- Off-chain artifact storage MAY be subject to separate retention policy or garbage collection; protocol identity and lineage are not deleted. Merkle roots (artifactHash) preserve integrity even if artifact bytes are archived or relocated.

---

## 2. Source Uniqueness

**Informal:** No duplicate source kbIds in the `sources` array.

**Formal:**

```
∀ E: |sources(E)| = |unique(sources(E))|
```

- Duplicate sources → registration MUST be rejected
- Error: `INVALID_ENVELOPE` (or equivalent)

---

## 3. No Self-Reference

**Informal:** A KB cannot cite itself.

**Formal:**

```
∀ E, kbId(E) = h: kbId(E) ∉ sources(E)
```

- Self-reference is excluded by construction (kbId derived from envelope; envelope cannot contain its own hash in sources at registration time)
- Registrations where `kbHash ∈ sources` MUST be rejected

---

## 4. Cycle Exclusion (Lineage Acyclicity)

**Informal:** The provenance graph must be acyclic. Registration that would create a cycle MUST be rejected.

**Formal:**

Let \( G = (V, E) \) where:
- \( V \) = set of registered kbIds
- \( (v, u) \in E \) iff \( u \in \text{sources}(v) \)

Then:

```
G MUST be a DAG ( Directed Acyclic Graph )

∀ path p: v₀ → v₁ → … → vₖ:  v₀ ≠ vₖ
```

- Cycle detection: DFS; registration rejected if any new edge would close a cycle
- Error: `CYCLE_DETECTED`

---

## 5. Global Knowledge Graph (DAG)

**Informal:** All KBs together form a finite, directed, acyclic graph with immutable edges.

**Formal:**

Let:

- \( V \) = set of all registered kbIds
- \( (v, u) \in E \) iff \( u \in \text{sources}(v) \)

Then the **Knowledge Graph** \( G = (V, E) \) MUST satisfy:

```
- Directed
- Finite (V, E are finite sets)
- Acyclic (as per §4)
- No self-loops (as per §3)
- Immutable edges after registration
```

Additional property:

```
∀ K ∈ V: outDegree(K) = |sources(K)| ≤ MAX_PARENTS
```

Lineage soundness (transitive):

For a KB \( K \) to be **lineage-sound**:

```
∀ ancestor A ∈ transitiveClosure(sources(K)):
  IdentityValid(A) ∧ A ∈ V
```

---

## 6. Source Ordering (Lexicographic Sort)

**Informal:** `sources` MUST be sorted before hashing. Same set of sources in any order MUST yield same hash.

**Formal:**

```
∀ E: sources(E) = sort_lex(sources(E))

where sort_lex(S) = sorted copy of S by string comparison
```

- Unsorted `sources` → MUST be rejected or normalized before hashing
- Error: `SOURCES_NOT_SORTED` (when strict validation is enforced)

---

## 7. Hash Stability (Cross-Implementation)

**Informal:** Two implementations given the same logical envelope MUST produce the same kbHash.

**Formal:**

```
∀ E₁, E₂:  normalize(E₁) = normalize(E₂)  ⟹  kbId(E₁) = kbId(E₂)
```

- JCS (RFC 8785): lexicographic key ordering, no whitespace, deterministic encoding
- Arrays preserve element order; only object keys are reordered

---

## 8. Slashing Invariants (When Applicable)

### 7.1 Collateral Ceiling

**Informal:** A slash for a single KB cannot exceed the amount allocated to that KB’s safety buffer.

**Formal:**

```
slashAmount(kbId) ≤ stakeAllocation(kbId)
```

### 7.2 Attribution Persistence

**Informal:** Slashing a child does not auto-slash parents. Parents are slashed only on independent proof.

**Formal:**

```
slash(child) ⇏ slash(parent)
slash(parent) ⟺ independent proof (Rubric or Security Review)
```

### 7.3 Deterministic Triggering

**Informal:** Slash only when authorized by Rubric evaluation or Security Review (3+ high-reputation auditors).

```
slash(kbId) ⟹ ∃ proof ∈ { RubricEval, SecurityReview }
```

---

## 9. Separation of Concerns

| Layer | Responsibility | MUST NOT |
|-------|----------------|----------|
| **Registry** | Existence, lineage, identity | Store royalty BPS, stake logic |
| **Royalty / Settlement** | Fee routing, distribution | Store lineage, registry identity |
| **Stake** | Collateral, allocation, slashing | Store lineage, royalty splits |

---

## 10. Royalty Constraint and Economic Conservation (Attribution DAG)

**Informal:** Total royalty shares (BPS) to parents must not exceed distributable amount (after protocol fee).

**Formal:**

```
∑ parentShareBps ≤ (10000 - protocolFeesBps)
```

- Basis points: 10000 = 100%
- Protocol fee deducted first; remainder is distributable

**Economic conservation (DAG royalty propagation):**

Let a settlement event with total payment \( P \) be applied to a KB \( K \). Let:

- \( \text{Children}(K) \) be KBs that reference \( K \) in `sources`
- \( \text{Value}(K) \) be the total value allocated to \( K \) from all settlements

Then for any settlement:

```
Σ (value distributed to K and its ancestors) ≤ P
```

No royalty or attribution function MAY mint value beyond the payment amount; lineage traversal is value-conserving.

---

## 11. Root Knowledge Blocks

**Definition:** A Knowledge Block (KB) is a Root KB if and only if:

```
Root(K) := ( |K.sources| = 0 )
```

Root status is a **structural property** of the envelope. No additional field, role, tier, or type is required to classify a KB as a Root.

**Invariants:**

- Root KBs MUST satisfy all invariants that apply to any KB, including:
  - Deterministic identity (KB-001 / §1)
  - Domain-separated hashing (KB-002)
  - Envelope structure requirements (KB-000)
  - Verification by recomputation (KB-004)
- There is no separate hashing rule, prefix, or serialization logic for Root KBs.
- The protocol MUST NOT treat Root KBs as canonical, trusted, verified, authoritative, or exempt from tier rules. Root status is **purely structural**; any trust semantics MUST be implemented in higher layers (e.g., governance, reputation, staking).
- A Root KB:
  - MUST be immutable once registered.
  - MUST NOT allow mutation of `payload`, `artifactHash`, `tier`, or `type`.
  - MUST NOT allow retroactive addition of parents. Any such modification MUST result in a new KB with a new `kbHash`.
- A Root KB MAY be used as a parent in derived KBs. Derived KBs referencing a Root MUST:
  - Include the Root’s `kbHash` in `sources`.
  - Preserve acyclicity.
  - Respect the `MAX_PARENTS` constraint.
- A KB with one or more parents MUST NOT be considered a Root:

```
|K.sources| > 0  ⇒  ¬Root(K)
```

- Root classification MUST be computed directly from the envelope (`sources` length), not inferred from absence in the registry or any external indexing state.
- Verification procedure for Root KBs:
  - Fetch envelope.
  - Normalize `sources` (empty list).
  - Apply JCS canonicalization.
  - Compute `kbHash = keccak256("KB_V1" || canonical_string)`.
  - Compare to claimed `contentHash`.
  - No additional lineage validation step is required beyond standard cycle checks.

**Graph properties:**

- In the global KB DAG, Root KBs MUST have in-degree \( = 0 \).
- Root KBs MAY have out-degree \( \ge 0 \).
- The overall graph MUST remain acyclic.
- Root existence is not mandatory; a graph MAY contain multiple roots or none.

---

## 12. Derived Knowledge Blocks

**Definition:** A Knowledge Block (KB) is a Derived KB if and only if:

```
Derived(K) := ( |K.sources| > 0 )
```

Derived status is a structural property of the envelope and does **not** imply trust, correctness, or authority.

**Invariants:**

- A Derived KB MUST:
  - Contain at least one parent reference in `sources`.
  - Contain no more than `MAX_PARENTS` (currently 8).
  - Satisfy all invariants applicable to any KB.
- For a Derived KB to be considered fully valid, every entry in `sources` MUST:
  - Be a valid `kbHash`.
  - Be resolvable (on-chain or verifiable off-chain).
  - Correspond to a canonical KB envelope.
- If any parent is unresolvable:
  - Identity verification MAY succeed.
  - Lineage verification MUST be marked **PARTIAL**.
- `sources` MUST contain unique entries:

```
∀ i ≠ j, sources[i] ≠ sources[j]
```

  - Duplicate parents MUST be rejected prior to canonicalization.
- A Derived KB MUST NOT reference itself:

```
kbHash ∉ sources
```

  - Violation MUST result in rejection.
- The global Knowledge Block graph MUST remain acyclic. Registration of a Derived KB MUST be rejected if it introduces a cycle:

```
¬∃ path such that K → … → K
```

- The number of parents MUST satisfy:

```
1 ≤ |sources| ≤ MAX_PARENTS
```

  - With `MAX_PARENTS = 8` in M1. Registration with more than 8 parents MUST revert.
- After registration:
  - `sources` MUST NOT be mutated.
  - No parent may be added or removed.
  - No re-binding to alternate lineage is permitted.
  - Any change produces a new envelope and therefore a new `kbHash`.
- If a `derivation` object exists:
  - Every `derivation.inputs[].kbId` MUST appear in `sources`.
  - No extraneous input references are allowed.
  - The `derivation` description MUST NOT contradict lineage.

Formally:

```
∀ input ∈ derivation.inputs: input.kbId ∈ sources
```

- Derived KBs MUST satisfy all canonical serialization and hashing invariants:

```
kbHash = keccak256("KB_V1" || JCS(normalized_envelope))
```

  - Hash identity MUST change if:
    - Any parent changes.
    - Parent ordering changes before normalization.
    - `artifactHash` changes.
    - `tier` changes.
    - `payload` changes.
- If a Derived KB is fully verified:
  - All ancestors MUST themselves satisfy KB invariants.
  - Verification MUST propagate recursively.
  - A Derived KB MUST NOT be marked FULLY VERIFIED if any ancestor violates invariants.
- A Derived KB MUST NOT be classified as a Root:

```
Derived(K) ⇒ ¬Root(K)
```

  - Root and Derived classifications are mutually exclusive and exhaustive for all registered KBs:

```
Root(K) XOR Derived(K) = true
```

**Graph properties:**

- In the global DAG:
  - Derived KB in-degree \( \ge 1 \).
  - Derived KB out-degree \( \ge 0 \).
- No assumptions are made about the number of children.

**Verification procedure:**

- To verify a Derived KB:
  - Fetch envelope.
  - Normalize `sources`.
  - Canonicalize via JCS.
  - Compute `kbHash = keccak256("KB_V1" || canonical_string)`.
  - Compare to claimed `contentHash`.
  - Recursively verify all parents.
  - Confirm acyclicity.
  - Confirm `MAX_PARENTS` constraint.
- Verification status classification:
  - **FULL** — identity and full lineage verified.
  - **PARTIAL** — identity valid, one or more parents missing/unresolvable.
  - **INVALID** — hash mismatch or invariant violation.

---

## 13. Verification Status Model

**Informal:** Verification is a three-valued state over identity and lineage: FULL, PARTIAL, or INVALID.

**Definitions:**

For a KB \( K \), define predicates:

- `IdentityValid(K)` — canonical recomputation of `kbHash` matches claimed `contentHash` (§1).
- `LineageValid(K)` — all lineage invariants hold (source uniqueness, no self-reference, acyclicity, `MAX_PARENTS`, §2–§5, §11–§12).
- `AncestorsResolved(K)` — all parents and ancestors are resolvable KBs in \( V \) with `IdentityValid = true`.

Verification status:

```
FULL    ⇔ IdentityValid(K) ∧ LineageValid(K) ∧ AncestorsResolved(K)
PARTIAL ⇔ IdentityValid(K) ∧ LineageValid(K) ∧ ¬AncestorsResolved(K)
INVALID ⇔ ¬IdentityValid(K) ∨ ¬LineageValid(K)
```

Implementations MUST NOT conflate PARTIAL with INVALID; identity-valid KBs with missing ancestors remain verifiable at the identity level.

---

## 14. Epistemic Non-Mutation and Snapshot Theorem

**Informal:** KBs are immutable epistemic commitments to repository snapshots; evolution is by derivation only.

**Formal (non-mutation):**

Let a KB \( K \) be registered at time \( t \) with envelope \( E_t \). Then:

```
∀ t' > t: Envelope(K, t') = E_t
```

- No field of the canonical envelope MAY be mutated in place after registration.
- All evolution MUST be expressed as a **new** KB \( K' \) with a new envelope \( E' \) and `kbHash' ≠ kbHash`, optionally referencing \( K \) in `sources`.

**Snapshot theorem:**

Let \( R(t) \) be the state of a structured knowledge repository at time \( t \), and let:

```
artifactHash = keccak256(bytes(R(t)))
```

If a KB \( K \) is registered with this `artifactHash`, then:

```
K represents the snapshot R(t)
```

Subsequent mutations of the repository to \( R(t') \) with \( t' > t \) MUST produce a different `artifactHash'` and therefore a different KB \( K' \) to represent the new snapshot.

---

## 15. Economic Neutrality and Epistemic Minimalism

**Informal:** The protocol enforces structure and determinism, not truth or ranking.

**Economic neutrality:**

The protocol layer MUST NOT:

- Rank KBs by quality or truth.
- Declare any KB canonical or authoritative.
- Privilege Root KBs over Derived KBs beyond structural properties.
- Enforce epistemic correctness or consensus.

It MUST restrict itself to:

- Deterministic identity and canonicalization.
- DAG structure and lineage invariants.
- Settlement and royalty accounting correctness.

**Epistemic minimalism:**

The protocol:

- Enforces **structure**, **determinism**, and **value flow invariants**.
- Does **not** enforce truth, quality, or agreement.

Epistemic quality, reputation, and consensus are **higher-layer concerns** (selection, coordination, governance) and MUST NOT alter the underlying identity or lineage semantics.

---

## 16. Closure Under Derivation

**Informal:** The protocol is closed under composition of valid KBs.

**Formal:**

If \( K_1 \) and \( K_2 \) are valid KBs (at least `PARTIAL` verified), and a new KB \( K_3 \) is constructed such that:

- `sources(K₃)` is a subset of valid kbIds including any of \( K_1, K_2 \),
- All lineage invariants (§2–§5, §11–§12) are satisfied,

then:

- \( K_3 \) CAN be registered without changing protocol rules.
- \( K_3 \) CAN be verified using the verification model in §13.
- \( K_3 \) CAN participate in settlement and attribution subject to §10.

No extension to consensus-critical rules is required to compose new KBs from existing ones.

---

## 17. Settlement–Identity Coupling

**Informal:** Settlement is only valid for canonically identified KBs.

**Formal:**

For any settlement action `Settle(K)`:

```
Settle(K) is valid ⇔ IdentityValid(K)
```

Implementations MUST:

- Reject settlements targeting non-existent or identity-invalid `kbHash` values.
- Bind all economic flows (rewards, royalties, slashing) to canonical KB identities, not mutable aliases.

---

## Out of scope (M2+)

Invariants in this doc are M1-normative. The following are **deferred to M2+**: collective-pool invariants, reputation hardening (unique payer, time decay), governance bounds (fee cap, timelock), on-chain attestation/stamps. **Full list:** [M1-SCOPE-FREEZE.md](../M1-SCOPE-FREEZE.md).

---

## References

- [PROTOCOL-SPEC.md](PROTOCOL-SPEC.md) — Normative specification
- [M1-INVARIANT-TEST-MAP.md](../milestones/M1-INVARIANT-TEST-MAP.md) — Test file → invariant mapping (non-normative)
- [CONSENSUS-CRITICAL.md](CONSENSUS-CRITICAL.md) — Consensus-critical function catalog
