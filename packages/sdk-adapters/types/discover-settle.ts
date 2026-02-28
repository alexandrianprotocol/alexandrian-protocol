/**
 * SDK discover / quote / settle types — recommended signatures for agent-first flow.
 * Map subgraph candidates into Candidate; chain truth used only for settlement gates.
 */

/** Content hash (kbId) — 32-byte hex string. */
export type KbId = string;

/** Address — 20-byte hex string (0x-prefixed). */
export type Address = string;

/** Discover request: Graph-based candidate fetch with policy filters. */
export type DiscoverRequest = {
  domain: string;
  question?: string;
  minRep: number;
  maxPriceWei: bigint;
  freshnessWindowSec?: number;
  limit?: number;
};

/** Single candidate (from Graph + optional chain truth merge). */
export type Candidate = {
  kbId: KbId;
  curator: Address;
  domain: string;
  queryFeeWei: bigint;
  repScore: number;
  feesEarnedTotal: bigint;
  queryCountTotal: bigint;
  createdAt?: number;
  lastQueriedAt?: number;
  parentsCount?: number;
  /** Optional: chain-verified summary (exists, expiry, fee) for truth gate. */
  env?: {
    kbId: KbId;
    queryFeeWei: bigint;
    repScore: number;
    expiresAt?: number;
  };
};

/** Policy used for ranking (e.g. "feesEarnedTotal", "repScore"). */
export type RankPolicy = string;

export type DiscoverResponse = {
  candidates: Candidate[];
  policyUsed: RankPolicy;
};

export type QuoteRequest = {
  kbId: KbId;
  querier: Address;
  maxFeeWei?: bigint;
};

export type QuoteResult = {
  kbId: KbId;
  queryFeeWei: bigint;
  quoteBlockNumber: bigint;
};

export type SettleRequest = {
  kbId: KbId;
  querier: Address;
  maxFeeWei?: bigint;
  quoteBlockNumber?: bigint;
};

/** Proof bundle (V1) — for citation and verification. */
export type ProofV1 = {
  chainId: number;
  registryAddress: Address;
  kbId: KbId;
  querier: Address;
  queryNonce: bigint;
  txHash: string;
  blockNumber: number;
  logIndex?: number;
};

export type SettleReceipt = {
  txHash: string;
  blockNumber: number;
  success: boolean;
  queryNonce: bigint;
  proof: ProofV1;
};

export type SettleResponse = SettleReceipt;

export type DiscoverAndSettleRequest = DiscoverRequest & {
  querier: Address;
  fallbackK?: number;
  retries?: { attempts: number; backoffMs: number[] };
};

export type DiscoverAndSettleResponse = {
  chosen: Candidate;
  alternates: Candidate[];
  receipt: SettleReceipt;
  proof: ProofV1;
};

/** Fallback error kinds — retry next candidate on these when applicable. */
export type FallbackErrorKind =
  | "KB_EXPIRED"
  | "FEE_TOO_HIGH"
  | "SLIPPAGE"
  | "REVERT"
  | "RPC_TIMEOUT";

/** Abort (do not retry next candidate). */
export type AbortErrorKind = "INVALID_QUERIER" | "INSUFFICIENT_FUNDS" | "GRAPH_ERROR";
