/**
 * Automated critical path: ingest → registry → lineage → query
 *
 * Runs with no testnet, Docker, or external services. Proves the system
 * functions as a coherent stack (protocol + VirtualRegistry). Used by
 * `pnpm test:all` for grant reviewer verification.
 *
 * Flow:
 * 1. Ingest: raw envelope → contentHash (deterministic identity)
 * 2. Registry: register root KB and derived KB in VirtualRegistry
 * 3. Lineage: read parents and derived blocks from registry
 * 4. Query: resolve KB by contentHash and assert existence
 */
import { describe, it, expect } from "vitest";
import {
  VirtualRegistry,
  kbHashFromEnvelope,
  buildDerivedEnvelope,
} from "@alexandrian/protocol/core";

const CURATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("Critical path: ingest → registry → lineage → query", () => {
  it("getKB returns exists=false for unregistered kbId", () => {
    const registry = new VirtualRegistry();
    expect(registry.getKB("0x" + "a".repeat(64)).exists).toBe(false);
  });

  it("each KB independently tracks its own curator", async () => {
    const CURATOR_2 = "0x" + "3".repeat(40);
    const registry = new VirtualRegistry();
    const rootEnvelope = {
      type: "practice" as const,
      domain: "critical.path",
      sources: [] as string[],
      payload: {
        type: "practice" as const,
        rationale: "Root.",
        contexts: [],
        failureModes: [],
      },
    };
    const derivedEnvelope = {
      type: "practice" as const,
      domain: "critical.path",
      sources: [] as string[],
      payload: {
        type: "practice" as const,
        rationale: "Derived.",
        contexts: [],
        failureModes: [],
      },
    };
    const root = await registry.registerEnvelope(rootEnvelope, CURATOR);
    const derived = await registry.registerEnvelope(
      { ...derivedEnvelope, sources: [root.kbId] },
      CURATOR_2
    );
    expect(registry.getCurator(root.kbId)).toBe(CURATOR);
    expect(registry.getCurator(derived.kbId)).toBe(CURATOR_2);
  });

  it("3-level chain: lineage is transitive", async () => {
    const registry = new VirtualRegistry();
    const rootEnvelope = {
      type: "practice" as const,
      domain: "critical.path",
      sources: [] as string[],
      payload: {
        type: "practice" as const,
        rationale: "A.",
        contexts: [],
        failureModes: [],
      },
    };
    const a = await registry.registerEnvelope(rootEnvelope, CURATOR);
    const b = await registry.registerEnvelope(
      {
        type: "practice" as const,
        domain: "critical.path",
        sources: [a.kbId],
        payload: { type: "practice" as const, rationale: "B.", contexts: [], failureModes: [] },
      },
      CURATOR
    );
    const c = await registry.registerEnvelope(
      {
        type: "practice" as const,
        domain: "critical.path",
        sources: [b.kbId],
        payload: { type: "practice" as const, rationale: "C.", contexts: [], failureModes: [] },
      },
      CURATOR
    );
    expect(registry.getDerivedBlocks(a.kbId)).toContain(b.kbId);
    expect(registry.getDerivedBlocks(b.kbId)).toContain(c.kbId);
    expect(registry.getAttributionDAG(c.kbId).map((p) => p.parentHash)).toContain(b.kbId);
  });

  it("ingest → registry → lineage → query (root and derived KB)", async () => {
    const registry = new VirtualRegistry();

    // 1. Ingest: envelope → contentHash (deterministic identity)
    const rootEnvelope = {
      type: "practice" as const,
      domain: "critical.path",
      sources: [] as string[],
      payload: {
        type: "practice" as const,
        rationale: "Critical path test root.",
        contexts: [],
        failureModes: [],
      },
    };
    const rootHash = kbHashFromEnvelope(rootEnvelope as unknown as Record<string, unknown>);
    expect(rootHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    // 2. Registry: register root then derived
    const rootResult = await registry.registerEnvelope(rootEnvelope, CURATOR);
    expect(rootResult.kbId).toBe(rootHash);
    expect(rootResult.isNew).toBe(true);

    const derivedEnvelope = buildDerivedEnvelope({
      domain: "critical.path",
      sources: [rootResult.kbId],
      derivation: {
        type: "compose",
        inputs: [{ kbId: rootResult.kbId, selectors: ["payload.rationale"] }],
        recipe: {},
      },
      payload: {
        type: "practice",
        rationale: "Derived from root.",
        contexts: [],
        failureModes: [],
      },
    });
    const derivedResult = await registry.registerEnvelope(derivedEnvelope, "0x" + "2".repeat(40));
    expect(derivedResult.kbId).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(derivedResult.kbId).not.toBe(rootResult.kbId);

    // 3. Lineage: parents and derived
    const rootParents = registry.getAttributionDAG(rootResult.kbId);
    const rootDerived = registry.getDerivedBlocks(rootResult.kbId);
    const derivedParents = registry.getAttributionDAG(derivedResult.kbId);
    const derivedDerived = registry.getDerivedBlocks(derivedResult.kbId);

    expect(rootParents).toHaveLength(0);
    expect(rootDerived).toContain(derivedResult.kbId);
    expect(derivedParents.map((p) => p.parentHash)).toContain(rootResult.kbId);
    expect(derivedParents[0].royaltyShareBps).toBe(10000);
    expect(derivedDerived).toHaveLength(0);

    // 4. Query: resolve by contentHash and assert existence
    const rootKb = registry.getKB(rootResult.kbId);
    const derivedKb = registry.getKB(derivedResult.kbId);
    expect(rootKb.exists).toBe(true);
    expect(rootKb.curator).toBe(CURATOR);
    expect(rootKb.sources).toHaveLength(0);
    expect(derivedKb.exists).toBe(true);
    expect(derivedKb.sources).toContain(rootResult.kbId);
  });
});
