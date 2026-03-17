/**
 * Staging Queue I/O — KBv2.4
 *
 * Reads and writes QueueRecord JSON files in staging/pending/.
 * Maintains content-hash deduplication via an in-memory Set.
 * Content fingerprint set used for claim+summary dedup (optional).
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { QueueRecord } from "./builder.js";
import { contentFingerprint } from "./builder.js";

export function loadQueue(pendingDir: string): QueueRecord[] {
  if (!existsSync(pendingDir)) return [];
  const files = readdirSync(pendingDir).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const raw = readFileSync(join(pendingDir, f), "utf-8");
    return JSON.parse(raw) as QueueRecord;
  });
}

export function writeRecord(pendingDir: string, record: QueueRecord): void {
  if (!existsSync(pendingDir)) {
    mkdirSync(pendingDir, { recursive: true });
  }
  const filename = `${record.kbHash}.json`;
  writeFileSync(join(pendingDir, filename), JSON.stringify(record, null, 2), "utf-8");
}

export function buildDedupSet(records: QueueRecord[]): Set<string> {
  return new Set(records.map((r) => r.kbHash));
}

/** Build set of content fingerprints (claim+summary) for existing records; used to reject near-duplicate content. */
export function buildContentFingerprintSet(records: QueueRecord[]): Set<string> {
  const set = new Set<string>();
  for (const r of records) {
    const fp = contentFingerprint(r.artifact);
    if (fp) set.add(fp);
  }
  return set;
}

/**
 * Return records in safe publish order: L0 seeds first, then L1, L2, … (by lineage.depth), then by kbHash.
 * Contract requires parents to exist before children.
 */
export function getPublishOrder(records: QueueRecord[]): QueueRecord[] {
  return [...records].sort((a, b) => {
    const dA = a.artifact?.provenance?.lineage?.depth ?? (a.isSeed ? 0 : 1);
    const dB = b.artifact?.provenance?.lineage?.depth ?? (b.isSeed ? 0 : 1);
    if (dA !== dB) return dA - dB;
    return a.kbHash.localeCompare(b.kbHash);
  });
}
