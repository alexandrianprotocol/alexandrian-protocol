export type {
  ChainAdapter,
  TransactionAdapter,
  ProofAdapter,
  PoolsAdapter,
  RegistryAdapter,
} from "@alexandrian/sdk-core";

import type { MemoryEnvelope, MemoryHead, MemoryProof } from "../../types/memory.js";
import type { PoolHead } from "../pools.js";

export type HeadSource = {
  getCanonicalHead(poolId: string): Promise<PoolHead | null>;
};

export type MemoryAdapter = {
  getCanonicalHead(kbId: string): Promise<MemoryHead | null>;
  getByHash(contentHash: string): Promise<MemoryEnvelope | null>;
  verifyProof(proof: MemoryProof): Promise<boolean>;
  syncFromHeadEvent(payload: unknown): Promise<void>;
};

export type StorageAdapter = {
  put(key: string, value: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
};
