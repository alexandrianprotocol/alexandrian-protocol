/**
 * publish-kb-ag.mjs
 *
 * Publishes KB-AG-1, KB-AG-2, KB-AG-3 to Base mainnet in topological order.
 * Pins each artifact.json to IPFS via Pinata, updates manifest.json rootCid,
 * then calls publishKB() on the Alexandrian Registry.
 *
 * Required env vars:
 *   OWNER_PRIVATE_KEY  — hex private key of the publishing wallet
 *   PINATA_API_JWT     — Pinata JWT for IPFS pinning
 *
 * Optional env vars:
 *   BASE_RPC_URL       — defaults to https://mainnet.base.org
 *   STAKE_ETH          — ETH to stake per KB (default: "0.001")
 *   DRY_RUN            — set "true" to simulate without sending transactions
 *
 * Usage:
 *   node scripts/publish-kb-ag.mjs
 *   DRY_RUN=true node scripts/publish-kb-ag.mjs
 *   STAKE_ETH=0 node scripts/publish-kb-ag.mjs   # requires setMinStake(0) first
 */

import { ethers }          from "ethers";
import { createHash }      from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath }   from "url";
import { createRequire }   from "module";

const require    = createRequire(import.meta.url);
const { config } = require("dotenv");

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

// ── Config ─────────────────────────────────────────────────────────────────────

const REGISTRY_ADDRESS = "0xD1F216E872a9ed4b90E364825869c2F377155B29";
const GAS_LIMIT        = 3_000_000n;

// V2 publishKB signature — includes isSeed, minimumRequiredParents, artifactHash
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

// On-chain enum: 0=HumanStaked 1=AgentDerived 2=AgentDiscovered
// isSeed=true → AgentDiscovered (2), isSeed=false → AgentDerived (1)
const TRUST_TIER_SEED   = 2;
const TRUST_TIER_DERIVED = 1;

const RELATIONSHIP_PARENT = "0x70617265"; // bytes4("pare")

// ── KB definitions in publish order ────────────────────────────────────────────

const KBS = [
  { dir: "ipfs/kb-ag-1", id: "KB-AG-1" },
  { dir: "ipfs/kb-ag-2", id: "KB-AG-2" },
  { dir: "ipfs/kb-ag-3", id: "KB-AG-3" },
];

// ── IPFS pinning ───────────────────────────────────────────────────────────────

async function pinToIPFS(artifact, jwt, name) {
  if (!jwt) throw new Error("PINATA_API_JWT is required for IPFS pinning");

  const resp = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
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

// ── Build parents array from artifact ─────────────────────────────────────────

function buildParents(artifact) {
  const hashes = artifact.parentHashes ?? [];
  if (hashes.length === 0) return [];

  const totalBps  = artifact.royaltyBps ?? 0;
  const perParent = Math.floor(totalBps / hashes.length);

  return hashes.map((hash) => ({
    parentHash:      hash,
    royaltyShareBps: perParent,
    relationship:    RELATIONSHIP_PARENT,
  }));
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const privateKey = process.env.OWNER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl     = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
  const jwt        = process.env.PINATA_API_JWT;
  const stakeEth   = process.env.STAKE_ETH ?? "0.001";
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

  console.log("\nAlexandrian KB-AG Publisher");
  console.log(`  RPC:       ${rpcUrl}`);
  console.log(`  Wallet:    ${signerAddress}`);
  console.log(`  Stake:     ${stakeEth} ETH per KB`);
  console.log(`  Dry run:   ${dryRun}\n`);

  if (!dryRun) {
    const minStake = await contract.minStakeAmount();
    if (minStake > stakeWei) {
      console.error(`✗ minStakeAmount = ${ethers.formatEther(minStake)} ETH, but STAKE_ETH = ${stakeEth}`);
      console.error(`  Either increase STAKE_ETH or call setMinStake(0) first`);
      process.exit(1);
    }
    console.log(`✓ minStakeAmount = ${ethers.formatEther(minStake)} ETH`);

    const balance = await provider.getBalance(signerAddress);
    const needed  = stakeWei * BigInt(KBS.length) + ethers.parseEther("0.002"); // gas buffer (~3 Base txs)
    if (balance < needed) {
      console.error(`✗ Wallet balance ${ethers.formatEther(balance)} ETH < needed ${ethers.formatEther(needed)} ETH`);
      process.exit(1);
    }
    console.log(`✓ Wallet balance: ${ethers.formatEther(balance)} ETH\n`);
  }

  const results = [];
  let nonce = signer ? await provider.getTransactionCount(signerAddress, "pending") : 0;

  for (const { dir, id } of KBS) {
    const artifactPath = resolve(__dirname, "..", dir, "artifact.json");
    const manifestPath = resolve(__dirname, "..", dir, "manifest.json");

    const artifactRaw  = readFileSync(artifactPath);
    const artifact     = JSON.parse(artifactRaw);
    const manifest     = JSON.parse(readFileSync(manifestPath, "utf8"));

    const contentHash  = artifact.kbHash;
    const kbType       = KB_TYPE_MAP[artifact.kbType] ?? 0;
    const isSeed       = Boolean(artifact.isSeed);
    const trustTier    = isSeed ? TRUST_TIER_SEED : TRUST_TIER_DERIVED;
    const parents      = buildParents(artifact);
    const minParents   = isSeed ? 0 : parents.length;
    const artifactHash = "0x" + createHash("sha256").update(artifactRaw).digest("hex");

    console.log(`── ${id}: ${artifact.title}`);
    console.log(`   contentHash: ${contentHash}`);
    console.log(`   kbType:      ${artifact.kbType} (${kbType})`);
    console.log(`   trustTier:   ${trustTier} (${isSeed ? "AgentDiscovered/seed" : "AgentDerived"})`);
    console.log(`   isSeed:      ${isSeed}  minParents: ${minParents}`);
    console.log(`   parents:     ${parents.length}`);
    console.log(`   artifactHash: ${artifactHash}`);

    // Step 1: Pin to IPFS
    let cid = manifest.rootCid;
    if (cid === "PENDING") {
      if (dryRun) {
        cid = `dry-run-cid-${id.toLowerCase()}`;
        console.log(`   [dry-run] IPFS pin skipped → placeholder cid`);
      } else {
        process.stdout.write(`   Pinning to IPFS…`);
        cid = await pinToIPFS(artifact, jwt, id);
        console.log(` ✓ ${cid}`);

        // Update manifest with real CID
        manifest.rootCid = cid;
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
        console.log(`   manifest.json updated`);
      }
    } else {
      console.log(`   IPFS: already pinned → ${cid}`);
    }

    // Step 2: Publish to Base mainnet
    if (dryRun) {
      console.log(`   [dry-run] publishKB skipped\n`);
      results.push({ id, contentHash, cid, txHash: null, status: "dry-run" });
      continue;
    }

    process.stdout.write(`   Publishing to Base mainnet…`);

    let txHash, blockNumber;
    try {
      const tx = await contract.publishKB(
        contentHash,
        signerAddress,
        kbType,
        trustTier,
        cid,
        "",                   // embeddingCid
        artifact.domain,
        "attribution",
        0n,                   // queryFee: free
        "1.0.0",
        parents,
        isSeed,
        minParents,
        artifactHash,
        { value: stakeWei, nonce, gasLimit: GAS_LIMIT }
      );

      const receipt = await tx.wait(1);
      txHash = receipt.hash;
      blockNumber = receipt.blockNumber;
      nonce++;
      console.log(` ✓ tx=${txHash} block=${blockNumber}\n`);
    } catch (err) {
      const msg = err?.message ?? "";
      // Always increment nonce if the tx was broadcast (revert still consumes nonce)
      const txBroadcast = err?.transaction != null || msg.includes("CALL_EXCEPTION");
      if (txBroadcast) nonce++;

      // Base mainnet often returns reason=null; detect AlreadyPublished by low gas usage (cheap revert < 50k)
      const gasUsed = err?.receipt?.gasUsed ?? err?.transaction?.gasLimit;
      const isAlreadyPublished =
        msg.toLowerCase().includes("alreadypublished") ||
        msg.toLowerCase().includes("already published") ||
        (msg.includes("CALL_EXCEPTION") && gasUsed != null && BigInt(gasUsed) < 100_000n);
      if (isAlreadyPublished) {
        console.log(` ~ already on-chain\n`);
        results.push({ id, contentHash, cid, txHash: null, status: "already-published" });
        continue;
      }
      console.error(` ✗ ${err.message}\n`);
      results.push({ id, contentHash, cid, txHash: null, status: "failed", error: err.message });
      continue;
    }

    results.push({ id, contentHash, cid, txHash, blockNumber, status: "ok" });
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log("── Summary ───────────────────────────────────────────────────────");
  for (const r of results) {
    const statusIcon = r.status === "ok" ? "✓" : r.status === "already-published" ? "~" : r.status === "dry-run" ? "○" : "✗";
    console.log(`  ${statusIcon} ${r.id}`);
    console.log(`      hash:  ${r.contentHash}`);
    console.log(`      cid:   ${r.cid}`);
    if (r.txHash) {
      console.log(`      tx:    https://basescan.org/tx/${r.txHash}`);
    }
  }

  const logPath = resolve(__dirname, "..", "ipfs", "kb-ag-publish-log.json");
  writeFileSync(logPath, JSON.stringify({ publishedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\n  Log: ${logPath}`);

  const failed = results.filter(r => r.status === "failed").length;
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
