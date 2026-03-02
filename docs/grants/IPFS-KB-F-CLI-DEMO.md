# IPFS KB-F CLI Demo

## Deterministic Artifact Binding Across Base + IPFS

KB-F demonstrates that Alexandrian composes on-chain knowledge identity (Base mainnet), content-addressed storage (IPFS), and deterministic integrity verification (keccak256) into a single verifiable knowledge primitive. No system is replaced. On-chain identity, IPFS storage, and local verification operate independently and compose cleanly.

## Document Map

| For | See |
|---|---|
| Protocol invariants KB-F satisfies | `protocol/INVARIANTS.md` |
| Full M1 verification suite | `VERIFY-M1.md` |
| Live deployment proof | `grants/LIVE-DEMO-ARTIFACT.md` |
| Canonical identity specification | `protocol/PROTOCOL-SPEC.md` |

---

## Architecture

### Layer 1 — On-Chain Identity (Base Mainnet)

- `kbHash` registered in `AlexandrianRegistryV2`
- Associated CID stored on-chain
- Publication transaction publicly verifiable on Basescan

### Layer 2 — Off-Chain Artifact Package (IPFS)

- Rich structured KB bundle
- Payload, documentation, evidence, metadata
- Content-addressed via CID

### Layer 3 — Deterministic Integrity Verification

- `artifactHash = keccak256(bytes(artifact.json))`
- Verification script recomputes hash independently
- Any tampering invalidates the identity match

Together, these layers demonstrate identity, integrity, and storage independence.

---

## Prerequisites

- Node.js 20.x
- pnpm 9.x + `pnpm install`
- `ipfs` CLI (optional — for local IPFS verification)
- Network access (optional — for live on-chain verification)
```bash
# Optional environment variables
set BASE_RPC_URL=https://mainnet.base.org
set IPFS_GATEWAY=https://ipfs.io
```

---

## Canonical KB-F Constants

These values are deterministic and used throughout the demo.

| Constant | Value |
|---|---|
| `kbHash` | `0x83a6aad11d39584998f3f34fa45343d04a9e37062b3b603fc989e71d63871a0a` |
| `artifactHash` | `0x64e56a4e08dd7931ae37ab118b8ef1fa32969eb0da108011e08f14d7aa4a5e00` |
| `rootCid` | `bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y` |
| `publishTx` | [`0x4afd4de47dbb47bdb9f5871f2e7fa9180ae93acce988a3221cb31b79c6f257de`](https://basescan.org/tx/0x4afd4de47dbb47bdb9f5871f2e7fa9180ae93acce988a3221cb31b79c6f257de) |

---

## Artifact Structure

Directory: `ipfs/kb-f/`
```
artifact.json              # canonical hash target — identity-binding
payload.json               # structured KB content
metadata.json              # descriptive metadata
manifest.json              # file map + root CID metadata
kb-record.json             # linkage to on-chain commitment
docs/specification.md      # procedural documentation
evidence/test-vectors.json
evidence/verification-run.json
evidence/publish-mainnet.json
evidence/logs.txt
```

> `artifact.json` is the canonical hash target used to compute `artifactHash`. All other files are expressive but not identity-binding. This separation keeps deterministic integrity independent of content richness.

---

## Demo Flow

The demo progresses through four proofs: identity → content → integrity → live verification.

### Proof 1 — On-Chain Commitment + IPFS Binding
```bash
cat ipfs/kb-f/kb-record.json
```

Confirms `kbHash`, `artifactHash`, `rootCid`, and `publishTx` in a single record. Knowledge identity is committed on Base, the on-chain record points to a specific IPFS root CID, and the artifact hash is immutable.

---

### Proof 2 — Rich Structured Content on IPFS
```bash
ipfs add -Qr ipfs/kb-f
ipfs ls <rootCid>
ipfs cat <rootCid>/kb-f/artifact.json > artifact.json
ipfs cat <rootCid>/kb-f/payload.json > payload.json
cat artifact.json
```

Confirms the CID resolves deterministically and the bundle includes docs, evidence, and metadata. The KB contains expressive structured content — not just a pointer. IPFS stores expressive content; identity is anchored independently.

---

### Proof 3 — Deterministic Integrity Enforcement

**Positive verification**
```bash
node scripts/compute-hash.mjs --file ipfs/kb-f/artifact.json

node scripts/verify-kb-artifact.mjs \
  --file ipfs/kb-f/artifact.json \
  --expected-hash 0x64e56a4e08dd7931ae37ab118b8ef1fa32969eb0da108011e08f14d7aa4a5e00
```

Expected output:
```json
{
  "match": true,
  "verdict": "verified"
}
```

**Tamper test**
```bash
copy ipfs\kb-f\artifact.json ipfs\kb-f\artifact.tampered.json
echo tamper>> ipfs\kb-f\artifact.tampered.json

node scripts/verify-kb-artifact.mjs \
  --file ipfs/kb-f/artifact.tampered.json \
  --expected-hash 0x64e56a4e08dd7931ae37ab118b8ef1fa32969eb0da108011e08f14d7aa4a5e00
```

Expected output:
```json
{
  "match": false,
  "verdict": "invalid"
}
```

Non-zero exit code on failure is CI-compatible. Identity is byte-level deterministic — artifact mutation breaks identity mechanically, not subjectively.

---

### Proof 4 — Live On-Chain Verification (Base Mainnet)
```bash
pnpm run ipfs:kb-f:onchain -- \
  --gateway https://ipfs.io \
  --target kb-f/artifact.json
```

This command connects to Base (`chainId 8453`), reads KB metadata from `AlexandrianRegistryV2`, resolves the CID from the on-chain record, fetches `artifact.json` from IPFS, recomputes `artifactHash`, and compares it against the on-chain commitment.

Expected output:
```json
{
  "match": true,
  "verdict": "verified"
}
```

On-chain identity, off-chain storage, independent verification. No trusted intermediary required.

---

## Acceptance Criteria

KB-F is considered valid if all of the following hold:

| Criteria | |
|---|---|
| Deterministic `ipfs/kb-f` bundle exists | ✓ |
| `artifact.json` is canonical hash target | ✓ |
| Root CID resolves via IPFS | ✓ |
| Structured content (payload, docs, evidence) is retrievable | ✓ |
| CLI verification returns machine-readable JSON | ✓ |
| Positive vector returns `verified` | ✓ |
| Tamper vector returns `invalid` | ✓ |
| Replay from clean clone reproduces identical `artifactHash` | ✓ |
