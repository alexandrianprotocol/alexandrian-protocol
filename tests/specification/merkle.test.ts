/**
 * Unit tests: computeMerkleRoot
 */
import { describe, it, expect } from "vitest";
import { computeMerkleRoot, leafHashFromEntry } from "@alexandrian/protocol/core";
import { keccak_256 } from "js-sha3";

const ENTRY_A = "alpha";
const ENTRY_B = "beta";
const ENTRY_C = "gamma";
const ENTRY_D = "delta";

describe("computeMerkleRoot — empty and single-leaf cases", () => {
  it("empty input returns defined value (empty tree hash)", () => {
    const encoder = new TextEncoder();
    const expected = "0x" + keccak_256(encoder.encode("EMPTY_TREE_V1"));
    const root = computeMerkleRoot([]);
    expect(root).toBe(expected);
  });

  it("single leaf: root equals leaf hash", () => {
    const root = computeMerkleRoot([ENTRY_A]);
    expect(root).toBe(leafHashFromEntry(ENTRY_A));
  });
});

describe("computeMerkleRoot — determinism", () => {
  it("two leaves: root is deterministic", () => {
    const r1 = computeMerkleRoot([ENTRY_A, ENTRY_B]);
    const r2 = computeMerkleRoot([ENTRY_A, ENTRY_B]);
    expect(r1).toBe(r2);
  });

  it("multiple leaves: same order produces same root", () => {
    const leaves = [ENTRY_A, ENTRY_B, ENTRY_C];
    const r1 = computeMerkleRoot(leaves);
    const r2 = computeMerkleRoot(leaves);
    expect(r1).toBe(r2);
  });

  it("root is 0x-prefixed 32-byte hex string", () => {
    const root = computeMerkleRoot([ENTRY_A, ENTRY_B]);
    expect(root).toMatch(/^0x[a-f0-9]{64}$/);
  });
});

describe("computeMerkleRoot — ordering sensitivity", () => {
  it("order does not affect root (leaf sorting)", () => {
    const r1 = computeMerkleRoot([ENTRY_A, ENTRY_B]);
    const r2 = computeMerkleRoot([ENTRY_B, ENTRY_A]);
    expect(r1).toBe(r2);
  });
});

describe("computeMerkleRoot — content sensitivity", () => {
  it("different leaves produce different roots", () => {
    const r1 = computeMerkleRoot([ENTRY_A, ENTRY_B]);
    const r2 = computeMerkleRoot([ENTRY_A, ENTRY_C]);
    expect(r1).not.toBe(r2);
  });

  it("adding a leaf changes root", () => {
    const r2 = computeMerkleRoot([ENTRY_A, ENTRY_B]);
    const r3 = computeMerkleRoot([ENTRY_A, ENTRY_B, ENTRY_C]);
    expect(r2).not.toBe(r3);
  });
});

describe("computeMerkleRoot — tree structure", () => {
  it("four leaves produce single root", () => {
    const root = computeMerkleRoot([ENTRY_A, ENTRY_B, ENTRY_C, ENTRY_D]);
    expect(root).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("duplicate leaves are not deduplicated: [A, A] root differs from [A] root", () => {
    const rootDup = computeMerkleRoot([ENTRY_A, ENTRY_A]);
    const rootSingle = computeMerkleRoot([ENTRY_A]);
    // Two-leaf tree hashes both leaves; it does NOT collapse to a single-leaf tree
    expect(rootDup).not.toBe(rootSingle);
    // Result is still deterministic
    expect(computeMerkleRoot([ENTRY_A, ENTRY_A])).toBe(rootDup);
  });
});
