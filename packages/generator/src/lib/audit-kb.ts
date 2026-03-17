/**
 * Audit upgraded KB entries in staging/refined (or staged artifacts).
 * Checks: duplicate procedures, missing verification, missing references.
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import type { UpgradedKBEntry } from "./upgraded-kb-entry.js";

export interface AuditIssue {
  file: string;
  kind: "duplicate_procedure" | "missing_verification" | "missing_references" | "short_procedure" | "long_summary";
  message: string;
}

export interface AuditResult {
  total: number;
  issues: AuditIssue[];
  duplicateGroups: string[][]; // groups of files with same normalized procedure
}

function normalizeForDedup(procedure: string[]): string {
  return procedure
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, " "))
    .sort()
    .join(" | ");
}

/**
 * Audit upgraded entries in refinedDir. Returns list of issues and duplicate groups.
 */
export function auditRefinedKb(refinedDir: string): AuditResult {
  const issues: AuditIssue[] = [];
  const procedureToFiles = new Map<string, string[]>();

  if (!existsSync(refinedDir)) {
    return { total: 0, issues: [], duplicateGroups: [] };
  }

  const files = readdirSync(refinedDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const path = join(refinedDir, file);
    let entry: UpgradedKBEntry;
    try {
      entry = JSON.parse(readFileSync(path, "utf-8")) as UpgradedKBEntry;
    } catch {
      issues.push({ file, kind: "missing_verification", message: "Invalid JSON" });
      continue;
    }

    if (!entry.verification || entry.verification.length === 0) {
      issues.push({ file, kind: "missing_verification", message: "verification array is empty" });
    }
    if (!entry.references || entry.references.length === 0) {
      issues.push({ file, kind: "missing_references", message: "references array is empty" });
    }
    if (entry.procedure && entry.procedure.length < 3) {
      issues.push({ file, kind: "short_procedure", message: `procedure has ${entry.procedure.length} steps (min 3)` });
    }
    if (entry.summary && entry.summary.length > 280) {
      issues.push({ file, kind: "long_summary", message: `summary length ${entry.summary.length} (max 280)` });
    }

    const key = normalizeForDedup(entry.procedure ?? []);
    if (key) {
      const list = procedureToFiles.get(key) ?? [];
      list.push(file);
      procedureToFiles.set(key, list);
    }
  }

  const duplicateGroups = [...procedureToFiles.values()].filter((list) => list.length > 1);
  for (const group of duplicateGroups) {
    for (const file of group) {
      issues.push({
        file,
        kind: "duplicate_procedure",
        message: `Duplicate procedure (same as: ${group.filter((f) => f !== file).join(", ")})`,
      });
    }
  }

  return { total: files.length, issues, duplicateGroups };
}
