import type { AlexandrianProof } from "@alexandrian/protocol/schema";
import type { AlexandrianSDK } from "../client/AlexandrianSDK.js";

export type CanonicalStatus = "FINALIZED" | "UNKNOWN" | "SLASHED";

export interface CanonicalProof {
  poolId: string;
  versionId: string;
  chainId: number;
  registryAddress: string;
  status: CanonicalStatus;
  attestation: string;
  proof?: AlexandrianProof;
}

/**
 * Build a canonical proof for a version (content hash).
 * Uses on-chain verification via sdk.verify().
 */
export async function buildProof(
  sdk: AlexandrianSDK,
  poolId: string,
  versionId: string
): Promise<CanonicalProof> {
  const v = await sdk.verifyRaw(versionId);
  if (!v.registered) {
    return {
      poolId,
      versionId,
      chainId: v.chainId,
      registryAddress: v.registryAddress,
      status: "UNKNOWN",
      attestation: v.attestation,
    };
  }
  if (v.slashed) {
    return {
      poolId,
      versionId,
      chainId: v.chainId,
      registryAddress: v.registryAddress,
      status: "SLASHED",
      attestation: v.attestation,
    };
  }
  return {
    poolId,
    versionId,
    chainId: v.chainId,
    registryAddress: v.registryAddress,
    status: "FINALIZED",
    attestation: v.attestation,
    proof: v.proof,
  };
}

/**
 * Verify a canonical proof by re-checking chain state.
 * Returns true only when finalized and attestation matches.
 */
export async function verifyProof(
  sdk: AlexandrianSDK,
  proof: CanonicalProof
): Promise<boolean> {
  const v = await sdk.verifyRaw(proof.versionId);
  if (!v.registered || v.slashed) return false;
  if (v.chainId !== proof.chainId) return false;
  if (v.registryAddress.toLowerCase() !== proof.registryAddress.toLowerCase()) return false;
  if (v.attestation !== proof.attestation) return false;
  return true;
}
