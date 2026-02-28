/**
 * Protocol Neutrality Commitment
 *
 * The protocol treats all curators identically. No curator address receives
 * privileged treatment in:
 * - Royalty settlement
 * - Reputation scoring
 * - Query settlement
 * - Economic incentives
 *
 * Verification: grep codebase for FOUNDER, ARCHITECT — should return ZERO
 * results in settlement or economic logic.
 */
export const PROTOCOL_NEUTRALITY = true as const;
