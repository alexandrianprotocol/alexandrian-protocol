import type { RegistryAdapter } from "./types.js";

/**
 * Stub registry adapter. Replace with on-chain registry client.
 */
export class RegistryAdapterStub implements RegistryAdapter {
  async isRegistered(_contentHash: string): Promise<boolean> {
    return false;
  }
  async getKnowledgeBlock(_contentHash: string): Promise<unknown> {
    return null;
  }
  async getReputation(_contentHash: string): Promise<unknown> {
    return null;
  }
  async getStake(_contentHash: string): Promise<unknown> {
    return null;
  }
}

