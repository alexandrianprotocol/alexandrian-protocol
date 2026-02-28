# Alexandrian Core v1 — Conformance Suite

This package implements the **conformance tests** for [PROTOCOL-SPEC-v1.md](../../docs/PROTOCOL-SPEC-v1.md). The suite validates that implementations produce identical outputs for the same inputs; it validates the **spec**, not a specific codebase.

## What is tested

- **Canonical serialization:** Envelope and proof objects are canonicalized per JCS (RFC 8785).
- **Content hashing:** Envelope → contentHash (SHA-256 of canonical envelope).
- **Proof hashing:** Proof → proofHash (keccak256 of UTF-8(JCS(proof))).
- **Test vectors:** Golden files under `test-vectors/v1/` and `test-vectors/canonical/`.

## Running

From repo root:

```bash
pnpm install
pnpm --filter @alexandrian/conformance test
```

From this package:

```bash
pnpm test
```

## Generating expected values

To regenerate `test-vectors/v1/proof/sample.expected.json` from the reference implementation:

```bash
pnpm --filter @alexandrian/conformance run generate:expected
```

After the first run, the proof test will compare against this golden file. Do not change existing vector expected values; add new vectors under new filenames.

## Compliance

Implementations that claim **Core** compliance MUST pass the envelope and proof conformance tests against the shipped vectors. See [PROTOCOL-SPEC-v1.md §8](../../docs/PROTOCOL-SPEC-v1.md#8-conformance).
