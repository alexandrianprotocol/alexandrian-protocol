/**
 * Hashing utilities for the KB generator — KBv2.4 format.
 *
 * Hash identity: kbHashFromArtifactV24 produces the on-chain kbId.
 * Uses the same keccak256(domain_tag + JCS(normalized)) scheme as
 * packages/protocol/src/canonical.ts, but implemented here directly
 * to avoid the ESM-only multiformats dependency in the CJS protocol dist.
 */

// js-sha3 is CJS — use default import to avoid named export error in ESM context
import jsSha3 from "js-sha3";
const { keccak_256 } = jsSha3;

// ── JCS (RFC 8785) ────────────────────────────────────────────────────────────

export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite number in canonical input");
    return Number.isInteger(value) ? String(value) : JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "bigint") throw new Error("BigInt values are not allowed in canonical input");
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as object).sort();
    const parts = keys.map(
      (k) => JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k])
    );
    return "{" + parts.join(",") + "}";
  }
  throw new Error("Unsupported type for canonicalization");
}

// ── KBv2.4 normalization ──────────────────────────────────────────────────────

/**
 * Normalize a KBv24Artifact for hashing:
 *  - Removes identity.kb_id   (circular — it IS the hash)
 *  - Removes provenance.author.address  (publish-time; unknown at generation)
 *  - Deep-clones to avoid mutation
 */
function normalizeForHashV24(artifact: Record<string, unknown>): Record<string, unknown> {
  // Deep clone via JSON round-trip (artifact contains only JSON-safe values)
  const clone = JSON.parse(JSON.stringify(artifact)) as Record<string, unknown>;

  // Remove identity.kb_id
  const identity = clone["identity"] as Record<string, unknown> | undefined;
  if (identity) {
    delete identity["kb_id"];
  }

  // Remove provenance.author.address
  const provenance = clone["provenance"] as Record<string, unknown> | undefined;
  if (provenance) {
    const author = provenance["author"] as Record<string, unknown> | undefined;
    if (author) {
      delete author["address"];
    }
  }

  return clone;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute the KB identity hash for a KBv2.4 artifact:
 *   keccak256(domain_tag + JCS(normalised artifact))
 *
 * Excludes identity.kb_id and provenance.author.address from the preimage.
 * Domain tag is taken from identity.schema (v2.4 or v2.5).
 */
export function kbHashFromArtifactV24(artifact: unknown): string {
  const normalized = normalizeForHashV24(artifact as Record<string, unknown>);
  const canonical = canonicalize(normalized);
  const identity = (artifact as Record<string, unknown>)?.identity as Record<string, unknown> | undefined;
  const schema = (identity?.schema as string) || "alexandrian.kb.v2.4";
  const bytes = new TextEncoder().encode(schema + canonical);
  return "0x" + keccak_256(bytes);
}
