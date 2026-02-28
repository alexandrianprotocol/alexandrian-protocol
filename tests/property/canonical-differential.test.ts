/**
 * Tier 8 — Differential Testing (Canonicalization).
 * Two implementations must agree; if they diverge → bug.
 * Currently: assert implementation A is deterministic (same input → same output).
 * When a second implementation exists (e.g. Rust or alternate JS): assert A === B.
 *
 * See docs/PROTOCOL-HARDENING-ROADMAP.md Tier 8.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { canonicalize, sortSources, kbHashFromEnvelope } from "@alexandrian/protocol/core";

type PracticeEnvelope = {
  type: "practice";
  domain: string;
  sources: string[];
  payload: { type: "practice"; rationale: string; contexts: string[]; failureModes: string[] };
};

const envelopeArbitrary: fc.Arbitrary<PracticeEnvelope> = fc.record({
  type: fc.constant("practice" as const),
  domain: fc.string({ minLength: 0, maxLength: 20 }),
  sources: fc.array(fc.stringOf(fc.hexa(), { minLength: 64, maxLength: 64 }).map((s) => "0x" + s), { minLength: 0, maxLength: 3 }),
  payload: fc.record({
    type: fc.constant("practice" as const),
    rationale: fc.string({ minLength: 0, maxLength: 50 }),
    contexts: fc.array(fc.string(), { minLength: 0, maxLength: 2 }),
    failureModes: fc.array(fc.string(), { minLength: 0, maxLength: 2 }),
  }),
});

describe("AlexandrianRegistry — Differential", () => {
  describe("Canonicalization", () => {
    it("implementation A is deterministic (1000 random inputs)", () => {
      fc.assert(
        fc.property(envelopeArbitrary, (env) => {
          const normalized = sortSources(env as unknown as { sources: string[] });
          const out1 = canonicalize(normalized as object);
          const out2 = canonicalize(normalized as object);
          return out1 === out2;
        }),
        { numRuns: 1000 }
      );
    });

    it("implementation A === implementation A (1000 random inputs)", () => {
      fc.assert(
        fc.property(envelopeArbitrary, (env) => {
          const envRecord = env as unknown as Record<string, unknown>;
          const hash1 = kbHashFromEnvelope(sortSources(envRecord) as Record<string, unknown>);
          const hash2 = kbHashFromEnvelope(sortSources(envRecord) as Record<string, unknown>);
          return hash1 === hash2;
        }),
        { numRuns: 1000 }
      );
    });

    it("no divergence on unicode edge cases", () => {
      const envelopes = [
        { type: "practice", domain: "x", sources: [], payload: { type: "practice", rationale: "émoji 🎯", contexts: [], failureModes: [] } },
        { type: "practice", domain: "x", sources: [], payload: { type: "practice", rationale: "\u200fRTL", contexts: [], failureModes: [] } },
      ];
      for (const e of envelopes) {
        const h1 = kbHashFromEnvelope(sortSources(e as Record<string, unknown>) as Record<string, unknown>);
        const h2 = kbHashFromEnvelope(sortSources(e as Record<string, unknown>) as Record<string, unknown>);
        expect(h1).toBe(h2);
      }
    });

    it("no divergence on nested objects", () => {
      const e = {
        type: "practice",
        domain: "x",
        sources: [],
        payload: {
          type: "practice",
          rationale: "nested",
          contexts: ["a", "b"],
          failureModes: ["f1"],
        },
      };
      const h1 = kbHashFromEnvelope(sortSources(e as Record<string, unknown>) as Record<string, unknown>);
      const h2 = kbHashFromEnvelope(sortSources(e as Record<string, unknown>) as Record<string, unknown>);
      expect(h1).toBe(h2);
    });
  });

});
