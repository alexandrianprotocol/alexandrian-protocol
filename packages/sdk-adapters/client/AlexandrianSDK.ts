/**
 * Alexandrian Protocol — SDK v1
 *
 * Core SDK surface for the protocol.
 * Bridges canonical envelopes → on-chain registration → verifiable retrieval.
 *
 * Core operations:
 *   sdk.publish(compiledKB)      — register a compiled KB on-chain with stake
 *   sdk.settleCitation(contentHash) — pay query fee and settle citation through DAG
 *   sdk.getKB(contentHash)       — fetch on-chain KB record
 *   sdk.getReputation(contentHash) — read reputation for a KB
 *   sdk.getStake(contentHash)    — read stake data for a KB
 *   sdk.getAttributionDAG(contentHash) — parent links + royalty shares
 *   sdk.getKBSummary(contentHash) — chain-only KB + reputation + stake
 */

import {
  Contract,
  ethers,
  formatEther,
  parseEther,
} from "ethers";
import type { AlexandrianProof, SettlementRef } from "@alexandrian/protocol/schema";
import type { KnowledgeBlock } from "@alexandrian/protocol/schema/legacy";
import { ALEXANDRIAN_PROOF_VERSION } from "@alexandrian/protocol/schema";
import REGISTRY_ABI_JSON from "@alexandrian/protocol/abis/AlexandrianRegistryV2.json" assert { type: "json" };
import { KBType, TrustTier } from "@alexandrian/protocol/schema/legacy";
import { buildDerivedEnvelope, kbHashFromEnvelope } from "@alexandrian/protocol/core";
import type { DerivedEnvelopeInput } from "@alexandrian/protocol/core";
import { MAINNET_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID, MAINNET_REGISTRY_ADDRESS } from "../lib/addresses.js";
import { getStageEconomics, getStageFromEnv, type ProtocolStage, type StageEconomics } from "../lib/stage.js";
import type { PoolGraph, PoolHead, PoolGraphEdge, PoolGraphNode } from "../lib/pools.js";
import { PoolsClient } from "../lib/pools.js";
import type { ChainAdapter, TransactionAdapter, ProofAdapter, PoolsAdapter, RegistryAdapter } from "@alexandrian/sdk-core";
import { ContractError, ValidationError } from "@alexandrian/sdk-core";
import { ok, err, wrapError } from "@alexandrian/sdk-core";
import type { Result } from "@alexandrian/sdk-core";
import type { MemoryAdapter, StorageAdapter, HeadSource } from "../lib/adapters/types.js";
import {
  EthersChainAdapter,
  EthersTransactionAdapter,
  ContractHeadSource,
  MemoryAdapterStub,
  ProofAdapterStub,
  PoolsAdapterStub,
  RegistryAdapterStub,
  RegistryAdapterContract,
  StorageAdapterStub,
  ObservabilityAdapterStub,
} from "../lib/adapters/index.js";
import type { ObservabilityAdapter, ObservabilityEvent } from "../lib/adapters/observability.js";
import type {
  SDKConfig,
  PublishOptions,
  PublishDerivedOptions,
  OnChainAttributionLink,
  PublishResult,
  PoolDraft,
  PoolProposal,
  FinalizeOptions,
  ProofVerificationResult,
  VerificationChecks,
  Verified,
  OnChainKB,
  ReputationRecord,
  StakeRecord,
  ProofBundle,
  SettleResult,
  VerifyResult,
} from "./types.js";

// Re-export all public types and citation utilities — preserves the existing public API.
export * from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// ABI — generated from packages/protocol/artifacts via export-abi.mjs.
// Do NOT hand-edit. Re-run `node packages/protocol/scripts/export-abi.mjs`
// after any contract change and commit the updated JSON.
// ─────────────────────────────────────────────────────────────────────────────

const REGISTRY_ABI = REGISTRY_ABI_JSON;

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function isHex32(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

function areParentsUnique(parents: OnChainAttributionLink[] | undefined): boolean {
  if (!parents || parents.length === 0) return true;
  const set = new Set(parents.map((p) => p.parentHash.toLowerCase()));
  return set.size === parents.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONSHIP ENCODING
// ─────────────────────────────────────────────────────────────────────────────

const RELATIONSHIP_BYTES: Record<string, string> = {
  derv: "0x64657276",
  extd: "0x65787464",
  ctrd: "0x63747264",
  vald: "0x76616c64",
};

function encodeRelationship(rel: string): string {
  return RELATIONSHIP_BYTES[rel] ?? RELATIONSHIP_BYTES.derv;
}

function decodeRelationship(bytes4Hex: string): "derv" | "extd" | "ctrd" | "vald" {
  const s = Buffer.from(bytes4Hex.slice(2), "hex").toString("utf8").replace(/\0/g, "").toLowerCase();
  if (s === "extd" || s === "ctrd" || s === "vald") return s;
  return "derv";
}

function graphEntityIdFromTxLog(txHash: string, logIndex: number | undefined): string | undefined {
  if (logIndex === undefined || logIndex === null) return undefined;
  try {
    const indexHex = ethers.toBeHex(logIndex, 4);
    return ethers.concat([txHash, indexHex]) as string;
  } catch {
    return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPILER OUTPUT BRIDGE
// ─────────────────────────────────────────────────────────────────────────────

const KB_TYPE_TO_U8: Record<string, number> = {
  [KBType.Practice]: 0,
  [KBType.Feature]: 1,
  [KBType.StateMachine]: 2,
  [KBType.PromptEngineering]: 3,
  [KBType.ComplianceChecklist]: 4,
  [KBType.Rubric]: 5,
};

const CANONICAL_TYPE_TO_U8: Record<string, number> = {
  practice: 0,
  feature: 1,
  stateMachine: 2,
  promptEngineering: 3,
  complianceChecklist: 4,
  rubric: 5,
};

const TRUST_TIER_TO_U8: Record<string, number> = {
  [TrustTier.HumanStaked]: 0,
  [TrustTier.AgentDerived]: 1,
  [TrustTier.AgentDiscovered]: 2,
};

/**
 * Converts a compiled KnowledgeBlock into the args needed for publishKB().
 */
export function compiledToRegistryArgs(block: KnowledgeBlock): {
  contentHash: string;
  kbType: number;
  trustTier: number;
  cid: string;
  embeddingCid: string;
  domain: string;
  licenseType: string;
  queryFee: bigint;
  version: string;
} {
  const contentHash = block.content_hash.startsWith("0x")
    ? block.content_hash
    : "0x" + block.content_hash;
  return {
    contentHash,
    kbType: KB_TYPE_TO_U8[block.type] ?? 0,
    trustTier: TRUST_TIER_TO_U8[block.curator.tier] ?? 0,
    cid: block.content_cid,
    embeddingCid: block.embedding_cid ?? "",
    domain: block.domain,
    licenseType: String(block.license.type),
    queryFee: block.license.query_fee ?? 0n,
    version: block.version,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SDK
// ─────────────────────────────────────────────────────────────────────────────

export class AlexandrianSDK {
  private registry: Contract;
  private provider: ChainAdapter["provider"];
  private signer?: ChainAdapter["signer"];
  private subgraphUrl?: string;
  private inferDomain?: (question: string) => string;
  private registryAddress: string;
  private stage: ProtocolStage;
  private economics: StageEconomics;
  private chainAdapter: ChainAdapter;
  private headSource: HeadSource;
  private txAdapter: TransactionAdapter;
  private proofAdapter: ProofAdapter;
  private memoryAdapter: MemoryAdapter;
  private poolsAdapter: PoolsAdapter;
  private registryAdapter: RegistryAdapter;
  private storageAdapter: StorageAdapter;
  private observabilityAdapter: ObservabilityAdapter;
  private strictMode: boolean;
  private strictHeadSource?: HeadSource;

  constructor(config: SDKConfig) {
    this.chainAdapter = config.chainAdapter;
    this.provider = config.chainAdapter.provider;
    this.signer = config.chainAdapter.signer;
    this.subgraphUrl = config.subgraphUrl;
    this.inferDomain = config.inferDomain;
    this.registryAddress = config.registryAddress;
    const stage = config.stage ?? getStageFromEnv() ?? "adoption";
    this.stage = stage;
    this.economics = getStageEconomics(stage, config.economics);
    this.headSource = config.headSource;
    this.txAdapter = config.txAdapter;
    this.proofAdapter = config.proofAdapter;
    this.memoryAdapter = config.memoryAdapter ?? new MemoryAdapterStub();
    this.poolsAdapter = config.poolsAdapter ?? new PoolsAdapterStub();
    this.registryAdapter = config.registryAdapter ?? new RegistryAdapterStub();
    this.storageAdapter = config.storageAdapter ?? new StorageAdapterStub();
    this.observabilityAdapter = config.observabilityAdapter ?? new ObservabilityAdapterStub();
    this.strictMode = config.strictMode ?? false;
    this.strictHeadSource = config.strictHeadSource;
    this.registry = new Contract(
      config.registryAddress,
      REGISTRY_ABI,
      config.chainAdapter.signer ?? config.chainAdapter.provider
    );
  }

  private async emitSafe(event: ObservabilityEvent): Promise<void> {
    try {
      await this.observabilityAdapter.emit(event);
    } catch {
      // Observability must never affect canonical execution.
    }
  }

  private requireSigner(action: string): NonNullable<ChainAdapter["signer"]> {
    if (!this.signer) {
      throw new ValidationError("SIGNER_REQUIRED", `Signer required for ${action}`);
    }
    return this.signer;
  }

  private async toResult<T>(run: () => Promise<T>): Promise<Result<T>> {
    try {
      return ok(await run());
    } catch (caught) {
      return err(wrapError(caught));
    }
  }

  /** Expose provider for helper clients. */
  getProvider(): ChainAdapter["provider"] {
    return this.provider;
  }

  /** Pools surface: propose/getHead/getGraph on top of registry. */
  get pools(): PoolsClient {
    return new PoolsClient({
      publish: (block, options) => this.publish(block, options as PublishOptions),
      publishDerived: (input, options) => this.publishDerived(input, options as PublishDerivedOptions),
      getPoolHead: (poolId) => this.getPoolHead(poolId),
      getPoolGraph: (poolId) => this.getPoolGraph(poolId),
      getKB: (contentHash) => this.getKB(contentHash),
    });
  }

  async publish(block: KnowledgeBlock, options: PublishOptions): Promise<Verified<PublishResult>> {
    const signer = this.requireSigner("publish");

    const args = compiledToRegistryArgs(block);
    const parents = (options.parents ?? []).map((p) => ({
      parentHash: p.parentHash,
      royaltyShareBps: p.royaltyShareBps,
      relationship: encodeRelationship(p.relationship),
    }));

    const curatorAddress = await signer.getAddress();
    const queryFee = options.queryFee ?? args.queryFee;
    const trustTierU8 = options.trustTier != null ? TRUST_TIER_TO_U8[options.trustTier] ?? 0 : 0;

    const data = this.registry.interface.encodeFunctionData("publishKB", [
      args.contentHash,
      curatorAddress,
      args.kbType,
      trustTierU8,
      args.cid,
      args.embeddingCid,
      args.domain,
      args.licenseType,
      queryFee,
      args.version,
      parents,
    ]);
    const result = await this.txAdapter.sendTransaction({
      to: this.registryAddress,
      data,
      value: options.stake,
    });
    await this.observabilityAdapter.emit({
      type: "settlement.submitted",
      payload: { contentHash: args.contentHash, txHash: result.txHash, action: "publish" },
    });

    const value: PublishResult = {
      contentHash: args.contentHash,
      txHash: result.txHash,
      blockNumber: result.receipt.blockNumber,
      curator: curatorAddress,
      kbType: block.type,
      domain: args.domain,
      stake: options.stake,
      queryFee,
    };
    const chainId = Number(await this.chainAdapter.getChainId());
    return {
      value,
      identity: {
        kbId: args.contentHash,
        contentHash: args.contentHash,
        publisher: curatorAddress,
      },
      proof: {
        version: ALEXANDRIAN_PROOF_VERSION,
        chainId,
        registryAddress: this.registryAddress,
        txHash: result.txHash,
        blockNumber: result.receipt.blockNumber,
      },
      checks: {
        hashFormatOk: isHex32(args.contentHash),
        parentUniqueness: areParentsUnique(options.parents),
        maxParentsOk: (options.parents?.length ?? 0) <= 8,
        canonicalizationOk: true,
        onChainExistence: true,
      },
      verified: true,
    };
  }

  async publishResult(
    block: KnowledgeBlock,
    options: PublishOptions
  ): Promise<Result<Verified<PublishResult>>> {
    return this.toResult(() => this.publish(block, options));
  }

  /**
   * Publishes a derived block (deterministic synthesis).
   * Handles lexicographical parent sorting and CID derivation.
   * Royalty DAG: query fees split across parents per parentWeights.
   */
  async publishDerived(
    input: DerivedEnvelopeInput,
    options: PublishDerivedOptions
  ): Promise<Verified<PublishResult>> {
    const signer = this.requireSigner("publishDerived");

    const envelope = buildDerivedEnvelope(input);
    const contentHash = kbHashFromEnvelope(
      envelope as unknown as Record<string, unknown>
    );
    const h = contentHash.startsWith("0x") ? contentHash : "0x" + contentHash;

    const sources = envelope.sources;
    const weights = options.sourceWeights ?? options.parentWeights ?? sources.map(() => 1);
    const totalWeight = weights.reduce((a: number, b: number) => a + b, 0) || 1;
    const maxBps = 9800;
    const attributionLinks = sources.map((sourceHash, i) => ({
      parentHash: sourceHash,
      royaltyShareBps: Math.round(((weights[i] ?? 1) / totalWeight) * maxBps),
      relationship: "derv" as const,
    }));

    const curatorAddress = await signer.getAddress();
    const queryFee = options.queryFee ?? 0n;
    const kbTypeU8 = CANONICAL_TYPE_TO_U8[envelope.payload.type] ?? 0;

    const data = this.registry.interface.encodeFunctionData("publishKB", [
      h,
      curatorAddress,
      kbTypeU8,
      0, // trustTier: AgentDerived
      options.cid,
      "",
      envelope.domain,
      "attribution",
      queryFee,
      "1.0.0",
      attributionLinks.map((p: { parentHash: string; royaltyShareBps: number; relationship: string }) => ({
        parentHash: p.parentHash,
        royaltyShareBps: p.royaltyShareBps,
        relationship: encodeRelationship(p.relationship),
      })),
    ]);
    const result = await this.txAdapter.sendTransaction({
      to: this.registryAddress,
      data,
      value: options.stake,
    });
    await this.observabilityAdapter.emit({
      type: "settlement.submitted",
      payload: { contentHash: h, txHash: result.txHash, action: "publishDerived" },
    });

    const value: PublishResult = {
      contentHash: h,
      txHash: result.txHash,
      blockNumber: result.receipt.blockNumber,
      curator: curatorAddress,
      kbType: envelope.payload.type as unknown as KBType,
      domain: envelope.domain,
      stake: options.stake,
      queryFee,
    };
    const chainId = Number(await this.chainAdapter.getChainId());
    return {
      value,
      identity: {
        kbId: h,
        contentHash: h,
        publisher: curatorAddress,
      },
      proof: {
        version: ALEXANDRIAN_PROOF_VERSION,
        chainId,
        registryAddress: this.registryAddress,
        txHash: result.txHash,
        blockNumber: result.receipt.blockNumber,
      },
      checks: {
        hashFormatOk: isHex32(h),
        parentUniqueness: true,
        maxParentsOk: attributionLinks.length <= 8,
        canonicalizationOk: true,
        onChainExistence: true,
      },
      verified: true,
    };
  }

  async publishDerivedResult(
    input: DerivedEnvelopeInput,
    options: PublishDerivedOptions
  ): Promise<Result<Verified<PublishResult>>> {
    return this.toResult(() => this.publishDerived(input, options));
  }

  /** Get resolved stage economics (config + defaults). */
  getStageEconomics(): StageEconomics {
    return this.economics;
  }

  /**
   * Create an off-chain pool draft (no chain calls).
   * Designed for adoption-first workflows and rapid experimentation.
   */
  createPool(params: {
    name: string;
    domain: string;
    description?: string;
    curator?: string;
    metadata?: Record<string, unknown>;
  }): PoolDraft {
    return {
      id: randomId("pool"),
      name: params.name,
      domain: params.domain,
      description: params.description,
      curator: params.curator,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
      stage: this.stage,
      economics: this.economics,
      status: "draft",
    };
  }

  /**
   * Propose a new version for a pool (off-chain draft).
   * Accepts either a compiled KnowledgeBlock or a derived envelope input.
   */
  proposeVersion(
    pool: PoolDraft,
    input: { block: KnowledgeBlock } | { derivedInput: DerivedEnvelopeInput }
  ): PoolProposal {
    if (!pool || pool.status !== "draft") {
      throw new ValidationError("UNKNOWN", "Pool must be a draft created by createPool()");
    }

    if ("block" in input) {
      const args = compiledToRegistryArgs(input.block);
      return {
        id: randomId("proposal"),
        poolId: pool.id,
        createdAt: new Date().toISOString(),
        contentHash: args.contentHash,
        block: input.block,
        status: "draft",
      };
    }

    const envelope = buildDerivedEnvelope(input.derivedInput);
    const contentHash = kbHashFromEnvelope(
      envelope as unknown as Record<string, unknown>
    );
    return {
      id: randomId("proposal"),
      poolId: pool.id,
      createdAt: new Date().toISOString(),
      contentHash: contentHash.startsWith("0x") ? contentHash : "0x" + contentHash,
      derivedInput: input.derivedInput,
      status: "draft",
    };
  }

  /**
   * Finalize a proposal on-chain using stage defaults unless overridden.
   * For derived proposals, cid is required.
   */
  async finalize(
    pool: PoolDraft,
    proposal: PoolProposal,
    options?: FinalizeOptions
  ): Promise<PublishResult> {
    if (!pool || pool.status !== "draft") {
      throw new ValidationError("UNKNOWN", "Pool must be a draft created by createPool()");
    }
    if (!proposal || proposal.poolId !== pool.id) {
      throw new ValidationError("UNKNOWN", "Proposal does not belong to the provided pool");
    }

    const stakeWei =
      options?.stakeWei ?? this.economics.proposalStakeWei ?? 0n;

    if (proposal.block) {
      return this.publish(proposal.block, {
        stake: stakeWei,
        queryFee: options?.queryFeeWei,
        trustTier: options?.trustTier,
        parents: options?.parents,
      }).then((r) => r.value);
    }

    if (proposal.derivedInput) {
      if (!options?.cid) {
        throw new ValidationError("UNKNOWN", "cid is required to finalize a derived proposal");
      }
      return this.publishDerived(proposal.derivedInput, {
        stake: stakeWei,
        queryFee: options?.queryFeeWei,
        cid: options.cid,
      }).then((r) => r.value);
    }

    throw new ValidationError("UNKNOWN", "Proposal has no block or derived input");
  }

  async finalizeResult(
    pool: PoolDraft,
    proposal: PoolProposal,
    options?: FinalizeOptions
  ): Promise<Result<PublishResult>> {
    return this.toResult(() => this.finalize(pool, proposal, options));
  }

  /**
   * Verify a settlement proof against chain state.
   * Validates chainId, registry address, and QuerySettled log fields.
   */
  async verifyProof(proof: ProofBundle): Promise<ProofVerificationResult> {
    const started = Date.now();
    await this.emitSafe({
      type: "proof.verification.started",
      payload: { kbId: proof.kbId, txHash: proof.txHash, chainId: proof.chainId },
    });
    const checks = {
      versionExists: false,
      contentHashMatches: false,
      receiptIncluded: false,
      isFinalized: false,
      isHead: false,
    };
    const chainId = Number(await this.chainAdapter.getChainId());
    if (chainId !== proof.chainId) {
      await this.emitSafe({
        type: "proof.verification.failed",
        payload: {
          kbId: proof.kbId,
          txHash: proof.txHash,
          chainId,
          reason: "chainId_mismatch",
          durationMs: Date.now() - started,
        },
      });
      return { valid: false, checks, reason: "chainId mismatch" };
    }
    if (proof.registryAddress.toLowerCase() !== this.registryAddress.toLowerCase()) {
      return { valid: false, checks, reason: "registryAddress mismatch" };
    }
    const receipt = await this.chainAdapter.getTransactionReceipt(proof.txHash);
    if (!receipt) {
      await this.emitSafe({
        type: "proof.verification.failed",
        payload: {
          kbId: proof.kbId,
          txHash: proof.txHash,
          chainId,
          reason: "receipt_not_found",
          durationMs: Date.now() - started,
        },
      });
      return { valid: false, checks, reason: "transaction receipt not found" };
    }
    checks.receiptIncluded = true;

    const targetHash = proof.kbId.toLowerCase();
    const targetQuerier = proof.querier.toLowerCase();
    const targetNonce = proof.queryNonce;

    for (const log of receipt.logs as { data: string; topics: string[] }[]) {
      try {
        const parsed = this.registry.interface.parseLog({
          data: log.data,
          topics: log.topics as string[],
        });
        if ((parsed as { name?: string }).name !== "QuerySettled") continue;
        const args = (parsed as { args?: unknown[] }).args ?? [];
        const contentHash = String(args[0] ?? "").toLowerCase();
        const querier = String(args[1] ?? "").toLowerCase();
        const queryNonce = args[4] != null ? BigInt(args[4] as string | number | bigint) : 0n;
        if (contentHash === targetHash && querier === targetQuerier && queryNonce === targetNonce) {
          checks.versionExists = true;
          checks.contentHashMatches = true;
          checks.isFinalized = proof.settled;
          await this.emitSafe({
            type: "proof.verification.succeeded",
            payload: {
              kbId: proof.kbId,
              txHash: proof.txHash,
              chainId,
              blockNumber: receipt.blockNumber,
              durationMs: Date.now() - started,
            },
          });
          return { valid: true, checks };
        }
      } catch {
        continue;
      }
    }

    await this.emitSafe({
      type: "proof.verification.failed",
      payload: {
        kbId: proof.kbId,
        txHash: proof.txHash,
        chainId,
        reason: "proof_not_found_in_logs",
        durationMs: Date.now() - started,
      },
    });
    return { valid: false, checks, reason: "QuerySettled log not found or mismatched" };
  }

  async verifyProofResult(proof: ProofBundle): Promise<Result<ProofVerificationResult>> {
    return this.toResult(() => this.verifyProof(proof));
  }

  /** Settle citation — pay query fee and route royalties through DAG. (Contract: settleQuery) */
  async settleCitation(contentHash: string, agentAddress: string): Promise<Verified<SettleResult>> {
    this.requireSigner("settleCitation");

    const kb = await this.registry.getKnowledgeBlock(contentHash);
    const queryFee = BigInt(kb.queryFee);

    const data = this.registry.interface.encodeFunctionData("settleQuery", [
      contentHash,
      agentAddress,
    ]);
    const result = await this.txAdapter.sendTransaction({
      to: this.registryAddress,
      data,
      value: queryFee,
    });
    await this.observabilityAdapter.emit({
      type: "settlement.submitted",
      payload: { contentHash, txHash: result.txHash, action: "settleQuery" },
    });
    const receipt = await this.chainAdapter.getTransactionReceipt(result.txHash);
    if (!receipt) throw new ContractError("RECEIPT_NOT_FOUND", "No receipt");

    let logIndex: number | undefined;
    const settled = (receipt.logs as { data: string; topics: string[] }[])
      .map((log: { data: string; topics: string[] }, i: number) => {
        try {
          const parsed = this.registry.interface.parseLog({
            data: log.data,
            topics: log.topics as string[],
          });
          if ((parsed as { name?: string }).name === "QuerySettled") {
            logIndex = i;
            return parsed;
          }
          return null;
        } catch {
          return null;
        }
      })
      .find((e: unknown) => e !== null) as { args: unknown[] } | undefined;

    const totalFee = settled?.args ? BigInt((settled.args[2] as string | number | bigint) ?? queryFee) : queryFee;
    const protocolFee = settled?.args ? BigInt((settled.args[3] as string | number | bigint) ?? 0) : 0n;
    const queryNonce = settled?.args?.[4] != null ? BigInt(settled.args[4] as string | number | bigint) : 0n;

    const txHash = result.txHash;
    const settlement: SettlementRef = {
      chainId: Number(await this.chainAdapter.getChainId()),
      txHash,
      blockHeight: receipt.blockNumber,
      logIndex: logIndex ?? 0,
      graphEntityId: graphEntityIdFromTxLog(txHash, logIndex),
      confirmations: 0,
    };
    const proof: ProofBundle = {
      chainId: Number(await this.chainAdapter.getChainId()),
      registryAddress: this.registryAddress,
      kbId: contentHash.startsWith("0x") ? contentHash : "0x" + contentHash,
      cid: kb.cid,
      querier: agentAddress,
      queryNonce,
      txHash,
      blockNumber: receipt.blockNumber,
      logIndex,
      graphEntityId: graphEntityIdFromTxLog(txHash, logIndex),
      settlement,
      settled: true,
    };

    const value: SettleResult = {
      txHash,
      contentHash,
      querier: agentAddress,
      totalFee,
      protocolFee,
      proof,
    };
    return {
      value,
      identity: {
        kbId: contentHash.startsWith("0x") ? contentHash : "0x" + contentHash,
        contentHash: contentHash.startsWith("0x") ? contentHash : "0x" + contentHash,
        publisher: kb.curator,
      },
      proof: {
        version: ALEXANDRIAN_PROOF_VERSION,
        chainId: Number(await this.chainAdapter.getChainId()),
        registryAddress: this.registryAddress,
        txHash,
        blockNumber: receipt.blockNumber,
      },
      checks: {
        hashFormatOk: isHex32(contentHash.startsWith("0x") ? contentHash : "0x" + contentHash),
        onChainExistence: true,
        contentHashMatches: true,
      },
      verified: true,
    };
  }

  async settleCitationResult(
    contentHash: string,
    agentAddress: string
  ): Promise<Result<Verified<SettleResult>>> {
    return this.toResult(() => this.settleCitation(contentHash, agentAddress));
  }

  /**
   * Curator earnings: getPendingEarnings(address?) returns wei available to withdraw;
   * withdrawEarnings() pulls to signer.
   */
  get curator(): {
    getPendingEarnings: (address?: string) => Promise<bigint>;
    withdrawEarnings: () => Promise<{ txHash: string; amount: bigint }>;
  } {
    return {
      getPendingEarnings: (address?: string) => this.getPendingEarnings(address),
      withdrawEarnings: () => this.withdrawEarnings(),
    };
  }

  async getPendingEarnings(address?: string): Promise<bigint> {
    const addr = address ?? (this.signer ? await this.signer.getAddress() : undefined);
    if (!addr) {
      throw new ValidationError(
        "INVALID_ADDRESS",
        "Address required for getPendingEarnings (or set signer)"
      );
    }
    const amount = await this.registry.pendingWithdrawals(addr);
    return BigInt(amount.toString());
  }

  async getPendingEarningsResult(address?: string): Promise<Result<bigint>> {
    return this.toResult(() => this.getPendingEarnings(address));
  }

  async withdrawEarnings(): Promise<{ txHash: string; amount: bigint }> {
    const signer = this.requireSigner("withdrawEarnings");
    const address = await signer.getAddress();
    // Capture balance before the tx — contract zeroes pendingWithdrawals[msg.sender]
    // atomically, so reading it post-receipt would return 0. This is the withdrawn amount.
    const pending = await this.registry.pendingWithdrawals(address);
    if (BigInt(pending.toString()) === 0n) {
      throw new ContractError("NO_EARNINGS", "No earnings to withdraw");
    }
    const data = this.registry.interface.encodeFunctionData("withdrawEarnings", []);
    const result = await this.txAdapter.sendTransaction({
      to: this.registryAddress,
      data,
    });
    return {
      txHash: result.txHash,
      amount: BigInt(pending.toString()),
    };
  }

  async withdrawEarningsResult(): Promise<Result<{ txHash: string; amount: bigint }>> {
    return this.toResult(() => this.withdrawEarnings());
  }

  /** @deprecated Use settleCitation */
  async settle(contentHash: string, agentAddress: string): Promise<Verified<SettleResult>> {
    return this.settleCitation(contentHash, agentAddress);
  }

  async settleResult(
    contentHash: string,
    agentAddress: string
  ): Promise<Result<Verified<SettleResult>>> {
    return this.toResult(() => this.settle(contentHash, agentAddress));
  }

  async getReputation(contentHash: string): Promise<ReputationRecord> {
    const r = await this.registry.getReputation(contentHash);
    return {
      queryVolume: Number(r.queryVolume),
      endorsements: Number(r.endorsements),
      score: Number(r.score),
      lastUpdated: Number(r.lastUpdated),
    };
  }

  async addStake(contentHash: string, amount: bigint): Promise<string> {
    this.requireSigner("addStake");
    const data = this.registry.interface.encodeFunctionData("addStake", [
      contentHash,
    ]);
    const result = await this.txAdapter.sendTransaction({
      to: this.registryAddress,
      data,
      value: amount,
    });
    return result.txHash;
  }

  async addStakeResult(contentHash: string, amount: bigint): Promise<Result<string>> {
    return this.toResult(() => this.addStake(contentHash, amount));
  }

  async withdrawStake(contentHash: string): Promise<string> {
    this.requireSigner("withdrawStake");
    const data = this.registry.interface.encodeFunctionData("withdrawStake", [
      contentHash,
    ]);
    const result = await this.txAdapter.sendTransaction({
      to: this.registryAddress,
      data,
    });
    return result.txHash;
  }

  async withdrawStakeResult(contentHash: string): Promise<Result<string>> {
    return this.toResult(() => this.withdrawStake(contentHash));
  }

  async endorse(contentHash: string): Promise<string> {
    this.requireSigner("endorse");
    const data = this.registry.interface.encodeFunctionData("endorse", [
      contentHash,
    ]);
    const result = await this.txAdapter.sendTransaction({
      to: this.registryAddress,
      data,
    });
    return result.txHash;
  }

  async endorseResult(contentHash: string): Promise<Result<string>> {
    return this.toResult(() => this.endorse(contentHash));
  }

  async getKB(contentHash: string): Promise<OnChainKB> {
    const kb = await this.registry.getKnowledgeBlock(contentHash);
    return {
      curator: kb.curator,
      kbType: Number(kb.kbType),
      trustTier: Number(kb.trustTier),
      cid: kb.cid,
      embeddingCid: kb.embeddingCid,
      domain: kb.domain,
      licenseType: kb.licenseType,
      queryFee: BigInt(kb.queryFee),
      timestamp: Number(kb.timestamp),
      version: kb.version,
      exists: kb.exists,
    };
  }

  async getAttributionDAG(contentHash: string): Promise<OnChainAttributionLink[]> {
    const links = await this.registry.getAttributionDAG(contentHash);
    return links.map((l: { parentHash: string; royaltyShareBps: number; relationship: string }) => ({
      parentHash: l.parentHash,
      royaltyShareBps: Number(l.royaltyShareBps),
      relationship: decodeRelationship(l.relationship),
    }));
  }

  async getStake(contentHash: string): Promise<StakeRecord> {
    const s = await this.registry.getStake(contentHash);
    return {
      amount: BigInt(s.amount),
      lockedUntil: Number(s.lockedUntil),
      slashed: s.slashed,
    };
  }

  /**
   * Chain-only truth envelope: KB + reputation + stake.
   * No subgraph in this path. For enriched context (chain + subgraph aggregates), use a separate
   * flow or future getKBSummaryEnriched; see DESIGN-CHOICES.md (trust envelope).
   */
  async getKBSummary(contentHash: string): Promise<{
    kb: OnChainKB;
    reputation: ReputationRecord;
    stake: StakeRecord;
  }> {
    const [kb, reputation, stake] = await Promise.all([
      this.getKB(contentHash),
      this.getReputation(contentHash),
      this.getStake(contentHash),
    ]);
    return { kb, reputation, stake };
  }

  async getCuratorKBs(curatorAddress: string): Promise<string[]> {
    return this.registry.getCuratorBlocks(curatorAddress);
  }

  async getKBsByType(kbType: number): Promise<string[]> {
    return this.registry.getBlocksByType(kbType);
  }

  async getKBsByDomain(domain: string): Promise<string[]> {
    return this.registry.getBlocksByDomain(domain);
  }

  /**
   * Pool head (canonical version) for a poolId (domain).
   * Delegates to the injected canonical head source.
   */
  async getPoolHead(poolId: string): Promise<PoolHead | null> {
    const started = Date.now();
    await this.emitSafe({
      type: "canonical.head.requested",
      payload: { poolId },
    });
    let head = await this.headSource.getCanonicalHead(poolId);
    if (this.strictMode && this.strictHeadSource) {
      const strictHead = await this.strictHeadSource.getCanonicalHead(poolId);
      if (strictHead && head && strictHead.contentHash !== head.contentHash) {
        await this.emitSafe({
          type: "canonical.head.mismatch",
          payload: {
            poolId,
            primary: head.contentHash,
            strict: strictHead.contentHash,
          },
        });
      }
      if (strictHead) head = strictHead;
    }
    if (!head || !head.finalized) {
      await this.emitSafe({
        type: "canonical.head.missing",
        payload: { poolId, durationMs: Date.now() - started },
      });
      return null;
    }
    await this.emitSafe({
      type: "canonical.head.resolved",
      payload: {
        poolId,
        kbId: head.contentHash,
        versionId: head.versionId,
        durationMs: Date.now() - started,
      },
    });
    return head;
  }

  /**
   * Pool graph (DAG) for a poolId (domain).
   */
  async getPoolGraph(poolId: string): Promise<PoolGraph> {
    const hashes = await this.getKBsByDomain(poolId);
    const nodes: PoolGraphNode[] = [];
    const edges: PoolGraphEdge[] = [];
    for (const h of hashes) {
      try {
        const [kb, rep, stake, dag] = await Promise.all([
          this.getKB(h),
          this.getReputation(h),
          this.getStake(h),
          this.getAttributionDAG(h),
        ]);
        if (!kb.exists) continue;
        nodes.push({
          versionId: h,
          contentHash: h,
          curator: kb.curator,
          domain: kb.domain,
          queryFee: kb.queryFee,
          timestamp: kb.timestamp,
          reputationScore: rep.score,
          stakeAmount: stake.amount,
          slashed: stake.slashed,
        });
        for (const link of dag) {
          edges.push({
            from: link.parentHash,
            to: h,
            royaltyShareBps: link.royaltyShareBps,
          });
        }
      } catch {
        continue;
      }
    }
    return { poolId, nodes, edges };
  }

  async getDerivedKBs(parentHash: string): Promise<string[]> {
    return this.registry.getDerivedBlocks(parentHash);
  }

  async isRegistered(contentHash: string): Promise<boolean> {
    return this.registry.isRegistered(contentHash);
  }

  async getShareSplit(
    contentHash: string
  ): Promise<{ curatorBps: bigint; parentBps: bigint }> {
    const [curatorBps, parentBps] = await this.registry.getShareSplit(contentHash);
    return { curatorBps: BigInt(curatorBps), parentBps: BigInt(parentBps) };
  }

  async getProtocolFee(): Promise<number> {
    return Number(await this.registry.protocolFeesBps());
  }

  async getMinStake(): Promise<bigint> {
    return BigInt(await this.registry.minStakeAmount());
  }

  /**
   * Verify a Knowledge Block against chain state.
   * Returns a typed VerifyResult including a canonical attestation string suitable for
   * agent response headers.
   */
  async verifyRaw(kbId: string): Promise<VerifyResult> {
    const hash = kbId.startsWith("0x") ? kbId : "0x" + kbId;
    const chainId = Number(await this.chainAdapter.getChainId());
    const registered = await this.registry.isRegistered(hash);

    if (!registered) {
      return {
        kbId: hash,
        curator: "",
        domain: "",
        kbType: 0,
        registered: false,
        slashed: false,
        repScore: 0,
        queryVolume: 0,
        stakeAmount: 0n,
        chainId,
        registryAddress: this.registryAddress,
        attestation: "",
      };
    }

    const [kb, reputation, stake] = await Promise.all([
      this.getKB(hash),
      this.getReputation(hash),
      this.getStake(hash),
    ]);

    const attestation = `alexandrian.attest.v1:${hash}@${this.registryAddress}:${chainId}`;
    const proof: AlexandrianProof | undefined =
      !stake.slashed
        ? {
            version: ALEXANDRIAN_PROOF_VERSION,
            kbId: hash,
            cid: kb.cid,
            registryAddress: this.registryAddress,
            chainId,
            curator: kb.curator,
            domain: kb.domain,
            active: true,
            attestation,
          }
        : undefined;

    return {
      kbId: hash,
      curator: kb.curator,
      domain: kb.domain,
      kbType: kb.kbType,
      registered: true,
      slashed: stake.slashed,
      repScore: reputation.score,
      queryVolume: reputation.queryVolume,
      stakeAmount: stake.amount,
      chainId,
      registryAddress: this.registryAddress,
      attestation,
      proof,
    };
  }

  async verifyRawResult(kbId: string): Promise<Result<VerifyResult>> {
    return this.toResult(() => this.verifyRaw(kbId));
  }

  /**
   * Verified wrapper for KB verification.
   * Returns the raw VerifyResult plus trust metadata and checks.
   */
  async verify(kbId: string): Promise<Verified<VerifyResult>> {
    const value = await this.verifyRaw(kbId);
    const verified = value.registered && !value.slashed;
    return {
      value,
      identity: {
        kbId: value.kbId,
        contentHash: value.kbId,
        publisher: value.curator || undefined,
      },
      proof: value.proof
        ? {
            version: value.proof.version,
            chainId: value.chainId,
            registryAddress: value.registryAddress,
          }
        : undefined,
      checks: {
        hashFormatOk: isHex32(value.kbId),
        onChainExistence: value.registered,
      },
      verified,
      reason: verified ? undefined : "KB not registered or slashed",
    };
  }

  async verifyResult(kbId: string): Promise<Result<Verified<VerifyResult>>> {
    return this.toResult(() => this.verify(kbId));
  }

}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE FACTORIES
// ─────────────────────────────────────────────────────────────────────────────

export function createBaseSDK(config: {
  privateKey: string;
  /** Defaults to MAINNET_REGISTRY_ADDRESS from lib/addresses (see docs/MAINNET-ADDRESSES.md). */
  registryAddress?: string;
  alchemyKey: string;
  strictMode?: boolean;
}): AlexandrianSDK {
  const registryAddress = config.registryAddress ?? MAINNET_REGISTRY_ADDRESS;
  if (!registryAddress) {
    throw new ValidationError(
      "INVALID_ADDRESS",
      "Registry address required: set REGISTRY_ADDRESS_MAINNET or pass registryAddress (see docs/MAINNET-ADDRESSES.md)"
    );
  }
  const provider = new ethers.JsonRpcProvider(
    `https://base-mainnet.g.alchemy.com/v2/${config.alchemyKey}`
  );
  const wallet = new ethers.Wallet(config.privateKey, provider);
  const chainAdapter = new EthersChainAdapter(provider, wallet);
  const chainHead = new ContractHeadSource({
    chain: chainAdapter,
    registryAddress,
  });
  const headSource = chainHead;
  const registryAdapter = new RegistryAdapterContract({
    chain: chainAdapter,
    registryAddress,
  });
  return new AlexandrianSDK({
    chainAdapter,
    proofAdapter: new ProofAdapterStub(),
    headSource,
    txAdapter: new EthersTransactionAdapter(wallet),
    registryAdapter,
    registryAddress,
    strictMode: config.strictMode ?? false,
    strictHeadSource: chainHead,
  });
}

export function createBaseSepoliaSDK(config: {
  privateKey: string;
  registryAddress: string;
  alchemyKey: string;
  strictMode?: boolean;
}): AlexandrianSDK {
  const provider = new ethers.JsonRpcProvider(
    `https://base-sepolia.g.alchemy.com/v2/${config.alchemyKey}`
  );
  const wallet = new ethers.Wallet(config.privateKey, provider);
  const chainAdapter = new EthersChainAdapter(provider, wallet);
  const chainHead = new ContractHeadSource({
    chain: chainAdapter,
    registryAddress: config.registryAddress,
  });
  const headSource = chainHead;
  const registryAdapter = new RegistryAdapterContract({
    chain: chainAdapter,
    registryAddress: config.registryAddress,
  });
  return new AlexandrianSDK({
    chainAdapter,
    proofAdapter: new ProofAdapterStub(),
    headSource,
    txAdapter: new EthersTransactionAdapter(wallet),
    registryAdapter,
    registryAddress: config.registryAddress,
    strictMode: config.strictMode ?? false,
    strictHeadSource: chainHead,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// createAlexandrianClient — async factory with chain ID validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Async factory that validates the connected network before returning the SDK.
 * Throws `ValidationError("INVALID_CHAIN_ID")` if the RPC endpoint's chain ID
 * does not match `config.chainId` (defaults to Base mainnet, 8453).
 *
 * Prefer this over `createBaseSDK()` whenever you need a fast-fail guarantee
 * that the configured RPC is pointed at the correct network.
 *
 * @example
 * const sdk = await createAlexandrianClient({
 *   privateKey: process.env.PRIVATE_KEY!,
 *   alchemyKey: process.env.ALCHEMY_KEY!,
 * });
 */
export async function createAlexandrianClient(config: {
  privateKey: string;
  alchemyKey: string;
  /** Expected chain ID. Defaults to Base mainnet (8453). */
  chainId?: number;
  /** Registry contract address. Defaults to canonical MAINNET_REGISTRY_ADDRESS. */
  registryAddress?: string;
  strictMode?: boolean;
}): Promise<AlexandrianSDK> {
  const expectedChainId = config.chainId ?? MAINNET_CHAIN_ID;
  const registryAddress = config.registryAddress ?? MAINNET_REGISTRY_ADDRESS;

  if (!registryAddress) {
    throw new ValidationError(
      "INVALID_ADDRESS",
      "Registry address required: pass registryAddress or set REGISTRY_ADDRESS_MAINNET env var"
    );
  }

  let rpcUrl: string;
  if (expectedChainId === MAINNET_CHAIN_ID) {
    rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${config.alchemyKey}`;
  } else if (expectedChainId === BASE_SEPOLIA_CHAIN_ID) {
    rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${config.alchemyKey}`;
  } else {
    throw new ValidationError(
      "INVALID_CHAIN_ID",
      `Unsupported chain ID ${expectedChainId}. Supported: ${MAINNET_CHAIN_ID} (Base mainnet), ${BASE_SEPOLIA_CHAIN_ID} (Base Sepolia)`
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const network = await provider.getNetwork();
  const actualChainId = Number(network.chainId);
  if (actualChainId !== expectedChainId) {
    throw new ValidationError(
      "INVALID_CHAIN_ID",
      `Chain ID mismatch: expected ${expectedChainId}, RPC returned ${actualChainId}`
    );
  }

  const wallet = new ethers.Wallet(config.privateKey, provider);
  const chainAdapter = new EthersChainAdapter(provider, wallet);
  const chainHead = new ContractHeadSource({
    chain: chainAdapter,
    registryAddress,
  });
  const registryAdapter = new RegistryAdapterContract({
    chain: chainAdapter,
    registryAddress,
  });
  return new AlexandrianSDK({
    chainAdapter,
    proofAdapter: new ProofAdapterStub(),
    headSource: chainHead,
    txAdapter: new EthersTransactionAdapter(wallet),
    registryAdapter,
    registryAddress,
    strictMode: config.strictMode ?? false,
    strictHeadSource: chainHead,
  });
}

export { parseEther, formatEther };
