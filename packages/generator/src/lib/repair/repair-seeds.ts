/**
 * Repair pass for existing seeds — deterministic enrichment without regeneration.
 *
 * Pipeline: load seeds → title from domain → tags from domain → validation from steps
 * → step/interface consistency check → store normalized seeds (new hash → new file, remove old).
 *
 * Use when seeds have missing metadata (Untitled, empty tags, empty validation).
 * Does not wipe; preserves reasoning steps and content. Hash changes after repair (new file, old deleted).
 */

import { unlinkSync, existsSync } from "fs";
import { join } from "path";
import type { KBv24Artifact } from "../../types/artifact.js";
import {
  generateTitle,
  generateTags,
  generateValidationFromSteps,
  validateStepInterfaceConsistency,
  getDomainMetrics,
} from "../ai-seed-quality.js";
import { buildRecord, contentFingerprint } from "../core/builder.js";
import type { QueueRecord } from "../core/builder.js";
import { loadQueue, writeRecord } from "../core/queue.js";
import { normalizeSuperSeed } from "../super-seed-normalize.js";
import { expandProcedure } from "./procedure-expander.js";
import { repairKB } from "./kbRepair.js";
import { validateArtifact } from "../core/validator.js";
import { repairKBv24Dimensions } from "./dimension-repair.js";

/** Apply only missing metadata: title (from domain), tags (from domain), validation (from steps). Does not mutate steps or claim. */
export function repairSeedArtifact(artifact: KBv24Artifact): KBv24Artifact {
  const domain = (artifact.semantic?.domain ?? "").trim() || "unknown";
  const out = { ...artifact };

  if (!out.identity) out.identity = artifact.identity;
  else out.identity = { ...artifact.identity };
  if (!out.semantic) out.semantic = { ...artifact.semantic };
  else out.semantic = { ...artifact.semantic };
  if (!out.validation) out.validation = { success_conditions: [], failure_conditions: [], metrics: [] };
  else out.validation = { ...artifact.validation };
  if (!out.payload) out.payload = { ...artifact.payload };
  else out.payload = { ...artifact.payload };
  if (!out.payload.interface) out.payload.interface = { ...artifact.payload?.interface };
  else out.payload.interface = { ...out.payload.interface };
  out.payload.interface.inputs = Array.isArray(out.payload.interface.inputs)
    ? [...out.payload.interface.inputs]
    : [];

  if ((out.semantic.summary ?? "").length > 280) {
    out.semantic.summary = out.semantic.summary!.slice(0, 280);
  }

  if (!out.identity.title?.trim() || out.identity.title === "Untitled") {
    out.identity.title = generateTitle(domain);
  }

  const tags = out.semantic.tags ?? [];
  if (tags.length < 3) {
    out.semantic.tags = generateTags(domain);
  }

  const steps = out.payload?.inline_artifact?.steps ?? [];
  const inputNamesFromSteps = new Set<string>();
  for (const s of steps) {
    if (typeof s === "object" && s !== null && Array.isArray((s as { inputs?: string[] }).inputs)) {
      for (const name of (s as { inputs: string[] }).inputs) inputNamesFromSteps.add(name);
    }
  }
  const existingInputNames = new Set((out.payload.interface.inputs ?? []).map((i) => i.name));
  for (const name of inputNamesFromSteps) {
    if (!existingInputNames.has(name)) {
      out.payload.interface.inputs.push({
        name,
        type: name === "goal" ? "task" : "string",
        description: name === "goal" ? "Input goal or context" : `Input: ${name}`,
      });
      existingInputNames.add(name);
    }
  }

  const outputNames = (out.payload?.interface?.outputs ?? []).map((o) => o.name);
  const hasSuccess = (out.validation.success_conditions?.length ?? 0) > 0;
  const hasFailure = (out.validation.failure_conditions?.length ?? 0) > 0;
  if (!hasSuccess || !hasFailure) {
    const gen = generateValidationFromSteps(steps, outputNames, domain);
    out.validation.success_conditions = gen.success_conditions;
    out.validation.failure_conditions = gen.failure_conditions;
  }
  if (!out.validation.metrics?.length) {
    out.validation.metrics = getDomainMetrics(domain);
  }

  return out;
}

export interface RepairPassResult {
  repaired: number;
  skipped: number;
  errors: string[];
}

/**
 * Run repair pass on all seeds in the staging queue.
 * Replaces each repaired seed with a new file (new hash) and removes the old file.
 * Option dryRun: only report what would be done, do not write or delete.
 */
export function runRepairPass(
  pendingDir: string,
  options?: { dryRun?: boolean }
): RepairPassResult {
  const dryRun = options?.dryRun === true;
  const result: RepairPassResult = { repaired: 0, skipped: 0, errors: [] };

  let records = loadQueue(pendingDir);
  const seeds = records.filter((r) => r.artifact?.identity?.is_seed === true);
  if (seeds.length === 0) {
    return result;
  }

  for (const record of seeds) {
    const artifact = record.artifact;
    const domain = artifact.semantic?.domain ?? "";

    let repairedArtifact = repairKB(artifact);
    repairedArtifact = repairSeedArtifact(repairedArtifact);
    repairedArtifact = normalizeSuperSeed(repairedArtifact);
    repairedArtifact = expandProcedure(repairedArtifact);
    const consistency = validateStepInterfaceConsistency(repairedArtifact);
    if (!consistency.valid) {
      result.skipped += 1;
      result.errors.push(`[${record.kbHash.slice(0, 10)}…] interface/step mismatch: ${consistency.errors.join("; ")}`);
      continue;
    }
    const validation = validateArtifact(repairedArtifact);
    if (!validation.valid) {
      result.skipped += 1;
      result.errors.push(`[${record.kbHash.slice(0, 10)}…] schema invalid: ${validation.errors.join("; ")}`);
      continue;
    }

    const otherRecords = records.filter((r) => r.kbHash !== record.kbHash);
    const dedupSet = new Set(otherRecords.map((r) => r.kbHash));
    const fpSet = new Set<string>();
    for (const r of otherRecords) {
      const fp = contentFingerprint(r.artifact);
      if (fp) fpSet.add(fp);
    }

    let newRecord: QueueRecord;
    try {
      newRecord = buildRecord(repairedArtifact, dedupSet, fpSet);
    } catch (e) {
      result.skipped += 1;
      result.errors.push(`[${record.kbHash.slice(0, 10)}…] ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    if (newRecord.kbHash === record.kbHash) {
      continue;
    }

    if (!dryRun) {
      const oldPath = join(pendingDir, `${record.kbHash}.json`);
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch (e) {
          result.errors.push(`[${record.kbHash}] failed to remove old file: ${e instanceof Error ? e.message : String(e)}`);
          continue;
        }
      }
      writeRecord(pendingDir, newRecord);
      records = records.map((r) => (r.kbHash === record.kbHash ? newRecord : r));
    }

    result.repaired += 1;
  }

  // ── Derived KB dimension repair ────────────────────────────────────────────
  // Apply repairKBv24Dimensions to derived KBs (is_seed === false).
  // This repairs step actions, failure_conditions, and success_conditions
  // to satisfy the same depth/executability/epistemicHonesty thresholds.
  const derived = records.filter((r) => r.artifact?.identity?.is_seed === false);

  for (const record of derived) {
    const repairedArtifact = repairKBv24Dimensions(record.artifact);

    const otherRecords = records.filter((r) => r.kbHash !== record.kbHash);
    const dedupSet = new Set(otherRecords.map((r) => r.kbHash));
    const fpSet = new Set<string>();
    for (const r of otherRecords) {
      const fp = contentFingerprint(r.artifact);
      if (fp) fpSet.add(fp);
    }

    let newRecord: QueueRecord;
    try {
      newRecord = buildRecord(repairedArtifact, dedupSet, fpSet);
    } catch (e) {
      result.errors.push(
        `[derived:${record.kbHash.slice(0, 10)}…] ${e instanceof Error ? e.message : String(e)}`
      );
      continue;
    }

    if (newRecord.kbHash === record.kbHash) continue;

    if (!dryRun) {
      const oldPath = join(pendingDir, `${record.kbHash}.json`);
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch (e) {
          result.errors.push(
            `[derived:${record.kbHash}] failed to remove old file: ${e instanceof Error ? e.message : String(e)}`
          );
          continue;
        }
      }
      writeRecord(pendingDir, newRecord);
      records = records.map((r) => (r.kbHash === record.kbHash ? newRecord : r));
    }

    result.repaired += 1;
  }

  return result;
}
