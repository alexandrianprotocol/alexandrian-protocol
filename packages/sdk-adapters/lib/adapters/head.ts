import type { HeadSource } from "./types.js";
import type { PoolHead } from "../pools.js";

export class HeadSourceStub implements HeadSource {
  async getCanonicalHead(_poolId: string): Promise<PoolHead | null> {
    return null;
  }
}
