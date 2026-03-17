/**
 * Seed upgrade pipeline: staging/pending → AI normalization → validation → repair → three-tier gate.
 * Outputs: refined (publishable), marginal (repair queue), failed (regenerate).
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { QueueRecord } from "../core/builder.js";
import { transformSeedToUpgraded } from "./transform-seed-to-upgraded.js";
import { validateUpgradedEntry, repairUpgradedEntry, type UpgradedKBEntry } from "../upgraded-kb-entry.js";
import { scoreDimensions, type DimensionScores } from "./score-and-repair-pipeline.js";
import { QUALITY_CONFIG, MARGINAL_RESCORE_MAX } from "../core/quality-config.js";
import { repairDimensions } from "../repair/dimension-repair.js";

const DEFAULT_CONCURRENCY = 5;
const DEFAULT_BATCH_SIZE = 500;

/**
 * Build seed text from a staged QueueRecord for the AI prompt.
 * Uses title, claim, summary, and optionally step actions.
 */
export function extractSeedText(record: QueueRecord): string {
  const a = record.artifact;
  const title = (a?.identity?.title ?? "").trim();
  const claim = (a?.claim?.statement ?? "").trim();
  const summary = (a?.semantic?.summary ?? "").trim();
  const domain = (a?.semantic?.domain ?? "").trim();
  const steps = a?.payload?.inline_artifact?.steps;
  const stepLines =
    Array.isArray(steps) && steps.length > 0
      ? steps
          .slice(0, 6)
          .map((s) => (typeof s === "object" && s && "action" in s ? (s as { action: string }).action : String(s)))
          .filter(Boolean)
      : [];
  const parts: string[] = [];
  if (title) parts.push("Title: " + title);
  if (domain) parts.push("Domain: " + domain);
  if (claim) parts.push("Claim: " + claim);
  if (summary) parts.push("Summary: " + summary);
  if (stepLines.length > 0) parts.push("Current steps: " + stepLines.join("; "));
  return parts.length > 0 ? parts.join("\n") : record.kbHash;
}

export interface UpgradeSeedsOptions {
  pendingDir: string;
  refinedDir: string;
  /** Dir for marginal artifacts (repair queue). Default: staging/marginal. */
  marginalDir?: string;
  /** Dir for failed artifacts (regenerate). Default: staging/failed. */
  failedDir?: string;
  /** Max number of seeds to process (default: all). */
  count?: number;
  /** Concurrency limit for API calls (default 5). */
  concurrency?: number;
  /** Model for upgrade (default from env OPENAI_UPGRADE_MODEL or gpt-4o). */
  model?: string;
  /** If true, do not write files; only run transform and validate. */
  dryRun?: boolean;
}

export interface UpgradeSeedsResult {
  upgraded: number;
  failed: number;
  marginal: number;
  skipped: number;
  /** Total processed (upgraded + failed + marginal + skipped). */
  total: number;
  errors: { kbHash: string; error: string }[];
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writeWithQuality(
  dir: string,
  kbHash: string,
  entry: UpgradedKBEntry,
  scores: DimensionScores,
  domain?: string,
  repairAttempts?: number
): void {
  const recordToWrite = {
    ...entry,
    ...(domain != null && domain !== "" ? { domain } : {}),
    _quality: {
      score: scores.weighted,
      classification: scores.classification,
      dimensions: {
        executability: scores.executability,
        atomicity: scores.atomicity,
        epistemicHonesty: scores.epistemicHonesty,
        depth: scores.depth,
      },
      failureReasons: scores.failureReasons,
      repairAttempts: repairAttempts ?? 0,
      scoredAt: new Date().toISOString(),
    },
  };
  writeFileSync(join(dir, `${kbHash}.json`), JSON.stringify(recordToWrite, null, 2), "utf-8");
}

/**
 * Run the upgrade pipeline: load from pendingDir, transform each seed via AI, validate, repair, three-tier gate.
 */
export async function runUpgradeSeedsPipeline(options: UpgradeSeedsOptions): Promise<UpgradeSeedsResult> {
  const stagingRoot = join(options.refinedDir, "..");
  const {
    pendingDir,
    refinedDir,
    marginalDir = join(stagingRoot, "marginal"),
    failedDir = join(stagingRoot, "failed"),
    count = Infinity,
    concurrency = DEFAULT_CONCURRENCY,
    model,
    dryRun = false,
  } = options;

  const files = readdirSync(pendingDir).filter((f) => f.endsWith(".json"));
  const toProcess = files.slice(0, count);
  const result: UpgradeSeedsResult = { upgraded: 0, failed: 0, marginal: 0, skipped: 0, total: toProcess.length, errors: [] };

  if (!dryRun) {
    ensureDir(refinedDir);
    ensureDir(marginalDir);
    ensureDir(failedDir);
  }

  async function processOne(file: string): Promise<"upgraded" | "failed" | "marginal"> {
    const filePath = join(pendingDir, file);
    let record: QueueRecord;
    try {
      record = JSON.parse(readFileSync(filePath, "utf-8")) as QueueRecord;
    } catch {
      result.errors.push({ kbHash: file.replace(/\.json$/, ""), error: "Invalid JSON" });
      return "failed";
    }

    const seedText = extractSeedText(record);
    if (!seedText || seedText === record.kbHash) {
      result.skipped += 1;
      return "upgraded"; // count as skip, not fail
    }

    try {
      const upgraded = await transformSeedToUpgraded(seedText, { model });
      const validation = validateUpgradedEntry(upgraded);
      let entry: UpgradedKBEntry = upgraded;
      if (!validation.valid) {
        entry = repairUpgradedEntry(upgraded);
        const recheck = validateUpgradedEntry(entry);
        if (!recheck.valid) {
          result.errors.push({ kbHash: record.kbHash, error: recheck.errors.join("; ") });
          return "failed";
        }
      } else {
        entry = repairUpgradedEntry(upgraded); // still apply truncation etc.
      }

      // Apply dimension repairs: ensure steps are mechanism-rich, failure modes have causal language,
      // and verification items have measurable formulas.
      const domain = (record.artifact?.semantic?.domain as string | undefined) ?? "";
      entry = repairDimensions(entry, domain);

      // Score dimensions with re-score loop: if marginal after first repair, attempt up to
      // MARGINAL_RESCORE_MAX additional repair+rescore passes before filing to marginal bin.
      let scores = scoreDimensions(entry, domain);
      let repairAttempts = 0;
      while (scores.classification === "marginal" && repairAttempts < MARGINAL_RESCORE_MAX) {
        entry = repairDimensions(entry, domain);
        scores = scoreDimensions(entry, domain);
        repairAttempts++;
      }

      const label = `${scores.weighted}/3.0 (${scores.classification})${repairAttempts > 0 ? ` after ${repairAttempts} repair(s)` : ""}`;
      console.log(
        `upgrade-seeds: ${record.kbHash.slice(0, 12)}…  score=${label}${
          scores.failureReasons.length ? `  issues=${scores.failureReasons.join(" | ")}` : ""
        }`
      );

      const hardBlock = QUALITY_CONFIG.gateThresholds.hardBlock;

      // Hard block — write to staging/failed/
      if (scores.classification === "reject" || scores.weighted < hardBlock) {
        result.errors.push({
          kbHash: record.kbHash,
          error: `UPGRADE_GATE: classification=${scores.classification}, score=${scores.weighted}`,
        });
        if (!dryRun) writeWithQuality(failedDir, record.kbHash, entry, scores, record.domain, repairAttempts);
        return "failed";
      }

      // Soft block — write to staging/marginal/ for repair queue
      if (scores.classification === "marginal") {
        if (!dryRun) writeWithQuality(marginalDir, record.kbHash, entry, scores, record.domain, repairAttempts);
        return "marginal";
      }

      // standard and anchor only → staging/refined
      if (!dryRun) writeWithQuality(refinedDir, record.kbHash, entry, scores, record.domain, repairAttempts);
      result.upgraded += 1;
      return "upgraded";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ kbHash: record.kbHash, error: msg });
      return "failed";
    }
  }

  // Process in chunks of `concurrency`
  for (let i = 0; i < toProcess.length; i += concurrency) {
    const chunk = toProcess.slice(i, i + concurrency);
    const outcomes = await Promise.all(chunk.map((f) => processOne(f)));
    result.failed += outcomes.filter((o) => o === "failed").length;
    result.marginal += outcomes.filter((o) => o === "marginal").length;
  }

  return result;
}
