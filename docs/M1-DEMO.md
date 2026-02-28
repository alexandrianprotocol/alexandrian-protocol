```yaml
document:
  id: DEMO-001
  version: 1.0.0
  owner: protocol-team
  status: stable
  classification: public
  last_reviewed: "2026-02-27"
  schema_version: "1.0"
  depends_on: [PROTO-001, CERT-001]
```

# Core Demonstration — Alexandrian Protocol M1

**The Core Question:** *"If I'm a developer who just discovered the Alexandrian Protocol, what can I do in 5 minutes that I couldn't do before?"*

Everything in this demo answers that question.

---

## Narrative Arc

| Step | Theme | What you see |
|------|--------|---------------|
| 1 | **Problem** | Content on the internet has no trustless identity. |
| 2 | **Primitive** | Knowledge Blocks give content a permanent on-chain identity. |
| 3 | **Lineage** | Derived knowledge carries its ancestry immutably. |
| 4 | **Economics** | Queries trigger trustless royalty settlement. |
| 5 | **DX** | Developers access all of this in a few lines of TypeScript. |
| 6 | **Verification** | Everything above is reproducible: `pnpm verify:m1` |

---

## User-Facing Values Demonstrated

### 1. Verifiable Content Identity

**The "aha" moment:** Take a piece of content — code, documentation, a research note — and show that it has a **permanent, tamper-evident identity** on Base mainnet. Not just a hash stored somewhere. An **on-chain identity** that anyone can verify independently.

- Register a Knowledge Block with real content.
- Retrieve it from the registry using only the content hash.
- Modify the content slightly — the identity changes completely.
- The original still resolves correctly on-chain.

**Why it matters:** This is software provenance. *"This exact function, at this exact version, was attested at block N."*

### 2. Lineage Is Trustless

**The "aha" moment:** Derived knowledge carries its **full ancestry on-chain**. A KB that cites three sources makes that citation immutable — no one can retroactively change what it was built on.

- Register a parent KB.
- Register a derived KB that cites it.
- Attempt to register a KB with a fake/nonexistent parent → **rejection**.
- Attempt to create a cycle → **CYCLE_DETECTED**.
- Resolve the full lineage graph of the derived KB.

**Why it matters:** In AI-generated content and code, provenance is everything. Verifiable intellectual lineage for the open web.

### 3. Determinism Across Contexts

**The "aha" moment:** Same content registered by two different people, on two different machines, produces the **same kbId**. This isn't a UUID or a timestamp-dependent ID — it's **content-addressed**.

- Run the same registration in Node.js and in the browser → identical `kbHash`.
- Order of source fields in the raw JSON doesn't matter — canonical serialization normalizes it.
- Whitespace differences don't affect identity.

**Why it matters:** Developers can compute the kbId **locally** before ever touching the chain. Offline-first verification.

### 4. Settlement Is Trustless

**The "aha" moment:** A query triggers **automatic royalty distribution** to all contributors in the lineage. No one has to trust anyone. No platform takes a cut. No one can block payment.

- Submit a query against a KB.
- Report the outcome.
- Claimable balances updated for the attester.
- Pull payment claim working.
- Double-claim → rejection.

**Why it matters:** This is the economic primitive. The protocol has a self-sustaining incentive structure — not just a data store.

### 5. Developer Ergonomics

**The "aha" moment:** The SDK makes all of the above feel like any other npm library.

- `npm install @alexandrian/sdk-core` cold start.
- Five lines of code to verify a Knowledge Block.
- Typed errors — wrong inputs fail with descriptive errors, not raw contract reverts.
- TypeScript autocomplete.

**Why it matters:** The "developer tooling" angle. The protocol could be perfect but if the DX is painful, adoption won't happen.

---

## Runnable Demo — Offline (No Chain Required)

Run the full walkthrough with human-readable output:

```bash
pnpm run demo:m1
```

Or run the M1 test suite (same guarantees, test output):

```bash
pnpm exec vitest run tests/demonstration/m1-demo.test.ts
```

Full verification (build + audit + all M1 tests including demo):

```bash
pnpm verify:m1
```

---

## Code Walkthrough (Runnable Blocks)

The following blocks mirror what `pnpm run demo:m1` runs. Use `@alexandrian/protocol` after `pnpm run build:m1`.

### 1. Create and register a Knowledge Block

```typescript
import {
  VirtualRegistry,
  kbHashFromEnvelope,
  sortSources,
} from "@alexandrian/protocol/core";

const registry = new VirtualRegistry();
const content = {
  type: "practice" as const,
  domain: "demo",
  sources: [] as string[],
  payload: {
    type: "practice" as const,
    rationale: "My first Knowledge Block.",
    contexts: [],
    failureModes: [],
  },
};

const block = await registry.registerEnvelope(content, "0xYourAddress");
console.log("kbId:", block.kbId);  // 0x + 64 hex chars
```

### 2. Verify it independently (by content hash only)

```typescript
const kbHash = kbHashFromEnvelope(sortSources({ ...content }) as never);
console.assert(block.kbId === kbHash, "Identity is content-addressed");

const result = registry.getKB(block.kbId);
console.log("Verified:", result.exists, "Curator:", result.curator);
```

### 3. Register a derived block (lineage)

```typescript
const derivedContent = {
  type: "practice" as const,
  domain: "demo",
  sources: [block.kbId],  // must be lexicographically sorted when multiple
  payload: {
    type: "practice" as const,
    rationale: "Derived from the first KB.",
    contexts: [],
    failureModes: [],
  },
};

const derived = await registry.registerEnvelope(derivedContent, "0xYourAddress");
console.log("Derived kbId:", derived.kbId);
```

### 4. Resolve lineage (full ancestry)

```typescript
function resolveLineage(reg: VirtualRegistry, kbId: string): string[] {
  const kb = reg.getKB(kbId);
  if (!kb.exists || kb.sources.length === 0) return [];
  const ancestors: string[] = [];
  for (const s of kb.sources) {
    ancestors.push(s, ...resolveLineage(reg, s));
  }
  return [...new Set(ancestors)];
}

const lineage = resolveLineage(registry, derived.kbId);
console.log("Lineage (all source ids):", lineage);
```

### 5. Settlement (on mainnet)

On Base mainnet, the same registry contract supports query settlement and royalty claims. The flow:

- Submit a query for a KB → report outcome → claimable balances update for attesters in the lineage.
- Pull payment via claim function; double-claim reverts.

The runnable demo uses `VirtualRegistry` (no chain) so settlement is described rather than executed. Use the deployed contract and SDK for live settlement.

### 6. Invariant violations (rejections)

```typescript
// Duplicate sources → INVALID_ENVELOPE
await registry.registerEnvelope({
  type: "practice",
  domain: "d",
  sources: [block.kbId, block.kbId],
  payload: { type: "practice", rationale: "Bad", contexts: [], failureModes: [] },
}, "0x...");  // throws { code: "INVALID_ENVELOPE" }

// Unsorted sources → SOURCES_NOT_SORTED
const [a, b] = [parentA.kbId, parentB.kbId].sort();
await registry.registerEnvelope({
  type: "practice",
  domain: "d",
  sources: [b, a],  // wrong order
  payload: { type: "practice", rationale: "Bad", contexts: [], failureModes: [] },
}, "0x...");  // throws { code: "SOURCES_NOT_SORTED" }

// Unregistered parent → CYCLE_DETECTED
await registry.registerEnvelope({
  type: "practice",
  domain: "d",
  sources: ["0x" + "f".repeat(64)],  // unknown kbId
  payload: { type: "practice", rationale: "Orphan", contexts: [], failureModes: [] },
}, "0x...");  // throws { code: "CYCLE_DETECTED" }
```

---

## Offline Demo — Commands

| Command | Purpose |
|--------|--------|
| `pnpm run demo:m1` | Single script: narrative steps, human-readable output, exit 0. |
| `pnpm exec vitest run tests/demonstration/m1-demo.test.ts` | Same guarantees as test suite. |
| `pnpm verify:m1` | Build, audit, and full M1 verification (includes demo). |

All exits 0. All outputs human-readable. Reviewers run one command.

---

## Live Demo — Base + Seeds + Subgraph Integration

**Purpose:** Full-stack demonstration flow — Protocol → Base → The Graph → Agent query. Certification (offline) is always the primary path; the live demo shows the complete chain when a Base RPC and deployed subgraph are available.

### Architecture

```
┌────────────────────────────┐
│ M1 Certification Engine    │
│ (Determinism + Invariants)  │  ← pnpm certify:m1 (offline)
└────────────────────────────┘
              │
              ▼
┌────────────────────────────┐
│ Base Smart Contract         │
│ (Publish + Settle)          │  ← Deploy registry; publishKB seeds
└────────────────────────────┘
              │
              ▼
┌────────────────────────────┐
│ The Graph Subgraph          │
│ (Index + Query)             │  ← Deploy subgraph; query knowledgeBlocks
└────────────────────────────┘
              │
              ▼
┌────────────────────────────┐
│ Agents Query + Purchase     │  ← settleQuery → RoyaltyPaid; discoverKBs
└────────────────────────────┘
```

### What exists today

- **Subgraph:** Schema + mappings; builds as part of `build:m1`. Idempotent handlers, payer = tx.from, deterministic entity IDs. See [SUBGRAPH-BUILD-RUN-RESULTS.md](ops/SUBGRAPH-BUILD-RUN-RESULTS.md).
- **Seeds:** `seeds/root/envelope.json` (genesis root); `seeds/agents.capability/content-integrity-agent-v1/envelope.json` (capability); `seeds/publish-order.json` (default mode: topological order of KBs); `publish-config.json`, `cids.json` (optional).
- **Certification:** `pnpm certify:m1` — offline; no chain required. Clear separation from live demo.
- **Live demo script:** `scripts/m1-live-demo.mjs` — two modes: (1) **Default:** load `publish-order.json` → publish all → settle one → withdraw → query subgraph (if `SUBGRAPH_URL` set). (2) **MAINNET_DEMO=1:** publish root → capability → derived (3 KBs) → settle 0.001 ETH (capability KB) → query subgraph; self-contained.

### Live demo flow

**Default mode** (no `MAINNET_DEMO`):

1. **Publish KBs** from `seeds/publish-order.json` via `publishKB` (publisher wallet). CID from `seeds/cids.json` or `""` for demo.
2. **Settle one KB** — buyer calls `settleQuery(kbId, querier)` with `queryFee` from config.
3. **Withdraw earnings** — publisher calls `withdrawEarnings()`.
4. **Query subgraph** (if `SUBGRAPH_URL` set) — poll until `knowledgeBlocks` appear; print id, settlementCount, totalSettledValue, lineage.
5. **Print proof summary** — kbIds, publish txs, settlement tx, subgraph entity count.

**Mainnet mode** (`MAINNET_DEMO=1`):

1. **Root KB** — Load `seeds/root/envelope.json`. Compute kbHash, publish with empty parents.
2. **Capability KB** — Load `seeds/agents.capability/content-integrity-agent-v1/envelope.json`, set `sources = [rootKbHash]`, compute kbHash, publish with parent = root.
3. **Derived KB** — In-memory child: `sources = [capabilityKbHash]`, compute kbHash, publish.
4. **Settlement** — Buyer wallet calls `settleQuery(capabilityKbId, buyer.address)` with **0.001 ETH**.
5. **Query subgraph** — `knowledgeBlock(id: contentHash)` (field name; value = kbHash) to show offline hash = indexed id, settlements, parents.

### publishKB note — on-chain `contentHash` field equals kbHash

The contract takes **contentHash** (bytes32), not artifactHash. The on-chain kbId **is** the kbHash; the field name is legacy.

- **kbHash** = `keccak256("KB_V1" || canonical(envelope))` computed offline (JCS key sort, sources sorted). Same envelope → same kbHash everywhere.
- **artifactHash** is only the payload hash; it is part of the envelope and affects kbHash but is not the kbId.

### Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `BASE_RPC_URL` (or `BASE_MAINNET_RPC_URL` or `CHAIN_RPC_URL`) | — | Required |
| `DEPLOYER_PRIVATE_KEY` (or `PRIVATE_KEY`) | — | Publisher |
| `BUYER_PRIVATE_KEY` | Same as deployer | Recommended: second wallet for settle (clear payer/querier story) |
| `REGISTRY_ADDRESS` | V2 mainnet | Default: Base mainnet V2 |
| `SUBGRAPH_URL` | — | HTTPS GraphQL endpoint for query step |
| `MAINNET_DEMO` | — | Set to `1` for the 3-KB mainnet story |

### Recommended 4-KB set for full integration

| Slot | Role | Purpose |
|------|------|---------|
| **A** | Meta/root seed | Anchor + "this is a library" |
| **B** | One practical KB | "Agent consumes and pays for this" |
| **C** | One derived KB (has parent) | Demonstrate royalty cascading |
| **D** | One agent-native artifact | Protocol isn't just "software docs" — it's agent artifacts |

### Live demo commands

| Command | Purpose |
|--------|---------|
| `pnpm certify:m1` | Offline certification (report + badge) |
| `pnpm run demo:m1:live` | Default: publish-order.json → publish → settle → withdraw → query (requires RPC + keys) |
| `MAINNET_DEMO=1 pnpm run demo:m1:live` | Mainnet story: publish root → capability → derived → settle 0.001 ETH → query by contentHash (kbHash) |
| `pnpm test:subgraph` | Subgraph integration test; runs when `SUBGRAPH_URL` set; use after deploy or `demo:m1:live` |

---

## What affects kbId — and what does not

**What IS included in the kbHash preimage (and therefore affects kbId):**
- `type`, `domain`, `sources` (sorted), `payload`, `artifactHash`, `tier`
- All fields in the canonical envelope, after JCS (RFC 8785) key sorting

**What is NOT included in the kbHash preimage:**
- `curator` / publisher address
- `timestamp`
- `signature`
- Object key ordering in the raw JSON (JCS normalizes)
- Whitespace in the JSON representation
- IPFS CID or storage location of the artifact

This means: the same logical content, published by anyone, on any machine, always produces the same kbId. Verification is offline-first — compute the hash before touching the chain.

---

## Out of scope (M2+)

This demo is M1. Fullstack tests, live testnet smoke, IPFS gateway tests, and dApp e2e are deferred to M2+. **Full list:** [M1-SCOPE-FREEZE.md](M1-SCOPE-FREEZE.md).
