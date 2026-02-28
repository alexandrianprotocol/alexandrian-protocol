# ADR-0001 — JCS (RFC 8785) for Canonical Envelope Serialization

```yaml
document:
  id: ADR-0001
  version: 1.0.0
  owner: protocol-team
  status: accepted
  classification: internal
  last_reviewed: "2026-02-25"
  schema_version: "1.0"
  depends_on:
    - PROTO-001
```

---

## Status

**Accepted** — 2025-01-01 *(decision pre-dates formal ADR registry; retroactively documented)*

---

## Context

The Alexandrian Protocol requires that every Knowledge Block (KB) envelope produce a **byte-identical hash** regardless of:

- The order in which JSON object keys are written.
- The presence or absence of insignificant whitespace.
- The programming language or library used to construct the envelope.

Without a canonical serialization standard, two conformant implementations could produce different `kbHash` values for semantically identical envelopes. This would break:

1. **Content-addressed identity** — `kbId = kbHash` must be globally unique and stable.
2. **Cross-implementation conformance** — multiple agents and runtimes must agree on the same hash.
3. **Test vector reproducibility** — committed vectors in `test-vectors/` must be byte-reproducible on any machine.

The choice of serialization format is a **hard constraint**: once a KB is published on-chain with a given `kbHash` (field name `contentHash`), there is no path to migrate its identity without breaking provenance.

---

## Decision

> **Normative:** All Alexandrian Protocol envelope serialization for `kbHash` derivation MUST use JSON Canonicalization Scheme (JCS) as defined in [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785).

The canonical form is produced by:

1. Representing the envelope as a JSON object with only protocol-defined fields.
2. Applying JCS (RFC 8785) to produce a deterministic byte sequence: keys sorted lexicographically by Unicode code point, no insignificant whitespace, UTF-8 encoded.
3. Computing `keccak256` of the resulting UTF-8 bytes with domain separation (see [ADR-0002](0002-keccak256-content-hash.md)).

> **Normative:** Fields NOT included in the kbHash preimage: `curator`, `timestamp`, `signature`.
> These are attribution/metadata fields that must not affect identity.

The implementation lives in `packages/protocol/src/canonical/canonicalize.ts`.

---

## Rationale

**JCS (RFC 8785) was chosen because:**

1. **IETF-standardized** — well-defined, stable specification with no ambiguity in edge cases (Unicode, number representation, etc.).
2. **Deterministic across all JSON number representations** — JCS specifies IEEE 754 double-precision serialization, avoiding platform-specific float formatting bugs.
3. **Implemented in all target runtimes** — TypeScript/Node, browser (via `json-canonicalize` package), and derivable in Solidity via off-chain pre-computation.
4. **Auditable** — the canonical form is a plain UTF-8 string; any engineer can read it and verify it by hand.
5. **Key-order independence proven** — property tests (`tests/property/`) run 10,000 random key orderings and assert byte-identical output.

---

## Alternatives Considered

### Alternative A — Alphabetical key sorting (custom implementation)

A common pattern: sort keys alphabetically before `JSON.stringify`. This is simpler to implement from scratch but:

- **Not standardized** — alphabetical ordering is ambiguous for Unicode keys outside ASCII (locale-dependent, case sensitivity varies).
- **No number normalization** — different implementations produce different byte sequences for the same float.
- **Not auditable** — no external reference to verify conformance.

**Rejected:** underspecified; would require a custom conformance test suite to replace what RFC 8785 already provides.

### Alternative B — Protocol Buffers (protobuf) binary serialization

Binary canonical encoding with a defined schema:

- **Deterministic** — protobuf binary encoding is deterministic for a given schema.
- **Compact** — smaller byte footprint than JSON.
- **Not human-readable** — cannot be verified by inspection; requires tooling.
- **Schema evolution complexity** — field additions and removals require careful version management to preserve hash stability.
- **Poor EVM alignment** — keccak256 in Solidity operates on `bytes`; protobuf bytes are equally valid but lose the "inspect the preimage in a block explorer" property.

**Rejected:** operational complexity and loss of human-verifiability outweigh the size savings.

### Alternative C — CBOR canonical encoding (RFC 7049 §3.9 / RFC 8949)

CBOR's deterministic encoding is a binary format used in some blockchain contexts:

- **Standardized** — IETF-specified deterministic form.
- **Compact and type-safe.**
- **Not natively inspectable in JSON tooling** — the existing SDK and test toolchain is JSON-native.
- **Less ecosystem support in TypeScript** — fewer well-maintained libraries vs. `json-canonicalize`.

**Rejected:** tooling ecosystem disadvantage and loss of JSON-native inspectability.

---

## Consequences

### Positive

- All conformant implementations produce byte-identical hashes for the same logical KB — proven by the conformance suite (`pnpm --filter @alexandrian/conformance test`).
- Test vectors in `test-vectors/canonical/` and `test-vectors/derived/` are fully reproducible from a clean clone.
- The canonical form can be inspected as plain text in any debugger or block explorer.
- Property tests (`tests/property/`) provide probabilistic proof of key-order and whitespace independence across 10,000 random inputs.

### Negative / Trade-offs

- JCS requires a dependency on `json-canonicalize` (or equivalent). The dependency is small and audited, but it exists.
- Envelope fields must be strictly typed: undefined/null fields must be consistently omitted or included — any inconsistency breaks hash stability. This is enforced by `validateEnvelope()`.
- Future schema extensions must be backward-compatible: adding a field without incrementing the version would silently change the hash of otherwise identical envelopes.

### Required follow-up

- [x] `packages/protocol/src/canonical/canonicalize.ts` — implements JCS
- [x] `tests/property/` — key-order and whitespace independence (10,000 runs)
- [x] `test-vectors/canonical/` — committed vectors for cross-run determinism
- [x] `docs/protocol/PROTOCOL-SPEC.md §2` — normative references to JCS
- [ ] Any future schema field addition must update `PROTOCOL-SPEC.md` and bump version per ADR versioning policy

---

## Normative References

- [RFC 8785 — JSON Canonicalization Scheme (JCS)](https://www.rfc-editor.org/rfc/rfc8785)
- [PROTOCOL-SPEC-001](../protocol/PROTOCOL-SPEC.md) §2 — Canonical serialization
- [ADR-0002](0002-keccak256-content-hash.md) — keccak256 for kbHash

---

## Out of scope

This ADR does not decide:

- The hashing algorithm applied to the canonical bytes (see [ADR-0002](0002-keccak256-content-hash.md)).
- The storage format for Knowledge Blocks (on-chain vs. IPFS).
- The wire format for agent-to-agent envelope transmission.
