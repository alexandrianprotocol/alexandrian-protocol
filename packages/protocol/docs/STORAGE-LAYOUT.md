# AlexandrianRegistryV2 — Storage Layout

> **Purpose**: Upgrade-safety reference for auditors and future maintainers.
> This contract is **not upgradeable** (no proxy pattern). This document exists to aid
> auditors, support potential future proxy migrations, and document naming collisions.

---

## Inheritance Chain

```
AlexandrianRegistryV2
  ├── Ownable        (OpenZeppelin v5 — ERC-7201 namespaced storage)
  ├── ReentrancyGuard (OpenZeppelin v5 — ERC-7201 namespaced storage)
  └── IERC2981       (interface, no storage)
```

**OpenZeppelin v5 note**: Both `Ownable` and `ReentrancyGuard` use ERC-7201 namespaced
storage (computed via `keccak256(...) - 1`). They do **not** occupy sequential storage
slots in the contract's layout — their storage sits at cryptographically determined
positions. The contract's own variables therefore start at **slot 0**.

| Parent           | Storage position (ERC-7201)                                                  |
|------------------|-----------------------------------------------------------------------------|
| `Ownable`        | `keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Ownable")) - 1)) & ~bytes32(uint256(0xff))` |
| `ReentrancyGuard`| `keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))` |

---

## Contract Storage Slots

> Mappings occupy exactly one slot (the root slot) whose value is always zero on-chain;
> the actual key–value pairs live at `keccak256(key ‖ slotNumber)`.
> Dynamic arrays store their length at the root slot and their elements at
> `keccak256(slotNumber) + index`.

### Existing Asset System (unchanged from v1)

| Slot | Variable | Type | Notes |
|------|----------|------|-------|
| `0`  | `assets` | `mapping(bytes32 => Asset)` | Asset struct: fingerprint, cid, creator, timestamp, blockNumber, license, parents[], active |
| `1`  | `creatorAssets` | `mapping(address => bytes32[])` | All asset IDs per creator |
| `2`  | `provenanceGraph` | `mapping(bytes32 => Provenance[])` | Derivation history per asset |

### V1 — Knowledge Blocks

| Slot | Variable | Type | Notes |
|------|----------|------|-------|
| `3`  | `knowledgeBlocks` | `mapping(bytes32 => KnowledgeBlock)` | Core KB record; `.exists` is the canonical existence flag |
| `4`  | `attributionDAG` | `mapping(bytes32 => AttributionLink[])` | Royalty DAG edges (up to `MAX_PARENTS = 8`) |
| `5`  | `stakes` | `mapping(bytes32 => StakeRecord)` | amount, lockedUntil, slashed |
| `6`  | `reputation` | `mapping(bytes32 => ReputationRecord)` | queryVolume, endorsements, score (0–1000), lastUpdated |
| `7`  | `curatorBlocks` | `mapping(address => bytes32[])` | KB index by curator |
| `8`  | `blocksByType` | `mapping(uint8 => bytes32[])` | KB index by `KBType` enum (6 types) |
| `9`  | `blocksByDomain` | `mapping(bytes32 => bytes32[])` | KB index; key = `keccak256(bytes(domain))` |
| `10` | `derivedBlocks` | `mapping(bytes32 => bytes32[])` | Children for each parent KB |
| `11` | `protocolFeesBps` | `uint256` | Default: 200 (2%). Max: 1000 |
| `12` | `slashRateBps` | `uint256` | Default: 1000 (10%). Max: 5000 |
| `13` | `minStakeAmount` | `uint256` | Default: 1e15 wei (0.001 ETH) |
| `14` | `treasuryBalance` | `uint256` | Accumulated protocol fees + slash proceeds |

> `MAX_PARENTS = 8` is a **constant** — it is inlined by the compiler and occupies no slot.

### V2 — Observability & Pull Payments

| Slot | Variable | Type | Notes |
|------|----------|------|-------|
| `15` | `totalFeesEarned` | `mapping(bytes32 => uint256)` | Lifetime distributable fees per KB |
| `16` | `protocolFeeTotal` | `uint256` | Lifetime protocol fee across all settlements |
| `17` | `pendingWithdrawals` | `mapping(address => uint256)` | Accrued pull-payment balance per address |

### V2 — Query Identity

| Slot | Variable | Type | Notes |
|------|----------|------|-------|
| `18` | `queryNonce` | `mapping(bytes32 => uint64)` | Monotonic query counter per KB |
| `19` | `querierOf` | `mapping(bytes32 => mapping(uint64 => address))` | `(contentHash, nonce) → querier`; double-mapping root |
| `20` | `identityChain` | `mapping(bytes32 => bytes32)` | Agent identity succession: previousId → newId |

### V2 — Circuit Breaker

| Slot | Variable | Type | Notes |
|------|----------|------|-------|
| `21` | `paused` | `bool` | 1 byte; remaining 31 bytes of slot `21` are unused |

---

## Struct Layouts

### `KnowledgeBlock` (stored at `keccak256(contentHash ‖ 3)`)

| Field | Type | Bytes |
|-------|------|-------|
| `curator` | `address` | 20 |
| `kbType` | `KBType` (uint8) | 1 |
| `trustTier` | `TrustTier` (uint8) | 1 |
| `cid` | `string` | dynamic |
| `embeddingCid` | `string` | dynamic |
| `domain` | `string` | dynamic |
| `licenseType` | `string` | dynamic |
| `queryFee` | `uint256` | 32 |
| `timestamp` | `uint256` | 32 |
| `version` | `string` | dynamic |
| `exists` | `bool` | 1 |

> Solidity packs `curator` (20 bytes) + `kbType` (1 byte) + `trustTier` (1 byte) into one 32-byte slot.
> `exists` is packed into the slot with preceding non-dynamic fields if alignment allows.

### `StakeRecord` (stored at `keccak256(contentHash ‖ 5)`)

| Field | Type | Slot offset |
|-------|------|-------------|
| `amount` | `uint256` | +0 |
| `lockedUntil` | `uint256` | +1 |
| `slashed` | `bool` | +2 (1 byte in a 32-byte slot) |

### `ReputationRecord` (stored at `keccak256(contentHash ‖ 6)`)

| Field | Type | Bytes |
|-------|------|-------|
| `queryVolume` | `uint32` | 4 |
| `endorsements` | `uint32` | 4 |
| `score` | `uint16` | 2 |
| `lastUpdated` | `uint256` | 32 (forces new slot) |

> `queryVolume`, `endorsements`, and `score` are packed into one slot (10 bytes used, 22 unused).
> `lastUpdated` is a `uint256` and takes the next full slot.

### `AttributionLink` (array element at `keccak256(keccak256(contentHash ‖ 4)) + index`)

| Field | Type | Bytes |
|-------|------|-------|
| `parentHash` | `bytes32` | 32 |
| `royaltyShareBps` | `uint16` | 2 |
| `relationship` | `bytes4` | 4 |

> `parentHash` occupies one full slot. `royaltyShareBps` (2) + `relationship` (4) = 6 bytes packed into the next slot.

---

## Mapping Key Derivation

| Mapping | Key computation |
|---------|----------------|
| `assets[assetId]` | `keccak256(assetId ‖ 0)` |
| `knowledgeBlocks[contentHash]` | `keccak256(contentHash ‖ 3)` |
| `attributionDAG[contentHash]` | length at `keccak256(contentHash ‖ 4)`, elements at `keccak256(keccak256(contentHash ‖ 4)) + i` |
| `blocksByDomain[keccak256(domain)]` | `keccak256(keccak256(bytes(domain)) ‖ 9)` |
| `querierOf[contentHash][nonce]` | `keccak256(uint64(nonce) ‖ keccak256(contentHash ‖ 19))` |

---

## Upgrade Safety Notes

1. **This contract is not upgradeable.** There is no proxy; it was deployed as the final implementation.
2. **If a future proxy migration is required**, all existing slots must be preserved in order. New variables must be appended after slot `21`.
3. **Do not reorder or remove** variables. Solidity does not repack on recompile.
4. **ERC-7201 OZ slots** are at fixed cryptographic offsets independent of this layout. They will not conflict with slots 0–21.
5. **Gap variable recommendation**: If a proxy pattern is ever adopted, insert a `uint256[28] private __gap;` after `paused` (slot 21) to reserve 28 slots for future state, bringing the first available future slot to `50`.

---

## Verification

Run Hardhat's storage layout inspection to verify these slot numbers:

```bash
cd packages/protocol
# Add `storageLayout: true` to hardhat.config.cjs outputSelection, then:
npx hardhat compile
# The compiler outputs storageLayout in artifacts/build-info/*.json
```

Or use the `hardhat-storage-layout` plugin:
```bash
npx hardhat check
```
