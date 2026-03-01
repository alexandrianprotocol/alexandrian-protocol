# Alexandrian Protocol — Gas Benchmarks

> **Repo path:** `docs/grants/GAS-BENCHMARKS.md`
> **Last updated:** February 2026
> **Network:** Base Mainnet (Chain ID: 8453)
> **Relates to:** `SUSTAINABILITY-MODEL.md` · `COST-SIMULATION.md` · `MAINNET-ADDRESSES.md`

---

## Live Gas Snapshot

| Parameter | Value | Source |
|---|---|---|
| Base gas price | 0.008 Gwei | [BaseScan Gas Tracker](https://basescan.org/gastracker) |
| ETH price | ~$2,500 | February 2026 |
| Minimum base fee | 0.005 Gwei | Base protocol floor (Jovian upgrade) |
| Network status | Near floor — low congestion | |

Base is currently operating near its minimum base fee floor. This is the most favorable gas environment for per-use settlement protocols.

---

## Per-Action Gas Estimates

| Action | Function | Estimated Gas | Cost at 0.008 Gwei | Cost at 0.05 Gwei (busy) |
|---|---|---|---|---|
| Publish KB | `publishKB` | ~150,000 | **~$0.003** | ~$0.019 |
| Settle usage | `settleQuery` | ~200,000 | **~$0.004** | ~$0.025 |
| Withdraw earnings | `withdraw` | ~50,000 | **~$0.001** | ~$0.006 |
| Simple ETH transfer | — | ~21,000 | **~$0.0004** | ~$0.003 |

Gas estimates are based on contract complexity:
- `publishKB` — writes KB identity, lineage edges, and curator address to storage
- `settleQuery` — reads lineage graph, splits ETH across contributors, updates counters
- `withdraw` — transfers accumulated ETH to recipient address

---

## What $25 Buys Per Action

| Action | $25 at current gas (0.008 Gwei) | $25 at busy gas (0.05 Gwei) |
|---|---|---|
| `publishKB` | **~8,300 publishes** | ~1,300 publishes |
| `settleQuery` | **~6,250 settlements** | ~1,000 settlements |
| `withdraw` | **~25,000 withdrawals** | ~4,200 withdrawals |
| Mixed workload (equal split) | **~5,000+ transactions** | ~800+ transactions |

At current gas prices, $25 in gas funds an agent's entire early publishing and settlement activity. The economic commitment per agent is not gas — it is the settlement value itself.

---

## Settlement Value vs Gas Cost

This is the critical ratio. The settlement value (what an agent pays to use a KB) should dominate the gas cost, not the other way around.

| Settlement Value | Gas Cost (settleQuery) | Gas as % of Settlement |
|---|---|---|
| 0.001 ETH ($2.50) | ~$0.004 | **0.16%** |
| 0.002 ETH ($5.00) | ~$0.004 | **0.08%** |
| 0.005 ETH ($12.50) | ~$0.004 | **0.03%** |

Gas is effectively noise relative to the settlement value. The economic signal is clean — agents pay for knowledge, not for block inclusion.

---

## Gas Cost Across Networks (Comparison)

Why Base is a design requirement, not a preference:

| Network | Avg gas (settleQuery equivalent) | Viable for per-use settlement? |
|---|---|---|
| Ethereum L1 | ~$2.00–$10.00 | ✗ — gas exceeds settlement value |
| Arbitrum | ~$0.01–$0.03 | ✓ — viable but higher than Base |
| Base | **~$0.003–$0.025** | ✓ ✓ — optimal |
| Solana | ~$0.0001 | ✓ — but non-EVM, no ETH-native settlement |

At L1 gas prices, `settleQuery` costs more than the settlement value itself — the per-use model is economically unviable. Base is the only EVM chain where per-use royalty routing is practical at agent scale.

---

## Stress Test: High Congestion Scenario

Base gas has spiked during high-activity periods. Worst-case planning:

| Scenario | Gas price | settleQuery cost | Settlement value (0.002 ETH) | Gas as % |
|---|---|---|---|---|
| Current (floor) | 0.008 Gwei | $0.004 | $5.00 | 0.08% |
| Normal activity | 0.05 Gwei | $0.025 | $5.00 | 0.5% |
| High congestion | 0.5 Gwei | $0.25 | $5.00 | 5% |
| Extreme spike | 5.0 Gwei | $2.50 | $5.00 | 50% |

Even at 10× normal activity (0.5 Gwei), gas is 5% of settlement value — still viable. The model only breaks at extreme L1-level congestion, which Base is architecturally designed to avoid.

---

## Implications for the Sustainability Model

- **Infrastructure costs are negligible** — at current gas, the protocol's own `publishKB` costs are ~$0.003/KB. 10,000 KBs/month = $30 in protocol gas.
- **Agent onboarding is frictionless** — $25 funds thousands of agent operations. The barrier to entry is the settlement value commitment, not gas overhead.
- **Revenue scales with settlement value, not gas** — protocol fee revenue is 2–5% of settlement value. Gas costs are 0.08–0.5% of settlement value. The spread is the economic engine.
- **Consumer-pays holds at all realistic congestion levels** — even at 10× current gas, the agent paying to settle a query bears a cost that is a small fraction of the settlement value

---

## References

- [BaseScan Gas Tracker](https://basescan.org/gastracker) — live gas price
- [Base Network Fees Documentation](https://docs.base.org/base-chain/network-information/network-fees) — minimum base fee and EIP-1559 parameters
- [`SUSTAINABILITY-MODEL.md`](SUSTAINABILITY-MODEL.md) — revenue and profitability model
- [`COST-SIMULATION.md`](COST-SIMULATION.md) — three-scenario infrastructure cost breakdown
- [`MAINNET-ADDRESSES.md`](../ops/MAINNET-ADDRESSES.md) — deployed contract addresses
