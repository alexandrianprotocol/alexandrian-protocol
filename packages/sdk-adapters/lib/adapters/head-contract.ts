import { Interface } from "ethers";
import type { ChainAdapter, HeadSource } from "./types.js";
import type { PoolHead } from "../pools.js";
import { compareCandidates } from "@alexandrian/protocol";

const REGISTRY_ABI = [
  "event KBPublished(bytes32 indexed contentHash, address indexed curator, uint8 indexed kbType, string domain, uint96 queryFee, uint64 timestamp, address agent, string cid, string embeddingCid)",
  "function getStake(bytes32 contentHash) external view returns (tuple(uint256 amount, uint256 lockedUntil, bool slashed))",
];

type Candidate = {
  kbId: string;
  blockNumber: number;
  logIndex: number;
  timestamp: number;
};

export class ContractHeadSource implements HeadSource {
  private iface = new Interface(REGISTRY_ABI);

  constructor(
    private readonly config: {
      chain: ChainAdapter;
      registryAddress: string;
      fromBlock?: number;
      toBlock?: number;
    }
  ) {}

  async getCanonicalHead(poolId: string): Promise<PoolHead | null> {
    const topic0 = this.iface.getEvent("KBPublished")!.topicHash;
    const logs = await this.config.chain.provider.getLogs({
      address: this.config.registryAddress,
      topics: [topic0],
      fromBlock: this.config.fromBlock ?? 0,
      toBlock: this.config.toBlock ?? "latest",
    });

    const candidates: Candidate[] = [];
    for (const log of logs) {
      try {
        const parsed = this.iface.parseLog(log);
        const domain = String(parsed?.args?.domain ?? "");
        if (domain !== poolId) continue;
        const kbId = String(parsed?.args?.contentHash ?? "");
        const timestamp = Number(parsed?.args?.timestamp ?? 0);
        const logIndex = (log as { index?: number; logIndex?: number }).index ?? (log as { logIndex?: number }).logIndex ?? 0;
        candidates.push({
          kbId,
          blockNumber: log.blockNumber ?? 0,
          logIndex,
          timestamp,
        });
      } catch {
        continue;
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) =>
      compareCandidates(
        { kbId: a.kbId, blockNumber: a.blockNumber, logIndex: a.logIndex },
        { kbId: b.kbId, blockNumber: b.blockNumber, logIndex: b.logIndex }
      )
    );

    const head = candidates[0]!;
    const stake = await this.config.chain.callContract<{
      amount: bigint;
      lockedUntil: bigint;
      slashed: boolean;
    }>(this.config.registryAddress, REGISTRY_ABI, "getStake", [head.kbId]);

    return {
      poolId,
      versionId: head.kbId,
      contentHash: head.kbId,
      finalized: true,
      stakeTotal: BigInt((stake as { amount?: bigint }).amount ?? 0n),
      timestamp: head.timestamp,
    };
  }
}
