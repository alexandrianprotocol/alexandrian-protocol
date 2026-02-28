import type { PoolsAdapter } from "./types.js";

/**
 * Stub pools adapter. Replace with canonical pool coordination logic.
 */
export class PoolsAdapterStub implements PoolsAdapter {
  async getHead(_poolId: string): Promise<unknown> {
    return null;
  }
  async getGraph(_poolId: string): Promise<unknown> {
    return { nodes: [], edges: [] };
  }
  async proposeVersion(_params: unknown): Promise<unknown> {
    return null;
  }
}

