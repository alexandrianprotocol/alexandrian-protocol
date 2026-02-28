# Deterministic knowledge block identity — claims and tests

**Claim:** Canonical serialization → stable kbHash → reproducible kbId.

**What must NEVER break:**

| Guarantee | Status | Test(s) that enforce it |
|-----------|--------|--------------------------|
| Same logical envelope → same bytes → same hash → same kbId | ✅ | `m1-demo.test.ts`: "1b. identical logical input produces identical kbId (cross-run determinism)"; `protocol-invariants.test.ts`: "same envelope produces same kbHash (hash stability)"; `virtual-registry.test.ts`: "idempotency: same envelope returns same kbId"; `derived-envelope.test.ts`: "kbHashFromEnvelope is deterministic for derived envelope"; `neutrality.test.ts`: "kbHashFromEnvelope is identical for same envelope regardless of source". |
| Reordered JSON keys do not change kbId | ✅ | `m1-demo.test.ts`: "2. object key order does not affect kbHash (JCS normalization)"; `protocol-invariants.test.ts`: "object key order does not affect kbHash (JCS key sort)". |
| Whitespace differences do not change kbId | ✅ | `protocol-invariants.test.ts`: "whitespace differences in JSON do not change kbId (same parsed object → same hash)" — two JSON strings (compact vs pretty), parse both, assert same deriveKbId. |
| Parent order canonicalization produces same kbId | ✅ | `m1-demo.test.ts`: "2b. source ordering does not affect identity when normalized"; `protocol-invariants.test.ts`: "same set of sources in different order yields same kbHash after sort"; `derived-vectors.test.ts`: "parent-sort normalization: unsorted and sorted yield same kbHash". |
| Different logical content MUST change kbId | ✅ | `m1-demo.test.ts`: "derive KB2 from KB1 ... kbId differs"; "DAG acyclicity: ... distinct kbIds"; `protocol-invariants.test.ts`: "changes kbId when logical content changes" (explicit negative test). |

---

## Translated to tests

### A. Canonical serialization property (semantically identical → same kbId)

**Claim:** Semantically identical envelopes (e.g. different key order or parent order) → same kbId.

**Existing:** Multiple tests; explicit matches:

- **`tests/invariants/protocol-invariants.test.ts`**  
  - `it("produces identical kbId when only object key order differs (JCS key sort)", ...)`  
  - `it("produces identical kbId when only source order differs (parent order canonicalization)", ...)`  
  Both use **`deriveKbId(envelope)`** from `tests/utils/derive-kb-id.ts` (wraps `kbHashFromEnvelope(sortSources(...))`).

- **`tests/demonstration/m1-demo.test.ts`**  
  "2. object key order does not affect kbHash"; "2b. source ordering does not affect identity when normalized".

- **`tests/specification/derived-vectors.test.ts`**  
  "parent-sort normalization: unsorted and sorted yield same kbHash".

### B. Negative mutation (different logical content → different kbId)

**Claim:** Different logical content MUST change kbId.

**Existing:** Implicit in derived KB and DAG tests.

**Explicit test added:**

- **`tests/invariants/protocol-invariants.test.ts`**  
  `it("changes kbId when logical content changes", ...)`  
  Uses `deriveKbId(a)` and `deriveKbId(b)`; minimal practice envelopes that differ only by payload (rationale "X" vs "Y"). Asserts different kbHash.

### C. Cross-process reproducibility

**Claim:** Same input in two separate processes → same kbId (reproducibility proof, not only unit test).

**Existing:** In-process determinism is tested (A and "1b. identical logical input produces identical kbId"). No cross-process test in Vitest.

**Added:** Script **`scripts/derive-kb-id.mjs`** (and **`packages/protocol/scripts/derive-kb-id.cjs`**) that read an envelope file and print the kbHash (kbId). Run twice and diff:

```bash
pnpm build
node scripts/derive-kb-id.mjs test-vectors/canonical/types/practice-minimal/envelope.json > id1.txt
node scripts/derive-kb-id.mjs test-vectors/canonical/types/practice-minimal/envelope.json > id2.txt
diff id1.txt id2.txt
```

Empty diff → deterministic across execution contexts.  
**Note:** If you see a `multiformats` module resolution error, use Node 20 LTS (`nvm use` or `fnm use`). Alternatively, run the Vitest test that asserts identical kbId twice in two separate `pnpm exec vitest run` invocations and confirm the same kbHash is printed (reproducibility proof).

---

## Summary

| Your test idea | Where it lives |
|----------------|----------------|
| A. Identical kbId for semantically identical envelopes | `protocol-invariants.test.ts` (new explicit test) + m1-demo "2" / "2b", derived-vectors parent-sort |
| B. Different content → different kbId | `protocol-invariants.test.ts` (new explicit test) + m1-demo derived/DAG tests |
| C. Cross-process reproducibility | `scripts/derive-kb-id.mjs` + manual diff (or CI step) |

API used in tests: **`kbHashFromEnvelope(envelope)`** (from `@alexandrian/protocol/core`) and **`deriveKbId(envelope)`** (from `tests/utils/derive-kb-id.ts`, which wraps `kbHashFromEnvelope(sortSources(envelope))`). kbId is the kbHash (0x + 64 hex). Registration returns `{ kbId }` where `kbId === kbHashFromEnvelope(envelope)`.

---

## How to improve the tests

### 1. Clarity and failure isolation

- **Split the combined “key order + parent order” test** into two tests: one that only varies object key order, one that only varies source order (after `sortSources`). When one guarantee breaks, the failing test name points at the exact property.
- **Add a test helper** `deriveKbId(envelope)` in `tests/utils/` that wraps `kbHashFromEnvelope(sortSources(envelope))` so test names and assertions can match the claim (“deriveKbId(a) === deriveKbId(b)”). Same API surface as the doc.
- **One describe per guarantee** (e.g. “Same logical envelope → same kbId”, “Key order does not change kbId”, “Source order canonicalization”, “Different content → different kbId”) so the spec map is visible in the runner.

### 2. Edge cases and JCS

- **Explicit “whitespace” test**: Two JSON strings that differ only by insignificant whitespace → `JSON.parse` both → same object → same kbId. Proves that hashing is on canonical form, not raw text.
- **Optional vs null**: If the spec defines how omitted fields vs `null` are canonicalized, add a test: envelope with `foo: null` vs envelope with `foo` omitted → either same or different kbId by spec; document the choice.
- **Unicode and large payload**: Already covered by test-vectors (unicode-content, large-payload); ensure canonical-vectors run in CI. Add one test that asserts “any two loads of the same vector file produce the same kbHash” to catch encoding/decoding drift.

### 3. Property-style coverage

- **Random key order**: Generate the same payload with `Object.keys` shuffled, canonicalize, assert all yield the same kbId. Catches any key-order leak in nested objects.
- **Random source order**: Same derivation, sources array permuted, then `sortSources`; assert same kbId. Complements the fixed parent-sort vector.

### 4. Traceability and docs

- **Tag tests with spec refs**: In the test name or a comment, add e.g. `PROTOCOL-SPEC §2` or `INVARIANTS §2` so reviewers can map test → spec.
- **Single table in TESTING.md or this doc**: Guarantee → test name → file. Keep it updated when adding or renaming tests.

### 5. Cross-process reproducibility

- **CI step**: Optional job that runs `derive-kb-id.mjs` twice and diffs (e.g. on Node 20); fail if diff non-empty. Makes C a first-class check.
- **Vitest-based repro**: A test that writes `kbHashFromEnvelope(standardEnvelope)` to two temp files (e.g. by spawning a child process that runs a one-liner), then asserts the files are identical. No dependency on Node 24 vs multiformats in the main process.

### 6. Shared data

- **Reuse fixtures for determinism tests**: Use `practiceEnvelope` (or a minimal envelope from `tests/fixtures.ts`) in “same logical → same kbId” and “different content” tests; override only the field that changes. Reduces duplication and keeps one source of truth for “minimal valid envelope”.

### 7. Negative and format tests

- **Invalid envelope → throws**: Assert that malformed envelopes (e.g. wrong type, missing required field) throw or return a documented error instead of producing a kbId. Ensures the implementation doesn’t “make up” identity for invalid input.
- **kbId format**: Already tested (“0x + 64 hex”); consider a small table of invalid formats (too short, no 0x, non-hex) and assert they are never returned by `kbHashFromEnvelope` for valid input.

### Priority

| Priority | Improvement | Effort |
|----------|-------------|--------|
| High | ~~Split key-order vs source-order into two tests; add `deriveKbId` helper~~ ✅ Done | — |
| High | ~~Explicit whitespace test (JSON parse)~~ ✅ Done; tag tests with PROTOCOL-SPEC §2 | Low |
| Medium | One describe per guarantee; table guarantee → test → file | Low |
| Medium | CI or Vitest-based cross-process repro | Medium |
| Lower | Property-style random key/source order; optional vs null | Medium |
| Lower | Invalid envelope throws; format table | Low |
