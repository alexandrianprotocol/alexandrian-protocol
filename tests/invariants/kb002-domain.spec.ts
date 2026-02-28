/**
 * KB-002 — Domain-separated hashing: cross-type collision prevention.
 * Primitive-aligned (docs/kb-primitives/KB-002.md).
 */
import { describe, it, expect } from "vitest";
import {
  domainHashFromCanonical,
  DOMAIN_TAGS,
  canonicalize,
  sortSources,
} from "@alexandrian/protocol/core";
import { makePracticeEnvelope } from "../fixtures";

function minimalCanonicalBody(rationale = "Same") {
  const env = makePracticeEnvelope({ rationale });
  return canonicalize(sortSources(env as { sources: string[] }));
}

describe("KB-002 — Domain separation", () => {
  describe("3.1 Cross-type collision prevention", () => {
    it("same canonical body under KB_V1 vs BND_V1 yields different hash", () => {
      const canonical = minimalCanonicalBody();
      expect(domainHashFromCanonical(DOMAIN_TAGS.KB, canonical)).not.toBe(
        domainHashFromCanonical("BND_V1", canonical)
      );
    });

    it("same canonical body under KB_V1 vs PRB_V1 yields different hash", () => {
      const canonical = minimalCanonicalBody();
      expect(domainHashFromCanonical(DOMAIN_TAGS.KB, canonical)).not.toBe(
        domainHashFromCanonical("PRB_V1", canonical)
      );
    });

    it("same canonical body under KB_V1 vs EVL_V1 yields different hash", () => {
      const canonical = minimalCanonicalBody();
      expect(domainHashFromCanonical(DOMAIN_TAGS.KB, canonical)).not.toBe(
        domainHashFromCanonical("EVL_V1", canonical)
      );
    });
  });

  describe("3.2 Prefix isolation property", () => {
    it("different prefixes produce different hashes for 100 random canonical strings", () => {
      for (let i = 0; i < 100; i++) {
        const canonical = minimalCanonicalBody(`R${i}`);
        const kb = domainHashFromCanonical(DOMAIN_TAGS.KB, canonical);
        const bnd = domainHashFromCanonical("BND_V1", canonical);
        const prb = domainHashFromCanonical("PRB_V1", canonical);
        expect(kb).not.toBe(bnd);
        expect(kb).not.toBe(prb);
        expect(bnd).not.toBe(prb);
      }
    });
  });
});
