import type { StorageAdapter } from "./types.js";

/**
 * Stub storage adapter. Replace with IPFS/File storage implementation.
 */
export class StorageAdapterStub implements StorageAdapter {
  async put(_key: string, _value: Uint8Array): Promise<void> {}
  async get(_key: string): Promise<Uint8Array | null> {
    return null;
  }
  async delete(_key: string): Promise<void> {}
}
