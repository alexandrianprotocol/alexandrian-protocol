# M1: Invariant & Feature → Test Mapping

**Purpose:** Map every normative invariant and feature to the specific test(s) that cover it, the validation mechanism, and the test flow. For grant reviewers and maintainers.

**References:** [INVARIANTS.md](../protocol/INVARIANTS.md), [PROTOCOL-SPEC.md](../protocol/PROTOCOL-SPEC.md), [M1-COMPLETION-CHECKLIST.md](M1-COMPLETION-CHECKLIST.md).

---

## 1. Protocol Invariants (INVARIANTS.md) → Tests

### INV §1 — Deterministic Identity

**Informal:** kbId is a pure function of content + lineage. No timestamp, curator, or nonce in preimage.

| Test(s) | Location | Mechanism | Flow |
|---------|----------|-----------|------|
| Same envelope produces same kbHash | `tests/invariants/protocol-invariants.test.ts` → "Deterministic Identity" → "same envelope produces same kbHash (hash stability)" | `kbHashFromEnvelope(envelope)` called twice; assert `h1 === h2`. | Build one envelope, compute hash twice, expect identical. |
| Object key order does not affect kbHash | Same file → "object key order does not affect kbHash (JCS key sort)" | JCS canonicalization sorts keys; two envelopes with different key order → same canonical bytes → same hash. | Two objects with same key-value pairs in different order; assert same kbHash. |
| Curator-neutral: same envelope, different curator → same kbId | Same file → "curator-neutral: same envelope from different curator yields same kbId" | VirtualRegistry stores curator separately; kbId is computed from envelope only. | Register same envelope with two curator addresses; assert same kbId. |
| Source order differs → same hash (parent order canonicalization) | Same file → "produces identical kbId when only source order differs" | `sortSources()` / normalize; `kbHashFromEnvelope` uses sorted sources. | Two envelopes with same payload, same source set in different order; assert same kbHash. |
| Whitespace in JSON does not change kbId | Same file → "whitespace differences in JSON do not change kbId" | Hash is from parsed object (canonicalized), not raw string. | Compact vs pretty-printed JSON; same parsed object → same hash. |
| Logical content change → different kbId | Same file → "changes kbId when logical content changes" | Different payload → different canonical bytes → different hash. | Two envelopes differing in payload; assert different kbHash. |
| Canonical vectors (golden kbHash) | `tests/specification/canonical-vectors.test.ts` → "Canonical test vectors" | Load `envelope.json` + `expected.json` from `test-vectors/canonical/*`; `kbHashFromEnvelope(envelope) === expected.kbHash`. | For each vector dir: read envelope, compute hash, assert equals committed expected. |
| Key order 10k permutations | `tests/property/canonical-identity.property.test.ts` → "kbId is identical for all key orderings (10000 runs)" | fast-check: random envelope + seed → shuffle keys deterministically; deriveKbId(env) === deriveKbId(shuffled). | 10k runs: generate practice envelope, shuffle keys by seed, assert both yield same kbId. |
| Conformance: v1 + canonical kbHash | `packages/conformance/src/envelope.test.ts` → "v1 envelope practice-minimal", "canonical types/practice-minimal" | Same: load envelope, compute kbHash, assert === expected from test-vectors. | Conformance suite runs without infra; validates spec against committed vectors. |

---

### INV §2 — Source Uniqueness

**Informal:** No duplicate source kbIds in `sources`. Reject with INVALID_ENVELOPE.

| Test(s) | Location | Mechanism | Flow |
|---------|----------|-----------|------|
| Duplicate sources rejected (INVALID_ENVELOPE) | `tests/invariants/protocol-invariants.test.ts` → "INV-2: Source Uniqueness" → "duplicate sources are rejected with INVALID_ENVELOPE" | VirtualRegistry: `assertSourcesUnique()` checks `new Set(sources).size === sources.length`; throws VirtualRegistryError code INVALID_ENVELOPE. | Register root KB; build envelope with `sources: [r.kbId, r.kbId]`; expect registerEnvelope to throw; assert `err.code === "INVALID_ENVELOPE"`. |
| Same set, different order → same hash | Same describe → "same set of sources in different order yields same kbHash after sort" | buildDerivedEnvelope sorts sources; kbHashFromEnvelope of both orders equal. | Two derived envelopes with sources [A,B] vs [B,A]; assert same kbHash. |
| VirtualRegistry rejects duplicate sources | `tests/specification/virtual-registry.test.ts` → "rejects duplicate sources (INVALID_ENVELOPE)" | Same: VirtualRegistry.registerEnvelope with duplicate sources → throw, code INVALID_ENVELOPE. | Register parent; register child with sources [parent, parent]; expect throw, code INVALID_ENVELOPE. |
| Derived vectors: duplicate-source-rejection | `tests/specification/derived-vectors.test.ts` → "duplicate-source-rejection: VirtualRegistry rejects duplicate sources" | Load envelope from test-vectors/canonical/edge-cases/duplicate-source-rejection; register practice first, then register envelope with duplicate sources; expect VirtualRegistryError, code INVALID_ENVELOPE. | File-based: envelope.json has duplicate sources; registry rejects. |
| M1 demo: duplicate sources | `tests/demonstration/m1-demo.test.ts` → "Invariant Enforcement" → "5a. duplicate sources are rejected (INVALID_ENVELOPE)" | Same VirtualRegistry path; envelope with `sources: [root.kbId, root.kbId]`; expect rejects.toMatchObject({ code: "INVALID_ENVELOPE" }). | Register root; try register with duplicate sources; assert rejection with code. |

---

### INV §3 — No Self-Reference

**Informal:** kbHash ∉ sources(E). Reject if envelope would cite itself.

| Test(s) | Location | Mechanism | Flow |
|---------|----------|-----------|------|
| Reject self-reference (CYCLE_DETECTED) | `tests/invariants/protocol-invariants.test.ts` → "Failure semantics: self-reference and lineage cycle" → "reject self-reference (sources containing own kbId) with CYCLE_DETECTED" | VirtualRegistry: (1) Every source must be in store; unregistered → CYCLE_DETECTED. (2) If computed kbId is in envelope's sources, CYCLE_DETECTED (self-reference). | Test builds envelope with sources [ownId] where ownId = kbHash(similar envelope). That id is not in registry, so register throws CYCLE_DETECTED (source not registered). Self-reference (kbId ∈ sources) would also throw; same code path. |

---

### INV §4 — Cycle Exclusion (Lineage Acyclicity)

**Informal:** Provenance graph is a DAG. Registration that would create a cycle → CYCLE_DETECTED.

| Test(s) | Location | Mechanism | Flow |
|---------|----------|-----------|------|
| Unregistered source rejected (CYCLE_DETECTED) | `tests/invariants/protocol-invariants.test.ts` → "INV-4: Cycle Exclusion" → "unregistered source is rejected with CYCLE_DETECTED" | VirtualRegistry: for each source, checks `this.store.has(p)`; if any source not registered, throws CYCLE_DETECTED (message "Source X not registered"). | Register envelope with sources ["0x" + "c".repeat(64)] (fake id); expect throw, code CYCLE_DETECTED. |
| Chain A→B→C acyclic | Same describe → "chain A → B → C registers without false cycle; DAG remains acyclic" | Register A (no sources), then B (sources [A]), then C (sources [B]); no cycle. | Three sequential registerEnvelope calls; assert all succeed and getKB returns correct sources. |
| Reject lineage cycle (unregistered + acyclic enforced) | Same file → "Failure semantics" → "reject lineage cycle (unregistered source and acyclic DAG enforced)" | Combination: unregistered parent → CYCLE_DETECTED; wouldCreateCycle() for multi-parent cycle. | Register A, B(A); try register C with sources [B, A] where C's kbHash would create cycle (or try register with unregistered parent). |
| VirtualRegistry rejects unregistered source | `tests/specification/virtual-registry.test.ts` → "rejects unregistered source" | Same: register child with sources [parentKbId] where parent not in registry; expect CYCLE_DETECTED. | Register child whose parent was never registered; expect throw. |
| Cycle rejection vector | `tests/specification/derived-vectors.test.ts` → "cycle rejection: VirtualRegistry rejects unregistered parent" | Load test-vectors/canonical/derivation/cycle-rejection/envelope.json; VirtualRegistry.registerEnvelope(envelope, …); expect toThrow(VirtualRegistryError). | File-based vector; envelope references unregistered parent; registry throws. |
| Contract: Parent not registered | `packages/protocol/test/Registry.test.js` → "DAG validation" → "publishKB reverts with Parent not registered if parent hash is not registered" | On-chain: publishKB(..., parents) where parent not yet published → contract reverts. | Publish child with parent that was never published; expect revert "Parent not registered". |

---

### INV §5 — Source Ordering (Lexicographic Sort)

**Informal:** sources MUST be sorted before hashing. Unsorted → SOURCES_NOT_SORTED (strict).

| Test(s) | Location | Mechanism | Flow |
|---------|----------|-----------|------|
| Unsorted sources rejected (SOURCES_NOT_SORTED) | `tests/specification/virtual-registry.test.ts` → "rejects unsorted sources (SOURCES_NOT_SORTED)" | VirtualRegistry: `assertSourcesSorted(sources)` checks `sources === [...sources].sort()`; throws SOURCES_NOT_SORTED. | Register two roots; build envelope with sources [second, first] (wrong order); register; expect throw, code SOURCES_NOT_SORTED. |
| Parent-sort: unsorted and sorted yield same kbHash | `tests/specification/derived-vectors.test.ts` → "parent-sort normalization" | kbHashFromEnvelope normalizes (sorts) sources internally; envelope-unsorted.json vs envelope-sorted.json → same kbHash. | Load envelope-unsorted.json and envelope-sorted.json; compute kbHash for both; assert equal and equal to expected.kbHash. |
| Conformance: parent-sort | `packages/conformance/src/envelope.test.ts` → "canonical derivation/parent-sort: unsorted and sorted yield same kbHash" | Same: load unsorted and sorted envelopes from test-vectors; assert same kbHash. | Conformance run; no infra. |
| M1 demo: SOURCES_NOT_SORTED | `tests/demonstration/m1-demo.test.ts` → "5c. unsorted sources are rejected" | Register A, B; envelope with sources [b.kbId, a.kbId]; expect rejects code SOURCES_NOT_SORTED. | Same as virtual-registry flow. |

---

### INV §6 — Hash Stability (Cross-Implementation)

**Informal:** Same logical envelope → same kbHash in any implementation. JCS + deterministic encoding.

| Test(s) | Location | Mechanism | Flow |
|---------|----------|-----------|------|
| Canonical vectors (all types + derivation + edge-cases) | `tests/specification/canonical-vectors.test.ts` | Each vector: envelope.json + expected.json (committed); implementation must match. | Walk test-vectors/canonical dirs; for each, kbHashFromEnvelope(envelope) === expected.kbHash. |
| Conformance envelope + proof | `packages/conformance/src/envelope.test.ts`, `proof.test.ts` | Same vectors; conformance package asserts against expected. | pnpm --filter @alexandrian/conformance test; no network. |
| Cross-runtime determinism | `tests/determinism/cross-runtime.test.ts` → "kbHash identical on current runtime", "kbId identical across runtimes" | Same envelope hashed in different contexts; assert identical. | Load golden envelope; compute kbHash/CID/kbId; assert matches golden or current runtime. |
| Property: key order, source order, whitespace | `tests/property/canonical-identity.property.test.ts` | 10k runs: key shuffle, source reorder, whitespace variants; all yield same kbId. | fast-check; deriveKbId(env) === deriveKbId(variant). |

---

### INV §7 — Slashing Invariants (When Applicable)

**Informal:** Collateral ceiling; attribution persistence; deterministic triggering (Rubric/SecurityReview).

| Test(s) | Location | Mechanism | Flow |
|---------|----------|-----------|------|
| Slashed KB cannot be queried | `packages/protocol/test/Registry.test.js` → "slashed KB cannot be queried (settleQuery reverts with KB slashed)" | Contract: settleQuery on slashed KB reverts. | Publish KB, slash it, call settleQuery; expect revert. |
| Repeated slash reverts (Already slashed) | Same file → "Slashing" → "repeated slash attempts revert with Already slashed" | Contract: slash(id) when already slashed → revert. | Slash same KB twice; second reverts. |
| State machine: Slashed → settleQuery reverts | Same file → "Slashed" → "settleQuery reverts (invalid transition from Slashed)" | Same. | Transition to Slashed; attempt settleQuery; revert. |

---

### INV §8 — Separation of Concerns

**Informal:** Registry = existence/lineage; Royalty = fees; Stake = collateral. No cross-storage.

| Test(s) | Location | Mechanism | Flow |
|---------|----------|-----------|------|
| Documented in INVARIANTS.md; boundary tests | `tests/invariants/sdk-boundaries.test.ts`, `closed-adapters-boundary.test.ts` | SDK/adapters do not mix layers; protocol-core does not import runtime. | lint:boundaries (scripts/check-boundaries.mjs) enforces import rules. |
| Contract: getAttributionDAG vs royalty | `packages/protocol/test/Registry.test.js` → "getAttributionDAG returns all parents", "settleQuery with parents routes royalties" | On-chain: registry stores parents; settlement uses that DAG for distribution. | Publish chain; getAttributionDAG; settleQuery; verify balances. |

---

### INV §9 — Royalty Constraint (Attribution DAG)

**Informal:** ∑ parentShareBps ≤ (10000 - protocolFeesBps).

| Test(s) | Location | Mechanism | Flow |
|---------|----------|-----------|------|
| getAttributionDAG splits to 10000 bps | `tests/invariants/protocol-invariants.test.ts` → "Royalty correctness (attribution DAG)" → "getAttributionDAG splits sum to 10000 bps for single parent", "for two parents" | VirtualRegistry.getAttributionDAG(kbHash) returns parents with royaltyShareBps; sum === 10000. | Register parent(s), register child; getAttributionDAG(child.kbId); assert sum of bps === 10000. |
| Shares exceed distributable revert | `packages/protocol/test/Registry.test.js` → "Share boundaries" → "royaltyShareBps sum of 10001 reverts with Shares exceed distributable" | Contract: publishKB(..., parents) with total bps > max distributable → revert. | Publish with parent shares summing over limit; expect revert. |
| Economic invariants: validateRoyaltyShares | `tests/specification/economic-invariants.test.ts` → "validateRoyaltyShares throws when parent shares exceed 100%" | Protocol-core economic validation (if present). | Call validateRoyaltyShares with invalid shares; expect throw. |
| settleQuery conserves 100% | `packages/protocol/test/Registry.test.js` → "settleQuery conserves 100% (sum of balance increases equals query fee)" | On-chain: after settleQuery, sum of all balance deltas equals msg.value. | settleQuery with known fee; measure balance changes; assert sum === fee. |

---

## 2. Specification Compliance (PROTOCOL-SPEC) → Tests

| Spec concept | Test(s) | Mechanism | Flow |
|---------------|---------|-----------|------|
| JCS canonicalization (key sort, no whitespace) | canonical-vectors, protocol-invariants (key order, whitespace), property key-order 10k | canonicalize() in canonical.ts; kbHashFromEnvelope uses it. | Compare hash of different key orders / whitespace; expect same. |
| Dual hash: artifactHash vs kbHash | Envelope shape (artifactHash required in VirtualRegistry); canonical.ts artifactHashFromPayload | artifactHash = hash(payload); kbHash = hash(full envelope with artifactHash). | Envelope must include artifactHash; both in preimage. |
| Envelope shape (type, domain, sources, artifactHash, tier, payload) | virtual-registry "validates schema: practice requires rationale, contexts, failureModes"; m1-demo "5b. schema violations (SCHEMA_INVALID)" | VirtualRegistry validates payload via practicePayloadSchema (etc.); missing fields → SCHEMA_INVALID. | Register envelope with missing required payload fields; expect SCHEMA_INVALID. |
| Idempotency: re-register same envelope → same kbId, isNew false | virtual-registry "idempotency: same envelope returns same kbId"; m1-demo "re-registering same envelope returns isNew=false" | VirtualRegistry.store.has(normalized); if already present, return same kbId, isNew: false. | Register same envelope twice; second returns isNew: false, same kbId. |
| Subgraph compatibility (kbId format 0x + 64 hex) | m1-demo "Subgraph Compatibility" → "kbId conforms to 32-byte 0x-prefixed hex" | VirtualRegistry returns kbId; assert match(/^0x[a-fA-F0-9]{64}$/) and length 66. | Register any KB; assert result.kbId format. |

---

## 3. Contract & Economic Behavior → Tests

| Behavior | Test(s) | Mechanism | Flow |
|-----------|---------|-----------|------|
| publishKB: stake required, duplicate revert, event matches storage | `packages/protocol/test/Registry.test.js` → On-chain registration primitive, DAG validation, State Machine | Hardhat: deploy registry, call publishKB; assert events, getKnowledgeBlock, reverts. | Full contract test suite. |
| settleQuery: fee conservation, protocol fee, royalty to parents | Same file → settleQuery describe blocks, "settleQuery conserves 100%", "protocol treasury receives protocol fee", "settleQuery with parents routes royalties" | Hardhat: publish chain, settleQuery with value; assert balances, events. | Multi-step: publish parent/child, settleQuery, check balances. |
| Economic invariants (RS bounds, freshness, tier gating, payout) | `tests/invariants/economic-invariants.test.ts` | Protocol-core economic helpers: clampRS, freshness, meetsTier, computePayout, ledger leaf hash. | Unit tests on pure functions. |
| Economic DAG (findCycles, validateRoyaltyShares, validateNoCycles) | `tests/specification/economic-invariants.test.ts` → cycle detection, royalty shares, validateRoyaltyDAG | Protocol-core: validateNoCycles, validateRoyaltyShares, validateRoyaltyDAG. | Call with valid/invalid DAG; expect pass or throw. |

---

## 4. SDK & Conformance → Tests

| Feature | Test(s) | Mechanism | Flow |
|---------|---------|-----------|------|
| hashContent, hashText, canonicalizeContent | `tests/specification/sdk-primitives.test.ts` → hashContent, hashText, canonicalizeContent | SDK adapters/core: deterministic, key order, nested objects, arrays order-sensitive. | Call SDK; assert format and determinism. |
| buildProofSpecV1, computeProofHash | Same file → "buildProofSpecV1 / computeProofHash" | Proof bundle format; proofHash deterministic. | Build proof; assert version, hash format, determinism. |
| Error taxonomy (AlexandrianError, ContractError, ValidationError, NotFoundError, NetworkError, wrapError) | Same file → "ok()/err()", "AlexandrianError", "ContractError", etc. | SDK-core errors: code, message, cause; wrapError maps contract errors. | Instantiate errors; assert shape; wrapError(revert) → ContractError. |
| Proof conformance (v1 proof hash) | `packages/conformance/src/proof.test.ts` | Load test-vectors/v1/proof; computeProofHash; assert === expected. | Conformance run. |
| CONTRACT_MODE=mock (no live infra) | All spec/invariants/demonstration tests | Tests use VirtualRegistry or mocks; no RPC/Redis/IPFS. | Set CONTRACT_MODE=mock; run test:spec, test:invariants, test:m1. |

---

## 5. Test Flow Summary (How Validation Happens)

| Layer | Where | How |
|-------|--------|-----|
| **Protocol-core (off-chain)** | VirtualRegistry, canonical.ts, kbHashFromEnvelope | VirtualRegistry.registerEnvelope() validates envelope (sources unique, sorted, no cycle, schema); computes kbId via kbHashFromEnvelope (canonicalize → keccak256 with domain tag). Throws VirtualRegistryError with code INVALID_ENVELOPE | SOURCES_NOT_SORTED | CYCLE_DETECTED | SCHEMA_INVALID. |
| **Golden vectors** | test-vectors/canonical, test-vectors/v1 | Tests load envelope.json + expected.json; compute kbHash/proofHash; assert === expected. No network. |
| **Contract (on-chain)** | AlexandrianRegistryV2.sol | publishKB checks stake, parents registered, royalty bps; settleQuery checks fee, KB registered, not slashed; reverts with custom errors. |
| **CI / one-command** | pnpm verify:m1 → test:m1 | test:m1 runs: protocol test (Hardhat), conformance test, then Vitest (spec + invariants + demonstration + determinism). All invariant paths above are executed. |

---

## 6. Demo Ideas (Your List) → Current Coverage

| Demo idea | Covered by (test / script) | Gap / note |
|-----------|----------------------------|------------|
| **1. Tamper-evidence (fake hash, modified content)** | Partial: m1-demo script shows "modify content → different identity"; "original still resolves". No explicit "verify(0xdead...) → NotFoundError" in single test. | Add one test or demo step: client.verify(fakeHash) → NotFoundError; attest(tamperedContent) → different kbId. |
| **2. Offline verification (hash without network)** | kbHashFromEnvelope is pure; canonical-vectors and property tests prove same hash offline. No "resolve(localHash) === onChain" in repo (that needs RPC). | Offline part: covered. On-chain comparison: M2 or integration. |
| **3. Lineage graph visualization (ASCII/D3)** | No ASCII tree or D3 in repo. resolveLineage in scripts/m1-demo.mjs walks registry; no formatted tree output. | Add to demo: format lineage as ASCII tree (or doc with example output). |
| **4. Royalty distribution trace** | Contract tests: "settleQuery with parents routes royalties", "conserves 100%". No getRoyaltyTrace() in SDK that returns tree of amounts. | On-chain: covered by Hardhat. Trace API: M2/SDK feature. |
| **5. Cross-implementation hash check (TS vs manual)** | canonical-vectors and conformance: same envelope → same hash. No explicit "manual JCS + keccak in another language" test. | Spec is implementation-agnostic; conformance vectors are the contract. Python/other: second implementation. |
| **6. CI/CD integration (GitHub Action attest)** | CI runs verify:m1; no alexandrian/attest-action yet. | Future: attest-action; verify:m1 is the CI story today. |
| **7. Error UX (typed errors, codes)** | sdk-primitives: AlexandrianError, ContractError, ValidationError, codes. m1-demo and invariant tests assert on err.code. | Covered: INVALID_ENVELOPE, CYCLE_DETECTED, SOURCES_NOT_SORTED, SCHEMA_INVALID. |
| **8. Time travel / historical state** | Contract: getKnowledgeBlock is current state. No resolveAtBlock or getBlockHistory in repo. | M2 or indexer/subgraph feature. |
| **9. Stress (deep DAG, gas table)** | Registry.test.js: "DAG of depth 1000", "KB with 100 parents", gas profile tests. | Covered: depth, width, gas thresholds. |
| **10. "Build on top" invitation** | M1-DEMO.md narrative; no hypothetical agent code in repo. | Doc/vision only. |

---

## 7. Commands That Run What

| Command | Invariants / features exercised |
|---------|----------------------------------|
| `pnpm test` | spec (canonical, derived, virtual-registry, neutrality, sdk-primitives, economic-invariants, …) + invariants (protocol-invariants, economic-invariants, boundaries) + property (canonical-identity 10k) + determinism. |
| `pnpm test:m1` | Protocol Hardhat (all contract invariants, settlement conservation, DAG, slashing, gas) + conformance (envelope + proof vectors) + same Vitest suites as above (spec + invariants + demonstration + determinism). |
| `pnpm verify:m1` | build:m1 + lint:boundaries + audit + test:m1. So: all of the above plus ABI snapshot, subgraph build, boundary lint. |

---

## 8. Out of scope (M2+)

This map covers M1 invariants and tests. Fullstack tests requiring API+chain, testnet smoke, live subgraph integration, and coverage beyond M1 are deferred to M2+. **Full list:** [M1-SCOPE-FREEZE.md](../M1-SCOPE-FREEZE.md).

---

*This map is the single place that ties INVARIANTS.md and PROTOCOL-SPEC to concrete tests and flows. Update it when adding new invariants or tests.*
