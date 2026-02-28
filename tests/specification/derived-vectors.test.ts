/**
 * Derived block test vectors — single-parent, multi-parent, parent-sort, cycle rejection.
 * Milestone 1 conformance.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  kbHashFromEnvelope,
  VirtualRegistry,
  VirtualRegistryError,
} from "@alexandrian/protocol/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

describe("Derived block test vectors", () => {
  it("single-parent derivation produces stable kbHash", () => {
    const dir = join(root, "test-vectors/canonical/derivation/single-parent");
    const envelope = JSON.parse(
      readFileSync(join(dir, "envelope.json"), "utf8")
    );
    const expected = JSON.parse(
      readFileSync(join(dir, "expected.json"), "utf8")
    );
    const kbHash = kbHashFromEnvelope(envelope);
    expect(kbHash).toBe(expected.kbHash);
  });

  it("multi-parent derivation produces stable kbHash", () => {
    const dir = join(root, "test-vectors/canonical/derivation/multi-parent");
    const envelope = JSON.parse(
      readFileSync(join(dir, "envelope.json"), "utf8")
    );
    const expected = JSON.parse(
      readFileSync(join(dir, "expected.json"), "utf8")
    );
    const kbHash = kbHashFromEnvelope(envelope);
    expect(kbHash).toBe(expected.kbHash);
  });

  it("parent-sort normalization: unsorted and sorted yield same kbHash", () => {
    const dir = join(root, "test-vectors/canonical/derivation/parent-sort");
    const unsorted = JSON.parse(
      readFileSync(join(dir, "envelope-unsorted.json"), "utf8")
    );
    const sorted = JSON.parse(
      readFileSync(join(dir, "envelope-sorted.json"), "utf8")
    );
    const expected = JSON.parse(
      readFileSync(join(dir, "expected.json"), "utf8")
    );
    const hashUnsorted = kbHashFromEnvelope(unsorted);
    const hashSorted = kbHashFromEnvelope(sorted);
    expect(hashUnsorted).toBe(hashSorted);
    expect(hashUnsorted).toBe(expected.kbHash);
  });

  it("cycle rejection: VirtualRegistry rejects unregistered parent", () => {
    const dir = join(root, "test-vectors/canonical/derivation/cycle-rejection");
    const envelope = JSON.parse(
      readFileSync(join(dir, "envelope.json"), "utf8")
    );
    const registry = new VirtualRegistry();
    expect(() =>
      registry.registerEnvelope(envelope, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    ).toThrow(VirtualRegistryError);
  });

  it("duplicate-source-rejection: VirtualRegistry rejects duplicate sources", () => {
    const dir = join(root, "test-vectors/canonical/edge-cases/duplicate-source-rejection");
    const practiceDir = join(root, "test-vectors/canonical/types/practice-minimal");
    const practiceEnvelope = JSON.parse(
      readFileSync(join(practiceDir, "envelope.json"), "utf8")
    );
    const envelope = JSON.parse(
      readFileSync(join(dir, "envelope.json"), "utf8")
    );
    const registry = new VirtualRegistry();
    registry.registerEnvelope(practiceEnvelope, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    const err = (() => {
      try {
        registry.registerEnvelope(envelope, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
        return null;
      } catch (e) {
        return e as VirtualRegistryError;
      }
    })();
    expect(err).toBeInstanceOf(VirtualRegistryError);
    expect((err as VirtualRegistryError).code).toBe("INVALID_ENVELOPE");
  });
});
