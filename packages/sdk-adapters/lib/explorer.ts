/**
 * Block explorer URL helpers for CLI and deploy scripts.
 */

/**
 * Returns the transaction URL for a given chain explorer base URL.
 * @param explorerBaseUrl - e.g. "https://sepolia.basescan.org" or "https://etherscan.io"
 * @param txHash - Transaction hash (0x-prefixed)
 */
export function getExplorerTxUrl(explorerBaseUrl: string | undefined, txHash: string): string {
  if (!explorerBaseUrl) return "";
  const base = explorerBaseUrl.replace(/\/$/, "");
  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  return `${base}/tx/${hash}`;
}

/**
 * Infer explorer URL from chain ID when CHAIN_EXPLORER_URL is not set.
 */
export function getExplorerForChainId(chainId: number): string {
  const map: Record<number, string> = {
    1: "https://etherscan.io",
    8453: "https://basescan.org",
    84532: "https://sepolia.basescan.org",
    31337: "", // localhost
  };
  return map[chainId] ?? "";
}
