# M1 Verification

**Purpose:** How to verify Milestone 1 from a clean clone with no external services (no live chain, IPFS, or Redis).

**Ref:** [M1-SCOPE-FREEZE.md](M1-SCOPE-FREEZE.md) — what M1 is; [TESTING.md](../TESTING.md) — full test layout.

---

## Subgraph codegen (required before first build)

The subgraph build expects generated types from the schema and contract ABI. If `generated/Registry/AlexandrianRegistryV2.ts` or `generated/schema.ts` are missing, run codegen once before `verify:m1`:

```bash
pnpm run subgraph:codegen
```

Then run `pnpm verify:m1` or `pnpm verify:m1:nosec`. Codegen writes into `subgraph/generated/` and does not upload anything.

---

## One command

```bash
pnpm verify:m1
```

Runs: **build:m1** → **lint:boundaries** → **audit** (high/critical) → **test:m1**.

- **build:m1:** protocol compile, ABI export, protocol + coordination-core + sdk-core + sdk-adapters + subgraph build.
- **lint:boundaries:** production code does not import from `experimental/`.
- **audit:** `pnpm audit --audit-level=high`; fails if high/critical vulnerabilities.
- **test:m1:** protocol tests, conformance, spec + invariants + demonstration + determinism + property with `CONTRACT_MODE=mock` (no chain).

If audit blocks (e.g. transitive deps):

```bash
pnpm verify:m1:nosec
```

Same as above but skips `pnpm audit`. Use for local/reviewer escape hatch only.

---

## What is exercised

- Deterministic identity (canonical vectors, key-order independence).
- Invariants (economic + protocol; see [protocol/INVARIANTS.md](protocol/INVARIANTS.md)).
- M1 demonstration suite (canonical identity, VirtualRegistry, subgraph compatibility).
- No live RPC required; integration that needs chain uses mocks in this path.

---

## Live / certification

- **Live demo (on-chain + subgraph):** `pnpm run demo:m1:live` (requires RPC + subgraph URL as configured).
- **Certification report:** `pnpm certify:m1` → writes `certification/m1-report.json` and badge artifacts.

---

## What gets uploaded to The Graph (when you deploy)

When you **deploy** the subgraph (e.g. `pnpm --dir subgraph run deploy` or `graph deploy --studio`), what is uploaded to The Graph is **only**:

| Uploaded | Description |
|----------|-------------|
| **Subgraph manifest** | Resolved `subgraph.yaml` (contract address, start block, network, event handlers). |
| **GraphQL schema** | `schema.graphql` (entity definitions: KnowledgeBlock, Agent, Settlement, ParentEdge, RoyaltyDistribution). |
| **Compiled mapping** | The WebAssembly (WASM) built from `subgraph/src/mapping.ts` — the logic that turns chain events into entities. |
| **ABI reference** | Contract ABI used at build time (bundled in the manifest); not re-uploaded as separate data. |

**What is *not* uploaded:** No KB payloads, no envelope content, no curator data beyond what is already on-chain. The Graph does **not** receive your knowledge base or documents. It receives only the **indexer code and config**. The indexer then **reads** the chain (Base mainnet at the configured contract address), processes `KBPublished`, `QuerySettled`, `RoyaltyPaid`, `AttributionLinked` events, and **writes** entities into the index. All data in the index is derived from public chain events; the protocol remains the source of truth. See [ops/SUBGRAPH-BUILD-RUN-RESULTS.md](ops/SUBGRAPH-BUILD-RUN-RESULTS.md).
