/**
 * Conformance: proof canonical serialization and proofHash.
 * Validates the spec (test vectors), not a specific codebase.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { computeProofHash, type ProofSpecV1 } from "@alexandrian/sdk-adapters";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const V1_PROOF = join(REPO_ROOT, "test-vectors", "v1", "proof");

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const PLACEHOLDER = "0xPLACEHOLDER_RUN_CONFORMANCE_TO_VERIFY";

describe("Proof conformance (alexandrian-proof/1)", () => {
  it("v1 proof sample: proofHash is deterministic and matches expected", () => {
    const proof = loadJson<ProofSpecV1>(join(V1_PROOF, "sample.json"));
    const expected = loadJson<{ proofHash: string }>(join(V1_PROOF, "sample.expected.json"));

    const computed = computeProofHash(proof);
    expect(computed).toMatch(/^0x[0-9a-f]{64}$/);

    if (expected.proofHash === PLACEHOLDER) {
      throw new Error(
        `Expected file contains placeholder. Run: pnpm --filter @alexandrian/conformance run generate:expected`
      );
    }
    expect(computed).toBe(expected.proofHash);
  });

  it("same proof object produces same proofHash twice", () => {
    const proof = loadJson<ProofSpecV1>(join(V1_PROOF, "sample.json"));
    const a = computeProofHash(proof);
    const b = computeProofHash(proof);
    expect(a).toBe(b);
  });
});
