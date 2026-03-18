# Alexandrian Protocol — Master Implementation Checklist
*Living reference document. Updated: 2026-03-17. Last audit: 2026-03-17 (post-context-4)*

---

## How to Use This Document

Work top to bottom. Items are sequenced by dependency — nothing in a later section should be started before the items it depends on are complete. Each section has a **why** explanation so future contributors understand intent, not just tasks.

Status markers: `[ ]` pending · `[x]` complete · `[~]` in progress · `[!]` blocked

---

## 0 · Immediate Contract Calls (Zero Engineering, Do Today)

These are owner-only transactions on the live contract. They unblock everything downstream and require no code changes.

**Contract:** `0xD1F216E872a9ed4b90E364825869c2F377155B29` on Base Mainnet
**Interface:** Basescan Write Contract tab, connected as owner wallet

---

### [ ] 0.1 — Call `setMinStake(0)` — Bootstrap Mode

**Function:** `setMinStake(uint256 amount)` · Input: `0`

**Why:** The live contract currently requires 0.001 ETH stake per KB publish. At 10,000 KBs, that locks ~10 ETH (~$20–30k) as publisher stake before the graph has any value. The bootstrap mechanism is already built into the contract — calling `setMinStake(0)` enables zero-stake publishing. After graph density target is reached, restore to `setMinStake(1000000000000000)` (1e15 wei = 0.001 ETH).

**Important:** Zero-stake KBs cannot be slashed (`slash()` reverts with `NoStake` when `stake.amount == 0`). This is expected and acceptable during bootstrap — quality is enforced by the validator agent in the pipeline, not the contract.

**Restore condition:** After 10k KBs are indexed and the subgraph shows healthy query volume, call `setMinStake(1000000000000000)` to re-enable economic accountability for new publishers.

---

### [ ] 0.2 — Call `setProtocolFee(500)` — Raise to 5%

**Function:** `setProtocolFee(uint256 bps)` · Input: `500`

**Why:** Current protocol fee is 200 bps (2%). Under the library/query-enhancement framing, 5% is the right rate — meaningful enough to build treasury at scale, well below what developers consider extractive (Stripe is 2.9%, App Store is 30%). The contract caps this at 1000 bps (10%) via `FeeTooHigh` revert.

**Rationale for 5% specifically:**
- Defensible in grant applications as infrastructure-grade
- Leaves room to increase to 10% when subscription tier justifies it
- Matches what the SaaS subscription model will charge on top

**After calling:** Update `api/query.js` line 186 from `totalEth * 0.02` to `totalEth * 0.05` so the demo settlement display stays accurate.

---

### [ ] 0.3 — Call `setSlashRate(3000)` — Raise to 30%

**Function:** `setSlashRate(uint256 bps)` · Input: `3000`

**Why:** Current slash rate is 1000 bps (10%). At 10% with a 0.001 ETH stake, a slash costs the publisher 0.0001 ETH (~$0.20–0.30). That is not accountability — it is a rounding error. At 30%, a slash costs 0.0003 ETH per KB, and when endorser bonds are added in M2, the combined stake at risk becomes meaningful. The contract caps slash rate at 5000 bps (50%) via `SlashRateTooHigh`.

---

### [x] 0.4 — Update `api/query.js` protocol fee display

**File:** `api/query.js` line 186

```js
// Before
const protocolFee = totalEth * 0.02;

// After
const protocolFee = totalEth * 0.05;
```

Then commit and deploy:
```bash
git add api/query.js
git commit -m "fix(api): update protocol fee display to 5% matching contract"
vercel --prod --archive=tgz
```

---

## 1 · SDK Layer — `enhanceQuery()` (Week 1)

**Why this is first:** The entire SaaS layer, the agent pipeline, and the demo upgrade all depend on this one function. Build the pipeline from the output end backwards.

### [x] 1.1 — Implement `sdk.enhanceQuery()` in `packages/sdk-adapters`

**File to create:** `packages/sdk-core/lib/core/enhanceQuery.ts`

**Signature:**
```ts
interface EnhanceQueryOptions {
  domains?: string[];          // e.g. ['engineering.api.security']
  types?: KBType[];            // e.g. ['ComplianceChecklist', 'Practice']
  limit?: number;              // max KBs to inject, default 4
  version?: 'latest' | string; // 'latest' or specific contentHash
}

interface EnhanceQueryResult {
  enrichedPrompt: string;      // system prompt with KB context injected
  kbsUsed: KnowledgeBlock[];   // which KBs were selected
  settlementPreview: {
    totalEth: number;
    protocolFee: number;
    distribution: { id: string; hash: string; ethReceived: number }[];
  };
}

async function enhanceQuery(
  question: string,
  options?: EnhanceQueryOptions
): Promise<EnhanceQueryResult>
```

**Internal flow:**
1. Query Redis cache (or subgraph if cache miss) for KBs matching `domains`/`types`
2. Rank by reputation score (`min(1000, min(500, queryVolume*2) + min(100, endorsements*20))`)
3. Fetch artifact JSON from IPFS for top `limit` KBs
4. Compose enriched system prompt: KB metadata + artifact content sections
5. Return enriched prompt + selection metadata + settlement preview

**Guidelines:**
- Never fetch from chain directly — always cache layer first, subgraph second
- KB selection must be deterministic for the same question + options (for caching)
- Artifact fetch timeout: 5s per KB, fail gracefully (skip KB, log warning)
- If Redis is unavailable, fall back to subgraph. If subgraph fails, use local seed data.

---

### [x] 1.2 — Implement Redis KB metadata cache

**File:** `packages/sdk-adapters/lib/adapters/redis.ts`

**Why:** Parent selection and KB discovery must not scan the chain or IPFS on every call. Redis holds warm KB metadata keyed by contentHash and domain. Populated by the subgraph indexer when new KBs are published.

**Key schema:**
```
kb:{contentHash}          → JSON: { id, domain, type, queryFee, royaltyBps, reputation, cid, parents }
domain:{domain}           → Sorted set: contentHash members, score = reputation score
domain:{domain}:type:{t}  → Sorted set: contentHash members filtered by KB type
```

**TTL:** 24 hours. Invalidated on new `KBPublished` event.

**Recommended provider:** Upstash Redis (serverless-compatible, free tier sufficient for MVP)

---

### [x] 1.3 — Replace hardcoded system prompt in `api/query.js` with dynamic IPFS fetch

**Why this matters architecturally:** The current demo embeds KB content directly in source code. This means: (a) the demo lies about how the protocol works, (b) KBs cannot be updated without a code deploy, (c) there is no on-chain attribution link between the query and the KBs that answered it. Dynamic fetching makes the demo architecturally honest.

**Flow to implement:**
```js
// 1. Call sdk.enhanceQuery() with the question
// 2. Use the enriched prompt as the system prompt
// 3. Include kbsUsed in the attribution response
// 4. Include settlementPreview in the settlement response
```

**Remove:** The hardcoded `SYSTEM_PROMPT` constant and `KB_ATTRIBUTION` array from `api/query.js`. These become runtime outputs of `enhanceQuery()`.

---

### [x] 1.4 — Export `enhanceQuery` from SDK public surface

**File:** `packages/sdk-core/lib/core/index.ts` — add export
**File:** `packages/sdk-core/index.ts` — verify re-export

---

### [x] 1.5a — Fix sdk-core missing .cjs build output

**Bug:** `packages/sdk-core/package.json` declared `"main": "./dist/index.cjs"` and `"require": "./dist/index.cjs"` in exports, but the build script was `"build": "tsc -p tsconfig.json"`. Plain `tsc` never produces `.cjs` output — only `.js` and `.d.ts`. Any CommonJS consumer (`require('@alexandrian/sdk-core')`) would receive a file-not-found error at import time.

**Fix:** Changed `"build": "tsc -p tsconfig.json"` → `"build": "tsup"` and added `"tsup": "^8.5.1"` to `devDependencies`. The `tsup.config.ts` already existed and mirrors `sdk-adapters`. Pattern now matches the rest of the monorepo.

---

### [ ] 1.5 — Publish SDK packages to npm

```bash
cd packages/sdk-core && npm publish --access public
cd packages/sdk-adapters && npm publish --access public
```

**Package names:** `@alexandrian/sdk-core`, `@alexandrian/sdk-adapters`

---

## 2 · IPFS Layer Hardening (Week 2)

### [ ] 2.1 — Verify all 4 KB-ENG artifacts are pinned and retrievable

For each CID in `KB_ATTRIBUTION`:
- Fetch via `https://ipfs.io/ipfs/{CID}` — must return valid JSON
- Verify keccak256 hash matches on-chain `artifactHash`
- Confirm pin is active in Pinata dashboard

CIDs to verify:
- KB-ENG-1: `QmQfF4NtyFhNeEwxn4GdHhUYT5o2Emmb1r2CDuo1AGe9un`
- KB-ENG-2: `QmdzWRjtbWBQ8DpwzC8pHZ8U9BssHnzvPUDrS6gWeRRyck`
- KB-ENG-3: `QmZQ2gV9trEhNvKck8Rmr374k2hTWPU8yPj7btfPqCfWUq`
- KB-ENG-4: `Qmeu9YpyukeA96DptqKoafZo6rYsMwtryJQuFo8h5pDDrS`

---

### [x] 2.2 — Add secondary IPFS pin provider

**Why:** Single-provider pinning is a single point of failure. If Pinata is down, KB artifacts are unreachable and the query pipeline breaks.

**Implementation:** `publish.mjs` now fires a best-effort secondary pin via the IPFS Pinning Service API (PSA spec) after every successful Pinata pin. Any PSA-compatible provider works (Filebase recommended). Set `SECONDARY_IPFS_ENDPOINT` and `SECONDARY_IPFS_TOKEN` in `.env` before the 10k run. Failures are logged as warnings and never block the primary publish.

**IPFS gateway fallback** (`verify-kb.mjs` / `fetchArtifact.ts`): already tries ipfs.io → cloudflare-ipfs → gateway.pinata.cloud in order.

---

### [x] 2.3 — Build artifact verification CLI

```bash
# Verify a single artifact
node packages/generator/scripts/verify-kb.mjs <CID>

# Verify all 4 KB-ENG demo artifacts
node packages/generator/scripts/verify-kb.mjs --all
```

**What it checks:** (1) CID is reachable via public IPFS gateways, (2) artifact is valid KB JSON with expected fields, (3) embedded `kbHash` matches recomputed canonical hash, (4) content (steps/checklist) is present.

**Why:** Grant reviewers and external auditors need to independently verify that KB artifacts match their on-chain hashes without reading source code. This is a trust primitive.

---

### [x] 2.4 — Enforce mandatory CID binding policy

**Rule:** No KB may be published with an empty or placeholder CID. The publisher pipeline must pin the artifact to IPFS and obtain a real CIDv1 before calling `publishKB`.

**Enforcement:** Add a preflight check in the publisher agent that rejects any KB without a verified, pinned CID. This is a pipeline rule, not a contract constraint.

---

## 3 · Agent Pipeline (Week 2–3)

Build the pipeline from output end backwards: Publisher → Validator → Generator.

### [x] 3.1 — Publisher Agent

**Status:** Complete. `packages/generator/scripts/publish.mjs` (fully implemented).

**What it does:** Reads refined KBs from `staging/refined/`, pins each artifact to IPFS via Pinata (with exponential backoff retry), calls `publishKB` on-chain via ethers.js, moves published files to `staging/published/`, writes JSONL log.

**Key capabilities already built:**
- Safety gate: verifies `minStakeAmount == 0` before any transactions (prevents accidental stake burns)
- Concurrency: up to 10 parallel publish slots with nonce management
- Resume-safe: detects already-published KBs and skips them on re-run
- Error classification: `AlreadyPublished`, `NonceConflict`, `InsufficientFunds`
- Dry-run mode: `npm run publish:dry`
- Secondary IPFS pinning via PSA spec (Filebase / Pinata v2 compatible)

**[x] Nonce over-increment bug fixed (2026-03-17):**
The batch loop previously pre-assigned `nonce + j` to each task slot, then unconditionally incremented `nonce += batch.length` after every batch — even when tasks returned early via the `alreadyOnChain` fast path (which never submits a transaction and therefore never uses a nonce). On a batch of 5 where 3 were already on-chain, the nonce would advance by 5 instead of 2, causing `NonceConflict` errors for every subsequent batch.

**Fix:** Replaced the fixed `nonce` parameter with a shared `nonceRef: { value: number }` object. Nonce is claimed atomically — `const myNonce = nonceRef.value++` — inside `publishOne()`, immediately after the `isRegistered()` check passes (i.e., only when a transaction will actually be submitted). The JS single-threaded event loop makes the increment race-free across concurrent async tasks. Removed `nonce += batch.length` from the outer loop entirely.

**To run:** Requires `OWNER_PRIVATE_KEY`, `PINATA_JWT` env vars, and `setMinStake(0)` called on contract first.

---

### [x] 3.2 — Validator Agent

**Status:** Complete. `packages/generator/src/lib/core/validator.ts` (489 lines) + `lib/pipeline/upgrade-seeds-pipeline.ts`.

**Quality gates implemented:**
- Schema conformance: all required fields, correct types, epistemic-KB type pair validation
- Content completeness: step count, step structure, dataflow consistency
- Domain format: pattern enforcement with domain-specific overrides
- Duplicate detection: kbHash (exact), content fingerprint (exact), Jaccard similarity >75% (near-duplicate)
- Parent validation: seed rules (used.length=0), derived rules (used.length∈[2,3])
- Dimension scoring: executability (0.25), atomicity (0.20), connectivity (0.20), epistemicHonesty (0.15), depth (0.20)
- Multi-threshold gate: hardBlock < 1.8, marginal 1.8–2.2, standard ≥ 2.2, anchor ≥ 2.6

**Pipeline routing:** Reject → `staging/failed/`, Marginal → `staging/marginal/` (auto-repair up to 2× then re-score), Pass → `staging/refined/`.

---

### [x] 3.3 — Generator Agent

**Status:** Complete. `packages/generator/src/ai-generator.ts` (413 lines) + `scripts/run-1k-with-ai.mjs` + `src/index.ts` (1765 lines, full mode dispatch).

**What it does:** Generates KBv2.5 artifacts via OpenAI GPT-4. Seed specs in `src/lib/seeds/*.ts` (61 domain files). 22 hand-crafted anchor KBs in `scripts/inject-handcrafted-kbs.mjs`.

**Four-phase generation pipeline:**
- Phase 1: 100 hand-crafted seeds → `staging/pending/`
- Phase 1b: 20 AI-generated seeds via OpenAI → `staging/pending/`
- Phase 2: Derived KBs (synthesis from parents) → `staging/pending/`
- Phase 4: Expansion to target count → `staging/pending/`

**To run:** `npm run build && npm run generate:1k-ai` (requires `OPENAI_API_KEY`). Then run upgrade-seeds-pipeline to refine, then `npm run publish` to publish.

---

### [x] 3.4 — Multi-wallet infrastructure

**Three role wallets:**
- `OWNER_PRIVATE_KEY` — funds for gas on publish calls (not stake, since setMinStake(0)); receives royalties
- Optional: `GENERATOR_PRIVATE_KEY`, `VALIDATOR_PRIVATE_KEY` for role separation in production

Store in `packages/generator/.env` (see `.env.example`). Each wallet needs ~0.05 ETH as gas reserve during 10k run (~$30 total at Base prices).

**To run the full 10k pipeline:**
```bash
cd packages/generator
cp .env.example .env
# Fill in: OWNER_PRIVATE_KEY, PINATA_JWT, OPENAI_API_KEY
npm run build
node scripts/inject-handcrafted-kbs.mjs   # 22 anchor KBs → staging/refined/
npm run generate:1k-ai                     # fills staging/pending/
npm run publish:dry                        # verify before committing
npm run publish                            # live publish to Base mainnet
```

**Prerequisite:** `setMinStake(0)` must be called on-chain first (see Section 0.1).

---

### [ ] 3.5 — Duplicate detection vector index

**Why:** Without duplicate detection, the generator will produce semantically identical KBs with slightly different wording. This degrades graph quality and wastes publish gas.

**Implementation:** Embed each KB's `claim` + `domain` fields using a text embedding model. Store embeddings in a vector index (Pinecone free tier, or Weaviate). Before publishing, check cosine similarity against existing KBs in the same domain. Reject if similarity > 0.92.

---

## 4 · SaaS Layer — MVP (Week 3–4)

**Principle:** The SaaS is a UI wrapper around the SDK. Never put business logic in the SaaS that belongs in the SDK. Never put content or identity logic in the SaaS that belongs on-chain.

### [ ] 4.1 — Auth

**Recommended approach:** Wallet connect (Wagmi + ConnectKit) as primary. Email/magic link as fallback for non-crypto users.

**What auth gates:** KB publishing, earnings dashboard, private KB drafts. Query enhancement is public (no auth required) with rate limiting.

---

### [x] 4.2 — KB Browser

A searchable, filterable list of published KBs from the subgraph.

**Filters:** Domain, KB type, trust tier, minimum reputation score
**Sort:** By reputation, by query volume, by recency, by royalty earnings
**Display per KB:** ID, title, type badge, domain, reputation score, query count, total ETH earned

---

### [x] 4.3 — KB Detail Page

For each KB, show:
- Full artifact content (fetched from IPFS)
- Attribution DAG (ancestors and descendants)
- On-chain provenance (block, tx hash, publisher address)
- Earnings history (settlements over time)
- Version history (lineage chain of prior versions)
- "Use this KB" button → shows enriched prompt preview

---

### [x] 4.4 — Query Enhancement Playground

The current Vercel demo, but live and architecturally real:
- Dynamic KB selection from subgraph (not hardcoded)
- Actual IPFS artifact fetch at query time
- Real settlement preview (matches contract math)
- Copy enriched prompt button (for developers integrating the SDK)

---

### [ ] 4.5 — Earnings Dashboard

For authenticated KB publishers:
- Total ETH earned across all KBs
- Per-KB breakdown: query count, ETH earned, last settlement
- Pending withdrawal balance (pull from contract `pendingWithdrawals[address]`)
- Withdraw button → calls `withdraw()` on contract

---

### [x] 4.6 — KB Publish Form

**Status:** Complete. `demo/kb-publish.html` at `/publish`.

**What's built:**
- Wallet connect (MetaMask/EIP-1193) with auto-switch to Base Mainnet
- 6-section form: KB Identity, Content (claim + dynamic steps), IPFS CID, Parents & Attribution, Economics, Review & Submit
- Auto-computed `contentHash` = keccak256("alexandrian.kb.v2.5" + canonical(domain+claim+steps))
- Dynamic parent KB rows with royaltyShareBps and relationship type; royalty breakdown shows how each query fee distributes
- Transaction preview table before submission (contentHash, curator, kbType, trustTier, cid, parents, queryFee, msg.value)
- Draft save/load via localStorage
- On-chain submit via `publishKB()` with ethers.js v6 BrowserProvider
- Success card with Basescan tx link + "View KB →" detail link
- Inline field validation with error messages

---

## 5 · Economic Model Upgrades (M2)

### [ ] 5.1 — Subscription access tier (new contract function)

**Why:** Flat per-query fees are prohibitive at agent scale. A subscription tier lets agents pay once for unlimited queries to a collection, matching how real library access works.

**New contract function:**
```solidity
function subscribeToCollection(bytes32 collectionId, uint256 months)
    external payable;
```

Revenue distributes to KBs in the collection proportionally to their query volume share over the subscription period.

**Agent access pattern:**
- `sdk.useKB("KB-ENG-4")` → resolves to latest contentHash, per-query fee
- `sdk.subscribeToCollection("engineering.api", 3)` → 3-month flat rate, unlimited queries

---

### [ ] 5.2 — Tiered query pricing by KB type

Update KB publishers' `queryFee` recommendations in SDK docs and SaaS publish form:

| KB Type | Recommended queryFee |
|---|---|
| `ComplianceChecklist`, `Rubric` | 0.001–0.002 ETH |
| `Practice`, `Feature` | 0.0002–0.0005 ETH |
| `PromptEngineering`, `StateMachine` | 0.00005–0.0001 ETH |

**Why:** Flat pricing leaves money on the table for high-value KBs and overcharges for informational ones. A ComplianceChecklist used in a production security audit has different value-to-user ratio than a PromptEngineering KB used for casual guidance.

---

### [ ] 5.3 — Endorser bonds with economic weight (M2 contract upgrade)

**Current state:** Endorsements cost nothing and contribute `min(100, endorsements*20)` to reputation. This is gameable.

**Target:** Endorsers stake a small bond alongside the KB publisher. If the KB is slashed, endorser bond is also partially forfeited. If the KB performs well (high query volume), endorser earns a small share of query revenue.

**Effect:** Creates a class of "library reviewers" who earn by curating quality. Reputation score becomes economically meaningful.

---

### [ ] 5.4 — Restore `setMinStake(1e15)` after bootstrap

**Condition:** When 10k KBs are indexed AND the subgraph shows > 100 settlements/week consistently.

**Call:** `setMinStake(1000000000000000)` (1e15 wei)

---

## 6 · Architecture Principles (Standing Guidelines)

These are non-negotiable design rules. Revisit only if there is a strong architectural reason, documented in an ADR.

### 6.1 — Layer separation

| Concern | Layer |
|---|---|
| KB canonical identity, lineage, economics | Blockchain only |
| Immutable artifact snapshots | IPFS only |
| Mutable working versions, rich metadata, UX | SaaS only |
| KB selection, context injection, settlement routing | SDK |
| Discovery, reputation signals, lineage queries | The Graph subgraph |
| KB metadata fast-lookup for pipeline | Redis cache |

**Rule:** Never put content logic in the contract. Never store identity in the SaaS database. Never query the chain directly from the SaaS — always go through the SDK.

---

### 6.2 — On-chain KB records are identity records, not content records

The `publishKB` call stores: hash, owner, type, tier, fee, royalty config, parent links, IPFS pointer. Nothing else. The contract does not know what a KB says. All content lives in the IPFS artifact. All rich metadata lives in the SaaS.

**Why:** Smaller contract = cheaper audits, less attack surface, more upgrade flexibility.

---

### 6.3 — Every publish is a commit

KBs are immutable once on-chain. To update a KB, publish a new version with the old KB as a parent. The lineage DAG becomes version history. Agents pin to a specific contentHash for stability or use "latest" via the SaaS resolver.

---

### 6.4 — The SaaS layer is mutable. The blockchain layer is not.

Rich metadata, descriptions, examples, and working drafts live in the SaaS and can change freely. On-chain records are permanent. IPFS artifacts are content-addressed and immutable. Design the data model with this boundary explicit.

---

### 6.5 — Never query the chain for KB metadata in hot paths

All metadata lookups (parent selection, domain discovery, reputation) must go through Redis → subgraph, in that order. Direct RPC calls for metadata are too slow and too expensive at pipeline scale.

---

### 6.6 — Validator enforces quality; contract enforces economics

The contract only checks: stake amount, parent count (max 8), CID presence. Everything else — content quality, domain conformance, duplicate detection, parent relevance — is the validator agent's job. This keeps the contract minimal and the quality rules updatable.

---

## 7 · Product Positioning (Standing Reference)

### 7.1 — What Alexandrian is

**One sentence (README):**
> Decentralized knowledge infrastructure for AI agents — expert context on demand, attributed on-chain, with automatic royalty settlement.

**Tagline (grants, pitch decks, one-pagers):**
> Turning collective expert knowledge into programmable context for AI agents.

**Extended (intro paragraph):**
> Alexandrian formalizes expert knowledge into on-chain, composable artifacts that AI agents use to define intent before every call — with cryptographic attribution and automatic royalty settlement flowing through the entire knowledge lineage.

---

### 7.2 — Primary product mechanic: Query Enhancement

KBs are not just templates to read — they are context injectors. When an agent sends a query, Alexandrian:
1. Matches the query to relevant KBs by domain and semantic similarity
2. Fetches the KB artifact content from IPFS
3. Injects it as structured context into the system prompt
4. Returns a grounded, expert-level answer
5. Settles the query fee and routes royalties through the attribution DAG

**The value claim:** A user saying "secure my API" doesn't know they need to ask about JWT algorithm pinning, IDOR, and OWASP API4. The KB does. Alexandrian translates vague user intent into precisely scoped, expert-defined queries.

---

### 7.3 — Secondary product mechanic: Solution Templates

KBs also function as direct deliverables — prebuilt, senior-engineer-grade architectures, procedures, and checklists that agents or users consume directly. This is the content layer that makes query enhancement valuable.

These two mechanics are the same underlying system viewed from different angles:
- **Template view:** "Give me the procedure for secure API design"
- **Enhancement view:** "I'm building a login endpoint" → system injects KB-ENG-4 automatically

---

### 7.4 — What Alexandrian is NOT

- Not a documentation site or wiki
- Not a vector database or generic RAG system
- Not a prompt marketplace
- Not competing with LLMs — it makes any LLM smarter by grounding its context

---

## 8 · Cost Management Guidelines

### 8.1 — OpenAI API

- **Model:** `gpt-4o-mini` for all demo and pipeline use. Only upgrade to `gpt-4o` for tasks where quality difference is measurable and justified.
- **max_tokens:** 1200 for demo responses. 2000 max for generator agent drafts.
- **Caching:** Always cache identical questions. Hash with SHA-256, store in Redis for shared cache across instances.
- **System prompt:** Keep under 1500 tokens. Dynamic KB injection replaces large static prompts.

### 8.2 — Vercel

- **Tier:** Hobby (free) until demo is actively promoted at scale. Upgrade to Pro ($20/month) when function invocations approach Hobby limits.
- **Function timeout:** 30s is sufficient for `gpt-4o-mini`. Do not increase.
- **Environment variables:** `OPENAI_API_KEY` must be set. Never hardcode.

### 8.3 — Base (on-chain gas)

- `publishKB`: ~150k gas, ~$0.003. 10k publishes ≈ $30 total.
- `settleQuery`: ~200k gas, ~$0.004. Budget accordingly.
- Keep 0.05 ETH in each agent wallet as gas reserve during 10k run.

### 8.4 — IPFS / Pinata

- **Free tier:** 1 GB storage, sufficient for 10k KBs (~50–150 MB total).
- **Upgrade trigger:** When approaching 800 MB pinned storage.
- **Multi-provider:** Add secondary provider before 10k run. Never depend on a single pinner.

### 8.5 — The Graph Studio

- **Free tier:** 100,000 queries/month. Sufficient for MVP.
- **Upgrade trigger:** When subgraph queries approach 80,000/month (leave buffer).
- **Optimization:** Cache subgraph responses in Redis. Never query the subgraph per-request in a hot path.

### 8.6 — Redis (Upstash)

- **Free tier:** 10,000 commands/day, 256 MB. Sufficient for development and early production.
- **Upgrade trigger:** When daily commands approach 8,000 or data exceeds 200 MB.

---

## 9 · Production Audit Log (2026-03-17)

Codebase graded against production and M2 readiness. All code-level findings below have been fixed in-session.

### [x] AUDIT-1 — No rate limiting on `api/query.js`
**Severity:** HIGH (production blocker)
**Finding:** The `/api/query` endpoint had wildcard CORS (`*`) and zero rate limiting. Any page could issue unlimited OpenAI requests, draining API credits.
**Fix:** Added in-process sliding window rate limiter — 20 requests/min per IP, 100 requests/min global. Uses `Map<ip, timestamp[]>` for O(1) cleanup. Also added 5,000-character max on question input. Returns HTTP 429 with `Retry-After: 60` header when limits are exceeded.

---

### [x] AUDIT-2 — Subgraph query uses non-existent fields in `kb-browser.html`
**Severity:** HIGH (silent data loss)
**Finding:** The GraphQL query in `demo/kb-browser.html` included `trustTier` and `transactionHash` — neither field exists in the `KnowledgeBlock` entity in the deployed subgraph schema. The Graph returns `null` silently. The Trust Tier filter always returned zero results; the Basescan tx link never rendered.
**Fix:** Removed both fields from the GraphQL query. Removed the Trust Tier filter `<select>` from the UI. Replaced `transactionHash` Basescan link with a block explorer link using `blockNumber` (which IS indexed in the schema). Added `curator` field to the query.

---

### [x] AUDIT-3 — Wrong contract address on demo landing page
**Severity:** MEDIUM (grant/credibility risk)
**Finding:** `demo/index.html` showed the stale contract address `0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000` in the stats bar and footer link. The contract was redeployed 2026-03-17 to `0xD1F216E872a9ed4b90E364825869c2F377155B29`.
**Fix:** Updated both occurrences in `demo/index.html` to the live contract address.

---

### [x] AUDIT-4 — Nonce over-increment in `publish.mjs`
**Severity:** HIGH (10k run would fail)
**Finding:** See Section 3.1 note above.
**Fix:** Shared `nonceRef` object with atomic claim inside `publishOne()`. See 3.1.

---

### [x] AUDIT-5 — sdk-core `.cjs` build output missing
**Severity:** MEDIUM (npm publish would produce broken package)
**Finding:** See Section 1.5a above.
**Fix:** Switched build script to `tsup`, added `tsup` devDependency. See 1.5a.

---

### [x] AUDIT-6 — No security headers on Vercel demo routes
**Severity:** MEDIUM (security posture)
**Finding:** `vercel.json` had CORS headers on `/api/*` but no security headers on HTML routes. No `X-Frame-Options`, no `Content-Security-Policy`, no `X-Content-Type-Options`.
**Fix:** Added global `headers` rule on `/(.*)`  with `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a tight `Content-Security-Policy` that allows only known external origins (jsdelivr, unpkg, fonts.googleapis, The Graph, OpenAI, IPFS gateways, Base RPC).

---

### [ ] AUDIT-7 — No graph health metrics or monitoring
**Severity:** MEDIUM (operational risk for M2)
**Finding:** No dashboards, no alerting, no automated checks that the subgraph is indexing, IPFS gateways are responsive, or the publisher wallet has sufficient gas. The 10k run has no observability.
**Action:** Before 10k run, set up: (1) Uptime monitor on subgraph query endpoint, (2) wallet balance check in `publish.mjs` startup (warn if < 0.02 ETH), (3) IPFS gateway health check before each batch.

---

### [ ] AUDIT-8 — `setMinStake(0)` / `setProtocolFee(500)` / `setSlashRate(3000)` not yet called
**Severity:** HIGH (blocks 10k run)
**Finding:** Live contract is still at default values. See Sections 0.1–0.3.
**Action:** Owner must call these via Basescan Write Contract before starting any generation run.

---

### [ ] AUDIT-9 — No embedding-based duplicate detection
**Severity:** MEDIUM (M2 quality gate)
**Finding:** Generator has exact-hash and Jaccard deduplication but no semantic vector similarity check. At 10k KBs, paraphrased duplicates will accumulate.
**Action:** See Section 3.5.

---

### [ ] AUDIT-10 — Min-parent enforcement not wired end-to-end
**Severity:** LOW (quality, not correctness)
**Finding:** The validator enforces `used.length ∈ [2,3]` for derived KBs, but there is no `is_seed` flag enforcement in the publish pipeline to prevent seeds from accidentally carrying parent links set by the generator.
**Action:** Add explicit `parents = []` assertion for any KB where `isSeed === true` before calling `publishKB`.

---

## 10 · Critical Path Summary

```
TODAY         ── 3 contract calls (setMinStake, setProtocolFee, setSlashRate)
              ── Update api/query.js fee display, redeploy

WEEK 1        ── sdk.enhanceQuery() implementation
              ── Redis KB metadata cache
              ── Replace hardcoded system prompt with dynamic IPFS fetch

WEEK 2        ── Publisher agent
              ── IPFS multi-provider pinning
              ── Verification CLI

WEEK 3        ── Validator agent
              ── Generator agent
              ── Multi-wallet infrastructure
              ── Begin 10k KB generation run

WEEK 4        ── MVP SaaS: auth, KB browser, earnings dashboard
              ── Duplicate detection vector index

M2            ── Deterministic subgraph (replay/reorg harness + derived signals)
              ── IPFS artifact binding + verify-kb-artifact CLI
              ── Gas benchmark report + optimization pass
              ── Economic Signal Explorer (lineage + settlement UI)
              ── Agent reference integrations (2×)
              ── Participation layer (unstaked → staked upgrade path; demand signals; bounties)
              ── Full SaaS (versioning, collections, contributor profiles)
              ── Subscription access tier (contract upgrade)
              ── Endorser bonds (contract upgrade)
              ── npm publish SDK packages
              ── Restore setMinStake(1e15) when graph density target reached
```

---

## 11 · M2 Deliverables — Funding-Optimized Execution

**Purpose:** Convert M2 from conceptual expansion to infrastructure-hardening deliverables that maximize grant confidence and funding probability. Every item maps to a specific reviewer concern (see funding readiness gate in 11.7).

**Minimum non-negotiable M2 package (max funding leverage):**
1. Deterministic replay-tested subgraph (11.1)
2. CID verification CLI + pinning policy (11.2)
3. Gas benchmark + optimization report (11.3)

---

### [ ] 11.1 — Deterministic Subgraph With Derived Economic Signals

**Why:** Turns The Graph from indexing plumbing into protocol-critical discovery. Demonstrates operational determinism beyond happy-path indexing. Reviewer test: "Subgraph is just analytics?" — must show it as the discovery and query plane, not a dashboard substitute.

**Deliverables:**

#### [ ] 11.1a — Materialized derived fields in schema
Confirm all of the following are live and populated in the deployed subgraph:
- `totalSettledValue` — cumulative ETH received by this KB
- `settlementCount` — number of times this KB was settled against
- `uniquePayerCount` — distinct payer addresses
- `childCount` — number of KBs that cite this KB as a parent
- `lineageDepth` — depth from root seed in the DAG
- `lastSettledAt` — timestamp of most recent settlement
- `royaltyEarned` — ETH flowing to this KB via parent royalty routes

Run a query against the live subgraph endpoint and confirm each field returns non-null values for at least 3 KBs.

#### [ ] 11.1b — Replay + reorg determinism harness
**Files to create:** `packages/subgraph/tests/replay/`

Build and run:
- **Full block replay test:** re-index from genesis block to current tip, diff entity snapshots before and after — must be byte-identical.
- **Fork/reorg simulation:** replay a synthetic reorg (5 blocks), confirm entity state rolls back and re-applies correctly.
- **Deterministic entity hash verification:** for each `KnowledgeBlock`, compute a hash of all indexed fields and confirm it matches across two independent re-index runs.
- **`reindex-and-diff` script:** `scripts/reindex-and-diff.sh` — re-indexes locally, compares to last snapshot, exits 0 if identical.

**Output:** publish the reindex-and-diff result as a reproducible artifact (JSON snapshot + diff report) in `docs/subgraph-determinism-report.json`.

#### [ ] 11.1c — Public agent-grade query library
**File to create:** `packages/subgraph/queries/discovery.graphql`

Five named queries that reviewers and integrators can copy-paste:
1. `MostReusedKBsByDomain` — top 10 by `childCount` per domain
2. `MostEconomicallyActiveKBs` — top 10 by `totalSettledValue`
3. `HighestDerivationDensity` — top 10 by `lineageDepth` with `childCount > 0`
4. `CrossDomainReuse` — KBs with `childCount > 2` across distinct domains
5. `HighestUniquePayers` — top 10 by `uniquePayerCount` (breadth of adoption)

Host these in the public subgraph playground URL and link from README.

---

### [ ] 11.2 — IPFS Artifact Binding + Verification CLI

**Why:** Converts IPFS from "storage mention" to enforceable integrity layer. Reviewer test: "What if IPFS availability fails?" — identity is independent of location; CID/hash is authoritative.

**Deliverables:**

#### [ ] 11.2a — `verify-kb-artifact` CLI
**File:** `packages/generator/scripts/verify-kb-artifact.mjs`

Four-step verification pipeline for every KB:
1. **Fetch** — retrieve artifact bytes from CID via IPFS gateway (try all 3 gateways in fallback order)
2. **Hash** — compute `keccak256("alexandrian.kb.v2.5" + canonicalize(artifact))`
3. **Compare** — diff computed hash against the `contentHash` stored on-chain (via `contract.getArtifactHash(contentHash)`)
4. **Verdict** — print `✓ verified` or `✗ invalid: hash mismatch` with diff details

```bash
# Verify a single KB by contentHash
node scripts/verify-kb-artifact.mjs 0xabc123...

# Verify all 4 KB-ENG demo artifacts
node scripts/verify-kb-artifact.mjs --demo

# Verify all KBs indexed by subgraph
node scripts/verify-kb-artifact.mjs --all
```

**Output format:** JSONL report written to `staging/verification-report.jsonl` (one line per KB: `{ contentHash, cid, status, hashMatch, gateway, ms }`).

#### [ ] 11.2b — Multi-pin redundancy policy (operational runbook)
**File to create:** `docs/ipfs-pinning-policy.md`

Document and enforce:
- **Primary provider:** Pinata (current) — JWT-authenticated, retry with backoff
- **Secondary provider:** Filebase or Pinata v2 PSA (already implemented in publish.mjs) — best-effort, non-blocking
- **Local fallback:** `ipfs pin add` on a local IPFS node (for disaster recovery)
- **Size/fetch limits:** max 2 MB per artifact, 5s fetch timeout per gateway, 3 gateways tried
- **Verification policy:** after every publish run, run `verify-kb-artifact --all` and fail the pipeline if > 1% of CIDs are unreachable

#### [ ] 11.2c — Mandatory CID binding enforcement in publish pipeline
**File:** `packages/generator/scripts/publish.mjs`

Add preflight assertion before `contract.publishKB()`:
```javascript
if (!cid || cid.startsWith("placeholder-")) {
  throw new Error(`CID binding required: KB ${contentHash.slice(0, 10)} has no real CID. Pin to IPFS first.`);
}
```

Zero-tolerance policy: no KB may reach the chain without a verified, pinned CIDv1.

---

### [ ] 11.3 — Base Gas-Optimized Settlement Path

**Why:** Base reviewers heavily weight economic efficiency and practical transaction viability. Must have measurable before/after deltas to satisfy "show concrete numbers" reviewer expectation.

**Deliverables:**

#### [ ] 11.3a — Gas benchmark report
**File to create:** `docs/gas-benchmark-report.md`

Measure and document gas costs for each contract function under realistic conditions:
- `publishKB` — with 0 parents, 2 parents, 8 parents (max); with and without embeddingCid
- `settleQuery` — with 1 KB settled, with 4 KBs (royalty DAG traversal)
- `withdraw` — single withdrawal

**Method:** Use Hardhat `hardhat-gas-reporter` or `forge snapshot`. Run 10 measurements per scenario, report mean ± σ. Compare to current Base gas prices to show USD cost per operation.

**Reproducibility:** publish the benchmark script (`scripts/gas-benchmark.ts`) and the raw output so reviewers can re-run it.

#### [ ] 11.3b — Optimization pass
After benchmarking, identify the top 2–3 gas reduction opportunities and implement them. Candidate areas:
- `settleQuery` royalty DAG traversal (currently linear in parent count)
- `publishKB` string storage (domain/version/licenseType as calldata vs storage)
- Event emission size reduction

Document before/after delta in the benchmark report.

#### [ ] 11.3c — Batch settlement feasibility report
Evaluate whether a `settleQueryBatch(bytes32[] calldata contentHashes, address payer)` function is viable:
- estimated gas saving per KB settled
- atomicity tradeoffs
- front-running surface

Write up as an appendix in `docs/gas-benchmark-report.md`. Prototype if the saving is > 30%.

---

### [ ] 11.4 — Minimal Economic Signal Explorer (Dev-Facing)

**Why:** Demonstrates topology and economics as operational surfaces, not theoretical claims. Satisfies "Where is real usage?" reviewer test with a concrete, linkable artifact.

**Deliverables:**

#### [ ] 11.4a — Lineage topology view
Extend `demo/kb-detail.html` (already exists) with a visual DAG panel showing:
- direct parents (with their domains and reputationScore)
- direct children (KBs that cite this one)
- lineage depth indicator
- "KB is a root seed" vs "KB is derived" label

Use a simple force-directed or tree layout (D3 or plain SVG — no heavy dependency).

#### [ ] 11.4b — Settlement activity feed
Add a "Settlement Activity" section to `demo/kb-detail.html`:
- last 10 settlements for this KB from the subgraph `QuerySettlement` entities
- columns: block, payer (truncated), ETH received, royalty routes triggered
- total ETH earned displayed prominently

#### [ ] 11.4c — Payout routing visualization
For each settlement, show how the ETH was routed through the DAG:
- protocol fee (5%)
- royalty to each parent (proportional to `royaltyShareBps`)
- remainder to curator

This makes the economic model legible at a glance and satisfies grant reviewers asking "show me how money moves."

---

### [ ] 11.5 — Agent Reference Integrations

**Why:** Closes the adoption loop with concrete consumer behavior. Satisfies "Where is real usage?" and "Why blockchain at all?" — trustless settlement is only credible when an agent actually settles.

**Deliverables:**

#### [ ] 11.5a — Reference Agent 1: Query-Enhancement Agent
**File:** `packages/sdk-adapters/examples/query-enhancement-agent.ts`

A fully runnable TypeScript agent that:
1. Accepts a user question
2. Calls `sdk.enhanceQuery(question, { domains: [...], limit: 4 })`
3. Fetches the enriched system prompt (KB artifact content injected)
4. Sends to OpenAI with the enriched prompt
5. Calls `sdk.settleQuery(kbsUsed, payerAddress)` after receiving the answer
6. Prints: answer, KB attribution, settlement tx hash, gas used

This agent must run end-to-end on Base mainnet (not fork) with a real KB and real settlement.

#### [ ] 11.5b — Reference Agent 2: KB Discovery Agent
**File:** `packages/sdk-adapters/examples/kb-discovery-agent.ts`

An agent that:
1. Takes a domain string (`engineering.api.security`)
2. Queries the subgraph for the top 5 KBs by `totalSettledValue` in that domain
3. Fetches each artifact from IPFS
4. Verifies each artifact hash against on-chain `contentHash`
5. Outputs a ranked list with: KB ID, title, ETH earned, verification status

Demonstrates the full query → fetch → verify loop without any settlement, suitable for read-only integrations.

**Documentation:** Write a `README.md` in `packages/sdk-adapters/examples/` explaining how to run both agents, with expected output samples.

---

### [ ] 11.6 — Participation & Incentive Design

**Why:** Reduces the cold-start problem. Grant reviewers assess whether the protocol can attract real contributors — not just technical capability but adoption mechanics.

**Principle:** Don't change the core protocol. Reduce friction, increase perceived upside, make contribution legible and rewarding early.

#### [ ] 11.6a — Progressive commitment model (unstaked → staked upgrade)
**UI change:** `demo/kb-publish.html`

- Add a "Quick Publish (Unstaked)" mode that publishes with `msg.value = 0` (works once `setMinStake(0)` is called)
- Label unstaked KBs visually in the registry: `Unstaked · Unverified` badge
- In the publish form, show a "Upgrade to Staked" CTA that re-publishes with a version bump + stake attached
- In the browser, allow filtering by staked status

**Goal:** Staking becomes a visible upgrade, not an entry barrier.

#### [ ] 11.6b — Demand signal surface ("Hot Topics")
**File:** new endpoint or subgraph query

Surface which domains/topics have the most recent settlements but the fewest KBs (supply gap = opportunity). Display in `demo/kb-browser.html` as a "Demand Signals" panel:
- "3 settlements in `engineering.api.security` this week — only 1 KB in this domain"
- "Missing: no KB covering `agent.planning.reflection` — 7 queries unmatched"

#### [ ] 11.6c — Expected value visibility per KB
In `demo/kb-detail.html` and `demo/kb-browser.html`, show for each KB:
- estimated earnings per 100 queries (based on `queryFee` and `settlementCount / timespan`)
- citation impact score (child KBs × avg reputation of children)
- "trending" badge if `settlementCount` grew > 20% in the last 7 days

#### [ ] 11.6d — Contributor profiles
**New page:** `demo/profile.html` at `/profile?address=0x…`

Expose per-curator:
- total ETH earned (from `pendingWithdrawals` + historical settlements)
- KB count, avg reputation, top-earning KB
- citation impact: how many downstream KBs cite their work
- "trusted in X domain" badge: top 3 domains by settlement volume
- stake history and slash history

#### [ ] 11.6e — Bounty / bootstrap reward framework (docs + contract stub)
**File:** `docs/bootstrap-rewards.md`

Document the three early-contributor incentive mechanisms:
1. **Query mining bonus:** first KB in a domain earns 2× `queryFee` for the first 50 settlements (protocol-subsidized from treasury)
2. **Bootstrap pool:** 0.5 ETH protocol treasury allocated to seed active domains — distributed to KBs proportional to settlement count in first 30 days
3. **Bounties:** operator-posted requests for specific KBs (`domain: X, type: ComplianceChecklist`) with a fixed ETH reward on first verified publish

Note which parts require a contract upgrade (query mining multiplier, bounty escrow) vs which can be off-chain for now (bootstrap pool manual distribution).

#### [ ] 11.6f — Refined positioning copy for participation
Update landing page and grant docs with a participation-oriented framing layer:

> **Alexandrian enables anyone to contribute knowledge that is immediately usable by AI systems, transparently attributed, and economically rewarded as it is reused.**

Add role-specific value statements (Authors, Curators, Validators, Consumers) to `demo/kb-eng.html` and the README.

---

### [ ] 11.7 — Funding Readiness Gate

All five items below must be complete and publicly verifiable before M2 grant submission. Each maps to a specific reviewer concern.

| Item | Reviewer Test Addressed | Done? |
|------|------------------------|-------|
| Replay/reorg determinism proof published (`docs/subgraph-determinism-report.json`) | "Subgraph is just analytics?" | [ ] |
| Artifact verification CLI released + documented (`verify-kb-artifact --demo` passes) | "What if IPFS fails?" | [ ] |
| Gas benchmark report published with reproducible method (`docs/gas-benchmark-report.md`) | "Why blockchain? Cost?" | [ ] |
| Public GraphQL endpoint with reference query pack (5 named queries in playground) | "Show me real discovery" | [ ] |
| Two reference agent integrations demonstrated (end-to-end on mainnet) | "Where is real usage?" | [ ] |

**Final pre-submission checklist:**
- [ ] All five items above checked off
- [ ] Contract on Base mainnet — no placeholder or testnet
- [ ] Subgraph live and indexing current block height (< 100 blocks lag)
- [ ] At least 1,000 KBs indexed (density prerequisite for meaningful discovery queries)
- [ ] At least 10 real settlements on-chain (demonstrates live economy)
- [ ] README links to all deliverables with reproducible instructions
- [ ] Grant application references specific contentHashes, tx hashes, and subgraph query URLs — no abstract claims

---

*This document should be updated whenever a significant architectural or product decision is made. It is the single source of truth for implementation direction.*
