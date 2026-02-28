# full-royalty-share

**Contract/economic layer edge case.** Single parent with 10000 bps (100%) royalty share.

The canonical envelope does not include royalty share; that is configured at Registry registration via `AttributionLink.royaltyShareBps`. This edge case is validated by the Registry contract and economic invariants: a derived KB with one parent at 10000 bps leaves zero for the curator.

To test: register a derived KB with one attribution link at `royaltyShareBps: 10000`. Settlement should send full distributable amount to the parent curator.
