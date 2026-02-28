# Base Mainnet — Addresses, Version Choice, and Deploy Guide

**Single source of truth for Base mainnet.** SDK and apps should pin chainId and addresses from this doc (or from the SDK constants that mirror it).

---

## Network

| Field | Value |
|-------|--------|
| Network name | Base |
| Chain ID | `8453` |
| Explorer | https://basescan.org |

---

## Contracts

| Contract | Address | Notes |
|----------|---------|--------|
| **AlexandrianRegistry (V2)** | `0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000` | Canonical mainnet registry. Deployed via `scripts/deploy-mainnet.cjs` from `packages/protocol` (AlexandrianRegistryV2). |
| **Owner** | `0x6939c3E5Fe823B1115Ece40948DF0fB99100465B` | Deployer EOA (no Safe). |

### Post-deploy integrity (latest deploy)

| Field | Value |
|-------|--------|
| Deployment Tx | `0xd35f0e44504860e206568a298e0692bb5212a474125a08cace3d1e430cd8c3c4` |
| Chain ID | 8453 |
| Block Number | 42593045 |
| Bytecode Hash | `0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470` |

---

## Subgraph

| Field | Value |
|-------|--------|
| **Subgraph query URL (mainnet)** | `https://api.studio.thegraph.com/query/1742359/alexandrian-protocol/version/latest` |

---

## SDK / app defaults

Pin these so clients use mainnet by default when appropriate:

- **Chain ID:** `8453`
- **Registry address:** *(same as AlexandrianRegistry V2 above)*
- **Explorer base URL:** `https://basescan.org`

The SDK exports these in `packages/sdk-adapters/lib/addresses.ts`; keep that file in sync with this doc after deploy.

---

## Checklist

- [x] Deploy AlexandrianRegistryV2 to Base mainnet.
- [x] Verify contract: Sourcify verified. Basescan: set `BASESCAN_API_KEY` and re-run verify if needed (Etherscan V2 migration may apply).
- [x] Deploy mainnet subgraph; set Subgraph query URL above (subgraph.yaml points at this contract; startBlock 42593045).
- [x] Update this file and `packages/sdk-adapters/lib/addresses.ts` with the deployed Registry address.
- [x] Publish this doc so reviewers and integrators see canonical addresses.

---

## Registry versions (V1 vs V2)

| Version | Contract | Location | Deploy script |
|--------|----------|----------|----------------|
| **V1** | `AlexandrianRegistry` (Registry.sol) | `packages/protocol/contracts/v1/Registry.sol` | None in repo (deploy manually or add a script). |
| **V2** | `AlexandrianRegistryV2` | `packages/protocol/contracts/AlexandrianRegistryV2.sol` | `packages/protocol/scripts/deploy-mainnet.cjs` |

**Current mainnet canonical:** V2 at `0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000` (above).

### Key differences (V1 vs V2)

| Aspect | V1 (Registry.sol) | V2 (AlexandrianRegistryV2.sol) |
|--------|--------------------|--------------------------------|
| **Payments** | Push-style (direct transfer on settle) or legacy flow | **Pull:** `pendingWithdrawals` + `withdrawEarnings()`; curator withdraws when ready. |
| **Observability** | Basic | `totalFeesEarned` per KB, `protocolFeeTotal`; better for dashboards and SDK. |
| **Lineage** | Parents / royalty DAG | Same; `MAX_PARENTS = 8` enforced. |
| **M2 (outcomes)** | `queryNonce`, `reportOutcome` in V1 | V2 may omit or simplify; check contract. |
| **Maturity** | Older; sometimes chosen for **stability** (less change, more time in prod). | Newer; **latest** features; canonical in this repo for mainnet. |

### When to choose V2 (latest — recommended)

- Want pull payments and curator `withdrawEarnings()`.
- Want on-chain `totalFeesEarned` / `protocolFeeTotal` for indexing and tooling.
- Aligns with this repo's **canonical** mainnet (deploy script, this doc, subgraph, SDK defaults all target V2).

### When to choose V1 (stability)

- Prefer a version that has been in production longer or has fewer moving parts.
- Willing to give up pull payments and some observability for fewer surprises.
- **Version control gotcha:** Repo's mainnet docs and SDK defaults point at V2. If you deploy or use V1 for mainnet, you must:
  - Update this doc with the V1 contract address.
  - Point `subgraph/subgraph.yaml` at the V1 contract (and use the V1 ABI/events).
  - Set `REGISTRY_ADDRESS_MAINNET` (or SDK `registryAddress`) to the V1 address so the SDK and scripts don't still talk to V2.

---

## Deploying to Base mainnet

### Deploying V2 (current script)

1. Set `ALLOW_MAINNET_DEPLOY=true` and required env (e.g. `BASE_MAINNET_RPC_URL`, `DEPLOYER_PRIVATE_KEY`) in `packages/protocol/.env`.
2. From `packages/protocol`:
   `npx hardhat run scripts/deploy-mainnet.cjs --network base-mainnet`
3. Update this doc, `deployments/AlexandrianRegistryV2.json`, subgraph `address` and `startBlock`, and SDK default (see checklist above).

### Deploying V1 (stability path)

1. There is **no dedicated V1 mainnet deploy script** in the repo. Options:
   - Add a script (e.g. `deploy-mainnet-v1.cjs`) that deploys `AlexandrianRegistry` (V1) and prints address/block, or
   - Deploy V1 manually (e.g. Hardhat console or a one-off script).
2. After deploy:
   - Update **this doc** with the V1 address and note that mainnet is on V1 for stability.
   - Update **subgraph** to use the V1 contract address and V1 ABI/events (subgraph may need different event handlers if V1 events differ).
   - Set **REGISTRY_ADDRESS_MAINNET** (and SDK/defaults) to the V1 address so all tooling points at the same registry.

---

## Version control checklist (avoid drift after any deploy)

After **any** mainnet deploy (V1 or V2), ensure:

- [ ] **This file** — Contract address and "canonical version" note (V1 vs V2).
- [ ] **packages/protocol/deployments/** — Deployment manifest (e.g. `AlexandrianRegistryV2.json` for V2) has correct address, tx, block.
- [ ] **subgraph/subgraph.yaml** — `source.address` and `startBlock` match the deployed contract; ABI/events match that version.
- [ ] **SDK / app default** — `packages/sdk-adapters/lib/addresses.ts` (or equivalent) or `REGISTRY_ADDRESS_MAINNET` points at the contract you intend to use.
- [ ] **Scripts** — Any script that hardcodes a registry address (e.g. m1-live-demo, publish-seeds-mainnet) uses the same address or reads from env/manifest.

---

## Quick reference

| Question | Answer |
|----------|--------|
| What does the current deploy script deploy? | **V2** (`AlexandrianRegistryV2`). |
| Where is "canonical mainnet" defined? | This file and `packages/protocol/deployments/AlexandrianRegistryV2.json`. |
| I chose V1 for stability; what do I update? | This doc (V1 address + note), subgraph (V1 address + ABI/events), SDK/defaults (V1 address). |

---

## Out of scope (M2+)

This doc is M1 (Base mainnet addresses, V1 vs V2, deploy steps). Multi-chain deployment, governance timelock, and M2 contract features are deferred to M2+. **Full list:** [M1-SCOPE-FREEZE.md](../M1-SCOPE-FREEZE.md).
