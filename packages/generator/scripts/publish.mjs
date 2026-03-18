/**
 * publish-refined.mjs
 *
 * Publishes all KBs from staging/refined/ to Base mainnet via publishKB().
 * Requires setMinStake(0) to have been called first (bootstrapping mode).
 *
 * Required env vars:
 *   OWNER_PRIVATE_KEY  — hex private key of the publishing wallet
 *
 * Optional env vars:
 *   BASE_RPC_URL       — Base mainnet RPC URL (default: https://mainnet.base.org)
 *   PINATA_API_JWT     — Pinata JWT for real IPFS pinning; uses stable placeholder if absent
 *   CONCURRENCY        — parallel tx slots, max 10 (default: 3)
 *   DRY_RUN            — set "true" to simulate without sending transactions
 *
 * Usage:
 *   node scripts/publish-refined.mjs
 *   DRY_RUN=true node scripts/publish-refined.mjs
 *   CONCURRENCY=5 node scripts/publish-refined.mjs
 *
 * Resume: already-published files are moved to staging/published/ automatically.
 * Re-running will skip them.
 */

import { ethers } from "ethers";
import { readFileSync, readdirSync, mkdirSync, renameSync, writeFileSync, existsSync } from "fs";
import { join, basename, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require    = createRequire(import.meta.url);
const { config } = require("dotenv");

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from repo root (two levels up from scripts/)
config({ path: resolve(__dirname, "../../../.env") });

// ── Config ─────────────────────────────────────────────────────────────────────

const REGISTRY_ADDRESS = "0xD1F216E872a9ed4b90E364825869c2F377155B29";
const ZERO_HASH        = "0x" + "00".repeat(32);
const GAS_LIMIT        = 500_000n; // deployed contract costs ~405k gas; 500k gives safe headroom

// ── Minimal ABI (publishKB + minStakeAmount + custom errors) ───────────────────

const ABI = [
  // State read
  "function minStakeAmount() external view returns (uint256)",

  // Core write — deployed contract does NOT have isSeed, minimumRequiredParents, or artifactHash
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
    tuple(bytes32 parentHash, uint16 royaltyShareBps, bytes4 relationship)[] parents
  ) external payable`,

  // Custom errors — required for classifyError()
  "error AlreadyPublished()",
  "error DomainRequired()",
  "error InsufficientStake()",
  "error NoStake()",
  "error Paused()",
];

// ── kbType mapping ─────────────────────────────────────────────────────────────
// On-chain enum: 0=Practice 1=Feature 2=StateMachine 3=PromptEngineering 4=ComplianceChecklist 5=Rubric
//
// Primary source: artifact.identity.kb_type (off-chain KBType string)
// Domain-based overrides apply on top for cases where domain signals stronger intent.

const KB_TYPE_FROM_IDENTITY = {
  procedure:    0, // Practice
  pattern:      0, // Practice
  heuristic:    0, // Practice
  protocol:     0, // Practice
  context:      0, // Practice
  anti_pattern: 0, // Practice
  transformation: 1, // Feature
  artifact_spec:  1, // Feature
  constraint:   4, // ComplianceChecklist
  invariant:    4, // ComplianceChecklist
  evaluation:   5, // Rubric
};

function artifactToKbType(artifact, domain = "") {
  const kbType = artifact?.identity?.kb_type ?? "";
  const d = domain.toLowerCase();

  // Domain-based overrides take precedence for unambiguous signals
  if (d.startsWith("meta.") || d.startsWith("agent.reasoning") || d.startsWith("agent.prompt")) {
    return 3; // PromptEngineering
  }
  if (d.includes("state") || d.includes("fsm") || d.includes("machine")) {
    return 2; // StateMachine
  }
  if (d.includes("compliance") || d.includes("checklist") || d.includes("audit")) {
    return 4; // ComplianceChecklist
  }

  // Fall back to identity.kb_type mapping
  return KB_TYPE_FROM_IDENTITY[kbType] ?? 0; // default: Practice
}

// ── trustTier mapping ──────────────────────────────────────────────────────────
// On-chain: 0=HumanStaked 1=AgentDerived 2=AgentDiscovered
// Seeds (no parents, AI-generated) = AgentDiscovered (2)
// Derived (has parents, AI-composed) = AgentDerived (1)

function artifactToTrustTier(isSeed) {
  return isSeed ? 2 : 1;
}

// ── Parents construction ───────────────────────────────────────────────────────
// Reads knowledge_inputs.used[] from the artifact and maps to AttributionLink[].
// royaltyShareBps is split evenly from provenance.royalty_bps (default 250).
// relationship is a bytes4 derived from the parent role string.

const ROLE_BYTES4 = {
  parent:    "0x70617265", // "pare"
  reference: "0x72656665", // "refe"
  evidence:  "0x65766964", // "evid"
};
const DEFAULT_ROLE_BYTES4 = "0x70617265";

function buildParents(artifact) {
  const used = artifact?.knowledge_inputs?.used ?? [];
  if (used.length === 0) return [];

  const totalBps  = artifact?.provenance?.royalty_bps ?? 250;
  const perParent = Math.floor(totalBps / used.length);

  return used.map((ref) => ({
    parentHash:      ref.kb_id.startsWith("0x") ? ref.kb_id : "0x" + ref.kb_id,
    royaltyShareBps: perParent,
    relationship:    ROLE_BYTES4[ref.role] ?? DEFAULT_ROLE_BYTES4,
  }));
}

// ── IPFS pinning with retry ────────────────────────────────────────────────────
// Retries on 429 (rate limit) and 5xx (server errors) with exponential backoff.
// Fails immediately on 4xx client errors (bad payload, auth failure, etc.).

async function pinToIPFS(contentHash, artifact, jwt, maxRetries = 3) {
  if (!jwt) {
    // Stable deterministic placeholder — clearly fake, can be patched later
    return `placeholder-${contentHash.slice(2, 18)}`;
  }

  const baseDelay = 1_000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      await new Promise((r) => setTimeout(r, Math.round(delay + jitter)));
      console.log(`  [pinata] retry ${attempt}/${maxRetries} for ${contentHash.slice(0, 10)}…`);
    }

    const resp = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: artifact,
        pinataMetadata: { name: contentHash },
      }),
      signal: AbortSignal.timeout(30_000), // 30s timeout per attempt
    });

    if (resp.ok) {
      const { IpfsHash } = await resp.json();
      return IpfsHash;
    }

    // 429 or 5xx: retryable
    if (resp.status === 429 || resp.status >= 500) {
      if (attempt < maxRetries) {
        const retryAfter = resp.headers.get("Retry-After");
        if (retryAfter) {
          await new Promise((r) => setTimeout(r, parseInt(retryAfter, 10) * 1_000));
        }
        continue;
      }
    }

    // Non-retryable client error
    throw new Error(`Pinata ${resp.status}: ${await resp.text()}`);
  }

  throw new Error(`Pinata: exhausted ${maxRetries} retries for ${contentHash.slice(0, 10)}…`);
}

// ── Secondary IPFS pinning (IPFS Pinning Service API spec) ────────────────────
// Accepts any PSA-compatible endpoint (Filebase, Pinata v2, etc.).
// This is always best-effort: a failure logs a warning but does NOT fail the publish.
// The secondary pin is submitted AFTER the CID is known from the primary pinner.
//
// PSA spec: POST /pins  body: { cid, name }
//           Auth: Bearer <token>
// Filebase: endpoint = https://api.filebase.io/v1/ipfs
// Pinata v2: endpoint = https://api.pinata.cloud/psa
//
// Returns the remote pin object on success; throws on failure.

async function pinToSecondaryIPFS(cid, name, endpoint, token) {
  const url  = endpoint.replace(/\/$/, "") + "/pins";
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cid, name }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Secondary pinner ${resp.status}: ${body.slice(0, 200)}`);
  }

  return resp.json();
}

// ── artifactHash computation ───────────────────────────────────────────────────
// When bundled metadata is absent, compute keccak256 of the canonical artifact JSON
// rather than falling back to ZERO_HASH (which breaks on-chain integrity checks).

function computeArtifactHash(artifact) {
  // Strip internal metadata fields that aren't part of the canonical content
  const { _quality, kbHash, generatorVersion, status, generatedAt, domain: _d, isSeed: _s, ...rest } = artifact;
  const canonical = JSON.stringify(rest, Object.keys(rest).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}

// ── Error classification ───────────────────────────────────────────────────────

const iface = new ethers.Interface(ABI);

function classifyError(err) {
  const data = err?.data ?? err?.error?.data ?? "";
  if (data) {
    try {
      const decoded = iface.parseError(data);
      if (decoded?.name) return decoded.name;
    } catch { /* not a known custom error */ }
  }
  const msg = (err?.message ?? "").toLowerCase();
  if (msg.includes("nonce too low")                      ) return "NonceConflict";
  if (msg.includes("replacement transaction underpriced") ) return "NonceConflict";
  if (msg.includes("nonce has already been used")        ) return "NonceConflict";
  if (msg.includes("insufficient funds")                 ) return "InsufficientFunds";
  if (msg.includes("already published")                  ) return "AlreadyPublished";
  return "Unknown";
}

// ── Single file publish ────────────────────────────────────────────────────────

async function publishOne({ filePath, bundledDir, contract, signerAddress, publishedDir, jwt, secondaryIPFS, nonce, dryRun }) {
  const raw   = readFileSync(filePath, "utf8");
  const entry = JSON.parse(raw);

  // Support both QueueRecord shape ({ artifact, domain, isSeed, ... })
  // and flat artifact shape (entry IS the artifact with extra metadata fields).
  const artifact = entry.artifact ?? entry;
  const domain   = entry.domain ?? artifact.semantic?.domain ?? "meta.protocol";
  const isSeed   = entry.isSeed ?? artifact.identity?.is_seed ?? true;
  const version  = artifact.identity?.version ?? "1.0.0";
  const curator  = artifact.provenance?.author?.address || signerAddress;
  const license  = artifact.provenance?.licenseType ?? "attribution";

  // contentHash IS the filename (e.g. "0xabc123...def.json" → "0xabc123...def")
  const filename    = basename(filePath, ".json");
  const contentHash = filename.startsWith("0x") ? filename : "0x" + filename;

  // Prefer pre-computed IPFS bundle (rootCid + artifactHash) from staging/bundled/
  const bundledFile = bundledDir ? join(bundledDir, filename + ".json") : null;
  let cid, artifactHash;

  if (bundledFile && existsSync(bundledFile)) {
    const bundled = JSON.parse(readFileSync(bundledFile, "utf8"));
    cid          = bundled.rootCid;
    artifactHash = bundled.artifactHash ?? computeArtifactHash(entry);
  } else {
    // Fallback: inline pin + compute hash locally (never use ZERO_HASH)
    const { _quality, ...cleanArtifact } = entry;
    cid          = await pinToIPFS(contentHash, cleanArtifact, jwt);
    artifactHash = computeArtifactHash(entry);
  }

  // ── Secondary IPFS pin (best-effort) ─────────────────────────────────────────
  // Fire-and-forget after CID is known. Never blocks or fails the publish.
  if (secondaryIPFS?.endpoint && secondaryIPFS?.token && !cid.startsWith("placeholder-")) {
    pinToSecondaryIPFS(cid, contentHash, secondaryIPFS.endpoint, secondaryIPFS.token)
      .then(() => {
        console.log(`  [secondary-ipfs] pinned ${cid.slice(0, 16)}… to ${secondaryIPFS.endpoint}`);
      })
      .catch((err) => {
        console.warn(`  [secondary-ipfs] warning: ${err.message} (non-fatal)`);
      });
  }

  const kbType    = artifactToKbType(artifact, domain);
  const trustTier = artifactToTrustTier(isSeed);
  const parents   = buildParents(artifact);

  if (dryRun) {
    console.log(
      `[dry-run] ${contentHash.slice(0, 10)}… domain=${domain} kbType=${kbType} ` +
      `trustTier=${trustTier} isSeed=${isSeed} parents=${parents.length} ` +
      `cid=${cid.slice(0, 20)} artifactHash=${artifactHash.slice(0, 14)}…`
    );
    return { contentHash, txHash: null, cid, artifactHash, status: "dry-run" };
  }

  // Guard: check on-chain before submitting — handles the case where a prior
  // ECONNRESET dropped the receipt but the tx already landed on-chain.
  const alreadyOnChain = await contract.isRegistered(contentHash).catch(() => false);
  if (alreadyOnChain) {
    renameSync(filePath, join(publishedDir, basename(filePath)));
    console.log(`~ ${contentHash.slice(0, 10)}… already on-chain, moved to published/`);
    return { contentHash, txHash: null, status: "already-published" };
  }

  const tx = await contract.publishKB(
    contentHash,
    curator,
    kbType,
    trustTier,
    cid,
    "",           // embeddingCid: not yet computed
    domain,
    license,
    0n,           // queryFee: free during bootstrap
    version,
    parents,
    { value: 0n, nonce, gasLimit: GAS_LIMIT }
  );

  const receipt = await tx.wait(1);

  // Move to staging/published/ to prevent re-publishing on next run
  renameSync(filePath, join(publishedDir, basename(filePath)));

  console.log(`✓ ${contentHash.slice(0, 10)}… tx=${receipt.hash} block=${receipt.blockNumber}`);
  return { contentHash, txHash: receipt.hash, cid, artifactHash, status: "ok", block: receipt.blockNumber };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const privateKey  = process.env.OWNER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl      = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
  const jwt         = process.env.PINATA_API_JWT;
  const concurrency = Math.min(parseInt(process.env.CONCURRENCY ?? "3", 10), 10);
  const dryRun      = process.env.DRY_RUN === "true";

  // Secondary IPFS provider (IPFS Pinning Service API spec — optional)
  const secondaryIPFS = (process.env.SECONDARY_IPFS_ENDPOINT && process.env.SECONDARY_IPFS_TOKEN)
    ? { endpoint: process.env.SECONDARY_IPFS_ENDPOINT, token: process.env.SECONDARY_IPFS_TOKEN }
    : null;

  if (!privateKey && !dryRun) {
    console.error("Error: OWNER_PRIVATE_KEY env var is required");
    console.error("  export OWNER_PRIVATE_KEY=0x...");
    console.error("  Or run with DRY_RUN=true to simulate");
    process.exit(1);
  }

  const provider      = new ethers.JsonRpcProvider(rpcUrl);
  const signer        = privateKey ? new ethers.Wallet(privateKey, provider) : null;
  const signerAddress = signer ? await signer.getAddress() : ethers.ZeroAddress;
  const contract      = new ethers.Contract(REGISTRY_ADDRESS, ABI, signer ?? provider);

  // Safety gate: verify minStakeAmount = 0 before submitting any transactions
  if (!dryRun) {
    const minStake = await contract.minStakeAmount();
    if (minStake !== 0n) {
      console.error(`\n✗ minStakeAmount = ${minStake} wei (expected 0)`);
      console.error("  Call setMinStake(0) first:");
      console.error(`  cast send ${REGISTRY_ADDRESS} "setMinStake(uint256)" 0 \\`);
      console.error(`    --rpc-url ${rpcUrl} --private-key $OWNER_PRIVATE_KEY`);
      process.exit(1);
    }
    console.log("✓ minStakeAmount = 0 confirmed");
  }

  // Paths
  const stagingDir   = join(__dirname, "..", "staging");
  const refinedDir   = join(stagingDir, "refined");
  const bundledDir   = join(stagingDir, "bundled");
  const publishedDir = join(stagingDir, "published");
  const logPath      = join(stagingDir, "publish-log.jsonl");

  mkdirSync(publishedDir, { recursive: true });

  // All refined files, excluding anything already published
  const alreadyDone = new Set(readdirSync(publishedDir));
  const files = readdirSync(refinedDir)
    .filter((f) => f.endsWith(".json") && !alreadyDone.has(f))
    .sort();

  const bundledCount = existsSync(bundledDir)
    ? readdirSync(bundledDir).filter(f => f.endsWith(".json")).length
    : 0;

  console.log(`\nAlexandrian KB Publisher`);
  console.log(`  RPC:         ${rpcUrl}`);
  console.log(`  Wallet:      ${signerAddress}`);
  console.log(`  To publish:  ${files.length} KBs`);
  console.log(`  Skipping:    ${alreadyDone.size} already published`);
  console.log(`  Bundled:     ${bundledCount} pre-computed IPFS bundles`);
  console.log(`  Concurrency: ${concurrency} parallel slots`);
  console.log(`  IPFS:        ${jwt ? "Pinata (with retry)" : "placeholder CIDs for unbundled KBs"}`);
  console.log(`  Secondary:   ${secondaryIPFS ? `${secondaryIPFS.endpoint} (PSA, best-effort)` : "not configured"}`);
  console.log(`  Dry run:     ${dryRun}\n`);

  if (files.length === 0) {
    console.log("Nothing to publish. All refined KBs are already in staging/published/.");
    return;
  }

  // ── Nonce management ──────────────────────────────────────────────────────────
  let nonce = signer
    ? await provider.getTransactionCount(signerAddress, "pending")
    : 0;

  let published = 0, skipped = 0, failed = 0;
  const startTime = Date.now();

  // ── Sequential batch loop ─────────────────────────────────────────────────────
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);

    const tasks = batch.map((file, j) =>
      publishOne({
        filePath:    join(refinedDir, file),
        bundledDir,
        contract,
        signerAddress,
        publishedDir,
        jwt,
        secondaryIPFS,
        nonce: nonce + j,
        dryRun,
      })
        .then((result) => {
          writeFileSync(
            logPath,
            JSON.stringify({ ...result, ts: new Date().toISOString() }) + "\n",
            { flag: "a" }
          );
          published++;
        })
        .catch((err) => {
          const kind = classifyError(err);
          writeFileSync(
            logPath,
            JSON.stringify({ file, error: err.message, kind, ts: new Date().toISOString() }) + "\n",
            { flag: "a" }
          );

          if (kind === "AlreadyPublished") {
            console.log(`~ ${basename(file, ".json").slice(0, 10)}… already on-chain, skipping`);
            try { renameSync(join(refinedDir, file), join(publishedDir, file)); } catch { /* ignore */ }
            skipped++;
          } else if (kind === "NonceConflict") {
            console.error(`⚠ nonce conflict on ${file} — will retry on next run`);
            failed++;
          } else {
            console.error(`✗ ${basename(file, ".json").slice(0, 10)}… [${kind}]: ${err.message}`);
            failed++;
          }
        })
    );

    await Promise.all(tasks);
    nonce += batch.length;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const done    = Math.min(i + concurrency, files.length);
    const rate    = published > 0 ? (published / Math.max(1, elapsed) * 60).toFixed(1) : "—";
    process.stdout.write(
      `  ${done}/${files.length} | ✓${published} ~${skipped} ✗${failed} | ${rate} KB/min | ${elapsed}s\r`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n── Summary ──────────────────────────────`);
  console.log(`  Published:  ${published}`);
  console.log(`  Skipped:    ${skipped}  (already on-chain)`);
  console.log(`  Failed:     ${failed}`);
  console.log(`  Duration:   ${elapsed}s`);
  console.log(`  Log:        ${logPath}`);

  if (failed > 0) {
    console.log(`\n  Re-run to retry ${failed} failed KB(s). They remain in staging/refined/.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
