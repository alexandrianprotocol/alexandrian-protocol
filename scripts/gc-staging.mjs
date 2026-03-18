/**
 * gc-staging.mjs — Staging directory garbage collection.
 *
 * Prunes old entries from staging/ subdirectories to keep the working tree
 * manageable during long generation runs.
 *
 * What it cleans:
 *   staging/published/   — KB JSON files that are confirmed on-chain (safe to remove after N days)
 *   staging/failed/      — Rejected KBs (dedup, validation failures) older than N days
 *   staging/pending/     — Stale pending KBs older than N days (not yet upgraded; re-generate as needed)
 *
 * What it NEVER touches:
 *   staging/refined/     — KBs ready to publish (always keep until published)
 *   staging/bundled/     — Pre-computed IPFS bundles (expensive to regenerate)
 *   staging/publish-log.jsonl  — Audit trail
 *   staging/embedding-index.json — Embedding cache (expensive to rebuild)
 *   staging/needs-repin.json    — IPFS remediation list
 *
 * Usage:
 *   node scripts/gc-staging.mjs                      # dry-run by default
 *   node scripts/gc-staging.mjs --execute            # actually delete files
 *   node scripts/gc-staging.mjs --days 30            # keep files newer than 30 days (default: 14)
 *   node scripts/gc-staging.mjs --dir published      # only GC one directory
 */

import { readdirSync, statSync, unlinkSync, existsSync } from "fs";
import { join, resolve, dirname }                         from "path";
import { fileURLToPath }                                  from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = resolve(__dirname, "..");
const stagingDir = join(root, "packages", "generator", "staging");

// ── Args ──────────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const flag    = (n) => args.includes(n);
const opt     = (n, def) => { const i = args.indexOf(n); return i !== -1 && args[i+1] ? args[i+1] : def; };

const EXECUTE  = flag("--execute");
const DAYS     = parseInt(opt("--days", "14"), 10);
const ONLY_DIR = opt("--dir", null);

const CUTOFF_MS = DAYS * 24 * 60 * 60 * 1000;

// ── Targets ───────────────────────────────────────────────────────────────────

const TARGETS = [
  { dir: "published", description: "on-chain confirmed KBs" },
  { dir: "failed",    description: "rejected KBs (dedup/validation)" },
  { dir: "pending",   description: "stale unupgraded KBs" },
].filter((t) => !ONLY_DIR || t.dir === ONLY_DIR);

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const now    = Date.now();
  let totalOld = 0, totalSize = 0;

  console.log(`\nAlexandrian Staging GC`);
  console.log(`  Cutoff:  ${DAYS} days (files older than ${new Date(now - CUTOFF_MS).toISOString().slice(0, 10)})`);
  console.log(`  Mode:    ${EXECUTE ? "EXECUTE (deleting files)" : "DRY-RUN (pass --execute to delete)"}\n`);

  for (const { dir, description } of TARGETS) {
    const dirPath = join(stagingDir, dir);
    if (!existsSync(dirPath)) {
      console.log(`  ${dir}/  — not found, skipping`);
      continue;
    }

    const files = readdirSync(dirPath).filter((f) => f.endsWith(".json"));
    let old = 0, size = 0;

    for (const f of files) {
      const fp   = join(dirPath, f);
      const stat = statSync(fp);
      const ageMs = now - stat.mtimeMs;

      if (ageMs > CUTOFF_MS) {
        size += stat.size;
        old++;
        if (EXECUTE) {
          try { unlinkSync(fp); } catch (e) { console.warn(`    Could not delete ${f}: ${e.message}`); }
        }
      }
    }

    totalOld  += old;
    totalSize += size;

    const sizeKb = (size / 1024).toFixed(1);
    const action = EXECUTE ? "deleted" : "eligible";
    console.log(`  ${dir}/  [${description}]`);
    console.log(`    Total files: ${files.length}  |  ${action}: ${old}  |  size: ${sizeKb} KB`);
  }

  console.log(`\n  Total ${EXECUTE ? "deleted" : "eligible"}: ${totalOld} files (${(totalSize / 1024).toFixed(1)} KB)`);

  if (!EXECUTE && totalOld > 0) {
    console.log(`\n  Run with --execute to delete. Safe directories (refined/, bundled/) are never touched.`);
  }
}

main();
