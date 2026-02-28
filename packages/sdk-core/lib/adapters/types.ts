import type { Provider, Signer } from "ethers";

export type ChainAdapter = {
  provider: Provider;
  signer?: Signer;
  getChainId(): Promise<string>;
  getBlockNumber(): Promise<number>;
  getTransactionReceipt(txHash: string): Promise<{
    status: number;
    blockNumber: number;
    logs: unknown[];
  } | null>;
  callContract<T = unknown>(
    address: string,
    abi: unknown,
    method: string,
    args: unknown[]
  ): Promise<T>;
};

export type ProofAdapter = {
  verifyProof(
    proof: unknown,
    chainSnapshot: {
      blockNumber: number;
      receipts: Record<string, unknown>;
    }
  ): Promise<{
    valid: boolean;
    checks: {
      versionExists: boolean;
      receiptIncluded: boolean;
      contentHashMatches: boolean;
      isFinalized: boolean;
      isHead: boolean;
    };
    reason?: string;
  }>;
};

export type TransactionAdapter = {
  sendTransaction(request: { to: string; data: string; value?: bigint }): Promise<{
    txHash: string;
    receipt: {
      status: number;
      blockNumber: number;
    };
  }>;
};

export type PoolsAdapter = {
  getHead(poolId: string): Promise<unknown>;
  getGraph(poolId: string): Promise<unknown>;
  proposeVersion(params: unknown): Promise<unknown>;
};

export type RegistryAdapter = {
  isRegistered(contentHash: string): Promise<boolean>;
  getKnowledgeBlock(contentHash: string): Promise<unknown>;
  getReputation(contentHash: string): Promise<unknown>;
  getStake(contentHash: string): Promise<unknown>;
};
