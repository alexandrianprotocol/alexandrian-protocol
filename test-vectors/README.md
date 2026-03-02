## Test Vectors

This folder contains canonical test vectors used to validate implementations of the Alexandrian Protocol.

- `v1/` — legacy Core v1 vectors (envelopes and proofs) used by the conformance suite.
- `canonical/` — current canonical envelope and DAG vectors referenced by `docs/protocol/PROTOCOL-SPEC.md` and `docs/protocol/CONSENSUS-CRITICAL.md`.

To run the conformance tests against these vectors:

1. Install dependencies from the repo root: `pnpm install`.
2. Run the conformance package tests: `pnpm --filter @alexandrian/conformance test`.

