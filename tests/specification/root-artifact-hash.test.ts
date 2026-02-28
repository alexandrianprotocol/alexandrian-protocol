import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { canonicalize, contentHashFromCanonical } from "../../packages/protocol/src/canonical.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const artifactPath = join(repoRoot, "seeds", "root", "artifact.json");

/** Golden hash: keccak256(JCS(seeds/root/artifact.json)). Update if artifact.json changes. */
const EXPECTED_ARTIFACT_HASH = "0xfa5f0d1e41ada8f6c08aafd821faa99ecbd7e20beb01298ffa4e57367a26d83a";

describe("root artifact hash", () => {
  it("computes artifactHash = keccak256(JCS(artifact.json)) and matches golden value", () => {
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    const canonical = canonicalize(artifact);
    const artifactHash = contentHashFromCanonical(canonical);
    expect(artifactHash).toBe(EXPECTED_ARTIFACT_HASH);
  });
});
