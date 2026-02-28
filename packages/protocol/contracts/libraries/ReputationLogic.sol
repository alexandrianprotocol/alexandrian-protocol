// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  ReputationLogic
 * @notice Pure library implementing the Alexandrian deterministic reputation formula.
 *
 * Formula (verifiable off-chain from public state):
 *
 *   queryWeight       = min(500, queryVolume * 2)
 *   endorsementWeight = min(100, endorsements * 20)
 *   score             = min(1000, queryWeight + endorsementWeight)
 *
 * Invariants:
 *   - score is always in [0, 1000]
 *   - score increases monotonically with queryVolume and endorsements
 *   - score == 0 for any KB with zero queries and zero endorsements
 */
library ReputationLogic {

    /**
     * @notice Compute a KB's reputation score from its raw counters.
     * @param queryVolume      Number of paid queries settled against this KB.
     * @param endorsements     Number of endorsements from other registered curators.
     * @return score           Deterministic reputation score in [0, 1000].
     */
    function computeScore(
        uint32 queryVolume,
        uint32 endorsements
    ) internal pure returns (uint16 score) {
        uint256 qw = uint256(queryVolume) * 2;
        if (qw > 500) qw = 500;

        uint256 ew = uint256(endorsements) * 20;
        if (ew > 100) ew = 100;

        uint256 total = qw + ew;
        if (total > 1000) total = 1000;

        score = uint16(total);
    }
}
