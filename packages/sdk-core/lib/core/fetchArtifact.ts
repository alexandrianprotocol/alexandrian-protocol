import { keccak256, toUtf8Bytes } from "ethers";
import { canonicalize } from "@alexandrian/protocol";

export function artifactHashFromBytes(bytes: Uint8Array): string {
  return keccak256(bytes);
}

export function artifactHashFromJson(value: unknown): string {
  const canonical = canonicalize(value);
  const bytes = toUtf8Bytes(canonical);
  return keccak256(bytes);
}

export async function fetchArtifact(uri: string, expectedHash: string): Promise<Uint8Array> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`Failed to fetch artifact: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const actual = artifactHashFromBytes(bytes);
  if (actual.toLowerCase() !== expectedHash.toLowerCase()) {
    throw new Error("Artifact hash mismatch");
  }
  return bytes;
}

export type VerifiedArtifact = {
  value: Uint8Array;
  expectedHash: string;
  actualHash: string;
  verified: boolean;
  reason?: string;
  checks: {
    hashFormatOk: boolean;
    hashMatches: boolean;
  };
};

export async function fetchArtifactVerified(uri: string, expectedHash: string): Promise<VerifiedArtifact> {
  const res = await fetch(uri);
  if (!res.ok) {
    return {
      value: new Uint8Array(),
      expectedHash,
      actualHash: "",
      verified: false,
      reason: `fetch_failed_${res.status}`,
      checks: {
        hashFormatOk: /^0x[0-9a-fA-F]{64}$/.test(expectedHash),
        hashMatches: false,
      },
    };
  }
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const actual = artifactHashFromBytes(bytes);
  const matches = actual.toLowerCase() === expectedHash.toLowerCase();
  return {
    value: bytes,
    expectedHash,
    actualHash: actual,
    verified: matches,
    reason: matches ? undefined : "hash_mismatch",
    checks: {
      hashFormatOk: /^0x[0-9a-fA-F]{64}$/.test(expectedHash),
      hashMatches: matches,
    },
  };
}
