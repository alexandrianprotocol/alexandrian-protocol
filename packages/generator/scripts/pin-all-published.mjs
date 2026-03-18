/**
 * pin-all-published.mjs
 *
 * Retroactive IPFS pinning for KBs published on-chain with empty CIDs.
 * Reads every artifact from staging/published/, pins to Pinata, and writes
 * a remediation manifest: staging/cid-manifest.json
 *
 *   contentHash (filename) → { cid, size, ts }
 *
 * This manifest is the source of truth for artifact retrieval for the
 * existing 7k KB batch. Future KBs must use the two-phase pipeline
 * (pin-first via staging/bundled/ before any chain submission).
 *
 * Required env vars:
 *   PINATA_API_JWT  — Pinata JWT token
 *
 * Optional env vars:
 *   CONCURRENCY     — parallel pin slots, default 5 (Pinata rate limit safe)
 *   VERIFY          — set "true" to fetch-back and round-trip verify each pin
 *
 * Resume-safe: already-pinned entries in staging/cid-remediation.jsonl are
 * skipped on re-run. Run as many times as needed until all 7k are pinned.
 *
 * Usage:
 *   node scripts/pin-all-published.mjs
 *   VERIFY=true node scripts/pin-all-published.mjs      # slower, safer
 *   CONCURRENCY=3 node scripts/pin-all-published.mjs    # if hitting 429s
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join, basename, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require    = createRequire(import.meta.url);
const { config } = require("dotenv");

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

// ── Config ────────────────────────────────────────────────────────────────────

const PINATA_URL    = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const CONCURRENCY   = Math.min(parseInt(process.env.CONCURRENCY ?? "5", 10), 10);
const VERIFY        = process.env.VERIFY === "true";
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://gateway.pinata.cloud/ipfs",
];

// ── Paths ─────────────────────────────────────────────────────────────────────

const stagingDir    = resolve(__dirname, "../staging");
const publishedDir  = join(stagingDir, "published");
const progressFile  = join(stagingDir, "cid-remediation.jsonl");   // append-only log
const manifestFile  = join(stagingDir, "cid-manifest.json");       // final output

// ── Load already-pinned entries (resume support) ──────────────────────────────

function loadProgress() {
  const done = new Map(); // contentHash → { cid, size, ts }
  if (!existsSync(progressFile)) return done;
  for (const line of readFileSync(progressFile, "utf8").split("\n").filter(Boolean)) {
    try {
      const e = JSON.parse(line);
      if (e.contentHash && e.cid && !e.error) done.set(e.contentHash, e);
    } catch { /* skip malformed lines */ }
  }
  return done;
}

// ── Pin one artifact to Pinata ────────────────────────────────────────────────

async function pinOne(contentHash, artifact, jwt, maxRetries = 4) {
  const baseDelay = 1_500;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay + Math.random() * 500));
    }

    const resp = await fetch(PINATA_URL, {
      method:  "POST",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        pinataContent:  artifact,
        pinataMetadata: { name: contentHash },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (resp.ok) {
      const { IpfsHash, PinSize } = await resp.json();
      return { cid: IpfsHash, size: PinSize };
    }

    if (resp.status === 429 || resp.status >= 500) {
      const retryAfter = resp.headers.get("Retry-After");
      if (retryAfter && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, parseInt(retryAfter, 10) * 1_000));
      }
      continue;
    }

    throw new Error(`Pinata ${resp.status}: ${await resp.text()}`);
  }

  throw new Error(`Pinata: exhausted ${maxRetries} retries for ${contentHash.slice(0, 10)}`);
}

// ── Verify: fetch back from gateway and confirm content round-trips ───────────

async function verifyPin(cid, artifact) {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const resp = await fetch(`${gateway}/${cid}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) continue;
      const fetched = await resp.json();
      // Compare JSON stringification (order-independent via sorted keys)
      const aStr = JSON.stringify(artifact, Object.keys(artifact).sort());
      const bStr = JSON.stringify(fetched, Object.keys(fetched ?? {}).sort());
      return aStr === bStr ? "ok" : "mismatch";
    } catch { /* try next gateway */ }
  }
  return "unreachable";
}

// ── Process one file ──────────────────────────────────────────────────────────

async function processOne(file, jwt, done) {
  const contentHash = basename(file, ".json");
  if (done.has(contentHash)) return { contentHash, status: "skip" };

  const raw      = readFileSync(file, "utf8");
  const entry    = JSON.parse(raw);

  // Strip internal scoring field — not part of the canonical artifact
  const { _quality, ...artifact } = entry;

  let cid, size;
  try {
    ({ cid, size } = await pinOne(contentHash, artifact, jwt));
  } catch (err) {
    const record = { contentHash, error: err.message, ts: new Date().toISOString() };
    writeFileSync(progressFile, JSON.stringify(record) + "\n", { flag: "a" });
    return { contentHash, status: "error", error: err.message };
  }

  let verifyStatus = "skipped";
  if (VERIFY) {
    verifyStatus = await verifyPin(cid, artifact);
  }

  const record = { contentHash, cid, size, verify: verifyStatus, ts: new Date().toISOString() };
  writeFileSync(progressFile, JSON.stringify(record) + "\n", { flag: "a" });

  return { contentHash, status: "ok", cid, size, verify: verifyStatus };
}

// ── Build final manifest from progress log ────────────────────────────────────

function buildManifest(done) {
  const manifest = {};
  for (const [hash, entry] of done) {
    manifest[hash] = { cid: entry.cid, size: entry.size, ts: entry.ts };
  }
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  return Object.keys(manifest).length;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const jwt = process.env.PINATA_API_JWT;
  if (!jwt) {
    console.error("Error: PINATA_API_JWT env var is required");
    console.error("  export PINATA_API_JWT=eyJ...");
    process.exit(1);
  }

  const files = readdirSync(publishedDir)
    .filter(f => f.endsWith(".json"))
    .map(f => join(publishedDir, f))
    .sort();

  if (files.length === 0) {
    console.log("No files found in staging/published/");
    return;
  }

  const done = loadProgress();
  const remaining = files.filter(f => !done.has(basename(f, ".json")));

  console.log(`\nAlexandrian — Retroactive IPFS Pinning`);
  console.log(`  Total KBs:      ${files.length}`);
  console.log(`  Already pinned: ${done.size}`);
  console.log(`  Remaining:      ${remaining.length}`);
  console.log(`  Concurrency:    ${CONCURRENCY}`);
  console.log(`  Verify pins:    ${VERIFY}`);
  console.log(`  Progress log:   ${progressFile}`);
  console.log(`  Manifest:       ${manifestFile}\n`);

  if (remaining.length === 0) {
    console.log("All KBs already pinned. Building final manifest...");
    const count = buildManifest(done);
    console.log(`✓ Manifest written: ${count} entries → ${manifestFile}`);
    return;
  }

  let pinned = 0, failed = 0, skipped = done.size;
  const startTime = Date.now();

  // Process in batches of CONCURRENCY
  for (let i = 0; i < remaining.length; i += CONCURRENCY) {
    const batch = remaining.slice(i, i + CONCURRENCY);

    const results = await Promise.all(
      batch.map(file => processOne(file, jwt, done))
    );

    for (const r of results) {
      if (r.status === "ok") {
        pinned++;
        done.set(r.contentHash, { cid: r.cid, size: r.size, ts: new Date().toISOString() });
        if (VERIFY && r.verify !== "ok") {
          console.warn(`  ⚠ verify ${r.verify}: ${r.contentHash.slice(0, 12)}… cid=${r.cid.slice(0, 20)}`);
        }
      } else if (r.status === "error") {
        failed++;
        console.error(`  ✗ ${r.contentHash.slice(0, 12)}…: ${r.error}`);
      } else {
        skipped++;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1_000).toFixed(0);
    const total   = pinned + failed;
    const rate    = total > 0 ? (total / Math.max(1, elapsed) * 60).toFixed(0) : "—";
    const pct     = ((pinned + done.size - (files.length - remaining.length)) / remaining.length * 100).toFixed(1);
    process.stdout.write(
      `  ${Math.min(i + CONCURRENCY, remaining.length)}/${remaining.length} | ✓${pinned} ✗${failed} | ${rate} pins/min | ${pct}% | ${elapsed}s\r`
    );

    // Small inter-batch pause to stay within Pinata rate limits
    if (i + CONCURRENCY < remaining.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1_000).toFixed(1);
  console.log(`\n\n── Summary ──────────────────────────────`);
  console.log(`  Pinned:   ${pinned}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Skipped:  ${done.size - (files.length - remaining.length)}  (already done on prior run)`);
  console.log(`  Duration: ${elapsed}s`);
  console.log(`  Rate:     ~${(pinned / Math.max(1, elapsed) * 60).toFixed(0)} pins/min`);

  // Write final manifest
  const count = buildManifest(done);
  console.log(`\n✓ Manifest written: ${count} entries → ${manifestFile}`);

  if (failed > 0) {
    console.log(`\n  ${failed} failed — re-run to retry. Progress is saved.`);
    process.exit(1);
  }

  console.log(`\n  Next step: deploy cid-manifest.json so the SDK can resolve artifacts.`);
  console.log(`  See docs/ipfs-pinning-policy.md for the manifest serving strategy.`);
}

main().catch(e => {
  console.error("\nFatal:", e.message);
  process.exit(1);
});
