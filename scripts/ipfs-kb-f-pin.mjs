/**
 * ipfs-kb-f-pin.mjs
 *
 * Uploads the ipfs/kb-f/ artifact directory to IPFS via Pinata.
 *
 * Unlike KB-D (which used artifactHash = hash_of_payload in the envelope),
 * KB-F uses artifactHash = keccak256(artifact.json bytes). This script
 * computes that hash, writes it to kb-record.json, then uploads the
 * directory so the CID can be passed to publish-kb-f.mjs.
 *
 * Requires: PINATA_JWT env var (free at https://app.pinata.cloud)
 *
 * Usage:
 *   PINATA_JWT=<jwt> node scripts/ipfs-kb-f-pin.mjs
 *   # or:
 *   node scripts/ipfs-kb-f-pin.mjs --jwt <jwt>
 *   # dry-run (hash check only, no upload):
 *   node scripts/ipfs-kb-f-pin.mjs --dry-run
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { config as dotenvConfig } from "dotenv";
import sha3 from "js-sha3";

// Load .env from the release/grant-m1 directory
dotenvConfig({ path: resolve(process.cwd(), ".env") });

const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const KB_F_DIR = resolve(process.cwd(), "ipfs/kb-f");
const KB_RECORD_PATH = resolve(KB_F_DIR, "kb-record.json");
const MANIFEST_PATH = resolve(KB_F_DIR, "manifest.json");
const ARTIFACT_PATH = resolve(KB_F_DIR, "artifact.json");

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

// ── hash compute ──────────────────────────────────────────────────────────────
function computeArtifactHash() {
  const bytes = readFileSync(ARTIFACT_PATH);
  const computed = "0x" + sha3.keccak256(bytes);
  return { computed, bytes: bytes.length };
}

// ── pinata upload ─────────────────────────────────────────────────────────────
async function pinDirectory(jwt, files, artifactHash) {
  const form = new FormData();
  for (const { full, rel } of files) {
    const content = readFileSync(full);
    form.append("file", new Blob([content]), `kb-f/${rel}`);
  }
  form.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 1, wrapWithDirectory: true })
  );
  form.append(
    "pinataMetadata",
    JSON.stringify({
      name: "alexandrian-kb-f",
      keyvalues: {
        kbId: "KB-F",
        artifactHash,
        protocol: "alexandrian",
        workflow: "pin-first",
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
function updateLocalRecords(cid, artifactHash) {
  const kbRecord = JSON.parse(readFileSync(KB_RECORD_PATH, "utf8"));
  kbRecord.artifactHash = artifactHash;
  kbRecord.rootCid = cid;
  writeFileSync(KB_RECORD_PATH, JSON.stringify(kbRecord, null, 2) + "\n");

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  manifest.rootCid = cid;
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

// ── main ──────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv);
const files = collectFiles(KB_F_DIR);

console.log(`\n── KB-F IPFS Pin ─────────────────────────────────────`);
console.log(`Files collected: ${files.length}`);
for (const { rel } of files) console.log(`  ${rel}`);

// 1. Compute artifact hash (this is the authoritative artifactHash for KB-F)
const { computed: artifactHash, bytes: artifactBytes } = computeArtifactHash();
console.log(`\n── Artifact hash (KB-F) ──────────────────────────────`);
console.log(`  computed : ${artifactHash}`);
console.log(`  bytes    : ${artifactBytes}`);
console.log(`  note     : This hash will be written into KB-F's canonical envelope`);
console.log(`             and committed on-chain via publishKB.`);

if (args.dryRun) {
  console.log(`\n── Dry run — skipping upload ─────────────────────────`);
  console.log(`Hash computed. Pass PINATA_JWT and remove --dry-run to upload.`);
  console.log(`\nNext step:`);
  console.log(`  PINATA_JWT=<jwt> pnpm run ipfs:kb-f:pin`);
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
  PINATA_JWT=<your_jwt> pnpm run ipfs:kb-f:pin
  # or on Windows PowerShell:
  $env:PINATA_JWT="<your_jwt>"; pnpm run ipfs:kb-f:pin
`);
  process.exit(1);
}

// 2. Upload
console.log(`\n── Uploading to IPFS via Pinata ──────────────────────`);
const result = await pinDirectory(args.jwt, files, artifactHash);
const cid = result.IpfsHash;

console.log(`\n── Upload complete ───────────────────────────────────`);
console.log(`  CID      : ${cid}`);
console.log(`  PinSize  : ${result.PinSize} bytes`);
console.log(`  Gateway  : https://ipfs.io/ipfs/${cid}/kb-f/artifact.json`);

// 3. Update local records
updateLocalRecords(cid, artifactHash);
console.log(`\n── Local records updated ─────────────────────────────`);
console.log(`  kb-record.json → artifactHash: ${artifactHash}`);
console.log(`  kb-record.json → rootCid: ${cid}`);
console.log(`  manifest.json  → rootCid: ${cid}`);

// 4. Print publish command
console.log(`\n── Next step: Publish to Base mainnet ────────────────`);
console.log(`Run:`);
console.log(`  PRIVATE_KEY=<funded_key> pnpm run ipfs:kb-f:publish`);
console.log(`\nDone.\n`);
