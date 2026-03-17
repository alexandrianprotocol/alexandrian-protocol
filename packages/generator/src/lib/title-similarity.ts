/**
 * Title similarity check — avoid semantically redundant ai-seeds in the same domain.
 *
 * When the model produces near-identical titles (e.g. "Establishing Seed Prompt for
 * Consistent AI Output" variants), we skip so we don't add redundant seeds.
 * Manual review of ai.prompting / promptEngineering seeds is still recommended.
 */

import type { QueueRecord } from "./core/builder.js";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter(Boolean));
}

/** Word overlap ratio (Jaccard-like): intersection size / min set size. High = very similar. */
function wordOverlap(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) {
    if (wb.has(w)) inter++;
  }
  return inter / Math.min(wa.size, wb.size);
}

/**
 * Returns true if newTitle is too similar to any existing record in the same domain.
 * Used in ai-seeds phase to skip redundant titles (e.g. three "Establishing Seed Prompt..." variants).
 */
export function titleTooSimilarInDomain(
  newTitle: string,
  domain: string,
  pool: QueueRecord[]
): boolean {
  const normNew = normalize(newTitle);
  if (normNew.length < 10) return false;

  const sameDomain = pool.filter(
    (r) => (r.artifact?.semantic?.domain ?? r.domain) === domain
  );

  for (const r of sameDomain) {
    const existing = (r.artifact?.identity?.title ?? r.domain ?? "").trim();
    const normExisting = normalize(existing);
    if (normExisting.length < 10) continue;

    if (normNew === normExisting) return true;
    if (normNew.includes(normExisting) || normExisting.includes(normNew)) return true;
    if (wordOverlap(newTitle, existing) >= 0.85) return true;
  }

  return false;
}
