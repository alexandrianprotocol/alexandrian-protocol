# Alexandrian Core v1 — Test Vectors

Immutable golden vectors for **Core v1** conformance. Every implementation that claims compliance MUST produce identical outputs for these inputs.

See [PROTOCOL-SPEC-v1.md](../../docs/PROTOCOL-SPEC-v1.md) and [packages/conformance](../../packages/conformance/).

## Layout

| Path | Purpose |
|------|---------|
| `envelope/*.json` | Envelope input; sibling `*.expected.json` holds `contentHash` (and optionally `canonicalHex`). |
| `proof/*.json` | Proof object input; sibling `*.expected.json` holds `proofHash` (and optionally `payloadHash`). |
| `hashes/*.json` | Named digest expectations: input + algorithm + expected hex. |

## Vector format

### Envelope

- **Input:** JSON object (envelope). Keys camelCase; `sources` sorted lexicographically before hashing per spec.
- **Expected:** `contentHash` (0x-prefixed 64-char hex, SHA-256 of canonical envelope). Optional: `canonical` (full JCS string) or `canonicalHash` for cross-check.

### Proof

- **Input:** JSON object (alexandrian-proof/1). All numeric-like values as strings.
- **Expected:** `proofHash` (0x-prefixed hex, keccak256(UTF-8(JCS(proof)))). Optional: `payloadHash` when payload binding is present.

### Hashes

- **Input:** Optional; or reference to envelope/proof id.
- **Expected:** `algorithm`, `value` (hex). Used for algorithm and cross-implementation checks.

## Compatibility

- Vectors in `test-vectors/v1/` are **immutable**. Clarifications that do not change digest expectations may be documented in CHANGELOG.
- Additional vectors may be added under new filenames; existing filenames and expected values MUST NOT change.
- The conformance suite in `packages/conformance/` MUST pass against all vectors.

## Canonical vectors

The existing [test-vectors/canonical/](../canonical/) set also validates envelope/contentHash conformance. Core v1 conformance MAY use both `v1/` and `canonical/` for envelope hashing.
