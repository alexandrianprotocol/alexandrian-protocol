# KB-F IPFS Artifact Specification

## Purpose

KB-F demonstrates the complete three-layer binding of the Alexandrian Protocol:

- **Layer 1 — Identity (Base mainnet):** `kbHash` and `CIDv1` stored on-chain in `AlexandrianRegistryV2`
- **Layer 2 — Artifact Storage (IPFS):** Full artifact package pinned and retrievable by CID
- **Layer 3 — Verification:** `keccak256(fetched bytes) == artifactHash` — provable by any party

## Canonical Hash Target

`artifact.json` is the canonical hash target for artifact integrity checks.

Verification rule:

```text
keccak256(artifact.json bytes) == kb-record.artifactHash
```

Pointer integrity requirements:

- `artifact.json.components.payload` MUST point to a file in the package.
- The payload path MUST be listed in `manifest.json`.
- `artifact.json.payloadHash` MUST equal `keccak256(payload bytes)`.

## KB-F Key Values

| Key | Value |
|-----|-------|
| **kbHash** | `0x83a6aad11d39584998f3f34fa45343d04a9e37062b3b603fc989e71d63871a0a` |
| **artifactHash** | `0x64e56a4e08dd7931ae37ab118b8ef1fa32969eb0da108011e08f14d7aa4a5e00` |
| **IPFS CID (rootCid)** | `bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y` |
| **curator** | `0x370750Dad9cC8e62C9b95A66dB6F3204DE056a73` |
| **registry** | `0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000` (Base mainnet) |
| **publishTx** | `0x4afd4de47dbb47bdb9f5871f2e7fa9180ae93acce988a3221cb31b79c6f257de` |
| **domain** | `meta.alexandria` |
| **network** | Base Mainnet (chainId 8453) |

## Verification Chain

```
artifact.json (434 bytes)
        │
        ▼
keccak256(bytes)
        │
        ▼
artifactHash = 0x64e56a4e…a5e00
        │
        ▼
canonical envelope  ←── type, domain, tier, sources, artifactHash
        │
        ▼
keccak256("KB_V1" + JCS(normalizeForHash(envelope)))
        │
        ▼
kbHash = 0x83a6aad…871a0a        CID = bafybei…sk57y
        │                                  │
        └──────────────┬───────────────────┘
                       ▼
        AlexandrianRegistryV2.publishKB()
        (Base Mainnet, block 42735184)
                       │
                       ▼
        IPFS gateway fetch → keccak256(fetched bytes)
                       │
                       ▼
             == artifactHash?   →   verdict: verified ✅
```

## Live Verification Result (2026-02-28)

End-to-end verification confirmed via `pnpm run ipfs:kb-f:onchain -- --gateway https://ipfs.io`:

| Field | Value |
|-------|-------|
| kbHash (on-chain) | `0x83a6aad11d39584998f3f34fa45343d04a9e37062b3b603fc989e71d63871a0a` |
| CID (on-chain) | `bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y` |
| curator | `0x370750Dad9cC8e62C9b95A66dB6F3204DE056a73` |
| domain | `meta.alexandria` |
| exists | `true` |
| artifactHash (expected) | `0x64e56a4e08dd7931ae37ab118b8ef1fa32969eb0da108011e08f14d7aa4a5e00` |
| artifactHash (IPFS-fetched) | `0x64e56a4e08dd7931ae37ab118b8ef1fa32969eb0da108011e08f14d7aa4a5e00` |
| bytes fetched | 434 |
| match | `true` |
| verdict | **`verified`** |
| gateway used | `https://ipfs.io` |
| fetch URL | `https://ipfs.io/ipfs/bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y/kb-f/artifact.json` |
| publish tx | `0x4afd4de47dbb47bdb9f5871f2e7fa9180ae93acce988a3221cb31b79c6f257de` |

Full verification output snapshot:

```json
{
  "environment": {
    "chainId": 8453,
    "registryAddress": "0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000",
    "rpcUrl": "https://mainnet.base.org"
  },
  "onChain": {
    "kbHash": "0x83a6aad11d39584998f3f34fa45343d04a9e37062b3b603fc989e71d63871a0a",
    "cid": "bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y",
    "curator": "0x370750Dad9cC8e62C9b95A66dB6F3204DE056a73",
    "domain": "meta.alexandria",
    "queryFeeWei": "0",
    "exists": true
  },
  "integrity": {
    "source": {
      "type": "cid",
      "cid": "bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y",
      "target": "kb-f/artifact.json",
      "via": "gateway:https://ipfs.io;url:https://ipfs.io/ipfs/bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y/kb-f/artifact.json"
    },
    "expectedArtifactHash": "0x64e56a4e08dd7931ae37ab118b8ef1fa32969eb0da108011e08f14d7aa4a5e00",
    "computedArtifactHash": "0x64e56a4e08dd7931ae37ab118b8ef1fa32969eb0da108011e08f14d7aa4a5e00",
    "bytes": 434,
    "match": true,
    "verdict": "verified"
  }
}
```

Full evidence: `evidence/verification-run.json`, `evidence/publish-mainnet.json`

## Package Contents

- `artifact.json` (hash target)
- `kb-record.json` (registry linkage)
- `manifest.json` (file map)
- `metadata.json` (descriptive)
- `docs/specification.md` (this document)
- `evidence/` (vectors, run outputs, logs)
- `evidence/publish-mainnet.json` (KB-F Base publish receipt + cost summary)
- `evidence/verification-run.json` (live verification run record)

## Mainnet Publication Record

KB-F publish evidence is recorded in `evidence/publish-mainnet.json`.

This file captures the finalized `kbHash`, publish transaction hash, block number,
gas used, and estimated max cost values printed by `scripts/publish-kb-f.mjs`.

## Acceptance

- Any party can run: `pnpm run ipfs:kb-f:onchain -- --gateway https://ipfs.io`
- Retrieved artifact bytes reproduce `artifactHash` — `verdict: "verified"`
- Package can be uploaded via `ipfs add -Qr ipfs/kb-f`
- Tamper vector fails verification (any byte mutation produces a different hash)
