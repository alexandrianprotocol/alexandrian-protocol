import { keccak_256 } from "js-sha3";
import { canonicalize } from "../../canonical.js";

const LEAF_TAG = "LEAF_V1";
const EMPTY_TREE_TAG = "EMPTY_TREE_V1";

function normalizeHex32(value: string): string {
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error("Expected 32-byte hex string");
  }
  return "0x" + hex.toLowerCase();
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function hashBytes(bytes: Uint8Array): string {
  return "0x" + keccak_256(bytes);
}

function hashPair(left: string, right: string): string {
  const leftBytes = hexToBytes(normalizeHex32(left));
  const rightBytes = hexToBytes(normalizeHex32(right));
  return hashBytes(concatBytes([leftBytes, rightBytes]));
}

export type MerkleProof = {
  leaf: string;
  siblings: string[];
  directions: ("left" | "right")[];
};

export function leafHashFromEntry(entry: unknown): string {
  const canonical = canonicalize(entry);
  const encoder = new TextEncoder();
  return hashBytes(concatBytes([encoder.encode(LEAF_TAG), encoder.encode(canonical)]));
}

export function computeMerkleRoot(entries: unknown[]): string {
  if (entries.length === 0) {
    return hashBytes(new TextEncoder().encode(EMPTY_TREE_TAG));
  }

  let layer = entries.map(leafHashFromEntry).map(normalizeHex32).sort();
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i]!;
      const right = layer[i + 1] ?? left;
      next.push(hashPair(left, right));
    }
    layer = next;
  }
  return layer[0]!;
}

export function computeMerkleRootFromLeaves(leaves: string[]): string {
  if (leaves.length === 0) {
    return hashBytes(new TextEncoder().encode(EMPTY_TREE_TAG));
  }
  let layer = leaves.map(normalizeHex32).sort();
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i]!;
      const right = layer[i + 1] ?? left;
      next.push(hashPair(left, right));
    }
    layer = next;
  }
  return layer[0]!;
}

export function createMerkleProofFromLeaves(leaf: string, leaves: string[]): MerkleProof {
  if (leaves.length === 0) {
    throw new Error("Cannot create proof for empty tree");
  }
  const normalizedLeaf = normalizeHex32(leaf);
  let layer = leaves.map(normalizeHex32).sort();
  let index = layer.indexOf(normalizedLeaf);
  if (index === -1) {
    throw new Error("Leaf not found in tree");
  }
  const siblings: string[] = [];
  const directions: ("left" | "right")[] = [];
  while (layer.length > 1) {
    const isRight = index % 2 === 1;
    const pairIndex = isRight ? index - 1 : index + 1;
    const sibling = layer[pairIndex] ?? layer[index]!;
    siblings.push(sibling);
    directions.push(isRight ? "left" : "right");
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i]!;
      const right = layer[i + 1] ?? left;
      next.push(hashPair(left, right));
    }
    index = Math.floor(index / 2);
    layer = next;
  }
  return { leaf: normalizedLeaf, siblings, directions };
}

export function verifyMerkleProof(proof: MerkleProof, root: string): boolean {
  let hash = normalizeHex32(proof.leaf);
  if (proof.siblings.length !== proof.directions.length) return false;
  for (let i = 0; i < proof.siblings.length; i += 1) {
    const sibling = normalizeHex32(proof.siblings[i]!);
    const dir = proof.directions[i]!;
    hash = dir === "left" ? hashPair(sibling, hash) : hashPair(hash, sibling);
  }
  return normalizeHex32(root) === hash;
}
