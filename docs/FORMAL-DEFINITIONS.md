## Alexandrian Protocol — Formal Definitions (Layers 0–2)

**Status:** Normative for M1 (Layers 0–2).  
**Scope:** Mathematical substrate, epistemic physics, and economic settlement layer.  
**Companions:** `PROTOCOL-SPEC.md`, `INVARIANTS.md`, `kb-primitives/KB-000.md` → `KB-004.md`.

This document collects the **formal objects and relations** that underlie M1. When this file and `INVARIANTS.md` disagree, **`INVARIANTS.md` wins**.

---

## 0. Mathematical / Graph Substrate (Pre-Protocol)

These are the abstract objects the protocol builds on. They are not user-facing “features”.

### 0.1 Identity Space

- **Hash function**

  - `Hash : Bytes → Bytes32`  
    Implementation: `keccak256`.

- **Domain separation**

  - `KB_PREFIX = "KB_V1"` (ASCII bytes).
  - Other prefixes (e.g. for tasks, coordination objects) MUST be disjoint.

- **Canonicalization**

  - `Canonical : Envelope → Bytes`
  - Implementation: JSON Canonicalization Scheme (JCS, RFC 8785) applied to the **normalized** envelope.

- **Normalized envelope**

  - `normalize(E)`:
    - Filters to hash-scope keys as defined in `KB-000` / `PROTOCOL-SPEC.md`.
    - Sorts `sources` lexicographically and enforces uniqueness.

- **KB hash**

  - For any canonical envelope `E`:

    ```text
    kbHash(E) = "0x" || hex( Hash( KB_PREFIX || Canonical( normalize(E) ) ) )
    ```

- **Identity equivalence**

  - For KBs \( K₁, K₂ \):

    ```text
    Identity(K₁) = Identity(K₂)  ⇔  kbHash₁ = kbHash₂
    ```

  - Identity is **structural** (canonical preimage) and independent of storage, registry, or resolver.

### 0.2 Graph Model

- **Vertices**

  - `V` = set of all registered KB identities (`kbHash` values).

- **Edges**

  - `(v, u) ∈ E` iff `u ∈ sources(v)`.

- **Knowledge Graph**

  - `G = (V, E)` with properties:

    ```text
    - Finite: V, E are finite
    - Directed
    - Acyclic (see Cycle Exclusion invariant)
    - No self-loops (No Self-Reference invariant)
    - Immutable edges after registration
    ```

- **Degree constraints**

  - For all `K ∈ V`:

    ```text
    outDegree(K) = |sources(K)| ≤ MAX_PARENTS
    ```

- **Root / Derived**

  - `Root(K) := ( |sources(K)| = 0 )`
  - `Derived(K) := ( |sources(K)| > 0 )`
  - `Root(K) XOR Derived(K) = true` for all registered KBs.

---

## 1. Physics Layer (KB-000 → KB-004)

M1 fully defines the **epistemic physics** of Knowledge Blocks: structure, identity, lineage, verification, and immutability.

### 1.1 Envelope Model

Formal object: **Envelope**

- Required hash-scope fields (per `KB-000`, `PROTOCOL-SPEC.md`):
  - `type`, `domain`, `sources`, `artifactHash`, `tier`, `payload`, `derivation` (optional but hash-scoped when present).
- Hash-excluded fields:
  - e.g. `createdAt`, `curator`, `signature`, resolver metadata; MUST NOT appear in the canonical hash preimage.
- Structural rules:
  - `sources` is an array of `kbHash` strings.
  - `sources` MUST be:
    - Sorted lexicographically.
    - Deduplicated (Source Uniqueness).
  - `artifactHash` binds to external bytes:

    ```text
    artifactHash = Hash(artifact_bytes)
    ```

  - `tier` is an enum with protocol-defined meanings (see `PROTOCOL-SPEC.md`).
  - `domain` is a string in a constrained namespace (e.g. `security.web`, `kb.protocol`).

### 1.2 Identity Determinism

Formal object: **Canonical identity function**

- For any logical envelope `E`:

  ```text
  kbHash(E) = "0x" || hex( Hash( KB_PREFIX || Canonical( normalize(E) ) ) )
  ```

- Properties:
  - Same normalized envelope ⇒ same `kbHash` in all implementations.
  - Any change to a hash-scope field (`type`, `domain`, `sources`, `artifactHash`, `tier`, `payload`, `derivation`) yields a new `kbHash`.
  - Metadata fields MUST NOT enter `normalize(E)`.

### 1.3 Lineage DAG

Formal semantics for `sources`:

- `sources(K)` is the set of **immediate parents** of `K`.
- Constraints:

  ```text
  0 ≤ |sources(K)| ≤ MAX_PARENTS   (MAX_PARENTS = 8 in M1)
  ```

- Invariants:
  - No self-reference: `kbHash(K) ∉ sources(K)`.
  - No cycles: registration that would create a path `K → … → K` MUST be rejected.
  - Roots and Derived KBs:
    - `Root(K) ⇔ |sources(K)| = 0`
    - `Derived(K) ⇔ |sources(K)| > 0`

### 1.4 Verification Model

Formal predicates for KB `K`:

- `IdentityValid(K)`:
  - Recompute `kbHash` from the canonical envelope and compare to claimed `contentHash`.
- `LineageValid(K)`:
  - All lineage invariants hold:
    - Source uniqueness.
    - No self-reference.
    - Acyclicity (global).
    - `1 ≤ |sources| ≤ MAX_PARENTS` for Derived KBs.
- `AncestorsResolved(K)`:
  - Every parent and ancestor is:
    - Registered in `V`.
    - `IdentityValid = true`.

Verification status:

```text
FULL    ⇔ IdentityValid(K) ∧ LineageValid(K) ∧ AncestorsResolved(K)
PARTIAL ⇔ IdentityValid(K) ∧ LineageValid(K) ∧ ¬AncestorsResolved(K)
INVALID ⇔ ¬IdentityValid(K) ∨ ¬LineageValid(K)
```

Implementations MUST distinguish FULL and PARTIAL.

### 1.5 Immutability Principle

Formal non-mutation:

- Let `K` be registered at time `t` with envelope `Eₜ`.

  ```text
  ∀ t' > t: Envelope(K, t') = Eₜ
  ```

- No field of the canonical envelope MAY change in place.
- Evolution is by **creating a new KB** `K'` with:
  - New envelope `E'`.
  - New `kbHash' ≠ kbHash`.
  - Optional lineage to prior KBs via `sources`.

Snapshot theorem:

- Let repository state `R(t)` be serialized to bytes and:

  ```text
  artifactHash = Hash(bytes(R(t)))
  ```

- A KB with this `artifactHash` represents `R(t)`. Any future state `R(t')` with `t' > t` must produce a different `artifactHash'` and thus a distinct KB.

---

## 2. Economic Layer (Settlement + Attribution)

M1 defines an off-chain and on-chain **settlement** and **attribution** model over the KB DAG.

### 2.1 Settlement Function

Abstract settlement call:

```text
Settle(K, amount, proof) → events
```

Where:

- `K` is a KB with `IdentityValid(K)`.
- `amount` is a non-negative quantity of value (e.g. tokens, points).
- `proof` is a protocol-defined object (rubric evaluation, execution trace, etc.).
- `events` are settlement/royalty events emitted by the settlement system.

Constraints:

- `Settle(K, amount, proof)` is valid **iff** `IdentityValid(K)` (see Identity–Settlement Coupling).
- Settlements MUST NOT target unknown or identity-invalid `kbHash` values.

### 2.2 Royalty DAG Propagation

Let:

- `P` be the total payment amount applied to a single settlement.
- `Parents(K)` be the set of parents of `K`.
- `Share(K → Pᵢ)` be the royalty share function assigning a non-negative share to each parent edge.

Economic conservation:

```text
Σ (value allocated to K and all ancestors) ≤ P
```

No royalty function may mint value beyond what was paid in a settlement. Any fees deducted by the protocol are accounted for before parent splits (see Royalty Constraint invariant).

### 2.3 Economic Invariants (High-Level)

M1 introduces economic invariants in `INVARIANTS.md` and the royalty/stake modules. At a high level:

- **No negative balances**
  - Account balances and stake allocations MUST remain non-negative under all state transitions.
- **Stake constraints**
  - Slashing amounts per KB MUST NOT exceed stake allocated to that KB’s safety buffer.
- **Slashing conditions**
  - Slashing MUST only occur when authorized by explicit evidence types (e.g. rubric evaluation, security review), as defined in the relevant invariants.
- **Withdrawal semantics**
  - Withdrawals MUST NOT violate conservation (no more can be withdrawn than was staked and not yet slashed).

Exact economic rules are defined in the contract specs; this section summarizes their invariant role.

### 2.4 Identity–Settlement Coupling

Formal coupling:

```text
Settle(K, amount, proof) is valid ⇔ IdentityValid(K)
```

Consequences:

- All economic flows (rewards, royalties, slashing) are bound to **canonical, immutable KB identities**.
- Off-chain aliases, names, bundles, or domain references MUST resolve to a `kbHash` before settlement logic executes.

---

## 3. Relationship to Higher Layers (Selection, Coordination, Governance)

Layers beyond 2 (selection/discovery, coordination, governance) are **not** fully normative in M1:

- Selection / ranking functions, domain governance, bundles, and curation are **off-consensus** and MUST NOT affect identity or lineage.
- Coordination objects (tasks, capabilities, settlements-as-process) and governance primitives (upgrades, resolvers, forks, legitimacy signals) are defined conceptually in KB-005 → KB-019 but are not consensus-critical in M1.

Their eventual formalization will live in:

- `SELECTION-SPEC.md` (Layer 3)
+- `COORDINATION-SPEC.md` (Layer 4)
+- `GOVERNANCE-SPEC.md` (Layer 5)

Until then, M1 consensus is entirely captured by:

- This document (formal objects and relations for Layers 0–2).
- `INVARIANTS.md` (normative invariants).
- `PROTOCOL-SPEC.md` (field-level and behavioral specification).

