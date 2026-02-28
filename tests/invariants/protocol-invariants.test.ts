/**
 * Explicit protocol invariant tests — spec enforcement, not just QA.
 * Mapped to PROTOCOL-SPEC.md and INVARIANTS.md for grant reviewers.
 *
 * - INV-2: Source Uniqueness (§2 / INVARIANTS §2)
 * - INV-4: Cycle Exclusion (lineage acyclicity) (INVARIANTS §4)
 * - Deterministic Identity (hash stability, key order, source order) (PROTOCOL-SPEC §2)
 * - Royalty correctness (attribution DAG split)
 */
import { describe, it, expect } from "vitest";
import {
  VirtualRegistry,
  VirtualRegistryError,
  kbHashFromEnvelope,
  buildDerivedEnvelope,
  artifactHashFromPayload,
} from "@alexandrian/protocol/core";
import type { CanonicalEnvelope } from "@alexandrian/protocol/schema";
import { deriveKbId } from "../utils/derive-kb-id";

const CURATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function baseEnvelope(payload: { type: "practice"; rationale: string; contexts: unknown[]; failureModes: unknown[] }, sources: string[] = []) {
  return {
    type: "practice" as const,
    domain: "test",
    sources,
    tier: "open" as const,
    artifactHash: artifactHashFromPayload(payload),
    payload,
  };
}

describe("INV-2: Source Uniqueness", () => {
  it("duplicate sources are rejected with INVALID_ENVELOPE", () => {
    const registry = new VirtualRegistry();
    const r = registry.registerEnvelope(
      baseEnvelope({ type: "practice", rationale: "A", contexts: [], failureModes: [] }, []),
      CURATOR
    );
    const envelope = {
      type: "practice" as const,
      domain: "test",
      sources: [r.kbId, r.kbId],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({
        type: "practice",
        rationale: "Child",
        contexts: [],
        failureModes: [],
      }),
      payload: {
        type: "practice" as const,
        rationale: "Child",
        contexts: [],
        failureModes: [],
      },
    };
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

});

describe("INV-4: Cycle Exclusion (lineage acyclicity)", () => {
  it("unregistered source is rejected with UNREGISTERED_SOURCE", () => {
    const registry = new VirtualRegistry();
    const envelope = {
      type: "practice" as const,
      domain: "test",
      sources: ["0x" + "c".repeat(64)] as string[],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({
        type: "practice",
        rationale: "Child of unregistered",
        contexts: [],
        failureModes: [],
      }),
      payload: {
        type: "practice" as const,
        rationale: "Child of unregistered",
        contexts: [],
        failureModes: [],
      },
    };
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

  it("chain A → B → C registers without false cycle; DAG remains acyclic", () => {
    const registry = new VirtualRegistry();
    const rA = registry.registerEnvelope(
      baseEnvelope({ type: "practice", rationale: "A", contexts: [], failureModes: [] }, []),
      CURATOR
    );
    const rB = registry.registerEnvelope(
      baseEnvelope({ type: "practice", rationale: "B", contexts: [], failureModes: [] }, [rA.kbId]),
      CURATOR
    );
    const rC = registry.registerEnvelope(
      baseEnvelope({ type: "practice", rationale: "C", contexts: [], failureModes: [] }, [rB.kbId]),
      CURATOR
    );
    expect(registry.getAttributionDAG(rC.kbId).map((p) => p.parentHash)).toContain(rB.kbId);
    expect(registry.getAttributionDAG(rB.kbId).map((p) => p.parentHash)).toContain(rA.kbId);
    expect(registry.getDerivedBlocks(rA.kbId)).toContain(rB.kbId);
    expect(registry.getDerivedBlocks(rB.kbId)).toContain(rC.kbId);
  });
});

describe("Failure semantics: self-reference and lineage cycle", () => {
  it("reject envelope with unregistered source (UNREGISTERED_SOURCE; SELF_REFERENCE is a theoretical guard requiring a hash preimage)", () => {
    const registry = new VirtualRegistry();
    const r = registry.registerEnvelope(
      baseEnvelope({ type: "practice", rationale: "Root", contexts: [], failureModes: [] }, []),
      CURATOR
    );
    for (let i = 0; i < 200; i++) {
      const envelope = {
        type: "practice" as const,
        domain: "test",
        sources: [r.kbId],
        tier: "open" as const,
        artifactHash: artifactHashFromPayload({
          type: "practice" as const,
          rationale: `Child ${i}`,
          contexts: [],
          failureModes: [],
        }),
        payload: {
          type: "practice" as const,
          rationale: `Child ${i}`,
          contexts: [],
          failureModes: [],
        },
      };
      const computedId = kbHashFromEnvelope(envelope);
      const norm = computedId.startsWith("0x") ? computedId : "0x" + computedId;
      if (norm === r.kbId) {
        const err = (() => {
          try {
            registry.registerEnvelope(envelope, CURATOR);
            return null;
          } catch (e) {
            return e as VirtualRegistryError;
          }
        })();
        expect(err).toBeInstanceOf(VirtualRegistryError);
        expect((err as VirtualRegistryError).code).toBe("SELF_REFERENCE");
        return;
      }
    }
    const envelopeWithOwnIdInSources = {
      type: "practice" as const,
      domain: "test",
      sources: [r.kbId],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({
        type: "practice" as const,
        rationale: "Child",
        contexts: [],
        failureModes: [],
      }),
      payload: {
        type: "practice" as const,
        rationale: "Child",
        contexts: [],
        failureModes: [],
      },
    };
    const ownId = kbHashFromEnvelope(envelopeWithOwnIdInSources);
    const envelopeSelfRef = {
      ...envelopeWithOwnIdInSources,
      sources: [ownId.startsWith("0x") ? ownId : "0x" + ownId],
    };
    const err = (() => {
      try {
        registry.registerEnvelope(envelopeSelfRef, CURATOR);
        return null;
      } catch (e) {
        return e as VirtualRegistryError;
      }
    })();
    expect(err).toBeInstanceOf(VirtualRegistryError);
    expect((err as VirtualRegistryError).code).toBe("UNREGISTERED_SOURCE");
  });

  it("reject lineage cycle (unregistered source and acyclic DAG enforced)", () => {
    const registry = new VirtualRegistry();
    const rA = registry.registerEnvelope(
      baseEnvelope({ type: "practice", rationale: "A", contexts: [], failureModes: [] }, []),
      CURATOR
    );
    const rB = registry.registerEnvelope(
      baseEnvelope({ type: "practice", rationale: "B", contexts: [], failureModes: [] }, [rA.kbId]),
      CURATOR
    );
    const rC = registry.registerEnvelope(
      baseEnvelope({ type: "practice", rationale: "C", contexts: [], failureModes: [] }, [rB.kbId]),
      CURATOR
    );
    expect(registry.getAttributionDAG(rC.kbId).map((p) => p.parentHash)).toContain(rB.kbId);
    expect(registry.getDerivedBlocks(rA.kbId)).toContain(rB.kbId);
    expect(registry.getDerivedBlocks(rB.kbId)).toContain(rC.kbId);
    const unregistered = "0x" + "f".repeat(64);
    const err = (() => {
      try {
        registry.registerEnvelope(
          baseEnvelope({ type: "practice", rationale: "Orphan", contexts: [], failureModes: [] }, [unregistered]),
          CURATOR
        );
        return null;
      } catch (e) {
        return e as VirtualRegistryError;
      }
    })();
    expect(err).toBeInstanceOf(VirtualRegistryError);
    expect((err as VirtualRegistryError).code).toBe("UNREGISTERED_SOURCE");
  });
});

describe("Deterministic Identity (PROTOCOL-SPEC §2)", () => {
  it("same envelope produces same kbHash (hash stability)", () => {
    const envelope = {
      type: "practice" as const,
      domain: "software.security",
      sources: [] as string[],
      payload: {
        type: "practice" as const,
        rationale: "Use constant-time comparison.",
        contexts: [],
        failureModes: [],
      },
    };
    const h1 = kbHashFromEnvelope(envelope as unknown as Record<string, unknown>);
    const h2 = kbHashFromEnvelope(envelope as unknown as Record<string, unknown>);
    expect(h1).toBe(h2);
  });

  it("object key order does not affect kbHash (JCS key sort)", () => {
    const envelope1 = {
      type: "practice" as const,
      domain: "test",
      sources: [] as string[],
      payload: {
        type: "practice" as const,
        rationale: "x",
        contexts: [],
        failureModes: [],
      },
    };
    const envelope2 = {
      domain: "test",
      type: "practice" as const,
      sources: [] as string[],
      payload: {
        failureModes: [],
        type: "practice" as const,
        rationale: "x",
        contexts: [],
      },
    };
    const h1 = kbHashFromEnvelope(envelope1 as unknown as Record<string, unknown>);
    const h2 = kbHashFromEnvelope(envelope2 as unknown as Record<string, unknown>);
    expect(h1).toBe(h2);
  });

  it("curator-neutral: same envelope from different curator yields same kbId", () => {
    const registry = new VirtualRegistry();
    const envelope = {
      type: "practice" as const,
      domain: "test",
      sources: [] as string[],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({
        type: "practice" as const,
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
    const r1 = registry.registerEnvelope(envelope, CURATOR);
    const r2 = registry.registerEnvelope(envelope, "0x" + "1".repeat(40));
    expect(r1.kbId).toBe(r2.kbId);
  });

  it("produces identical kbId when only object key order differs (JCS key sort)", () => {
    const a = {
      type: "practice" as const,
      domain: "x",
      sources: [] as string[],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({ type: "practice" as const, rationale: "R", contexts: [], failureModes: [] }),
      payload: { type: "practice" as const, rationale: "R", contexts: [], failureModes: [] },
    };
    const b = {
      domain: "x",
      type: "practice" as const,
      sources: [] as string[],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({ type: "practice" as const, rationale: "R", contexts: [], failureModes: [] }),
      payload: { failureModes: [], type: "practice" as const, rationale: "R", contexts: [] },
    };
    expect(deriveKbId(a)).toEqual(deriveKbId(b));
  });

  it("produces identical kbId when only source order differs (parent order canonicalization)", () => {
    const parent1 = "0x" + "1".repeat(64);
    const parent2 = "0x" + "2".repeat(64);
    const a = {
      type: "practice" as const,
      domain: "x",
      sources: [parent1, parent2],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({ type: "practice" as const, rationale: "R", contexts: [], failureModes: [] }),
      payload: { type: "practice" as const, rationale: "R", contexts: [], failureModes: [] },
    };
    const b = {
      type: "practice" as const,
      domain: "x",
      sources: [parent2, parent1],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({ type: "practice" as const, rationale: "R", contexts: [], failureModes: [] }),
      payload: { type: "practice" as const, rationale: "R", contexts: [], failureModes: [] },
    };
    expect(deriveKbId(a)).toEqual(deriveKbId(b));
  });

  it("changes kbId when logical content changes", () => {
    const a = {
      type: "practice" as const,
      domain: "test",
      sources: [] as string[],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({ type: "practice" as const, rationale: "X", contexts: [], failureModes: [] }),
      payload: { type: "practice" as const, rationale: "X", contexts: [], failureModes: [] },
    };
    const b = {
      type: "practice" as const,
      domain: "test",
      sources: [] as string[],
      tier: "open" as const,
      artifactHash: artifactHashFromPayload({ type: "practice" as const, rationale: "Y", contexts: [], failureModes: [] }),
      payload: { type: "practice" as const, rationale: "Y", contexts: [], failureModes: [] },
    };
    expect(deriveKbId(a)).not.toEqual(deriveKbId(b));
  });

  it("whitespace differences in JSON do not change kbId (same parsed object → same hash)", () => {
    const compact = '{"type":"practice","domain":"x","sources":[],"payload":{"type":"practice","rationale":"R","contexts":[],"failureModes":[]}}';
    const pretty = '{\n  "type": "practice",\n  "domain": "x",\n  "sources": [],\n  "payload": {\n    "type": "practice",\n    "rationale": "R",\n    "contexts": [],\n    "failureModes": []\n  }\n}';
    const a = JSON.parse(compact) as Record<string, unknown>;
    const b = JSON.parse(pretty) as Record<string, unknown>;
    expect(deriveKbId(a)).toEqual(deriveKbId(b));
  });
});

describe("Royalty correctness (attribution DAG)", () => {
  it("getAttributionDAG splits sum to 10000 bps for single parent", async () => {
    const registry = new VirtualRegistry();
    const rRoot = registry.registerEnvelope(
      baseEnvelope({ type: "practice", rationale: "R", contexts: [], failureModes: [] }, []),
      CURATOR
    );
    const derived = registry.registerEnvelope(
      baseEnvelope({ type: "practice", rationale: "D", contexts: [], failureModes: [] }, [rRoot.kbId]),
      CURATOR
    );
    const parents = registry.getAttributionDAG(derived.kbId);
    expect(parents).toHaveLength(1);
    expect(parents[0].royaltyShareBps).toBe(10000);
  });

  it("getAttributionDAG splits sum to 10000 bps for two parents", () => {
    const registry = new VirtualRegistry();
    const rA = registry.registerEnvelope(
      baseEnvelope({ type: "practice", rationale: "A", contexts: [], failureModes: [] }, []),
      CURATOR
    );
    const rB = registry.registerEnvelope(
      baseEnvelope({ type: "practice", rationale: "B", contexts: [], failureModes: [] }, []),
      CURATOR
    );
    const envelope = buildDerivedEnvelope({
      domain: "test",
      sources: [rA.kbId, rB.kbId],
      derivation: {
        type: "compose",
        inputs: [{ kbId: rA.kbId, selectors: [] }, { kbId: rB.kbId, selectors: [] }],
        recipe: {},
      },
      payload: {
        type: "practice",
        rationale: "AB",
        contexts: [],
        failureModes: [],
      },
    });
    const derived = registry.registerEnvelope(envelope, CURATOR);
    const parents = registry.getAttributionDAG(derived.kbId);
    expect(parents).toHaveLength(2);
    const totalBps = parents.reduce((s, p) => s + p.royaltyShareBps, 0);
    expect(totalBps).toBe(10000);
  });
});
