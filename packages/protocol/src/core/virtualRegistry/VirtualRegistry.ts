/**
 * Alexandrian Protocol — Virtual Registry (Protocol Sandbox)
 *
 * Stricter-than-mainnet reference implementation. Enforces protocol invariants
 * that the blockchain might accept but which harm long-term determinism.
 *
 * - Idempotency: Re-registering the same CanonicalEnvelope always returns the same kbId
 * - Zero-State: kbId is a pure function of content, lineage, and schema
 * - Duplicate Sources: Rejects envelopes with duplicate source IDs (INVALID_ENVELOPE)
 * - Lexicographical Source Ordering: Rejects unsorted sources (hash divergence)
 * - Cycle Detection: DFS on provenance graph; rejects circular dependencies
 * - Schema Rigidity: Validates payload against the six typed schemas
 */

import type { CanonicalEnvelope, CanonicalPayload } from "../../schema/canonicalEnvelope.js";
import {
  kbHashFromEnvelope,
  sortSources,
  canonicalize,
  cidV1FromCanonicalSync,
} from "../../canonical.js";
import {
  practicePayloadSchema,
  featurePayloadSchema,
  stateMachinePayloadSchema,
  promptEngineeringPayloadSchema,
  complianceChecklistPayloadSchema,
  rubricPayloadSchema,
  synthesisPayloadSchema,
  patternPayloadSchema,
  adaptationPayloadSchema,
  enhancementPayloadSchema,
} from "../../schema/payload/index.js";

export class VirtualRegistryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "SOURCES_NOT_SORTED"
      | "SELF_REFERENCE"
      | "UNREGISTERED_SOURCE"
      | "CYCLE_DETECTED"
      | "SCHEMA_INVALID"
      | "INVALID_ENVELOPE"
  ) {
    super(message);
    this.name = "VirtualRegistryError";
  }
}

interface StoredBlock {
  kbId: string;
  curator: string;
  type: string;
  sources: string[];
  timestamp: number;
}

export interface RegisterResult {
  kbId: string;
  cidV1: string;
  isNew: boolean;
}

/** Zod schema dispatch table — one entry per canonical KB type. */
const PAYLOAD_SCHEMAS = {
  practice: practicePayloadSchema,
  feature: featurePayloadSchema,
  stateMachine: stateMachinePayloadSchema,
  promptEngineering: promptEngineeringPayloadSchema,
  complianceChecklist: complianceChecklistPayloadSchema,
  rubric: rubricPayloadSchema,
  synthesis: synthesisPayloadSchema,
  pattern: patternPayloadSchema,
  adaptation: adaptationPayloadSchema,
  enhancement: enhancementPayloadSchema,
} as const;

/**
 * Normalise a kbId / content hash to always carry a "0x" prefix.
 * All registry identifiers are stored and compared in this normalised form.
 */
function hex0x(id: string): string {
  return id.startsWith("0x") ? id : "0x" + id;
}

/**
 * Validates that sources array has no duplicates.
 */
function assertSourcesUnique(sources: string[]): void {
  const normalized = sources.map(hex0x);
  const sourceSet = new Set(normalized);
  if (sourceSet.size !== sources.length) {
    throw new VirtualRegistryError("Duplicate sources not allowed", "INVALID_ENVELOPE");
  }
}

/**
 * Validates that sources array is lexicographically sorted.
 * Rejects to prevent cross-environment hash divergence.
 */
function assertSourcesSorted(sources: string[]): void {
  if (sources.length <= 1) return;
  const sorted = [...sources].sort();
  for (let i = 0; i < sources.length; i++) {
    if (sources[i] !== sorted[i]) {
      throw new VirtualRegistryError(
        "sources array must be lexicographically sorted before registration",
        "SOURCES_NOT_SORTED"
      );
    }
  }
}

/**
 * Validates derivation inputs: each inputs[].kbId must be in sources.
 */
function assertDerivationInputsValid(
  derivation: { inputs: { kbId: string }[] },
  sources: string[]
): void {
  const sourceSet = new Set(sources.map(hex0x));
  for (const inp of derivation.inputs) {
    const k = hex0x(inp.kbId);
    if (!sourceSet.has(k)) {
      throw new VirtualRegistryError(
        `Derivation input kbId ${k} is not in sources; all inputs must reference sources`,
        "INVALID_ENVELOPE"
      );
    }
  }
}

/**
 * Validates payload against the Zod schema for the given KB type.
 */
function validatePayload(type: string, payload: CanonicalPayload): void {
  const schema = PAYLOAD_SCHEMAS[type as keyof typeof PAYLOAD_SCHEMAS];
  if (!schema) {
    throw new VirtualRegistryError(`Unknown type: ${type}`, "SCHEMA_INVALID");
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    const msg = result.error.issues
      .map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new VirtualRegistryError(
      `payload validation failed for type "${type}": ${msg}`,
      "SCHEMA_INVALID"
    );
  }
}

export class VirtualRegistry {
  private store = new Map<string, StoredBlock>();

  /**
   * Compute ancestors of a node (transitive parents) via DFS.
   */
  private getAncestors(kbId: string, visited = new Set<string>()): Set<string> {
    if (visited.has(kbId)) return visited;
    visited.add(kbId);
    const block = this.store.get(hex0x(kbId));
    if (!block) return visited;
    for (const p of block.sources) {
      this.getAncestors(p, visited);
    }
    return visited;
  }

  /**
   * Check if adding (kbId, parents) would create a cycle.
   * Cycle: parent A is ancestor of parent B and parent B is ancestor of parent A.
   */
  private wouldCreateCycle(_kbId: string, parents: string[]): boolean {
    for (let i = 0; i < parents.length; i++) {
      const ancI = this.getAncestors(parents[i]!);
      for (let j = i + 1; j < parents.length; j++) {
        if (ancI.has(parents[j]!) && this.getAncestors(parents[j]!).has(parents[i]!)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Compute the kbId for an envelope. Extracted as a protected method to allow
   * test subclasses to inject a specific kbId for coverage of guard paths that
   * are computationally infeasible to reach by normal construction (e.g. SELF_REFERENCE).
   *
   * NEVER override in production code.
   */
  protected computeKbId(envelope: CanonicalEnvelope): string {
    return kbHashFromEnvelope(envelope as unknown as Record<string, unknown>);
  }

  /**
   * Register a CanonicalEnvelope. Idempotent: same envelope → same kbId.
   * Rejects: unsorted sources, cycles, invalid schema.
   *
   * @param registeredAt - Unix timestamp (seconds) to store with the record.
   *   Callers must inject this; protocol-core must not read Date.now() internally.
   *   Defaults to 0 for conformance tests where time is irrelevant.
   */
  registerEnvelope(
    envelope: CanonicalEnvelope,
    curator: string,
    registeredAt = 0
  ): RegisterResult {
    if (!envelope || typeof envelope !== "object") {
      throw new VirtualRegistryError("Invalid envelope", "INVALID_ENVELOPE");
    }
    if (!envelope.type || !envelope.domain || !Array.isArray(envelope.sources)) {
      throw new VirtualRegistryError(
        "Envelope must have type, domain, sources",
        "INVALID_ENVELOPE"
      );
    }
    if (!envelope.payload) {
      throw new VirtualRegistryError("Envelope must have payload", "INVALID_ENVELOPE");
    }
    assertSourcesUnique(envelope.sources);
    assertSourcesSorted(envelope.sources);
    validatePayload(envelope.type, envelope.payload);
    if (envelope.derivation) {
      if (!envelope.derivation.inputs || !Array.isArray(envelope.derivation.inputs)) {
        throw new VirtualRegistryError(
          "Derivation must have inputs array",
          "INVALID_ENVELOPE"
        );
      }
      assertDerivationInputsValid(envelope.derivation, envelope.sources);
    }

    const normalized = hex0x(this.computeKbId(envelope));

    if (this.store.has(normalized)) {
      const canonical = canonicalize(sortSources({ ...envelope }) as object);
      const cidV1 = cidV1FromCanonicalSync(canonical);
      return { kbId: normalized, cidV1, isNew: false };
    }

    if (envelope.sources.length > 0) {
      const sourcesNormalized = envelope.sources.map(hex0x);
      if (sourcesNormalized.includes(normalized)) {
        throw new VirtualRegistryError(
          "Self-reference: envelope sources must not contain its own kbId",
          "SELF_REFERENCE"
        );
      }
      for (const p of sourcesNormalized) {
        if (!this.store.has(p)) {
          throw new VirtualRegistryError(
            `Source ${p} not registered; register sources before descendants`,
            "UNREGISTERED_SOURCE"
          );
        }
      }
      if (this.wouldCreateCycle(normalized, sourcesNormalized)) {
        throw new VirtualRegistryError(
          "Registration would create a cycle in the provenance graph",
          "CYCLE_DETECTED"
        );
      }
    }

    this.store.set(normalized, {
      kbId: normalized,
      curator,
      type: envelope.type,
      sources: envelope.sources.map(hex0x),
      timestamp: registeredAt,
    });

    const canonical = canonicalize(sortSources({ ...envelope }) as object);
    const cidV1 = cidV1FromCanonicalSync(canonical);
    return { kbId: normalized, cidV1, isNew: true };
  }

  isVerified(kbId: string): boolean {
    return this.store.has(hex0x(kbId));
  }

  getCurator(kbId: string): string {
    const b = this.store.get(hex0x(kbId));
    if (!b) return "0x0000000000000000000000000000000000000000";
    return b.curator;
  }

  getKB(kbId: string): {
    contentHash: string;
    curator: string;
    type: string;
    sources: string[];
    timestamp: number;
    exists: boolean;
  } {
    const k = hex0x(kbId);
    const b = this.store.get(k);
    if (!b) {
      return {
        contentHash: k,
        curator: "0x0000000000000000000000000000000000000000",
        type: "practice",
        sources: [],
        timestamp: 0,
        exists: false,
      };
    }
    return {
      contentHash: b.kbId,
      curator: b.curator,
      type: b.type,
      sources: b.sources,
      timestamp: b.timestamp,
      exists: true,
    };
  }

  /** Parents with equal royalty split (for lineage API). */
  getAttributionDAG(contentHash: string): { parentHash: string; royaltyShareBps: number }[] {
    const kb = this.getKB(contentHash);
    if (!kb.exists || kb.sources.length === 0) return [];
    const bps = Math.floor(10000 / kb.sources.length);
    return kb.sources.map((parentHash) => ({ parentHash, royaltyShareBps: bps }));
  }

  /** Content hashes of blocks that list this hash as a source. */
  getDerivedBlocks(parentHash: string): string[] {
    const p = hex0x(parentHash);
    const out: string[] = [];
    for (const [kbId, block] of this.store) {
      if (block.sources.includes(p)) out.push(kbId);
    }
    return out;
  }

  /** For testing: clear all state */
  reset(): void {
    this.store.clear();
  }
}
