import { canonicalize, contentHashFromCanonical } from "../canonical.js";

/**
 * Alexandrian Protocol — Canonical Proof Type (M2 Verifiable Interface Layer)
 *
 * AlexandrianProof is the protocol-level evidence object that an agent attaches
 * to responses to assert cryptographically-anchored knowledge provenance.
 *
 * Design constraints:
 *   - No bigint fields: safe to JSON.stringify / pass over A2A message boundaries.
 *   - No ethers / chain-library imports: pure data, usable in any environment.
 *   - Deterministic kbId: the content hash is a pure function of the KB envelope.
 *
 * Usage (agent response header):
 *   const proof = await sdk.verify(kbId)
 *   response.headers["x-alexandrian-proof"] = serializeProof(proof.proof)
 */

/** Canonical proof version identifier. */
export const ALEXANDRIAN_PROOF_VERSION = "alexandrian.proof.v1" as const;
export const ALEXANDRIAN_A2A_PROOF_CONTAINER = "alexandrian-proof/1" as const;

/**
 * Protocol-level proof for a registered Knowledge Block.
 *
 * An agent response carrying this proof asserts:
 *   1. kbId was registered at registryAddress on chainId
 *   2. kbId (kbHash) is deterministically derived from the KB's canonical envelope
 *   3. The KB was active (not slashed) at time of verification
 */
export interface AlexandrianProof {
  /** Protocol version — always "alexandrian.proof.v1". */
  version: typeof ALEXANDRIAN_PROOF_VERSION;
  /** KB hash (kbId): 0x-prefixed 32-byte hex. Deterministic from KB content. */
  kbId: string;
  /** Optional CID (content-addressed storage reference). */
  cid?: string;
  /** Registry contract address where kbId is registered. */
  registryAddress: string;
  /** EVM chain ID where the registry contract is deployed. */
  chainId: number;
  /** Curator address at time of verification. */
  curator: string;
  /** KB domain (e.g. "software.security", "medicine.oncology"). */
  domain: string;
  /** True when KB is registered and not slashed. False = do not use for agent responses. */
  active: boolean;
  /**
   * Canonical attestation string for embedding in A2A response headers or prompt footers.
   * Format: "alexandrian.attest.v1:<kbId>@<registryAddress>:<chainId>"
   */
  attestation: string;
  /** Optional settlement reference when proof is tied to an economic event. */
  settlement?: SettlementRef;
}

/**
 * Canonical A2A proof container.
 *
 * Wraps a protocol-level AlexandrianProof with pool/version context
 * for agent-to-agent exchange.
 */
export interface AlexandrianA2AProofContainer {
  type: typeof ALEXANDRIAN_A2A_PROOF_CONTAINER;
  poolId: string;
  versionId: string;
  proof: AlexandrianProof;
}

/**
 * On-chain settlement reference — proof-of-settlement anchor.
 *
 * Identifies the exact on-chain event that constitutes a valid economic settlement.
 * The triple (chainId, txHash, logIndex) uniquely identifies any settlement event.
 *
 * Design constraints:
 *   - No bigint fields: JSON-safe for A2A message boundaries.
 *   - No ethers / chain-library imports: pure data type.
 *   - `confirmations` is advisory: NOT part of identity. Two SettlementRefs with different
 *     confirmations but identical (chainId, txHash, logIndex) refer to the same event.
 *
 * Usage:
 *   Attach to ProofBundle or agent response headers to prove economic settlement occurred.
 *   Verifiers check txHash on-chain; confirmations are a hint for freshness only.
 */
export interface SettlementRef {
  /** EVM chain ID where the settlement occurred. */
  chainId: number;
  /** Transaction hash — 0x-prefixed 32-byte hex. */
  txHash: string;
  /** Block height of the settlement transaction. */
  blockHeight: number;
  /** Log index of the settlement event within the transaction. */
  logIndex: number;
  /**
   * Optional subgraph entity ID (bytes) for fast verification lookups.
   * Derived from (txHash, logIndex) and not part of settlement identity.
   */
  graphEntityId?: string;
  /**
   * Confirmation count at time of proof generation — advisory only.
   * NOT part of SettlementRef identity: (chainId + txHash + logIndex) is the identity key.
   * Two SettlementRefs with different confirmations but equal other fields are the same event.
   */
  confirmations: number;
}

/**
 * Compute proofHash as keccak256(JCS(proof)).
 * proofHash is NOT embedded in the proof object itself (self-referential).
 */
export function computeProofHash(proof: AlexandrianProof): string {
  // Strip undefined fields before canonicalization
  const normalized = JSON.parse(JSON.stringify(proof)) as AlexandrianProof;
  const canonical = canonicalize(normalized);
  return contentHashFromCanonical(canonical);
}

/**
 * Serialize a proof to a JSON string. All fields are JSON-safe.
 */
export function serializeProof(proof: AlexandrianProof): string {
  return JSON.stringify(proof);
}

/**
 * Parse and validate a proof from a JSON string.
 * Returns null on invalid input or version mismatch.
 */
export function parseProof(json: string): AlexandrianProof | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as Record<string, unknown>).version !== ALEXANDRIAN_PROOF_VERSION
    ) {
      return null;
    }
    return parsed as AlexandrianProof;
  } catch {
    return null;
  }
}
