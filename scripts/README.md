### Alexandrian scripts

This folder contains the CLI utilities that power the **M1 verification surface**, IPFS demos, and architectural boundary checks. They are all designed to be run from the **repo root**.

#### Core verification

- **`verify.mjs`**  
  Grant M1 certification runner. Executes the full build + test matrix, optional IPFS/on‑chain verification for KB‑F, a dependency audit, and writes `certification/m1-report.json`.  
  - **Primary entrypoint:** `pnpm verify`

#### IPFS / KB

- **`compute-hash.mjs`**  
  Computes a `keccak256` hash for a given file (defaults to `ipfs/kb-d/artifact.json`) and prints either JSON metadata or the raw hash.  
  - Example: `node scripts/compute-hash.mjs --file ipfs/kb-d/artifact.json`
- **`verify-kb-artifact.mjs`**  
  Verifies that an artifact (from a local file or IPFS CID) matches an expected `artifactHash` and that any payload pointer is consistent with `manifest.json`.  
  - Example (local file):  
    `node scripts/verify-kb-artifact.mjs --file ipfs/kb-f/artifact.json --expected-hash <0x...>`  
  - Example (CID):  
    `node scripts/verify-kb-artifact.mjs --cid <cid> --expected-hash <0x...>`

#### Repository boundary checks

- **`check-boundaries.mjs`**  
  Lightweight structural linter. Fails if:
  - `packages/sdk-core` imports `sdk-adapters`, or
  - M1 production code imports from `m2/` or `experimental/` paths.  
  Run it from the repo root to enforce architecture rules locally:  
  - `node scripts/check-boundaries.mjs`

