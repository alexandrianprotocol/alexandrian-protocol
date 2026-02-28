/**
 * Alexandrian Proof Spec v1 — deterministic, JCS-canonicalized, hashable proof.
 * Legacy wrapper; canonical proof shape lives in protocol schema.
 * See docs/proof-spec-v1.md for the normative spec.
 *
 * - version: "alexandrian-proof/1"
 * - All numeric-like values as decimal strings (cross-language safe).
 * - proofHash = keccak256(UTF8(JCS(proof))).
 * - Optional payload binding for response integrity.
 */

import { keccak256, toUtf8Bytes } from "ethers";
import { canonicalize } from "@alexandrian/protocol/core";

/** Proof object version. Frozen for v1. */
export const ALEXANDRIAN_PROOF_SPEC_VERSION = "alexandrian-proof/1" as const;

/** On-chain state snapshot (all string for deterministic serialization). */
export type ProofSpecState = {
  totalFeesEarned: string;
  lastSettledAt: string;
};

/** Payload binding for response integrity. */
export type ProofSpecPayload = {
  hashAlg: "keccak256" | "sha256";
  hash: string; // 0x-prefixed hex
};

/** Spec-compliant proof (alexandrian-proof/1). All numbers as decimal strings. */
export type ProofSpecV1 = {
  version: typeof ALEXANDRIAN_PROOF_SPEC_VERSION;
  chainId: string;
  contract: string; // EIP-55
  kbId: string; // 0x-prefixed 32-byte hex
  blockNumber: string;
  state: ProofSpecState;
  payload?: ProofSpecPayload;
  schema?: string;
  issuedAt?: string; // RFC 3339, informational
};

/**
 * Serialize proof to canonical JSON (RFC 8785) as UTF-8 bytes.
 * Used as preimage for proofHash.
 */
export function canonicalProofBytes(proof: ProofSpecV1): Uint8Array {
  const json = canonicalize(proof);
  return toUtf8Bytes(json);
}

/**
 * Compute proof hash per spec: keccak256(UTF8(JCS(proof))).
 * Returns 0x-prefixed lowercase hex string.
 */
export function computeProofHash(proof: ProofSpecV1): string {
  const bytes = canonicalProofBytes(proof);
  const hash = keccak256(bytes);
  return hash.toLowerCase();
}

/**
 * Compute payload hash (keccak256 of response bytes).
 * Use when binding proof to response for integrity.
 */
export function computePayloadHash(payloadBytes: Uint8Array): string {
  return keccak256(payloadBytes).toLowerCase();
}

/** Build a spec-compliant proof with optional payload binding. */
export function buildProofSpecV1(params: {
  chainId: string;
  contract: string;
  kbId: string;
  blockNumber: string;
  state: ProofSpecState;
  schema?: string;
  issuedAt?: string;
  payloadHash?: string;
  payloadAlg?: "keccak256" | "sha256";
}): ProofSpecV1 {
  const proof: ProofSpecV1 = {
    version: ALEXANDRIAN_PROOF_SPEC_VERSION,
    chainId: params.chainId,
    contract: params.contract,
    kbId: params.kbId,
    blockNumber: params.blockNumber,
    state: params.state,
    ...(params.schema != null ? { schema: params.schema } : {}),
    ...(params.issuedAt != null ? { issuedAt: params.issuedAt } : {}),
    ...(params.payloadHash != null
      ? {
          payload: {
            hashAlg: params.payloadAlg ?? "keccak256",
            hash: params.payloadHash,
          },
        }
      : {}),
  };
  return proof;
}
