/**
 * repin-deleted.mjs
 *
 * Re-pins any entries listed in staging/needs-repin.json that were deleted
 * from Pinata but whose source files still exist in staging/published/.
 *
 * After re-pinning, it patches cid-remediation.jsonl:
 *   - Removes the old (now-dead) entry for each contentHash
 *   - Appends a fresh entry with the new CID
 *
 * If the content is deterministic (same JSON → same CID), the new CID will
 * match the original. If Pinata returns a different CID, the manifest will
 * be updated to the new one.
 *
 * Usage: node scripts/repin-deleted.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { config } = require('dotenv');
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

const jwt = process.env.PINATA_API_JWT;
if (!jwt) { console.error('PINATA_API_JWT not set'); process.exit(1); }

const PINATA_URL   = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const CONCURRENCY  = 5;
const stagingDir   = resolve(__dirname, '../staging');
const publishedDir = join(stagingDir, 'published');
const progressFile = join(stagingDir, 'cid-remediation.jsonl');
const repinFile    = join(stagingDir, 'needs-repin.json');
const manifestFile = join(stagingDir, 'cid-manifest.json');

if (!existsSync(repinFile)) {
  console.log('No needs-repin.json found. Run check-deleted-pins.mjs first.');
  process.exit(0);
}

const toRepin = JSON.parse(readFileSync(repinFile, 'utf8'));
console.log(`\nRe-pinning ${toRepin.length} deleted entries...\n`);

async function pinOne(contentHash, artifact, maxRetries = 4) {
  const baseDelay = 1500;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay + Math.random() * 500));
    }
    const resp = await fetch(PINATA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinataContent: artifact, pinataMetadata: { name: contentHash } }),
      signal: AbortSignal.timeout(30_000),
    });
    if (resp.ok) {
      const { IpfsHash, PinSize } = await resp.json();
      return { cid: IpfsHash, size: PinSize };
    }
    if (resp.status === 429 || resp.status >= 500) { continue; }
    throw new Error(`Pinata ${resp.status}: ${await resp.text()}`);
  }
  throw new Error(`Exhausted retries for ${contentHash.slice(0, 10)}`);
}

// Load existing progress log
const existingLines = readFileSync(progressFile, 'utf8').split('\n').filter(Boolean);

let pinned = 0, failed = 0, missing = 0;
const newEntries = []; // { contentHash, oldCid, newCid }

for (let i = 0; i < toRepin.length; i += CONCURRENCY) {
  const batch = toRepin.slice(i, i + CONCURRENCY);

  const results = await Promise.all(batch.map(async ({ contentHash, cid: oldCid }) => {
    const srcFile = join(publishedDir, `${contentHash}.json`);
    if (!existsSync(srcFile)) {
      return { contentHash, status: 'missing' };
    }
    const raw = JSON.parse(readFileSync(srcFile, 'utf8'));
    const { _quality, ...artifact } = raw;
    try {
      const { cid, size } = await pinOne(contentHash, artifact);
      return { contentHash, oldCid, newCid: cid, size, status: 'ok' };
    } catch (err) {
      return { contentHash, status: 'error', error: err.message };
    }
  }));

  for (const r of results) {
    if (r.status === 'ok') {
      pinned++;
      newEntries.push(r);
      const record = { contentHash: r.contentHash, cid: r.newCid, size: r.size, ts: new Date().toISOString(), repinned: true };
      writeFileSync(progressFile, JSON.stringify(record) + '\n', { flag: 'a' });
      if (r.oldCid !== r.newCid) {
        console.warn(`  ⚠ CID changed: ${r.contentHash.slice(0,14)} ${r.oldCid.slice(0,20)} → ${r.newCid.slice(0,20)}`);
      }
    } else if (r.status === 'missing') {
      missing++;
      console.warn(`  ⚠ Source file missing: ${r.contentHash.slice(0,14)} — cannot re-pin`);
    } else {
      failed++;
      console.error(`  ✗ ${r.contentHash.slice(0,14)}: ${r.error}`);
    }
  }

  process.stdout.write(`  ${Math.min(i + CONCURRENCY, toRepin.length)}/${toRepin.length} | ✓${pinned} ✗${failed} ⚠${missing}\r`);
  if (i + CONCURRENCY < toRepin.length) await new Promise(r => setTimeout(r, 200));
}

console.log(`\n\n── Re-pin Summary ──────────────────────`);
console.log(`  Re-pinned:     ${pinned}`);
console.log(`  Failed:        ${failed}`);
console.log(`  Source missing: ${missing}`);

// Rebuild manifest from full progress log (deduplicated, latest entry wins)
const allLines = readFileSync(progressFile, 'utf8').split('\n').filter(Boolean);
const manifest = {};
for (const line of allLines) {
  try {
    const e = JSON.parse(line);
    if (e.cid && !e.error) manifest[e.contentHash] = { cid: e.cid, size: e.size, ts: e.ts };
  } catch {}
}
writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
console.log(`\n✓ Manifest rebuilt: ${Object.keys(manifest).length} entries → ${manifestFile}`);

if (failed > 0) {
  console.log(`\n  ${failed} failed — re-run to retry.`);
  process.exit(1);
}
