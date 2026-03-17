/**
 * preview-bundle.mjs
 *
 * Renders the exact artifact.json + manifest.json + meta.json that
 * bundle-artifacts.mjs would pin to IPFS, so you can inspect them
 * before anything leaves your machine.
 *
 * Writes output to staging/preview/{kbHash}/ — three real files on disk.
 * Nothing is pinned, hashed on-chain, or sent anywhere.
 *
 * Usage:
 *   # Random sample of 3 KBs (default)
 *   node scripts/preview-bundle.mjs
 *
 *   # Specific KB by full or partial hash
 *   node scripts/preview-bundle.mjs --kb 0x000349f364
 *
 *   # Random sample of N KBs
 *   node scripts/preview-bundle.mjs --sample 10
 *
 *   # Validate every field in the sample (schema + content checks)
 *   node scripts/preview-bundle.mjs --sample 5 --validate
 *
 *   # Print to stdout instead of writing files (good for piping to jq)
 *   node scripts/preview-bundle.mjs --kb 0x000349 --stdout
 */

import { createRequire }                          from "module";
import { readFileSync, readdirSync, mkdirSync,
         writeFileSync, existsSync, rmSync }       from "fs";
import { join, dirname }                           from "path";
import { fileURLToPath, pathToFileURL }            from "url";

const require    = createRequire(import.meta.url);
const { keccak_256 } = require("js-sha3");
const __dirname  = dirname(fileURLToPath(import.meta.url));

// ── Re-use all transform logic from bundle-artifacts.mjs ──────────────────────
// Import the pure functions by dynamically reading + eval-ing the module.
// (bundle-artifacts.mjs exports nothing — functions are module-internal.)
// We duplicate only the minimal set needed here to keep the preview script
// self-contained and independently runnable.

// ── Shared helpers (kept in sync with bundle-artifacts.mjs) ───────────────────

function slugify(str) {
  return String(str).toLowerCase()
    .replace(/[<>]=?/g, m => ({ "<": "lt", ">": "gt", "<=": "lte", ">=": "gte" }[m] ?? m))
    .replace(/!=/g, "neq").replace(/=/g, "eq")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
}

function domainToKbType(domain = "") {
  const d = domain.toLowerCase();
  if (d.startsWith("meta."))                                             return "PromptEngineering";
  if (d.startsWith("agent.reasoning") || d.startsWith("agent.prompt"))  return "PromptEngineering";
  if (d.includes("state") || d.includes("fsm") || d.includes("machine")) return "StateMachine";
  if (d.includes("compliance") || d.includes("checklist") ||
      d.includes("audit")      || d.startsWith("knowledge."))           return "ComplianceChecklist";
  return "Practice";
}

function domainToEpistemicType(domain = "") {
  const d = domain.toLowerCase();
  if (d.startsWith("evm.") || d.includes("blockchain") || d.includes("web3")) return "empirical";
  if (d.startsWith("agent.") || d.startsWith("meta."))                        return "heuristic";
  return "procedural";
}

function extractMetrics(procedure = [], verification = []) {
  const sources = [...procedure, ...verification].map(s => typeof s === "string" ? s : "");
  const seen = new Set(), metrics = [];
  for (const text of sources)
    for (const m of text.matchAll(/\bassert\s+([^;\n]{4,120})/gi)) {
      const metric = m[1].trim().replace(/\.$/, "").replace(/\s+/g, " ");
      if (metric.length >= 4 && !seen.has(metric)) { seen.add(metric); metrics.push(metric); }
    }
  return metrics;
}

const KNOWN_TOOLS = new Set([
  "prometheus","grafana","postman","datadog","opentelemetry","jaeger",
  "elasticsearch","kibana","splunk","pagerduty","zipkin","honeycomb",
  "terraform","kubernetes","helm","docker","jenkins",
  "owasp zap","jmeter","apache jmeter","junit","jmh",
  "neo4j","redis","postgres","postgresql","mysql","mongodb","cassandra",
  "explain analyze","sparql","shacl",
]);

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

function extractToolMentions(procedure) {
  const result = new Map();
  const ep = /using\s+(?:tools?\s+like\s+)([A-Z][A-Za-z0-9\s]{1,38}?)(?:\s+to|\s+for|,|\.|;)/g;
  procedure.forEach((text, i) => {
    if (typeof text !== "string") return;
    const found = new Set();
    for (const m of text.matchAll(ep)) found.add(m[1].trim());
    const lower = text.toLowerCase();
    for (const tool of KNOWN_TOOLS)
      if (lower.includes(tool))
        found.add(tool.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
    if (found.size) result.set(i, [...found]);
  });
  return result;
}

function buildSemanticGraph(entry, metrics) {
  const procedure = entry.procedure ?? [], references = entry.references ?? [];
  const nodes = [], edges = [], edgeSeen = new Set();
  function addEdge(from, rel, to) {
    const k = `${from}|${rel}|${to}`;
    if (!edgeSeen.has(k)) { edgeSeen.add(k); edges.push({ from, rel, to }); }
  }
  nodes.push({ id: "kb:self", label: entry.title ?? "", type: "kb" });
  procedure.forEach((text, i) => {
    const id = `step:${i + 1}`;
    nodes.push({ id, label: (typeof text === "string" ? text.split(";")[0].trim().slice(0, 100) : `Step ${i + 1}`), type: "step" });
    addEdge(i === 0 ? "kb:self" : `step:${i}`, i === 0 ? "starts_with" : "precedes", id);
  });
  const stepOutputs = extractLogOutputs(procedure);
  const outputsSeen = new Set();
  for (const [idx, { outputs, logTarget }] of stepOutputs) {
    for (const name of outputs) {
      const id = `out:${slugify(name)}`;
      if (!outputsSeen.has(id)) { outputsSeen.add(id); nodes.push({ id, label: name.replace(/_/g, " "), type: "output" }); }
      addEdge(`step:${idx + 1}`, "produces", id);
    }
    if (logTarget) {
      const tid = `out:${slugify(logTarget)}`;
      if (!outputsSeen.has(tid)) { outputsSeen.add(tid); nodes.push({ id: tid, label: logTarget.replace(/_/g, " "), type: "output" }); }
      for (const name of outputs) addEdge(`out:${slugify(name)}`, "logged_to", tid);
    }
  }
  const stepTools = extractToolMentions(procedure);
  const toolsSeen = new Set();
  for (const [idx, toolNames] of stepTools) {
    for (const name of toolNames) {
      const id = `tool:${slugify(name)}`;
      if (!toolsSeen.has(id)) { toolsSeen.add(id); nodes.push({ id, label: name, type: "tool" }); }
      addEdge(`step:${idx + 1}`, "uses", id);
    }
  }
  metrics.forEach(metric => {
    const id = `assert:${slugify(metric)}`;
    nodes.push({ id, label: metric, type: "assertion" });
    procedure.forEach((text, i) => {
      if (typeof text === "string" && text.toLowerCase().includes(metric.slice(0, 35).toLowerCase()))
        addEdge(`step:${i + 1}`, "asserts", id);
    });
  });
  references.forEach(ref => {
    const id = `ref:${slugify(ref)}`;
    nodes.push({ id, label: ref, type: "reference" });
    addEdge("kb:self", "references", id);
  });
  return { nodes, edges };
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonicalJson(value[k])).join(",") + "}";
}

// ── Helpers kept in sync with bundle-artifacts.mjs ───────────────────────────

function qualityToRoyaltyBps(quality) {
  if (!quality) return 100;
  const { classification, score } = quality;
  if (classification === "anchor") {
    if (score >= 2.9) return 500;
    if (score >= 2.7) return 400;
    return 300;
  }
  if (classification === "standard") return 200;
  return 100;
}

function kbTypeToPayloadType(kbType) {
  if (kbType === "ComplianceChecklist" || kbType === "Rubric") return "checklist";
  if (kbType === "StateMachine")                               return "specification";
  if (kbType === "PromptEngineering")                          return "reference";
  return "procedure";
}

function buildInterfaceOutputs(stepOutputs) {
  const seen = new Set(), outputs = [];
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

export function buildBundle(kbHash, entry) {
  const NOW         = new Date().toISOString();
  const metrics     = extractMetrics(entry.procedure, entry.verification);
  const stepOutputs = extractLogOutputs(entry.procedure ?? []);

  const kbType      = domainToKbType(entry.domain);
  const payloadType = kbTypeToPayloadType(kbType);
  const royaltyBps  = qualityToRoyaltyBps(entry._quality);
  const rawScore    = entry._quality?.score;
  const confidence  = rawScore != null ? Math.round((rawScore / 3) * 100) / 100 : null;
  const publishedAt = typeof entry.publishedAt === "string" ? entry.publishedAt : "";

  const procedureSteps = (entry.procedure ?? []).map((action, i) => ({
    action: typeof action === "string" ? action : String(action),
    step: i + 1,
  }));

  const successConditions = (entry.verification ?? []).map(s =>
    typeof s === "string" ? s.split(/;\s*assert\s+/i)[0].trim() : s
  );

  const artifact = {
    artifactRefs:  [],
    capabilities:  [entry.standard].filter(Boolean),
    confidence,
    domain:        entry.domain ?? "meta.protocol",
    epistemicType: domainToEpistemicType(entry.domain),
    interface:     { inputs: [], outputs: buildInterfaceOutputs(stepOutputs) },
    isSeed:        true,
    kbHash,
    kbType,
    parentHashes:  [],
    payloadType,
    procedure:     procedureSteps,
    publishedAt,
    royaltyBps,
    schemaVersion: "2.5",
    summary:       entry.summary ?? "",
    tags:          entry.tags    ?? [],
    title:         entry.title   ?? "",
    verification: {
      failureConditions: entry.failure_modes ?? [],
      metrics,
      successConditions,
    },
  };

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

  const meta = {
    domain:       artifact.domain,
    isSeed:       artifact.isSeed,
    kbHash,
    kbType:       artifact.kbType,
    payloadType:  artifact.payloadType,
    publishedAt:  artifact.publishedAt,
    score: {
      classification: entry._quality?.classification ?? "unknown",
      weighted:       entry._quality?.score          ?? 0,
    },
    semanticGraph: buildSemanticGraph(entry, metrics),
    tags:          artifact.tags,
    title:         artifact.title,
  };

  return { artifact, artifactBytes, artifactHash, manifest, meta };
}

// ── Validation ────────────────────────────────────────────────────────────────

const REQUIRED_FIELDS = [
  "artifactRefs","capabilities","confidence","domain","epistemicType",
  "interface","isSeed","kbHash","kbType","parentHashes","payloadType",
  "procedure","publishedAt","royaltyBps","schemaVersion","summary","tags",
  "title","verification",
];
const VALID_KB_TYPES       = new Set(["Practice","Feature","StateMachine","PromptEngineering","ComplianceChecklist","Rubric"]);
const VALID_EPISTEMIC_TYPES = new Set(["procedural","declarative","heuristic","invariant","empirical"]);
const VALID_PAYLOAD_TYPES   = new Set(["procedure","checklist","reference","specification"]);

function validate(artifact, artifactHash, meta) {
  const issues = [];

  // Required fields
  for (const f of REQUIRED_FIELDS)
    if (artifact[f] === undefined) issues.push(`MISSING  artifact.${f}`);

  // Schema values
  if (!VALID_KB_TYPES.has(artifact.kbType))
    issues.push(`INVALID  kbType "${artifact.kbType}" — must be one of ${[...VALID_KB_TYPES].join(", ")}`);
  if (!VALID_EPISTEMIC_TYPES.has(artifact.epistemicType))
    issues.push(`INVALID  epistemicType "${artifact.epistemicType}"`);
  if (!VALID_PAYLOAD_TYPES.has(artifact.payloadType))
    issues.push(`INVALID  payloadType "${artifact.payloadType}"`);

  // Hash format
  if (!/^0x[0-9a-f]{64}$/.test(artifactHash))
    issues.push(`INVALID  artifactHash format: ${artifactHash}`);
  if (!/^0x[0-9a-f]{64}$/.test(artifact.kbHash))
    issues.push(`INVALID  kbHash format: ${artifact.kbHash}`);

  // Content quality
  if (!artifact.title || artifact.title.length < 5)
    issues.push(`WARN     title too short: "${artifact.title}"`);
  if (!artifact.summary || artifact.summary.length < 20)
    issues.push(`WARN     summary too short`);
  if ((artifact.procedure ?? []).length === 0)
    issues.push(`WARN     procedure is empty`);
  if ((artifact.verification?.metrics ?? []).length === 0)
    issues.push(`WARN     no verification metrics extracted`);
  if ((artifact.capabilities ?? []).length === 0)
    issues.push(`WARN     capabilities empty (no standard field in refined KB)`);

  // Semantic graph
  const g = meta.semanticGraph;
  if (!g || !g.nodes || !g.edges)
    issues.push(`MISSING  semanticGraph in meta.json`);
  else {
    if (g.nodes.length < 3) issues.push(`WARN     semanticGraph has only ${g.nodes.length} nodes`);
    if (g.edges.length < 2) issues.push(`WARN     semanticGraph has only ${g.edges.length} edges`);
  }

  return issues;
}

// ── CLI arg parsing ───────────────────────────────────────────────────────────

function parseArgs() {
  const args     = process.argv.slice(2);
  const get      = flag => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
  const has      = flag => args.includes(flag);
  return {
    all:      has("--all"),
    kb:       get("--kb"),
    outDir:   get("--out-dir"),
    sample:   parseInt(get("--sample") ?? "3", 10),
    validate: has("--validate"),
    stdout:   has("--stdout"),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const opts       = parseArgs();
  const stagingDir = join(__dirname, "..", "staging");
  const refinedDir = join(stagingDir, "refined");
  const previewDir = opts.outDir ?? join(stagingDir, "preview");

  const allFiles = readdirSync(refinedDir).filter(f => f.endsWith(".json"));

  // Resolve which KBs to preview
  let targets;
  if (opts.kb) {
    const partial = opts.kb.replace(/^0x/, "").toLowerCase();
    targets = allFiles.filter(f => f.replace(/^0x/, "").toLowerCase().startsWith(partial));
    if (targets.length === 0) {
      console.error(`No KB found matching --kb ${opts.kb}`);
      process.exit(1);
    }
    if (targets.length > 1) {
      console.log(`Matched ${targets.length} KBs for prefix "${opts.kb}", previewing first.`);
      targets = [targets[0]];
    }
  } else if (opts.all) {
    targets = allFiles;
  } else {
    // Random sample
    const shuffled = [...allFiles].sort(() => Math.random() - 0.5);
    targets = shuffled.slice(0, opts.sample);
  }

  console.log(`\nAlexandrian KB Preview`);
  console.log(`  Source:   ${refinedDir}`);
  if (!opts.stdout) console.log(`  Output:   ${previewDir}`);
  console.log(`  KBs:      ${targets.length}`);
  console.log(`  Validate: ${opts.validate}`);
  console.log(`  Stdout:   ${opts.stdout}\n`);

  let totalIssues = 0;

  for (const file of targets) {
    const entry   = JSON.parse(readFileSync(join(refinedDir, file), "utf8"));
    const kbHash  = file.replace(".json", "");
    const { artifact, artifactBytes, artifactHash, manifest, meta } = buildBundle(kbHash, entry);

    if (opts.stdout) {
      // Machine-readable: print separator + 3 JSON blocks
      console.log(`\n${"─".repeat(72)}`);
      console.log(`KB: ${kbHash}`);
      console.log(`${"─".repeat(72)}\n`);
      console.log("── artifact.json ──");
      console.log(JSON.stringify(artifact, null, 2));
      console.log("\n── manifest.json ──");
      console.log(JSON.stringify(manifest, null, 2));
      console.log("\n── meta.json ──");
      console.log(JSON.stringify(meta, null, 2));
      console.log(`\n── artifactHash (on-chain commitment) ──`);
      console.log(artifactHash);
    } else {
      // Write three files to staging/preview/{kbHash}/
      const outDir = join(previewDir, kbHash);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "artifact.json"),  JSON.stringify(artifact,  null, 2) + "\n");
      writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest,  null, 2) + "\n");
      writeFileSync(join(outDir, "meta.json"),     JSON.stringify(meta,      null, 2) + "\n");
      // Write a human-readable summary alongside the files
      const summary = [
        `KB Preview`,
        `  hash:         ${kbHash}`,
        `  artifactHash: ${artifactHash}`,
        `  title:        ${artifact.title}`,
        `  domain:       ${artifact.domain}`,
        `  kbType:       ${artifact.kbType}`,
        `  epistemicType:${artifact.epistemicType}`,
        `  payloadType:  ${artifact.payloadType}`,
        `  confidence:   ${artifact.confidence}`,
        `  procedure:    ${artifact.procedure.length} steps`,
        `  capabilities: ${artifact.capabilities.length}`,
        `  metrics:      ${artifact.verification.metrics.length}`,
        `  graph nodes:  ${meta.semanticGraph.nodes.length}`,
        `  graph edges:  ${meta.semanticGraph.edges.length}`,
        `  artifact.json size: ${artifactBytes.length} bytes`,
        `  meta.json size:     ${JSON.stringify(meta).length} bytes`,
      ].join("\n");
      writeFileSync(join(outDir, "SUMMARY.txt"), summary + "\n");
      console.log(`✓ ${kbHash.slice(0, 14)}…  "${artifact.title.slice(0, 50)}"`);
      console.log(`   → ${outDir}`);
    }

    if (opts.validate) {
      const issues = validate(artifact, artifactHash, meta);
      if (issues.length === 0) {
        console.log(`  ✓ validation passed`);
      } else {
        console.log(`  ✗ ${issues.length} issue(s):`);
        issues.forEach(i => console.log(`    ${i}`));
        totalIssues += issues.length;
      }
    }
  }

  if (!opts.stdout) {
    console.log(`\nOpen staging/preview/ to inspect the files.`);
  }
  if (opts.validate && totalIssues > 0) {
    console.log(`\n${totalIssues} validation issue(s) found across ${targets.length} KB(s).`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
