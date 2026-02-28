/**
 * KB-004 — Verification & retrieval: trust-by-recomputation, partial vs full.
 * Primitive-aligned (docs/kb-primitives/KB-004.md).
 */
import { describe, it, expect } from "vitest";
import {
  VirtualRegistry,
  kbHashFromEnvelope,
  artifactHashFromPayload,
} from "@alexandrian/protocol/core";

const CURATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function practiceEnvelope(rationale: string, sources: string[] = []) {
  const payload = {
    type: "practice" as const,
    rationale,
    contexts: [] as string[],
    failureModes: [] as string[],
  };
  return {
    type: "practice" as const,
    domain: "test",
    sources,
    tier: "open" as const,
    artifactHash: artifactHashFromPayload(payload),
    payload,
  };
}

type VerificationStatus = "VALID" | "INVALID" | "PARTIAL" | "REJECT";

function verifyEnvelope(
  envelope: Record<string, unknown>,
  claimedHash: string,
  registry: VirtualRegistry
): { status: VerificationStatus; computedHash: string } {
  const computedHash = kbHashFromEnvelope(envelope);
  const normalizedClaimed = claimedHash.startsWith("0x") ? claimedHash : "0x" + claimedHash;
  if (computedHash !== normalizedClaimed) {
    return { status: "INVALID", computedHash };
  }
  const sources = (envelope.sources as string[]) ?? [];
  for (const s of sources) {
    const id = s.startsWith("0x") ? s : "0x" + s;
    if (!registry.getKB(id).exists) {
      return { status: "PARTIAL", computedHash };
    }
  }
  return { status: "VALID", computedHash };
}

describe("KB-004 — Verification & retrieval", () => {
  describe("5.1 Recompute identity", () => {
    it("valid envelope → computed hash matches claimed (VALID)", () => {
      const registry = new VirtualRegistry();
      const env = practiceEnvelope("Verify");
      const claimed = kbHashFromEnvelope(env);
      registry.registerEnvelope(env as any, CURATOR);
      const { status } = verifyEnvelope(env, claimed, registry);
      expect(status).toBe("VALID");
    });

    it("single byte mutation in payload → mismatch (INVALID)", () => {
      const registry = new VirtualRegistry();
      const env = practiceEnvelope("Original");
      const claimed = kbHashFromEnvelope(env);
      const tampered = {
        ...env,
        payload: { ...env.payload, rationale: "Tampered" },
        artifactHash: artifactHashFromPayload({
          type: "practice",
          rationale: "Tampered",
          contexts: [],
          failureModes: [],
        }),
      };
      const { status, computedHash } = verifyEnvelope(tampered as unknown as Record<string, unknown>, claimed, registry);
      expect(status).toBe("INVALID");
      expect(computedHash).not.toBe(claimed);
    });
  });

  describe("5.2 No trusted authority", () => {
    it("recomputation matches on-chain contentHash (no secret required)", () => {
      const env = practiceEnvelope("NoAuthority");
      const computed = kbHashFromEnvelope(env as unknown as Record<string, unknown>);
      const again = kbHashFromEnvelope(env as unknown as Record<string, unknown>);
      expect(computed).toBe(again);
      expect(computed).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });

  describe("5.3 Partial verification", () => {
    it("when parent missing → identity valid, lineage incomplete (PARTIAL)", () => {
      const registry = new VirtualRegistry();
      const parentId = "0x" + "a".repeat(64);
      const env = practiceEnvelope("Child", [parentId]);
      const claimed = kbHashFromEnvelope(env as unknown as Record<string, unknown>);
      const { status } = verifyEnvelope(env as unknown as Record<string, unknown>, claimed, registry);
      expect(status).toBe("PARTIAL");
    });
  });

  describe("5.4 Full verification", () => {
    it("when all parents resolvable and acyclic → VALID", () => {
      const registry = new VirtualRegistry();
      const root = registry.registerEnvelope(practiceEnvelope("Root") as any, CURATOR);
      const env = practiceEnvelope("Child", [root.kbId]);
      const claimed = kbHashFromEnvelope(env as unknown as Record<string, unknown>);
      registry.registerEnvelope(env as any, CURATOR);
      const { status } = verifyEnvelope(env as unknown as Record<string, unknown>, claimed, registry);
      expect(status).toBe("VALID");
    });
  });
});
