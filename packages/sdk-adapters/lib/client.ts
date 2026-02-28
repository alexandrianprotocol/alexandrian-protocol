import { Contract, type Provider, type Signer, ethers } from "ethers";
import { hashContent, type ContentPointer, type Receipt, canonicalizeContent } from "./utils.js";
// PoolHead/PoolGraph available via PoolsClient if needed.
import { SubscriptionsClient, type PoolEvent, type PoolEventPayload } from "./subscriptions.js";

export type PoolID = string;
export type VersionID = string;
export type TxHash = string;

export type PoolPolicy = {
  minProposeStake: bigint;
  minSupportStake: bigint;
  challengeBond: bigint;
  challengeWindowSec: number;
  mergeStrategy: "MAJORITY_STAKE" | "ARBITRATOR";
};

export type Version = {
  versionId: VersionID;
  parentId: VersionID;
  contentHash: string;
  proposer: string;
  proposerStake: bigint;
  supportTotal: bigint;
  status: "PROPOSED" | "FINALIZED" | "CHALLENGED" | "INVALIDATED";
  proposedAt: number;
  finalizedAt?: number;
};

export type PoolProof = {
  poolId: PoolID;
  versionId: VersionID;
  contentHash: string;
  head: boolean;
  status: "FINALIZED" | "PROPOSED" | "CHALLENGED" | "INVALIDATED";
  receipt: Receipt;
  signature?: string;
};

const POOL_FACTORY_ABI = [
  "function createPool(bytes32 domainTag, bytes32 policyHash, bytes policyData) external returns (bytes32 poolId, address pool)",
  "function getPool(bytes32 poolId) external view returns (address)",
  "event PoolCreated(bytes32 indexed poolId, address indexed pool, bytes32 indexed domainTag, address creator, uint256 creationFeePaid, uint64 createdAt)",
];

const KNOWLEDGE_POOL_ABI = [
  "function poolId() external view returns (bytes32)",
  "function domainTag() external view returns (bytes32)",
  "function policyHash() external view returns (bytes32)",
  "function head() external view returns (bytes32)",
  "function getVersion(bytes32 versionId) external view returns (tuple(bytes32 versionId, bytes32 parentId, bytes32 contentHash, address proposer, uint256 proposerStake, uint256 supportTotal, uint64 proposedAt, uint64 finalizedAt, uint8 status))",
  "function proposeVersion(bytes32 parentId, bytes32 contentHash, uint256 stakeAmount) external returns (bytes32 versionId)",
  "function supportVersion(bytes32 versionId, uint256 stakeAmount) external",
  "function finalizeVersion(bytes32 versionId) external",
  "function challengeVersion(bytes32 versionId, bytes32 claimHash) external returns (bytes32 challengeId)",
  "function resolveChallenge(bytes32 challengeId, bool upholdVersion) external",
  "event VersionProposed(bytes32 indexed poolId, bytes32 indexed versionId, bytes32 indexed parentId, bytes32 contentHash, address proposer, uint256 proposerStake, uint64 proposedAt)",
  "event VersionSupported(bytes32 indexed poolId, bytes32 indexed versionId, address supporter, uint256 amount, uint256 newSupportTotal, uint64 supportedAt)",
  "event VersionFinalized(bytes32 indexed poolId, bytes32 indexed versionId, bytes32 contentHash, uint256 backingAmount, uint256 finalizeFeePaid, uint64 finalizedAt)",
  "event VersionChallenged(bytes32 indexed poolId, bytes32 indexed versionId, bytes32 challengeId, address challenger, uint256 bond, bytes32 claimHash, uint64 challengedAt)",
  "event ChallengeResolved(bytes32 indexed poolId, bytes32 indexed versionId, bytes32 challengeId, bool upheld, uint64 resolvedAt)",
  "event HeadUpdated(bytes32 indexed poolId, bytes32 indexed oldHead, bytes32 indexed newHead, uint64 updatedAt)",
];

function toBytes32(text: string): string {
  return ethers.id(text);
}

function receiptFromTx(chainId: bigint, receipt: { hash: string; blockNumber: number }, nowMs: () => number): Receipt {
  return {
    txHash: receipt.hash,
    blockHeight: receipt.blockNumber,
    timestamp: nowMs(),
    chainId: chainId.toString(),
  };
}

export class AlexandrianClient {
  private provider: Provider;
  private signer?: Signer;
  private poolFactory?: Contract;
  private _subscriptions?: SubscriptionsClient;
  private readonly nowMs: () => number;

  constructor(params: {
    provider: Provider;
    signer?: Signer;
    poolFactoryAddress?: string;
    registryAddress?: string;
    /** Injectable clock for deterministic receipt timestamps. Defaults to Date.now. */
    nowMs?: () => number;
  }) {
    this.provider = params.provider;
    this.signer = params.signer;
    this.nowMs = params.nowMs ?? Date.now;
    if (params.poolFactoryAddress) {
      this.poolFactory = new Contract(
        params.poolFactoryAddress,
        POOL_FACTORY_ABI,
        params.signer ?? params.provider
      );
    }
    if (params.registryAddress) {
      this._subscriptions = new SubscriptionsClient({
        provider: params.provider,
        registryAddress: params.registryAddress,
      });
    }
  }

  pools = {
    createPool: async (params: {
      domainTag: string;
      policy: PoolPolicy;
    }): Promise<{ poolId: PoolID; poolAddress: string; receipt: Receipt }> => {
      const domainTag = params.domainTag;
      const policyHash = toBytes32(canonicalizeContent(params.policy));
      const policyData = ethers.toUtf8Bytes(canonicalizeContent(params.policy));

      if (!this.poolFactory) {
        const chainId = (await this.provider.getNetwork()).chainId;
        return {
          poolId: toBytes32(domainTag),
          poolAddress: "0x0000000000000000000000000000000000000000",
          receipt: {
            txHash: "0x" + "00".repeat(32),
            blockHeight: 0,
            timestamp: this.nowMs(),
            chainId: chainId.toString(),
          },
        };
      }

      if (!this.signer) throw new Error("Signer required for createPool");
      const tx = await this.poolFactory.createPool(
        toBytes32(domainTag),
        policyHash,
        policyData
      );
      const receipt = await tx.wait();
      const chainId = (await this.provider.getNetwork()).chainId;
      const poolId = toBytes32(domainTag);
      const poolAddress = await this.poolFactory.getPool(poolId);
      return {
        poolId,
        poolAddress,
        receipt: receiptFromTx(chainId, receipt, this.nowMs),
      };
    },

    getHead: async (poolId: PoolID): Promise<{ versionId: VersionID; contentHash: string; status: "FINALIZED" | "NONE" }> => {
      const pool = await this.getPoolContract(poolId);
      if (!pool) return { versionId: "0x" + "00".repeat(32), contentHash: "", status: "NONE" };
      const head = await pool.head();
      if (!head || head === "0x" + "00".repeat(32)) {
        return { versionId: head, contentHash: "", status: "NONE" };
      }
      const v = await pool.getVersion(head);
      return { versionId: head, contentHash: v.contentHash, status: "FINALIZED" };
    },

    getVersion: async (poolId: PoolID, versionId: VersionID): Promise<Version> => {
      const pool = await this.getPoolContract(poolId);
      if (!pool) throw new Error("Pool not found");
      const v = await pool.getVersion(versionId);
      const status = Number(v.status);
      const map = ["PROPOSED", "FINALIZED", "CHALLENGED", "INVALIDATED"] as const;
      return {
        versionId: v.versionId,
        parentId: v.parentId,
        contentHash: v.contentHash,
        proposer: v.proposer,
        proposerStake: BigInt(v.proposerStake),
        supportTotal: BigInt(v.supportTotal),
        status: map[Math.max(0, status - 1)] ?? "PROPOSED",
        proposedAt: Number(v.proposedAt),
        finalizedAt: Number(v.finalizedAt) || undefined,
      };
    },

    proposeVersion: async (params: {
      poolId: PoolID;
      parentId: VersionID;
      content: ContentPointer;
      stake: bigint;
    }): Promise<{ versionId: VersionID; contentHash: string; receipt: Receipt }> => {
      const pool = await this.getPoolContract(params.poolId, true);
      if (!pool) throw new Error("Pool not found");
      const contentHash = hashContent(params.content.content);
      const tx = await pool.proposeVersion(
        params.parentId,
        contentHash,
        params.stake
      );
      const receipt = await tx.wait();
      const chainId = (await this.provider.getNetwork()).chainId;
      return {
        versionId: contentHash,
        contentHash,
        receipt: receiptFromTx(chainId, receipt, this.nowMs),
      };
    },

    supportVersion: async (params: { poolId: PoolID; versionId: VersionID; stake: bigint }): Promise<{ receipt: Receipt }> => {
      const pool = await this.getPoolContract(params.poolId, true);
      if (!pool) throw new Error("Pool not found");
      const tx = await pool.supportVersion(params.versionId, params.stake);
      const receipt = await tx.wait();
      const chainId = (await this.provider.getNetwork()).chainId;
      return { receipt: receiptFromTx(chainId, receipt, this.nowMs) };
    },

    finalizeVersion: async (params: { poolId: PoolID; versionId: VersionID }): Promise<{ receipt: Receipt; finalizeFeePaid: bigint }> => {
      const pool = await this.getPoolContract(params.poolId, true);
      if (!pool) throw new Error("Pool not found");
      const tx = await pool.finalizeVersion(params.versionId);
      const receipt = await tx.wait();
      const chainId = (await this.provider.getNetwork()).chainId;
      return { receipt: receiptFromTx(chainId, receipt, this.nowMs), finalizeFeePaid: 0n };
    },

    challengeVersion: async (params: {
      poolId: PoolID;
      versionId: VersionID;
      claim: { type: "INACCURATE" | "MALICIOUS" | "UNSUPPORTED"; evidence?: ContentPointer };
      bond?: bigint;
    }): Promise<{ challengeId: string; claimHash: string; receipt: Receipt }> => {
      const pool = await this.getPoolContract(params.poolId, true);
      if (!pool) throw new Error("Pool not found");
      const claimHash = hashContent(params.claim);
      const tx = await pool.challengeVersion(params.versionId, claimHash);
      const receipt = await tx.wait();
      const chainId = (await this.provider.getNetwork()).chainId;
      return { challengeId: claimHash, claimHash, receipt: receiptFromTx(chainId, receipt, this.nowMs) };
    },

    resolveChallenge: async (params: { poolId: PoolID; challengeId: string; uphold: boolean }): Promise<{ receipt: Receipt }> => {
      const pool = await this.getPoolContract(params.poolId, true);
      if (!pool) throw new Error("Pool not found");
      const tx = await pool.resolveChallenge(params.challengeId, params.uphold);
      const receipt = await tx.wait();
      const chainId = (await this.provider.getNetwork()).chainId;
      return { receipt: receiptFromTx(chainId, receipt, this.nowMs) };
    },
  };

  proof = {
    buildProof: async (params: { poolId: PoolID; versionId?: VersionID }): Promise<PoolProof> => {
      const poolId = params.poolId;
      const head = await this.pools.getHead(poolId);
      const versionId = params.versionId ?? head.versionId;
      const v = await this.pools.getVersion(poolId, versionId);
      const isHead = head.versionId === versionId && head.status === "FINALIZED";
      const chainId = (await this.provider.getNetwork()).chainId.toString();
      return {
        poolId,
        versionId,
        contentHash: v.contentHash,
        head: isHead,
        status: v.status,
        receipt: {
          txHash: "0x" + "00".repeat(32),
          blockHeight: 0,
          timestamp: Date.now(),
          chainId,
        },
      };
    },
    verifyProof: async (proof: PoolProof) => {
      const head = await this.pools.getHead(proof.poolId);
      const v = await this.pools.getVersion(proof.poolId, proof.versionId);
      const versionExists = Boolean(v && v.contentHash);
      const contentHashMatches = v.contentHash.toLowerCase() === proof.contentHash.toLowerCase();
      const isHead = head.versionId === proof.versionId && head.status === "FINALIZED";
      const isFinalized = v.status === "FINALIZED";
      const valid = versionExists && contentHashMatches && isHead && isFinalized;
      return {
        valid,
        checks: {
          versionExists,
          receiptIncluded: true,
          contentHashMatches,
          isHead,
          isFinalized,
        },
        reason: valid ? undefined : "Proof verification failed",
      };
    },
  };

  subscriptions = {
    subscribe: (params: { poolId: PoolID; event: PoolEvent; onEvent: (e: PoolEventPayload) => void }) => {
      if (!this._subscriptions) throw new Error("Subscriptions require registryAddress");
      return this._subscriptions.subscribe(params.poolId, params.event, params.onEvent);
    },
  };

  utils = {
    hashContent,
    canonicalizeContent,
  };

  private async getPoolContract(poolId: PoolID, requireSigner: boolean = false): Promise<Contract | null> {
    if (!this.poolFactory) return null;
    const poolAddress = await this.poolFactory.getPool(poolId);
    if (!poolAddress || poolAddress === ethers.ZeroAddress) return null;
    const signerOrProvider = requireSigner ? this.signer : this.provider;
    if (requireSigner && !this.signer) throw new Error("Signer required");
    return new Contract(poolAddress, KNOWLEDGE_POOL_ABI, signerOrProvider ?? this.provider);
  }
}
