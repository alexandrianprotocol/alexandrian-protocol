/**
 * KB-003 — Lineage DAG: parent constraints, acyclicity, derivation consistency.
 * MAX_PARENTS=8 enforced on-chain (see packages/protocol/test/v2/registryV2.test.ts).
 * Primitive-aligned (docs/kb-primitives/KB-003.md).
 */
import { describe, it, expect } from "vitest";
import {
  VirtualRegistry,
  VirtualRegistryError,
  buildDerivedEnvelope,
} from "@alexandrian/protocol/core";
import { makePracticeEnvelope, hashEnv } from "../fixtures";

const CURATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("KB-003 — Lineage DAG", () => {
  describe("4.1 Parent constraints", () => {
    it("exactly 8 sources is allowed (VirtualRegistry accepts; contract enforces 8)", () => {
      const registry = new VirtualRegistry();
      const parents: string[] = [];
      for (let i = 0; i < 8; i++) {
        const p = registry.registerEnvelope(makePracticeEnvelope({ rationale: `P${i}` }), CURATOR);
        parents.push(p.kbId);
      }
      const sourcesSorted = [...parents].sort();
      const childEnv = makePracticeEnvelope({ rationale: "Child of 8", sources: sourcesSorted });
      const result = registry.registerEnvelope(
        childEnv as Parameters<VirtualRegistry["registerEnvelope"]>[0],
        CURATOR
      );
      expect(result.kbId).toBeDefined();
    });

    it("9 sources: VirtualRegistry accepts (no max); contract reverts with TooManyParents", () => {
      const registry = new VirtualRegistry();
      const parents: string[] = [];
      for (let i = 0; i < 9; i++) {
        const p = registry.registerEnvelope(makePracticeEnvelope({ rationale: `P${i}` }), CURATOR);
        parents.push(p.kbId);
      }
      const childEnv = makePracticeEnvelope({ rationale: "Child of 9", sources: [...parents].sort() });
      const result = registry.registerEnvelope(childEnv, CURATOR);
      expect(result.kbId).toBeDefined();
    });
  });

  describe("4.2 Acyclicity", () => {
    it("source not in registry is rejected (UNREGISTERED_SOURCE)", () => {
      const registry = new VirtualRegistry();
      const r = registry.registerEnvelope(makePracticeEnvelope({ rationale: "R" }), CURATOR);
      // Construct an envelope whose computed kbId is used as a source.
      // Changing sources changes the kbId, so this is never actually a self-reference —
      // it is an unregistered-source scenario (SELF_REFERENCE requires a hash preimage).
      const envelopeWithSelf = makePracticeEnvelope({ rationale: "Self", sources: [r.kbId] });
      const selfId = hashEnv(envelopeWithSelf);
      const envelopeSelfRef = { ...envelopeWithSelf, sources: [selfId] };
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

    it("unregistered source is rejected with UNREGISTERED_SOURCE", () => {
      const registry = new VirtualRegistry();
      const rA = registry.registerEnvelope(makePracticeEnvelope({ rationale: "A" }), CURATOR);
      const unregistered = "0x" + "f".repeat(64);
      const envelope = makePracticeEnvelope({ rationale: "Child", sources: [rA.kbId, unregistered] });
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
  });

  describe("4.3 Derivation consistency", () => {
    it("derivation input not in sources → INVALID_ENVELOPE", () => {
      const registry = new VirtualRegistry();
      const rA = registry.registerEnvelope(makePracticeEnvelope({ rationale: "A" }), CURATOR);
      const otherId = "0x" + "f".repeat(64);
      const derived = buildDerivedEnvelope({
        domain: "test",
        sources: [rA.kbId],
        derivation: {
          type: "compose",
          inputs: [
            { kbId: rA.kbId, selectors: [] as string[] },
            { kbId: otherId, selectors: [] as string[] },
          ],
          recipe: {},
        },
        payload: {
          type: "synthesis" as const,
          question: "Q",
          answer: "A",
          citations: { [rA.kbId]: "x" },
        },
      });
      const err = (() => {
        try {
          registry.registerEnvelope(derived, CURATOR);
          return null;
        } catch (e) {
          return e as VirtualRegistryError;
        }
      })();
      expect(err).toBeInstanceOf(VirtualRegistryError);
      expect((err as VirtualRegistryError).code).toBe("INVALID_ENVELOPE");
    });
  });
});
