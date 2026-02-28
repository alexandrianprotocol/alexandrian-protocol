/**
 * Canonical Memory Adapter — SDK Tier-1 invariants.
 *
 * This file defines the stable shape of memory envelopes and adapter contracts.
 * The implementation must enforce deterministic serialization + hashing.
 */

export type MemoryVersion = number | string;

export type MemoryEnvelope = {
  kbId: string;
  version: MemoryVersion;
  type: string;
  content: unknown;
  metadata?: {
    author?: string;
    timestamp?: string;
    dependencies?: string[];
    [key: string]: unknown;
  };
};

export type MemoryHead = {
  kbId: string;
  version: MemoryVersion;
  contentHash: string;
  finalized: boolean;
};

export type MemoryState = {
  kbId: string;
  versionId: string;
  contentHash: string;
  cid: string;
};

export type MemoryProof = {
  contentHash: string;
  proof: unknown;
};

export type MemoryAdapterConfig = {
  strict?: boolean;
  maxDepth?: number;
};

export interface CanonicalMemoryAdapter {
  getCanonicalHead(kbId: string): Promise<MemoryHead | null>;
  getByHash(contentHash: string): Promise<MemoryEnvelope | null>;
  verifyProof(proof: MemoryProof): Promise<boolean>;
  syncFromHeadEvent(payload: unknown): Promise<void>;
}
