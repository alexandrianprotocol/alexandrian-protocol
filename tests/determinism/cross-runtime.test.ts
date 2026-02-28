/**
 * Tier 2 — Cross-Runtime Determinism.
 * Asserts contentHash, CIDv1, and kbId for a golden envelope are identical regardless of runtime.
 * Run this test in CI on multiple runners (Node 18/20, linux/windows); if all pass, determinism holds.
 * Golden values live in cross-runtime-golden.json (generated once; commit and reuse).
 *
 * See docs/PROTOCOL-HARDENING-ROADMAP.md Tier 2.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import {
  kbHashFromEnvelope,
  cidV1FromEnvelope,
  sortSources,
  artifactHashFromPayload,
} from "@alexandrian/protocol/core";
import { deriveKbId } from "../utils/derive-kb-id";

const GOLDEN_ENVELOPE = {
  type: "practice" as const,
  domain: "cross-runtime",
  sources: [] as string[],
  tier: "open" as const,
  artifactHash: artifactHashFromPayload({
    type: "practice" as const,
    rationale: "Golden envelope for cross-runtime determinism.",
    contexts: [],
    failureModes: [],
  }),
  payload: {
    type: "practice" as const,
    rationale: "Golden envelope for cross-runtime determinism.",
    contexts: [],
    failureModes: [],
  },
};

const GOLDEN_PATH = join(__dirname, "cross-runtime-golden.json");

function loadGolden(): { kbHash: string; cidV1: string; kbId: string } {
  if (!existsSync(GOLDEN_PATH)) {
    throw new Error(
      "Missing tests/determinism/cross-runtime-golden.json. Run with GENERATE_CROSS_RUNTIME_GOLDEN=1 to generate."
    );
  }
  return JSON.parse(readFileSync(GOLDEN_PATH, "utf-8"));
}

describe("AlexandrianRegistry — Cross-Runtime Determinism", () => {
  describe("Canonical identity", () => {
    it("emit golden (run with GENERATE_CROSS_RUNTIME_GOLDEN=1)", async () => {
      if (process.env.GENERATE_CROSS_RUNTIME_GOLDEN !== "1") return;
      const normalized = sortSources(GOLDEN_ENVELOPE as Record<string, unknown>) as Record<string, unknown>;
      const kbHash = kbHashFromEnvelope(normalized);
      const cidV1 = await cidV1FromEnvelope(normalized);
      const kbId = deriveKbId(GOLDEN_ENVELOPE as unknown as Record<string, unknown>);
      writeFileSync(GOLDEN_PATH, JSON.stringify({ kbHash, cidV1, kbId }, null, 2));
      expect(kbHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(cidV1).toMatch(/^ba[fky][a-z0-9]+$/);
    });

    it("kbHash identical on current runtime", () => {
      const normalized = sortSources(GOLDEN_ENVELOPE as Record<string, unknown>) as Record<string, unknown>;
      const hash = kbHashFromEnvelope(normalized);
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      const golden = loadGolden();
      expect(hash).toBe(golden.kbHash);
    });

    it("CIDv1 identical across runtimes", async () => {
      const normalized = sortSources(GOLDEN_ENVELOPE as Record<string, unknown>) as Record<string, unknown>;
      const cid = await cidV1FromEnvelope(normalized);
      expect(cid).toMatch(/^ba[fky][a-z0-9]+$/);
      const golden = loadGolden();
      expect(cid).toBe(golden.cidV1);
    });

    it("kbId identical across runtimes", () => {
      const kbId = deriveKbId(GOLDEN_ENVELOPE as unknown as Record<string, unknown>);
      expect(kbId).toMatch(/^0x[a-fA-F0-9]{64}$/);
      const golden = loadGolden();
      expect(kbId).toBe(golden.kbId);
    });
  });
});
