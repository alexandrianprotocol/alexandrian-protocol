/**
 * Canonical mainnet (Base) chain and contract addresses.
 * Keep in sync with docs/MAINNET-ADDRESSES.md after deploy.
 * SDK defaults use these when no override is provided.
 */
export const MAINNET_CHAIN_ID = 8453;
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const MAINNET_EXPLORER_URL = "https://basescan.org";

/**
 * Base mainnet AlexandrianRegistry address.
 * Set after deploy; leave empty until mainnet is live.
 * @see docs/MAINNET-ADDRESSES.md
 */
export const MAINNET_REGISTRY_ADDRESS: string =
  process.env.REGISTRY_ADDRESS_MAINNET ?? "0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000";

/**
 * Mainnet subgraph query URL (for discover/trending/dashboards).
 * Set after deploying subgraph with network: base.
 */
export const MAINNET_SUBGRAPH_URL: string = process.env.SUBGRAPH_URL_MAINNET ?? "";

/**
 * Safe accessor for the registry address.
 * Throws a descriptive error if unset rather than silently passing an empty string to ethers.
 * Use this anywhere the address is required for a Contract instantiation.
 *
 * @example
 *   const registry = new Contract(getRegistryAddress(), ABI, provider);
 */
export function getRegistryAddress(): string {
  const addr = MAINNET_REGISTRY_ADDRESS;
  if (!addr) {
    throw new Error(
      "REGISTRY_ADDRESS_MAINNET is not set. " +
      "Deploy the contract and add the address to packages/protocol/.env " +
      "or pass registryAddress directly to AlexandrianSDK. " +
      "See docs/MAINNET-ADDRESSES.md"
    );
  }
  return addr;
}
