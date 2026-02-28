# Merkle Proof Spec (M1)

Status: Draft  
Scope: Canonical Merkle proof format for KB and coordination commitments.

## 1. Hashing

- `keccak256` is the hash function.
- Leaf hash: `leaf = keccak256("LEAF_V1" || JCS(entry))`.
- Parent hash: `parent = keccak256(left || right)`.
- Leaves are sorted lexicographically by `leaf` before tree construction.
- Odd leaf duplication: if the level has an odd count, the last leaf is duplicated.
- Empty tree root: `keccak256("EMPTY_TREE_V1")`.

## 2. Proof Format

```
MerkleProof {
  leaf: bytes32
  siblings: bytes32[]
  directions: bool[] // true = left, false = right
}
```

Semantics:
- `leaf` is the leaf hash (32 bytes).
- `siblings[i]` is the sibling hash at depth `i`.
- `directions[i]` indicates whether the sibling is on the left (`true`) or right (`false`).
- `siblings.length` MUST equal `directions.length`.

## 3. Verification

Start `hash = leaf`.

For each step `i`:
- If `directions[i] == true`, `hash = keccak256(siblings[i] || hash)`.
- If `directions[i] == false`, `hash = keccak256(hash || siblings[i])`.

Proof is valid iff `hash == merkleRoot`.

## 4. Notes

- M1 defines only single‑leaf proofs (multi‑proof is deferred).
- Canonical byte representation for entries is JCS (RFC 8785).
