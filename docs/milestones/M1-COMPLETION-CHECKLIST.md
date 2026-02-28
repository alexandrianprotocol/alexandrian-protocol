# Milestone 1 — Completion Checklist

**Scope:** Production-grade protocol engineering + SDK / distributed engineering (web services–ready).  
**Reference:** [PROTOCOL-SPEC.md](../protocol/PROTOCOL-SPEC.md), [INVARIANTS.md](../protocol/INVARIANTS.md), [M1-DEMO.md](../M1-DEMO.md).

Use this checklist for M1 sign-off: protocol correctness, conformance, and SDK/infra readiness. Each item is verifiable (command, test, or doc).

**Audit report (gaps, M2 leakage, dev-only content):** [M1-AUDIT-REPORT.md](M1-AUDIT-REPORT.md)  
**Submission rubric (reviewer-facing standard):** [M1-SUBMISSION-RUBRIC.md](M1-SUBMISSION-RUBRIC.md)  
**Scope freeze (in scope / deferred):** [../M1-SCOPE-FREEZE.md](../M1-SCOPE-FREEZE.md)  
**Invariant → test mapping (flow & mechanism):** [M1-INVARIANT-TEST-MAP.md](M1-INVARIANT-TEST-MAP.md)

**Testing workflow (three layers + staged certification):** [PRODUCTION-READINESS.md](../PRODUCTION-READINESS.md) — Mechanistic (unit + invariants), specification compliance (conformance + vectors), and M1 narrative (demo). Reviewer-oriented staged run: `pnpm certify:m1` (8 stages, pre/post snapshots, `m1-certification-report.json`). CI gate: `pnpm verify:m1`.

---

## 1. Protocol engineering (normative & production-grade)

### 1.1 Specification compliance

| # | Item | Concept | How to verify |
|---|------|---------|----------------|
| 1.1.1 | **Canonical serialization (JCS)** | RFC 8785–style key sort, UTF-8, no whitespace; arrays preserve order | `pnpm test:spec` (canonical-vectors, m1-demo); envelope bytes identical across runs |
| 1.1.2 | **Content-addressed identity** | `kbId` = f(canonical envelope only); no timestamp, curator, or signature in preimage | INVARIANTS §1; `kbHashFromEnvelope` tests; spec tests |
| 1.1.3 | **Source ordering normalization** | `sources` lexicographically sorted before hashing; same set → same hash | `tests/specification/derived-vectors.test.ts` (parent-sort); m1-demo determinism |
| 1.1.4 | **Dual-hash strategy** | `artifactHash` (payload), `kbHash` (envelope); CIDv1 optional (sha2-256, raw codec) | PROTOCOL-SPEC §2.4; canonical + CID tests in m1-demo |
| 1.1.5 | **Envelope shape** | Required: `type`, `domain`, `sources`, `artifactHash`, `tier`, `payload`; optional `derivation` | Schema validation in `@alexandrian/protocol`; conformance envelope tests |

### 1.2 Invariant enforcement

| # | Item | Concept | How to verify |
|---|------|---------|----------------|
| 1.2.1 | **Source uniqueness** | No duplicate kbIds in `sources`; reject with INVALID_ENVELOPE | INVARIANTS §2; m1-demo "Invariant Enforcement" (duplicate sources) |
| 1.2.2 | **No self-reference** | KB must not cite itself; `kbHash ∉ sources` | INVARIANTS §3; registration rejection tests |
| 1.2.3 | **Lineage acyclicity** | Provenance DAG; cycle → reject (CYCLE_DETECTED) | INVARIANTS §4; `derived-vectors.test.ts` cycle rejection |
| 1.2.4 | **Source ordering (strict)** | Unsorted `sources` rejected or normalized; SOURCES_NOT_SORTED when strict | INVARIANTS §5; m1-demo invariant enforcement |
| 1.2.5 | **Hash stability (cross-impl)** | Same logical envelope → same kbHash in any implementation | INVARIANTS §6; canonical test vectors; conformance suite |
| 1.2.6 | **Separation of concerns** | Registry = existence/lineage; Royalty = fees; Stake = collateral/slashing | INVARIANTS §8; contract and runtime boundaries |

### 1.3 Test vectors & conformance

| # | Item | Concept | How to verify |
|---|------|---------|----------------|
| 1.3.1 | **Canonical test vectors** | Reproducible kbHash for known envelopes (practice-minimal, derivation/parent-sort) | `pnpm --filter @alexandrian/conformance test`; `test-vectors/canonical/` |
| 1.3.2 | **v1 envelope vectors** | Legacy/compat vectors still produce expected kbHash | Conformance envelope.test.ts (v1 envelope practice-minimal) |
| 1.3.3 | **Proof conformance** | Proof bundle format and verification (when applicable) | `packages/conformance` proof tests |
| 1.3.4 | **Generated expected files** | Expected hashes committed; `generate:expected` documented | `test-vectors/` README; no ad-hoc hashes in tests |

### 1.4 Contract & ABI

| # | Item | Concept | How to verify |
|---|------|---------|----------------|
| 1.4.1 | **Contract compile** | Solidity compiles; TypeChain types generated | `pnpm --filter @alexandrian/protocol run compile` |
| 1.4.2 | **ABI snapshot** | Versioned ABI export; CI fails on uncommitted ABI drift | `node packages/protocol/scripts/export-abi.mjs`; CI "Verify ABI snapshot unchanged" |
| 1.4.3 | **Protocol unit tests** | Contract behavior (registry, settlement, invariants) under Hardhat | `pnpm --filter @alexandrian/protocol test` |
| 1.4.4 | **Consensus-critical surface** | Documented which contract functions are consensus-critical | CONSENSUS-CRITICAL.md or equivalent; no undocumented critical paths |

---

## 2. SDK & distributed / web services engineering

### 2.1 SDK packages (build & types)

| # | Item | Concept | How to verify |
|---|------|---------|----------------|
| 2.1.1 | **sdk-core typecheck & build** | No type errors; dist publishable | `pnpm --filter @alexandrian/sdk-core run typecheck`; `pnpm --filter @alexandrian/sdk-core run build` |
| 2.1.2 | **sdk-adapters typecheck & build** | Adapters (e.g. semantic index) build against protocol/sdk-core | `pnpm --filter @alexandrian/sdk-adapters run typecheck`; same for build |
| 2.1.3 | **Protocol package build** | `@alexandrian/protocol` builds; core exports (VirtualRegistry, kbHashFromEnvelope, canonicalize, etc.) stable | `pnpm --filter @alexandrian/protocol build` |
| 2.1.4 | **Workspace dependency graph** | conformance → protocol (and optionally sdk); no circular deps | `pnpm install`; `pnpm build` from root |

### 2.2 Conformance as spec validation

| # | Item | Concept | How to verify |
|---|------|---------|----------------|
| 2.2.1 | **Conformance suite** | Validates spec (test vectors), not implementation details | `pnpm --filter @alexandrian/conformance test` |
| 2.2.2 | **Envelope conformance** | Canonical + v1 vectors; derivation parent-sort | Conformance envelope.test.ts |
| 2.2.3 | **No live infra for M1** | Conformance and M1 tests run with CONTRACT_MODE=mock; no Redis/IPFS/chain required | `CONTRACT_MODE=mock pnpm exec vitest run tests/specification/ tests/invariants/` |

### 2.3 Integration & determinism tests

| # | Item | Concept | How to verify |
|---|------|---------|----------------|
| 2.3.1 | **Specification tests** | canonical-vectors, derived-vectors (single/multi-parent, cycle) | `pnpm test:spec` or `vitest run tests/specification/` |
| 2.3.2 | **Invariant tests** | Formal invariants exercised by tests | `vitest run tests/invariants/` |
| 2.3.3 | **Determinism tests** | Cross-run and key-order independence | `pnpm test:determinism` or `vitest run tests/determinism/` |
| 2.3.4 | **M1 demo suite** | Canonical identity, determinism, VirtualRegistry, subgraph compatibility, invariant enforcement | `tests/demonstration/m1-demo.test.ts`; run with spec/integration |

### 2.4 CI & reproducibility

| # | Item | Concept | How to verify |
|---|------|---------|----------------|
| 2.4.1 | **CI pipeline** | Build, typecheck, compile, ABI snapshot, unit + conformance + spec + invariants + determinism | `.github/workflows/ci.yml`; push to main/master and PRs |
| 2.4.2 | **Dependency audit** | No high/critical vulnerabilities for M1 gate | `pnpm audit --audit-level=high` (CI step) |
| 2.4.3 | **Reproducible environment** | M1 verification runnable in container (e.g. Docker) for reviewer parity | Document: Node 20, pnpm, `pnpm install && pnpm build && pnpm test:spec` (or verify:m1) |
| 2.4.4 | **One-command verification** | Single entry for reviewers (e.g. `pnpm start:here` or `pnpm verify:m1`) | README "How to verify"; script exists and exits 0 on success |

### 2.5 Documentation & API surface

| # | Item | Concept | How to verify |
|---|------|---------|----------------|
| 2.5.1 | **Protocol spec normative** | Single source of truth; implementation-agnostic | PROTOCOL-SPEC.md §1; version and scope clear |
| 2.5.2 | **Invariants normative** | INVARIANTS.md is authoritative; rationale separate | INVARIANTS.md; reference from PROTOCOL-SPEC §6 |
| 2.5.3 | **Milestone table** | Status and verification commands in README or docs | README "Milestone Checklist" or docs/README.md |
| 2.5.4 | **SDK/API surface** | Public exports of protocol and sdk-core documented or typed; no undocumented breaking surface | `packages/protocol/docs/API.md` or index exports; sdk-core public API clear |

---

## 3. Production-grade protocol concepts (checklist)

- [ ] **Deterministic identity** — kbId is pure function of content + lineage; no nonce/timestamp/curator in preimage.
- [ ] **Canonical serialization** — JCS-style, source sort, single canonical string per logical envelope.
- [ ] **Invariant suite** — All normative invariants (uniqueness, no self-ref, acyclicity, ordering, hash stability, separation of concerns) tested and documented.
- [ ] **Test vectors** — Canonical and (if needed) v1 vectors committed; conformance validates against them.
- [ ] **ABI versioning** — Contract interface exported and snapshot-checked in CI to avoid accidental breaking changes.
- [ ] **Consensus-critical surface** — Documented; changes reviewed with protocol impact in mind.

---

## 4. SDK / distributed engineering concepts (checklist)

- [ ] **Build and typecheck** — All consumed packages (protocol, sdk-core, sdk-adapters, conformance) build and typecheck in CI.
- [ ] **Conformance as spec** — Conformance suite validates spec (vectors), not implementation; runnable without live services.
- [ ] **No hidden M1 infra** — M1 sign-off does not require Redis, IPFS, or live chain; mock or in-memory is sufficient.
- [ ] **Single-command verify** — Reviewers can run one command (e.g. `pnpm start:here` or `pnpm verify:m1`) for full M1 verification.
- [ ] **Reproducible** — Same results in CI and in a clean container (e.g. Node 20 + pnpm).
- [ ] **Dependency hygiene** — Lockfile committed; audit gate in CI for high/critical.

---

## 5. Recommended verification and test commands

Recommendations are aligned with the **software architecture** (protocol → sdk-core → sdk-adapters → conformance; root Vitest for spec/invariants/determinism) and **M1 expectations** (deterministic identity, canonical serialization, invariant enforcement, no live chain/Redis/IPFS).

### 5.1 By layer (dependency order)

Run in this order so each layer is built and tested before dependents.

| Layer | Purpose | Commands |
|-------|---------|----------|
| **Protocol** | Compile contracts, ABI snapshot, Hardhat unit tests | `pnpm --filter @alexandrian/protocol run compile`<br>`node packages/protocol/scripts/export-abi.mjs`<br>`pnpm --filter @alexandrian/protocol build`<br>`pnpm --filter @alexandrian/protocol test` |
| **SDK core** | Typecheck and build (depends on protocol) | `pnpm --filter @alexandrian/sdk-core run typecheck`<br>`pnpm --filter @alexandrian/sdk-core run build` |
| **SDK adapters** | Typecheck and build (depends on sdk-core, protocol) | `pnpm --filter @alexandrian/sdk-adapters run typecheck`<br>`pnpm --filter @alexandrian/sdk-adapters run build` |
| **Conformance** | Spec validation via test vectors (no live infra) | `pnpm --filter @alexandrian/conformance test` |
| **Root Vitest** | Spec, invariants, determinism, M1 demo (protocol semantics) | See §5.2 below |

### 5.2 Root test commands (M1 scope)

These run from repo root with `pnpm exec vitest run <paths>` or the root `test:*` scripts. Use `CONTRACT_MODE=mock` so no chain is required.

| Goal | Command | What it covers |
|------|---------|----------------|
| **Specification only** | `pnpm test:spec` | `tests/specification/` — canonical-vectors, derived-vectors, virtual-registry, protocol-invariants, etc. |
| **Invariants only** | `pnpm test:invariants` or `pnpm exec vitest run tests/invariants/` | Protocol and economic invariants (formal guarantees). |
| **Spec + invariants** (CI-aligned) | `CONTRACT_MODE=mock pnpm exec vitest run tests/specification/ tests/invariants/` | Same as CI “Specification & invariant tests” step. |
| **Determinism** | `pnpm test:determinism` | `tests/determinism/` — cross-runtime, memory serialization. |
| **Property-based** | `pnpm test:property` | `tests/property/` — canonical identity, royalty conservation. |
| **M1 demo suite** | `pnpm exec vitest run tests/demonstration/m1-demo.test.ts` | Canonical identity, determinism, VirtualRegistry, subgraph compatibility, invariant enforcement. |

**Note:** Root `pnpm test` currently runs `test:spec` + `test:property` + `test:determinism` but **not** `tests/invariants/`. For M1, invariants should be included (either in `pnpm test` or in a dedicated M1 verify command).

### 5.3 Single-command M1 verification (recommended)

The repo provides a single entry point that mirrors CI and requires no live infra. “one command for reviewers,” See root `package.json` for `verify:m1`, `build:m1`, and `test:m1`.

| Script | What it runs |
|--------|----------------|
| **`pnpm verify:m1`** | `build:m1` → `pnpm audit --audit-level=high` → `test:m1` |
| **`pnpm build:m1`** | Protocol compile → ABI export → protocol build → sdk-core build → sdk-adapters build (no subgraph). |
| **`pnpm test:m1`** | Protocol Hardhat tests → conformance → Vitest (spec + invariants + m1-demo + determinism). |

For environments where tests expect mock contracts, set `CONTRACT_MODE=mock` before running (e.g. `CONTRACT_MODE=mock pnpm run test:m1`). CI sets this for the spec/invariants step.

### 5.4 Verification commands (quick reference)

| Action | Command |
|--------|---------|
| **Full M1 (recommended)** | `pnpm verify:m1`, or run §5.1 + §5.2 in order |
| **CI-equivalent** | Install → audit → typecheck (sdk-core, sdk-adapters) → compile → ABI verify → build (protocol, sdk-core, sdk-adapters) → protocol test → conformance → `CONTRACT_MODE=mock pnpm exec vitest run tests/specification/ tests/invariants/` → `pnpm exec vitest run tests/determinism/` |
| **Spec only** | `pnpm test:spec` |
| **Invariants only** | `pnpm test:invariants` or `pnpm exec vitest run tests/invariants/` |
| **Spec + invariants** | `CONTRACT_MODE=mock pnpm exec vitest run tests/specification/ tests/invariants/` |
| **Determinism** | `pnpm test:determinism` |
| **M1 demo** | `pnpm exec vitest run tests/demonstration/m1-demo.test.ts` |
| **Conformance** | `pnpm test:conformance` |
| **Protocol unit** | `pnpm test:protocol` |
| **Build (root)** | `pnpm build` (protocol compile+build + subgraph; add sdk-core/sdk-adapters if needed) |
| **Typecheck** | `pnpm --filter @alexandrian/sdk-core run typecheck` and `pnpm --filter @alexandrian/sdk-adapters run typecheck` |
| **ABI export** | `node packages/protocol/scripts/export-abi.mjs` |

---

## 6. Out of scope for M1 (defer to M2+)

- Live testnet deployment and testnet smoke tests.
- Full API runtime (Redis, IPFS, chain) for integration.
- Subgraph indexing and hosted service (CI may build subgraph with continue-on-error).
- Fullstack tests that require API + chain (lineage, royalty-settlement, deprecation, etc.).
- All 9+ KB types exercised for kbHash (optional improvement post-M1).

---

*Checklist version: 1.0. Update verification commands to match your repo scripts (e.g. `verify:m1`, `start:here`).*
