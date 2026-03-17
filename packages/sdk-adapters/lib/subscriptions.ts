import { Contract, type Provider } from "ethers";

const REGISTRY_EVENTS_ABI = [
  "event KBPublished(bytes32 indexed contentHash, address indexed curator, uint8 indexed kbType, string domain, uint96 queryFee, uint64 timestamp, address agent, string cid, string embeddingCid)",
  "event QuerySettled(bytes32 indexed contentHash, address indexed querier, uint256 totalFee, uint256 protocolFee, uint64 queryNonce)",
  "event KBStaked(bytes32 indexed contentHash, address indexed curator, uint256 amount)",
  "event KBSlashed(bytes32 indexed contentHash, address indexed curator, uint256 slashedAmount, string reason)",
  "event ReputationUpdated(bytes32 indexed contentHash, uint16 newScore, uint32 queryVolume)",
];

export type PoolEvent =
  | "VersionProposed"
  | "VersionFinalized"
  | "VersionChallenged"
  | "VersionSupported";

export interface PoolEventPayload {
  poolId: string;
  contentHash: string;
  event: PoolEvent;
  raw: unknown;
}

/**
 * Subscription client: maps registry events to pool lifecycle events.
 * Until KnowledgePool.sol exists, we map:
 * - VersionProposed/Finalized => KBPublished (domain == poolId)
 * - VersionSupported         => KBStaked (no domain in event; emitted as-is)
 * - VersionChallenged        => KBSlashed (no domain in event; emitted as-is)
 */
export class SubscriptionsClient {
  private contract: Contract;

  constructor(params: { provider: Provider; registryAddress: string }) {
    this.contract = new Contract(params.registryAddress, REGISTRY_EVENTS_ABI, params.provider);
  }

  subscribe(poolId: string, event: PoolEvent, handler: (payload: PoolEventPayload) => void): () => void {
    if (event === "VersionProposed" || event === "VersionFinalized") {
      const listener = (contentHash: string, _curator: string, _kbType: number, domain: string, _queryFee: bigint, _timestamp: bigint, _agent: string, _cid: string, _embeddingCid: string, raw: unknown) => {
        if (String(domain) !== poolId) return;
        handler({
          poolId,
          contentHash: contentHash.startsWith("0x") ? contentHash : "0x" + contentHash,
          event,
          raw,
        });
      };
      this.contract.on("KBPublished", listener);
      return () => this.contract.off("KBPublished", listener);
    }

    if (event === "VersionSupported") {
      const listener = (contentHash: string, _curator: string, _amount: bigint, raw: unknown) => {
        handler({
          poolId,
          contentHash: contentHash.startsWith("0x") ? contentHash : "0x" + contentHash,
          event,
          raw,
        });
      };
      this.contract.on("KBStaked", listener);
      return () => this.contract.off("KBStaked", listener);
    }

    const listener = (contentHash: string, _curator: string, _amount: bigint, _reason: string, raw: unknown) => {
      handler({
        poolId,
        contentHash: contentHash.startsWith("0x") ? contentHash : "0x" + contentHash,
        event: "VersionChallenged",
        raw,
      });
    };
    this.contract.on("KBSlashed", listener);
    return () => this.contract.off("KBSlashed", listener);
  }
}
