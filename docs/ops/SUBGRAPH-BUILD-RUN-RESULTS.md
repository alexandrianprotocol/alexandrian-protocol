# Subgraph: Build, Run, and Results

**Purpose:** Define what is meant by subgraph **build**, **run**, and **results** in this repo.

---

## 1. Build (outcome of `graph build`)

**Command:** `pnpm --dir subgraph exec graph build` (or `pnpm run subgraph:build` from root).

**What it does:**

1. **Codegen** — Generates TypeScript/AssemblyScript types from `schema.graphql` and the contract ABI (`AlexandrianRegistryV2`). Output lives in `subgraph/generated/`.
2. **Compile** — Compiles the mapping (`subgraph/src/mapping.ts`) from AssemblyScript to **WebAssembly (WASM)**.
3. **Bundle** — Writes the **build artifact** into a **`build/`** directory (under `subgraph/` or the project root, per graph-cli). The bundle includes:
   - The subgraph manifest (resolved `subgraph.yaml` with schema and data sources),
   - The compiled WASM (mapping logic),
   - The schema and ABI references.

**Intended outcome:**

- **Success:** Exit code 0; a `build/` directory exists with the deployable subgraph (manifest + WASM + schema). No chain or indexer is involved at build time.
- **Failure:** Exit non-zero (e.g. schema error, ABI path missing, mapping compile error). Fix schema/mappings/ABI and re-run.

**In this repo:** Build is part of `pnpm build:m1` and `pnpm verify:m1`. It proves the subgraph compiles against the current protocol ABI and schema. It does **not** deploy or index anything.

---

## 2. Run (deploy + indexer run)

**“Run”** here means: **deploy** the built subgraph to a Graph Node (Hosted Service or Decentralized Network), then the **indexer** runs and processes chain events.

**Commands (outside this repo’s default scripts):**

- **Deploy to Studio (Hosted):** `pnpm --dir subgraph run deploy` → `graph deploy --studio` (requires Studio account and `subgraph.yaml` with real contract address and start block).
- **Publish to Decentralized Network:** `graph publish` (requires graph-cli config and network).

**What “run” does:**

1. **Deploy** — The build artifact (from step 1) is uploaded (e.g. to IPFS). The target (Studio or network) registers the subgraph version.
2. **Indexer** — A Graph Node starts (or continues) **indexing** the chain: it reads blocks from Base, finds events from the configured contract address (`KBPublished`, `QuerySettled`, `RoyaltyPaid`, `AttributionLinked`), and runs the WASM mappings to create/update entities (KnowledgeBlock, Agent, Settlement, ParentEdge, RoyaltyDistribution).
3. **Sync** — Indexing continues until the subgraph is synced to the chain head (or the configured block). After that, the indexer keeps following new blocks.

**Intended outcome:**

- **Success:** Subgraph is deployed and syncing (or synced). You get a **GraphQL endpoint URL** (e.g. from Studio or from the decentralized network) that serves the indexed data.
- **Failure:** Deploy fails (e.g. bad manifest, wrong network), or indexer fails (e.g. mapping bug, reorg handling). Fix config or mappings and redeploy.

**In this repo:** We do **not** run deploy as part of M1 verify. Deploy is manual or CI-optional. `subgraph.yaml` still has a placeholder contract address; replace it (and start block) before deploying.

---

## 3. Results (query output)

**“Results”** means the **data returned by querying the deployed subgraph** over GraphQL.

**How you get results:**

- **HTTP:** Send a GraphQL query to the subgraph endpoint (e.g. Studio or decentralized network URL).
- **Example query:**

```graphql
query {
  knowledgeBlocks(first: 10) {
    id
    contentHash
    publisher { id }
    settlementCount
    totalSettledValue
    parents { parent { id } }
  }
}
```

**Intended outcome:**

- **Success:** JSON response with entities that match the schema (KnowledgeBlock, Agent, Settlement, ParentEdge, RoyaltyDistribution). Data reflects on-chain events that have been indexed.
- **Empty or partial:** Subgraph not yet synced, or no events for the configured contract/block range. Update start block or wait for sync.

**In this repo:** M2 tests (e.g. `experimental/tests-m2/subgraph.test.ts`) assume a **deployed and synced** subgraph; they set `SUBGRAPH_QUERY_URL` and query for KnowledgeBlocks and lineage. “Results” there are the parsed GraphQL response (e.g. `data.knowledgeBlock`).

---

## 3.5 Handler semantics (idempotency, payer, reorg)

Mappings in `subgraph/src/mapping.ts` are written to be **idempotent** and **reorg-safe**:

- **Deterministic entity IDs:** Settlement by `txHash`; RoyaltyDistribution by `txHash` + `logIndex`; ParentEdge by `child-parent` string; KnowledgeBlock by `contentHash` (value = kbHash).
- **Idempotency:** Each handler loads the entity by id first. If it already exists, the handler returns without incrementing counters or creating duplicates. On reorg, the indexer re-processes the same block; handlers see the same events again and skip, so counters are not double-counted.
- **Payer vs querier:** `Settlement.payer` is set from `event.transaction.from` (the address that sent the tx / paid ETH). The contract event param `querier` is the credited querier; the schema exposes only `payer` as the paying agent.
- **RoyaltyPaid fallback:** If `handleRoyaltyPaid` runs before `handleQuerySettled` in the same tx (log order), it may create the Settlement entity; in that case it sets `payer = event.transaction.from` (not recipient).

See comments in `subgraph/src/mapping.ts` for per-handler notes.

---

## 4. Summary

| Term    | Meaning                                                                 | Outcome |
|---------|-------------------------------------------------------------------------|--------|
| **Build** | Compile schema + mappings to WASM and produce a deployable bundle.     | `build/` artifact; used by deploy. Part of `build:m1`. |
| **Run**   | Deploy that bundle and run the indexer so it processes chain events.   | Deployed subgraph + sync’d index; gives you an endpoint. |
| **Results** | Query the endpoint with GraphQL and get back indexed entities.        | JSON with KnowledgeBlocks, Agents, Settlements, lineage, etc. |

**M1:** We only guarantee **build** (compile + bundle). **Run** (deploy + index) and **results** (querying) are manual or M2.

---

## Out of scope (M2+)

This doc describes M1 subgraph build/run/results. Hosted subgraph, multi-chain indexing, and M2 fullstack are deferred to M2+. **Full list:** [M1-SCOPE-FREEZE.md](../M1-SCOPE-FREEZE.md).
