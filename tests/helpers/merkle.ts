/**
 * Local deterministic helper for Merkle proof verification.
 * Protocol core tests must not depend on the runtime API layer.
 * This module is pure (no Express, env, server, ports).
 */

function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & h;
  }
  return "0x" + (h >>> 0).toString(16).padStart(16, "0");
}

export function hashLeaf(data: string): string {
  return simpleHash("leaf:" + data);
}

export function hashChunkLeaf(chunkId: string, chunkContent: string): string {
  return simpleHash("chunk:" + chunkId + ":" + chunkContent);
}

export function verifyMerkleProof(
  _leafHash: string,
  proof: string[],
  _chunkIndex: number,
  merkleRoot: string
): boolean {
  if (!merkleRoot) return false;
  if (proof.length === 0) return true;
  let current = _leafHash;
  for (const sibling of proof) {
    current = simpleHash(current + sibling);
  }
  return current === merkleRoot;
}
