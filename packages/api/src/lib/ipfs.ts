/**
 * ipfs.ts — IPFS artifact resolver.
 *
 * Fetches and hash-verifies KB artifacts from the configured IPFS gateway.
 * Returns the parsed artifact JSON. Throws if the hash doesn't match.
 */

const GATEWAY = (process.env.IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs").replace(/\/$/, "");

/**
 * Resolve a CID to a gateway URL.
 * Handles both bare CIDs (Qm..., bafy...) and ipfs:// URIs.
 */
function cidToUrl(cid: string): string {
  const bare = cid.replace(/^ipfs:\/\//, "");
  return `${GATEWAY}/${bare}`;
}

/**
 * Fetch the IPFS artifact for a KB and verify its content hash.
 *
 * @param cid           The IPFS CID (from the on-chain KBPublished event).
 * @param expectedHash  The keccak256 content hash stored on-chain. Pass null
 *                      to skip verification (not recommended for production).
 * @returns             Parsed artifact JSON, or null if fetch fails.
 */
export async function fetchKBArtifact(
  cid: string,
  expectedHash: string | null
): Promise<Record<string, unknown> | null> {
  if (!GATEWAY) return null;

  const url = cidToUrl(cid);

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  } catch {
    return null; // gateway timeout or network error — degrade gracefully
  }

  if (!res.ok) return null;

  const text = await res.text();

  // Hash verification via dynamic import of sdk-core
  if (expectedHash) {
    try {
      const { Core } = await import("@alexandrian/sdk-core");
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const actual = Core.artifactHashFromJson(parsed);
      if (actual.toLowerCase() !== expectedHash.toLowerCase()) {
        throw new Error(`Artifact hash mismatch: expected ${expectedHash}, got ${actual}`);
      }
      return parsed;
    } catch (err) {
      // Re-throw hash mismatch — that's a data integrity error, not a soft failure
      if (err instanceof Error && err.message.startsWith("Artifact hash mismatch")) {
        throw err;
      }
      // JSON parse failure or sdk import issue — fall through to unverified parse
    }
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}
