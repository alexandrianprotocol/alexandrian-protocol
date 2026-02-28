/**
 * KB-000 — Envelope: hash scope, exclusion rules, artifact binding, tier commitment.
 * Primitive-aligned tests for grant/audit (docs/kb-primitives/KB-000.md).
 */
import { describe, it, expect } from "vitest";
import { artifactHashFromPayload } from "@alexandrian/protocol/core";
import { makePracticeEnvelope, hashEnv } from "../fixtures";

const TIERS = ["open", "verified", "premium", "restricted"] as const;

describe("KB-000 — Envelope", () => {
  describe("1.1 Required fields and hash exclusion", () => {
    it("envelope with vs without artifactHash yields different hash (spec requires artifactHash)", () => {
      const env = makePracticeEnvelope({});
      const withHash = hashEnv(env);
      const without = { ...env } as Record<string, unknown>;
      delete without.artifactHash;
      expect(hashEnv(without)).not.toBe(withHash);
    });

    it("envelope with vs without tier yields different hash (tier is in hash scope)", () => {
      const env = makePracticeEnvelope({});
      const withTier = hashEnv(env);
      const without = { ...env } as Record<string, unknown>;
      delete without.tier;
      expect(hashEnv(without)).not.toBe(withTier);
    });

    it("same envelope + different createdAt → identical kbHash", () => {
      const base = makePracticeEnvelope({ rationale: "Same" });
      const h1 = hashEnv(base);
      const withMeta = { ...base, createdAt: "2025-01-01T00:00:00Z", curator: "0x1234", signature: "0xab" };
      expect(hashEnv(withMeta)).toBe(h1);
    });

    it("metadata / curator / signature do not affect kbHash", () => {
      const base = makePracticeEnvelope({ rationale: "Meta" });
      const h0 = hashEnv(base);
      const withAll = {
        ...base,
        metadata: { foo: "bar" },
        curator: "0x" + "a".repeat(40),
        signature: "0x" + "b".repeat(130),
        createdAt: "2026-01-01T00:00:00Z",
      };
      expect(hashEnv(withAll)).toBe(h0);
    });
  });

  describe("1.2 Artifact binding", () => {
    it("artifactHash = keccak256(payload_bytes) — changing payload changes artifactHash and thus kbHash", () => {
      const e1 = makePracticeEnvelope({ rationale: "A" });
      const e2 = makePracticeEnvelope({ rationale: "B" });
      expect(e1.artifactHash).not.toBe(e2.artifactHash);
      expect(hashEnv(e1)).not.toBe(hashEnv(e2));
    });

    it("mutate payload but keep artifactHash constant → kbHash differs (integrity violation)", () => {
      const payload1 = {
        type: "practice" as const,
        rationale: "Original",
        contexts: [] as string[],
        failureModes: [] as string[],
      };
      const correctHash = artifactHashFromPayload(payload1);
      const envelopeCorrect = makePracticeEnvelope({ rationale: "Original", artifactHash: correctHash });
      const hCorrect = hashEnv(envelopeCorrect);

      const envelopeTampered = {
        ...envelopeCorrect,
        payload: { ...payload1, rationale: "Tampered" },
        artifactHash: correctHash, // stale — intentionally not recomputed
      };
      expect(hashEnv(envelopeTampered)).not.toBe(hCorrect);
    });
  });

  describe("1.3 Tier commitment", () => {
    it("changing tier changes kbHash", () => {
      const base = makePracticeEnvelope({ rationale: "TierTest" });
      const hashes = new Set<string>();
      for (const tier of TIERS) {
        hashes.add(hashEnv({ ...base, tier }));
      }
      expect(hashes.size).toBe(4);
    });

    it("open → verified → premium → restricted each yield distinct hash", () => {
      const base = makePracticeEnvelope({ rationale: "Tiers" });
      const results = new Set([
        hashEnv({ ...base, tier: "open" }),
        hashEnv({ ...base, tier: "verified" }),
        hashEnv({ ...base, tier: "premium" }),
        hashEnv({ ...base, tier: "restricted" }),
      ]);
      expect(results.size).toBe(4);
    });
  });
});
