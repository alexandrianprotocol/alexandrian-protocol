import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

interface QualityMeta {
  score: number;
  classification: "anchor" | "standard" | "marginal" | "reject";
  failureReasons: string[];
  repairAttempts?: number;
}

export interface GradeReportOptions {
  refined: string;
  marginal: string;
  failed: string;
  /** Optional directory to persist time-series report snapshots as JSON. */
  reportsDir?: string;
}

interface BucketData {
  count: number;
  anchor: number;
  standard: number;
  domainScores: Record<string, number[]>;
  failureReasons: string[];
}

interface ReportSnapshot {
  timestamp: string;
  total: number;
  pctRefined: number;
  pctMarginal: number;
  pctFailed: number;
  goNoGo: "proceed" | "tune" | "do-not-scale";
  anchorCount: number;
  standardCount: number;
  domainBreakdown: Record<string, { refined: number; marginal: number; failed: number; avgScore: number }>;
}

function loadBucket(dir: string): BucketData {
  let anchor = 0;
  let standard = 0;
  const domainScores: Record<string, number[]> = {};
  const failureReasons: string[] = [];

  if (!existsSync(dir)) return { count: 0, anchor: 0, standard: 0, domainScores, failureReasons };

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), "utf-8");
      const parsed = JSON.parse(raw) as { _quality?: QualityMeta; domain?: string };
      const quality = parsed._quality;
      if (!quality) continue;

      if (quality.classification === "anchor") anchor++;
      else if (quality.classification === "standard") standard++;

      const domain = parsed.domain ?? "unknown";
      if (!domainScores[domain]) domainScores[domain] = [];
      domainScores[domain].push(quality.score);

      for (const r of quality.failureReasons ?? []) failureReasons.push(String(r));
    } catch {
      /* skip invalid files */
    }
  }

  return { count: files.length, anchor, standard, domainScores, failureReasons };
}

/** Normalize failure reason to dimension key (e.g. "executability:low — ..." → "executability"). */
function reasonToDimension(reason: string): string {
  const key = reason.split(":")[0].trim();
  const map: Record<string, string> = {
    executability: "executability",
    atomicity: "atomicity",
    epistemic_honesty: "epistemicHonesty",
    depth: "depth",
    connectivity: "connectivity",
  };
  return map[key] ?? key;
}

/** Load the most recent grade-report snapshot from reportsDir (if any). */
function loadPreviousSnapshot(reportsDir: string): ReportSnapshot | null {
  if (!existsSync(reportsDir)) return null;
  const files = readdirSync(reportsDir)
    .filter((f) => f.startsWith("grade-report-") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  try {
    return JSON.parse(readFileSync(join(reportsDir, files[0]), "utf-8")) as ReportSnapshot;
  } catch {
    return null;
  }
}

/** Format a signed delta between two percentages (e.g. "+5.2% vs prev run"). */
function fmtDelta(now: number, prev: number): string {
  const diff = now - prev;
  if (Math.abs(diff) < 0.05) return "";
  const sign = diff > 0 ? "+" : "";
  return ` (${sign}${diff.toFixed(1)}% vs prev run)`;
}

export async function runGradeReport(options: GradeReportOptions): Promise<void> {
  const { refined, marginal, failed, reportsDir } = options;

  const refinedBucket = loadBucket(refined);
  const marginalBucket = loadBucket(marginal);
  const failedBucket = loadBucket(failed);

  const totalProcessed = refinedBucket.count + marginalBucket.count + failedBucket.count;
  const refinedTotal = refinedBucket.anchor + refinedBucket.standard;
  const pctRefined  = totalProcessed > 0 ? (refinedTotal / totalProcessed) * 100 : 0;
  const pctMarginal = totalProcessed > 0 ? (marginalBucket.count / totalProcessed) * 100 : 0;
  const pctFailed   = totalProcessed > 0 ? (failedBucket.count / totalProcessed) * 100 : 0;
  const pctAnchor   = totalProcessed > 0 ? (refinedBucket.anchor / totalProcessed) * 100 : 0;
  const pctStandard = totalProcessed > 0 ? (refinedBucket.standard / totalProcessed) * 100 : 0;

  // Load previous snapshot for time-series comparison
  const prev = reportsDir ? loadPreviousSnapshot(reportsDir) : null;

  // ── QUALITY DISTRIBUTION ─────────────────────────────────────────────────
  console.log("\nQUALITY DISTRIBUTION");
  const refinedDelta  = prev ? fmtDelta(pctRefined, prev.pctRefined) : "";
  const marginalDelta = prev ? fmtDelta(pctMarginal, prev.pctMarginal) : "";
  const failedDelta   = prev ? fmtDelta(pctFailed, prev.pctFailed) : "";

  console.log(`  staging/refined    anchor:   ${String(refinedBucket.anchor).padStart(3)} (${pctAnchor.toFixed(1)}%)`);
  console.log(`                     standard: ${String(refinedBucket.standard).padStart(3)} (${pctStandard.toFixed(1)}%)`);
  console.log(`                     TOTAL:    ${String(refinedTotal).padStart(3)} (${pctRefined.toFixed(1)}%)${refinedDelta}`);
  console.log(`  staging/marginal             ${String(marginalBucket.count).padStart(3)} (${pctMarginal.toFixed(1)}%)${marginalDelta}`);
  console.log(`  staging/failed               ${String(failedBucket.count).padStart(3)} (${pctFailed.toFixed(1)}%)${failedDelta}`);
  console.log(`  Total processed:  ${totalProcessed}`);

  // ── PER-DOMAIN BREAKDOWN ─────────────────────────────────────────────────
  const allDomains = new Set([
    ...Object.keys(refinedBucket.domainScores),
    ...Object.keys(marginalBucket.domainScores),
    ...Object.keys(failedBucket.domainScores),
  ]);

  const domainBreakdown: Record<string, { refined: number; marginal: number; failed: number; avgScore: number }> = {};
  for (const domain of allDomains) {
    const r = (refinedBucket.domainScores[domain] ?? []).length;
    const m = (marginalBucket.domainScores[domain] ?? []).length;
    const f = (failedBucket.domainScores[domain] ?? []).length;
    const allScores = [
      ...(refinedBucket.domainScores[domain] ?? []),
      ...(marginalBucket.domainScores[domain] ?? []),
      ...(failedBucket.domainScores[domain] ?? []),
    ];
    const avgScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    domainBreakdown[domain] = { refined: r, marginal: m, failed: f, avgScore };
  }

  // Sort by refined% ascending — weakest domains at top
  const domainRows = Object.entries(domainBreakdown)
    .map(([domain, stats]) => {
      const total = stats.refined + stats.marginal + stats.failed;
      const pctR = total > 0 ? (stats.refined / total) * 100 : 0;
      const pctM = total > 0 ? (stats.marginal / total) * 100 : 0;
      const pctF = total > 0 ? (stats.failed / total) * 100 : 0;
      return { domain, total, pctR, pctM, pctF, avgScore: stats.avgScore };
    })
    .sort((a, b) => a.pctR - b.pctR);

  console.log("\nPER-DOMAIN BREAKDOWN (weakest first)");
  console.log(
    `  ${"Domain".padEnd(38)} ${"Refined%".padStart(9)} ${"Marginal%".padStart(10)} ${"Failed%".padStart(8)} ${"AvgScore".padStart(9)} ${"n".padStart(5)}`
  );
  for (const { domain, total, pctR, pctM, pctF, avgScore } of domainRows.slice(0, 15)) {
    console.log(
      `  ${domain.padEnd(38)} ${(pctR.toFixed(0) + "%").padStart(9)} ${(pctM.toFixed(0) + "%").padStart(10)} ${(pctF.toFixed(0) + "%").padStart(8)} ${avgScore.toFixed(2).padStart(9)} ${String(total).padStart(5)}`
    );
  }

  // ── FAILURE REASON FREQUENCY ─────────────────────────────────────────────
  const allReasons = [
    ...marginalBucket.failureReasons,
    ...failedBucket.failureReasons,
  ];
  const frequency: Record<string, number> = {};
  for (const r of allReasons) {
    const key = reasonToDimension(r);
    frequency[key] = (frequency[key] ?? 0) + 1;
  }
  const totalReasons = allReasons.length;

  console.log("\nFAILURE REASON FREQUENCY");
  if (totalReasons === 0) {
    console.log("  No live failure reasons in staging/marginal or staging/failed.");
  } else {
    const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
    for (const [dim, count] of sorted) {
      const pct = ((count / totalReasons) * 100).toFixed(1);
      console.log(`  ${dim.padEnd(20)} ${String(count).padStart(3)}  (${pct}%)`);
    }
  }

  // ── GENERATOR PROMPT DIAGNOSIS ───────────────────────────────────────────
  console.log("\nGENERATOR PROMPT DIAGNOSIS");
  const execPct    = totalReasons > 0 ? (frequency.executability ?? 0) / totalReasons : 0;
  const depthPct   = totalReasons > 0 ? (frequency.depth ?? 0) / totalReasons : 0;
  const honestyPct = totalReasons > 0 ? (frequency.epistemicHonesty ?? 0) / totalReasons : 0;

  if (execPct > 0.4)    console.log("  executability > 40%: tighten verb specificity rules in system prompt");
  if (depthPct > 0.35)  console.log("  depth > 35%: add domain constraint requirement to system prompt");
  if (honestyPct > 0.25) console.log("  epistemicHonesty > 25%: add metric formula examples to system prompt");
  if (execPct <= 0.4 && depthPct <= 0.35 && honestyPct <= 0.25 && totalReasons > 0) {
    console.log("  Failure reason mix within typical bounds; tune prompts by weakest dimension above.");
  }
  if (totalReasons === 0) {
    console.log("  No live failure reasons remain outside staging/refined.");
  }

  // ── GO / NO-GO ───────────────────────────────────────────────────────────
  let goNoGo: ReportSnapshot["goNoGo"];
  console.log("\nONE NUMBER (go/no-go for scale)");
  console.log(`  % reached staging/refined: ${pctRefined.toFixed(1)}%${refinedDelta}`);
  if (pctRefined >= 65) {
    goNoGo = "proceed";
    console.log("  → proceed: generator is working well; run 10k.");
  } else if (pctRefined >= 50) {
    goNoGo = "tune";
    console.log("  → tune: fix the most common failure reason, then re-run.");
  } else {
    goNoGo = "do-not-scale";
    console.log("  → do-not-scale: significant prompt work needed first.");
  }

  if (prev) {
    console.log(
      `  Previous run (${prev.timestamp.slice(0, 10)}): ${prev.pctRefined.toFixed(1)}% refined → ${prev.goNoGo}` +
      ` | anchor ${prev.anchorCount} / standard ${prev.standardCount}`
    );
  }

  // ── PERSIST SNAPSHOT ─────────────────────────────────────────────────────
  if (reportsDir) {
    if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
    const snapshot: ReportSnapshot = {
      timestamp: new Date().toISOString(),
      total: totalProcessed,
      pctRefined,
      pctMarginal,
      pctFailed,
      goNoGo,
      anchorCount: refinedBucket.anchor,
      standardCount: refinedBucket.standard,
      domainBreakdown,
    };
    const filename = `grade-report-${snapshot.timestamp.replace(/[:.]/g, "-")}.json`;
    writeFileSync(join(reportsDir, filename), JSON.stringify(snapshot, null, 2), "utf-8");
    console.log(`\n  Snapshot saved → ${join(reportsDir, filename)}`);
  }
}
