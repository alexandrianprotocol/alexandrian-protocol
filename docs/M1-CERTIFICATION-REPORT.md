```yaml
document:
  id: CERT-001
  version: 1.0.0
  owner: protocol-team
  status: stable
  classification: public
  last_reviewed: "2026-02-27"
  schema_version: "1.0"
  depends_on: [PROTO-001, PROTO-003]
```

# Alexandrian Protocol — Milestone 1 Certification Report

**Purpose:** Grant-ready, formal record of M1 certification. Fill or generate from `certification/m1-report.json` and [M1-INVARIANT-TEST-MAP.md](docs/milestones/M1-INVARIANT-TEST-MAP.md).
**Reviewer summary:** See [AUDIT-SUMMARY.md](AUDIT-SUMMARY.md) for the single‑page scorecard and verification path.

---

## 1. Scope

Milestone 1 certifies:

- **Deterministic identity (JCS)** — Canonical serialization, kbHash from envelope only, key-order and whitespace independence.
- **Formal invariant enforcement** — INV-1..INV-9 (source uniqueness, no self-reference, DAG acyclicity, source ordering, hash stability, slashing, separation of concerns, royalty conservation).
- **Specification conformance** — Envelope, derivation, and proof vectors per [PROTOCOL-SPEC.md](protocol/PROTOCOL-SPEC.md).
- **ABI stability** — Exported ABI snapshot under version control.
- **Economic settlement correctness** — publishKB, settlement conservation, royalty DAG, slashing state machine (Hardhat tests).
- **Boundary isolation** — Protocol-core purity; no runtime/env/network leakage in core packages.
- **Supply chain hygiene** — No high/critical dependency vulnerabilities at certification time.

---

## 2. Test Environment

| Field | Value |
|-------|--------|
| **Node** | `v20.20.0` |
| **pnpm** | `9.0.0` |
| **OS** | Windows 11 x86_64 (MINGW64_NT-10.0-22631) |
| **Contract mode** | `mock` (Hardhat in-process; no live RPC required) |
| **Commit hash** | `f75463d` |
| **Report hash** | *(generated on certification run — see `certification/m1-badge.json`)* |
| **ABI hash** | *(see `packages/protocol/src/abis/AlexandrianRegistryV2.json`)* |

---

## 3. Stage Results

| Stage | Description | Result |
|-------|-------------|--------|
| 0 — Environment | Runtime validation, lockfile, Node version | PASS |
| 1 — Build | Build Core + ABI snapshot + subgraph | PASS |
| 2 — Identity | Canonical determinism (kbHash), property tests | PASS |
| 3 — Invariants | DAG + uniqueness (INV-1..INV-9) | PASS |
| 4 — Spec | Conformance vectors (envelope, derivation, proof) | PASS |
| 5 — Economic | Settlement conservation, royalty, slashing | PASS |
| 6 — M1 Demo | End-to-end narrative (root, derived, rejections) | PASS |
| 7 — Boundaries | Layer isolation (lint:boundaries) | PASS |
| 8 — Audit | Dependency hygiene (pnpm audit) | PASS |

*Update from last `pnpm certify:m1` run; see `certification/m1-report.json` for timestamps and durations.*

---

## 4. Invariants Verified

Summary mapping from [M1-INVARIANT-TEST-MAP.md](docs/milestones/M1-INVARIANT-TEST-MAP.md):

- **INV-1** — Deterministic Identity: spec + property + conformance.
- **INV-2** — Source Uniqueness: invariants + virtual-registry + m1-demo.
- **INV-3** — No Self-Reference: protocol-invariants (CYCLE_DETECTED).
- **INV-4** — DAG Acyclicity: cycle rejection, chain A→B→C.
- **INV-5** — Source Ordering: derived-vectors, m1-demo unsorted rejection.
- **INV-6** — Hash Stability: canonical vectors, cross-runtime.
- **INV-7** — Slashing Constraints: contract tests.
- **INV-8** — Separation of Concerns: contract boundaries.
- **INV-9** — Royalty Conservation: property + contract.

---

## 5. Known Limitations

- **Subgraph** — Not deployed automatically by certification; build only. Live index requires separate deploy (e.g. Base + The Graph Studio).
- **Seeds** — Not auto-published; use [m1-live-demo](scripts/m1-live-demo.mjs) or manual publish for chain demonstration.
- **M2** — Economic aggregates, fullstack flows, and testnet smoke are out of M1 scope (see [M1-SCOPE-FREEZE.md](M1-SCOPE-FREEZE.md)).

### Out of scope (M2+)

Certification is M1. The full list of items deferred to M2+ is in [M1-SCOPE-FREEZE.md](M1-SCOPE-FREEZE.md).

---

## 6. Conclusion

Milestone 1 core protocol is **deterministic, reproducible, and invariant-safe**. Certification is produced by `pnpm certify:m1` and written to `certification/m1-report.json` with a fingerprint in `certification/m1-badge.json`.

For live chain + subgraph demonstration (Base mainnet, seeds, The Graph), see `scripts/m1-live-demo.mjs`, [M1-DEMO.md](M1-DEMO.md) (section: "Live Demo — Base + Seeds + Subgraph Integration"), and [LIVE-DEMO-PROOF.md](LIVE-DEMO-PROOF.md) for the recorded evidence.
