/**
 * publish-kb-eng.mjs
 *
 * Publishes KB-ENG-1 through KB-ENG-4 to Base mainnet in topological order.
 *
 * For each KB, in order:
 *   1. Resolves PENDING_* placeholders in parentHashes using hashes computed
 *      in earlier iterations.
 *   2. Computes kbHash = keccak256(JCS(artifact_without_kbHash)) and bakes
 *      it into artifact.json, manifest.json, and meta.json on disk.
 *   3. Pins the final artifact to IPFS via Pinata; updates manifest.json rootCid.
 *   4. Calls publishKB() on the Alexandrian Registry.
 *
 * Bootstrap mode: designed for STAKE_ETH=0. Call setMinStake(0) first:
 *   node scripts/set-min-stake.mjs 0
 *
 * Required env vars:
 *   OWNER_PRIVATE_KEY  — hex private key of the publishing wallet
 *   PINATA_API_JWT     — Pinata JWT for IPFS pinning
 *
 * Optional env vars:
 *   BASE_RPC_URL       — defaults to https://mainnet.base.org
 *   STAKE_ETH          — ETH to stake per KB (default: "0" for bootstrap)
 *   DRY_RUN            — set "true" to simulate without sending transactions
 *
 * Usage:
 *   node scripts/publish-kb-eng.mjs
 *   DRY_RUN=true node scripts/publish-kb-eng.mjs
 */

import { ethers }          from "ethers";
import { createHash }      from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath }   from "url";
import { createRequire }   from "module";
import sha3pkg             from "js-sha3";

const { keccak_256 } = sha3pkg;

const require    = createRequire(import.meta.url);
const { config } = require("dotenv");

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

// ── Registry ────────────────────────────────────────────────────────────────

const REGISTRY_ADDRESS = "0xD1F216E872a9ed4b90E364825869c2F377155B29";
const GAS_LIMIT        = 3_000_000n;

const ABI = [
  "function minStakeAmount() external view returns (uint256)",
  `function publishKB(
    bytes32 contentHash,
    address curator,
    uint8   kbType,
    uint8   trustTier,
    string  cid,
    string  embeddingCid,
    string  domain,
    string  licenseType,
    uint256 queryFee,
    string  version,
    tuple(bytes32 parentHash, uint16 royaltyShareBps, bytes4 relationship)[] parents,
    bool    isSeed,
    uint8   minimumRequiredParents,
    bytes32 artifactHash
  ) external payable`,
  "error AlreadyPublished()",
  "error InsufficientStake()",
  "error NoStake()",
  "error NotEnoughParents()",
  "error SeedHasParents()",
];

// On-chain enum: 0=Practice 1=Feature 2=StateMachine 3=PromptEngineering 4=ComplianceChecklist 5=Rubric
const KB_TYPE_MAP = {
  Practice:            0,
  Feature:             1,
  StateMachine:        2,
  PromptEngineering:   3,
  ComplianceChecklist: 4,
  Rubric:              5,
};

// isSeed=true → AgentDiscovered (2), isSeed=false → AgentDerived (1)
const TRUST_TIER_SEED    = 2;
const TRUST_TIER_DERIVED = 1;

const RELATIONSHIP_PARENT = "0x70617265"; // bytes4("pare")

// ── KB publish order (topological) ──────────────────────────────────────────
//
// pendingParents: keys in parentHashes that are PENDING_* placeholders.
// The value of each key is resolved from resolvedHashes after the referenced
// KB is processed.

const KBS = [
  {
    dir: "ipfs/kb-eng-1",
    id:  "KB-ENG-1",
    // root seed — no pending parents
    pendingParents: {},
    // after this KB is hashed, store its hash under this key
    registersAs: "PENDING_KB_ENG_1",
  },
  {
    dir: "ipfs/kb-eng-2",
    id:  "KB-ENG-2",
    pendingParents: { PENDING_KB_ENG_1: null }, // filled in after KB-ENG-1
    registersAs: "PENDING_KB_ENG_2",
  },
  {
    dir: "ipfs/kb-eng-3",
    id:  "KB-ENG-3",
    pendingParents: { PENDING_KB_ENG_1: null }, // filled in after KB-ENG-1
    registersAs: "PENDING_KB_ENG_3",
  },
  {
    dir: "ipfs/kb-eng-4",
    id:  "KB-ENG-4",
    pendingParents: { PENDING_KB_ENG_3: null }, // filled in after KB-ENG-3
    registersAs: null,
  },
];

// Populated as each KB's hash is computed.
const resolvedHashes = {};

// ── JCS canonicalization (matches canonical.ts canonicalize()) ───────────────
// Same algorithm: keys sorted, no whitespace, recursive.

function canonicalize(value) {
  if (value === null) throw new Error("null not allowed in canonical input");
  if (typeof value === "boolean")  return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite number");
    return Number.isInteger(value) ? String(value) : JSON.stringify(value);
  }
  if (typeof value === "string")   return JSON.stringify(value);
  if (Array.isArray(value))        return "[" + value.map(canonicalize).join(",") + "]";
  if (typeof value === "object") {
    const keys  = Object.keys(value).sort();
    const parts = keys.map(k => JSON.stringify(k) + ":" + canonicalize(value[k]));
    return "{" + parts.join(",") + "}";
  }
  throw new Error(`Unsupported type: ${typeof value}`);
}

// kbHash = "0x" + keccak256(JCS(artifact_without_kbHash))
// Matches the approach from the gap analysis and canonical.ts contentHashFromCanonical.
function computeKbHash(artifact) {
  const { kbHash: _removed, ...withoutHash } = artifact;
  const jcs = canonicalize(withoutHash);
  return "0x" + keccak_256(jcs);
}

// ── IPFS pinning ─────────────────────────────────────────────────────────────

async function pinToIPFS(artifact, jwt, name) {
  if (!jwt) throw new Error("PINATA_API_JWT is required");
  const resp = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent:  artifact,
      pinataMetadata: { name },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Pinata ${resp.status}: ${text}`);
  }
  const { IpfsHash } = await resp.json();
  return IpfsHash;
}

// ── Parent array builder ─────────────────────────────────────────────────────

function buildParents(artifact) {
  const hashes = artifact.parentHashes ?? [];
  if (hashes.length === 0) return [];
  const totalBps  = artifact.royaltyBps ?? 0;
  const perParent = Math.floor(totalBps / hashes.length);
  return hashes.map(hash => ({
    parentHash:      hash,
    royaltyShareBps: perParent,
    relationship:    RELATIONSHIP_PARENT,
  }));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const privateKey = process.env.OWNER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl     = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
  const jwt        = process.env.PINATA_API_JWT ?? process.env.pinata_api_jwt;
  const stakeEth   = process.env.STAKE_ETH ?? "0";   // default: bootstrap mode
  const dryRun     = process.env.DRY_RUN === "true";

  if (!privateKey && !dryRun) {
    console.error("Error: OWNER_PRIVATE_KEY is required");
    process.exit(1);
  }
  if (!jwt && !dryRun) {
    console.error("Error: PINATA_API_JWT is required for IPFS pinning");
    process.exit(1);
  }

  const stakeWei = ethers.parseEther(stakeEth);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer   = privateKey ? new ethers.Wallet(privateKey, provider) : null;
  const contract = new ethers.Contract(REGISTRY_ADDRESS, ABI, signer ?? provider);

  const signerAddress = signer ? await signer.getAddress() : ethers.ZeroAddress;

  console.log("\nAlexandrian KB-ENG Publisher");
  console.log(`  RPC:       ${rpcUrl}`);
  console.log(`  Wallet:    ${signerAddress}`);
  console.log(`  Stake:     ${stakeEth} ETH per KB`);
  console.log(`  Dry run:   ${dryRun}\n`);

  if (!dryRun) {
    const minStake = await contract.minStakeAmount();
    if (minStake > stakeWei) {
      console.error(`✗ minStakeAmount = ${ethers.formatEther(minStake)} ETH, but STAKE_ETH = ${stakeEth}`);
      console.error(`  Run: node scripts/set-min-stake.mjs 0`);
      process.exit(1);
    }
    console.log(`✓ minStakeAmount = ${ethers.formatEther(minStake)} ETH`);

    const balance = await provider.getBalance(signerAddress);
    const gasBuffer = ethers.parseEther("0.002"); // ~4 Base txs buffer
    const needed    = stakeWei * BigInt(KBS.length) + gasBuffer;
    if (balance < needed) {
      console.error(`✗ Wallet ${ethers.formatEther(balance)} ETH < needed ${ethers.formatEther(needed)} ETH`);
      process.exit(1);
    }
    console.log(`✓ Wallet balance: ${ethers.formatEther(balance)} ETH\n`);
  }

  const results = [];
  let nonce = signer ? await provider.getTransactionCount(signerAddress, "pending") : 0;

  for (const { dir, id, pendingParents, registersAs } of KBS) {
    const artifactPath = resolve(__dirname, "..", dir, "artifact.json");
    const manifestPath = resolve(__dirname, "..", dir, "manifest.json");
    const metaPath     = resolve(__dirname, "..", dir, "meta.json");

    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const meta     = JSON.parse(readFileSync(metaPath,     "utf8"));

    console.log(`── ${id}: ${artifact.title}`);

    // ── Step 1: Resolve PENDING_* parent hashes ────────────────────────────
    for (const placeholder of Object.keys(pendingParents)) {
      const resolved = resolvedHashes[placeholder];
      if (!resolved) throw new Error(`${id}: hash for ${placeholder} not yet computed — check publish order`);
      for (let i = 0; i < artifact.parentHashes.length; i++) {
        if (artifact.parentHashes[i] === placeholder) {
          artifact.parentHashes[i] = resolved;
          console.log(`   resolved ${placeholder} → ${resolved}`);
        }
      }
    }

    // ── Step 2: Compute and bake kbHash ────────────────────────────────────
    let kbHash = artifact.kbHash;
    if (kbHash === "PENDING") {
      kbHash = computeKbHash(artifact);
      artifact.kbHash = kbHash;
      // Write back artifact with real hash and resolved parentHashes
      writeFileSync(artifactPath, JSON.stringify(artifact, null, 2) + "\n");
      console.log(`   kbHash computed: ${kbHash}`);

      // Update manifest
      manifest.kbHash = kbHash;
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

      // Update meta
      meta.kbHash = kbHash;
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
    } else {
      console.log(`   kbHash already set: ${kbHash}`);
    }

    // Register this hash so downstream KBs can resolve it
    if (registersAs) {
      resolvedHashes[registersAs] = kbHash;
    }

    // ── Step 3: Compute artifactHash (SHA-256 of final artifact bytes) ─────
    const finalArtifactStr = JSON.stringify(artifact, null, 2) + "\n";
    const artifactHash = "0x" + createHash("sha256").update(finalArtifactStr).digest("hex");

    const kbType    = KB_TYPE_MAP[artifact.kbType] ?? 0;
    const isSeed    = Boolean(artifact.isSeed);
    const trustTier = isSeed ? TRUST_TIER_SEED : TRUST_TIER_DERIVED;
    const parents   = buildParents(artifact);
    const minParents = isSeed ? 0 : parents.length;

    console.log(`   kbType:      ${artifact.kbType} (${kbType})`);
    console.log(`   trustTier:   ${trustTier} (${isSeed ? "AgentDiscovered/seed" : "AgentDerived"})`);
    console.log(`   isSeed:      ${isSeed}  minParents: ${minParents}`);
    console.log(`   parents:     ${parents.length}`);
    console.log(`   artifactHash: ${artifactHash}`);

    // ── Step 4: Pin to IPFS ────────────────────────────────────────────────
    let cid = manifest.rootCid;
    if (cid === "PENDING") {
      if (dryRun) {
        cid = `dry-run-cid-${id.toLowerCase()}`;
        console.log(`   [dry-run] IPFS pin skipped → ${cid}`);
      } else {
        process.stdout.write(`   Pinning to IPFS…`);
        cid = await pinToIPFS(artifact, jwt, id);
        console.log(` ✓ ${cid}`);
        manifest.rootCid = cid;
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
        console.log(`   manifest.json updated`);
      }
    } else {
      console.log(`   IPFS: already pinned → ${cid}`);
    }

    // ── Step 5: Publish to Base mainnet ────────────────────────────────────
    if (dryRun) {
      console.log(`   [dry-run] publishKB skipped\n`);
      results.push({ id, kbHash, cid, txHash: null, status: "dry-run" });
      continue;
    }

    process.stdout.write(`   Publishing to Base mainnet…`);

    let txHash, blockNumber;
    try {
      const tx = await contract.publishKB(
        kbHash,
        signerAddress,
        kbType,
        trustTier,
        cid,
        "",             // embeddingCid
        artifact.domain,
        "attribution",
        0n,             // queryFee: free
        "1.0.0",
        parents,
        isSeed,
        minParents,
        artifactHash,
        { value: stakeWei, nonce, gasLimit: GAS_LIMIT }
      );
      const receipt = await tx.wait(1);
      txHash      = receipt.hash;
      blockNumber = receipt.blockNumber;
      nonce++;
      console.log(` ✓ tx=${txHash} block=${blockNumber}\n`);
    } catch (err) {
      const msg = err?.message ?? "";
      const txBroadcast = err?.transaction != null || msg.includes("CALL_EXCEPTION");
      if (txBroadcast) nonce++;

      const gasUsed = err?.receipt?.gasUsed ?? err?.transaction?.gasLimit;
      const isAlreadyPublished =
        msg.toLowerCase().includes("alreadypublished") ||
        msg.toLowerCase().includes("already published") ||
        (msg.includes("CALL_EXCEPTION") && gasUsed != null && BigInt(gasUsed) < 100_000n);

      if (isAlreadyPublished) {
        console.log(` ~ already on-chain\n`);
        results.push({ id, kbHash, cid, txHash: null, status: "already-published" });
        continue;
      }
      console.error(` ✗ ${err.message}\n`);
      results.push({ id, kbHash, cid, txHash: null, status: "failed", error: err.message });
      continue;
    }

    results.push({ id, kbHash, cid, txHash, blockNumber, status: "ok" });
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("── Summary ───────────────────────────────────────────────────────");
  for (const r of results) {
    const icon = r.status === "ok" ? "✓" : r.status === "already-published" ? "~" : r.status === "dry-run" ? "○" : "✗";
    console.log(`  ${icon} ${r.id}`);
    console.log(`      hash: ${r.kbHash}`);
    console.log(`      cid:  ${r.cid}`);
    if (r.txHash) console.log(`      tx:   https://basescan.org/tx/${r.txHash}`);
  }

  const logPath = resolve(__dirname, "..", "ipfs", "kb-eng-publish-log.json");
  writeFileSync(logPath, JSON.stringify({ publishedAt: new Date().toISOString(), results }, null, 2) + "\n");
  console.log(`\n  Log: ${logPath}`);

  const failed = results.filter(r => r.status === "failed").length;
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
