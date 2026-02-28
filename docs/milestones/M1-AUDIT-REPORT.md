# M1 Checklist Audit Report

**Date:** 2026-02-25
**Scope:** Codebase audit against [M1-COMPLETION-CHECKLIST.md](M1-COMPLETION-CHECKLIST.md) — missing guarantees, M2 leakage, verbose/dev-only content, and gaps.

---

## Session 2 — Changes applied (2026-02-25)

The following M1 gaps were resolved in this session:

| Item | Change | File(s) |
|------|--------|---------|
| **Chain ID validation** | Added `createAlexandrianClient()` async factory; throws `ValidationError("INVALID_CHAIN_ID")` if RPC chain ≠ expected | `packages/sdk-adapters/client/AlexandrianSDK.ts`, `lib/addresses.ts` |
| **NatSpec completeness** | Added `@notice`/`@param`/`@return` to all 25+ undocumented public functions | `packages/protocol/contracts/AlexandrianRegistryV2.sol` |
| **Storage layout doc** | Created full slot-by-slot layout with struct packing analysis and upgrade notes | `packages/protocol/docs/STORAGE-LAYOUT.md` |
| **SDK README / quickstart** | Created 5-minute quickstart: install, create client, publish, settle, verify | `packages/sdk-adapters/README.md` |
| **SDK primitives tests** | 30+ unit tests for `hashContent`, `hashText`, `canonicalizeContent`, proof spec, and full error taxonomy | `tests/specification/sdk-primitives.test.ts` |
| **Secret scanning** | Added TruffleHog CI job (`--only-verified`) as parallel step | `.github/workflows/ci.yml` |
| **Changesets** | Added `.changeset/config.json` and `README.md` for version management | `.changeset/` |
| **Error taxonomy** | `AlexandrianError`, `ContractError`, `NetworkError`, `ValidationError`, `NotFoundError`; `ok()`/`err()`/`wrapError()` | `packages/sdk-core/lib/errors.ts` |
| **ABI JSON export** | 124-entry ABI extracted from Hardhat artifacts; CI snapshot gate | `packages/protocol/src/abis/AlexandrianRegistryV2.json` |
| **tsup dual build** | ESM + CJS output for `sdk-core` and `sdk-adapters` | `tsup.config.ts` in both packages |
| **Sourcify + typechain** | Added to `hardhat.config.cjs`; typechain outputs to `sdk-adapters/src/typechain/` | `packages/protocol/hardhat.config.cjs` |
| **Deployment manifest** | Canonical address + metadata (tx/block fields need fill-in from deploy script) | `packages/protocol/deployments/AlexandrianRegistryV2.json` |

### Remaining high-priority gaps (not yet addressed)

| Gap | File | Priority |
|-----|------|----------|
| `CONSENSUS-CRITICAL.md` referenced but missing | **FALSE POSITIVE** — file exists at `docs/protocol/CONSENSUS-CRITICAL.md` (6 sections, complete) | ✅ Resolved |
| `packages/protocol/docs/API.md` missing | `packages/protocol/docs/API.md` | Medium |
| `tests/demonstration/` not in CI gate | **RESOLVED** — added to `.github/workflows/ci.yml` as "M1 demonstration suite" step | ✅ Resolved |
| Deployment manifest: fill `deploymentTx` + `deploymentBlock` | `packages/protocol/deployments/AlexandrianRegistryV2.json` | Medium |
| SDK methods still throw raw errors (not `Result<T,E>`) | `packages/sdk-adapters/client/AlexandrianSDK.ts` | M2 |

---

---

## 1. Missing guarantees (checklist vs implementation)

### 1.1 Documentation

| Checklist item | Status | Finding |
|----------------|--------|---------|
| **1.4.4 Consensus-critical surface** | **Missing** | `CONSENSUS-CRITICAL.md` is referenced from `docs/protocol/INVARIANTS.md` and `packages/protocol/src/canonical.ts` (comment: "Normative spec: docs/protocol/CONSENSUS-CRITICAL.md §3") but **the file does not exist** in `docs/protocol/`. Only `PROTOCOL-SPEC.md` and `INVARIANTS.md` are present. |
| **2.5.4 SDK/API surface** | **Missing** | Checklist expects `packages/protocol/docs/API.md` or index exports documented. **No `API.md`** under `packages/protocol/` or `docs/protocol/`. Public exports are only visible via `packages/protocol/src/index.ts` and `core/index.ts`. |
| **protocol-invariants.md** | **Unclear** | INVARIANTS.md references a companion "protocol-invariants.md — rationale and context (non-normative)". Not found in `docs/protocol/`; may live elsewhere or be optional. |

### 1.2 CI vs M1 checklist

| Checklist item | Status | Finding |
|----------------|--------|---------|
| **2.3.4 M1 demo suite in CI** | **Gap** | CI runs `tests/specification/` and `tests/invariants/` and `tests/determinism/` but **does not run `tests/demonstration/`** (m1-demo.test.ts, ingestion.test.ts, demo-protocol-walkthrough.test.ts). So the M1 demo suite is not part of the CI gate. |
| **2.4.4 One-command verification** | **Partial** | Root has `verify:m1` and `build:m1` / `test:m1`. README still mentions `pnpm test:all`, `pnpm test:integration`, `pnpm demo:walkthrough`, `pnpm test:m2` — **root package.json does not define `test:all`, `test:integration`, or `test:m2`**. Script drift between README and package.json. |

### 1.3 Envelope shape (1.1.5)

| Item | Status | Finding |
|------|--------|---------|
| **Required `artifactHash` and `tier`** | **Enforced in VirtualRegistry only** | `VirtualRegistry` rejects envelopes missing `tier` or invalid `artifactHash`. `kbHashFromEnvelope` in `canonical.ts` **defaults** `tier ?? "open"` and `artifactHash ?? artifactHashFromPayload(input.payload)`, so callers can omit them and still get a hash. Test vectors (e.g. `test-vectors/canonical/types/practice-minimal/envelope.json`) correctly include both. M1-demo tests use minimal envelopes **without** `artifactHash`/`tier` and rely on these defaults. For strict spec alignment, consider either documenting that only the registration path requires full shape or adding a strict validation path that rejects missing required fields. |

### 1.4 Conformance package

| Item | Status | Finding |
|------|--------|---------|
| **Proof conformance import** | **Broken / wrong package name** | `packages/conformance/src/proof.test.ts` and `packages/conformance/src/generate-expected.ts` import from **`@alexandrian/sdk`** (e.g. `computeProofHash`, `ProofSpecV1`). The workspace has **no package named `@alexandrian/sdk`** (only `@alexandrian/sdk-core` and `@alexandrian/sdk-adapters`). `computeProofHash` and `ProofSpecV1` are exported from **`@alexandrian/sdk-adapters`**. Conformance will **fail to resolve** unless an alias or external package provides `@alexandrian/sdk`. **Recommendation:** Change imports to `@alexandrian/sdk-adapters`. |

---

## 2. M2 implementation and skipped tests

### 2.1 Experimental / M2-only (correctly scoped)

- **`experimental/tests-m2/`** — Fullstack, testnet, subgraph, lineage, royalty-settlement, deprecation, ai-usage-proof, payment-settlement. Uses `describe.skip`, `it.skip`, or `it.skipIf(!hasStack)` / `it.skipIf(!hasTestnet)`. Correctly out of M1 scope; no change needed.

### 2.2 M2 or skipped content in main `tests/`

| Location | Finding |
|----------|---------|
| **`tests/specification/sdk-consumption-modes.test.ts`** | Entire suite is **`describe.skip("QueryResult consumption modes (out of Core 1.0 scope)")`**. Uses `QueryResult.from(MOCK_MATCH)` but `QueryResult` is not imported in the snippet — likely broken when unskipped. Marked as out of Core 1.0; acceptable for M1 to leave skipped. |
| **`tests/property/canonical-differential.test.ts`** | Contains **`it.skip("JS canonicalizer === Rust canonicalizer (1000 random inputs)")`** — deferred cross-impl check; fine for M1. |
| **`tests/composition/ingest-registry-lineage-query.test.ts`** | Comment says "Runs with no testnet, Docker, or external services". Composition test; not in CI Vitest paths (CI runs `tests/specification/` and `tests/invariants/` only). So composition is not part of the current CI gate. |

### 2.3 CI and root test scripts

- CI does **not** run `tests/demonstration/` or `tests/composition/`.
- Root `pnpm test` = `test:spec` + `test:property` + `test:determinism` (no invariants). So **invariants are not run by default** on `pnpm test`; they are only run in `test:m1` and in CI (explicit step for spec + invariants).

---

## 3. Verbose or dev-only comments and code

### 3.1 Console logging (dev/demo output)

| File | Usage | Recommendation |
|------|--------|----------------|
| **`tests/demonstration/m1-demo.test.ts`** | `console.log` for "INVALID_ENVELOPE — duplicate sources rejected", "SCHEMA_INVALID — ...", "SOURCES_NOT_SORTED — ..." | Demo/documentation output. Consider removing or gating behind `process.env.VERBOSE` / a reporter so CI stays quiet. |
| **`tests/demonstration/demo-protocol-walkthrough.test.ts`** | `console.log` for root KB, CIDv1, derived KB (truncated). Comment says "Structured with describe blocks and assertions only (no console.log)" but file does log. | Align with comment: remove logs or move to a separate demo script. |
| **`tests/demonstration/ingestion.test.ts`** | Multiple `console.log` lines (title, tagline, content length, blocks, CID, kbId, curator, etc.) | Same as above: optional for M1; remove or env-gate for clean CI. |
| **`tests/execution/flow-1-ingestion.test.ts`** | `console.log(say('hello_world_passed'))`, etc. | Demo-style; gate or remove. |
| **`packages/protocol/test/QuerySettleWalkthrough.test.js`** | Extensive `console.log` for Registry, contentHash, query fee, settlement, balances. | Hardhat test; acceptable as manual demo output; consider reducing or gating. |
| **`packages/protocol/test/Registry.test.js`** | `console.log` for gas used (publishKB, settleQuery, 5 parents). | Useful for gas tracking; can stay or be gated. |
| **`experimental/tests-m2/fullstack/*.test.ts`** | Various `console.log` for flow_2_royalty_passed, flow_3_payment_passed, ai_usage_proof_passed, payout/RS/freshness, etc. | M2; keep or gate as needed. |
| **`packages/conformance/src/generate-expected.ts`** | `console.log("Wrote sample.expected.json with proofHash:", proofHash)` | Acceptable for a one-off script. |
| **`scripts/generate-seed-index.js`** | `console.log("Wrote", dest, "count", out.length)` | Acceptable. |

### 3.2 TODO / FIXME / HACK

| File | Item | Recommendation |
|------|------|----------------|
| **`experimental/sdk-adapters/semanticIndex/SemanticIndex.ts`** | `TODO: Migrate from packages/api. Use API search/embeddingCache for now.` | M2/experimental; leave or track in issues. |
| **`packages/protocol/src/sdk/AlexandrianSDK.ts`** | `TODO: Migrate from packages/sdk. Use @alexandrian/sdk for full implementation.` + placeholder comment | Clarify: there is no `@alexandrian/sdk`; point to `@alexandrian/sdk-adapters` or remove if unused. |
| **`packages/sdk-adapters/lib/memory/CanonicalMemoryAdapter.ts`** | `TODO: enforce M6 proof binding via SDK proof verification.` / `TODO: M5 idempotent sync from HeadUpdated event.` | M5/M6 scope; leave for later. |
| **`packages/sdk-adapters/lib/adapters/a2a.ts`** | `TODO: wire to ProofAdapter + chain snapshot.` | Future work. |
| **`packages/sdk-adapters/lib/adapters/indexer.ts`** | `TODO: implement subgraph query for proof snapshot.` | M2/subgraph; leave. |

### 3.3 Direct package paths (fragile)

Root-level tests import from **package source paths** instead of the built package name:

| File | Import | Issue |
|------|--------|--------|
| **`tests/specification/invariant-pipeline.test.ts`** | `from "../../packages/protocol/src/canonical.js"` | Bypasses package boundary; fragile if protocol structure changes. |
| **`tests/specification/proof-vectors.test.ts`** | `from "../../packages/protocol/src/canonical.js"` | Same. |
| **`tests/specification/artifact-modes.test.ts`** | `from "../../packages/sdk-core/lib/core/fetchArtifact.js"` | Same for sdk-core; also uses internal path `lib/core`. |
| **`tests/specification/proof-middleware.test.ts`** | `from "../../packages/sdk-core/lib/adapters/types.js"` | Internal sdk-core path. |
| **`tests/specification/sdk-core.test.ts`** | `from "../../packages/sdk-core/lib/core/fetchArtifact.js"` | Same. |
| **`tests/invariants/pool-head-determinism.test.ts`** | `from "../../packages/protocol/src/canonical.js"` and `../../packages/sdk-core/lib/adapters/types.js` | Same. |

**Recommendation:** Prefer `@alexandrian/protocol` and `@alexandrian/sdk-core` (and public exports) so tests depend on the public API and survive refactors.

### 3.4 Placeholder / stub

| File | Finding |
|------|---------|
| **`packages/protocol/scripts/verify.js`** | Contains only `console.log("verify placeholder");` — dead code or stub. Remove or implement. |

---

## 4. Gaps summary

| Category | Gap | Priority |
|----------|-----|----------|
| **Docs** | Add `docs/protocol/CONSENSUS-CRITICAL.md` (referenced by INVARIANTS and canonical.ts). | High |
| **Docs** | Add `packages/protocol/docs/API.md` (or document public API in README/spec) per checklist 2.5.4. | Medium |
| **CI** | Include `tests/demonstration/m1-demo.test.ts` (and optionally ingestion + demo-protocol-walkthrough) in CI so M1 demo is part of the gate. | High |
| **Scripts** | Align README with package.json: add missing scripts (`test:all`, `test:integration`, `test:m2`, `demo:walkthrough`) or remove references. | Medium |
| **Conformance** | Fix conformance proof imports: use `@alexandrian/sdk-adapters` instead of non-existent `@alexandrian/sdk`. **(Fixed in conformance `proof.test.ts` and `generate-expected.ts` and `package.json`.)** | High |
| **Tests** | Prefer `@alexandrian/protocol` and `@alexandrian/sdk-core` in root tests instead of `../../packages/.../src/...` or `lib/` paths. | Medium |
| **Cleanup** | Remove or env-gate `console.log` in M1 demonstration tests for quiet CI. | Low |
| **Cleanup** | Remove or implement `packages/protocol/scripts/verify.js` placeholder. | Low |

---

## 5. Checklist items that are satisfied

- **1.1.1–1.1.4:** Canonical serialization, content-addressed identity, source ordering, dual-hash: covered by spec tests, canonical-vectors, m1-demo, VirtualRegistry.
- **1.2.1–1.2.5:** Invariant enforcement (source uniqueness, no self-ref, acyclicity, source ordering, hash stability): covered by invariants tests and m1-demo.
- **1.2.6:** Separation of concerns: documented in INVARIANTS §8.
- **1.3.1–1.3.2:** Canonical and v1 test vectors: present under `test-vectors/`; conformance envelope tests use them.
- **1.3.3–1.3.4:** Proof conformance and generate:expected exist; proof tests depend on fixing `@alexandrian/sdk` import.
- **1.4.1–1.4.3:** Contract compile, ABI snapshot, protocol unit tests: in place and in CI.
- **2.1.1–2.1.4:** sdk-core and sdk-adapters typecheck and build; protocol builds; CI runs them.
- **2.2.1–2.2.3:** Conformance validates vectors; no live infra for M1 when CONTRACT_MODE=mock.
- **2.3.1–2.3.3:** Spec, invariants, determinism tests exist and are run in CI.
- **2.4.1–2.4.2:** CI pipeline and dependency audit are in place.
- **2.5.1–2.5.3:** Protocol spec and invariants are normative; milestone table in README with link to checklist.

---

*Audit version: 1.0. Re-run after addressing high-priority gaps and conformance fix.*
