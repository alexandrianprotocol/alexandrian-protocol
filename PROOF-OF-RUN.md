# Grant M1 Proof Of Run

- **Commit:** `cccd4a295dce3fea7cb66c9cb4312a1d2dc07e02`
- **UTC Timestamp:** `2026-02-28T07:53:34Z`
- **Environment:**
  - Node: `v20.20.0`
  - pnpm: `9.0.0`
  - OS: Windows 11

## Command

```bash
pnpm verify
```

## Result

- **Status:** `PASS`
- **Duration:** 27.7s

## Check Summary

| Check | Result |
|-------|--------|
| build (protocol + sdk-core + sdk-adapters) | ✅ PASS |
| protocol contract tests (Hardhat) | ✅ PASS — 5/5 |
| conformance tests | ✅ PASS — 5/5 (2 files) |
| vitest (specification, invariants, demonstration, determinism, property, composition) | ✅ PASS — 244/244 (33 files) |
| IPFS KB-F onchain (three-layer binding) | ✅ PASS — verdict: verified, bytes: 434, match: true |

**Total: 254 tests passing. 0 failures.**

## KB-F Live Anchors (Base Mainnet)

| Field | Value |
|-------|-------|
| kbHash | `0x83a6aad11d39584998f3f34fa45343d04a9e37062b3b603fc989e71d63871a0a` |
| CID | `bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y` |
| publishTx | `0x4afd4de47dbb47bdb9f5871f2e7fa9180ae93acce988a3221cb31b79c6f257de` |
| registry | `0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000` (Base mainnet, chainId 8453) |
| artifactHash | `0x64e56a4e08dd7931ae37ab118b8ef1fa32969eb0da108011e08f14d7aa4a5e00` |
| bytes fetched | 434 |
| verdict | **verified** |

## Console Summary

```
==============================================
Alexandrian Grant M1 Verification: PASS
==============================================
Commit:   cccd4a295dce3fea7cb66c9cb4312a1d2dc07e02
Started:  2026-02-28T07:53:34.453Z
Finished: 2026-02-28T07:54:02.138Z
Duration: 27.7s
Checks:
  [PASS] build (protocol + sdk-core + sdk-adapters)
  [PASS] protocol contract tests (Hardhat)
  [PASS] conformance tests
  [PASS] vitest (specification, invariants, demonstration, determinism, property, composition)
  [----] IPFS KB-F onchain (three-layer binding): PASS (verdict: verified, bytes: 434, match: true)
==============================================
KB-F Anchors (Base Mainnet):
  kbHash:    0x83a6aad11d39584998f3f34fa45343d04a9e37062b3b603fc989e71d63871a0a
  CID:       bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y
  publishTx: 0x4afd4de47dbb47bdb9f5871f2e7fa9180ae93acce988a3221cb31b79c6f257de
  registry:  0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000 (Base mainnet)
==============================================
```

## Independent Verification

Any reviewer can independently verify KB-F:

```bash
pnpm install
pnpm run ipfs:kb-f:onchain -- --gateway https://ipfs.io
```

Or fetch directly:

```
https://ipfs.io/ipfs/bafybeiajbvsdiapsbbajz6ul5m5bsbpmm7wjjohrcrpu2g2fmhe3ysk57y/kb-f/artifact.json
```
