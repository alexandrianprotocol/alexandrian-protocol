# Demo: Smart Contract Security Audit with Attribution

**Scenario:** J (Attribution)
**Status:** Design complete, KBs pending creation
**Date:** 2026-03-08

---

## What This Demo Shows

A DeFi team is preparing to deploy an ERC-20 token to Base mainnet. They settle one composite audit KB (`KB-SEC-4`). That single transaction automatically distributes ETH to four different knowledge authors — three independent security researchers and one synthesizer — with no coordinator and no off-chain payment logic.

This demonstrates every layer of the Alexandrian Protocol in one coherent story:

| Layer | What it does in this demo |
|---|---|
| **Base** | Routes ETH through attribution DAG in a single `settleQuery` call |
| **IPFS** | Proves each KB's content is authentic and unmodified |
| **The Graph** | Makes lineage queryable — who built this knowledge, and how much has it earned |

---

## The Knowledge Chain

```
KB-SEC-1 (Wallet A) ──────┐
Reentrancy checklist       │
depth: 0, bps: 800         │
                           ├──→ KB-SEC-4 (Wallet D)
KB-SEC-2 (Wallet B) ───────┤    ERC-20 Deploy Gate
Integer safety checklist   │    depth: 1, bps: 300
depth: 0, bps: 800         │
                           │    When settled: ETH flows to A, B, C, D
KB-SEC-3 (Wallet C) ───────┘
Access control checklist
depth: 0, bps: 800
```

KB-SEC-4 is a synthesis. It does not duplicate its parents' content — it references them by step and depends on their outputs as inputs. When a consumer settles KB-SEC-4, the contract distributes royalties back through the lineage automatically.

---

## KB-SEC-1: Reentrancy — CEI Pattern Verification

```
kbHash:       (computed at publish time)
title:        "Reentrancy — Checks-Effects-Interactions Pattern Verification"
domain:       web3.security
kbType:       ComplianceChecklist
payloadType:  checklist
isSeed:       true
depth:        0
royaltyBps:   800
parentHashes: []
author:       Wallet A
```

**Checklist:**
1. Map every external call site in the contract (`.call()`, `.transfer()`, `.send()`, interface calls)
2. Verify CEI order at each site: state variables written before external call executes
3. Confirm `nonReentrant` modifier present on all public/external state-changing functions that make external calls
4. Check for cross-function reentrancy: two functions sharing state where one makes an external call
5. Test with a mock attacker contract that calls back on `receive()` or `fallback()`

**Verification:**
- Success: all 5 checks pass, no unguarded external calls found
- Failure: any external call precedes a state write, or `nonReentrant` missing on exposed functions
- Metrics: `unguarded_external_calls == 0`, `reentrancy_modifier_coverage == 1.0`

---

## KB-SEC-2: Integer Arithmetic Safety — Unchecked Blocks

```
kbHash:       (computed at publish time)
title:        "Integer Arithmetic Safety — Unchecked Blocks in Solidity 0.8+"
domain:       web3.security
kbType:       ComplianceChecklist
payloadType:  checklist
isSeed:       true
depth:        0
royaltyBps:   800
parentHashes: []
author:       Wallet B
```

**Checklist:**
1. Find all `unchecked { }` blocks in the contract; document the invariant each relies on
2. For each unchecked block, verify the invariant holds at every entry point before arithmetic executes
3. Run boundary tests at type limits: `uint256` max, `int256` min and max, zero
4. Check loop counters inside unchecked blocks for overflow conditions under max iterations
5. Confirm no user-controlled input reaches unchecked arithmetic without prior bounds validation

**Verification:**
- Success: every unchecked block has a documented and tested invariant; no user input reaches unchecked arithmetic unvalidated
- Failure: undocumented unchecked block, or boundary test reveals overflow
- Metrics: `unchecked_blocks_with_documented_invariant / total_unchecked_blocks == 1.0`

---

## KB-SEC-3: Role-Based Access Control — Ownable and AccessControl Audit

```
kbHash:       (computed at publish time)
title:        "Role-Based Access Control — Ownable and AccessControl Audit"
domain:       web3.security
kbType:       ComplianceChecklist
payloadType:  checklist
isSeed:       true
depth:        0
royaltyBps:   800
parentHashes: []
author:       Wallet C
```

**Checklist:**
1. Enumerate all privileged functions: `onlyOwner`, `onlyRole`, custom modifiers
2. Verify two-step ownership transfer pattern (`transferOwnership` + `acceptOwnership`) is in place
3. Confirm `renounceOwnership` cannot leave the contract in a permanently uncontrollable state
4. Check that `DEFAULT_ADMIN_ROLE` is revoked from deployer address after initialization completes
5. Verify every role assignment and revocation is gated: no function promotes roles without timelock or multisig
6. Test role state under all deployment and upgrade paths

**Verification:**
- Success: all 6 checks pass; no deployer retains elevated privilege post-init
- Failure: deployer holds `DEFAULT_ADMIN_ROLE` post-deploy, or ownership transfer is single-step
- Metrics: `privileged_functions_with_explicit_role_check == 1.0`, `admin_role_on_deployer_post_init == false`

---

## KB-SEC-4: ERC-20 Mainnet Deploy Security Gate (Derived)

```
kbHash:       (computed at publish time)
title:        "ERC-20 Mainnet Deploy Security Gate"
domain:       web3.security
kbType:       ComplianceChecklist
payloadType:  checklist
isSeed:       false
depth:        1
royaltyBps:   300
parentHashes: [KB-SEC-1.kbHash, KB-SEC-2.kbHash, KB-SEC-3.kbHash]
author:       Wallet D
```

This KB is a synthesis. Its steps do not repeat the parent checklists — they reference them as required inputs and gate final authorization on all three clearances.

**Checklist (composite gate):**
1. Run reentrancy audit per KB-SEC-1. Collect `reentrancy_clearance` artifact.
2. Run integer safety audit per KB-SEC-2. Collect `overflow_clearance` artifact.
3. Run access control audit per KB-SEC-3. Collect `rbac_clearance` artifact.
4. Confirm contract bytecode on testnet matches the audited source (verify compiler output, optimizer settings, constructor args).
5. Verify all three clearance artifacts are present and signed before signing the mainnet deploy transaction.

**Verification:**
- Success: `deploy_authorization` issued only when `reentrancy_clearance AND overflow_clearance AND rbac_clearance` all present
- Failure: any clearance absent → deployment blocked; deploy tx signed without all clearances → critical violation
- Metrics: `clearance_count == 3`, `time_to_full_clearance ≤ 4h`

**artifactRefs:**
```json
[{
  "uri":  "ipfs://PENDING",
  "name": "smart_contract_security_patterns",
  "type": "patterns_reference"
}]
```

---

## Attribution Flow

When a DeFi team calls `settleQuery(KB-SEC-4.kbHash)` with `0.001 ETH`:

```
Incoming:  0.001000 ETH

Protocol fee (2%):           0.000020 ETH  →  treasury

Remaining: 0.000980 ETH distributed by attribution DAG

  Total royaltyBps in DAG:
    KB-SEC-4 (Wallet D):  300
    KB-SEC-1 (Wallet A):  800
    KB-SEC-2 (Wallet B):  800
    KB-SEC-3 (Wallet C):  800
    TOTAL:               2700 bps

  Wallet D  (300 / 2700):  0.000109 ETH  →  KB-SEC-4 author
  Wallet A  (800 / 2700):  0.000290 ETH  →  KB-SEC-1 author (reentrancy)
  Wallet B  (800 / 2700):  0.000290 ETH  →  KB-SEC-2 author (integer safety)
  Wallet C  (800 / 2700):  0.000290 ETH  →  KB-SEC-3 author (access control)
```

One transaction. Four recipients. No coordinator. On-chain and auditable on Basescan.

---

## IPFS Bundle Structure

```
ipfs/
├── kb-sec-1/
│   ├── artifact.json    checklist payload, parentHashes: [], royaltyBps: 800
│   ├── manifest.json
│   └── meta.json
├── kb-sec-2/
│   ├── artifact.json    checklist payload, parentHashes: [], royaltyBps: 800
│   ├── manifest.json
│   └── meta.json
├── kb-sec-3/
│   ├── artifact.json    checklist payload, parentHashes: [], royaltyBps: 800
│   ├── manifest.json
│   └── meta.json
└── kb-sec-4/
    ├── artifact.json    checklist payload, parentHashes: [sec-1, sec-2, sec-3], royaltyBps: 300
    ├── manifest.json
    └── meta.json

packages/generator/artifacts/
└── smart_contract_security_patterns.json    Type B reference artifact
```

---

## Demo Script (Three-Layer)

### Step 1 — Discover via The Graph

```graphql
{
  kbs(where: { domain: "web3.security", lineageDepth: 1 }) {
    kbHash
    title
    lineageDepth
    settlementVolume
    parents {
      kbHash
      title
      author
      settlementVolume
    }
  }
}
```

Returns KB-SEC-4 with its three parents visible. Lineage is queryable, deterministic, no central resolver.

### Step 2 — Settle on Base Mainnet

```js
const tx = await contract.settleQuery(
  KB_SEC_4_HASH,
  payerAddress,
  { value: ethers.parseEther("0.001") }
)
await tx.wait()
// Basescan shows 4 Transfer events: D, A, B, C each receive ETH
```

### Step 3 — Verify via IPFS

```bash
# Fetch artifact from IPFS
curl https://ipfs.io/ipfs/{KB_SEC_4_ROOT_CID}/artifact.json -o artifact.json

# Compute hash
node -e "
  const { keccak256 } = require('ethers');
  const fs = require('fs');
  const bytes = fs.readFileSync('artifact.json');
  console.log(keccak256(bytes));
"

# Compare against on-chain commitment
# pnpm run ipfs:verify --cid {rootCid} --expected {artifactHash}
# → { result: "verified" }
```

### Step 4 — Query Lineage Earnings

```graphql
{
  kb(id: "kb-sec-4-hash-lowercase") {
    parents {
      kbHash
      title
      settlementVolume
      uniquePayerCount
    }
  }
}
```

KB-SEC-1, 2, and 3 each accumulate `settlementVolume` passively every time KB-SEC-4 is used. Security researchers earn from their work without being in the loop.

---

## Reference Artifact: smart_contract_security_patterns

A single Type B artifact cited by all four KBs. Generated content covers:

- **Invariants:** CEI ordering, access control separation, arithmetic safety
- **Patterns:** reentrancy guard, two-step ownership, unchecked invariant documentation
- **Checklists:** pre-deploy audit gate, post-deploy verification
- **Anti-patterns:** single-step ownership transfer, deployer admin retention, unguarded loops
- **References:** SWC Registry, OpenZeppelin security guidelines, Trail of Bits public audits

---

## Build Checklist

- [ ] `ipfs/kb-sec-1/artifact.json` — KB-SEC-1 content
- [ ] `ipfs/kb-sec-1/manifest.json`
- [ ] `ipfs/kb-sec-1/meta.json`
- [ ] `ipfs/kb-sec-2/artifact.json` — KB-SEC-2 content
- [ ] `ipfs/kb-sec-2/manifest.json`
- [ ] `ipfs/kb-sec-2/meta.json`
- [ ] `ipfs/kb-sec-3/artifact.json` — KB-SEC-3 content
- [ ] `ipfs/kb-sec-3/manifest.json`
- [ ] `ipfs/kb-sec-3/meta.json`
- [ ] `ipfs/kb-sec-4/artifact.json` — KB-SEC-4 with parentHashes populated
- [ ] `ipfs/kb-sec-4/manifest.json`
- [ ] `ipfs/kb-sec-4/meta.json`
- [ ] `packages/generator/artifacts/smart_contract_security_patterns.json` — Type B reference
- [ ] Pin all four bundles to IPFS → populate rootCid in each manifest.json
- [ ] Compute keccak256(artifact.json) for each → populate artifactHash
- [ ] Publish KB-SEC-1, 2, 3 to Base (roots first)
- [ ] Publish KB-SEC-4 to Base with populated parentHashes
- [ ] Verify attribution: run `settleQuery(KB-SEC-4)`, confirm 4 wallet receipts on Basescan
- [ ] Verify IPFS: `pnpm run ipfs:verify` positive + negative vectors for each KB
