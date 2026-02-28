/**
 * Unit tests: EconomicInvariants (protocol core) — cycles, shares, paths, distribution
 */
import { describe, it, expect } from "vitest";
import { EconomicInvariants } from "@alexandrian/protocol/core";

function buildLinearChain(length = 3): { id: string; creator: string; baseRoyalty: number; parents: { from: string; to: string; share: number }[] }[] {
  const nodes: { id: string; creator: string; baseRoyalty: number; parents: { from: string; to: string; share: number }[] }[] = [];
  for (let i = 0; i < length; i++) {
    const id = i === 0 ? "root" : `n${i}`;
    nodes.push({
      id,
      creator: `0x${i}`,
      baseRoyalty: 70,
      parents: i === 0 ? [] : [{ from: id, to: nodes[i - 1]!.id, share: 30 }],
    });
  }
  return nodes;
}

function buildDiamondDAG() {
  const root = { id: "root", creator: "0x0", baseRoyalty: 50, parents: [] as { from: string; to: string; share: number }[] };
  const b = { id: "b", creator: "0x1", baseRoyalty: 50, parents: [{ from: "b", to: "root", share: 50 }] };
  const c = { id: "c", creator: "0x2", baseRoyalty: 50, parents: [{ from: "c", to: "root", share: 50 }] };
  const d = { id: "d", creator: "0x3", baseRoyalty: 50, parents: [{ from: "d", to: "b", share: 50 }, { from: "d", to: "c", share: 50 }] };
  return [root, b, c, d];
}

describe("EconomicInvariants — cycle detection", () => {
  it("findCycles returns empty for DAG", () => {
    expect(EconomicInvariants.findCycles(buildLinearChain())).toHaveLength(0);
    expect(EconomicInvariants.findCycles(buildDiamondDAG())).toHaveLength(0);
  });

  it("findCycles detects self-loop", () => {
    const nodes = [{ id: "a", creator: "0x0", baseRoyalty: 50, parents: [{ from: "a", to: "a", share: 50 }] }];
    expect(EconomicInvariants.findCycles(nodes).length).toBeGreaterThan(0);
  });

  it("validateNoCycles throws for cycle", () => {
    const nodes = [{ id: "a", creator: "0x0", baseRoyalty: 50, parents: [{ from: "a", to: "a", share: 50 }] }];
    expect(() => EconomicInvariants.validateNoCycles(nodes)).toThrow(/[Cc]ycle/);
  });
});

describe("EconomicInvariants — royalty shares", () => {
  it("validateRoyaltyShares accepts valid DAG", () => {
    expect(EconomicInvariants.validateRoyaltyShares(buildLinearChain())).toBe(true);
  });

  it("validateRoyaltyShares throws when parent shares exceed 100%", () => {
    const nodes = [
      { id: "root", creator: "0x0", baseRoyalty: 0, parents: [] as { from: string; to: string; share: number }[] },
      { id: "child", creator: "0x1", baseRoyalty: 0, parents: [{ from: "child", to: "root", share: 60 }, { from: "child", to: "root", share: 60 }] },
    ];
    expect(() => EconomicInvariants.validateRoyaltyShares(nodes)).toThrow();
  });
});

describe("EconomicInvariants — paths and DAG validation", () => {
  it("validateRoyaltyDAG accepts linear chain and diamond", () => {
    expect(EconomicInvariants.validateRoyaltyDAG(buildLinearChain())).toBe(true);
    expect(EconomicInvariants.validateRoyaltyDAG(buildDiamondDAG())).toBe(true);
  });

  it("validateRoyaltyDAG throws for cycle", () => {
    const nodes = [{ id: "a", creator: "0x0", baseRoyalty: 50, parents: [{ from: "a", to: "a", share: 50 }] }];
    expect(() => EconomicInvariants.validateRoyaltyDAG(nodes)).toThrow();
  });
});

describe("EconomicInvariants — computeRoyaltyPath / obligation", () => {
  it("calculateTotalObligation for root is 0", () => {
    const nodes = buildLinearChain();
    const map = new Map(nodes.map((n) => [n.id, n]));
    expect(EconomicInvariants.calculateTotalObligation("root", map)).toBe(0);
  });

  it("calculateDistribution returns map with creator amounts", () => {
    const nodes = buildLinearChain();
    const map = new Map(nodes.map((n) => [n.id, n]));
    const dist = EconomicInvariants.calculateDistribution("n2", map, 100);
    expect(dist.size).toBeGreaterThan(0);
  });
});
