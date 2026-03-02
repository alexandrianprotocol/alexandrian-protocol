# Economic Invariants

This page states the protocol's economic invariants. **Serious protocol** = explicit, auditable guarantees.

These invariants define structural and economic correctness only. They do not enforce epistemic truth, ranking, governance, or domain preference. Those layers are intentionally external to this protocol.

---

## Settlement Conserves Value

On every `settleQuery`:

- **Buyer pays** exactly `msg.value` (= KB `queryFee`).
- **Protocol** receives `protocolFee = (msg.value * protocolFeesBps) / 10000`.
- **Distributable** = `msg.value - protocolFee`.
- **Parent royalties** sum to at most the sum of `(distributable * royaltyShareBps/10000)` per parent; remainder goes to the direct curator.
- **No value is created or destroyed:** `protocolFee + parentTotal + curatorAmount (+ any dust to treasury) = msg.value`.

The protocol enforces determinism and value conservation. It does not evaluate truth, quality, or consensus.

---

## Royalties Sum ≤ 10000 bps

For each KB, the sum of `royaltyShareBps` over all attribution links is at most `10000`. The contract enforces this in `publishKB` via `_validateAttributionShares`. The protocol fee is taken from `msg.value` first; parent royalties are then computed as a share of the **distributable** amount.

---

## Reputation Is Deterministic

- Reputation score is computed on-chain in `_recomputeScore` from:
  - `queryVolume`
  - `endorsements`
- Formula is fixed (query weight, endorsement weight; cap 1000). Anyone can recompute the same score from public state. No hidden oracles.

---

## Proofs Are Derivable from Logs

- Every settlement emits `QuerySettled(contentHash, querier, totalFee, protocolFee, queryNonce)`.
- A **proof bundle** (chainId, registry, kbId, querier, queryNonce, txHash, blockNumber) can be derived from the transaction receipt and event logs.
- Third parties can verify that a given proof matches chain state without trusting the SDK.

---

## Free Queries Still Affect Reputation (if Settled)

- If a KB's `queryFee` is `0`, `settleQuery` still updates `queryVolume` and recomputes reputation. Free settlement counts as usage signal.

---

## Pause Is the Only Circuit Breaker

- When `paused == true`, `publishKB` and `settleQuery` revert. Staking (add/withdraw) and endorsements remain callable so users are not stuck. Only the owner (intended: multisig) can pause/unpause.

---

## Out of Scope (M2+)

These invariants are M1. Slashing logic, collective pools, on-chain attestation, and full governance (timelock, reasonCode) are deferred to M2+. **Full list:** [docs/M1-SCOPE-FREEZE.md](docs/M1-SCOPE-FREEZE.md).
