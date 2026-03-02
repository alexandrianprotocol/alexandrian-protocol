## Protocol Documentation

This folder contains the **consensus‑critical** and formal specifications for the Alexandrian Protocol.

- `PROTOCOL-SPEC.md` — canonical protocol specification (behavior, envelope, lineage, economics).
- `INVARIANTS.md` — formally stated invariants (INV‑1 …) that all implementations must satisfy.
- `CONSENSUS-CRITICAL.md` — frozen canonicalization and hashing surface.
- `CANONICAL-ENVELOPE-SPEC.md` and `SERIALIZATION-TEST-VECTORS.md` — envelope structure and golden vectors.
- `MERKLE-PROOF-SPEC.md` and related docs — proof and Merkle‑proof formats.

To validate an implementation against this spec:

1. Run `pnpm test:spec` from the repo root to exercise canonicalization and invariants.
2. Use the vectors under `test-vectors/canonical/` and the conformance suite in `packages/conformance/`.

