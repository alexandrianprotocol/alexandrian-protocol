import { canonicalize, contentHashFromCanonical } from "@alexandrian/protocol";
import type { StorageAdapter } from "../adapters/types.js";
import type { AlexandrianSDK } from "../../client/AlexandrianSDK.js";
import type {
  CanonicalMemoryAdapter as CanonicalMemoryAdapterContract,
  MemoryEnvelope,
  MemoryHead,
  MemoryProof,
} from "../../types/memory.js";
import type { AlexandrianProof } from "@alexandrian/protocol/schema";

export interface CanonicalMemoryConfig {
  sdk: AlexandrianSDK;
  storage: StorageAdapter;
}

export class CanonicalMemoryAdapter implements CanonicalMemoryAdapterContract {
  constructor(private readonly config: CanonicalMemoryConfig) {
    if (!config.storage) {
      throw new Error("StorageAdapter required for CanonicalMemoryAdapter");
    }
  }

  /** Deterministic content hash for a memory envelope (JCS + keccak256). */
  hashEnvelope(envelope: MemoryEnvelope): string {
    const canonical = canonicalize(normalizeForHash(envelope));
    return contentHashFromCanonical(canonical);
  }

  async getCanonicalHead(_kbId: string): Promise<MemoryHead | null> {
    const head = await this.config.sdk.getPoolHead(_kbId);
    if (!head) return null;
    return {
      kbId: head.contentHash,
      version: head.versionId,
      contentHash: head.contentHash,
      finalized: head.finalized,
    };
  }

  async getByHash(contentHash: string): Promise<MemoryEnvelope | null> {
    const bytes = await this.config.storage.get(contentHash);
    if (!bytes) return null;
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as MemoryEnvelope;
  }

  async verifyProof(_proof: MemoryProof): Promise<boolean> {
    // TODO: enforce M6 proof binding via SDK proof verification.
    return false;
  }

  async syncFromHeadEvent(_payload: unknown): Promise<void> {
    // TODO: M5 idempotent sync from HeadUpdated event.
  }

  /**
   * Load canonical memory for a poolId:
   * - Resolve canonical head
   * - Verify proof
   * - Fetch by CID
   * - Recompute hash and compare
   */
  async loadCanonical(poolId: string): Promise<{
    envelope: MemoryEnvelope;
    proof: AlexandrianProof;
    cid: string;
  }> {
    const head = await this.config.sdk.getPoolHead(poolId);
    if (!head || !head.finalized) {
      throw new Error("Canonical head not finalized");
    }

    const verify = await this.config.sdk.verify(head.contentHash);
    if (!verify.proof) {
      throw new Error("Canonical proof invalid");
    }
    const proof = verify.proof as Record<string, unknown>;

    const kb = await this.config.sdk.getKB(head.contentHash);
    const cid = (proof["cid"] as string | undefined) ?? ((kb as unknown as Record<string, unknown>)["cid"] as string | undefined);
    if (!cid) throw new Error("Missing CID for canonical memory");

    const bytes = await this.config.storage.get(cid as string);
    if (!bytes) throw new Error("Artifact not found in storage");

    const json = new TextDecoder().decode(bytes);
    const envelope = JSON.parse(json) as MemoryEnvelope;
    const canonical = canonicalize(envelope);
    const contentHash = contentHashFromCanonical(canonical);

    if (contentHash.toLowerCase() !== head.contentHash.toLowerCase()) {
      throw new Error("Artifact hash mismatch");
    }

    // Optional local cache keyed by contentHash.
    await this.config.storage.put(head.contentHash, bytes);

    return { envelope, proof: verify.proof as AlexandrianProof, cid: cid as string };
  }
}

/**
 * Memory-layer normalization: NFC-normalizes all strings and validates types.
 * Intentionally broader than protocol/src/canonical.ts normalizeForHash, which
 * scopes to HASH_SCOPE_KEYS only. This function is used for MemoryEnvelope
 * content hashing and must NOT be used for KB identity (kbHashFromEnvelope).
 */
function normalizeForHash(value: unknown): unknown {
  if (value === undefined) {
    throw new Error("Undefined values are not allowed in canonical memory");
  }
  if (value === null) return null;
  if (typeof value === "string") return value.normalize("NFC");
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Non-finite number in canonical memory");
    }
    return value;
  }
  if (typeof value === "bigint") {
    throw new Error("BigInt values are not allowed in canonical memory");
  }
  if (Array.isArray(value)) return value.map(normalizeForHash);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      out[key] = normalizeForHash(obj[key]);
    }
    return out;
  }
  throw new Error("Unsupported type in canonical memory");
}
