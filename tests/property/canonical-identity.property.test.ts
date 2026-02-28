/**
 * Tier 1 — Property-based fuzz (fast-check): Canonical Identity.
 * Fast-check generates 10k+ random/adversarial envelopes; we assert invariants hold.
 * This is fuzz (find inputs that break assumptions), not just self-consistency.
 * Complementary to Tier 8 differential (two implementations must agree).
 *
 * See docs/PROTOCOL-HARDENING-ROADMAP.md Tier 1.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { deriveKbId } from "../utils/derive-kb-id";

/** Deterministic shuffle of object keys for fast-check reproducibility. */
function shuffleKeysDeterministic<T extends Record<string, unknown>>(o: T, seed: number): T {
  const keys = Object.keys(o);
  const shuffled = [...keys].sort((a, b) => {
    const h = (s: string) => s.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, seed);
    return h(a) - h(b);
  });
  const out: Record<string, unknown> = {};
  for (const k of shuffled) out[k] = o[k];
  return out as T;
}

type PracticeEnvelope = {
  type: "practice";
  domain: string;
  sources: string[];
  payload: {
    type: "practice";
    rationale: string;
    contexts: string[];
    failureModes: string[];
  };
};

const practiceEnvelopeArbitrary: fc.Arbitrary<PracticeEnvelope> = fc.record({
  type: fc.constant("practice" as const),
  domain: fc.string({ minLength: 1, maxLength: 20 }),
  sources: fc.array(fc.stringOf(fc.hexa(), { minLength: 64, maxLength: 64 }).map((s) => "0x" + s), {
    minLength: 0,
    maxLength: 5,
  }),
  payload: fc.record({
    type: fc.constant("practice" as const),
    rationale: fc.string({ minLength: 0, maxLength: 100 }),
    contexts: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
    failureModes: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
  }),
});

describe("AlexandrianRegistry — Properties (Tier 1)", () => {
  describe("Canonical Identity", () => {
    it("kbId is identical for all key orderings (10000 runs)", () => {
      fc.assert(
        fc.property(practiceEnvelopeArbitrary, fc.integer(), (env, seed) => {
          const shuffled = shuffleKeysDeterministic(env as Record<string, unknown>, seed) as PracticeEnvelope;
          const id1 = deriveKbId(env as unknown as Record<string, unknown>);
          const id2 = deriveKbId(shuffled as unknown as Record<string, unknown>);
          return id1 === id2;
        }),
        { numRuns: 10000 }
      );
    });

    it("kbId is stable across whitespace variants (10000 runs)", () => {
      fc.assert(
        fc.property(practiceEnvelopeArbitrary, (env) => {
          const compact = JSON.parse(JSON.stringify(env)) as Record<string, unknown>;
          const pretty = JSON.parse(JSON.stringify(env, null, 2)) as Record<string, unknown>;
          const id1 = deriveKbId(compact);
          const id2 = deriveKbId(pretty);
          return id1 === id2;
        }),
        { numRuns: 10000 }
      );
    });

    it("kbId is identical for all source orderings (sources normalized) (10000 runs)", () => {
      fc.assert(
        fc.property(practiceEnvelopeArbitrary, fc.integer(), (env, seed) => {
          const h = (s: string) => s.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, seed);
          const sources = [...env.sources].sort((a, b) => h(a) - h(b));
          const reordered = { ...env, sources };
          const id1 = deriveKbId(env as unknown as Record<string, unknown>);
          const id2 = deriveKbId(reordered as unknown as Record<string, unknown>);
          return id1 === id2;
        }),
        { numRuns: 10000 }
      );
    });

    it("kbId is stable for adversarial inputs — empty domain, unicode, long rationale (5000 runs)", () => {
      const adversarialArbitrary = fc.record({
        type: fc.constant("practice" as const),
        domain: fc.oneof(fc.constant(""), fc.string({ maxLength: 50 })),
        sources: fc.array(fc.stringOf(fc.hexa(), { minLength: 64, maxLength: 64 }).map((s) => "0x" + s), { maxLength: 3 }),
        payload: fc.record({
          type: fc.constant("practice" as const),
          rationale: fc.string({ maxLength: 500 }),
          contexts: fc.array(fc.string(), { maxLength: 2 }),
          failureModes: fc.array(fc.string(), { maxLength: 2 }),
        }),
      });
      fc.assert(
        fc.property(adversarialArbitrary, (env) => {
          const id1 = deriveKbId(env as unknown as Record<string, unknown>);
          const id2 = deriveKbId(env as unknown as Record<string, unknown>);
          return id1 === id2 && /^0x[a-fA-F0-9]{64}$/.test(id1);
        }),
        { numRuns: 5000 }
      );
    });
  });
});
