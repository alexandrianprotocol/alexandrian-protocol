/**
 * KB-001 — Canonical serialization: JCS, source normalization, prefix, determinism.
 * Primitive-aligned (docs/kb-primitives/KB-001.md).
 */
import { describe, it, expect } from "vitest";
import {
  canonicalize,
  sortSources,
  domainHashFromCanonical,
  contentHashFromCanonical,
  domainHashFromObject,
  DOMAIN_TAGS,
} from "@alexandrian/protocol/core";
import { makePracticeEnvelope, hashEnv } from "../fixtures";

describe("KB-001 — Canonical serialization", () => {
  describe("2.1 JCS and source normalization", () => {
    it("canonical string is deterministic for same logical envelope", () => {
      const env = makePracticeEnvelope({ rationale: "Canon" });
      const sorted = sortSources(env as { sources: string[] });
      const c1 = canonicalize(sorted);
      const c2 = canonicalize(sorted);
      expect(c1).toBe(c2);
      expect(c1).toContain('"domain":"test"');
      expect(c1).toContain('"type":"practice"');
    });
  });

  describe("2.2 Prefix enforcement", () => {
    it("kbHash uses KB_V1 prefix (domainHashFromCanonical with DOMAIN_TAGS.KB)", () => {
      const env = makePracticeEnvelope({ rationale: "Prefix" });
      const sorted = sortSources(env as { sources: string[] });
      const canonical = canonicalize(sorted);
      const withKbPrefix = domainHashFromCanonical(DOMAIN_TAGS.KB, canonical);
      expect(hashEnv(env)).toBe(withKbPrefix);
    });

    it("different prefix yields different hash for same canonical body", () => {
      const env = makePracticeEnvelope({ rationale: "SameBody" });
      const sorted = sortSources(env as { sources: string[] });
      const canonical = canonicalize(sorted);
      const kbHash = domainHashFromCanonical(DOMAIN_TAGS.KB, canonical);
      const otherPrefix = domainHashFromCanonical("BND_V1", canonical);
      expect(kbHash).not.toBe(otherPrefix);
    });

    it("no prefix (contentHashFromCanonical equivalent) differs from KB_V1", () => {
      const env = makePracticeEnvelope({ rationale: "NoPrefix" });
      const sorted = sortSources(env as { sources: string[] });
      const canonical = canonicalize(sorted);
      const withPrefix = domainHashFromCanonical(DOMAIN_TAGS.KB, canonical);
      const noPrefix = contentHashFromCanonical(canonical);
      expect(withPrefix).not.toBe(noPrefix);
    });
  });

  describe("2.3 Cross-implementation determinism", () => {
    it("kbHashFromEnvelope matches domainHashFromObject(KB, normalized)", () => {
      const env = makePracticeEnvelope({ sources: ["0x" + "c".repeat(64)], rationale: "Cross" });
      const normalized = sortSources(env as { sources: string[] }) as unknown as Record<string, unknown>;
      expect(hashEnv(env)).toBe(domainHashFromObject(DOMAIN_TAGS.KB, normalized));
    });
  });
});
