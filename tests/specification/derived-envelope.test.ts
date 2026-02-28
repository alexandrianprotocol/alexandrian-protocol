/**
 * DerivedBlock / Deterministic Synthesis — canonical envelope and validation.
 */
import { describe, it, expect } from "vitest";
import {
  VirtualRegistry,
  VirtualRegistryError,
  buildDerivedEnvelope,
  kbHashFromEnvelope,
  artifactHashFromPayload,
} from "@alexandrian/protocol/core";

const CURATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function makeEnvelope(payload: { type: "practice"; rationale: string; contexts: unknown[]; failureModes: unknown[] }) {
  return {
    type: "practice" as const,
    domain: "test",
    sources: [] as string[],
    tier: "open" as const,
    artifactHash: artifactHashFromPayload(payload),
    payload,
  };
}

describe("DerivedBlock / Deterministic Synthesis", () => {
  it("buildDerivedEnvelope sorts sources lexicographically", () => {
    const parentB = "0x" + "b".repeat(64);
    const parentA = "0x" + "a".repeat(64);
    const envelope = buildDerivedEnvelope({
      domain: "software.security",
      sources: [parentB, parentA],
      derivation: {
        type: "compose",
        inputs: [
          { kbId: parentA, selectors: ["payload.rationale"] },
          { kbId: parentB, selectors: ["payload.rationale"] },
        ],
        recipe: {},
      },
      payload: {
        type: "practice",
        rationale: "Combined from A and B.",
        contexts: [],
        failureModes: [],
      },
    });
    expect(envelope.sources[0]).toBe(parentA);
    expect(envelope.sources[1]).toBe(parentB);
    expect(envelope.derivation).toBeDefined();
    expect(envelope.derivation!.type).toBe("compose");
    expect(envelope.derivation!.inputs).toHaveLength(2);
  });

  it("kbHashFromEnvelope is deterministic for derived envelope", () => {
    const parent = "0x" + "a".repeat(64);
    const input = {
      domain: "test",
      sources: [parent],
      derivation: {
        type: "transform",
        inputs: [{ kbId: parent, selectors: ["payload.states"] }],
        recipe: { mergeStrategy: "concat" },
      },
      payload: {
        type: "stateMachine",
        states: ["a", "b"],
        transitions: [],
        invariants: [],
      },
    };
    const e1 = buildDerivedEnvelope(input);
    const e2 = buildDerivedEnvelope({ ...input, sources: [parent] });
    const h1 = kbHashFromEnvelope(e1 as unknown as Record<string, unknown>);
    const h2 = kbHashFromEnvelope(e2 as unknown as Record<string, unknown>);
    expect(h1).toBe(h2);
  });

  it("VirtualRegistry rejects derivation input kbId not in sources", () => {
    const registry = new VirtualRegistry();
    const payloadA = { type: "practice", rationale: "A", contexts: [], failureModes: [] };
    const r = registry.registerEnvelope(makeEnvelope(payloadA), CURATOR);
    const envelope = buildDerivedEnvelope({
      domain: "test",
      sources: [r.kbId],
      derivation: {
        type: "compose",
        inputs: [
          { kbId: r.kbId, selectors: [] },
          { kbId: "0x" + "c".repeat(64), selectors: [] }, // not in sources!
        ],
        recipe: {},
      },
      payload: {
        type: "practice",
        rationale: "Child",
        contexts: [],
        failureModes: [],
      },
    });
    expect(() => registry.registerEnvelope(envelope, CURATOR)).toThrow(VirtualRegistryError);
  });

  it("VirtualRegistry accepts valid derived envelope when sources registered", () => {
    const registry = new VirtualRegistry();
    const payloadA = { type: "practice", rationale: "A", contexts: [], failureModes: [] };
    const payloadB = { type: "practice", rationale: "B", contexts: [], failureModes: [] };
    const rA = registry.registerEnvelope(makeEnvelope(payloadA), CURATOR);
    const rB = registry.registerEnvelope(makeEnvelope(payloadB), CURATOR);
    const envelope = buildDerivedEnvelope({
      domain: "test",
      sources: [rA.kbId, rB.kbId],
      derivation: {
        type: "compose",
        inputs: [
          { kbId: rA.kbId, selectors: ["payload.rationale"] },
          { kbId: rB.kbId, selectors: ["payload.rationale"] },
        ],
        recipe: {},
      },
      payload: {
        type: "practice",
        rationale: "Composed from A and B.",
        contexts: [],
        failureModes: [],
      },
    });
    const result = registry.registerEnvelope(envelope, CURATOR);
    expect(result.isNew).toBe(true);
    expect(result.kbId).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });
});
