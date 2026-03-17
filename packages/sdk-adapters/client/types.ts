/**
 * Alexandrian Protocol SDK — public types and citation utilities.
 * Extracted from AlexandrianSDK.ts to keep the implementation file focused.
 */

import type { AlexandrianProof, SettlementRef } from "@alexandrian/protocol/schema";
import type { KnowledgeBlock, KBType, TrustTier } from "@alexandrian/protocol/schema/legacy";
import type { DerivedEnvelopeInput } from "@alexandrian/protocol/core";
import type {
  ChainAdapter,
  TransactionAdapter,
  ProofAdapter,
  PoolsAdapter,
  RegistryAdapter,
} from "@alexandrian/sdk-core";
import type { MemoryAdapter, StorageAdapter, HeadSource } from "../lib/adapters/types.js";
import type { ObservabilityAdapter } from "../lib/adapters/observability.js";
import type { ProtocolStage, StageEconomics } from "../lib/stage.js";

export interface SDKConfig {
  /** Determinism-critical adapters (required) */
  chainAdapter: ChainAdapter;
  proofAdapter: ProofAdapter;
  headSource: HeadSource;
  txAdapter: TransactionAdapter;
  /** Registry contract address */
  registryAddress: string;
  /** Optional: protocol stage for economics defaults (adoption | depth | infrastructure). */
  stage?: ProtocolStage;
  /** Optional: override stage economics defaults. */
  economics?: Partial<StageEconomics>;
  /** Optional adapters (feature-specific) */
  memoryAdapter?: MemoryAdapter;
  poolsAdapter?: PoolsAdapter;
  registryAdapter?: RegistryAdapter;
  storageAdapter?: StorageAdapter;
  observabilityAdapter?: ObservabilityAdapter;
  /** Strict mode: require chain-backed head confirmation */
  strictMode?: boolean;
  /** Optional strict head source (chain-backed) for confirmation */
  strictHeadSource?: HeadSource;
  /** Optional subgraph URL for discovery queries (M2+) */
  subgraphUrl?: string;
  /** Optional domain inference function for semantic routing (M2+) */
  inferDomain?: (question: string) => string;
}

export const ARTIFACT_HASH_ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export interface PublishOptions {
  /** Stake in wei — must meet contract minStakeAmount */
  stake: bigint;
  /** Query fee in wei per retrieval */
  queryFee?: bigint;
  /** Attribution links to parent KBs */
  parents?: OnChainAttributionLink[];
  /** Override trust tier — defaults to HumanStaked */
  trustTier?: TrustTier;
  /** sha256(artifact content) for on-chain integrity verification; use ARTIFACT_HASH_ZERO if not computed */
  artifactHash?: string;
  /** Override on-chain curator address (defaults to signer). Use when publishing on behalf of a DAO or human curator. */
  curator?: string;
}

export interface PublishDerivedOptions {
  /** CID of envelope stored on IPFS */
  cid: string;
  /** Stake in wei */
  stake: bigint;
  /** Query fee in wei (default 0) */
  queryFee?: bigint;
  /** Optional: royalty weight per source (by index). Default: equal split. */
  sourceWeights?: number[];
  /** @deprecated Use sourceWeights. */
  parentWeights?: number[];
  /** sha256(artifact content) for on-chain integrity verification; use ARTIFACT_HASH_ZERO if not computed */
  artifactHash?: string;
  /** Override on-chain curator address (defaults to signer). Use when publishing on behalf of a DAO or human curator. */
  curator?: string;
}

export interface OnChainAttributionLink {
  parentHash: string;
  royaltyShareBps: number;
  relationship: "derv" | "extd" | "ctrd" | "vald";
}

export interface PublishResult {
  contentHash: string;
  txHash: string;
  blockNumber: number;
  curator: string;
  kbType: KBType;
  domain: string;
  stake: bigint;
  queryFee: bigint;
}

export interface PoolDraft {
  id: string;
  name: string;
  domain: string;
  description?: string;
  curator?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  stage: ProtocolStage;
  economics: StageEconomics;
  status: "draft";
}

export interface PoolProposal {
  id: string;
  poolId: string;
  createdAt: string;
  contentHash: string;
  block?: KnowledgeBlock;
  derivedInput?: DerivedEnvelopeInput;
  status: "draft";
}

export interface FinalizeOptions {
  /** Stake in wei. Defaults to stage economics proposalStakeWei. */
  stakeWei?: bigint;
  /** Query fee in wei (optional). */
  queryFeeWei?: bigint;
  /** CID of envelope on IPFS (required for derived finalize). */
  cid?: string;
  /** Override trust tier for compiled KB publish. */
  trustTier?: TrustTier;
  /** Optional attribution links for compiled KB publish. */
  parents?: OnChainAttributionLink[];
}

export interface ProofVerificationResult {
  valid: boolean;
  checks: {
    versionExists: boolean;
    contentHashMatches: boolean;
    receiptIncluded: boolean;
    isFinalized: boolean;
    isHead: boolean;
  };
  reason?: string;
}

export interface VerificationChecks {
  canonicalizationOk?: boolean;
  hashFormatOk?: boolean;
  parentUniqueness?: boolean;
  maxParentsOk?: boolean;
  onChainExistence?: boolean;
  contentHashMatches?: boolean;
}

export interface Verified<T> {
  value: T;
  identity: {
    kbId: string;
    contentHash: string;
    publisher?: string;
  };
  proof?: {
    version: string;
    chainId: number;
    registryAddress: string;
    txHash?: string;
    blockNumber?: number;
  };
  checks: VerificationChecks;
  verified: boolean;
  reason?: string;
}

/** Minimal on-chain KB record. CID/domain/type are in KBPublished events; use indexer for full metadata. */
export interface OnChainKB {
  curator: string;
  timestamp: number;
  queryFee: bigint;
  exists: boolean;
  /** From getArtifactHash (sha256 of artifact content). */
  artifactHash: string;
  /** From getCidDigest (keccak256 of CID); full CID in KBPublished event. */
  cidDigest: string;
}

export interface ReputationRecord {
  queryVolume: number;
  endorsements: number;
  score: number;
  lastUpdated: number;
}

export interface StakeRecord {
  amount: bigint;
  lockedUntil: number;
  slashed: boolean;
}

/** Canonical proof bundle version — use in citations and capability beacons. */
export const ALEXANDRIAN_PROOF_V1 = "alexandrian.proof.v1";

/** @deprecated Use protocol-level AlexandrianProof or A2A container. */
export interface ProofBundle {
  chainId: number;
  registryAddress: string;
  kbId: string;
  cid?: string;
  querier: string;
  queryNonce: bigint;
  txHash: string;
  blockNumber: number;
  logIndex?: number;
  /** Optional subgraph entity ID (bytes) for settlement event. */
  graphEntityId?: string;
  settlement?: SettlementRef;
  /**
   * True when this bundle corresponds to an on-chain settlement event.
   * A proof bundle with settled: false is a draft citation — informational
   * only and NOT considered economically valid for protocol purposes.
   * All bundles produced by settleCitation() carry settled: true.
   */
  settled: boolean;
}

/** Human-readable citation footer. Every agent response becomes protocol advertising. */
export function citeHuman(proof: ProofBundle): string {
  return `Verified via Alexandrian\nKB: ${proof.kbId}\nTX: ${proof.txHash}`;
}

/** Machine-readable proof (JSON string, bigint as string). */
export function citeJson(proof: ProofBundle): string {
  return JSON.stringify(
    { version: ALEXANDRIAN_PROOF_V1, ...proof },
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    0
  );
}

/** Full citation: answer + human footer + JSON proof. */
export function cite(answer: string, proof: ProofBundle): { human: string; json: string } {
  const human = answer + "\n\n" + citeHuman(proof);
  return { human, json: citeJson(proof) };
}

export interface SettleResult {
  txHash: string;
  contentHash: string;
  querier: string;
  totalFee: bigint;
  protocolFee: bigint;
  proof?: ProofBundle;
}

/**
 * On-chain verification result for a Knowledge Block.
 * Returned by sdk.verify(kbId) — the read-side counterpart to ProofBundle.
 * attestation is a canonical string embedding kbId, registry, and chain for agent headers.
 */
export interface VerifyResult {
  kbId: string;
  curator: string;
  domain: string;
  kbType: number;
  registered: boolean;
  slashed: boolean;
  repScore: number;
  queryVolume: number;
  stakeAmount: bigint;
  chainId: number;
  registryAddress: string;
  /** Canonical attestation string: "alexandrian.attest.v1:<kbId>@<registryAddress>:<chainId>" */
  attestation: string;
  /** Protocol-level proof — present when registered and not slashed. */
  proof?: AlexandrianProof;
}
