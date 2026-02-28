# Economic invariants

This page states the protocol’s economic invariants. **Serious protocol** = explicit, auditable guarantees.

---

## Settlement conserves value

On every `settleQuery`:

- **Buyer pays** exactly `msg.value` (= KB `queryFee`).
- **Protocol** receives `protocolFee = (msg.value * protocolFeesBps) / 10000`.
- **Distributable** = `msg.value - protocolFee`.
- **Parent royalties** sum to at most the sum of `(distributable * royaltyShareBps/10000)` per parent; remainder goes to the direct curator.
- **No value is created or destroyed:** `protocolFee + parentTotal + curatorAmount (+ any dust to treasury) = msg.value`.

---

## Royalties sum ≤ 10000 bps

For each KB, the sum of `royaltyShareBps` over all attribution links is at most `10000`. The contract enforces this in `publishKB` via `_validateAttributionShares`. The protocol fee is taken from `msg.value` first; parent royalties are then computed as a share of the **distributable** amount.

---

## Reputation is deterministic

- Reputation score is computed on-chain in `_recomputeScore` from:
  - `queryVolume`
  - `endorsements`
- Formula is fixed (query weight, endorsement weight; cap 1000). Anyone can recompute the same score from public state. No hidden oracles.

---

## Proofs are derivable from logs

- Every settlement emits `QuerySettled(contentHash, querier, totalFee, protocolFee, queryNonce)`.
- A **proof bundle** (chainId, registry, kbId, querier, queryNonce, txHash, blockNumber) can be derived from the transaction receipt and event logs.
- Third parties can verify that a given proof matches chain state without trusting the SDK.

---

## Free queries still affect reputation (if settled)

- If a KB’s `queryFee` is `0`, `settleQuery` still updates `queryVolume` and recomputes reputation. Free settlement counts as usage signal.

---

## Pause is the only circuit breaker

- When `paused == true`, `publishKB` and `settleQuery` revert. Staking (add/withdraw) and endorsements remain callable so users are not stuck. Only the owner (intended: multisig) can pause/unpause.

---

## Out of scope (M2+)

These invariants are M1. Slashing logic, collective pools, on-chain attestation, and full governance (timelock, reasonCode) are deferred to M2+. **Full list:** [docs/M1-SCOPE-FREEZE.md](docs/M1-SCOPE-FREEZE.md).
