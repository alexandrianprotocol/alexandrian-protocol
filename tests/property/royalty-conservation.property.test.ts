/**
 * Tier 1 — Property-based fuzz (fast-check): Royalty Conservation.
 * Fast-check generates 10k random valid DAGs; we assert Σ payouts ≤ payment (no inflation).
 * Fuzz finds inputs that could break basis-point arithmetic; complementary to Tier 8 differential.
 *
 * See docs/PROTOCOL-HARDENING-ROADMAP.md Tier 1.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { EconomicInvariants } from "@alexandrian/protocol/core";
import type { RoyaltyNode } from "@alexandrian/protocol/core";

/** Build a linear chain of n nodes (id root, n1, n2, ...); each node has one parent with share 30, baseRoyalty 70. */
function buildLinearChain(n: number, creatorPrefix: string): RoyaltyNode[] {
  const nodes: RoyaltyNode[] = [];
  for (let i = 0; i < n; i++) {
    const id = i === 0 ? "root" : `n${i}`;
    nodes.push({
      id,
      creator: creatorPrefix + i,
      baseRoyalty: 70,
      parents: i === 0 ? [] : [{ from: id, to: nodes[i - 1]!.id, share: 30 }],
    });
  }
  return nodes;
}

/** Arbitrary: small linear chain (2–10 nodes) and a payment amount. */
const arbitraryValidDAGAndPayment = fc.integer({ min: 2, max: 10 }).chain((len) => {
  const nodes = buildLinearChain(len, "0x");
  const map = new Map(nodes.map((n) => [n.id, n]));
  const leafId = nodes[nodes.length - 1]!.id;
  return fc.record({
    nodes: fc.constant(nodes),
    map: fc.constant(map),
    leafId: fc.constant(leafId),
    paymentAmount: fc.integer({ min: 100, max: 1_000_000 }),
  });
});

describe("AlexandrianRegistry — Properties (Tier 1)", () => {
  describe("Royalty Conservation", () => {
    it("Σ payouts <= paymentAmount for all valid DAGs — no inflation (10000 runs)", () => {
      fc.assert(
        fc.property(arbitraryValidDAGAndPayment, ({ map, leafId, paymentAmount }) => {
          EconomicInvariants.validateNoCycles(Array.from(map.values()));
          const dist = EconomicInvariants.calculateDistribution(leafId, map, paymentAmount);
          const sum = Array.from(dist.values()).reduce((a, b) => a + b, 0);
          return sum <= paymentAmount;
        }),
        { numRuns: 10000 }
      );
    });

    it("no negative payouts (10000 runs)", () => {
      fc.assert(
        fc.property(arbitraryValidDAGAndPayment, ({ map, leafId, paymentAmount }) => {
          const dist = EconomicInvariants.calculateDistribution(leafId, map, paymentAmount);
          return Array.from(dist.values()).every((v) => v >= 0);
        }),
        { numRuns: 10000 }
      );
    });
  });
});
