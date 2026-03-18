/**
 * pipeline.mjs — end-to-end KB generation and publish pipeline
 *
 * Chains: setMinStake(0) → generate → upgrade-seeds → publish → setMinStake(restore)
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
 *   node scripts/pipeline.mjs --no-stake-ops           # skip setMinStake calls (useful if already 0)
 *
 * Required env vars:
 *   OWNER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY — publishing wallet
 *
 * Optional env vars:
 *   OPENAI_API_KEY   — required only for --mode ai-seeds or upgrade step
 *   PINATA_API_JWT   — real IPFS pinning (uses placeholders if absent)
 *   BASE_RPC_URL     — Base mainnet RPC (default: https://mainnet.base.org)
 */

import { execSync, spawnSync } from "child_process";
import { createRequire }       from "module";
import { resolve, dirname }    from "path";
import { fileURLToPath }       from "url";

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

const mode        = opt("--mode", "seeds");
const count       = opt("--count", null);
const concurrency = opt("--concurrency", "3");
const skipGenerate = flag("--skip-generate");
const skipUpgrade  = flag("--skip-upgrade");
const dryRun       = flag("--dry-run");
const noStakeOps   = flag("--no-stake-ops");

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

  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║           Alexandrian Protocol — KB Generation Pipeline             ║
╠══════════════════════════════════════════════════════════════════════╣
║  mode        : ${mode.padEnd(52)}║
║  skipGenerate: ${String(skipGenerate).padEnd(52)}║
║  skipUpgrade : ${String(skipUpgrade).padEnd(52)}║
║  dryRun      : ${String(dryRun).padEnd(52)}║
║  concurrency : ${concurrency.padEnd(52)}║
╚══════════════════════════════════════════════════════════════════════╝`);

  // ── Step 0: setMinStake(0) ──────────────────────────────────────────────────
  if (!noStakeOps && !dryRun) {
    section("Step 0 — Bootstrap: setMinStake(0)");
    run("node scripts/set-min-stake.mjs 0");
  }

  // ── Step 1: Build generator ─────────────────────────────────────────────────
  section("Step 1 — Build generator");
  run("pnpm --filter @alexandrian/generator run build");

  // ── Step 2: Generate KBs ───────────────────────────────────────────────────
  if (!skipGenerate) {
    section(`Step 2 — Generate (mode: ${mode})`);
    const countFlag = count ? ` --count ${count}` : "";
    run(`node packages/generator/dist/index.js --mode ${mode}${countFlag}`);
  } else {
    section("Step 2 — Skipped (--skip-generate)");
  }

  // ── Step 3a: Semantic dedup ────────────────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    console.warn("\n⚠  OPENAI_API_KEY not set — skipping semantic dedup + upgrade-seeds.");
    console.warn("   Set OPENAI_API_KEY in .env to enable AI quality gating.\n");
  } else {
    section("Step 3a — Semantic near-duplicate removal");
    run(`node scripts/semantic-dedup.mjs`);

    // ── Step 3b: AI upgrade gate ──────────────────────────────────────────────
    if (!skipUpgrade) {
      section("Step 3b — AI quality gate (upgrade-seeds)");
      run(
        `node packages/generator/dist/index.js --mode upgrade-seeds --concurrency 5`,
        { OPENAI_API_KEY: process.env.OPENAI_API_KEY }
      );
    } else {
      section("Step 3b — Skipped (--skip-upgrade)");
    }
  }

  // ── Step 4: Publish ─────────────────────────────────────────────────────────
  section("Step 4 — Publish to Base mainnet");
  run(
    `node packages/generator/scripts/publish.mjs`,
    {
      DRY_RUN:      dryRun ? "true" : "false",
      CONCURRENCY:  concurrency,
    }
  );

  // ── Step 5: Restore minStake ────────────────────────────────────────────────
  if (!noStakeOps && !dryRun) {
    section("Step 5 — Restore: setMinStake(0.001 ETH)");
    run("node scripts/set-min-stake.mjs 1000000000000000");
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Pipeline complete in ${elapsed}s`);
}

main().catch((e) => {
  console.error("Pipeline fatal:", e.message);
  process.exit(1);
});
