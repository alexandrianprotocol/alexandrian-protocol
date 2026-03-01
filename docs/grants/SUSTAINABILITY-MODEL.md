# Alexandrian Protocol — Sustainability Model

> **Repo path:** `docs/grants/SUSTAINABILITY-MODEL.md`  
> **Status:** M2 planning · M3 design  
> **Relates to:** `M2-FUNDING-EXECUTION-PLAN.md` · `COST-SIMULATION.md`

---

## Overview

Alexandrian's current revenue model relies entirely on per-settlement protocol fees (2% of settlement value). At low user counts this is insufficient — the protocol earns ~$75/month at 500 users under current settings.

This document models six structural design changes that shift profitability to low user counts, and defines the implementation path across M2 and M3.

---

## Current State (Baseline)

| Parameter | Value |
|---|---|
| Revenue mechanism | 2% protocol fee on `settleQuery` |
| Min settlement value | 0.001 ETH (~$2.50) |
| Break-even threshold | ~2,000,000 settlements/month |
| Revenue at 500 users | ~$75/month |

**Problem:** Revenue is purely a function of settlement volume. At early adoption, volume is sparse and fees are small. The protocol needs revenue sources that are independent of settlement frequency.

---

## Six Revenue Levers

### 1. KB Registration Fee

Charge a one-time ETH fee when a KB is published via `publishKB`.

| Parameter | Value |
|---|---|
| Fee | 0.002 ETH per KB (~$5) |
| Payable at | `publishKB` call |
| Refundable | No — burns into protocol treasury |
| Secondary benefit | Natural spam filter for low-quality KBs |

**Revenue at 500 KBs/month:** 500 × 0.002 ETH × $2,500 = **$2,500/month**

**Implementation:** Single contract parameter, no changes to identity or lineage semantics. Additive to existing `publishKB` logic.

---

### 2. Agent Subscription

Monthly ETH subscription for agents to access settlement routing and discovery APIs.

| Tier | Price | Includes |
|---|---|---|
| Basic | 0.004 ETH/month (~$10) | `publishKB`, `settleQuery`, basic subgraph lookup |
| Pro | 0.02 ETH/month (~$50) | All Basic + ranked discovery, lineage traversal, settlement signals |
| Enterprise | Custom | Dedicated indexing, SLA, audit trail |

**Revenue at 100 Basic + 20 Pro agents:**
- 100 × $10 = $1,000
- 20 × $50 = $1,000
- **Total: $2,000/month**

**Implementation:** Off-chain subscription gate with on-chain allowlist, or on-chain subscription contract. M3 scope.

---

### 3. Discovery API Tier

The subgraph discovery surface is currently free. Introduce tiered access to high-value query signals.

| Tier | Price | Access |
|---|---|---|
| Free | $0 | Basic `contentHash` lookup |
| Signal | $20/month | Settlement counts, lineage depth, unique payer counts |
| Full | $50/month | All signals + domain clustering, curator scores, ranked discovery |

**Revenue at 50 Signal + 20 Full subscribers:**
- 50 × $20 = $1,000
- 20 × $50 = $1,000
- **Total: $2,000/month**

**Implementation:** API key gate over subgraph endpoint. M3 scope. Does not affect on-chain protocol.

---

### 4. Curation Staking

Require KB publishers to stake ETH to activate settlement routing on a KB. Stake is returned on KB deprecation.

| Parameter | Value |
|---|---|
| Stake requirement | 0.01 ETH per KB (~$25) |
| Locked duration | Until KB deprecated or 12 months |
| Yield source | Protocol treasury deployment (staking/restaking) |
| Secondary benefit | Quality signal — staked KBs are economically committed |

**Treasury size at 5,000 staked KBs:** 5,000 × 0.01 ETH = 50 ETH  
**Yield at 3% APY:** 1.5 ETH/year = ~$3,750/year passively  
**At 50,000 staked KBs:** 500 ETH → ~$37,500/year passive yield

**Implementation:** Staking escrow contract. M3 scope. Stake does not affect `kbHash` identity — purely economic layer on top.

---

### 5. Progressive Lineage Fee

Replace flat 2% protocol fee with a fee that scales with lineage depth. Deeper KBs carry more accumulated attribution value and command a higher protocol cut.

| Lineage Depth | Protocol Fee |
|---|---|
| Root (depth 0) | 2% |
| Depth 1–2 | 3% |
| Depth 3–4 | 4% |
| Depth 5+ | 5% |

**Revenue impact at 50,000 settlements/month with weighted avg depth:**
- Flat 2%: ~$2,500/month
- Progressive (weighted avg 3.5%): ~$4,375/month
- **+75% revenue, same settlement volume**

**Implementation:** Fee lookup table in contract keyed to lineage depth. Lineage depth is already enforced on-chain. M2/M3 scope.

---

### 6. Treasury Yield on Staked ETH

ETH accumulated in the protocol treasury (from registration fees, curation stakes, and unclaimed royalties) can be deployed to generate passive yield.

| Source | ETH at 1,000 users |
|---|---|
| Registration fees (accumulated) | ~5 ETH |
| Curation stakes | ~10 ETH |
| Unclaimed royalties (float) | ~2 ETH |
| **Total deployable** | **~17 ETH** |

**Yield at 3% APY:** ~0.51 ETH/year → ~$1,275/year  
**At 10,000 users:** ~170 ETH deployed → ~$12,750/year passive

**Implementation:** Treasury contract with yield strategy (e.g., Lido stETH, EigenLayer restaking). M3 scope.

---

## Revised Break-Even Analysis

### With All Six Levers Active (500 users, 500 KBs/month)

| Revenue Source | Monthly |
|---|---|
| Settlement fees (2% progressive avg 3.5%, 5K settlements) | ~$438 |
| KB registration fees (500 KBs × $5) | $2,500 |
| Agent subscriptions (100 Basic + 20 Pro) | $2,000 |
| Discovery API tier (50 Signal + 20 Full) | $2,000 |
| Treasury yield (17 ETH × 3% APY) | ~$106 |
| **Total monthly revenue** | **~$7,044** |

**Monthly infrastructure cost at this scale:** ~$95  
**Net: +$6,949/month at 500 users**

---

## Profitability Scenarios — Revised

*Applying all six levers*

| Scenario | Users | Settlements/month | Monthly Revenue | Monthly Cost | **Net** |
|---|---|---|---|---|---|
| M2 Launch | 50 | 500 | ~$1,200 | ~$95 | **+$1,105** |
| Early Growth | 500 | 5,000 | ~$7,044 | ~$800 | **+$6,244** |
| Growth | 5,000 | 50,000 | ~$45,000 | ~$4,500 | **+$40,500** |
| High Scale | 50,000 | 500,000 | ~$380,000 | ~$45,000 | **+$335,000** |

---

## Implementation Roadmap

| Lever | Scope | Effort | Revenue Impact |
|---|---|---|---|
| Progressive lineage fee | M2 | Low — contract param | +75% on existing settlements |
| Min settlement floor (0.002 ETH) | M2 | Minimal — single param | 2× settlement revenue |
| KB registration fee | M2/M3 | Low — additive to publishKB | High — independent of volume |
| Agent subscription | M3 | Medium — allowlist + gate | High — recurring, predictable |
| Discovery API tier | M3 | Medium — API key gate | Medium — scales with usage |
| Curation staking | M3 | High — escrow contract | Long-term — treasury compounding |
| Treasury yield | M3 | High — yield strategy | Passive — scales with treasury |

**M2 priority (low effort, high impact):**
1. Set minimum settlement floor to 0.002 ETH
2. Implement progressive lineage fee (2–5% by depth)
3. Add KB registration fee (0.002 ETH per KB)

These three changes alone take M2 launch from -$70/month to approximately **+$1,000/month** at 50 users — before any subscription or API revenue.

---

## Key Design Principles

- **Consumer-pays** — gas costs for `settleQuery` and `withdraw` are borne by agents, not the protocol
- **Revenue diversification** — no single revenue source; settlement fees, registration fees, subscriptions, and yield are independent
- **Non-extractive** — fees are transparent, enforced in contract, and scale with value delivered
- **Identity-invariant** — none of these changes touch `kbHash` semantics, lineage rules, or settlement routing logic. The economic layer is additive

---

## Future: Governance Token (M4+)

> This section is intentionally separated from M2/M3 levers. A governance token is not required for sustainability and does not replace ETH as the settlement currency.

As the protocol matures, progressive decentralization of parameter governance becomes viable. A governance token would cover:

| Governance Surface | What It Controls |
|---|---|
| Fee rates | Protocol fee %, registration fee, subscription pricing |
| Settlement floor | Minimum `settleQuery` value by domain or KB type |
| Lineage fee weights | Fee multiplier table by depth |
| Treasury strategy | Yield deployment, staking targets |
| Curation weights | Signal multipliers for domain clustering |

**What the token is not:**
- Not a payment token — ETH remains the sole settlement currency
- Not required to use the protocol — agents pay in ETH, not governance tokens
- Not inflationary by design — governance rights, not yield extraction

**Why ETH-native must remain the core:**
The protocol's value proposition to Base and Coinbase is that it generates recurring ETH-denominated on-chain activity driven by utility. Introducing a payment token breaks this. A governance token that controls parameters — but never touches the settlement path — preserves the ETH-native claim entirely.

**Framing for future grants:**
> Alexandrian settles in ETH. Governance of protocol parameters is progressively decentralized via a governance token. The two are structurally separate — settlement economics are immutable by governance design.

**Timeline:** M4+ — after the sustainability levers in M3 are live and generating consistent revenue. Governance decentralization should follow demonstrated utility, not precede it.

---

## Relation to Grant Applications

| Grant | Relevance |
|---|---|
| Base / Coinbase | Demonstrates sustainable on-chain activity driven by utility, not speculation |
| The Graph | Subscription and API tier create sustained subgraph query demand independent of settlement volume |
| IPFS | Registration fee creates economic commitment to artifact persistence |

**Canonical reference:** This document is the sustainability annex to `M2-FUNDING-EXECUTION-PLAN.md`. M3 scope items require separate funding or revenue reinvestment.
