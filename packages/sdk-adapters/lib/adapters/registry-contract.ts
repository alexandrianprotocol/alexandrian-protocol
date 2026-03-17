import { Contract } from "ethers";
import type { ChainAdapter, RegistryAdapter } from "./types.js";

const REGISTRY_ABI = [
  "function isRegistered(bytes32 contentHash) external view returns (bool)",
  "function getKnowledgeBlock(bytes32 contentHash) external view returns (tuple(address curator, uint64 timestamp, uint96 queryFee, bool exists))",
  "function getArtifactHash(bytes32 contentHash) external view returns (bytes32)",
  "function getCidDigest(bytes32 contentHash) external view returns (bytes32)",
  "function getReputation(bytes32 contentHash) external view returns (tuple(uint32 queryVolume, uint32 endorsements, uint16 score, uint256 lastUpdated))",
  "function getStake(bytes32 contentHash) external view returns (tuple(uint256 amount, uint256 lockedUntil, bool slashed))",
];

export class RegistryAdapterContract implements RegistryAdapter {
  private registry: Contract;

  constructor(private readonly config: { chain: ChainAdapter; registryAddress: string }) {
    this.registry = new Contract(
      config.registryAddress,
      REGISTRY_ABI,
      config.chain.provider
    );
  }

  async isRegistered(contentHash: string): Promise<boolean> {
    return this.registry.isRegistered(contentHash);
  }

  async getKnowledgeBlock(contentHash: string): Promise<unknown> {
    return this.registry.getKnowledgeBlock(contentHash);
  }

  async getReputation(contentHash: string): Promise<unknown> {
    return this.registry.getReputation(contentHash);
  }

  async getStake(contentHash: string): Promise<unknown> {
    return this.registry.getStake(contentHash);
  }
}
