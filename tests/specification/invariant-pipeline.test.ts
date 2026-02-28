import { describe, expect, test } from "vitest";
import {
  kbHashFromEnvelope,
  canonicalize,
  domainHashFromCanonical,
  DOMAIN_TAGS,
  artifactHashFromPayload,
} from "../../packages/protocol/src/canonical.js";

describe("invariant pipeline (CID → Base → Graph → Proof)", () => {
  test("kbHash derived from canonical bytes is stable", () => {
    const payload = { type: "practice", rationale: "a", contexts: [], failureModes: [] };
    const envelope = {
      type: "practice",
      domain: "x",
      sources: [],
      tier: "open",
      artifactHash: artifactHashFromPayload(payload),
      payload,
    };
    const canonical = canonicalize({ ...envelope, sources: [] });
    const h1 = kbHashFromEnvelope(envelope as any);
    const h2 = domainHashFromCanonical(DOMAIN_TAGS.KB, canonical);
    expect(h1).toEqual(h2);
  });
});
