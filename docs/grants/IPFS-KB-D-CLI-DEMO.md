# IPFS KB-D CLI Demo

## Architecture

Alexandrian uses a two-layer model:

- Layer 1 (on-chain KB): commitment fields only (`artifactHash`, `rootCid`, `version`)
- Layer 2 (IPFS): rich artifact package (docs, evidence, metadata)

The bridge is deterministic byte-level verification:

```text
keccak256(downloaded_bytes) == artifactHash
```

## KB-D Artifact Schema

`ipfs/kb-d/` contains:

- `artifact.json` (canonical hash target)
- `metadata.json` (descriptive metadata)
- `evidence/test-vectors.json` (positive and negative vectors)
- `evidence/verification-run.json` (machine-readable run result)
- `evidence/logs.txt` (operator run notes)
- `docs/specification.md` (human-readable procedure)
- `manifest.json` (git/root CID/file map)
- `kb-record.json` (on-chain commitment model)

## CLI Demo Flow

### Proof 1 — KB commitment is minimal, IPFS artifact is expressive

```bash
cat ipfs/kb-d/kb-record.json
pnpm run ipfs:kb-d:utility
```

Expected:
- `kb-record.json` shows only commitment fields (`artifactHash`, `rootCid`, `version`)
- utility output shows byte size comparison (`kb-record.json` vs full `ipfs/kb-d/` package)

### Proof 2 — Rich structured content on IPFS

```bash
ipfs add -Qr ipfs/kb-d
ipfs cat <rootCid>/artifact.json > artifact.json
ipfs ls <rootCid>
cat artifact.json
```

Expected:
- directory contains `artifact.json`, `metadata.json`, `docs/`, `evidence/`, `manifest.json`
- `docs/specification.md` and evidence files are retrievable

### Proof 3 — Integrity enforcement

```bash
pnpm run ipfs:kb-d:hash
pnpm run ipfs:kb-d:verify:file
```

CID-bound verification:

```bash
node scripts/verify-kb-artifact.mjs --cid <rootCid> --expected-hash 0x23a62a34315b12e04aa5fc42954b850b63bba44669f8cff73f090434cfd219e3
```

Machine-readable output:

```json
{
  "match": true,
  "verdict": "verified"
}
```

Tamper test:

```bash
copy ipfs\kb-d\artifact.json ipfs\kb-d\artifact.tampered.json
echo tamper>> ipfs\kb-d\artifact.tampered.json
node scripts/verify-kb-artifact.mjs --file ipfs/kb-d/artifact.tampered.json --expected-hash 0x23a62a34315b12e04aa5fc42954b850b63bba44669f8cff73f090434cfd219e3
```

Expected:

```json
{
  "match": false,
  "verdict": "invalid"
}
```

### Proof 4 — Content addressing

```bash
ipfs add ipfs/kb-d/artifact.json
```

Expected:
- modifying bytes changes CID
- unchanged bytes keep deterministic hash verification against `artifactHash`

## Live On-Chain Check (Base Mainnet)

Set RPC:

```bash
set BASE_RPC_URL=https://mainnet.base.org
```

Run:

```bash
pnpm run ipfs:kb-d:onchain
```

What this command does:
- resolves KB-D `kbHash` from the publish tx (`0x83233e...a7050c`) if no hash is provided,
- fetches live KB commitment from `AlexandrianRegistryV2` on Base (`chainId 8453`),
- reads on-chain `cid` and metadata from `getKnowledgeBlock(kbHash)`,
- optionally verifies CID bytes against expected artifact hash.

Important:
- V2 stores `kbHash` (contentHash) + `cid` on-chain.
- `artifactHash` comparison remains an off-chain deterministic check over fetched bytes.

## Acceptance Criteria

- Deterministic `ipfs/kb-d` bundle exists in repo
- `artifact.json` is the hash target used for `artifactHash`
- Root CID can be generated via `ipfs add -Qr ipfs/kb-d`
- Demo visibly shows KB-vs-artifact size/expressiveness gap
- Verification CLI returns machine-readable JSON
- Positive vector returns `verified`
- Tamper vector returns `invalid`
- Replay from clean clone reproduces the same artifact hash
