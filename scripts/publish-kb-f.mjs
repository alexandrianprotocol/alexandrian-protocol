/**
 * publish-kb-f.mjs
 *
 * Publishes KB-F to AlexandrianRegistryV2 on Base mainnet.
 *
 * Workflow (must complete in order):
 *   1. pnpm run ipfs:kb-f:pin          — upload to IPFS, compute artifactHash
 *   2. PRIVATE_KEY=<key> pnpm run ipfs:kb-f:publish   — this script
 *   3. pnpm run ipfs:kb-f:onchain -- --gateway https://ipfs.io   — verify
 *
 * What this script does:
 *   - Reads artifactHash and rootCid from ipfs/kb-f/kb-record.json
 *   - Builds the KB-F canonical envelope (from ipfs/kb-f-template.json + artifactHash)
 *   - Computes kbHash = keccak256("KB_V1" + JCS(normalizeForHash(envelope)))
 *   - Calls publishKB on AlexandrianRegistryV2 with the real CID
 *   - Writes kbHash and publishTx back to kb-record.json
 *
 * Requires:
 *   PRIVATE_KEY env var — hex private key for a funded Base wallet
 *   BASE_RPC_URL env var (optional) — defaults to https://mainnet.base.org
 *
 * Usage:
 *   PRIVATE_KEY=<key> node scripts/publish-kb-f.mjs
 *   PRIVATE_KEY=<key> node scripts/publish-kb-f.mjs --dry-run   # compute kbHash only
 *   PRIVATE_KEY=<key> node scripts/publish-kb-f.mjs --max-base-fee-gwei 0.02 --max-priority-fee-gwei 0.001
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as dotenvConfig } from "dotenv";
import { ethers } from "ethers";
import sha3 from "js-sha3";

dotenvConfig({ path: resolve(process.cwd(), ".env") });

// ── canonical hash (inline — mirrors packages/protocol/src/canonical.ts) ─────
//
// HASH_SCOPE_KEYS: fields included in kbHash per PROTOCOL-SPEC.
// NOTE: "cid" is intentionally absent — CID is storage metadata, not identity.
// This is why KB-D could register with cid="demo": identity is independent of
// where artifacts are stored.
const HASH_SCOPE_KEYS = ["type", "domain", "sources", "artifactHash", "tier", "payload", "derivation"];

function canonicalize(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite number in canonical input");
    return Number.isInteger(value) ? String(value) : JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") + "}";
  }
  throw new Error(`Unsupported type for canonicalization: ${typeof value}`);
}

function normalizeForHash(envelope) {
  const out = {};
  for (const k of HASH_SCOPE_KEYS) {
    if (envelope[k] !== undefined) out[k] = envelope[k];
  }
  const arr = out.sources ?? envelope.parents;
  out.sources = arr && arr.length > 1 ? [...arr].sort() : (arr ?? []);
  return out;
}

function kbHashFromEnvelope(envelope) {
  const normalized = normalizeForHash(envelope);
  const canonical = canonicalize(normalized);
  const domainTag = "KB_V1";
  // domainHashFromObject: keccak256(domainTag + canonical)
  const bytes = new TextEncoder().encode(domainTag + canonical);
  return "0x" + sha3.keccak256(bytes);
}

// ── arg parsing ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {
    privateKey: process.env.PUBLISHER_PRIVATE_KEY || process.env.PRIVATE_KEY || "",
    rpcUrl: process.env.BASE_RPC_URL || process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
    dryRun: false,
    queryFee: BigInt(0),
    licenseType: "CC0-1.0",
    version: "1",
    maxBaseFeeGwei: process.env.MAX_BASE_FEE_GWEI || "0.05",
    maxPriorityFeeGwei: process.env.MAX_PRIORITY_FEE_GWEI || "0.001",
    maxFeeGwei: process.env.MAX_FEE_GWEI || "",
    maxWaitSeconds: Number(process.env.MAX_WAIT_SECONDS || "300"),
    skipFeeWait: false,
    stakeWei: process.env.PUBLISH_STAKE_WEI || "",
  };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--") continue;
    else if (t === "--private-key") out.privateKey = argv[++i];
    else if (t === "--rpc-url") out.rpcUrl = argv[++i];
    else if (t === "--dry-run") out.dryRun = true;
    else if (t === "--query-fee") out.queryFee = BigInt(argv[++i]);
    else if (t === "--license-type") out.licenseType = argv[++i];
    else if (t === "--version") out.version = argv[++i];
    else if (t === "--max-base-fee-gwei") out.maxBaseFeeGwei = argv[++i];
    else if (t === "--max-priority-fee-gwei") out.maxPriorityFeeGwei = argv[++i];
    else if (t === "--max-fee-gwei") out.maxFeeGwei = argv[++i];
    else if (t === "--max-wait-seconds") out.maxWaitSeconds = Number(argv[++i]);
    else if (t === "--skip-fee-wait") out.skipFeeWait = true;
    else if (t === "--stake-wei") out.stakeWei = argv[++i];
    else throw new Error(`Unknown argument: ${t}`);
  }
  return out;
}

function formatEth(wei) {
  return ethers.formatEther(wei);
}

function formatGwei(wei) {
  return ethers.formatUnits(wei, "gwei");
}

function clampMaxFee(candidateWei, hardCapWei) {
  if (!hardCapWei || hardCapWei <= 0n) return candidateWei;
  return candidateWei > hardCapWei ? hardCapWei : candidateWei;
}

async function waitForAffordableBaseFee(provider, thresholdWei, maxWaitSeconds) {
  const started = Date.now();
  while (true) {
    const block = await provider.getBlock("latest");
    const baseFee = block?.baseFeePerGas ?? 0n;
    if (baseFee <= thresholdWei) return baseFee;

    const elapsed = (Date.now() - started) / 1000;
    if (elapsed >= maxWaitSeconds) {
      throw new Error(
        `Base fee stayed above threshold for ${maxWaitSeconds}s. ` +
        `Current ${formatGwei(baseFee)} gwei > max ${formatGwei(thresholdWei)} gwei.`
      );
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// ── load files ────────────────────────────────────────────────────────────────
function loadFiles() {
  const deploymentPath = resolve(
    process.cwd(),
    "packages/protocol/deployments/AlexandrianRegistryV2.json"
  );
  const abiArtifactPath = resolve(
    process.cwd(),
    "packages/protocol/artifacts/contracts/AlexandrianRegistryV2.sol/AlexandrianRegistryV2.json"
  );
  const templatePath = resolve(process.cwd(), "ipfs/kb-f-template.json");
  const kbRecordPath = resolve(process.cwd(), "ipfs/kb-f/kb-record.json");

  const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
  const abi = JSON.parse(readFileSync(abiArtifactPath, "utf8")).abi;
  const template = JSON.parse(readFileSync(templatePath, "utf8"));
  const kbRecord = JSON.parse(readFileSync(kbRecordPath, "utf8"));

  return { deployment, abi, template, kbRecord, kbRecordPath };
}

// ── main ──────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv);
const { deployment, abi, template, kbRecord, kbRecordPath } = loadFiles();

// Validate prerequisites
if (!kbRecord.rootCid || kbRecord.rootCid === "REPLACE_WITH_ROOT_CID" || kbRecord.rootCid === "") {
  throw new Error(
    "kb-record.json.rootCid is not set. Run 'pnpm run ipfs:kb-f:pin' first to upload to IPFS."
  );
}
if (!kbRecord.artifactHash || kbRecord.artifactHash === "") {
  throw new Error(
    "kb-record.json.artifactHash is not set. Run 'pnpm run ipfs:kb-f:pin' first."
  );
}

// IPFS CID format check
const IPFS_CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[a-z2-7]{58,}|B[A-Z2-7]{58,})/;
if (!IPFS_CID_RE.test(kbRecord.rootCid)) {
  throw new Error(
    `kb-record.json.rootCid "${kbRecord.rootCid}" does not look like a real IPFS CID. ` +
    `Run 'pnpm run ipfs:kb-f:pin' to get a real CIDv1.`
  );
}

// Build full canonical envelope (template + computed artifactHash)
const envelope = { ...template, artifactHash: kbRecord.artifactHash };

// Compute kbHash
const kbHash = kbHashFromEnvelope(envelope);

console.log(`\n── KB-F Canonical Envelope ───────────────────────────`);
console.log(`  type         : ${envelope.type}`);
console.log(`  domain       : ${envelope.domain}`);
console.log(`  tier         : ${envelope.tier}`);
console.log(`  sources      : ${JSON.stringify(envelope.sources)}`);
console.log(`  artifactHash : ${envelope.artifactHash}`);
console.log(`\n── KB-F Computed kbHash ──────────────────────────────`);
console.log(`  kbHash : ${kbHash}`);
console.log(`  cid    : ${kbRecord.rootCid}  (passed separately, NOT in hash scope)`);

if (kbRecord.kbHash && kbRecord.kbHash !== "" && kbRecord.kbHash !== kbHash) {
  console.warn(`\nWARNING: kb-record.json.kbHash (${kbRecord.kbHash}) differs from computed (${kbHash}).`);
  console.warn(`This may mean the envelope template was changed after a previous publish.`);
}

if (args.dryRun) {
  console.log(`\n── Dry run — skipping publish ────────────────────────`);
  console.log(`kbHash computed. Add PRIVATE_KEY and remove --dry-run to publish.`);
  process.exit(0);
}

if (!args.privateKey) {
  console.error(`
ERROR: No private key found.

Provide the publisher wallet key (funded on Base):
  PUBLISHER_PRIVATE_KEY=<hex_key> pnpm run ipfs:kb-f:publish
  # fallback env name:
  PRIVATE_KEY=<hex_key> pnpm run ipfs:kb-f:publish
  # or on Windows PowerShell:
  $env:PUBLISHER_PRIVATE_KEY="<hex_key>"; pnpm run ipfs:kb-f:publish

The wallet needs enough ETH on Base mainnet to cover ~400k gas for publishKB.
`);
  process.exit(1);
}

// Connect to Base mainnet
const provider = new ethers.JsonRpcProvider(args.rpcUrl, { chainId: 8453, name: "base" });

let network;
try {
  network = await provider.getNetwork();
} catch (error) {
  const msg = error instanceof Error ? error.message : "unknown error";
  throw new Error(
    `Unable to reach Base RPC (${args.rpcUrl}). ` +
    `Pass --rpc-url <provider> or set BASE_RPC_URL. Underlying error: ${msg}`
  );
}
if (Number(network.chainId) !== 8453) {
  throw new Error(`Expected chainId 8453 (Base), received ${network.chainId}`);
}

const wallet = new ethers.Wallet(args.privateKey, provider);
const signerAddress = await wallet.getAddress();
const contract = new ethers.Contract(deployment.address, abi, wallet);

console.log(`\n── Base Mainnet Connection ───────────────────────────`);
console.log(`  registry : ${deployment.address}`);
console.log(`  curator  : ${signerAddress}`);
console.log(`  chainId  : ${Number(network.chainId)}`);

// Check if already published.
// Some registry versions revert with KBNotRegistered() when missing instead of
// returning an empty struct, so handle that path explicitly.
let existing = null;
try {
  existing = await contract.getKnowledgeBlock(kbHash);
} catch (error) {
  const isNotRegistered =
    (error && typeof error === "object" && "revert" in error && error.revert?.name === "KBNotRegistered") ||
    (error && typeof error === "object" && "reason" in error && error.reason === "KBNotRegistered()");
  if (!isNotRegistered) throw error;
}

if (existing?.exists) {
  console.log(`\n── Already Published ─────────────────────────────────`);
  console.log(`  kbHash   : ${kbHash}`);
  console.log(`  cid      : ${existing.cid}`);
  console.log(`  Run 'pnpm run ipfs:kb-f:onchain' to verify.`);
  process.exit(0);
}

const maxBaseFeeWei = ethers.parseUnits(args.maxBaseFeeGwei, "gwei");
const maxPriorityFeeWei = ethers.parseUnits(args.maxPriorityFeeGwei, "gwei");
const hardMaxFeeWei = args.maxFeeGwei ? ethers.parseUnits(args.maxFeeGwei, "gwei") : 0n;
const minStakeWei = await contract.minStakeAmount();
const publishStakeWei = args.stakeWei && args.stakeWei !== "" ? BigInt(args.stakeWei) : minStakeWei;
if (publishStakeWei < minStakeWei) {
  throw new Error(
    `Configured stake (${publishStakeWei} wei) is below contract minStakeAmount (${minStakeWei} wei). ` +
    `Use --stake-wei <wei> or PUBLISH_STAKE_WEI >= ${minStakeWei}.`
  );
}

let baseFeeWei;
if (args.skipFeeWait) {
  const latest = await provider.getBlock("latest");
  baseFeeWei = latest?.baseFeePerGas ?? 0n;
} else {
  console.log(`\n── Fee Strategy (low-cost mode) ─────────────────────`);
  console.log(`  max base fee      : ${args.maxBaseFeeGwei} gwei`);
  console.log(`  max priority fee  : ${args.maxPriorityFeeGwei} gwei`);
  console.log(`  max wait          : ${args.maxWaitSeconds}s`);
  baseFeeWei = await waitForAffordableBaseFee(provider, maxBaseFeeWei, args.maxWaitSeconds);
}

let maxFeePerGas = (baseFeeWei * 12n) / 10n + maxPriorityFeeWei; // 1.2x base fee headroom
maxFeePerGas = clampMaxFee(maxFeePerGas, hardMaxFeeWei);
if (maxFeePerGas <= maxPriorityFeeWei) {
  throw new Error(
    `Invalid gas caps: maxFeePerGas (${formatGwei(maxFeePerGas)} gwei) must be > maxPriorityFeePerGas (${formatGwei(maxPriorityFeeWei)} gwei).`
  );
}

const publishArgs = [
  kbHash,
  signerAddress,
  0,               // kbType: DOCUMENT (0)
  0,               // trustTier: OPEN (0)
  kbRecord.rootCid,
  "",              // embeddingCid
  envelope.domain,
  args.licenseType,
  args.queryFee,
  args.version,
  [],              // parents: no attribution links
];

const estimatedGas = await contract.publishKB.estimateGas(...publishArgs, { value: publishStakeWei });
const maxGasCostWei = estimatedGas * maxFeePerGas;
const maxTxCostWei = maxGasCostWei + publishStakeWei;
console.log(`\n── Estimated Cost ───────────────────────────────────`);
console.log(`  est gas           : ${estimatedGas.toString()}`);
console.log(`  base fee          : ${formatGwei(baseFeeWei)} gwei`);
console.log(`  max priority fee  : ${formatGwei(maxPriorityFeeWei)} gwei`);
console.log(`  max fee per gas   : ${formatGwei(maxFeePerGas)} gwei`);
console.log(`  publish stake     : ${formatEth(publishStakeWei)} ETH`);
console.log(`  max gas cost      : ${formatEth(maxGasCostWei)} ETH`);
console.log(`  max tx cost       : ${formatEth(maxTxCostWei)} ETH`);

// Publish KB-F
//
// publishKB parameters:
//   contentHash  — kbHash (computed from canonical envelope)
//   curator      — signer address
//   kbType       — 0 (DOCUMENT; first enum value)
//   trustTier    — 0 (OPEN; maps to tier:"open" in envelope)
//   cid          — real IPFS CIDv1 from pin step
//   embeddingCid — "" (no embedding)
//   domain       — envelope.domain
//   licenseType  — e.g., "CC0-1.0"
//   queryFee     — 0 (free queries)
//   version      — "1"
//   parents      — [] (no attribution links in this demo)
//
// NOTE: publishKB is payable; this script sends at least minStakeAmount.

console.log(`\n── Publishing to Base Mainnet ────────────────────────`);
console.log(`  Sending publishKB transaction...`);

const tx = await contract.publishKB(...publishArgs, {
  value: publishStakeWei,
  maxFeePerGas,
  maxPriorityFeePerGas: maxPriorityFeeWei,
});

console.log(`  tx hash  : ${tx.hash}`);
console.log(`  Waiting for confirmation...`);

const receipt = await tx.wait(1);

console.log(`\n── Published ─────────────────────────────────────────`);
console.log(`  kbHash   : ${kbHash}`);
console.log(`  publishTx: ${receipt.hash}`);
console.log(`  block    : ${receipt.blockNumber}`);
console.log(`  gas used : ${receipt.gasUsed.toString()}`);

// Update kb-record.json with kbHash and publishTx
const kbRecordUpdated = JSON.parse(readFileSync(kbRecordPath, "utf8"));
kbRecordUpdated.kbHash = kbHash;
kbRecordUpdated.publishTx = receipt.hash;
writeFileSync(kbRecordPath, JSON.stringify(kbRecordUpdated, null, 2) + "\n");
console.log(`\n  kb-record.json updated with kbHash and publishTx`);

// Print verification command
console.log(`\n── Verify end-to-end ─────────────────────────────────`);
console.log(`Run:`);
console.log(`  pnpm run ipfs:kb-f:onchain -- --gateway https://ipfs.io`);
console.log(`Expected: integrity.verdict = "verified"`);
console.log(`\nDone.\n`);
