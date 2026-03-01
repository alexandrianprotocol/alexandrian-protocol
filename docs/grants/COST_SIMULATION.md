# Alexandrian Protocol — Cost & Profit Simulation

## Assumptions

### On-Chain (Base)
| Parameter | Value | Source |
|---|---|---|
| Base tx fee (publishKB) | ~$0.05 | Base avg ~$0.05–$0.10, complex contract call |
| Base tx fee (settleQuery) | ~$0.08 | Higher gas — routes ETH across lineage |
| Base tx fee (withdraw) | ~$0.03 | Simple ETH transfer |
| Settlement value (per query) | 0.001 ETH (~$2.50) | Current M1 live settlement amount |
| Protocol fee | 2% | Enforced in contract |

### The Graph (Subgraph Queries)
| Parameter | Value | Source |
|---|---|---|
| Query cost (Studio hosted) | Free (dev/early) | Subgraph Studio free tier |
| Query cost (decentralized network) | ~$0.000020/query | $20 per million queries, Q1 2025 pricing |
| Indexing reward contribution | Passive — paid by protocol inflation | Graph Network GRT rewards |

### IPFS
| Parameter | Value | Source |
|---|---|---|
| Pinata pinning (per GB/month) | ~$0.15/GB | Pinata Pro pricing |
| Avg KB artifact size | ~5 KB | JSON envelope + metadata |
| Storage per 1,000 KBs | ~5 MB = $0.001/month | Negligible |

---

## Three Scenarios

### Scenario 1 — Early / M2 Launch
*100 agents, 1,000 KBs published, 500 settlements/month*

| Item | Volume | Unit Cost | Monthly Cost |
|---|---|---|---|
| publishKB (Base) | 1,000 | $0.05 | $50 |
| settleQuery (Base) | 500 | $0.08 | $40 |
| withdraw (Base) | 100 | $0.03 | $3 |
| Subgraph queries | 50,000 | $0.00002 | $1 |
| IPFS pinning | 5 MB | $0.001 | <$1 |
| **Total infrastructure cost** | | | **~$95/month** |

**Revenue (protocol fee):**
- 500 settlements × 0.001 ETH × 2% = 0.01 ETH/month
- At $2,500/ETH → **~$25/month protocol revenue**

**Net at M2 launch: ~$70/month cost, offset by grant funding**

---

### Scenario 2 — Growth / 10,000 Agents
*10,000 active agents, 50,000 KBs, 50,000 settlements/month*

| Item | Volume | Unit Cost | Monthly Cost |
|---|---|---|---|
| publishKB (Base) | 5,000 new/month | $0.05 | $250 |
| settleQuery (Base) | 50,000 | $0.08 | $4,000 |
| withdraw (Base) | 5,000 | $0.03 | $150 |
| Subgraph queries | 5,000,000 | $0.00002 | $100 |
| IPFS pinning | 250 MB | $0.04 | $1 |
| **Total infrastructure cost** | | | **~$4,501/month** |

**Revenue (protocol fee):**
- 50,000 settlements × 0.001 ETH × 2% = 1 ETH/month
- At $2,500/ETH → **~$2,500/month protocol revenue**

**Net: ~$2,000/month cost at this scale — break-even approaches as settlement value increases**

---

### Scenario 3 — High Scale / 100,000 Agents
*100,000 active agents, 500,000 KBs, 1,000,000 settlements/month*

| Item | Volume | Unit Cost | Monthly Cost |
|---|---|---|---|
| publishKB (Base) | 50,000 new/month | $0.05 | $2,500 |
| settleQuery (Base) | 1,000,000 | $0.08 | $80,000 |
| withdraw (Base) | 50,000 | $0.03 | $1,500 |
| Subgraph queries | 100,000,000 | $0.00002 | $2,000 |
| IPFS pinning | 2.5 GB | $0.38 | $1 |
| **Total infrastructure cost** | | | **~$86,001/month** |

**Revenue (protocol fee):**
- 1,000,000 settlements × 0.001 ETH × 2% = 20 ETH/month
- At $2,500/ETH → **~$50,000/month protocol revenue**

**Net: ~$36,000/month cost — protocol revenue covers ~58% at current settlement value**

**Break-even point:** Settlement value of 0.0016 ETH (~$4) per query → protocol covers all infrastructure costs at this scale

---

## Key Insight: Cost Structure Is Favorable

| Cost Driver | Scales With | Notes |
|---|---|---|
| Base gas (settleQuery) | Settlement volume | Paid by the *consumer agent*, not the protocol |
| Base gas (publishKB) | KB creation rate | One-time per KB, not recurring |
| Subgraph queries | Discovery activity | Effectively free at current Graph pricing |
| IPFS pinning | Artifact storage | Negligible — KBs are small JSON objects |

**The critical insight:** `settleQuery` gas is paid by the consuming agent, not by the protocol. Protocol infrastructure costs are primarily subgraph queries and IPFS — both negligible. The protocol's cost exposure is almost entirely in KB publishing, which is one-time per KB.

---

## What Reduces Cost Further

- **Settlement value increase** — if average settlement rises from 0.001 ETH to 0.005 ETH, protocol fee revenue 5× without infrastructure cost increase
- **Graph Studio free tier** — subgraph queries are free during development and early production; cost only materializes at significant query volume
- **Base gas trajectory** — Base fees have trended down post-EIP-4844; `settleQuery` at $0.08 is a conservative estimate
- **Consumer-pays model** — gas costs for settlement and withdrawal are borne by agents using the protocol, not by the protocol itself

---

## Summary

| Scenario | Monthly Infra Cost | Protocol Revenue | Net |
|---|---|---|---|
| M2 Launch (500 settlements) | ~$95 | ~$25 | -$70 (grant-funded) |
| Growth (50K settlements) | ~$4,500 | ~$2,500 | -$2,000 |
| High Scale (1M settlements) | ~$86,000 | ~$50,000 | -$36,000 |
| High Scale + $4 avg settlement | ~$86,000 | ~$80,000 | **-$6,000** |
| High Scale + $8 avg settlement | ~$86,000 | ~$160,000 | **+$74,000/month** |

Storage is not the expensive part. Settlement volume on Base is — and that cost is paid by the agents using the protocol, not by Alexandrian itself.

---

## Path to Profitability

Four levers control profitability. None require protocol changes to the identity or lineage rules.

### Lever 1 — Minimum Settlement Floor

Raising the minimum settlement value from 0.001 ETH to 0.002 ETH doubles protocol fee revenue with a single contract parameter change. No new infrastructure, no new users required.

| Min Settlement | Protocol Fee (2%) | Revenue at 1M settlements/month |
|---|---|---|
| 0.001 ETH ($2.50) | $0.05 | $50,000 |
| 0.002 ETH ($5.00) | $0.10 | $100,000 |
| 0.005 ETH ($12.50) | $0.25 | $250,000 |

**Recommendation:** Set minimum settlement floor to 0.002 ETH before M2 launch.

---

### Lever 2 — Protocol Fee Rate

Current fee is 2%. Raising to 3–5% at scale is standard for settlement infrastructure. The fee is enforced in the contract and invisible to agents — they pay the settlement value, the split is automatic.

| Fee Rate | Revenue at 1M settlements × 0.002 ETH |
|---|---|
| 2% | $100,000/month |
| 3% | $150,000/month |
| 5% | $250,000/month |

**Recommendation:** Review fee rate at 10,000 settlements/month milestone. 3% is defensible at that scale.

---

### Lever 3 — Tiered Settlement by Lineage Depth

KBs deeper in the derivation DAG represent more accumulated attribution and more reuse value. Charging more for deeper lineage settlements is architecturally supported today — the lineage depth is already enforced on-chain.

| Lineage Depth | Settlement Multiplier | Effective Settlement |
|---|---|---|
| Root KB (depth 0) | 1× | 0.002 ETH |
| Depth 1–2 | 1.5× | 0.003 ETH |
| Depth 3+ | 2× | 0.004 ETH |

At a weighted average of 0.003 ETH across the DAG, revenue at 1M settlements reaches **$150,000/month** at 3% protocol fee.

---

### Lever 4 — Passive GRT Revenue via Curation Signal

Once the subgraph reaches sustained query volume, curators on The Graph's decentralized network signal GRT on it. The protocol earns a share of query fees passively — no action required. At 100M queries/month this is a small but meaningful additional revenue stream denominated in GRT.

---

## Revised Profitability Scenarios

*Applying: 0.002 ETH min settlement, 3% protocol fee, tiered pricing at 0.003 ETH weighted average*

| Scenario | Settlements/month | Monthly Infra Cost | Protocol Revenue | **Net** |
|---|---|---|---|---|
| M2 Launch | 500 | ~$95 | ~$75 | **-$20** (near break-even) |
| Growth | 50,000 | ~$4,500 | ~$7,500 | **+$3,000/month** |
| High Scale | 1,000,000 | ~$86,000 | ~$150,000 | **+$64,000/month** |
| High Scale + ETH at $5,000 | 1,000,000 | ~$86,000 | ~$300,000 | **+$214,000/month** |

### Break-Even Analysis

| At Current Settings (0.001 ETH, 2%) | Break-even at ~2M settlements/month |
|---|---|
| **At Recommended Settings (0.002 ETH, 3%)** | **Break-even at ~285,000 settlements/month** |

Recommended settings reduce the break-even threshold by 7× — achievable at mid-scale adoption without requiring high-volume agent activity.

---

## What This Means for the Grant

The protocol is not dependent on speculation or token appreciation to become sustainable. Revenue scales directly with knowledge reuse — every settlement is a unit of economic activity generated by utility. Infrastructure costs are predominantly borne by consuming agents, not the protocol.

With a minimum settlement floor of 0.002 ETH and a 3% fee, the protocol reaches positive net revenue at approximately 285,000 settlements per month — a realistic M3 target.
