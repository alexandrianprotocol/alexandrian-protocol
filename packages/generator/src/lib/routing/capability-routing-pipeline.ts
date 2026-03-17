/**
 * Capability routing pipeline helpers: weighted retrieval, graph neighbor expansion,
 * interface compatibility scoring, and execution plan ordering.
 *
 * Ranking formula (for runtime):
 *   final_score =
 *     0.50 * semantic_similarity   (embedding similarity to task; runtime)
 *   + 0.25 * capability_score       (router confidence for the cluster)
 *   + 0.15 * domain_match          (task domain vs artifact domain)
 *   + 0.10 * procedural_quality   (proceduralSpecificityScore / max)
 *   + 0.10 * historical_success    (optional: procedure_usage_count / success_rate)
 * Use capability_score from RoutedCapability; procedural_quality from getProceduralQualityScore.
 */

import type { QueueRecord } from "../core/builder.js";
import type { RoutedCapability } from "./capability-router.js";
import { getRecordsForCapabilities } from "./capability-clusters.js";
import { proceduralSpecificityScore } from "../procedural-specificity.js";

/**
 * Get candidate records for routed capabilities (with scores).
 * Use capability scores later in ranking: final_score += 0.25 * capability_score.
 */
export function getRecordsForRoutedCapabilities(
  index: Map<string, QueueRecord[]>,
  routed: RoutedCapability[]
): QueueRecord[] {
  return getRecordsForCapabilities(
    index,
    routed.map((r) => r.capability)
  );
}

/**
 * Build a map: kbHash → list of neighbor kbHashes (same parent, or direct parent).
 * Neighbors = parents of this KB + siblings (other KBs that share a parent).
 */
export function buildNeighborMap(pool: QueueRecord[]): Map<string, Set<string>> {
  const parentToChildren = new Map<string, Set<string>>();
  const childToParents = new Map<string, Set<string>>();
  for (const r of pool) {
    const used = r.artifact?.knowledge_inputs?.used ?? [];
    const myHash = r.kbHash;
    for (const u of used) {
      const pid = typeof u === "object" && u !== null && "kb_id" in u ? (u as { kb_id: string }).kb_id : String(u);
      if (!pid) continue;
      if (!parentToChildren.has(pid)) parentToChildren.set(pid, new Set());
      parentToChildren.get(pid)!.add(myHash);
      if (!childToParents.has(myHash)) childToParents.set(myHash, new Set());
      childToParents.get(myHash)!.add(pid);
    }
  }
  const neighbors = new Map<string, Set<string>>();
  for (const r of pool) {
    const set = new Set<string>();
    const myHash = r.kbHash;
    const parents = childToParents.get(myHash);
    if (parents) {
      for (const p of parents) {
        set.add(p);
        const sibs = parentToChildren.get(p);
        if (sibs) for (const s of sibs) set.add(s);
      }
    }
    set.delete(myHash);
    if (set.size > 0) neighbors.set(myHash, set);
  }
  return neighbors;
}

/**
 * Expand a list of records with their graph neighbors (procedure bundles).
 * maxExtra: max additional records to add per seed (default 10).
 */
export function expandWithGraphNeighbors(
  pool: QueueRecord[],
  records: QueueRecord[],
  neighborMap: Map<string, Set<string>>,
  maxExtra: number = 10
): QueueRecord[] {
  const byHash = new Map(pool.map((r) => [r.kbHash, r]));
  const out = new Map<string, QueueRecord>();
  for (const r of records) out.set(r.kbHash, r);
  let added = 0;
  for (const r of records) {
    if (added >= maxExtra * records.length) break;
    const nb = neighborMap.get(r.kbHash);
    if (!nb) continue;
    for (const h of nb) {
      if (out.has(h)) continue;
      const rec = byHash.get(h);
      if (rec) {
        out.set(h, rec);
        added++;
        if (added >= maxExtra * records.length) break;
      }
    }
  }
  return [...out.values()];
}

/** Get output names from artifact interface. */
function getOutputNames(r: QueueRecord): Set<string> {
  const outs = r.artifact?.payload?.interface?.outputs ?? [];
  return new Set(outs.map((o) => (o?.name ?? "").toLowerCase().trim()).filter(Boolean));
}

/** Get input names from artifact interface. */
function getInputNames(r: QueueRecord): Set<string> {
  const ins = r.artifact?.payload?.interface?.inputs ?? [];
  return new Set(ins.map((i) => (i?.name ?? "").toLowerCase().trim()).filter(Boolean));
}

/**
 * Interface compatibility: how well does output of A feed input of B?
 * Returns 0–1: share of B's inputs that appear in A's outputs (or name overlap).
 */
export function interfaceCompatibilityScore(recordA: QueueRecord, recordB: QueueRecord): number {
  const aOut = getOutputNames(recordA);
  const bIn = getInputNames(recordB);
  if (bIn.size === 0) return 0.5;
  let match = 0;
  for (const b of bIn) {
    if (aOut.has(b)) match += 1;
    else {
      for (const ao of aOut) {
        if (ao.includes(b) || b.includes(ao)) {
          match += 0.5;
          break;
        }
      }
    }
  }
  return match / bIn.size;
}

/**
 * Order a shortlist of records into an execution plan by interface chaining.
 * Greedy: start with record that has most outputs others need; then append best compatible next.
 */
export function buildExecutionPlanOrder(shortlist: QueueRecord[]): QueueRecord[] {
  if (shortlist.length <= 1) return [...shortlist];
  const remaining = new Set(shortlist);
  const ordered: QueueRecord[] = [];
  let next = shortlist[0];
  for (const r of shortlist) {
    const out = getOutputNames(r).size;
    if (out > getOutputNames(next).size) next = r;
  }
  ordered.push(next);
  remaining.delete(next);
  while (remaining.size > 0) {
    let best: QueueRecord | null = null;
    let bestScore = -1;
    const last = ordered[ordered.length - 1];
    for (const r of remaining) {
      const s = interfaceCompatibilityScore(last, r);
      if (s > bestScore) {
        bestScore = s;
        best = r;
      }
    }
    if (!best) break;
    ordered.push(best);
    remaining.delete(best);
  }
  for (const r of remaining) ordered.push(r);
  return ordered;
}

/**
 * Procedural quality score 0–1 for ranking (procedural_specificity / max).
 */
export function getProceduralQualityScore(record: QueueRecord): number {
  const result = proceduralSpecificityScore(record.artifact);
  return result.max > 0 ? result.score / result.max : 0;
}
