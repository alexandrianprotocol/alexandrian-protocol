/**
 * Bulk dimension repair for staging/refined seeds.
 *
 * Applies dimension-level repairs to all UpgradedKBEntry files in staging/refined/:
 *   - Reasoning Depth:  append mechanism clauses to short steps; add causal language to failure modes
 *   - Actionability:    ensure steps contain concrete mechanisms (thresholds, operators, tool refs)
 *   - Specificity:      add formula/threshold to verification items
 *
 * Usage:
 *   node dist/scripts/repair-refined-dimensions.js [--dry-run] [--limit N]
 *
 * Options:
 *   --dry-run   Report changes without writing files
 *   --limit N   Process only first N files (for testing)
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { repairDimensions } from "../lib/repair/dimension-repair.js";
import { scoreDimensions } from "../lib/pipeline/score-and-repair-pipeline.js";
import type { UpgradedKBEntry } from "../lib/upgraded-kb-entry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STAGING_DIR = resolve(__dirname, "../../staging");

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs(): { dryRun: boolean; limit: number; dir: string } {
  const args = process.argv.slice(2);
  let dryRun = false;
  let limit = Infinity;
  let dir = "refined"; // default to staging/refined
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[++i], 10);
    else if (args[i].startsWith("--limit=")) limit = parseInt(args[i].split("=")[1], 10);
    else if (args[i] === "--dir" && args[i + 1]) dir = args[++i];
    else if (args[i].startsWith("--dir=")) dir = args[i].split("=").slice(1).join("=");
  }
  return { dryRun, limit, dir };
}

// ── Score formatting helper ───────────────────────────────────────────────────

function fmtScore(s: ReturnType<typeof scoreDimensions>): string {
  return (
    `${s.weighted.toFixed(2)}/3.0 (${s.classification}) ` +
    `exec=${s.executability} depth=${s.depth} honesty=${s.epistemicHonesty} atom=${s.atomicity}`
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { dryRun, limit, dir } = parseArgs();
  const TARGET_DIR = resolve(STAGING_DIR, dir);

  const files = readdirSync(TARGET_DIR)
    .filter((f) => f.endsWith(".json") && f !== ".gitkeep")
    .slice(0, isFinite(limit) ? limit : undefined);

  console.log(`\nAlexandrian — Dimension Repair for staging/${dir}/`);
  console.log(`  dir      : ${TARGET_DIR}`);
  console.log(`  files    : ${files.length}`);
  console.log(`  dry-run  : ${dryRun}`);
  console.log();

  // Aggregate stats
  let repaired = 0;
  let rescored = 0;
  let alreadyGood = 0;
  let errors = 0;

  // Score distribution tracking
  const beforeDepth: number[] = [];
  const afterDepth: number[] = [];
  const beforeExec: number[] = [];
  const afterExec: number[] = [];
  const beforeHonesty: number[] = [];
  const afterHonesty: number[] = [];
  const beforeWeighted: number[] = [];
  const afterWeighted: number[] = [];

  for (const file of files) {
    const filePath = join(TARGET_DIR, file);
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>;
    } catch {
      console.error(`  [error] ${file}: invalid JSON`);
      errors++;
      continue;
    }

    // Extract as UpgradedKBEntry (the refined files store this format + optional _quality + domain).
    const entry: UpgradedKBEntry = {
      title: String(raw.title ?? ""),
      summary: String(raw.summary ?? ""),
      standard: String(raw.standard ?? ""),
      procedure: Array.isArray(raw.procedure) ? raw.procedure.map(String) : [],
      references: Array.isArray(raw.references) ? raw.references.map(String) : [],
      failure_modes: Array.isArray(raw.failure_modes) ? raw.failure_modes.map(String) : [],
      verification: Array.isArray(raw.verification) ? raw.verification.map(String) : [],
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    };

    const domain = typeof raw.domain === "string" ? raw.domain : undefined;

    // Score before repair.
    const before = scoreDimensions(entry);
    beforeDepth.push(before.depth);
    beforeExec.push(before.executability);
    beforeHonesty.push(before.epistemicHonesty);
    beforeWeighted.push(before.weighted);

    // Apply repairs.
    const repaired_entry = repairDimensions(entry, domain);
    const after = scoreDimensions(repaired_entry);
    afterDepth.push(after.depth);
    afterExec.push(after.executability);
    afterHonesty.push(after.epistemicHonesty);
    afterWeighted.push(after.weighted);

    const improved =
      after.depth > before.depth ||
      after.executability > before.executability ||
      after.epistemicHonesty > before.epistemicHonesty ||
      after.atomicity > before.atomicity;
    const contentChanged =
      repaired_entry.title !== entry.title ||
      repaired_entry.summary !== entry.summary ||
      JSON.stringify(repaired_entry.procedure) !== JSON.stringify(entry.procedure) ||
      JSON.stringify(repaired_entry.failure_modes) !== JSON.stringify(entry.failure_modes) ||
      JSON.stringify(repaired_entry.verification) !== JSON.stringify(entry.verification) ||
      JSON.stringify(repaired_entry.tags) !== JSON.stringify(entry.tags);

    const existingQuality = raw._quality as
      | {
          score?: unknown;
          classification?: unknown;
          dimensions?: {
            executability?: unknown;
            atomicity?: unknown;
            epistemicHonesty?: unknown;
            depth?: unknown;
          };
        }
      | undefined;

    const qualityChanged =
      existingQuality?.score !== after.weighted ||
      existingQuality?.classification !== after.classification ||
      existingQuality?.dimensions?.executability !== after.executability ||
      existingQuality?.dimensions?.atomicity !== after.atomicity ||
      existingQuality?.dimensions?.epistemicHonesty !== after.epistemicHonesty ||
      existingQuality?.dimensions?.depth !== after.depth;

    if (improved || qualityChanged || contentChanged) {
      if (improved || contentChanged) repaired++;
      else rescored++;

      if (!dryRun) {
        // Preserve original fields, overwrite repaired fields when needed, and always refresh _quality.
        const out = {
          ...raw,
          title: repaired_entry.title,
          summary: repaired_entry.summary,
          procedure: repaired_entry.procedure,
          failure_modes: repaired_entry.failure_modes,
          verification: repaired_entry.verification,
          tags: repaired_entry.tags,
          _quality: {
            score: after.weighted,
            classification: after.classification,
            dimensions: {
              executability: after.executability,
              atomicity: after.atomicity,
              epistemicHonesty: after.epistemicHonesty,
              depth: after.depth,
            },
            failureReasons: after.failureReasons,
            scoredAt: new Date().toISOString(),
            repairedAt: improved
              ? new Date().toISOString()
              : (raw._quality as { repairedAt?: string } | undefined)?.repairedAt,
          },
        };
        writeFileSync(filePath, JSON.stringify(out, null, 2), "utf-8");
      }

      // Verbose: only print seeds that improved
      const shortHash = file.replace(/\.json$/, "").slice(0, 14);
      if (improved) {
        console.log(
          `  [repaired] ${shortHash}… BEFORE: ${fmtScore(before)}\n` +
          `             AFTER : ${fmtScore(after)}`
        );
      } else if (contentChanged) {
        console.log(
          `  [retouched] ${shortHash}… BEFORE: ${fmtScore(before)}\n` +
          `             AFTER : ${fmtScore(after)}`
        );
      } else if (qualityChanged) {
        console.log(
          `  [rescored] ${shortHash}… BEFORE: ${fmtScore(before)}\n` +
          `             AFTER : ${fmtScore(after)}`
        );
      }
    } else {
      alreadyGood++;
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  console.log(`\n${"─".repeat(60)}`);
  console.log(`  Total files processed : ${files.length}`);
  console.log(`  Repaired              : ${repaired}`);
  console.log(`  Rescored metadata     : ${rescored}`);
  console.log(`  Already good          : ${alreadyGood}`);
  console.log(`  Errors                : ${errors}`);
  if (dryRun) console.log(`  [DRY RUN — no files written]`);
  console.log();
  console.log(`  Dimension averages (before → after):`);
  console.log(`    Depth        : ${avg(beforeDepth).toFixed(2)} → ${avg(afterDepth).toFixed(2)}`);
  console.log(`    Executability: ${avg(beforeExec).toFixed(2)} → ${avg(afterExec).toFixed(2)}`);
  console.log(`    Epistemic    : ${avg(beforeHonesty).toFixed(2)} → ${avg(afterHonesty).toFixed(2)}`);
  console.log(`    Weighted     : ${avg(beforeWeighted).toFixed(2)} → ${avg(afterWeighted).toFixed(2)}`);
  console.log(`${"─".repeat(60)}\n`);

  // Warn if any targeted dimension misses the threshold.
  const depthAvg = avg(afterDepth);
  const execAvg = avg(afterExec);
  const honestyAvg = avg(afterHonesty);
  const belowTarget: string[] = [];

  if (depthAvg < 2.8) belowTarget.push(`depth=${depthAvg.toFixed(2)}`);
  if (execAvg < 2.8) belowTarget.push(`executability=${execAvg.toFixed(2)}`);
  if (honestyAvg < 2.8) belowTarget.push(`epistemic=${honestyAvg.toFixed(2)}`);

  if (belowTarget.length > 0) {
    console.warn(`  WARNING: target 2.8+ not reached on all targeted dimensions.`);
    console.warn(`    ${belowTarget.join(", ")}`);
  } else {
    console.log(`  ✓ All targeted dimensions at 2.8+`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
