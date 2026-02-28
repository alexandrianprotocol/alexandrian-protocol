import type { KnowledgeBlock } from "@alexandrian/protocol/schema/legacy";
import type { DerivedEnvelopeInput } from "@alexandrian/protocol/core";
import type { ContentPointer, Receipt } from "./utils.js";
import { hashContent } from "./utils.js";

export interface PublishResult {
  contentHash: string;
  txHash: string;
  blockNumber: number;
}

type PoolsSDK = {
  publish: (block: KnowledgeBlock, options: unknown) => Promise<unknown>;
  publishDerived: (input: DerivedEnvelopeInput, options: unknown) => Promise<unknown>;
  getPoolHead: (poolId: string) => Promise<PoolHead | null>;
  getPoolGraph: (poolId: string) => Promise<PoolGraph>;
  getKB: (contentHash: string) => Promise<unknown>;
  /** Injectable clock for deterministic receipt timestamps. Defaults to Date.now. */
  nowMs?: () => number;
};

export interface PoolHead {
  poolId: string;
  versionId: string;
  contentHash: string;
  finalized: boolean;
  stakeTotal: bigint;
  timestamp: number;
}

export interface PoolGraphNode {
  versionId: string;
  contentHash: string;
  curator: string;
  domain: string;
  queryFee: bigint;
  timestamp: number;
  reputationScore: number;
  stakeAmount: bigint;
  slashed: boolean;
}

export interface PoolGraphEdge {
  from: string;
  to: string;
  royaltyShareBps: number;
}

export interface PoolGraph {
  poolId: string;
  nodes: PoolGraphNode[];
  edges: PoolGraphEdge[];
}

/**
 * Pools client: minimal surface for "pool-like" interactions on top of the registry.
 * Note: Until KnowledgePool.sol exists, pools map to domain strings.
 */
export class PoolsClient {
  private readonly nowMs: () => number;

  constructor(private readonly sdk: PoolsSDK) {
    this.nowMs = sdk.nowMs ?? Date.now;
  }

  /** Publish (propose) a compiled KnowledgeBlock on-chain. */
  async propose(params: { block: KnowledgeBlock; stake: bigint }): Promise<PublishResult> {
    return this.sdk.publish(params.block, { stake: params.stake }) as Promise<PublishResult>;
  }

  /** Publish (propose) a derived envelope on-chain. */
  async proposeDerived(params: { input: DerivedEnvelopeInput; cid: string; stake: bigint }): Promise<PublishResult> {
    return this.sdk.publishDerived(params.input, { cid: params.cid, stake: params.stake }) as Promise<PublishResult>;
  }

  /** Canonical head for a poolId (domain). */
  async getHead(poolId: string): Promise<PoolHead | null> {
    return this.sdk.getPoolHead(poolId);
  }

  /** Version graph for a poolId (domain). */
  async getGraph(poolId: string): Promise<PoolGraph> {
    return this.sdk.getPoolGraph(poolId);
  }

  /** Fetch a version by content hash. */
  async getVersion(contentHash: string) {
    return this.sdk.getKB(contentHash);
  }

  /**
   * SDK v2-style proposeVersion using ContentPointer.
   * This returns a deterministic contentHash, then calls SDK publish if possible.
   * Note: Until KnowledgePool.sol is implemented, poolId maps to domain.
   */
  async proposeVersion(params: {
    poolId: string;
    parentId: string;
    content: ContentPointer;
    stake: bigint;
  }): Promise<{ versionId: string; contentHash: string; receipt: Receipt }> {
    const contentHash = hashContent(params.content.content);
    const published = await this.sdk.publishDerived(
      {
        domain: params.poolId,
        sources: params.parentId ? [params.parentId] : [],
        payload: { type: "practice", rationale: JSON.stringify(params.content.content), contexts: [], failureModes: [] },
      } as unknown as DerivedEnvelopeInput,
      { cid: params.content.uri ?? "", stake: params.stake, queryFee: 0n }
    ) as PublishResult;
    return {
      versionId: (published as PublishResult).contentHash,
      contentHash,
      receipt: {
        txHash: (published as PublishResult).txHash,
        blockHeight: (published as PublishResult).blockNumber,
        timestamp: this.nowMs(),
        chainId: "0",
      },
    };
  }
}
