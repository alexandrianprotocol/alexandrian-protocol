/**
 * Unit tests: Merkle proofs
 */
import { describe, it, expect } from "vitest";
import {
  computeMerkleRoot,
  createMerkleProofFromLeaves,
  leafHashFromEntry,
  verifyMerkleProof,
} from "@alexandrian/protocol/core";

describe("Merkle proofs", () => {
  it("verifies a valid proof", () => {
    const entries = ["a", "b", "c", "d"];
    const root = computeMerkleRoot(entries);
    const leaf = leafHashFromEntry("b");
    const leaves = entries.map(leafHashFromEntry);
    const proof = createMerkleProofFromLeaves(leaf, leaves);
    expect(verifyMerkleProof(proof, root)).toBe(true);
  });

  it("rejects invalid proof", () => {
    const entries = ["a", "b", "c"];
    const root = computeMerkleRoot(entries);
    const leaf = leafHashFromEntry("a");
    const leaves = entries.map(leafHashFromEntry);
    const proof = createMerkleProofFromLeaves(leaf, leaves);
    proof.siblings[0] = leafHashFromEntry("x");
    expect(verifyMerkleProof(proof, root)).toBe(false);
  });
});
