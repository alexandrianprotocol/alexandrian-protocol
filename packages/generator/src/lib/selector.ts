/**
 * Parent Selector — KBv2.4 / reasoning-edge rules
 *
 * Picks parent KBs from the pool for derived KB generation.
 * Enforces cross-domain rule: selected set must have at least 2 distinct domain roots
 * so the DAG grows like a reasoning network, not silos.
 */

import type { QueueRecord } from "./core/builder.js";

/** Top-level segment of domain (e.g. "agent" from "agent.planning"). */
export function getDomainRoot(domain: string): string {
  return domain.split(".")[0] ?? domain;
}

/**
 * Two domains are compatible if identical or one is a prefix of the other.
 * e.g. "software.security" is compatible with "software" and vice-versa.
 */
function domainsCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.startsWith(b + ".")) return true;
  if (b.startsWith(a + ".")) return true;
  return false;
}

/**
 * Select 2–3 parents for a derived KB. When requireCrossDomain is true (default),
 * the selected set must have at least 2 distinct domain roots (prevents domain silos).
 */
export function selectParents(
  pool: QueueRecord[],
  requiredDomains: string[],
  count: number,
  requireCrossDomain: boolean = true
): QueueRecord[] {
  const selected: QueueRecord[] = [];
  const validPool = pool.filter((r) => r.artifact?.semantic?.domain != null);

  // First pass: pick one parent per required domain, in order
  for (const domain of requiredDomains) {
    const candidates = validPool.filter(
      (r) =>
        domainsCompatible(r.artifact.semantic.domain, domain) &&
        !selected.some((s) => s.kbHash === r.kbHash)
    );
    if (candidates.length > 0) {
      selected.push(candidates[0]);
    }
    if (selected.length >= count) break;
  }

  // Second pass: fill remaining slots from any domain
  if (selected.length < count) {
    const remaining = validPool.filter((r) => !selected.some((s) => s.kbHash === r.kbHash));
    for (const r of remaining) {
      if (selected.length >= count) break;
      selected.push(r);
    }
  }

  // Cross-domain rule: at least 2 distinct domain roots (no silos)
  if (requireCrossDomain && selected.length >= 2) {
    const roots = new Set(selected.map((r) => getDomainRoot(r.domain)));
    if (roots.size < 2) {
      return [];
    }
  }

  // Sort by kbHash — lexicographic, required for deterministic envelope hashing
  return selected.sort((a, b) => a.kbHash.localeCompare(b.kbHash));
}

/** Extract a short readable excerpt from a KBv2.4 artifact for use as a citation. */
export function extractExcerpt(record: QueueRecord): string {
  const statement = record.artifact.claim.statement;
  const summary = record.artifact.semantic.summary;
  const text = statement || summary || `${record.artifact.identity.epistemic_type} from ${record.domain}`;
  return String(text).slice(0, 140);
}
