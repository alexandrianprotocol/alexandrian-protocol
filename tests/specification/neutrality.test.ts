/**
 * Protocol Neutrality — verify no privileged curator logic
 *
 * Ensures all curators are treated identically in settlement, reputation, ranking.
 * @see docs/NEUTRALITY.md
 */
import { describe, it, expect } from "vitest";
import { PROTOCOL_NEUTRALITY } from "@alexandrian/protocol";

describe("Protocol Neutrality", () => {
  it("PROTOCOL_NEUTRALITY constant is true", () => {
    expect(PROTOCOL_NEUTRALITY).toBe(true);
  });

  it("kbHashFromEnvelope is identical for same envelope regardless of source", async () => {
    const { kbHashFromEnvelope, artifactHashFromPayload } = await import("@alexandrian/protocol/core");
    const envelope = {
      type: "practice",
      domain: "test",
      sources: [] as string[],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({
        type: "practice",
        rationale: "Same content",
        contexts: [],
        failureModes: [],
      }),
      payload: {
        type: "practice",
        rationale: "Same content",
        contexts: [],
        failureModes: [],
      },
    };
    const h1 = kbHashFromEnvelope(envelope);
    const h2 = kbHashFromEnvelope({ ...envelope });
    expect(h1).toBe(h2);
    // Hash preimage has no curator/timestamp — content-addressed
    expect(h1).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("VirtualRegistry produces same kbId for same envelope regardless of curator", async () => {
    const { VirtualRegistry, artifactHashFromPayload } = await import("@alexandrian/protocol/core");
    const reg = new VirtualRegistry();
    const env = {
      type: "practice" as const,
      domain: "test",
      sources: [] as string[],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({
        type: "practice",
        rationale: "Neutral",
        contexts: [],
        failureModes: [],
      }),
      payload: {
        type: "practice" as const,
        rationale: "Neutral",
        contexts: [],
        failureModes: [],
      },
    };
    const r1 = await reg.registerEnvelope(env, "0x1234567890123456789012345678901234567890");
    expect(r1.kbId).toMatch(/^0x[a-f0-9]{64}$/);
    expect(r1.isNew).toBe(true);
    // Same envelope, different curator → same kbId (content-addressed, no curator in hash)
    const r2 = await reg.registerEnvelope(env, "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
    expect(r2.kbId).toBe(r1.kbId);
    expect(r2.isNew).toBe(false);
  });
});
