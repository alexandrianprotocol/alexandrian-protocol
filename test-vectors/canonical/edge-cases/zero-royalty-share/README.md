# zero-royalty-share

**Contract/economic layer edge case.** Attribution with 0 bps royalty share.

The canonical envelope does not include royalty share; that is configured at Registry registration via `AttributionLink.royaltyShareBps`. This edge case is validated by the Registry contract and economic invariants, not by the canonical hashing layer.

To test: register a derived KB with an attribution link having `royaltyShareBps: 0`. The contract should accept (no royalty to that parent) and settlement should distribute correctly.
