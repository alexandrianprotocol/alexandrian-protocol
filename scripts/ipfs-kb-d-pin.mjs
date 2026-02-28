/**
 * ipfs-kb-d-pin.mjs
 *
 * Uploads the ipfs/kb-d/ artifact directory to IPFS via Pinata,
 * verifies keccak256(artifact.json) == committed artifactHash,
 * then updates kb-record.json and manifest.json with the real CID.
 *
 * Requires: PINATA_JWT env var (free at https://app.pinata.cloud)
 *
 * Usage:
 *   PINATA_JWT=<jwt> node scripts/ipfs-kb-d-pin.mjs
 *   # or:
 *   node scripts/ipfs-kb-d-pin.mjs --jwt <jwt>
 *   # dry-run (hash check only, no upload):
 *   node scripts/ipfs-kb-d-pin.mjs --dry-run
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import sha3 from "js-sha3";

const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const KB_D_DIR = resolve(process.cwd(), "ipfs/kb-d");
const KB_RECORD_PATH = resolve(KB_D_DIR, "kb-record.json");
const MANIFEST_PATH = resolve(KB_D_DIR, "manifest.json");
const ARTIFACT_PATH = resolve(KB_D_DIR, "artifact.json");

const COMMITTED_ARTIFACT_HASH =
  "0x23a62a34315b12e04aa5fc42954b850b63bba44669f8cff73f090434cfd219e3";

// ── arg parsing ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { jwt: process.env.PINATA_JWT || "", dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--") continue;
    else if (t === "--jwt") out.jwt = argv[++i];
    else if (t === "--dry-run") out.dryRun = true;
    else throw new Error(`Unknown argument: ${t}`);
  }
  return out;
}

// ── file collection ───────────────────────────────────────────────────────────
function collectFiles(dir, base = dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectFiles(full, base));
    } else {
      results.push({ full, rel: relative(base, full).replace(/\\/g, "/") });
    }
  }
  return results;
}

// ── hash verify ───────────────────────────────────────────────────────────────
function verifyArtifactHash() {
  const bytes = readFileSync(ARTIFACT_PATH);
  const computed = "0x" + sha3.keccak256(bytes);
  const match = computed.toLowerCase() === COMMITTED_ARTIFACT_HASH.toLowerCase();
  return { computed, expected: COMMITTED_ARTIFACT_HASH, match, bytes: bytes.length };
}

// ── pinata upload ─────────────────────────────────────────────────────────────
async function pinDirectory(jwt, files) {
  const form = new FormData();
  for (const { full, rel } of files) {
    const content = readFileSync(full);
    form.append("file", new Blob([content]), `kb-d/${rel}`);
  }
  form.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 1, wrapWithDirectory: true })
  );
  form.append(
    "pinataMetadata",
    JSON.stringify({
      name: "alexandrian-kb-d",
      keyvalues: {
        kbId: "KB-D",
        artifactHash: COMMITTED_ARTIFACT_HASH,
        protocol: "alexandrian",
      },
    })
  );

  const res = await fetch(PINATA_PIN_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed: ${res.status} ${res.statusText}\n${text}`);
  }
  return await res.json();
}

// ── update local records ──────────────────────────────────────────────────────
function updateLocalRecords(cid) {
  const kbRecord = JSON.parse(readFileSync(KB_RECORD_PATH, "utf8"));
  kbRecord.rootCid = cid;
  writeFileSync(KB_RECORD_PATH, JSON.stringify(kbRecord, null, 2) + "\n");

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  manifest.rootCid = cid;
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

// ── main ──────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv);
const files = collectFiles(KB_D_DIR);

console.log(`\n── KB-D IPFS Pin ─────────────────────────────────────`);
console.log(`Files collected: ${files.length}`);
for (const { rel } of files) console.log(`  ${rel}`);

// 1. Verify artifact hash before doing anything
const hashCheck = verifyArtifactHash();
console.log(`\n── Artifact hash check ───────────────────────────────`);
console.log(`  computed : ${hashCheck.computed}`);
console.log(`  expected : ${hashCheck.expected}`);
console.log(`  match    : ${hashCheck.match}`);
console.log(`  bytes    : ${hashCheck.bytes}`);

if (!hashCheck.match) {
  throw new Error(
    "artifact.json hash does not match committed artifactHash — aborting upload."
  );
}

if (args.dryRun) {
  console.log(`\n── Dry run — skipping upload ─────────────────────────`);
  console.log("Hash verified. Pass PINATA_JWT and remove --dry-run to upload.");
  process.exit(0);
}

if (!args.jwt) {
  console.error(`
ERROR: No Pinata JWT found.

Get a free API key:
  1. Sign up at https://app.pinata.cloud (free tier, no credit card)
  2. Go to API Keys → New Key → select pinFileToIPFS
  3. Copy the JWT

Then run:
  PINATA_JWT=<your_jwt> pnpm run ipfs:kb-d:pin
  # or on Windows PowerShell:
  $env:PINATA_JWT="<your_jwt>"; pnpm run ipfs:kb-d:pin
`);
  process.exit(1);
}

// 2. Upload
console.log(`\n── Uploading to IPFS via Pinata ──────────────────────`);
const result = await pinDirectory(args.jwt, files);
const cid = result.IpfsHash;

console.log(`\n── Upload complete ───────────────────────────────────`);
console.log(`  CID      : ${cid}`);
console.log(`  PinSize  : ${result.PinSize} bytes`);
console.log(`  Gateway  : https://ipfs.io/ipfs/${cid}/kb-d/artifact.json`);

// 3. Update local records
updateLocalRecords(cid);
console.log(`\n── Local records updated ─────────────────────────────`);
console.log(`  kb-record.json → rootCid: ${cid}`);
console.log(`  manifest.json  → rootCid: ${cid}`);

// 4. Print verification command
console.log(`\n── Verify end-to-end ─────────────────────────────────`);
console.log(`Run:`);
console.log(
  `  pnpm run ipfs:kb-d:onchain -- --cid-override ${cid} --gateway https://ipfs.io`
);
console.log(`Expected: integrity.verdict = "verified"`);
console.log(`\nDone.\n`);
