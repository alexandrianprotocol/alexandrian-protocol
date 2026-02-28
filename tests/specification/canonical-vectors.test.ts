/**
 * Validates canonical test vectors produce expected contentHash.
 * Regression test for Milestone 1 serialization spec.
 *
 * Guard: the count test below will fail if a vector directory is added to
 * test-vectors/ without also adding an entry to the `vectors` array here.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { kbHashFromEnvelope, canonicalize, sortSources } from "@alexandrian/protocol/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

const vectors = [
  // types
  "test-vectors/canonical/types/adaptation",
  "test-vectors/canonical/types/compliance",
  "test-vectors/canonical/types/enhancement",
  "test-vectors/canonical/types/pattern",
  "test-vectors/canonical/types/practice-minimal",
  "test-vectors/canonical/types/practice-with-parents",
  "test-vectors/canonical/types/prompt",
  "test-vectors/canonical/types/state-machine",
  "test-vectors/canonical/types/synthesis",
  // edge cases
  "test-vectors/canonical/edge-cases/empty-payload-fields",
  "test-vectors/canonical/edge-cases/large-payload",
  "test-vectors/canonical/edge-cases/max-sources",
  "test-vectors/canonical/edge-cases/unicode-content",
];

/** Discover all subdirectories that have an expected.json (the source of truth on disk). */
function discoverVectorDirs(): string[] {
  const SEARCH_ROOTS = [
    "test-vectors/canonical/types",
    "test-vectors/canonical/edge-cases",
  ];
  const found: string[] = [];
  for (const searchRoot of SEARCH_ROOTS) {
    const abs = join(root, searchRoot);
    if (!existsSync(abs)) continue;
    const entries = readdirSync(abs, { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(join(abs, e.name, "expected.json")))
      .map((e) => `${searchRoot}/${e.name}`);
    found.push(...entries);
  }
  return found;
}

describe("Canonical test vectors", () => {
  it("vectors array covers all directories that have expected.json (add new vectors here when adding to test-vectors/)", () => {
    const available = discoverVectorDirs();
    expect(vectors.length).toBe(available.length);
  });

  for (const rel of vectors) {
    it(`${rel} produces expected kbHash`, () => {
      const dir = join(root, rel);
      const envelope = JSON.parse(readFileSync(join(dir, "envelope.json"), "utf8"));
      const expected = JSON.parse(readFileSync(join(dir, "expected.json"), "utf8"));
      const kbHash = kbHashFromEnvelope(envelope);
      expect(kbHash).toBe(expected.kbHash);
      if (expected.canonicalJson) {
        const sorted = sortSources(envelope);
        const canonical = canonicalize(sorted);
        expect(canonical).toBe(expected.canonicalJson);
      }
    });
  }
});
