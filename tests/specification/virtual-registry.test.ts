/**
 * VirtualRegistry: Protocol Sandbox — stricter-than-mainnet invariants.
 */
import { describe, it, expect } from "vitest";
import { VirtualRegistry, VirtualRegistryError, artifactHashFromPayload } from "@alexandrian/protocol/core";

const CURATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function withDefaults(payload: { type: "practice"; rationale: string; contexts: unknown[]; failureModes: unknown[] }, sources: string[] = []) {
  return {
    type: "practice" as const,
    domain: "test",
    sources,
    tier: "open" as const,
    artifactHash: artifactHashFromPayload(payload),
    payload,
  };
}

describe("VirtualRegistry", () => {
  it("registers practice envelope and returns kbId", async () => {
    const registry = new VirtualRegistry();
    const payload = {
      type: "practice" as const,
      rationale: "Use constant-time comparison.",
      contexts: [],
      failureModes: [],
    };
    const envelope = {
      ...withDefaults(payload, []),
      domain: "software.security",
    };
    const result = await registry.registerEnvelope(envelope, CURATOR);
    expect(result.isNew).toBe(true);
    expect(result.kbId).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(registry.isVerified(result.kbId)).toBe(true);
    expect(registry.getCurator(result.kbId)).toBe(CURATOR);
  });

  it("idempotency: same envelope returns same kbId", async () => {
    const registry = new VirtualRegistry();
    const payload = {
      type: "practice" as const,
      rationale: "Same",
      contexts: [],
      failureModes: [],
    };
    const envelope = withDefaults(payload, []);
    const r1 = await registry.registerEnvelope(envelope, CURATOR);
    const r2 = await registry.registerEnvelope(envelope, "0x" + "1".repeat(40));
    expect(r1.kbId).toBe(r2.kbId);
    expect(r2.isNew).toBe(false);
  });

  it("rejects duplicate sources (INVALID_ENVELOPE)", () => {
    const registry = new VirtualRegistry();
    const r1 = registry.registerEnvelope(
      withDefaults({ type: "practice", rationale: "A", contexts: [], failureModes: [] }, []),
      CURATOR
    );
    const kbId = r1.kbId;
    const envelope = withDefaults(
      { type: "practice", rationale: "Child", contexts: [], failureModes: [] },
      [kbId, kbId]
    );
    const err = (() => {
      try {
        registry.registerEnvelope(envelope, CURATOR);
        return null;
      } catch (e) {
        return e as VirtualRegistryError;
      }
    })();
    expect(err).toBeInstanceOf(VirtualRegistryError);
    expect((err as VirtualRegistryError).code).toBe("INVALID_ENVELOPE");
  });

  it("rejects unsorted sources (SOURCES_NOT_SORTED)", () => {
    const registry = new VirtualRegistry();
    const r1 = registry.registerEnvelope(
      withDefaults({ type: "practice", rationale: "A", contexts: [], failureModes: [] }, []),
      CURATOR
    );
    const r2 = registry.registerEnvelope(
      withDefaults({ type: "practice", rationale: "B", contexts: [], failureModes: [] }, []),
      CURATOR
    );
    const kbId1 = r1.kbId;
    const kbId2 = r2.kbId;
    const [first, second] = [kbId1, kbId2].sort();
    const envelope = withDefaults(
      { type: "practice", rationale: "Child", contexts: [], failureModes: [] },
      [second!, first!]
    );
    let err: VirtualRegistryError | null = null;
    try {
      registry.registerEnvelope(envelope, CURATOR);
    } catch (e) {
      err = e as VirtualRegistryError;
    }
    expect(err).toBeInstanceOf(VirtualRegistryError);
    expect((err as VirtualRegistryError).code).toBe("SOURCES_NOT_SORTED");
  });

  it("rejects unregistered source", () => {
    const registry = new VirtualRegistry();
    const envelope = withDefaults(
      { type: "practice", rationale: "Child of unregistered", contexts: [], failureModes: [] },
      ["0x" + "c".repeat(64)]
    );
    const err = (() => {
      try {
        registry.registerEnvelope(envelope, CURATOR);
        return null;
      } catch (e) {
        return e as VirtualRegistryError;
      }
    })();
    expect(err).toBeInstanceOf(VirtualRegistryError);
    expect((err as VirtualRegistryError).code).toBe("UNREGISTERED_SOURCE");
  });

  it("validates schema: practice requires rationale, contexts, failureModes", () => {
    const registry = new VirtualRegistry();
    const bad = {
      type: "practice" as const,
      domain: "test",
      sources: [] as string[],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({ type: "practice", rationale: "x", contexts: [], failureModes: [] }),
      payload: { type: "practice" as const, rationale: "x" }, // missing contexts, failureModes
    };
    const err = (() => {
      try {
        registry.registerEnvelope(bad as never, CURATOR);
        return null;
      } catch (e) {
        return e as VirtualRegistryError;
      }
    })();
    expect(err).toBeInstanceOf(VirtualRegistryError);
    expect((err as VirtualRegistryError).code).toBe("SCHEMA_INVALID");
  });

  it("reset clears state", () => {
    const registry = new VirtualRegistry();
    const envelope = withDefaults(
      { type: "practice", rationale: "x", contexts: [], failureModes: [] },
      []
    );
    const { kbId } = registry.registerEnvelope(envelope, CURATOR);
    expect(registry.isVerified(kbId)).toBe(true);
    registry.reset();
    expect(registry.isVerified(kbId)).toBe(false);
  });
});
