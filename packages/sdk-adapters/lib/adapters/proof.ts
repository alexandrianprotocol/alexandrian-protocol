import type { ProofAdapter } from "./types.js";

/**
 * Stub proof adapter. Replace with deterministic A2A proof middleware.
 */
export class ProofAdapterStub implements ProofAdapter {
  async verifyProof(
    _proof: unknown,
    _chainSnapshot: { blockNumber: number; receipts: Record<string, unknown> }
  ): Promise<{
    valid: boolean;
    checks: {
      versionExists: boolean;
      receiptIncluded: boolean;
      contentHashMatches: boolean;
      isFinalized: boolean;
      isHead: boolean;
    };
    reason?: string;
  }> {
    return {
      valid: false,
      checks: {
        versionExists: false,
        receiptIncluded: false,
        contentHashMatches: false,
        isFinalized: false,
        isHead: false,
      },
      reason: "Not implemented",
    };
  }
}
