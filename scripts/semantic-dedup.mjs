/**
 * semantic-dedup.mjs — Embedding-based near-duplicate detection for staged KBs.
 *
 * Scans staging/pending/ (and optionally staging/refined/) for semantically
 * similar KBs using OpenAI text-embedding-3-small + cosine similarity.
 * Removes duplicates by moving them to staging/failed/ with a reason tag.
 *
 * Embeddings are cached in staging/embedding-index.json so subsequent runs
 * only call the API for new KBs.
 *
 * Usage:
 *   node scripts/semantic-dedup.mjs                    # scan pending/
 *   node scripts/semantic-dedup.mjs --include-refined  # also scan refined/
 *   node scripts/semantic-dedup.mjs --threshold 0.90   # custom similarity cutoff (default: 0.92)
 *   node scripts/semantic-dedup.mjs --dry-run           # report without moving files
 *   node scripts/semantic-dedup.mjs --batch 50          # embeddings per API call (default: 100)
 *
 * Required env vars:
 *   OPENAI_API_KEY — OpenAI API key for text-embedding-3-small
 *
 * Output:
 *   staging/embedding-index.json — persistent embedding cache (contentHash → vector)
 *   Duplicate files moved to staging/failed/ with _dedupReason field
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { join, resolve, dirname, basename } from "path";
import { fileURLToPath }                    from "url";
import { createRequire }                    from "module";

const require    = createRequire(import.meta.url);
const { config } = require("dotenv");
const __dirname  = dirname(fileURLToPath(import.meta.url));
const root       = resolve(__dirname, "..");
config({ path: resolve(root, ".env") });

// ── Args ──────────────────────────────────────────────────────────────────────

const args            = process.argv.slice(2);
const flag            = (n) => args.includes(n);
const opt             = (n, def) => { const i = args.indexOf(n); return i !== -1 && args[i+1] ? args[i+1] : def; };
const THRESHOLD       = parseFloat(opt("--threshold", "0.92"));
const BATCH_SIZE      = parseInt(opt("--batch", "100"), 10);
const DRY_RUN         = flag("--dry-run");
const INCLUDE_REFINED = flag("--include-refined");

// ── Paths ─────────────────────────────────────────────────────────────────────

const stagingDir   = join(root, "packages", "generator", "staging");
const pendingDir   = join(stagingDir, "pending");
const refinedDir   = join(stagingDir, "refined");
const failedDir    = join(stagingDir, "failed");
const indexPath    = join(stagingDir, "embedding-index.json");

mkdirSync(failedDir, { recursive: true });

// ── Embedding index ───────────────────────────────────────────────────────────

/** @type {Map<string, number[]>} contentHash → embedding vector */
let index = new Map();

function loadIndex() {
  if (!existsSync(indexPath)) return;
  try {
    const raw = JSON.parse(readFileSync(indexPath, "utf8"));
    for (const [k, v] of Object.entries(raw)) index.set(k, v);
    console.log(`Loaded ${index.size} cached embeddings from ${indexPath}`);
  } catch {
    console.warn("Could not load embedding index; starting fresh.");
  }
}

function saveIndex() {
  const obj = Object.fromEntries(index);
  writeFileSync(indexPath, JSON.stringify(obj));
  console.log(`Saved ${index.size} embeddings to ${indexPath}`);
}

// ── Math ──────────────────────────────────────────────────────────────────────

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ── OpenAI embeddings ─────────────────────────────────────────────────────────

const EMBED_MODEL = "text-embedding-3-small";

async function embedBatch(texts, apiKey) {
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: texts, model: EMBED_MODEL }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`OpenAI ${resp.status}: ${body.slice(0, 300)}`);
  }
  const { data } = await resp.json();
  return data.map((d) => d.embedding);
}

function kbText(artifact) {
  const claim   = artifact?.claim?.statement ?? artifact?.identity?.title ?? "";
  const summary = artifact?.semantic?.summary ?? artifact?.claim?.summary ?? "";
  return `${claim} ${summary}`.trim().slice(0, 512); // limit tokens
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is required for semantic dedup.");
    process.exit(1);
  }

  loadIndex();

  // Collect files to scan
  const dirs = [pendingDir];
  if (INCLUDE_REFINED) dirs.push(refinedDir);

  /** @type {{ filePath: string, contentHash: string, artifact: any, text: string }[]} */
  const entries = [];

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const filePath = join(dir, f);
      try {
        const raw      = JSON.parse(readFileSync(filePath, "utf8"));
        const artifact = raw.artifact ?? raw;
        const text     = kbText(artifact);
        const ch       = raw.kbHash ?? (f.startsWith("0x") ? f.replace(".json", "") : null);
        if (!ch || !text) continue;
        entries.push({ filePath, contentHash: ch, artifact, text });
      } catch { /* skip malformed */ }
    }
  }

  console.log(`\nFiles to scan: ${entries.length} (threshold: ${THRESHOLD})`);

  // Fetch embeddings for entries not yet in the cache
  const missing = entries.filter((e) => !index.has(e.contentHash));
  console.log(`Embeddings needed: ${missing.length} (${entries.length - missing.length} cached)`);

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch  = missing.slice(i, i + BATCH_SIZE);
    const texts  = batch.map((e) => e.text);
    process.stdout.write(`  Embedding batch ${i + 1}–${Math.min(i + BATCH_SIZE, missing.length)} of ${missing.length}…`);
    const vecs = await embedBatch(texts, apiKey);
    for (let j = 0; j < batch.length; j++) {
      index.set(batch[j].contentHash, vecs[j]);
    }
    process.stdout.write(" done\n");
  }

  if (missing.length > 0 && !DRY_RUN) saveIndex();

  // Build ordered list of (contentHash, embedding) pairs for comparison
  const ordered = entries
    .filter((e) => index.has(e.contentHash))
    .map((e) => ({ ...e, vec: index.get(e.contentHash) }));

  // Greedy dedup: for each entry, compare against all prior kept entries
  const kept    = []; // indices of non-duplicate entries
  const removed = []; // { filePath, contentHash, similarity, matchHash }

  for (let i = 0; i < ordered.length; i++) {
    const e = ordered[i];
    let isDup = false;

    for (const k of kept) {
      const sim = cosine(e.vec, ordered[k].vec);
      if (sim >= THRESHOLD) {
        removed.push({ filePath: e.filePath, contentHash: e.contentHash, similarity: sim, matchHash: ordered[k].contentHash });
        isDup = true;
        break;
      }
    }

    if (!isDup) kept.push(i);
  }

  // Report
  console.log(`\n── Results ──────────────────────────────────────────────────────`);
  console.log(`  Unique KBs:    ${kept.length}`);
  console.log(`  Near-dupes:    ${removed.length}`);

  if (removed.length === 0) {
    console.log("  No near-duplicates found.");
    return;
  }

  console.log("\n  Near-duplicates (similarity ≥ " + THRESHOLD + "):");
  for (const r of removed) {
    console.log(`    ${r.contentHash.slice(0, 12)}… sim=${r.similarity.toFixed(4)} matches ${r.matchHash.slice(0, 12)}…`);
  }

  if (DRY_RUN) {
    console.log("\n  Dry run — no files moved.");
    return;
  }

  // Move duplicates to failed/ with reason tag
  let moved = 0;
  for (const r of removed) {
    try {
      const raw = JSON.parse(readFileSync(r.filePath, "utf8"));
      raw._dedupReason = `SEMANTIC_DUPLICATE: cosine=${r.similarity.toFixed(4)} matches ${r.matchHash}`;
      const destPath = join(failedDir, basename(r.filePath));
      writeFileSync(destPath, JSON.stringify(raw, null, 2));
      unlinkSync(r.filePath);
      moved++;
    } catch (e) {
      console.warn(`  Could not move ${r.filePath}: ${e.message}`);
    }
  }

  console.log(`\n  Moved ${moved} near-duplicates to staging/failed/`);
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
