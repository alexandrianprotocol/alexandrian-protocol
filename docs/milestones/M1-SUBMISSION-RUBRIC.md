# M1 Submission Rubric — Reviewer-Facing Standard

This document captures the **minimum deliverable bundle** and **reviewer scorecard** for Milestone 1. It aligns with [M1-COMPLETION-CHECKLIST.md](M1-COMPLETION-CHECKLIST.md) and [M1-SCOPE-FREEZE.md](../M1-SCOPE-FREEZE.md).

---

## 0. What “M1 Complete” Means (Our Rubric)

M1 is **protocol correctness + conformance + reproducible verification**, runnable without live infra (Redis/IPFS/chain) via mocks and deterministic vectors.

The submission does **not** claim “we built an ecosystem.” It claims:

- Deterministic identity and canonicalization (JCS)
- Explicit invariants + enforcement
- Conformance suite + golden vectors
- Versioned ABI snapshot discipline
- SDK build/typecheck + adapters build/typecheck
- One-command reviewer verification

**Everything else is optional.**

---

## 1. Minimum Deliverable Bundle for Reviewers

### A. One-command verification

- **Command:** `pnpm verify:m1`
- **Must run:** build → lint:boundaries → audit gate → tests (protocol + conformance + spec + invariants + determinism + M1 demo)
- If this is missing or flaky, reviewers downgrade even if the protocol is good.

### B. Immutable test vectors

- `test-vectors/canonical/*` with expected kbHash results
- Proof bundle vectors (where applicable)
- Expected hashes **committed** (no “compute during test and assert equals itself”)

### C. ABI snapshot discipline

- A script that exports ABI; CI fails if ABI drifts uncommitted
- **Command:** `node packages/protocol/scripts/export-abi.mjs`; CI step “Verify ABI snapshot unchanged”

### D. M1 demo test

- `tests/demonstration/m1-demo.test.ts` (or equivalent) showing:
  - Canonical identity
  - Invariant enforcement (duplicate sources, cycle rejection, etc.)
  - VirtualRegistry behavior
  - Subgraph compatibility assumptions (kbId format)

---

## 2. What Reviewers Will Test (Checklist Alignment)

### 2.1 Specification compliance (highest leverage)

**Must be true:**

- JCS canonicalization: field order and whitespace cannot affect bytes → cannot affect hash.
- kbId/kbHash preimage includes only canonical envelope — not curator, not timestamp, not signature.
- sources sorting normalization: same set → same hash (parent-sort tested).
- Dual hash strategy: artifactHash (payload) vs kbHash (envelope).
- Envelope shape enforced (type, domain, sources, artifactHash, tier, payload; optional derivation).

**Reviewer-proofing:** README paragraph “This is what affects kbId; this is what does not.” Property test: key-order permutations (100+ runs) prove kbHash identical.

### 2.2 Invariant enforcement

**Reviewers will try:** Duplicate sources, self-reference, two-node cycles, unsorted parent list, hash mismatch, “same semantic envelope different bytes.”

**We ensure:** Errors are typed and stable (INVALID_ENVELOPE, CYCLE_DETECTED, SOURCES_NOT_SORTED) and appear in docs and tests. Invariants enforced at boundary (SDK / protocol-core), not in app code.

### 2.3 Conformance suite

**Must be true:** `pnpm --filter @alexandrian/conformance test` passes on a clean machine with no services. Vectors cover: canonical envelope, legacy/v1 (if claimed), proof bundle (if applicable).

**Grant optics:** README table: Vectors count, Cross-run determinism, Cycle rejection, Parent-sort equivalence.

### 2.4 Contract & ABI

**Show:** `pnpm --filter @alexandrian/protocol run compile`, ABI export + CI check, `pnpm --filter @alexandrian/protocol test`.

**Avoid:** ABI drift with no versioning; “consensus critical” not documented; tests that don’t cover economic conservation (payout sums).

### 2.5 SDK / distributed engineering

**Minimum M1 bar:** sdk-core and sdk-adapters build + typecheck; no circular deps; conformance runs without infra.

**Critical:** SDK runs in mock mode cleanly (CONTRACT_MODE=mock). No env reads at import time; no bare `new Contract()` in constructors unless behind an injectable interface.

### 2.6 CI and reproducibility

**Reviewers will run:** `pnpm verify:m1`. If it fails once, they downgrade.

**We provide:** [docs/PRODUCTION-READINESS.md](../PRODUCTION-READINESS.md) with Node version, one command, expected output snippets.

---

## 3. Five-Dimension Reviewer Scorecard

| Dimension | How we maximize |
|-----------|------------------|
| **Architecture** | Protocol-core is deterministic + isolated; no infra dependency. |
| **Graph usage** | Subgraph compatibility demonstrated (schema + mappings build; live deploy is M2). |
| **Novelty** | Economic memory primitives; proof + settlement semantics are crisp. |
| **Execution quality** | Conformance suite + ABI snapshot + one-command verify is rare. |
| **Adoption potential** | Adapters build; mock mode works; minimal integration friction. |

---

## 4. Script Alignment (Current Repo)

| Script | Intended behavior |
|--------|--------------------|
| `pnpm test` | spec + invariants + property + determinism (default test; invariants included). |
| `pnpm verify:m1` | build:m1 → lint:boundaries → audit → test:m1 (primary reviewer path). |
| `pnpm verify:m1:nosec` | Same as verify:m1 but skips audit (escape hatch for transitive dep noise). |
| `pnpm test:m1` | Protocol Hardhat + conformance + Vitest (spec + invariants + demonstration + determinism). |

---

## 5. Out of scope (M2+)

This rubric is M1. Items deferred to M2+ (testnet smoke, full API runtime, hosted subgraph, fullstack tests) are listed in [M1-SCOPE-FREEZE.md](../M1-SCOPE-FREEZE.md).

---

*This rubric is the standard we hold ourselves to for M1 submission. See [M1-COMPLETION-CHECKLIST.md](M1-COMPLETION-CHECKLIST.md) for the full verifiable checklist.*
