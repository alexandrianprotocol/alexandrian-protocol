/**
 * Shared test fixtures — addresses, minimal envelopes, dataset builder.
 * Reduces copy-paste across test files.
 */

import { artifactHashFromPayload, kbHashFromEnvelope } from "@alexandrian/protocol/core";

export const CURATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
export const CURATOR_2 = "0x" + "3".repeat(40);

export const practiceEnvelope = {
  type: "practice" as const,
  domain: "fixture",
  sources: [] as string[],
  payload: {
    type: "practice" as const,
    rationale: "Minimal practice fixture.",
    contexts: [],
    failureModes: [],
  },
} as const;

export const synthesisEnvelope = (rootKbId: string) => ({
  type: "synthesis" as const,
  domain: "fixture",
  sources: [rootKbId],
  payload: {
    type: "synthesis" as const,
    question: "What?",
    answer: "Fixture.",
    citations: { [rootKbId]: "Minimal practice fixture." },
  },
});

export type Tier = "open" | "verified" | "premium" | "restricted";

/**
 * Factory: create a minimal canonical practice envelope (tier:"open" by default).
 * Used across KB-000 – KB-003 specification and invariant tests.
 */
export function makePracticeEnvelope(opts: {
  rationale?: string;
  sources?: string[];
  tier?: Tier;
  /** Override computed artifactHash — for tamper tests only. */
  artifactHash?: string;
  domain?: string;
} = {}) {
  const payload = {
    type: "practice" as const,
    rationale: opts.rationale ?? "Minimal",
    contexts: [] as string[],
    failureModes: [] as string[],
  };
  return {
    type: "practice" as const,
    domain: opts.domain ?? "test",
    sources: opts.sources ?? ([] as string[]),
    tier: (opts.tier ?? "open") as Tier,
    artifactHash: opts.artifactHash ?? artifactHashFromPayload(payload),
    payload,
  };
}

/** Compute kbHash without the `as unknown as Record<string, unknown>` cast ceremony. */
export function hashEnv(env: unknown): string {
  return kbHashFromEnvelope(env as Record<string, unknown>);
}

/** Minimal valid dataset for DatasetSchema tests */
export function buildDataset(overrides: Record<string, unknown> = {}) {
  const cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
  return {
    id: cid,
    cid,
    fingerprint: cid,
    title: "Fixture",
    description: "Fixture dataset",
    license: {
      type: "CC-BY-4.0",
      terms: { commercialUse: true, attribution: true, shareAlike: false, derivatives: true },
    },
    qualityScore: 0,
    creator: "0x1",
    contributor: "0x1",
    timestamp: new Date(),
    tags: [] as string[],
    contentHash: cid,
    blocks: [] as unknown[],
    ...overrides,
  };
}
