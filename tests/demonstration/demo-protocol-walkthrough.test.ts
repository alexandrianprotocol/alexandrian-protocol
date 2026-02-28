/**
 * Protocol demo for the walkthrough script — same narrative as scripts/demo.mjs.
 * Run via Vitest so resolution avoids the multiformats require path that fails under Node.
 * Structured with describe blocks and assertions only (no console.log).
 */
import { describe, it, expect } from "vitest";
import {
  VirtualRegistry,
  kbHashFromEnvelope,
  buildDerivedEnvelope,
  cidV1FromEnvelope,
} from "@alexandrian/protocol/core";

const CURATOR = "0x0000000000000000000000000000000000000001";

describe("Protocol demo walkthrough", () => {
  describe("Root KB registration", () => {
    it("produces a deterministic 0x-prefixed 32-byte kbHash", async () => {
      const registry = new VirtualRegistry();
      const rootEnvelope = {
        type: "practice" as const,
        domain: "demo",
        sources: [] as string[],
        payload: {
          type: "practice" as const,
          rationale: "Demo root KB for one-command protocol showcase.",
          contexts: [],
          failureModes: [],
        },
      };
      const rootResult = await registry.registerEnvelope(rootEnvelope, CURATOR);
      const rootHash = rootResult.kbId;
      expect(rootHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(rootResult.isNew).toBe(true);
    });

    it("produces a valid CIDv1 base32 string", async () => {
      const rootEnvelope = {
        type: "practice" as const,
        domain: "demo",
        sources: [] as string[],
        payload: {
          type: "practice" as const,
          rationale: "Demo root KB.",
          contexts: [],
          failureModes: [],
        },
      };
      const rootCid = await cidV1FromEnvelope(rootEnvelope as unknown as Record<string, unknown>);
      expect(rootCid).toMatch(/^baf[a-z2-7]+$/);
    });

    it("stores the curator address", async () => {
      const registry = new VirtualRegistry();
      const rootEnvelope = {
        type: "practice" as const,
        domain: "demo",
        sources: [] as string[],
        payload: {
          type: "practice" as const,
          rationale: "Demo root KB.",
          contexts: [],
          failureModes: [],
        },
      };
      const rootResult = await registry.registerEnvelope(rootEnvelope, CURATOR);
      expect(registry.getCurator(rootResult.kbId)).toBe(CURATOR);
    });

    it("re-registering same envelope returns isNew=false with same kbId", async () => {
      const registry = new VirtualRegistry();
      const rootEnvelope = {
        type: "practice" as const,
        domain: "demo",
        sources: [] as string[],
        payload: {
          type: "practice" as const,
          rationale: "Idempotency demo.",
          contexts: [],
          failureModes: [],
        },
      };
      const first = await registry.registerEnvelope(rootEnvelope, CURATOR);
      const second = await registry.registerEnvelope(rootEnvelope, CURATOR);
      expect(second.isNew).toBe(false);
      expect(second.kbId).toBe(first.kbId);
    });
  });

  describe("Derived KB registration", () => {
    it("produces a different kbId from root", async () => {
      const registry = new VirtualRegistry();
      const rootEnvelope = {
        type: "practice" as const,
        domain: "demo",
        sources: [] as string[],
        payload: {
          type: "practice" as const,
          rationale: "Demo root KB.",
          contexts: [],
          failureModes: [],
        },
      };
      const rootResult = await registry.registerEnvelope(rootEnvelope, CURATOR);
      const derivedEnvelope = buildDerivedEnvelope({
        domain: "demo",
        sources: [rootResult.kbId],
        derivation: {
          type: "compose",
          inputs: [{ kbId: rootResult.kbId, selectors: ["payload.rationale"] }],
          recipe: {},
        },
        payload: {
          type: "synthesis",
          question: "What is this?",
          answer: "A demo.",
          citations: { [rootResult.kbId]: "Demo root KB." },
        },
      });
      const derivedResult = await registry.registerEnvelope(derivedEnvelope, CURATOR);
      expect(derivedResult.kbId).not.toBe(rootResult.kbId);
    });

    it("links parent via sources", async () => {
      const registry = new VirtualRegistry();
      const rootEnvelope = {
        type: "practice" as const,
        domain: "demo",
        sources: [] as string[],
        payload: {
          type: "practice" as const,
          rationale: "Demo root KB.",
          contexts: [],
          failureModes: [],
        },
      };
      const rootResult = await registry.registerEnvelope(rootEnvelope, CURATOR);
      const derivedEnvelope = buildDerivedEnvelope({
        domain: "demo",
        sources: [rootResult.kbId],
        derivation: {
          type: "compose",
          inputs: [{ kbId: rootResult.kbId, selectors: ["payload.rationale"] }],
          recipe: {},
        },
        payload: {
          type: "synthesis",
          question: "What?",
          answer: "Demo.",
          citations: { [rootResult.kbId]: "Demo root KB." },
        },
      });
      const derivedResult = await registry.registerEnvelope(derivedEnvelope, CURATOR);
      const derivedEntry = registry.getKB(derivedResult.kbId);
      expect(derivedEntry.sources).toContain(rootResult.kbId);
    });
  });

  describe("Golden hash (canonical fixture)", () => {
    it("practice-minimal envelope produces known kbHash (regression anchor)", () => {
      // Canonical form of a practice-minimal envelope includes tier and artifactHash
      // (matches test-vectors/canonical/types/practice-minimal/envelope.json)
      const envelope = {
        type: "practice" as const,
        domain: "software.security",
        sources: [] as string[],
        tier: "open" as const,
        artifactHash: "0x5e71fc830e383453429f2b703db3eb456dc4a6bfd66b2a0fc7535330ab8b168a",
        payload: {
          type: "practice" as const,
          rationale: "Use constant-time comparison to prevent timing attacks on tokens.",
          contexts: [],
          failureModes: [],
        },
      };
      const expected = "0x5c3415ff46569330de2d0820b55a31859f2c7efde1df96ce5bb59c731a872d51";
      const hash = kbHashFromEnvelope(envelope as unknown as Record<string, unknown>);
      expect((hash.startsWith("0x") ? hash : "0x" + hash).toLowerCase()).toBe(expected.toLowerCase());
    });
  });

  describe("Determinism", () => {
    it("recomputed hash equals registered kbId", async () => {
      const registry = new VirtualRegistry();
      const rootEnvelope = {
        type: "practice" as const,
        domain: "demo",
        sources: [] as string[],
        payload: {
          type: "practice" as const,
          rationale: "Demo root KB for one-command protocol showcase.",
          contexts: [],
          failureModes: [],
        },
      };
      const rootResult = await registry.registerEnvelope(rootEnvelope, CURATOR);
      const derivedEnvelope = buildDerivedEnvelope({
        domain: "demo",
        sources: [rootResult.kbId],
        derivation: {
          type: "compose",
          inputs: [{ kbId: rootResult.kbId, selectors: ["payload.rationale"] }],
          recipe: {},
        },
        payload: {
          type: "synthesis",
          question: "What is this demo?",
          answer: "A one-command demo of register → derive.",
          citations: { [rootResult.kbId]: "Demo root KB for one-command protocol showcase." },
        },
      });
      const derivedResult = await registry.registerEnvelope(derivedEnvelope, CURATOR);
      const norm = (h: string) => (h.startsWith("0x") ? h : "0x" + h).toLowerCase();
      expect(norm(kbHashFromEnvelope(rootEnvelope as unknown as Record<string, unknown>))).toBe(norm(rootResult.kbId));
      expect(norm(kbHashFromEnvelope(derivedEnvelope as unknown as Record<string, unknown>))).toBe(norm(derivedResult.kbId));
    });

    it("emits demo values for walkthrough (root kbId, derived kbId, CIDs)", async () => {
      const registry = new VirtualRegistry();
      const rootEnvelope = {
        type: "practice" as const,
        domain: "demo",
        sources: [] as string[],
        payload: {
          type: "practice" as const,
          rationale: "Demo root KB for one-command protocol showcase.",
          contexts: [],
          failureModes: [],
        },
      };
      const rootResult = await registry.registerEnvelope(rootEnvelope, CURATOR);
      const derivedEnvelope = buildDerivedEnvelope({
        domain: "demo",
        sources: [rootResult.kbId],
        derivation: {
          type: "compose",
          inputs: [{ kbId: rootResult.kbId, selectors: ["payload.rationale"] }],
          recipe: {},
        },
        payload: {
          type: "synthesis",
          question: "What is this demo?",
          answer: "A one-command demo of register → derive.",
          citations: { [rootResult.kbId]: "Demo root KB for one-command protocol showcase." },
        },
      });
      const derivedResult = await registry.registerEnvelope(derivedEnvelope, CURATOR);
      expect(rootResult.kbId).not.toBe(derivedResult.kbId);
    });
  });
});
