#!/usr/bin/env node
/**
 * M2 Benchmark Runner — Alexandrian SDK
 *
 * Validates retrieval quality against the 3 signature queries that define
 * "M2 works." Each case has explicit pass/fail criteria.
 *
 * Run:
 *   pnpm --filter @alexandrian/sdk-adapters exec tsx scripts/benchmark.ts
 *   pnpm --filter @alexandrian/sdk-adapters exec tsx scripts/benchmark.ts --verbose
 *
 * Exit code:
 *   0 — all benchmarks pass
 *   1 — one or more benchmarks fail
 */

import { alexandrian } from "../lib/alexandrian.js";
import type { EnhancedQuery, EnhanceDebugInfo } from "../lib/enhanceQuery.js";

// ── ANSI colours (no deps) ────────────────────────────────────────────────────
const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  green:  "\x1b[32m",
  red:    "\x1b[31m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  dim:    "\x1b[2m",
};
const pass  = `${C.green}${C.bold}PASS${C.reset}`;
const fail  = `${C.red}${C.bold}FAIL${C.reset}`;
const warn  = `${C.yellow}WARN${C.reset}`;
const tick  = `${C.green}✓${C.reset}`;
const cross = `${C.red}✗${C.reset}`;

// ── Benchmark cases ───────────────────────────────────────────────────────────

interface BenchmarkCase {
  /** The query passed to alexandrian.enhance(). */
  query: string;
  /** At least one KB of each listed type must appear in kbsUsed. */
  requiredTypes: string[];
  /** At least one KB must be from one of these domains. */
  requiredDomains: string[];
  /** Minimum number of KBs that must be selected. */
  minKBs: number;
  /** Subgraph must return at least this many candidates before slicing. */
  minSubgraphHits: number;
  /** avgReputationScore must be >= this. 0 = disabled. */
  minAvgReputation: number;
}

const BENCHMARKS: BenchmarkCase[] = [
  {
    query:            "implement rate limiting express redis",
    requiredTypes:    ["Practice"],
    requiredDomains:  ["engineering.ops", "engineering.api.security", "engineering.api.implementation"],
    minKBs:           2,
    minSubgraphHits:  2,
    minAvgReputation: 0,
  },
  {
    query:            "design multi tenant postgres schema",
    requiredTypes:    ["Practice"],
    requiredDomains:  ["engineering.data", "engineering.api.design", "engineering.api.implementation"],
    minKBs:           2,
    minSubgraphHits:  2,
    minAvgReputation: 0,
  },
  {
    query:            "setup ci cd github actions docker",
    requiredTypes:    ["Practice"],
    requiredDomains:  ["engineering.ops", "engineering.api.implementation"],
    minKBs:           2,
    minSubgraphHits:  2,
    minAvgReputation: 0,
  },
];

// ── Validation logic ──────────────────────────────────────────────────────────

interface CheckResult {
  label:   string;
  ok:      boolean;
  detail?: string;
}

interface BenchmarkResult {
  query:    string;
  passed:   boolean;
  result:   EnhancedQuery;
  checks:   CheckResult[];
  durationMs: number;
}

function runChecks(result: EnhancedQuery, bench: BenchmarkCase): CheckResult[] {
  const checks: CheckResult[] = [];
  const debug = result.debug as EnhanceDebugInfo | undefined;
  const types = new Set(result.kbsUsed.map((kb) => kb.kbType));
  const domains = new Set(result.kbsUsed.map((kb) => kb.domain));

  // 1. KB count
  checks.push({
    label:  `kbsUsed >= ${bench.minKBs}`,
    ok:     result.kbsUsed.length >= bench.minKBs,
    detail: `got ${result.kbsUsed.length}`,
  });

  // 2. Subgraph hit count
  checks.push({
    label:  `kbsFound >= ${bench.minSubgraphHits}`,
    ok:     result.kbsFound >= bench.minSubgraphHits,
    detail: `got ${result.kbsFound}`,
  });

  // 3. Required types present
  for (const t of bench.requiredTypes) {
    checks.push({
      label:  `type ${t} present`,
      ok:     types.has(t),
      detail: types.has(t) ? undefined : `got [${[...types].join(", ")}]`,
    });
  }

  // 4. Required domain coverage
  const domainOk = bench.requiredDomains.some((d) =>
    [...domains].some((actual) => actual.startsWith(d))
  );
  checks.push({
    label:  `domain in [${bench.requiredDomains.join(" | ")}]`,
    ok:     domainOk,
    detail: domainOk ? undefined : `got [${[...domains].join(", ")}]`,
  });

  // 5. Not using fallback
  checks.push({
    label:  "usedFallback = false",
    ok:     !result.lowConfidence,
    detail: result.lowConfidence
      ? `avgRep=${result.avgReputationScore}, kbsFound=${result.kbsFound}`
      : undefined,
  });

  // 6. Score spread (top score must be > second by at least 5 points)
  if (debug && debug.scores.length >= 2) {
    const sorted = [...debug.scores].sort((a, b) => b.finalScore - a.finalScore);
    const spread = sorted[0]!.finalScore - sorted[1]!.finalScore;
    checks.push({
      label:  "score spread >= 5",
      ok:     spread >= 5,
      detail: `spread = ${spread} (top: ${sorted[0]!.finalScore}, 2nd: ${sorted[1]!.finalScore})`,
    });
  } else {
    checks.push({
      label:  "score spread (n/a — need debug:true or >= 2 KBs)",
      ok:     true,
    });
  }

  // 7. No subgraph errors in warnings
  const subgraphErr = result.warnings.some((w) =>
    w.toLowerCase().includes("subgraph unavailable")
  );
  checks.push({
    label:  "subgraph reachable",
    ok:     !subgraphErr,
    detail: subgraphErr ? result.warnings.find((w) => w.includes("subgraph")) : undefined,
  });

  return checks;
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function runBenchmark(
  bench: BenchmarkCase,
  verbose: boolean,
): Promise<BenchmarkResult> {
  const t0 = Date.now();
  const result = await alexandrian.enhance(bench.query, { debug: true });
  const durationMs = Date.now() - t0;

  const checks = runChecks(result, bench);
  const passed  = checks.every((c) => c.ok);

  return { query: bench.query, passed, result, checks, durationMs };
}

function printResult(r: BenchmarkResult, verbose: boolean, index: number): void {
  const status = r.passed ? pass : fail;
  const dur    = `${C.dim}${r.durationMs}ms${C.reset}`;
  console.log(`\n${C.bold}[${index + 1}] ${r.query}${C.reset}  ${status}  ${dur}`);

  for (const check of r.checks) {
    const icon   = check.ok ? tick : cross;
    const detail = check.detail ? ` ${C.dim}(${check.detail})${C.reset}` : "";
    console.log(`    ${icon} ${check.label}${detail}`);
  }

  if (verbose || !r.passed) {
    const debug = r.result.debug as EnhanceDebugInfo | undefined;
    console.log(`\n  ${C.cyan}Debug:${C.reset}`);
    console.log(`    kbsFound=${r.result.kbsFound}  avgRep=${r.result.avgReputationScore}  lowConfidence=${r.result.lowConfidence}`);

    if (debug) {
      console.log(`    subgraphHits=${debug.subgraphHits}  afterTypeFilter=${debug.afterTypeFilter}`);
      console.log(`    domainsQueried=${JSON.stringify(debug.domainsQueried)}`);
    }

    if (r.result.kbsUsed.length > 0) {
      console.log(`\n  ${C.cyan}Selected KBs:${C.reset}`);
      for (const [i, kb] of r.result.kbsUsed.entries()) {
        const score = debug?.scores.find((s) => s.contentHash === kb.contentHash);
        const scoreStr = score
          ? ` rep=${score.reputationScore}+${score.boost}=${score.finalScore}`
          : "";
        console.log(`    KB-${i + 1}  [${kb.kbType}]  ${kb.domain}${scoreStr}`);
        if (kb.title !== kb.domain) console.log(`           "${kb.title}"`);
      }
    }

    if (r.result.warnings.length > 0) {
      console.log(`\n  ${C.yellow}Warnings:${C.reset}`);
      for (const w of r.result.warnings) {
        console.log(`    ${warn} ${w}`);
      }
    }

    // Diagnosis table for failures
    if (!r.passed) {
      const failedChecks = r.checks.filter((c) => !c.ok);
      console.log(`\n  ${C.red}${C.bold}Failures:${C.reset}`);
      for (const c of failedChecks) {
        console.log(`    ${cross} ${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
      }

      console.log(`\n  ${C.yellow}Diagnosis:${C.reset}`);
      if (r.result.kbsFound === 0) {
        console.log(`    → kbsFound=0: seed problem — no KBs published for these domains yet.`);
        console.log(`      Fix: setMinStake(0), then publish seeds for [${r.result.debug ? (r.result.debug as EnhanceDebugInfo).domainsQueried?.join(", ") ?? "unknown" : "unknown"}]`);
      } else if (failedChecks.some((c) => c.label.includes("type"))) {
        const missingTypes = r.checks
          .filter((c) => c.label.startsWith("type") && !c.ok)
          .map((c) => c.label.replace("type ", "").replace(" present", ""));
        console.log(`    → Missing types: [${missingTypes.join(", ")}] — publish seeds of these types.`);
      } else if (failedChecks.some((c) => c.label.includes("domain"))) {
        console.log(`    → Domain miss — check inferDomains("${r.query}") output.`);
        console.log(`      Expected one of: [${r.result.debug ? (r.result.debug as EnhanceDebugInfo).domainsQueried?.join(", ") ?? "inferred" : "inferred"}]`);
      } else if (failedChecks.some((c) => c.label.includes("spread"))) {
        console.log(`    → Flat score spread — ranking is not differentiating. Increase TYPE_SELECTION_BOOST`);
        console.log(`      or publish more type-diverse seeds.`);
      }
    }
  }
}

// ── Snapshot comparison ───────────────────────────────────────────────────────

function printSnapshot(results: BenchmarkResult[]): void {
  console.log(`\n${C.bold}${"─".repeat(60)}${C.reset}`);
  console.log(`${C.bold}Snapshot (store and compare across runs)${C.reset}`);
  console.log(`${"─".repeat(60)}`);

  for (const r of results) {
    const types   = r.result.kbsUsed.map((kb) => kb.kbType).sort();
    const domains = [...new Set(r.result.kbsUsed.map((kb) => kb.domain))].sort();
    console.log(`\n  "${r.query}"`);
    console.log(`    kbsFound=${r.result.kbsFound}  selected=${r.result.kbsUsed.length}  avgRep=${r.result.avgReputationScore}`);
    console.log(`    types=[${types.join(", ")}]`);
    console.log(`    domains=[${domains.join(", ")}]`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const verbose = process.argv.includes("--verbose") || process.argv.includes("-v");

  console.log(`\n${C.bold}Alexandrian M2 Benchmark${C.reset}  ${C.dim}${new Date().toISOString()}${C.reset}`);
  console.log(`${C.dim}${BENCHMARKS.length} queries · ${verbose ? "verbose" : "compact"} mode · use --verbose for full debug output${C.reset}`);
  console.log("─".repeat(60));

  const results: BenchmarkResult[] = [];

  for (const [i, bench] of BENCHMARKS.entries()) {
    try {
      const r = await runBenchmark(bench, verbose);
      results.push(r);
      printResult(r, verbose, i);
    } catch (err) {
      const errMsg = (err as Error).message;
      console.log(`\n${C.bold}[${i + 1}] ${bench.query}${C.reset}  ${fail}`);
      console.log(`    ${cross} threw: ${errMsg}`);
      results.push({
        query:      bench.query,
        passed:     false,
        result:     { enrichedPrompt: "", kbsUsed: [], settlementPreview: {} as never, fromCache: false, warnings: [errMsg], kbsFound: 0, avgReputationScore: 0, lowConfidence: true },
        checks:     [{ label: "no exception", ok: false, detail: errMsg }],
        durationMs: 0,
      });
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed).length;
  const total  = results.length;
  const allPass = passed === total;

  console.log(`\n${"═".repeat(60)}`);
  console.log(`${C.bold}RESULT  ${allPass ? pass : fail}  ${passed}/${total} benchmarks passed${C.reset}`);

  if (allPass) {
    console.log(`\n${C.green}${C.bold}M2 retrieval is ready.${C.reset}`);
    console.log(`${C.dim}All 3 signature queries return structured, typed KBs without fallback.${C.reset}`);
  } else {
    const failing = results.filter((r) => !r.passed);
    console.log(`\n${C.red}${C.bold}Not ready.${C.reset} Fix failing queries before M2 launch:`);
    for (const r of failing) {
      console.log(`  ${cross} "${r.query}"`);
    }
    console.log(`\n${C.yellow}Primary fix path:${C.reset}`);
    console.log(`  1. Call setMinStake(0) on the registry contract`);
    console.log(`  2. Run: pnpm --filter @alexandrian/generator run generate:1k-ai`);
    console.log(`  3. Re-run this benchmark: pnpm --filter @alexandrian/sdk-adapters exec tsx scripts/benchmark.ts`);
  }

  if (verbose) {
    printSnapshot(results);
  }

  console.log("");
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error("Benchmark runner crashed:", err);
  process.exit(2);
});
