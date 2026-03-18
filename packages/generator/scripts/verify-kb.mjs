#!/usr/bin/env node
/**
 * verify-kb — Verify a KB artifact's IPFS availability and hash integrity.
 *
 * Fetches a KB artifact from IPFS and verifies:
 *   1. The CID is reachable via at least one public gateway
 *   2. The artifact is valid JSON with expected KB fields
 *   3. The embedded kbHash matches the recomputed canonical hash
 *
 * Usage:
 *   node scripts/verify-kb.mjs <CID>
 *   node scripts/verify-kb.mjs --all               # verify all 4 KB-ENG demo artifacts
 *   node scripts/verify-kb.mjs --cid <CID>
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 *
 * Intended for: grant reviewers, external auditors, CI artifact integrity checks.
 */

import { keccak256 } from "js-sha3";

// ── IPFS Gateways ────────────────────────────────────────────────────────────

const GATEWAYS = [
  "https://ipfs.io/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://gateway.pinata.cloud/ipfs",
];

const TIMEOUT_MS = 8000;

// ── Well-known KB-ENG demo artifact CIDs ─────────────────────────────────────

const KNOWN_KBS = [
  { id: "KB-ENG-1", cid: "QmQfF4NtyFhNeEwxn4GdHhUYT5o2Emmb1r2CDuo1AGe9un", title: "Stable Production API Design" },
  { id: "KB-ENG-2", cid: "QmdzWRjtbWBQ8DpwzC8pHZ8U9BssHnzvPUDrS6gWeRRyck", title: "OpenAPI Contract Specification" },
  { id: "KB-ENG-3", cid: "QmZQ2gV9trEhNvKck8Rmr374k2hTWPU8yPj7btfPqCfWUq", title: "Production REST API Implementation" },
  { id: "KB-ENG-4", cid: "Qmeu9YpyukeA96DptqKoafZo6rYsMwtryJQuFo8h5pDDrS", title: "API Endpoint Security" },
];

// ── Utilities ─────────────────────────────────────────────────────────────────

function padStart(str, len, ch = " ") {
  return String(str).padStart(len, ch);
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchArtifact(cid) {
  const errors = [];
  for (const gw of GATEWAYS) {
    try {
      const artifact = await fetchWithTimeout(`${gw}/${cid}`);
      return { artifact, gateway: gw };
    } catch (e) {
      errors.push(`  ${gw}: ${e.message}`);
    }
  }
  throw new Error(`All IPFS gateways failed:\n${errors.join("\n")}`);
}

// ── Canonical JSON (RFC 8785 JCS) ─────────────────────────────────────────────

function canonicalize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") +
    "}"
  );
}

// ── Hash computation ──────────────────────────────────────────────────────────
//
// Two hash schemes co-exist depending on which format the artifact uses:
//
//   Scheme A (v2.5 IPFS artifact — ipfs/kb-eng-*/artifact.json):
//     kbHash = keccak256("alexandrian.kb.v2.5" + JCS({ title, summary, domain, ... }))
//     The kbHash field is embedded directly in the artifact JSON.
//
//   Scheme B (KBv24Artifact envelope — staging/refined/*.json):
//     kbHash = keccak256("alexandrian.kb.v2.5" + JCS(artifact minus identity.kb_id and provenance.author.address))

function computeArtifactHash(artifact) {
  // Scheme A: compute over the full artifact excluding the kbHash field itself
  const { kbHash: _removed, ...rest } = artifact;
  const canonical = canonicalize(rest);
  return "0x" + keccak256("alexandrian.kb.v2.5" + canonical);
}

// ── Verification logic ────────────────────────────────────────────────────────

const PASS = "✅";
const FAIL = "❌";
const WARN = "⚠️ ";

async function verifyOne(label, cid) {
  const width = 44;
  const sep = "─".repeat(width);
  console.log(`\n${sep}`);
  console.log(`  ${label}`);
  console.log(`  CID: ${cid}`);
  console.log(sep);

  let exitCode = 0;

  // ── Check 1: IPFS fetch ───────────────────────────────────────────────────
  let artifact;
  let gateway;
  try {
    ({ artifact, gateway } = await fetchArtifact(cid));
    console.log(`${PASS} IPFS accessible via ${gateway}`);
  } catch (e) {
    console.log(`${FAIL} IPFS unreachable`);
    console.log(e.message);
    return 1;
  }

  // ── Check 2: Valid KB JSON ─────────────────────────────────────────────────
  const title = artifact.title || artifact.identity?.title || null;
  const kbType = artifact.kbType || artifact.identity?.kb_type || null;
  const domain = artifact.domain || artifact.semantic?.domain || null;
  const schemaVersion = artifact.schemaVersion || artifact.identity?.schema || null;

  if (!title || !domain) {
    console.log(`${FAIL} Artifact missing required fields (title or domain)`);
    exitCode = 1;
  } else {
    console.log(`${PASS} Valid KB artifact`);
    console.log(`     Title:   ${title}`);
    console.log(`     Type:    ${kbType || "(not set)"}`);
    console.log(`     Domain:  ${domain}`);
    console.log(`     Schema:  ${schemaVersion || "(not set)"}`);
  }

  // ── Check 3: Hash integrity ────────────────────────────────────────────────
  const embeddedHash = artifact.kbHash;
  if (!embeddedHash) {
    console.log(`${WARN} No kbHash embedded in artifact — skipping hash check`);
    console.log(`     (This is expected for older envelope-format KBs in staging/)`);
  } else {
    const computed = computeArtifactHash(artifact);
    const match =
      embeddedHash.toLowerCase() === computed.toLowerCase();

    if (match) {
      console.log(`${PASS} Hash integrity verified`);
      console.log(`     kbHash: ${embeddedHash}`);
    } else {
      console.log(`${FAIL} Hash mismatch — artifact may be tampered`);
      console.log(`     Embedded:  ${embeddedHash}`);
      console.log(`     Recomputed: ${computed}`);
      exitCode = 1;
    }
  }

  // ── Check 4: Content completeness ─────────────────────────────────────────
  const hasSteps = Array.isArray(artifact.steps) && artifact.steps.length > 0;
  const hasChecklist = Array.isArray(artifact.checklist) && artifact.checklist.length > 0;
  const hasProcedure = artifact.payload?.inline_artifact?.steps?.length > 0;
  const hasContent = hasSteps || hasChecklist || hasProcedure;

  if (hasContent) {
    const count = artifact.steps?.length ?? artifact.checklist?.length ?? artifact.payload?.inline_artifact?.steps?.length ?? 0;
    const kind = hasSteps ? "steps" : hasChecklist ? "checklist items" : "procedure steps";
    console.log(`${PASS} Content present (${count} ${kind})`);
  } else {
    console.log(`${WARN} No steps/checklist found — artifact may be metadata-only`);
  }

  console.log(exitCode === 0 ? "\n  RESULT: PASS" : "\n  RESULT: FAIL");
  return exitCode;
}

// ── CLI entry point ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);

console.log("\n🔍  Alexandrian Protocol — KB Artifact Verifier");
console.log("    Fetches from IPFS and verifies hash integrity\n");

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log("Usage:");
  console.log("  node scripts/verify-kb.mjs <CID>           # verify a single CID");
  console.log("  node scripts/verify-kb.mjs --all            # verify all 4 KB-ENG demo artifacts");
  console.log("  node scripts/verify-kb.mjs --cid <CID>      # same as positional CID");
  console.log("\nKnown KB-ENG CIDs:");
  for (const kb of KNOWN_KBS) {
    console.log(`  ${kb.id}: ${kb.cid}`);
  }
  process.exit(0);
}

let toVerify = []; // [{ label, cid }]

if (args.includes("--all")) {
  toVerify = KNOWN_KBS.map((kb) => ({ label: `${kb.id} — ${kb.title}`, cid: kb.cid }));
} else {
  const cidIdx = args.indexOf("--cid");
  const cid = cidIdx !== -1 ? args[cidIdx + 1] : args.find((a) => !a.startsWith("-"));
  if (!cid) {
    console.error("Error: no CID provided. Use --help for usage.");
    process.exit(1);
  }
  const known = KNOWN_KBS.find((kb) => kb.cid === cid);
  const label = known ? `${known.id} — ${known.title}` : `CID`;
  toVerify = [{ label, cid }];
}

let totalFailed = 0;
for (const { label, cid } of toVerify) {
  const code = await verifyOne(label, cid);
  totalFailed += code;
}

const total = toVerify.length;
const passed = total - totalFailed;
console.log(`\n${"═".repeat(44)}`);
console.log(`  Summary: ${passed}/${total} passed`);
if (totalFailed === 0) {
  console.log("  All artifacts verified ✅");
} else {
  console.log(`  ${totalFailed} artifact(s) failed verification ❌`);
}
console.log("═".repeat(44) + "\n");

process.exit(totalFailed > 0 ? 1 : 0);
