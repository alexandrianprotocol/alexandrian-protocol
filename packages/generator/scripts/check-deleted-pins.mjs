/**
 * check-deleted-pins.mjs
 * Queries Pinata for all currently pinned CIDs, compares against
 * cid-remediation.jsonl, and outputs which contentHashes need re-pinning.
 *
 * Usage: node scripts/check-deleted-pins.mjs
 * Output: staging/needs-repin.json  — array of { contentHash, cid }
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { config } = require('dotenv');
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

const jwt = process.env.PINATA_API_JWT;
if (!jwt) { console.error('PINATA_API_JWT not set'); process.exit(1); }

async function fetchAllPinned() {
  const pinned = new Set();
  let offset = 0;
  const limit = 1000;
  while (true) {
    const url = `https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=${limit}&pageOffset=${offset}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
    if (!r.ok) {
      const body = await r.text();
      console.error(`Pinata API ${r.status}:`, body);
      process.exit(1);
    }
    const data = await r.json();
    if (!data.rows?.length) break;
    data.rows.forEach(row => pinned.add(row.ipfs_pin_hash));
    process.stdout.write(`  Fetching Pinata pins: ${pinned.size} / ${data.count}\r`);
    if (pinned.size >= data.count) break;
    offset += limit;
  }
  console.log();
  return pinned;
}

const progressFile = resolve(__dirname, '../staging/cid-remediation.jsonl');
if (!existsSync(progressFile)) {
  console.error('No cid-remediation.jsonl found');
  process.exit(1);
}

console.log('Querying Pinata for current pins...');
const pinned = await fetchAllPinned();

const lines = readFileSync(progressFile, 'utf8').split('\n').filter(Boolean);
const logged = [];
for (const line of lines) {
  try {
    const e = JSON.parse(line);
    if (e.cid && !e.error) logged.push({ contentHash: e.contentHash, cid: e.cid });
  } catch {}
}

const deleted = logged.filter(e => !pinned.has(e.cid));

console.log(`\nPinata currently has: ${pinned.size} pins`);
console.log(`Progress log has:     ${logged.length} successful entries`);
console.log(`Deleted from Pinata:  ${deleted.length}`);
console.log(`Still pinned:         ${logged.length - deleted.length}`);

if (deleted.length > 0) {
  const outFile = resolve(__dirname, '../staging/needs-repin.json');
  writeFileSync(outFile, JSON.stringify(deleted, null, 2));
  console.log(`\n✓ Written: ${outFile}`);
  console.log(`  Next step: node scripts/repin-deleted.mjs`);
} else {
  console.log('\n✓ All logged pins are still live on Pinata — nothing to re-pin.');
}
