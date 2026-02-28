/**
 * Conformance: envelope canonical serialization and contentHash/kbHash.
 * Validates the spec (test vectors), not a specific codebase.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { contentHashFromEnvelope, kbHashFromEnvelope } from "@alexandrian/protocol";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const VECTORS_ROOT = join(REPO_ROOT, "test-vectors");
const V1 = join(VECTORS_ROOT, "v1", "envelope");
const CANONICAL = join(VECTORS_ROOT, "canonical");

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("Envelope conformance (Core v1)", () => {
  it("v1 envelope practice-minimal: contentHash matches expected", () => {
    const envelope = loadJson<Record<string, unknown>>(join(V1, "practice-minimal.json"));
    const expected = loadJson<{ contentHash: string }>(join(V1, "practice-minimal.expected.json"));
    const computed = contentHashFromEnvelope(envelope);
    expect(computed.toLowerCase()).toBe(expected.contentHash.toLowerCase());
  });

  it("canonical types/practice-minimal: kbHash matches expected", () => {
    const envelope = loadJson<Record<string, unknown>>(
      join(CANONICAL, "types", "practice-minimal", "envelope.json")
    );
    const expected = loadJson<{ kbHash: string }>(
      join(CANONICAL, "types", "practice-minimal", "expected.json")
    );
    const computed = kbHashFromEnvelope(envelope);
    expect(computed.toLowerCase()).toBe(expected.kbHash.toLowerCase());
  });

  it("canonical derivation/parent-sort: unsorted and sorted yield same kbHash", () => {
    const unsorted = loadJson<Record<string, unknown>>(
      join(CANONICAL, "derivation", "parent-sort", "envelope-unsorted.json")
    );
    const expected = loadJson<{ kbHash: string }>(
      join(CANONICAL, "derivation", "parent-sort", "expected.json")
    );
    const computed = kbHashFromEnvelope(unsorted);
    expect(computed.toLowerCase()).toBe(expected.kbHash.toLowerCase());
  });
});
