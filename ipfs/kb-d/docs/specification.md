# KB-D IPFS Artifact Specification

## Purpose

KB-D demonstrates a two-layer model:

- On-chain KB: minimal commitment (`artifactHash`, `rootCid`, `version`)
- IPFS artifact: rich, human-readable and machine-verifiable package

This preserves deterministic identity while moving expressive content off-chain.

## Canonical Hash Target

The canonical integrity target is `artifact.json`.

Verification rule:

```text
keccak256(artifact.json bytes) == KB.artifactHash
```

Any byte-level change in `artifact.json` must invalidate verification.

## Package Contents

- `artifact.json`: canonical hash target
- `metadata.json`: descriptive metadata (not the hash target)
- `evidence/`: reproducibility files and run logs
- `docs/specification.md`: human-readable procedure
- `manifest.json`: root CID + file map for replay and audit

## Demo Procedure

1. Read KB commitment from `kb-record.json`.
2. Fetch `artifact.json` from IPFS using `rootCid`.
3. Compute `keccak256` of bytes.
4. Compare with `artifactHash`.
5. Run negative tamper vector and confirm rejection.

## Acceptance Criteria

- Deterministic package exists under `ipfs/kb-d/`
- `artifact.json` is the canonical hash target
- Verification CLI returns machine-readable JSON
- Positive vector returns `verified`
- Negative vector returns `invalid`
- Output is reproducible from a clean clone
