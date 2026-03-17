/**
 * DAG shape monitoring: hub detection (soft child limit) and dependency warnings (deprecated ancestors).
 * Use to avoid hub-and-spoke graphs and to surface deprecated dependency chains to the indexer.
 */

import type { QueueRecord } from "./core/builder.js";
import type { KBv24Artifact } from "../types/artifact.js";

/** Soft limit: flag artifacts with more than this many children as potential hubs for review. */
export const MAX_CHILDREN_SOFT = 150;

/** Get parent kb_ids for a record (from knowledge_inputs.used). */
function getParentIds(record: QueueRecord): string[] {
  const used = record.artifact?.knowledge_inputs?.used ?? [];
  return used.map((u) => (typeof u === "object" && u && "kb_id" in u ? (u as { kb_id: string }).kb_id : String(u)));
}

/** Build map: kb_id → number of artifacts that list it as parent. */
export function getChildCounts(records: QueueRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of records) {
    for (const parentId of getParentIds(r)) {
      counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
    }
  }
  return counts;
}

export interface HubInfo {
  kb_id: string;
  childCount: number;
  domain?: string;
  title?: string;
}

/** Return artifacts that exceed the soft child limit (potential hubs). */
export function getHubs(
  records: QueueRecord[],
  limit: number = MAX_CHILDREN_SOFT
): HubInfo[] {
  const childCounts = getChildCounts(records);
  const byHash = new Map(records.map((r) => [r.kbHash, r]));
  const hubs: HubInfo[] = [];
  for (const [kb_id, count] of childCounts) {
    if (count >= limit) {
      const rec = byHash.get(kb_id);
      hubs.push({
        kb_id,
        childCount: count,
        domain: rec?.artifact?.semantic?.domain,
        title: rec?.artifact?.identity?.title,
      });
    }
  }
  return hubs.sort((a, b) => b.childCount - a.childCount);
}

/** Build map: kb_id → record for lookup. */
function byKbId(records: QueueRecord[]): Map<string, QueueRecord> {
  return new Map(records.map((r) => [r.kbHash, r]));
}

/** Recursively collect kb_ids of all ancestors that have identity.status === "deprecated". */
export function getDeprecatedAncestors(records: QueueRecord[], kb_id: string): string[] {
  const map = byKbId(records);
  const seen = new Set<string>();
  const deprecated: string[] = [];

  function walk(id: string) {
    if (seen.has(id)) return;
    seen.add(id);
    const rec = map.get(id);
    if (!rec) return;
    const status = (rec.artifact as KBv24Artifact)?.identity?.status;
    if (status === "deprecated") deprecated.push(id);
    for (const parentId of getParentIds(rec)) {
      walk(parentId);
    }
  }

  walk(kb_id);
  return deprecated;
}

/**
 * For indexer: given a record (or kb_id) and the full queue, return dependency_warnings
 * when any ancestor is deprecated. Indexer should add this to its response, not to the artifact.
 */
export function getDependencyWarnings(records: QueueRecord[], kb_id: string): { deprecated_ancestors: string[] } {
  const deprecated_ancestors = getDeprecatedAncestors(records, kb_id);
  return { deprecated_ancestors };
}
