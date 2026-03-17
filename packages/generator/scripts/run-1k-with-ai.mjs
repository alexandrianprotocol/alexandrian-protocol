#!/usr/bin/env node
/**
 * Run 1k artifact generation with AI seeds included.
 *
 * Order: seeds (100) → ai-seeds (OpenAI) → derived → expansion to 1000.
 * Requires: OPENAI_API_KEY in .env for ai-seeds phase.
 *
 * Usage: node scripts/run-1k-with-ai.mjs
 *    or: npm run generate:1k-ai
 */

import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const node = process.execPath;
const index = join(root, "dist", "index.js");

function run(args, label) {
  console.log(`\n>>> ${label}\n`);
  const r = spawnSync(node, [index, ...args], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

run(["--mode", "seeds", "--count", "100"], "Phase 1: seeds (100)");
run(["--mode", "ai-seeds", "--count", "20"], "Phase 2: ai-seeds (OpenAI)");
run(["--mode", "derived"], "Phase 3: derived");
run(["--mode", "expansion", "--target", "1000", "--count", "1000"], "Phase 4: expansion to 1000");

console.log("\n>>> Done. Check staging/pending and stats above.\n");
