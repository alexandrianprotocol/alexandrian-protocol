/**
 * KB Repair Script — KBv2.4
 *
 * Migrates legacy envelope artifacts to KBv2.4 format and improves
 * quality of low-scoring v2.4 artifacts (short titles, thin tags,
 * redundant summaries, generic derived titles).
 *
 * Two-pass approach:
 *   Pass 1 — seeds (isSeed=true): convert/improve, build hash remap table
 *   Pass 2 — derived (isSeed=false): remap parent hashes, convert/improve
 *
 * Usage:
 *   node dist/scripts/repair.js [--dry-run] [--only-legacy] [--only-quality] [--delay <ms>]
 *
 * Options:
 *   --dry-run       Log changes without writing files
 *   --only-legacy   Only migrate legacy envelope files
 *   --only-quality  Only improve v2.4 quality issues
 *   --delay <ms>    Milliseconds between OpenAI calls (default: 3000)
 */

import { readFileSync, writeFileSync, unlinkSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config as dotenvConfig } from "dotenv";
import OpenAI from "openai";
import { kbHashFromArtifactV24 } from "../lib/core/hash.js";
import type { KBv24Artifact } from "../types/artifact.js";

// ── Paths ─────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const STAGING_PENDING = join(__dirname, "..", "..", "staging", "pending");

// Load .env from repo root: dist/scripts → dist → packages/generator → packages → root
dotenvConfig({ path: resolve(__dirname, "../../../..", ".env") });

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let onlyLegacy = false;
  let onlyQuality = false;
  let delayMs = 3000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--only-legacy") onlyLegacy = true;
    else if (args[i] === "--only-quality") onlyQuality = true;
    else if (args[i] === "--delay" && args[i + 1]) delayMs = parseInt(args[++i], 10);
    else if (args[i].startsWith("--delay=")) delayMs = parseInt(args[i].split("=")[1], 10);
  }

  return { dryRun, onlyLegacy, onlyQuality, delayMs };
}

// ── Legacy record types ───────────────────────────────────────────────────────

interface LegacyPracticePayload {
  type: "practice";
  rationale: string;
  contexts: string[];
  failureModes: string[];
}

interface LegacySynthesisPayload {
  type: "synthesis" | "adaptation";
  question?: string;
  answer?: string;
  citations?: Record<string, string>;
}

type LegacyPayload = LegacyPracticePayload | LegacySynthesisPayload;

interface LegacyEnvelope {
  type: string;
  domain: string;
  sources: string[];
  artifactHash?: string;
  tier?: string;
  payload: LegacyPayload;
}

interface RawRecord {
  kbHash: string;
  generatorVersion: string;
  status: "pending";
  isSeed: boolean;
  generatedAt: string;
  domain: string;
  // Legacy: has envelope, no artifact
  type?: string;
  envelope?: LegacyEnvelope;
  // v2.4: has artifact
  artifact?: KBv24Artifact;
}

// ── Detection helpers ─────────────────────────────────────────────────────────

function isLegacy(r: RawRecord): boolean {
  return !r.artifact?.identity?.schema;
}

function needsQualityFix(artifact: KBv24Artifact): boolean {
  const title = artifact.identity.title ?? "";
  const tags = artifact.semantic.tags ?? [];
  const summary = artifact.semantic.summary ?? "";
  const titleWords = title.trim().split(/\s+/).length;
  return (
    titleWords < 4 ||
    tags.length < 3 ||
    summary.trim().length < 60 ||
    summary.toLowerCase().trim() === title.toLowerCase().trim() ||
    /\bderived\s+kb\b/i.test(title) ||
    title.toLowerCase().trim() === artifact.semantic.domain.toLowerCase()
  );
}

// ── Sleep ─────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── AI: convert legacy practice (seed) → KBv24Artifact ───────────────────────

const ARTIFACT_SCHEMA_TEMPLATE = `{
  "identity": { "kb_id": "", "epistemic_type": "<procedure|heuristic|algorithm|analysis>",
    "title": "<5-9 word title naming the specific technique>", "version": "1.0.0",
    "status": "active", "is_seed": <true|false>, "schema": "alexandrian.kb.v2.4" },
  "claim": { "statement": "<one falsifiable claim, 1-2 sentences>",
    "confidence": <0.75-0.97>, "falsifiable": true },
  "semantic": { "summary": "<1-3 sentences explaining WHY or HOW, adds info beyond title>",
    "tags": ["<4-6 specific tags>"], "domain": "<domain>",
    "difficulty": "<beginner|intermediate|advanced|expert>" },
  "knowledge_inputs": { "minimum_required": <0 seeds, 2 derived>, "recommended": <0 seeds, 3 derived>,
    "composition_type": "merge", "used": [<for derived: {"kb_id":"hash","role":"parent"}>] },
  "reasoning": { "requires": [], "contradicts": [], "related": [] },
  "execution": { "trust_tier": 1, "execution_mode": "advisory",
    "determinism": "<deterministic|probabilistic>", "idempotent": true },
  "validation": {
    "success_conditions": ["<2-3 specific, measurable conditions>"],
    "failure_conditions": ["<1-2 concrete failure signs>"],
    "metrics": ["<1-2 measurable metrics>"] },
  "payload": { "artifact_type": "procedure", "location": "inline",
    "interface": { "inputs": [], "outputs": [], "parameters": [] },
    "inline_artifact": { "steps": ["<3-7 deterministic, imperative steps>"] } },
  "evidence": { "sources": [], "benchmarks": [], "notes": "" },
  "provenance": { "author": { "address": "" }, "royalty_bps": 250,
    "lineage": { "depth": <0 seed, parent_depth+1 derived>, "parent_hash": <null|"firstParentHash"> } }
}`;

async function convertPracticeToV24(
  client: OpenAI,
  record: RawRecord,
): Promise<KBv24Artifact> {
  const payload = record.envelope!.payload as LegacyPracticePayload;

  const userPrompt = `Convert this legacy practice artifact to KBv2.4 JSON format.

Domain: ${record.domain}
Rationale: ${payload.rationale}
Contexts: ${(payload.contexts ?? []).join("; ")}
Failure modes: ${(payload.failureModes ?? []).join("; ")}

Rules:
- identity.is_seed must be true
- identity.title: 5-9 words, names the specific technique (not just the category)
- tags: 4-6 specific tags (include technique names, tool names, pattern names)
- summary: 1-3 sentences, must explain WHY or HOW — not a restatement of the title
- steps: 3-7 deterministic, imperative steps (each step = one concrete action starting with a verb)
- knowledge_inputs.used must be []

Return ONLY valid JSON matching this schema:
${ARTIFACT_SCHEMA_TEMPLATE}`;

  const res = await client.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You convert legacy knowledge artifacts to KBv2.4 format for the Alexandrian protocol. " +
          "Return only valid JSON. Use only real, established engineering practices — no invented techniques.",
      },
      { role: "user", content: userPrompt },
    ],
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");

  const artifact = JSON.parse(content) as KBv24Artifact;
  // Enforce invariants the model must not override
  artifact.identity.kb_id = "";
  artifact.identity.schema = "alexandrian.kb.v2.4";
  artifact.identity.is_seed = true;
  artifact.knowledge_inputs.used = [];
  artifact.knowledge_inputs.minimum_required = 0;
  artifact.provenance.author.address = "";
  artifact.provenance.lineage.depth = 0;
  artifact.provenance.lineage.parent_hash = null;
  return artifact;
}

// ── AI: convert legacy synthesis/adaptation (derived) → KBv24Artifact ────────

async function convertSynthesisToV24(
  client: OpenAI,
  record: RawRecord,
  remappedParentHashes: string[],
): Promise<KBv24Artifact> {
  const payload = record.envelope!.payload as LegacySynthesisPayload;
  const parentDepth = 1; // conservative default for converted derived KBs

  const userPrompt = `Convert this legacy synthesis artifact to KBv2.4 JSON format.

Domain: ${record.domain}
Question: ${payload.question ?? "(none)"}
Answer: ${payload.answer ?? "(none)"}
Parent KB hashes: ${remappedParentHashes.join(", ")}

Rules:
- identity.is_seed must be false
- identity.title: 5-9 words, names the specific concept (NOT a question — a concept/technique name)
- tags: 4-6 specific tags
- summary: 1-3 sentences, explains the synthesis insight — what makes this KB useful beyond its parents
- steps: 3-7 deterministic, imperative steps derived from the answer content
- knowledge_inputs.used: ${JSON.stringify(remappedParentHashes.map((h) => ({ kb_id: h, role: "parent" })))}
- provenance.lineage.depth: ${parentDepth}
- provenance.lineage.parent_hash: "${remappedParentHashes[0] ?? null}"

Return ONLY valid JSON matching this schema:
${ARTIFACT_SCHEMA_TEMPLATE}`;

  const res = await client.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You convert legacy synthesis artifacts to KBv2.4 format for the Alexandrian protocol. " +
          "Return only valid JSON. The artifact must represent a real, actionable engineering concept.",
      },
      { role: "user", content: userPrompt },
    ],
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");

  const artifact = JSON.parse(content) as KBv24Artifact;
  // Enforce invariants
  artifact.identity.kb_id = "";
  artifact.identity.schema = "alexandrian.kb.v2.4";
  artifact.identity.is_seed = false;
  artifact.knowledge_inputs.used = remappedParentHashes.map((h) => ({ kb_id: h, role: "parent" }));
  artifact.knowledge_inputs.minimum_required = 2;
  artifact.provenance.author.address = "";
  artifact.provenance.lineage.depth = parentDepth;
  artifact.provenance.lineage.parent_hash = remappedParentHashes[0] ?? null;
  return artifact;
}

// ── AI: improve v2.4 quality (title, tags, summary only) ─────────────────────

interface QualityPatch {
  title: string;
  tags: string[];
  summary: string;
}

async function improveQuality(
  client: OpenAI,
  artifact: KBv24Artifact,
): Promise<QualityPatch> {
  const steps = artifact.payload.inline_artifact.steps.slice(0, 3);

  const userPrompt = `Improve the title, tags, and summary of this knowledge artifact.

Current (needs improvement):
- Title: "${artifact.identity.title}"
- Tags: ${JSON.stringify(artifact.semantic.tags)}
- Summary: "${artifact.semantic.summary}"

Context (do not change):
- Domain: ${artifact.semantic.domain}
- Epistemic type: ${artifact.identity.epistemic_type}
- Claim: "${artifact.claim.statement}"
- First steps: ${JSON.stringify(steps)}

Rules:
- Title: 5-9 words, name the specific technique or pattern (e.g. "Constant-Time Comparison for Cryptographic Secrets" not "Secure Comparison")
- Tags: 4-6 tags — specific, include technique names, tool names, pattern names, anti-pattern names where relevant
- Summary: 1-3 sentences — must explain WHY the technique matters or HOW it works; must NOT merely restate the title

Return JSON only: {"title": "...", "tags": [...], "summary": "..."}`;

  const res = await client.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You improve knowledge artifact metadata for the Alexandrian protocol. " +
          "Return only valid JSON with exactly three fields: title, tags, summary.",
      },
      { role: "user", content: userPrompt },
    ],
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");
  return JSON.parse(content) as QualityPatch;
}

// ── File I/O ──────────────────────────────────────────────────────────────────

function loadAllRecords(): RawRecord[] {
  if (!existsSync(STAGING_PENDING)) return [];
  return readdirSync(STAGING_PENDING)
    .filter((f) => f.endsWith(".json") && f !== ".gitkeep")
    .map((f) => {
      const raw = readFileSync(join(STAGING_PENDING, f), "utf-8");
      return JSON.parse(raw) as RawRecord;
    });
}

function writeRepaired(
  artifact: KBv24Artifact,
  oldRecord: RawRecord,
  dryRun: boolean,
): { oldHash: string; newHash: string } {
  // Ensure kb_id is cleared before hashing
  artifact.identity.kb_id = "";
  const newHash = kbHashFromArtifactV24(artifact);
  artifact.identity.kb_id = newHash;

  const newRecord = {
    kbHash: newHash,
    generatorVersion: oldRecord.generatorVersion,
    status: "pending" as const,
    isSeed: artifact.identity.is_seed,
    generatedAt: oldRecord.generatedAt,
    domain: artifact.semantic.domain,
    artifact,
  };

  if (!dryRun) {
    if (!existsSync(STAGING_PENDING)) mkdirSync(STAGING_PENDING, { recursive: true });
    writeFileSync(join(STAGING_PENDING, `${newHash}.json`), JSON.stringify(newRecord, null, 2), "utf-8");
    // Delete old file only if hash changed (avoid deleting the file we just wrote)
    if (oldRecord.kbHash !== newHash) {
      const oldPath = join(STAGING_PENDING, `${oldRecord.kbHash}.json`);
      if (existsSync(oldPath)) unlinkSync(oldPath);
    }
  }

  return { oldHash: oldRecord.kbHash, newHash };
}

// ── Pass 1: Seeds ─────────────────────────────────────────────────────────────

async function passSeeds(
  client: OpenAI,
  records: RawRecord[],
  hashMap: Map<string, string>,
  opts: { dryRun: boolean; onlyLegacy: boolean; onlyQuality: boolean; delayMs: number },
): Promise<{ converted: number; improved: number; skipped: number; failed: number }> {
  const seeds = records.filter((r) => r.isSeed);
  let converted = 0, improved = 0, skipped = 0, failed = 0;

  console.log(`\nPass 1 — Seeds (${seeds.length} total)`);

  for (const record of seeds) {
    const legacy = isLegacy(record);
    const v24 = !legacy && record.artifact != null;
    const qualityIssue = v24 && needsQualityFix(record.artifact!);

    const shouldConvert = legacy && !opts.onlyQuality;
    const shouldImprove = qualityIssue && !opts.onlyLegacy;

    if (!shouldConvert && !shouldImprove) {
      hashMap.set(record.kbHash, record.kbHash); // identity mapping for unchanged files
      skipped++;
      continue;
    }

    // Dry run: log intent without calling the API
    if (opts.dryRun) {
      if (shouldConvert) {
        console.log(`  [would convert] ${record.kbHash.slice(0, 12)}... ${record.domain} (${record.type ?? "legacy"})`);
        converted++;
      } else {
        console.log(`  [would improve] ${record.kbHash.slice(0, 12)}... "${record.artifact!.identity.title}"`);
        improved++;
      }
      hashMap.set(record.kbHash, record.kbHash);
      continue;
    }

    try {
      let newArtifact: KBv24Artifact;

      if (shouldConvert) {
        // Legacy → v2.4
        console.log(`  [convert] ${record.kbHash.slice(0, 12)}... ${record.domain} (${record.type ?? "legacy"})`);
        newArtifact = await convertPracticeToV24(client, record);
        await sleep(opts.delayMs);
      } else {
        // v2.4 quality improvement
        const current = record.artifact!;
        process.stdout.write(`  [improve] ${record.kbHash.slice(0, 12)}... "${current.identity.title}" → `);
        const patch = await improveQuality(client, current);
        newArtifact = {
          ...current,
          identity: { ...current.identity, kb_id: "" },
          semantic: { ...current.semantic, tags: patch.tags, summary: patch.summary },
        };
        // Only update title if it genuinely changed
        if (patch.title && patch.title !== current.identity.title) {
          newArtifact.identity = { ...newArtifact.identity, title: patch.title };
        }
        console.log(`"${newArtifact.identity.title}"`);
        await sleep(opts.delayMs);
      }

      const { oldHash, newHash } = writeRepaired(newArtifact, record, opts.dryRun);
      hashMap.set(oldHash, newHash);

      if (shouldConvert) {
        converted++;
        console.log(`    → ${newHash.slice(0, 12)}... "${newArtifact.identity.title}"`);
      } else {
        improved++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [error] ${record.kbHash.slice(0, 12)}...: ${msg}`);
      hashMap.set(record.kbHash, record.kbHash); // keep original hash on failure
      failed++;
    }
  }

  console.log(`  Seeds — converted: ${converted}, improved: ${improved}, skipped: ${skipped}, failed: ${failed}`);
  return { converted, improved, skipped, failed };
}

// ── Pass 2: Derived ───────────────────────────────────────────────────────────

async function passDerived(
  client: OpenAI,
  records: RawRecord[],
  hashMap: Map<string, string>,
  opts: { dryRun: boolean; onlyLegacy: boolean; onlyQuality: boolean; delayMs: number },
): Promise<{ converted: number; improved: number; remapped: number; skipped: number; failed: number }> {
  const derived = records.filter((r) => !r.isSeed);
  let converted = 0, improved = 0, remapped = 0, skipped = 0, failed = 0;

  console.log(`\nPass 2 — Derived (${derived.length} total)`);

  for (const record of derived) {
    const legacy = isLegacy(record);
    const v24 = !legacy && record.artifact != null;
    const qualityIssue = v24 && needsQualityFix(record.artifact!);

    // Get current parent hashes and remap them
    let oldParentHashes: string[] = [];
    if (legacy && record.envelope?.sources) {
      oldParentHashes = record.envelope.sources;
    } else if (v24 && record.artifact?.knowledge_inputs?.used) {
      oldParentHashes = record.artifact.knowledge_inputs.used.map((u) => u.kb_id);
    }

    const remappedParentHashes = oldParentHashes.map((h) => hashMap.get(h) ?? h);
    const parentHashesChanged = remappedParentHashes.some((h, i) => h !== oldParentHashes[i]);

    const shouldConvert = legacy && !opts.onlyQuality;
    const shouldImprove = qualityIssue && !opts.onlyLegacy;
    const needsRemap = parentHashesChanged && v24;

    if (!shouldConvert && !shouldImprove && !needsRemap) {
      skipped++;
      continue;
    }

    // Dry run: log intent without calling the API
    if (opts.dryRun) {
      if (shouldConvert) {
        console.log(`  [would convert] ${record.kbHash.slice(0, 12)}... ${record.domain} (${record.type ?? "legacy"})`);
        converted++;
      } else if (shouldImprove) {
        console.log(`  [would improve] ${record.kbHash.slice(0, 12)}... "${record.artifact!.identity.title}"`);
        improved++;
      } else {
        console.log(`  [would remap]   ${record.kbHash.slice(0, 12)}... (parent hashes)`);
        remapped++;
      }
      continue;
    }

    try {
      let newArtifact: KBv24Artifact;

      if (shouldConvert) {
        // Legacy derived → v2.4
        console.log(`  [convert] ${record.kbHash.slice(0, 12)}... ${record.domain} (${record.type ?? "legacy"})`);
        newArtifact = await convertSynthesisToV24(client, record, remappedParentHashes);
        await sleep(opts.delayMs);
        converted++;
      } else {
        // v2.4: start from existing artifact, apply remaps and/or quality fixes
        newArtifact = {
          ...record.artifact!,
          identity: { ...record.artifact!.identity, kb_id: "" },
          knowledge_inputs: {
            ...record.artifact!.knowledge_inputs,
            used: remappedParentHashes.map((h) => ({ kb_id: h, role: "parent" })),
          },
          provenance: {
            ...record.artifact!.provenance,
            lineage: {
              ...record.artifact!.provenance.lineage,
              parent_hash: remappedParentHashes[0] ?? null,
            },
          },
        };

        if (shouldImprove) {
          console.log(`  [improve] ${record.kbHash.slice(0, 12)}... "${record.artifact!.identity.title}" → `);
          const patch = await improveQuality(client, newArtifact);
          newArtifact.semantic = { ...newArtifact.semantic, tags: patch.tags, summary: patch.summary };
          if (patch.title && patch.title !== record.artifact!.identity.title) {
            newArtifact.identity = { ...newArtifact.identity, title: patch.title };
          }
          console.log(`    "${newArtifact.identity.title}"`);
          await sleep(opts.delayMs);
          improved++;
        } else if (needsRemap) {
          console.log(`  [remap]   ${record.kbHash.slice(0, 12)}... (parent hashes updated)`);
          remapped++;
        }
      }

      const { oldHash, newHash } = writeRepaired(newArtifact, record, opts.dryRun);
      hashMap.set(oldHash, newHash);

      if (shouldConvert) {
        console.log(`    → ${newHash.slice(0, 12)}... "${newArtifact.identity.title}"`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [error] ${record.kbHash.slice(0, 12)}...: ${msg}`);
      failed++;
    }
  }

  console.log(`  Derived — converted: ${converted}, improved: ${improved}, remapped: ${remapped}, skipped: ${skipped}, failed: ${failed}`);
  return { converted, improved, remapped, skipped, failed };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY not set. Add it to .env at the repo root.");
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  console.log("Alexandrian KB Repair Script");
  console.log(`  staging : ${STAGING_PENDING}`);
  console.log(`  dry-run : ${opts.dryRun}`);
  console.log(`  delay   : ${opts.delayMs}ms between API calls\n`);

  const records = loadAllRecords();
  const legacyCount = records.filter(isLegacy).length;
  const v24Count = records.length - legacyCount;
  const qualityCount = records.filter((r) => !isLegacy(r) && r.artifact && needsQualityFix(r.artifact)).length;

  console.log(`Loaded ${records.length} records:`);
  console.log(`  Legacy (needs migration)  : ${legacyCount}`);
  console.log(`  v2.4 (needs quality fix)  : ${qualityCount}`);
  console.log(`  v2.4 (already good)       : ${v24Count - qualityCount}`);

  if (opts.dryRun) console.log("\n  [DRY RUN — no files will be written]\n");

  // hashMap: oldHash → newHash for all processed files
  const hashMap = new Map<string, string>();

  const s = await passSeeds(client, records, hashMap, opts);
  const d = await passDerived(client, records, hashMap, opts);

  console.log("\n────────────────────────────────");
  console.log(`  Total converted  : ${s.converted + d.converted}`);
  console.log(`  Total improved   : ${s.improved + d.improved}`);
  console.log(`  Total remapped   : ${d.remapped}`);
  console.log(`  Total skipped    : ${s.skipped + d.skipped}`);
  console.log(`  Total failed     : ${s.failed + d.failed}`);
  if (opts.dryRun) console.log("  [DRY RUN — no files written]");
  console.log("────────────────────────────────\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
