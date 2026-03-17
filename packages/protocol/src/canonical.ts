/**
 * Alexandrian Protocol — Canonical serialization for content-addressed KBs
 *
 * RFC 8785 (JCS) style: deterministic JSON. Same content → same hash.
 * Merges jcs + derivedEnvelope.
 */

import { createHash } from "crypto";
// js-sha3 is CJS — use default import for ESM compatibility.
// With esModuleInterop, the module.exports object becomes the default.
import sha3pkg from "js-sha3";
const { keccak_256 } = sha3pkg as unknown as { keccak_256(msg: string | ArrayBufferView): string };
import { CID } from "multiformats";
import { create as createDigest } from "multiformats/hashes/digest";
import * as sha2 from "multiformats/hashes/sha2";

/** SHA-256 multihash code (0x12) — frozen for v1. */
const SHA2_256_CODE = 0x12;
import type { CanonicalEnvelope, CanonicalDerivation, CanonicalPayload } from "./schema/canonicalEnvelope.js";

export const DOMAIN_TAGS = {
  KB: "KB_V1",
  TASK: "TASK_V1",
  TRANSITION: "TRANSITION_V1",
  CONSTRAINT: "CONSTRAINT_V1",
  TOOL: "TOOL_V1",
  VALIDATION: "VALIDATION_V1",
  RESOLVER: "RESOLVER_V1",
  STATE: "STATE_V1",
  LEAF: "LEAF_V1",
  EMPTY_TREE: "EMPTY_TREE_V1",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// JCS
// ─────────────────────────────────────────────────────────────────────────────

export function canonicalize(value: unknown): string {
  if (value === null) {
    throw new Error("Null values are not allowed in canonical input");
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite number in canonical input");
    return Number.isInteger(value) ? String(value) : JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "bigint") {
    throw new Error("BigInt values are not allowed in canonical input");
  }
  if (Array.isArray(value)) {
    const parts = value.map((v) => canonicalize(v));
    return "[" + parts.join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as object).sort();
    const parts = keys.map((k) => JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k]));
    return "{" + parts.join(",") + "}";
  }
  throw new Error("Unsupported type for canonicalization");
}

export function sortSources<T extends { sources?: string[] }>(envelope: T): T {
  if (!envelope.sources || envelope.sources.length <= 1) return envelope;
  return { ...envelope, sources: [...envelope.sources].sort() };
}

export function contentHashFromCanonical(canonicalJson: string): string {
  const digest = keccak_256(canonicalJson);
  return "0x" + digest;
}

export function domainHashFromCanonical(domainTag: string, canonicalJson: string): string {
  const bytes = new TextEncoder().encode(domainTag + canonicalJson);
  const digest = keccak_256(bytes);
  return "0x" + digest;
}

export function domainHashFromObject(domainTag: string, value: unknown): string {
  const canonical = canonicalize(value);
  return domainHashFromCanonical(domainTag, canonical);
}

export function artifactHashFromBytes(bytes: Uint8Array): string {
  const digest = keccak_256(bytes);
  return "0x" + digest;
}

export function artifactHashFromPayload(payload: CanonicalPayload): string {
  const canonical = canonicalize(payload);
  return contentHashFromCanonical(canonical);
}

/**
 * Synchronous CID v1 derivation using Node crypto (pure, no async, protocol-core safe).
 * Preferred in protocol-core and conformance tools where async is undesirable.
 */
export function cidV1FromCanonicalSync(canonicalJson: string): string {
  const hashBytes = createHash("sha256").update(canonicalJson, "utf8").digest();
  const digest = createDigest(SHA2_256_CODE, new Uint8Array(hashBytes));
  const cid = CID.createV1(0x55, digest);
  return cid.toString();
}

/** Async variant retained for SDK/browser environments without Node crypto. */
export async function cidV1FromCanonical(canonicalJson: string): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson);
  const digest = await sha2.sha256.digest(bytes);
  const cid = CID.createV1(0x55, digest);
  return cid.toString();
}

/** Keys included in KB identity hash per PROTOCOL-SPEC; all other keys (metadata, curator, createdAt, signature) are excluded. */
const HASH_SCOPE_KEYS = ["type", "domain", "sources", "artifactHash", "tier", "payload", "derivation"] as const;

function normalizeForHash(envelope: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of HASH_SCOPE_KEYS) {
    if (envelope[k] !== undefined) out[k] = envelope[k];
  }
  const arr = (out.sources ?? (envelope as { parents?: string[] }).parents) as string[] | undefined;
  out.sources = arr && arr.length > 1 ? [...arr].sort() : (arr ?? []);
  return out;
}

/**
 * @deprecated Prefer kbHashFromEnvelope for new code.
 *
 * NOTE: Retained for v1 envelope format conformance tests (test-vectors/v1/).
 * sdk-adapters has migrated to kbHashFromEnvelope.
 *
 * contentHashFromEnvelope = keccak_256(JCS(normalizeForHash(envelope)))
 * kbHashFromEnvelope      = keccak_256("KB_V1" + JCS(normalizeForHash(envelope)))
 *
 * The two functions produce different hashes. The domain prefix "KB_V1" is
 * prepended to the canonical JSON string before hashing (single hash, not double).
 * On-chain kbIds are derived with the domain-tagged kbHashFromEnvelope; use
 * that for all new code.
 */
export function contentHashFromEnvelope(envelope: Record<string, unknown>): string {
  const normalized = normalizeForHash(envelope);
  const canonical = canonicalize(normalized);
  return contentHashFromCanonical(canonical);
}

export function kbHashFromEnvelope(envelope: Record<string, unknown>): string {
  const normalized = normalizeForHash(envelope);
  return domainHashFromObject(DOMAIN_TAGS.KB, normalized);
}

export async function cidV1FromEnvelope(envelope: Record<string, unknown>): Promise<string> {
  const normalized = normalizeForHash(envelope);
  const canonical = canonicalize(normalized);
  return cidV1FromCanonical(canonical);
}

// ─────────────────────────────────────────────────────────────────────────────
// Consensus-Critical: Canonical Head Comparator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consensus-critical reference to a registered on-chain KB.
 * Used as input to compareCandidates() for canonical head selection.
 */
export interface CandidateRef {
  /** Content hash (kbId): 0x-prefixed 32-byte hex string. */
  kbId: string;
  /** Block number of the registration transaction. */
  blockNumber: number;
  /** Log index of the registration event within the block. */
  logIndex: number;
}

/**
 * Consensus-critical canonical comparator for pool head selection.
 *
 * Fully specified: no implementation-defined behavior, no undefined return paths.
 * All implementations MUST use this exact tie-breaking order.
 *
 * Priority (ascending = wins):
 *   1. blockNumber  — earlier on-chain registration wins
 *   2. logIndex     — earlier event in same block wins
 *   3. kbId         — lexicographic (0x... hex) as ultimate tie-breaker
 *
 * Normative spec: docs/protocol/CONSENSUS-CRITICAL.md §3
 *
 * @returns -1 | 0 | 1 per standard comparator contract
 */
export function compareCandidates(a: CandidateRef, b: CandidateRef): -1 | 0 | 1 {
  if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
  if (a.logIndex !== b.logIndex) return a.logIndex < b.logIndex ? -1 : 1;
  const aId = a.kbId.toLowerCase();
  const bId = b.kbId.toLowerCase();
  if (aId !== bId) return aId < bId ? -1 : 1;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived Envelope Builder
// ─────────────────────────────────────────────────────────────────────────────

export interface DerivedEnvelopeInput {
  domain: string;
  sources: string[];
  artifactHash?: string;
  tier?: "open" | "verified" | "premium" | "restricted";
  derivation: {
    type: CanonicalDerivation["type"];
    inputs: CanonicalDerivation["inputs"];
    recipe: CanonicalDerivation["recipe"];
  };
  payload: CanonicalPayload;
}

export function buildDerivedEnvelope(input: DerivedEnvelopeInput): CanonicalEnvelope {
  const sources = [...input.sources].map((p) => (p.startsWith("0x") ? p : "0x" + p)).sort();
  const artifactHash = input.artifactHash ?? artifactHashFromPayload(input.payload);
  const envelope: CanonicalEnvelope = {
    type: input.payload.type,
    domain: input.domain,
    sources,
    artifactHash,
    tier: input.tier ?? "open",
    payload: input.payload,
    derivation: {
      type: input.derivation.type,
      inputs: input.derivation.inputs.map((i) => ({
        kbId: i.kbId.startsWith("0x") ? i.kbId : "0x" + i.kbId,
        selectors: i.selectors,
      })),
      recipe: input.derivation.recipe,
    },
  };
  return sortSources(envelope) as CanonicalEnvelope;
}
