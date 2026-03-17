/**
 * KB Envelope Builder — KBv2.4
 *
 * Accepts a KBv24Artifact with identity.kb_id = "" and:
 *   1. Validates seed/derived parent count rules
 *   2. Computes identity hash via kbHashFromArtifactV24
 *   3. Fills identity.kb_id with the computed hash
 *   4. Checks deduplication via dedupSet (and optional contentFingerprintSet)
 *   5. Returns a QueueRecord ready for writing
 *
 * Enforces:
 *   - Seeds (identity.is_seed = true) must have empty knowledge_inputs.used
 *   - Derived KBs must have >= 2 entries in knowledge_inputs.used
 *   - Duplicate detection via dedupSet (content-hash keyed)
 *   - Optional content dedup: same normalized claim+summary → DUPLICATE_CONTENT
 *   - Optional Jaccard similarity: near-paraphrase claims (>75% token overlap) → NEAR_DUPLICATE
 */

import { kbHashFromArtifactV24 } from "./hash.js";
import type { KBv24Artifact } from "../../types/artifact.js";

/** Normalize and hash domain+claim+summary for content-level dedup (avoids false duplicates across domains). */
export function contentFingerprint(artifact: KBv24Artifact): string {
  const domain = (artifact.semantic?.domain ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const claim = (artifact.claim?.statement ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const summary = (artifact.semantic?.summary ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const combined = `${domain}\n${claim}\n${summary}`;
  if (combined.length === 0) return "";
  let h = 0;
  for (let i = 0; i < combined.length; i++) {
    h = ((h << 5) - h + combined.charCodeAt(i)) | 0;
  }
  return "fp_" + (h >>> 0).toString(16);
}

/** Common English stopwords excluded from Jaccard token comparison. */
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "up", "as", "is", "was", "are", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "must", "can",
  "that", "this", "it", "its", "not", "no", "so", "if", "when", "which",
]);

/** Tokenise a string into a lowercase word-token set, excluding stopwords. */
function tokenSet(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return new Set(tokens);
}

/** Jaccard similarity between two strings using content-bearing tokens (0–1). */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Jaccard similarity threshold above which two claims are treated as near-duplicates. */
export const NEAR_DUPLICATE_THRESHOLD = 0.75;

export const GENERATOR_VERSION = "0.1.0";

/** Output shape of derived factory build() — converted to KBv24Artifact via derivedEnvelopeToArtifact(). */
export type EnvelopeInput = import("../envelope-to-artifact.js").DerivedEnvelopeOutput;

export interface QueueRecord {
  kbHash: string;
  generatorVersion: string;
  status: "pending";
  isSeed: boolean;
  generatedAt: string;
  /** Convenience field: mirrors artifact.semantic.domain */
  domain: string;
  artifact: KBv24Artifact;
}

export function buildRecord(
  input: KBv24Artifact,
  dedupSet: Set<string>,
  contentFingerprintSet?: Set<string>,
  /** Map from fingerprint → lowercased claim text for Jaccard near-duplicate detection. */
  claimIndex?: Map<string, string>
): QueueRecord {
  const isSeed = input.identity.is_seed;

  if (isSeed && input.knowledge_inputs.used.length > 0) {
    throw new Error(
      `SEED_HAS_SOURCES: seed KB must have empty knowledge_inputs.used, ` +
        `got ${input.knowledge_inputs.used.length}`
    );
  }

  if (!isSeed) {
    const n = input.knowledge_inputs.used.length;
    if (n < 2) {
      throw new Error(
        `MIN_PARENTS_VIOLATED: derived KB requires >= 2 entries in knowledge_inputs.used, got ${n}`
      );
    }
    if (n > 3) {
      throw new Error(
        `MAX_PARENTS_VIOLATED: derived KB must have at most 3 parents (reasoning edge rule), got ${n}`
      );
    }
  }

  if (contentFingerprintSet) {
    const fp = contentFingerprint(input);
    if (fp && contentFingerprintSet.has(fp)) {
      throw new Error(`DUPLICATE_CONTENT: same claim+summary already in queue`);
    }

    // Jaccard near-duplicate check: reject claims that are paraphrases of existing ones
    if (claimIndex && claimIndex.size > 0) {
      const newClaim = (input.claim?.statement ?? "").toLowerCase();
      for (const [, existingClaim] of claimIndex) {
        const sim = jaccardSimilarity(newClaim, existingClaim);
        if (sim > NEAR_DUPLICATE_THRESHOLD) {
          throw new Error(
            `NEAR_DUPLICATE: claim is ${(sim * 100).toFixed(0)}% similar to an existing KB ` +
            `(Jaccard > ${NEAR_DUPLICATE_THRESHOLD})`
          );
        }
      }
    }

    // Register the new claim in the index for future comparisons
    if (claimIndex && fp) {
      claimIndex.set(fp, (input.claim?.statement ?? "").toLowerCase());
    }
    if (fp) contentFingerprintSet.add(fp);
  }

  // Compute identity hash (excludes identity.kb_id and provenance.author.address)
  const kbHash = kbHashFromArtifactV24(input);

  if (dedupSet.has(kbHash)) {
    throw new Error(`DUPLICATE_ENVELOPE: ${kbHash} already exists in staging queue`);
  }

  // Fill in the identity hash
  const artifact: KBv24Artifact = {
    ...input,
    identity: { ...input.identity, kb_id: kbHash },
  };

  return {
    kbHash,
    generatorVersion: GENERATOR_VERSION,
    status: "pending",
    isSeed,
    generatedAt: new Date().toISOString(),
    domain: artifact.semantic.domain,
    artifact,
  };
}
