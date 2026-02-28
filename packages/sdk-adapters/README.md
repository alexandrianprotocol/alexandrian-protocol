# @alexandrian/sdk-adapters

TypeScript SDK for the Alexandrian Protocol — on-chain knowledge identity, royalty DAG, and query-fee settlement on Base.

**Contract**: `0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000` (Base mainnet, chainId 8453)

---

## Install

```bash
npm install @alexandrian/sdk-adapters ethers
# or
pnpm add @alexandrian/sdk-adapters ethers
```

Requires Node.js ≥ 18 and `ethers` v6 as a peer dependency.

---

## Quickstart (5 minutes)

### 1. Create a client

```typescript
import { createAlexandrianClient } from "@alexandrian/sdk-adapters";

// Async factory — validates chain ID before returning.
// Throws ValidationError("INVALID_CHAIN_ID") if the RPC is on the wrong network.
const sdk = await createAlexandrianClient({
  privateKey: process.env.PRIVATE_KEY!,   // hex, 0x-prefixed
  alchemyKey: process.env.ALCHEMY_KEY!,   // Alchemy API key for Base
  // chainId defaults to 8453 (Base mainnet)
  // registryAddress defaults to canonical mainnet address
});
```

For Base Sepolia (testnet):

```typescript
import { createAlexandrianClient, BASE_SEPOLIA_CHAIN_ID } from "@alexandrian/sdk-adapters";

const sdk = await createAlexandrianClient({
  privateKey: process.env.PRIVATE_KEY!,
  alchemyKey: process.env.ALCHEMY_KEY!,
  chainId: BASE_SEPOLIA_CHAIN_ID,           // 84532
  registryAddress: "0x<your-testnet-address>",
});
```

### 2. Publish a Knowledge Block

```typescript
import { parseEther } from "@alexandrian/sdk-adapters";
import { hashContent } from "@alexandrian/sdk-adapters";

// Canonical content hash — deterministic, key-order-independent
const contentHash = hashContent({
  title: "Exponential Backoff Pattern",
  body: "...",
  domain: "software.patterns",
});

const tx = await sdk.publish({
  contentHash,
  curator: "0xYourAddress",
  kbType: 0,            // Practice
  trustTier: 0,         // HumanStaked
  cid: "bafybeigdyrzt...",
  embeddingCid: "bafybeigdyrzt...",
  domain: "software.patterns",
  licenseType: "MIT",
  queryFee: parseEther("0.0001"),
  version: "1.0.0",
  parents: [],          // attribution links
  stake: parseEther("0.001"),  // minimum 0.001 ETH
});

console.log("Published:", tx.hash);
```

### 3. Settle a citation (pay query fee)

```typescript
const tx = await sdk.settleCitation(contentHash, "0xQuerierAddress");
console.log("Settled:", tx.hash);
```

### 4. Read KB state

```typescript
// Full KB record
const kb = await sdk.getKB(contentHash);
console.log(kb.curator, kb.queryFee, kb.domain);

// Stake, reputation, attribution DAG
const stake = await sdk.getStake(contentHash);
const rep   = await sdk.getReputation(contentHash);
const dag   = await sdk.getAttributionDAG(contentHash);
```

### 5. Verify a KB

```typescript
const result = await sdk.verify(contentHash);
console.log(result.verified);    // true if registered and not slashed
console.log(result.checks);      // { hashFormatOk, onChainExistence }
```

---

## Core exports

```typescript
// Client factory (recommended)
export { createAlexandrianClient } from "@alexandrian/sdk-adapters";

// Sync factories (no chain ID validation)
export { createBaseSDK, createBaseSepoliaSDK } from "@alexandrian/sdk-adapters";

// Deterministic hashing (no network required)
export { hashContent, hashText, canonicalizeContent } from "@alexandrian/sdk-adapters";

// Proof spec
export {
  buildProofSpecV1,
  computeProofHash,
  canonicalProofBytes,
  ALEXANDRIAN_PROOF_SPEC_VERSION,
} from "@alexandrian/sdk-adapters";

// Error taxonomy
export {
  AlexandrianError, ContractError, NetworkError,
  ValidationError, NotFoundError,
  ok, err, wrapError,
  type Result,
} from "@alexandrian/sdk-core";

// Chain constants
export { MAINNET_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID, MAINNET_REGISTRY_ADDRESS } from "@alexandrian/sdk-adapters";
```

---

## Error handling

All SDK errors are typed `AlexandrianError` subclasses with a `.code` property:

```typescript
import { ValidationError, ContractError, wrapError } from "@alexandrian/sdk-core";

try {
  await sdk.publish({ ... });
} catch (e) {
  const err = wrapError(e);
  switch (err.code) {
    case "ALREADY_PUBLISHED":  /* duplicate contentHash */ break;
    case "INSUFFICIENT_STAKE": /* increase stake */        break;
    case "INVALID_CHAIN_ID":   /* wrong network */         break;
    default:
      throw err;
  }
}
```

### Non-throwing Result wrappers

Public clients expose `*Result` companions that return `Result<T, AlexandrianError>`:

```typescript
const publish = await sdk.publishResult(block, { stake: parseEther("0.001") });
if (!publish.ok) {
  console.error(publish.error.code, publish.error.message);
} else {
  console.log(publish.value.identity.kbId);
}

const settled = await sdk.settleCitationResult(contentHash, "0xQuerierAddress");
if (settled.ok) console.log(settled.value.value.txHash);
```

| Code | Class | Trigger |
|------|-------|---------|
| `ALREADY_PUBLISHED` | `ContractError` | contentHash already registered |
| `INSUFFICIENT_STAKE` | `ContractError` | `msg.value < minStakeAmount` |
| `KB_NOT_REGISTERED` | `ContractError` | KB does not exist |
| `KB_IS_SLASHED` | `ContractError` | KB was slashed, ineligible for settlement |
| `TOO_MANY_PARENTS` | `ContractError` | > 8 attribution parents |
| `DUPLICATE_PARENT` | `ContractError` | Same parent listed twice |
| `INCORRECT_FEE` | `ContractError` | `msg.value ≠ kb.queryFee` |
| `NO_EARNINGS` | `ContractError` | No pending withdrawals |
| `INVALID_CHAIN_ID` | `ValidationError` | RPC chain mismatch |
| `NETWORK_ERROR` | `NetworkError` | RPC timeout / connection refused |
| `NOT_FOUND` | `NotFoundError` | Resource not found |
| `UNKNOWN` | `AlexandrianError` | Unexpected error |

---

## Proof spec

Every on-chain KB state produces a deterministic, verifiable proof:

```typescript
import { buildProofSpecV1, computeProofHash } from "@alexandrian/sdk-adapters";

const proof = buildProofSpecV1({
  chainId: "8453",
  contract: "0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000",
  kbId: contentHash,
  blockNumber: "12345678",
  state: { totalFeesEarned: "1000000000000000", lastSettledAt: "1700000000" },
});

const hash = computeProofHash(proof);
// Embed `hash` in agent responses — recipients can verify independently.
```

---

## Architecture

```
@alexandrian/sdk-adapters   ← this package (product surface)
  └─ @alexandrian/sdk-core  ← infra primitives (errors, adapters, types)
       └─ @alexandrian/protocol ← canonical schema, invariants, virtual registry
```

See [`packages/protocol/docs/STORAGE-LAYOUT.md`](../protocol/docs/STORAGE-LAYOUT.md) for the contract's storage slot layout.

---

## Development

```bash
pnpm build          # dual ESM + CJS via tsup
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run
```
