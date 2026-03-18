#!/usr/bin/env node
/**
 * grade-kbs — Offline KB quality grader.
 *
 * Implements a strict 5-dimension grading system:
 * - structure, actionability, specificity, coverage, composability (0–5 each)
 * Total score: (sum / 25). Verdict:
 * - >=0.85 production
 * - 0.70–0.85 usable
 * - <0.70 rewrite
 * - hard rejects override → reject
 */

import { readFile, readdir, stat, writeFile } from "fs/promises";
import { join, resolve } from "path";

const argv = process.argv.slice(2);
const summary = argv.includes("--summary");
const outIdx = argv.indexOf("--out");
const outPath = outIdx >= 0 ? argv[outIdx + 1] : null;

const VAGUE = [
  /\bimprove\b/,
  /\boptimi[sz]e\b/,
  /\benhance\b/,
  /\bconsider\b/,
  /\bensure\b/,
  /\bappropriate\b/,
  /\bbest practices?\b/,
  /\bvarious\b/,
  /\bthings\b/,
  /\bstuff\b/,
];

const TOOLS = [
  "redis", "jwt", "rs256", "es256", "oauth", "openid", "postgres", "mysql",
  "docker", "kubernetes", "github actions", "openapi", "owasp", "rate limit",
  "hsts", "tls", "bcrypt", "semgrep", "pinata", "ipfs",
];

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function arr(x) { return Array.isArray(x) ? x : []; }
function str(x) { return typeof x === "string" && x.trim().length > 0; }

function kbTypeOf(a) {
  return a?.kbType ?? a?.identity?.kb_type ?? a?.payloadType ?? a?.identity?.payload_type ?? "Unknown";
}

function textOf(a) {
  const parts = [];
  if (str(a?.title)) parts.push(a.title);
  if (str(a?.summary)) parts.push(a.summary);
  if (str(a?.goal)) parts.push(a.goal);
  for (const s of arr(a?.steps)) {
    if (typeof s === "string") parts.push(s);
    else if (s && typeof s === "object") {
      if (str(s.action)) parts.push(s.action);
      if (str(s.rationale)) parts.push(s.rationale);
      if (str(s.notes)) parts.push(s.notes);
    }
  }
  for (const c of arr(a?.checklist)) {
    if (typeof c === "string") parts.push(c);
    else if (c && typeof c === "object") {
      if (str(c.item)) parts.push(c.item);
      if (str(c.rationale)) parts.push(c.rationale);
    }
  }
  for (const t of arr(a?.tasks)) {
    if (typeof t === "string") parts.push(t);
    else if (t && typeof t === "object" && str(t.description)) parts.push(t.description);
  }
  for (const r of arr(a?.responsibilities)) if (str(r)) parts.push(r);
  return parts.join("\n").toLowerCase();
}

function countHits(text, needles) {
  let n = 0;
  for (const x of needles) {
    if (x instanceof RegExp) { if (x.test(text)) n++; }
    else if (typeof x === "string") { if (text.includes(x)) n++; }
  }
  return n;
}

function minStructureOK(type, a) {
  const t = String(type);
  if (t === "Practice" || t === "procedure" || t === "protocol") {
    const n = arr(a?.steps).length || arr(a?.payload?.inline_artifact?.steps).length;
    return n >= 5;
  }
  if (t === "ComplianceChecklist" || t === "AuditChecklist" || t === "checklist") {
    const n = arr(a?.checklist).length || arr(a?.payload?.inline_artifact?.steps).length;
    return n >= 5;
  }
  if (t === "TaskDecomposition") return str(a?.goal) && arr(a?.tasks).length >= 4 && arr(a?.tasks).length <= 8;
  if (t === "AgentRole") return str(a?.role) && arr(a?.responsibilities).length >= 2 && arr(a?.outputs).length >= 1;
  return str(a?.title) && str(a?.summary);
}

function gradeKB(a) {
  const type = kbTypeOf(a);
  const issues = [];
  const hardRejects = [];

  // structure (0–5)
  let structure = 5;
  if (!str(a?.title)) { structure -= 2; issues.push("missing title"); }
  if (!str(a?.domain) && !str(a?.semantic?.domain)) { structure -= 2; issues.push("missing domain"); }
  if (!minStructureOK(type, a)) { structure -= 2; issues.push("below minimum structure for type"); }
  structure = clamp(structure, 0, 5);

  // actionability (0–5)
  const text = textOf(a);
  const stepsN = arr(a?.steps).length || arr(a?.payload?.inline_artifact?.steps).length;
  const checklistN = arr(a?.checklist).length;
  const tasksN = arr(a?.tasks).length;
  let actionability = (stepsN || checklistN || tasksN) ? 3 : 1;
  if (stepsN >= 5 || checklistN >= 5) actionability += 1;
  if (countHits(text, TOOLS) >= 2) actionability += 1;
  actionability = clamp(actionability, 0, 5);
  if (actionability < 2) hardRejects.push("not_actionable");

  // specificity (0–5)
  const vague = countHits(text, VAGUE);
  const concrete = countHits(text, TOOLS);
  let specificity = 3 + Math.min(2, concrete) - Math.min(3, vague);
  specificity = clamp(specificity, 0, 5);
  if (specificity < 2) hardRejects.push("too_generic");

  // coverage (0–5) — type-aware
  // Knowledge/Evaluation KBs should include verification/failure modes.
  // Control-plane primitives (AgentRole/TaskDecomposition) should include failure_modes and/or ordering clarity.
  let coverage = 2;
  const preconds = arr(a?.preconditions).length > 0 || arr(a?.execution?.preconditions).length > 0;
  const hasSuccess =
    a?.verification && (arr(a.verification.successConditions).length > 0 || arr(a.verification.success_conditions).length > 0);
  const hasFailure =
    a?.verification && (arr(a.verification.failureConditions).length > 0 || arr(a.verification.failure_conditions).length > 0);
  const failureModes = arr(a?.failure_modes).length > 0;

  if (preconds) coverage += 1;
  if (hasSuccess) coverage += 1;
  if (hasFailure) coverage += 1;
  if (/\bfailure\b|\bedge case\b|\brollback\b|\bthreat\b|\battack\b/.test(text)) coverage += 1;

  // Control-plane uplift: roles/plans often won't have full verification blocks; reward failure_modes instead.
  if (type === "AgentRole" && failureModes) coverage += 2;
  if (type === "TaskDecomposition") {
    // Reward ordering clarity and bounded task list.
    const tasksN = arr(a?.tasks).length;
    if (tasksN >= 4 && tasksN <= 8) coverage += 1;
  }

  coverage = clamp(coverage, 0, 5);

  // composability (0–5)
  let composability = 3;
  const tags = arr(a?.tags);
  if (tags.length >= 3) composability += 1;
  if (tags.length > 12) { composability -= 1; issues.push("overloaded tags"); }
  const domain = a?.domain ?? a?.semantic?.domain ?? "";
  if (typeof domain === "string" && domain.split(".").length >= 2) composability += 1;
  composability = clamp(composability, 0, 5);

  const total = structure + actionability + specificity + coverage + composability;
  const score = Number((total / 25).toFixed(4));

  if (structure < 3) hardRejects.push("structural_integrity_too_low");

  const verdict =
    hardRejects.length > 0 ? "reject" :
    score >= 0.85 ? "production" :
    score >= 0.70 ? "usable" : "rewrite";

  return {
    kbType: type,
    score,
    verdict,
    breakdown: { structure, actionability, specificity, coverage, composability },
    hardRejects,
    issues: Array.from(new Set(issues)),
  };
}

async function listArtifactFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    for (const name of await readdir(dir)) {
      const p = join(dir, name);
      const s = await stat(p);
      if (s.isDirectory()) await walk(p);
      else if (name === "artifact.json") out.push(p);
    }
  }
  await walk(rootDir);
  return out;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const repoRoot = resolve(process.cwd(), "..", ".."); // packages/generator → repo root
const ipfsDir = resolve(repoRoot, "ipfs");
const files = await listArtifactFiles(ipfsDir);

const rows = [];
for (const file of files) {
  try {
    const raw = await readFile(file, "utf-8");
    const a = JSON.parse(raw);
    const g = gradeKB(a);
    rows.push({
      file: file.replace(repoRoot + "\\", "").replaceAll("\\", "/"),
      schemaVersion: a.schemaVersion ?? a.identity?.schema ?? null,
      domain: a.domain ?? a.semantic?.domain ?? null,
      title: a.title ?? a.identity?.title ?? null,
      ...g,
    });
  } catch (e) {
    rows.push({
      file: file.replace(repoRoot + "\\", "").replaceAll("\\", "/"),
      score: 0,
      verdict: "reject",
      error: String(e?.message ?? e),
    });
  }
}

rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

const report = {
  generatedAt: new Date().toISOString(),
  count: rows.length,
  thresholds: { production: 0.85, usable: 0.70 },
  summary: {
    production: rows.filter((r) => r.verdict === "production").length,
    usable: rows.filter((r) => r.verdict === "usable").length,
    rewrite: rows.filter((r) => r.verdict === "rewrite").length,
    reject: rows.filter((r) => r.verdict === "reject").length,
  },
  rows,
};

const json = JSON.stringify(report, null, 2);
if (outPath) {
  const abs = resolve(process.cwd(), outPath);
  await writeFile(abs, json, "utf-8");
}

if (!summary) {
  process.stdout.write(json + "\n");
} else {
  console.log("\nKB Quality Report");
  console.log("- Total: " + report.count);
  console.log("- Production (>=0.85): " + report.summary.production);
  console.log("- Usable (0.70-0.85): " + report.summary.usable);
  console.log("- Rewrite (<0.70): " + report.summary.rewrite);
  console.log("- Reject (hard rules): " + report.summary.reject);
  console.log("\nTop 5");
  for (const r of rows.slice(0, 5)) console.log("- " + r.score + " [" + r.kbType + "] " + r.title + " (" + r.domain + ")");
  console.log("\nBottom 5");
  for (const r of rows.slice(-5).reverse()) console.log("- " + r.score + " [" + r.kbType + "] " + r.title + " (" + r.domain + ")");
  console.log("\n(Use --out to write full JSON report.)\n");
}

