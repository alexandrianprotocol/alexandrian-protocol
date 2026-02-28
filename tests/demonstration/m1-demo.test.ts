/**
 * Milestone 1 Demo — Deterministic Protocol Integrity
 *
 * This test suite demonstrates the core guarantees of the Alexandrian Protocol:
 *
 * 1. Canonical Identity
 *    Raw envelope → canonical JSON (JCS) → SHA-256 → contentHash → CIDv1.
 *    Identical logical input always produces identical identity.
 *
 * 2. Determinism
 *    Object key order, source order, and formatting differences
 *    do not affect contentHash or CID.
 *
 * 3. Registry Semantics
 *    VirtualRegistry simulates canonical registration:
 *    - Produces deterministic kbId (0x + 32-byte hex)
 *    - Stores curator mapping
 *    - Exposes verification state
 *
 * 4. Subgraph Compatibility
 *    kbId conforms to event indexing expectations
 *    (0x-prefixed 32-byte identifier suitable for GraphQL ID/Bytes).
 *
 * 5. Invariant Enforcement
 *    Invalid envelopes are rejected deterministically:
 *      - Duplicate sources → INVALID_ENVELOPE
 *      - Schema violations → SCHEMA_INVALID
 *      - Unsorted sources → SOURCES_NOT_SORTED
 *
 * No Hardhat or external network dependencies.
 * Pure protocol-layer verification.
 *
 * Run with: pnpm test:spec
 */
import { describe, it, expect } from "vitest";
import {
  VirtualRegistry,
  kbHashFromEnvelope,
  canonicalize,
  sortSources,
  cidV1FromEnvelope,
} from "@alexandrian/protocol/core";

const CURATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("Milestone 1: Canonical Identity", () => {
  it("1. raw envelope → canonical → kbHash → CIDv1 (identity pipeline)", async () => {
    const envelope = {
      type: "stateMachine" as const,
      domain: "demo",
      sources: [] as string[],
      payload: {
        type: "stateMachine" as const,
        states: ["idle", "running"],
        transitions: [{ from: "idle", to: "running", event: "start" }],
        invariants: ["never both idle and running"],
      },
    };

    const hash1 = kbHashFromEnvelope(envelope);
    const hash2 = kbHashFromEnvelope(envelope);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[a-fA-F0-9]{64}$/);

    const cid1 = await cidV1FromEnvelope(envelope);
    const cid2 = await cidV1FromEnvelope(envelope);
    expect(cid1).toBe(cid2);
    expect(cid1).toMatch(/^ba[fky][a-z0-9]+$/);

    const canonical = canonicalize(sortSources({ ...envelope }) as object);
    expect(typeof canonical).toBe("string");
    expect(canonical.length).toBeGreaterThan(0);
  });

  it("1b. identical logical input produces identical kbId (cross-run determinism)", () => {
    const envelope = {
      type: "practice" as const,
      domain: "demo",
      sources: [] as string[],
      payload: {
        type: "practice" as const,
        rationale: "Same logical content.",
        contexts: [],
        failureModes: [],
      },
    };
    const a = kbHashFromEnvelope(envelope);
    const b = kbHashFromEnvelope(envelope);
    expect(a).toBe(b);
  });
});

describe("Milestone 1: Determinism Guarantees", () => {
  it("2. object key order does not affect kbHash (JCS normalization)", () => {
    const e1 = { type: "practice", domain: "x", sources: [], payload: { type: "practice", rationale: "R", contexts: [], failureModes: [] } };
    const e2 = { domain: "x", type: "practice", sources: [], payload: { failureModes: [], type: "practice", rationale: "R", contexts: [] } };
    const h1 = kbHashFromEnvelope(e1 as never);
    const h2 = kbHashFromEnvelope(e2 as never);
    expect(h1).toBe(h2);
  });

  it("2b. source ordering does not affect identity when normalized", async () => {
    const reg = new VirtualRegistry();
    const a = await reg.registerEnvelope(
      { type: "practice", domain: "d", sources: [], payload: { type: "practice", rationale: "A", contexts: [], failureModes: [] } },
      CURATOR
    );
    const b = await reg.registerEnvelope(
      { type: "practice", domain: "d", sources: [], payload: { type: "practice", rationale: "B", contexts: [], failureModes: [] } },
      CURATOR
    );
    const [first, second] = [a.kbId, b.kbId].sort();
    const envelopeSorted = {
      type: "practice" as const,
      domain: "d",
      sources: [first!, second!],
      payload: { type: "practice" as const, rationale: "C", contexts: [], failureModes: [] },
    };
    const envelopeReverse = {
      type: "practice" as const,
      domain: "d",
      sources: [second!, first!],
      payload: { type: "practice" as const, rationale: "C", contexts: [], failureModes: [] },
    };
    const hashSorted = kbHashFromEnvelope(sortSources(envelopeSorted) as never);
    const hashReverse = kbHashFromEnvelope(sortSources(envelopeReverse) as never);
    expect(hashSorted).toBe(hashReverse);
  });
});

describe("Milestone 1: Derived KB (composition / DAG)", () => {
  it("derive KB2 from KB1 (parents=[kb1]); kbId differs and parents preserved", async () => {
    const reg = new VirtualRegistry();
    const kb1 = await reg.registerEnvelope(
      {
        type: "practice",
        domain: "demo",
        sources: [],
        payload: { type: "practice", rationale: "Root KB.", contexts: [], failureModes: [] },
      },
      CURATOR
    );
    const kb2 = await reg.registerEnvelope(
      {
        type: "practice",
        domain: "demo",
        sources: [kb1.kbId],
        payload: { type: "practice", rationale: "Derived from KB1.", contexts: [], failureModes: [] },
      },
      CURATOR
    );
    expect(kb2.kbId).not.toBe(kb1.kbId);
    expect(kb2.kbId).toMatch(/^0x[a-fA-F0-9]{64}$/);
    const entry = reg.getKB(kb2.kbId);
    expect(entry.exists).toBe(true);
    expect(entry.sources).toEqual([kb1.kbId]);
  });

  it("DAG acyclicity: chain and diamond produce distinct kbIds with parents preserved", async () => {
    const reg = new VirtualRegistry();
    const a = await reg.registerEnvelope(
      { type: "practice", domain: "d", sources: [], payload: { type: "practice", rationale: "A", contexts: [], failureModes: [] } },
      CURATOR
    );
    const b = await reg.registerEnvelope(
      { type: "practice", domain: "d", sources: [a.kbId], payload: { type: "practice", rationale: "B", contexts: [], failureModes: [] } },
      CURATOR
    );
    const c = await reg.registerEnvelope(
      { type: "practice", domain: "d", sources: [b.kbId], payload: { type: "practice", rationale: "C", contexts: [], failureModes: [] } },
      CURATOR
    );
    const d = await reg.registerEnvelope(
      { type: "practice", domain: "d", sources: [c.kbId], payload: { type: "practice", rationale: "D", contexts: [], failureModes: [] } },
      CURATOR
    );
    // E with sources [B, D]: diamond (acyclic); B and D are not mutually reachable
    const [bId, dId] = [b.kbId, d.kbId].sort();
    const e = await reg.registerEnvelope(
      {
        type: "practice",
        domain: "d",
        sources: [bId, dId],
        payload: { type: "practice", rationale: "E", contexts: [], failureModes: [] },
      },
      CURATOR
    );
    expect(e.kbId).not.toBe(b.kbId);
    expect(e.kbId).not.toBe(d.kbId);
    const entryE = reg.getKB(e.kbId);
    expect(entryE.sources).toEqual([bId, dId]);
  });
});

describe("Milestone 1: Registry Semantics (VirtualRegistry)", () => {
  it("3. registerEnvelope produces deterministic kbId and persists curator mapping", async () => {
    const registry = new VirtualRegistry();
    const envelope = {
      type: "practice" as const,
      domain: "demo",
      sources: [] as string[],
      payload: {
        type: "practice" as const,
        rationale: "Registry demo.",
        contexts: [],
        failureModes: [],
      },
    };
    const result = await registry.registerEnvelope(envelope, CURATOR);
    expect(result.kbId).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.isNew).toBe(true);
    expect(registry.isVerified(result.kbId)).toBe(true);
    expect(registry.getCurator(result.kbId)).toBe(CURATOR);
  });

  it("re-registering same envelope returns isNew=false with same kbId", async () => {
    const reg = new VirtualRegistry();
    const envelope = {
      type: "practice" as const,
      domain: "demo",
      sources: [] as string[],
      payload: {
        type: "practice" as const,
        rationale: "Idempotency.",
        contexts: [],
        failureModes: [],
      },
    };
    const first = await reg.registerEnvelope(envelope, CURATOR);
    const second = await reg.registerEnvelope(envelope, CURATOR);
    expect(second.isNew).toBe(false);
    expect(second.kbId).toBe(first.kbId);
  });

  it("getKB returns exists=false for unknown kbId", () => {
    const reg = new VirtualRegistry();
    const result = reg.getKB("0x" + "0".repeat(64));
    expect(result.exists).toBe(false);
  });
});

describe("Milestone 1: Concurrent CID determinism", () => {
  it("concurrent cidV1FromEnvelope calls produce identical results", async () => {
    const envelope = {
      type: "practice" as const,
      domain: "demo",
      sources: [] as string[],
      payload: {
        type: "practice" as const,
        rationale: "Concurrent CID.",
        contexts: [],
        failureModes: [],
      },
    };
    const [a, b, c] = await Promise.all([
      cidV1FromEnvelope(envelope),
      cidV1FromEnvelope(envelope),
      cidV1FromEnvelope(envelope),
    ]);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe("Milestone 1: Subgraph Compatibility", () => {
  it("4. kbId conforms to 32-byte 0x-prefixed hex format for event indexing", async () => {
    const registry = new VirtualRegistry();
    const result = await registry.registerEnvelope(
      {
        type: "practice",
        domain: "demo",
        sources: [],
        payload: { type: "practice", rationale: "Subgraph id.", contexts: [], failureModes: [] },
      },
      CURATOR
    );
    expect(result.kbId).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.kbId.length).toBe(66);
    // Protocol also yields CIDv1 (base32) via cidV1FromEnvelope for display/alternate indexing if subgraph schema uses it.
  });
});

describe("Milestone 1: Invariant Enforcement", () => {
  it("5a. duplicate sources are rejected (INVALID_ENVELOPE)", () => {
    const registry = new VirtualRegistry();
    const root = registry.registerEnvelope(
      {
        type: "practice",
        domain: "d",
        sources: [],
        payload: { type: "practice", rationale: "R", contexts: [], failureModes: [] },
      },
      CURATOR
    );
    const envelope = {
      type: "practice" as const,
      domain: "d",
      sources: [root.kbId, root.kbId],
      payload: { type: "practice" as const, rationale: "Child", contexts: [], failureModes: [] },
    };
    let caught: unknown;
    try { registry.registerEnvelope(envelope, CURATOR); } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    expect((caught as { code?: string }).code).toBe("INVALID_ENVELOPE");
  });

  it("5b. schema violations are rejected (SCHEMA_INVALID)", () => {
    const registry = new VirtualRegistry();
    const bad = {
      type: "practice" as const,
      domain: "d",
      sources: [] as string[],
      payload: { type: "practice" as const, rationale: "x" }, // missing contexts, failureModes
    };
    let caught: unknown;
    try { registry.registerEnvelope(bad as never, CURATOR); } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    expect((caught as { code?: string }).code).toBe("SCHEMA_INVALID");
  });

  it("5c. unsorted sources are rejected to preserve canonical ordering (SOURCES_NOT_SORTED)", () => {
    const registry = new VirtualRegistry();
    const a = registry.registerEnvelope(
      { type: "practice", domain: "d", sources: [], payload: { type: "practice", rationale: "A", contexts: [], failureModes: [] } },
      CURATOR
    );
    const b = registry.registerEnvelope(
      { type: "practice", domain: "d", sources: [], payload: { type: "practice", rationale: "B", contexts: [], failureModes: [] } },
      CURATOR
    );
    const [first, second] = [a.kbId, b.kbId].sort();
    const envelope = {
      type: "practice" as const,
      domain: "d",
      sources: [second!, first!],
      payload: { type: "practice" as const, rationale: "C", contexts: [], failureModes: [] },
    };
    let caught: unknown;
    try { registry.registerEnvelope(envelope, CURATOR); } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    expect((caught as { code?: string }).code).toBe("SOURCES_NOT_SORTED");
  });
});
