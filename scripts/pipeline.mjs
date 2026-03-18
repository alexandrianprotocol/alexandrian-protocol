/**
 * pipeline.mjs — end-to-end KB generation and publish pipeline
 *
 * Chains: setMinStake(0) → generate → dedup → upgrade-seeds → publish → setMinStake(restore)
 *
 * Checkpointing: writes .pipeline-state.json after each phase; resume skips completed phases.
 * Status file:   writes staging/pipeline-status.json in real-time for monitoring.
 *
 * Usage:
 *   node scripts/pipeline.mjs                          # full run: seeds + upgrade + publish
 *   node scripts/pipeline.mjs --mode derived           # derived KBs instead of seeds
 *   node scripts/pipeline.mjs --mode ai-seeds          # AI-generated seeds (requires OPENAI_API_KEY)
 *   node scripts/pipeline.mjs --skip-generate          # upgrade-seeds + publish only (skip generate step)
 *   node scripts/pipeline.mjs --skip-upgrade           # generate + publish only (skip AI upgrade gate)
 *   node scripts/pipeline.mjs --dry-run                # simulate publish without sending txs
 *   node scripts/pipeline.mjs --count 500              # cap KB generation at 500
 *   node scripts/pipeline.mjs --concurrency 5          # parallel publish slots (default: 3)
 *   node scripts/pipeline.mjs --ai-concurrency 10      # parallel OpenAI calls for ai-seeds (default: 10)
 *   node scripts/pipeline.mjs --no-stake-ops           # skip setMinStake calls (useful if already 0)
 *   node scripts/pipeline.mjs --resume                 # resume from last checkpoint (skip done phases)
 *   node scripts/pipeline.mjs --reset                  # clear checkpoint and start fresh
 *
 * Required env vars:
 *   OWNER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY — publishing wallet
 *
 * Optional env vars:
 *   OPENAI_API_KEY   — required only for --mode ai-seeds or upgrade step
 *   PINATA_API_JWT   — real IPFS pinning (uses placeholders if absent)
 *   BASE_RPC_URL     — Base mainnet RPC (default: https://mainnet.base.org)
 */

import { spawnSync }                                         from "child_process";
import { createRequire }                                     from "module";
import { resolve, dirname, join }                            from "path";
import { fileURLToPath }                                     from "url";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";

const require    = createRequire(import.meta.url);
const { config } = require("dotenv");
const __dirname  = dirname(fileURLToPath(import.meta.url));
const root       = resolve(__dirname, "..");

config({ path: resolve(root, ".env") });

// ── Parse args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag  = (name) => args.includes(name);
const opt   = (name, def) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};

const mode          = opt("--mode", "seeds");
const count         = opt("--count", null);
const concurrency   = opt("--concurrency", "3");
const aiConcurrency = opt("--ai-concurrency", "10");
const skipGenerate  = flag("--skip-generate");
const skipUpgrade   = flag("--skip-upgrade");
const dryRun        = flag("--dry-run");
const noStakeOps    = flag("--no-stake-ops");
const resume        = flag("--resume");
const resetFlag     = flag("--reset");

// ── Paths ─────────────────────────────────────────────────────────────────────

const stagingDir   = join(root, "packages", "generator", "staging");
const statePath    = join(root, ".pipeline-state.json");
const statusPath   = join(stagingDir, "pipeline-status.json");

mkdirSync(stagingDir, { recursive: true });

// ── Checkpoint ────────────────────────────────────────────────────────────────

function loadState() {
  if (resetFlag) return null;
  if (!resume) return null;
  if (!existsSync(statePath)) return null;
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch { return null; }
}

function saveState(state) {
  writeFileSync(statePath, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2));
}

function clearState() {
  if (existsSync(statePath)) {
    writeFileSync(statePath, "{}");
  }
}

// ── Status file ───────────────────────────────────────────────────────────────

let statusData = {
  phase: "idle",
  startedAt: null,
  updatedAt: null,
  phases: {},
  errors: 0,
};

function updateStatus(patch) {
  statusData = { ...statusData, ...patch, updatedAt: new Date().toISOString() };
  try {
    writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
  } catch { /* non-fatal */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function run(cmd, env = {}) {
  console.log(`\n▶ ${cmd}\n${"─".repeat(70)}`);
  const result = spawnSync(cmd, {
    shell: true,
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    updateStatus({ phase: "failed", error: `Command failed: ${cmd}` });
    console.error(`\n✗ Command failed (exit ${result.status}): ${cmd}`);
    process.exit(result.status ?? 1);
  }
}

function section(label) {
  const bar = "═".repeat(70);
  console.log(`\n${bar}\n  ${label}\n${bar}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const state     = loadState();
  const done      = new Set(state?.completedPhases ?? []);

  if (resume && done.size > 0) {
    console.log(`\n⟳ Resuming from checkpoint — completed phases: ${[...done].join(", ")}`);
  }
  if (resetFlag) {
    clearState();
    console.log("✓ Checkpoint cleared — starting fresh");
  }

  updateStatus({
    phase: "starting",
    startedAt: new Date().toISOString(),
    mode, count, concurrency, aiConcurrency, dryRun,
    phases: {},
  });

  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║           Alexandrian Protocol — KB Generation Pipeline             ║
╠══════════════════════════════════════════════════════════════════════╣
║  mode          : ${mode.padEnd(50)}║
║  skipGenerate  : ${String(skipGenerate).padEnd(50)}║
║  skipUpgrade   : ${String(skipUpgrade).padEnd(50)}║
║  dryRun        : ${String(dryRun).padEnd(50)}║
║  concurrency   : ${concurrency.padEnd(50)}║
║  ai-concurrency: ${aiConcurrency.padEnd(50)}║
║  resume        : ${String(resume).padEnd(50)}║
╚══════════════════════════════════════════════════════════════════════╝`);

  function completePhase(name) {
    done.add(name);
    saveState({ completedPhases: [...done], mode, startedAt: statusData.startedAt });
    updateStatus({ phases: { ...statusData.phases, [name]: { completedAt: new Date().toISOString() } } });
  }

  // ── Step 0: setMinStake(0) ──────────────────────────────────────────────────
  if (!noStakeOps && !dryRun) {
    if (!done.has("set-min-stake")) {
      section("Step 0 — Bootstrap: setMinStake(0)");
      updateStatus({ phase: "set-min-stake" });
      run("node scripts/set-min-stake.mjs 0");
      completePhase("set-min-stake");
    } else {
      section("Step 0 — Skipped (already done in checkpoint)");
    }
  }

  // ── Step 1: Build generator ─────────────────────────────────────────────────
  section("Step 1 — Build generator");
  updateStatus({ phase: "build" });
  run("pnpm --filter @alexandrian/generator run build");
  // No checkpoint for build — always re-run (fast, idempotent)

  // ── Step 2: Generate KBs ───────────────────────────────────────────────────
  if (!skipGenerate) {
    if (!done.has("generate")) {
      section(`Step 2 — Generate (mode: ${mode})`);
      updateStatus({ phase: "generate" });
      const countFlag     = count ? ` --count ${count}` : "";
      const aiConcFlag    = mode === "ai-seeds" ? ` --ai-concurrency ${aiConcurrency}` : "";
      run(`node packages/generator/dist/index.js --mode ${mode}${countFlag}${aiConcFlag}`);
      completePhase("generate");
    } else {
      section("Step 2 — Skipped (checkpoint: generate already done)");
    }
  } else {
    section("Step 2 — Skipped (--skip-generate)");
  }

  // ── Step 3a: Semantic dedup ────────────────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    console.warn("\n⚠  OPENAI_API_KEY not set — skipping semantic dedup + upgrade-seeds.");
    console.warn("   Set OPENAI_API_KEY in .env to enable AI quality gating.\n");
  } else {
    if (!done.has("dedup")) {
      section("Step 3a — Semantic near-duplicate removal");
      updateStatus({ phase: "dedup" });
      run(`node scripts/semantic-dedup.mjs`);
      completePhase("dedup");
    } else {
      section("Step 3a — Skipped (checkpoint: dedup already done)");
    }

    // ── Step 3b: AI upgrade gate ──────────────────────────────────────────────
    if (!skipUpgrade) {
      if (!done.has("upgrade")) {
        section("Step 3b — AI quality gate (upgrade-seeds)");
        updateStatus({ phase: "upgrade" });
        run(
          `node packages/generator/dist/index.js --mode upgrade-seeds --concurrency 5`,
          { OPENAI_API_KEY: process.env.OPENAI_API_KEY }
        );
        completePhase("upgrade");
      } else {
        section("Step 3b — Skipped (checkpoint: upgrade already done)");
      }
    } else {
      section("Step 3b — Skipped (--skip-upgrade)");
    }
  }

  // ── Step 4: Publish ─────────────────────────────────────────────────────────
  // Publish is always re-run (idempotent: skips already-published KBs)
  section("Step 4 — Publish to Base mainnet");
  updateStatus({ phase: "publish" });
  run(
    `node packages/generator/scripts/publish.mjs`,
    {
      DRY_RUN:     dryRun ? "true" : "false",
      CONCURRENCY: concurrency,
    }
  );
  completePhase("publish");

  // ── Step 5: Restore minStake ────────────────────────────────────────────────
  if (!noStakeOps && !dryRun) {
    if (!done.has("restore-min-stake")) {
      section("Step 5 — Restore: setMinStake(0.001 ETH)");
      updateStatus({ phase: "restore-min-stake" });
      run("node scripts/set-min-stake.mjs 1000000000000000");
      completePhase("restore-min-stake");
    }
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  clearState();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  updateStatus({ phase: "complete", elapsed });
  console.log(`\n✓ Pipeline complete in ${elapsed}s`);
  console.log(`  Status: ${statusPath}`);
}

main().catch((e) => {
  updateStatus({ phase: "fatal", error: e.message });
  console.error("Pipeline fatal:", e.message);
  process.exit(1);
});
