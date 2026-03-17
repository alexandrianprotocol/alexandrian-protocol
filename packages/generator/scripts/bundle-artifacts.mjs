/**
 * bundle-artifacts.mjs
 *
 * Transforms each KB in staging/refined/ into a canonical IPFS bundle:
 *   artifact.json  — schema v2.5, canonical hash target (strip _quality etc.)
 *   manifest.json  — file listing + bundle metadata
 *   meta.json      — lightweight indexer sidecar
 *
 * Pins the 3-file directory to IPFS via Pinata or Filebase.
 * Computes artifactHash = keccak256(artifact.json bytes).
 * Writes staging/bundled/{kbHash}.json = { rootCid, artifactHash, title, domain, bundledAt }.
 *
 * Required env vars (unless DRY_RUN=true):
 *   IPFS_PROVIDER    — "filebase" (default) or "pinata"
 *
 *   For Pinata:
 *     PINATA_API_JWT        — Pinata JWT (pinata.cloud → API Keys → New Key)
 *
 *   For Filebase (free 5 GB):
 *     FILEBASE_ACCESS_KEY   — Access key  (filebase.com → Security Credentials)
 *     FILEBASE_SECRET_KEY   — Secret key  (same page)
 *     FILEBASE_BUCKET       — IPFS-enabled bucket name (create in Filebase dashboard)
 *                             Gateway for reads: https://ipfs.filebase.io/ipfs/{cid}
 *                             rootCid points directly to artifact.json (not a directory)
 *
 * Optional env vars:
 *   CONCURRENCY      — parallel slots, max 10 (default: 3)
 *   DRY_RUN          — "true" to simulate without calling any IPFS provider
 *   REFINED_DIR      — override staging/refined/ path
 *   BUNDLED_DIR      — override staging/bundled/ path
 *
 * Usage:
 *   # Pinata (default)
 *   PINATA_API_JWT=eyJ... node scripts/bundle-artifacts.mjs
 *
 *   # Filebase (free 5 GB, simple API key, Sia/Storj/Filecoin-backed)
 *   IPFS_PROVIDER=filebase FILEBASE_ACCESS_KEY=... FILEBASE_SECRET_KEY=... FILEBASE_BUCKET=... node scripts/bundle-artifacts.mjs
 *
 *   # Dry run (no uploads)
 *   DRY_RUN=true node scripts/bundle-artifacts.mjs
 *
 * Resume: already-bundled kbHashes are skipped (bundled/{kbHash}.json exists).
 */

import { createRequire } from "module";
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join, basename, dirname, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const require  = createRequire(import.meta.url);

// Load .env from repo root (two levels up from scripts/)
const { config } = require("dotenv");
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });
const { keccak_256 }              = require("js-sha3");
const { createHmac, createHash }  = require("crypto");

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────────

const PINATA_URL       = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const FILEBASE_S3_HOST = "s3.filebase.com";
const SCHEMA_VER       = "2.5";
const NOW              = new Date().toISOString();

// ── Slug utility ───────────────────────────────────────────────────────────────

function slugify(str) {
  return String(str).toLowerCase()
    .replace(/[<>]=?/g, m => ({ "<": "lt", ">": "gt", "<=": "lte", ">=": "gte" }[m] ?? m))
    .replace(/!=/g, "neq").replace(/=/g, "eq")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

// ── Domain helpers ─────────────────────────────────────────────────────────────

function domainToKbType(domain = "") {
  const d = domain.toLowerCase();
  if (d.startsWith("meta.")                                            ) return "PromptEngineering";
  if (d.startsWith("agent.reasoning") || d.startsWith("agent.prompt") ) return "PromptEngineering";
  if (d.includes("state") || d.includes("fsm") || d.includes("machine")) return "StateMachine";
  if (d.includes("compliance") || d.includes("checklist") || d.includes("audit") || d.startsWith("knowledge.")) return "ComplianceChecklist";
  return "Practice";
}

function domainToEpistemicType(domain = "") {
  const d = domain.toLowerCase();
  if (d.startsWith("evm.") || d.includes("blockchain") || d.includes("web3")) return "empirical";
  if (d.startsWith("agent.") || d.startsWith("meta."))                        return "heuristic";
  return "procedural";
}

// Extract machine-readable assertion clauses from procedure + verification strings.
// Source text contains patterns like: "assert error_count < 1 and result_valid = true"
// These become the only concrete metrics in the KB — don't discard them.
function extractMetrics(procedure = [], verification = []) {
  const sources = [...procedure, ...verification].map(s => (typeof s === "string" ? s : ""));
  const seen    = new Set();
  const metrics = [];
  for (const text of sources) {
    // Match every "assert <clause>" — stops at semicolon or newline.
    // Do NOT stop at "." so decimal values like "< 0.001" are captured intact.
    // Trim trailing sentence-end period from the captured clause.
    for (const m of text.matchAll(/\bassert\s+([^;\n]{4,120})/gi)) {
      const metric = m[1].trim().replace(/\.$/, "").replace(/\s+/g, " ");
      if (metric.length >= 4 && !seen.has(metric)) { seen.add(metric); metrics.push(metric); }
    }
  }
  return metrics;
}

// ── Semantic graph builder (meta.json only — does NOT affect artifactHash) ─────
//
// Turns the KB's procedure, references, log clauses, and assertion metrics into
// a nodes + edges graph that AI agents can traverse without parsing free text.
//
// Node types : kb | step | output | tool | assertion | reference
// Edge types : starts_with | precedes | produces | logged_to | uses | asserts | references

// Tools that appear verbatim in KB procedure text and are worth surfacing as nodes.
const KNOWN_TOOLS = new Set([
  "prometheus", "grafana", "postman", "datadog", "opentelemetry", "jaeger",
  "elasticsearch", "kibana", "splunk", "pagerduty", "zipkin", "honeycomb",
  "terraform", "kubernetes", "helm", "docker", "jenkins",
  "owasp zap", "jmeter", "apache jmeter", "junit", "jmh",
  "neo4j", "redis", "postgres", "postgresql", "mysql", "mongodb", "cassandra",
  "explain analyze", "sparql", "shacl",
]);

// Extract { stepIndex → { outputs: string[], logTarget: string } } from log clauses.
// Source: "log operation_duration_ms and result_code to audit trail"
function extractLogOutputs(procedure) {
  const result = new Map();
  const pat = /\blog\s+([^;.\n]+?)\s+to\s+([\w\s_]+?)(?:\s+using|\s+via|\s+by|\s+for|[;.\n]|$)/gi;
  procedure.forEach((text, i) => {
    if (typeof text !== "string") return;
    const outputs = []; let logTarget = null;
    for (const m of text.matchAll(pat)) {
      const items = m[1].split(/\s+and\s+/i)
        .map(s => s.trim().replace(/\s+/g, "_"))
        .filter(s => s.length > 2 && s.length < 50);
      logTarget = m[2].trim().toLowerCase().replace(/\s+/g, "_").slice(0, 40);
      outputs.push(...items);
    }
    if (outputs.length) result.set(i, { outputs: [...new Set(outputs)], logTarget });
  });
  return result;
}

// Extract { stepIndex → string[] } of named tool mentions per step.
function extractToolMentions(procedure) {
  const result = new Map();
  const explicitPat = /using\s+(?:tools?\s+like\s+)([A-Z][A-Za-z0-9\s]{1,38}?)(?:\s+to|\s+for|,|\.|;)/g;
  procedure.forEach((text, i) => {
    if (typeof text !== "string") return;
    const found = new Set();
    for (const m of text.matchAll(explicitPat)) found.add(m[1].trim());
    const lower = text.toLowerCase();
    for (const tool of KNOWN_TOOLS) {
      if (lower.includes(tool)) {
        // Restore title-case for display
        found.add(tool.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
      }
    }
    if (found.size) result.set(i, [...found]);
  });
  return result;
}

function buildSemanticGraph(entry, metrics) {
  const procedure  = entry.procedure  ?? [];
  const references = entry.references ?? [];
  const nodes = [], edges = [];
  const edgeSeen = new Set();

  function addEdge(from, rel, to) {
    const key = `${from}|${rel}|${to}`;
    if (!edgeSeen.has(key)) { edgeSeen.add(key); edges.push({ from, rel, to }); }
  }

  // KB root — entry point for graph traversal
  nodes.push({ id: "kb:self", label: entry.title ?? "", type: "kb" });

  // Step nodes + sequential flow edges
  procedure.forEach((text, i) => {
    const id    = `step:${i + 1}`;
    const label = typeof text === "string" ? text.split(";")[0].trim().slice(0, 100) : `Step ${i + 1}`;
    nodes.push({ id, label, type: "step" });
    addEdge(i === 0 ? "kb:self" : `step:${i}`, i === 0 ? "starts_with" : "precedes", id);
  });

  // Output nodes from log clauses + produces / logged_to edges
  const stepOutputs = extractLogOutputs(procedure);
  const outputsSeen = new Set();
  for (const [idx, { outputs, logTarget }] of stepOutputs) {
    const stepId = `step:${idx + 1}`;
    for (const name of outputs) {
      const id = `out:${slugify(name)}`;
      if (!outputsSeen.has(id)) { outputsSeen.add(id); nodes.push({ id, label: name.replace(/_/g, " "), type: "output" }); }
      addEdge(stepId, "produces", id);
    }
    if (logTarget) {
      const tid = `out:${slugify(logTarget)}`;
      if (!outputsSeen.has(tid)) { outputsSeen.add(tid); nodes.push({ id: tid, label: logTarget.replace(/_/g, " "), type: "output" }); }
      for (const name of outputs) addEdge(`out:${slugify(name)}`, "logged_to", tid);
    }
  }

  // Tool nodes + uses edges
  const stepTools = extractToolMentions(procedure);
  const toolsSeen = new Set();
  for (const [idx, toolNames] of stepTools) {
    for (const name of toolNames) {
      const id = `tool:${slugify(name)}`;
      if (!toolsSeen.has(id)) { toolsSeen.add(id); nodes.push({ id, label: name, type: "tool" }); }
      addEdge(`step:${idx + 1}`, "uses", id);
    }
  }

  // Assertion nodes + asserts edges — each metric matched back to the step(s) containing it
  metrics.forEach(metric => {
    const id = `assert:${slugify(metric)}`;
    nodes.push({ id, label: metric, type: "assertion" });
    procedure.forEach((text, i) => {
      if (typeof text === "string" && text.toLowerCase().includes(metric.slice(0, 35).toLowerCase()))
        addEdge(`step:${i + 1}`, "asserts", id);
    });
  });

  // Reference nodes + references edges at KB level
  references.forEach(ref => {
    const id = `ref:${slugify(ref)}`;
    nodes.push({ id, label: ref, type: "reference" });
    addEdge("kb:self", "references", id);
  });

  return { nodes, edges };
}

// ── JCS-style canonical JSON (alphabetical keys, deterministic) ────────────────
// Used to produce the stable bytes that keccak256 is computed over.

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const sorted = Object.keys(value).sort().map(
    k => JSON.stringify(k) + ":" + canonicalJson(value[k])
  );
  return "{" + sorted.join(",") + "}";
}

// ── royaltyBps: quality-tiered ─────────────────────────────────────────────────
// Seeds earn royalties when derived KBs settle queries against them.
// Tier based on classification + score so higher-quality seeds earn proportionally more.
//
//  anchor ≥ 2.9  →  500 bps (5%)
//  anchor ≥ 2.7  →  400 bps (4%)
//  anchor < 2.7  →  300 bps (3%)
//  standard      →  200 bps (2%)
//  marginal      →  100 bps (1%)

function qualityToRoyaltyBps(quality) {
  if (!quality) return 100;
  const { classification, score } = quality;
  if (classification === "anchor") {
    if (score >= 2.9) return 500;
    if (score >= 2.7) return 400;
    return 300;
  }
  if (classification === "standard") return 200;
  return 100; // marginal or unknown
}

// ── payloadType: aligned to kbType ─────────────────────────────────────────────
// The payload shape must match the KB's semantic classification.
//
//  Practice / Feature          →  "procedure"
//  ComplianceChecklist / Rubric →  "checklist"
//  StateMachine                →  "specification"
//  PromptEngineering           →  "reference"

function kbTypeToPayloadType(kbType) {
  if (kbType === "ComplianceChecklist" || kbType === "Rubric")  return "checklist";
  if (kbType === "StateMachine")                                return "specification";
  if (kbType === "PromptEngineering")                           return "reference";
  return "procedure"; // Practice, Feature
}

// ── interface.outputs: extracted from log clauses ──────────────────────────────
// 94% of KBs contain "log X and Y to audit trail" — surface these as typed outputs.
// inputs stay [] until a reliable extraction strategy exists (tool coverage is only 22%).

function buildInterfaceOutputs(stepOutputs) {
  const seen = new Set();
  const outputs = [];
  for (const [, { outputs: names, logTarget }] of stepOutputs) {
    for (const name of names) {
      const clean = name.replace(/_/g, " ");
      if (!seen.has(name) && name.length > 2 && name.length < 50) {
        seen.add(name);
        outputs.push({ description: `logged to ${(logTarget ?? "audit trail").replace(/_/g, " ")}`, name: clean, type: "metric" });
      }
    }
    if (logTarget && !seen.has(logTarget)) {
      seen.add(logTarget);
      outputs.push({ description: "structured audit record", name: logTarget.replace(/_/g, " "), type: "log" });
    }
  }
  return outputs;
}

// ── Schema transform: refined → KBArtifact v2.5 ───────────────────────────────
// metrics and stepOutputs are pre-computed by buildBundle so they are shared
// across artifact.json fields and the semantic graph in meta.json.

export function toArtifact(kbHash, entry, metrics, stepOutputs) {
  const procedureSteps = (entry.procedure ?? []).map((action, i) => ({
    action: typeof action === "string" ? action : String(action),
    step:   i + 1,
  }));

  const capabilities = [entry.standard].filter(Boolean); // governing principle only
  // entry.references are preserved as ref: nodes in semanticGraph (meta.json)

  const rawScore   = entry._quality?.score;
  const confidence = rawScore != null ? Math.round((rawScore / 3) * 100) / 100 : null;

  const kbType     = domainToKbType(entry.domain);
  const payloadType = kbTypeToPayloadType(kbType);
  const royaltyBps  = qualityToRoyaltyBps(entry._quality);
  const publishedAt = typeof entry.publishedAt === "string" ? entry.publishedAt : "";

  // Strip "; assert ..." suffix from success conditions — assertions are already
  // in verification.metrics; successConditions should be human-readable intent only.
  const successConditions = (entry.verification ?? []).map(s =>
    typeof s === "string" ? s.split(/;\s*assert\s+/i)[0].trim() : s
  );

  const verification = {
    failureConditions: entry.failure_modes ?? [],
    metrics,
    successConditions,
  };

  const interfaceOutputs = buildInterfaceOutputs(stepOutputs);

  return {
    artifactRefs:   [],           // populated in a later pass once Type B CIDs are pinned
    capabilities,
    confidence,
    domain:         entry.domain  ?? "meta.protocol",
    epistemicType:  domainToEpistemicType(entry.domain),
    interface:      { inputs: [], outputs: interfaceOutputs },
    isSeed:         true,
    kbHash,
    kbType,
    parentHashes:   [],
    payloadType,
    procedure:      procedureSteps,
    publishedAt,
    royaltyBps,
    schemaVersion:  SCHEMA_VER,
    summary:        entry.summary ?? "",
    tags:           entry.tags    ?? [],
    title:          entry.title   ?? "",
    verification,
  };
}

// ── Build the three bundle files ───────────────────────────────────────────────

export function buildBundle(kbHash, entry) {
  // Pre-compute once — shared across artifact.json fields and meta.json graph.
  // Avoids scanning procedure text multiple times.
  const metrics     = extractMetrics(entry.procedure, entry.verification);
  const stepOutputs = extractLogOutputs(entry.procedure ?? []);

  const artifact = toArtifact(kbHash, entry, metrics, stepOutputs);

  // artifact.json: canonical bytes → keccak256 = artifactHash committed on-chain.
  // The semantic graph is intentionally NOT here — it doesn't affect the hash.
  const artifactBytes = canonicalJson(artifact);
  const artifactHash  = "0x" + keccak_256(new TextEncoder().encode(artifactBytes));

  const manifest = {
    files: [
      { path: "artifact.json", role: "canonical_hash_target" },
      { path: "manifest.json", role: "manifest"              },
      { path: "meta.json",     role: "indexer_sidecar"       },
    ],
    generatedAt:     NOW,
    kbHash,
    manifestVersion: "1",
    rootCid:         "PENDING",
  };

  // meta.json: mutable sidecar. semanticGraph lives here so it is:
  //   • freely queryable by agents via IPFS gateway
  //   • updatable (e.g. when Type B CIDs resolve ref: nodes) without re-publishing
  //   • not subject to the artifactHash integrity invariant
  const semanticGraph = buildSemanticGraph(entry, metrics);

  const meta = {
    domain:        artifact.domain,
    isSeed:        artifact.isSeed,
    kbHash,
    kbType:        artifact.kbType,
    payloadType:   artifact.payloadType,
    publishedAt:   artifact.publishedAt,
    score: {
      classification: entry._quality?.classification ?? "unknown",
      weighted:        entry._quality?.score          ?? 0,
    },
    semanticGraph,
    tags:          artifact.tags,
    title:         artifact.title,
  };

  return { artifact, artifactBytes, artifactHash, manifest, meta };
}

// ── IPFS pinning — Pinata ──────────────────────────────────────────────────────

async function pinToPinata(kbHash, artifactBytes, manifest, meta, jwt) {
  const form = new FormData();

  // Each file appended with its target filename (becomes path in IPFS directory)
  form.append("file", new Blob([artifactBytes],           { type: "application/json" }), "artifact.json");
  form.append("file", new Blob([canonicalJson(manifest)], { type: "application/json" }), "manifest.json");
  form.append("file", new Blob([canonicalJson(meta)],     { type: "application/json" }), "meta.json");
  form.append("pinataOptions",  JSON.stringify({ wrapWithDirectory: true }));
  form.append("pinataMetadata", JSON.stringify({ name: `kb-${kbHash.slice(2, 18)}` }));

  const resp = await fetch(PINATA_URL, {
    method:  "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body:    form,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "(no body)");
    throw new Error(`Pinata ${resp.status}: ${text}`);
  }

  const { IpfsHash } = await resp.json();
  return IpfsHash; // CIDv1 of the directory root
}

// ── IPFS pinning — Filebase ────────────────────────────────────────────────────
//
// Uploads 3 files to a Filebase IPFS-enabled S3 bucket via AWS Signature V4.
// Each object gets its own IPFS CID returned in the x-amz-meta-cid header.
// rootCid = artifact.json CID (points directly to the artifact, not a directory).
// Gateway for reads: https://ipfs.filebase.io/ipfs/{cid}
//
// Setup: filebase.com → Buckets → create bucket → enable IPFS
//        Security Credentials → create access key + secret key
// Free tier: 5 GB storage, no rate limit on uploads.

function sha256Hex(data) {
  return createHash("sha256").update(data).digest("hex");
}

function hmac256(key, data) {
  return createHmac("sha256", key).update(data).digest();
}

function sigV4SigningKey(secretKey, dateStamp, region, service) {
  return hmac256(
    hmac256(hmac256(hmac256(Buffer.from("AWS4" + secretKey), dateStamp), region), service),
    "aws4_request"
  );
}

async function filebaseS3Put(key, body, { accessKey, secretKey, bucket }) {
  const region    = "us-east-1";
  const service   = "s3";
  const url       = `https://${FILEBASE_S3_HOST}/${bucket}/${key}`;
  const host      = `${FILEBASE_S3_HOST}`;
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const bodyBuf   = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const payloadHash = sha256Hex(bodyBuf);

  const canonHeaders =
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    `/${bucket}/${key}`,
    "",
    canonHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credScope   = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credScope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey  = sigV4SigningKey(secretKey, dateStamp, region, service);
  const signature   = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type":          "application/json",
      "x-amz-content-sha256":  payloadHash,
      "x-amz-date":            amzDate,
      "Authorization":          authorization,
    },
    body: bodyBuf,
  });
}

async function pinToFilebase(kbHash, artifactBytes, manifest, meta, creds) {
  const prefix = `kb-${kbHash.slice(2, 18)}`;

  // Upload artifact.json first — its CID becomes rootCid
  const artifactResp = await filebaseS3Put(`${prefix}/artifact.json`, artifactBytes, creds);
  if (!artifactResp.ok) {
    const text = await artifactResp.text().catch(() => "(no body)");
    throw new Error(`Filebase S3 ${artifactResp.status}: ${text}`);
  }
  const cid = artifactResp.headers.get("x-amz-meta-cid");
  if (!cid) throw new Error("Filebase did not return x-amz-meta-cid — ensure the bucket has IPFS enabled");

  // Upload manifest + meta in parallel (best-effort; don't block on their CIDs)
  await Promise.all([
    filebaseS3Put(`${prefix}/manifest.json`, Buffer.from(canonicalJson(manifest)), creds),
    filebaseS3Put(`${prefix}/meta.json`,     Buffer.from(canonicalJson(meta)),     creds),
  ]);

  return cid; // direct CID of artifact.json
}

// ── Provider dispatcher ────────────────────────────────────────────────────────

async function pinBundle(kbHash, artifactBytes, manifest, meta, { provider, jwt, filebaseCreds }) {
  if (provider === "filebase") {
    return pinToFilebase(kbHash, artifactBytes, manifest, meta, filebaseCreds);
  }
  return pinToPinata(kbHash, artifactBytes, manifest, meta, jwt);
}

// ── Single KB bundle + pin ─────────────────────────────────────────────────────

async function bundleOne({ filePath, bundledDir, pinConfig, dryRun, logPath }) {
  const raw    = readFileSync(filePath, "utf8");
  const entry  = JSON.parse(raw);
  const filename = basename(filePath, ".json");
  const kbHash   = filename.startsWith("0x") ? filename : "0x" + filename;

  const { artifact, artifactBytes, artifactHash, manifest, meta } = buildBundle(kbHash, entry);

  let rootCid;
  if (dryRun) {
    rootCid = `dry-run-placeholder-${kbHash.slice(2, 18)}`;
    console.log(`[dry-run] ${kbHash.slice(0, 12)}… artifactHash=${artifactHash.slice(0, 14)}… rootCid=${rootCid}`);
  } else {
    rootCid = await pinBundle(kbHash, artifactBytes, manifest, meta, pinConfig);
  }

  const record = {
    artifactHash,
    bundledAt: NOW,
    domain:    artifact.domain,
    rootCid,
    title:     artifact.title,
  };

  writeFileSync(
    join(bundledDir, filename + ".json"),
    JSON.stringify(record, null, 2) + "\n"
  );

  writeFileSync(logPath, JSON.stringify({ kbHash, ...record }) + "\n", { flag: "a" });

  return record;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const provider    = (process.env.IPFS_PROVIDER ?? "filebase").toLowerCase();
  const jwt         = process.env.PINATA_API_JWT;
  const concurrency = Math.min(parseInt(process.env.CONCURRENCY ?? "3", 10), 10);
  const dryRun      = process.env.DRY_RUN === "true";

  if (!["pinata", "filebase"].includes(provider)) {
    console.error(`Error: IPFS_PROVIDER must be "pinata" or "filebase", got "${provider}"`);
    process.exit(1);
  }

  if (!dryRun) {
    if (provider === "pinata" && !jwt) {
      console.error("Error: PINATA_API_JWT is required when IPFS_PROVIDER=pinata");
      console.error("  export PINATA_API_JWT=eyJ...");
      console.error("  Or: IPFS_PROVIDER=filebase FILEBASE_ACCESS_KEY=... FILEBASE_SECRET_KEY=... FILEBASE_BUCKET=...");
      console.error("  Or: DRY_RUN=true");
      process.exit(1);
    }
    if (provider === "filebase") {
      const missing = ["FILEBASE_ACCESS_KEY", "FILEBASE_SECRET_KEY", "FILEBASE_BUCKET"]
        .filter(k => !process.env[k]);
      if (missing.length) {
        console.error(`Error: missing Filebase env vars: ${missing.join(", ")}`);
        console.error("  filebase.com → Security Credentials → create access key");
        console.error("  filebase.com → Buckets → create IPFS-enabled bucket");
        process.exit(1);
      }
    }
  }

  const filebaseCreds = {
    accessKey: process.env.FILEBASE_ACCESS_KEY ?? "",
    secretKey: process.env.FILEBASE_SECRET_KEY ?? "",
    bucket:    process.env.FILEBASE_BUCKET    ?? "",
  };

  const pinConfig = { provider, jwt, filebaseCreds };

  const stagingDir  = join(__dirname, "..", "staging");
  const refinedDir  = process.env.REFINED_DIR  ?? join(stagingDir, "refined");
  const bundledDir  = process.env.BUNDLED_DIR  ?? join(stagingDir, "bundled");
  const logPath     = join(stagingDir, "bundle-log.jsonl");

  mkdirSync(bundledDir, { recursive: true });

  // Skip already-bundled
  const alreadyDone = new Set(readdirSync(bundledDir).filter(f => f.endsWith(".json")));
  const files = readdirSync(refinedDir)
    .filter(f => f.endsWith(".json") && !alreadyDone.has(f))
    .sort();

  console.log(`\nAlexandrian KB Bundler`);
  console.log(`  Refined dir: ${refinedDir}`);
  console.log(`  Bundled dir: ${bundledDir}`);
  console.log(`  To bundle:   ${files.length} KBs`);
  console.log(`  Skipping:    ${alreadyDone.size} already bundled`);
  console.log(`  Concurrency: ${concurrency} parallel slots`);
  const ipfsLabel = dryRun       ? "placeholder CIDs (dry run)"
    : provider === "filebase"   ? `Filebase S3 → IPFS (bucket: ${filebaseCreds.bucket})`
    : "Pinata";
  console.log(`  IPFS:        ${ipfsLabel}`);
  console.log(`  Dry run:     ${dryRun}\n`);

  if (files.length === 0) {
    console.log("Nothing to bundle. All refined KBs are already in staging/bundled/.");
    return;
  }

  let bundled = 0, failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);

    const tasks = batch.map(file =>
      bundleOne({
        filePath:   join(refinedDir, file),
        bundledDir,
        pinConfig,
        dryRun,
        logPath,
      })
        .then(() => { bundled++; })
        .catch(err => {
          console.error(`\n✗ ${file.slice(0, 12)}… ${err.message}`);
          writeFileSync(
            logPath,
            JSON.stringify({ file, error: err.message, ts: NOW }) + "\n",
            { flag: "a" }
          );
          failed++;
        })
    );

    await Promise.all(tasks);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const done    = Math.min(i + concurrency, files.length);
    const rate    = bundled > 0 ? (bundled / Math.max(1, (Date.now() - startTime) / 1000) * 60).toFixed(1) : "—";
    process.stdout.write(`  ${done}/${files.length} | ✓${bundled} ✗${failed} | ${rate} KB/min | ${elapsed}s\r`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n── Summary ──────────────────────────────`);
  console.log(`  Bundled:  ${bundled}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Duration: ${elapsed}s`);
  console.log(`  Log:      ${logPath}`);
  console.log(`\nNext step: update publish.mjs to read staging/bundled/ for artifactHash + rootCid`);

  if (failed > 0) {
    console.log(`\n  Re-run to retry ${failed} failed KB(s). They remain in staging/refined/.`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    console.error("Fatal:", e.message);
    process.exit(1);
  });
}
