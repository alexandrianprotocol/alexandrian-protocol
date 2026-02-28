/**
 * Generate expected proofHash for v1 proof vectors.
 * Run from repo root: pnpm --filter @alexandrian/conformance run generate:expected
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { computeProofHash, type ProofSpecV1 } from "@alexandrian/sdk-adapters";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const V1_PROOF = join(REPO_ROOT, "test-vectors", "v1", "proof");

// Guard: only execute when run directly as a script, not when imported as a module.
// This keeps the file side-effect-free and importable in test contexts.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const proof = JSON.parse(
    readFileSync(join(V1_PROOF, "sample.json"), "utf-8")
  ) as ProofSpecV1;
  const proofHash = computeProofHash(proof);
  const expected = { proofHash };
  writeFileSync(
    join(V1_PROOF, "sample.expected.json"),
    JSON.stringify(expected, null, 2) + "\n"
  );
  console.log("Wrote sample.expected.json with proofHash:", proofHash);
}
