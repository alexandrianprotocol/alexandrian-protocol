# Consensus-Critical Surface

**Purpose:** Define what must not change without a major spec version to avoid silent fork risk (same envelope → different kbId across implementations).

**Spec:** [PROTOCOL-SPEC.md](PROTOCOL-SPEC.md) §2 and §7.

---

## 1. Canonicalization and Hashing (§2)

The following are **frozen** and **consensus-critical**:

- **JCS-style canonicalization:** Object keys sorted lexicographically, recursively; no whitespace; UTF-8. Sources array normalized (sorted) before canonicalization.
- **kbHash:** `0x` + hex(keccak256("KB_V1" || canonical_string)). Same envelope → same kbHash in every implementation.
- **artifactHash:** keccak256(JCS(artifact)) for payload/artifact objects; envelope includes artifactHash so identity commits to content integrity.

**Rule:** Any change that alters the canonical hash for existing envelopes is a breaking change. Major spec version bump required; no silent changes.

---

## 2. Reference Implementation

- **Package:** `@alexandrian/protocol` (TypeScript). Exports: `canonicalize`, `contentHashFromCanonical`, `kbHashFromEnvelope`, `artifactHashFromPayload`, `sortSources`.
- **Normative formula:** `computeKbHash(envelope) = keccak256("KB_V1" || jcsCanonicalize(normalize(envelope)))`. Implementations in Rust, Go, Python, or any language that produce the same output are compliant.
- **Reference consumer scripts:**
  - `scripts/compute-hashes.mjs` — takes `<envelope.json> <artifact.json>`, computes artifactHash and kbHash (and optionally `--write` to update envelope). Use for any seed; canonical for root.
  - `scripts/compute-root-artifact-hash.mjs` — root-only: reads fixed paths, computes artifactHash, updates root envelope. Uses the same hash rules as the protocol package (or inline equivalent). Versioned with the repo; hash behavior MUST NOT change without a major spec/release.

---

## 3. Test Vectors

- **Location:** `test-vectors/canonical/` — each vector has `envelope.json` and `expected.json` (kbHash, optionally cidV1).
- **Role:** Normative input/output pairs. Conformance MUST be verified by recomputing kbHash per §2 and asserting equality with expected.
- **Multi-language:** Recomputing in multiple languages is recommended for standardization and to prevent implementation drift.

---

## 4. Indexing (The Graph)

The indexer does **not** compute identity. It reflects event data (e.g. contentHash from KBPublished, which equals kbHash). Deterministic, stable ID logic in the spec ensures the subgraph remains a pure reflection layer, not a mirror of SDK authority.

---

## 5. Summary

| Item | Status | Do not change without |
|------|--------|------------------------|
| §2 canonicalization rules | Frozen | Major spec version |
| §2 kbHash / artifactHash formula | Frozen | Major spec version |
| Reference implementation (protocol package) | Versioned with spec | Major release |
| compute-root-artifact-hash.mjs hash behavior | Consensus-critical consumer | Major release |
| Test vector expected values | Normative | Vector version or spec version |

---

## 6. Reference implementations and machine-readable spec

To achieve **cross-implementation hash parity** (the “TCP/IP-level test”): any compliant implementation that re-implements canonicalization and hashing in another language must produce the same `kbHash` for the same envelope.

- **Machine-readable formal spec:** [canonical-spec.json](canonical-spec.json) — defines hash-scope keys, excluded keys, domain tag `KB_V1`, algorithm name, and identity formula. Use this to implement conformant hashing without relying on prose alone.
- **Second-language reference:** [reference-implementations/python/](../../reference-implementations/python/) — Python implementation of `normalize` + JCS-style canonicalize + keccak256. Run against golden vectors:
  ```bash
  pip install -r reference-implementations/python/requirements.txt
  python reference-implementations/python/kbhash.py --run-vectors
  ```
- **Audit context:** [M1-SCOPE-AUDIT.md](../M1-SCOPE-AUDIT.md) §9 documents this requirement and the optional CI step.

---

## 7. Out of scope (M2+)

This doc defines the M1 consensus-critical surface only. Deferred to M2+: proof-hash in protocol package (if moved from SDK), additional test vector suites. **Multi-language reference** is provided (Python); further languages are optional. **Full M2+ list:** [M1-SCOPE-FREEZE.md](../M1-SCOPE-FREEZE.md).
