import type { MemoryAdapter } from "./types.js";

/**
 * Stub memory adapter. Replace with Canonical Memory Adapter implementation.
 */
export class MemoryAdapterStub implements MemoryAdapter {
  async getCanonicalHead(_kbId: string) {
    return null;
  }
  async getByHash(_contentHash: string) {
    return null;
  }
  async verifyProof(_proof: unknown) {
    return false;
  }
  async syncFromHeadEvent(_payload: unknown): Promise<void> {}
}

