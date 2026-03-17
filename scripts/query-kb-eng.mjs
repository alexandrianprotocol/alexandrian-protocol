/**
 * query-kb-eng.mjs  —  Full KB-DAG grounded OpenAI query with on-chain attribution
 *
 * Loads ALL 4 KB-ENG artifacts and injects them as layered system context,
 * then answers a single end-to-end question that requires knowledge from
 * all four domains simultaneously:
 *
 *   KB-ENG-1  (design)          resource model, HTTP semantics, versioning
 *   KB-ENG-2  (contracts)       OpenAPI spec structure, schema strictness
 *   KB-ENG-3  (implementation)  error handling, validation middleware, DI
 *   KB-ENG-4  (security)        auth, authz, input sanitization, OWASP
 *
 * The question: "Design and implement a production-ready POST /users endpoint
 * from scratch — API design decisions, OpenAPI contract, Express implementation,
 * and full security checklist evaluation."
 *
 * This shows why the DAG structure matters: the LLM needs all four KB layers
 * to answer the question correctly. Each KB in the chain gets cited and paid.
 *
 * Required env vars:
 *   OPENAI_API_KEY   — OpenAI API key
 *
 * Optional env vars:
 *   QUERY            — override the question entirely
 *   OPENAI_MODEL     — model to use (default: gpt-4o)
 *   DRY_RUN          — "true" to print prompt without calling OpenAI
 *
 * Usage:
 *   node scripts/query-kb-eng.mjs
 *   DRY_RUN=true node scripts/query-kb-eng.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require    = createRequire(import.meta.url);
const { config } = require("dotenv");
const __dirname  = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

// ── ANSI ─────────────────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", cyan: "\x1b[36m", gray: "\x1b[90m", white: "\x1b[97m",
  magenta: "\x1b[35m",
};
const bold    = s => `${C.bold}${s}${C.reset}`;
const dim     = s => `${C.dim}${s}${C.reset}`;
const green   = s => `${C.green}${s}${C.reset}`;
const cyan    = s => `${C.cyan}${s}${C.reset}`;
const blue    = s => `${C.blue}${s}${C.reset}`;
const magenta = s => `${C.magenta}${s}${C.reset}`;
const gray    = s => `${C.gray}${s}${C.reset}`;
const white   = s => `${C.white}${s}${C.reset}`;
const yellow  = s => `${C.yellow}${s}${C.reset}`;
const rule    = (ch = "─", n = 72) => gray(ch.repeat(n));

// ── Config ────────────────────────────────────────────────────────────────────
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL   = process.env.OPENAI_MODEL ?? "gpt-4o";
const DRY_RUN        = process.env.DRY_RUN === "true";
const BASESCAN       = "https://basescan.org";

// ── KB manifest — all 4 in DAG order ─────────────────────────────────────────
const KB_CHAIN = [
  {
    id           : "KB-ENG-1",
    artifactPath : resolve(__dirname, "../ipfs/kb-eng-1/artifact.json"),
    cid          : "QmQfF4NtyFhNeEwxn4GdHhUYT5o2Emmb1r2CDuo1AGe9un",
    tx           : "0x910b534b5da8dde3a0e0e6be71b8406e35dea2de2868334f0ae0f5b93d42b8e4",
    block        : 43_465_242,
    parents      : [],
    royaltyBps   : 0,
    color        : C.blue,
    layer        : "API Design",
    contribution : "resource model, HTTP semantics, versioning strategy, design document structure",
  },
  {
    id           : "KB-ENG-2",
    artifactPath : resolve(__dirname, "../ipfs/kb-eng-2/artifact.json"),
    cid          : "QmdzWRjtbWBQ8DpwzC8pHZ8U9BssHnzvPUDrS6gWeRRyck",
    tx           : "0x9ed0bff86d5a179ff6ff7f3ee40c15473071d48a2f014b2b79328a3b70941a49",
    block        : 43_465_244,
    parents      : ["KB-ENG-1"],
    royaltyBps   : 500,
    color        : C.green,
    layer        : "OpenAPI Contract",
    contribution : "OpenAPI 3.1 spec structure, component schemas, request/response strictness, security schemes",
  },
  {
    id           : "KB-ENG-3",
    artifactPath : resolve(__dirname, "../ipfs/kb-eng-3/artifact.json"),
    cid          : "QmZQ2gV9trEhNvKck8Rmr374k2hTWPU8yPj7btfPqCfWUq",
    tx           : "0x12ba3da15871a00c0baa4063508243c5c8bf9ee8be7f292c66fb3fa828bc20da",
    block        : 43_465_245,
    parents      : ["KB-ENG-1"],
    royaltyBps   : 500,
    color        : C.cyan,
    layer        : "Implementation",
    contribution : "schema-first routing, request validation, error pipeline, DI handlers, graceful shutdown",
  },
  {
    id           : "KB-ENG-4",
    artifactPath : resolve(__dirname, "../ipfs/kb-eng-4/artifact.json"),
    cid          : "Qmeu9YpyukeA96DptqKoafZo6rYsMwtryJQuFo8h5pDDrS",
    tx           : "0xb827012cdcf1ecd3c62bd7b2f035abb2ac744d2139abbf60695bd2d2714dc493",
    block        : 43_465_248,
    parents      : ["KB-ENG-3"],
    royaltyBps   : 500,
    color        : C.magenta,
    layer        : "Security",
    contribution : "auth/authz mapping, JWT validation, RBAC, input sanitization, rate limiting, OWASP Top 10",
  },
];

// ── The question — a natural engineering task that draws on all 4 KB layers ───
const DEFAULT_QUERY = `
Build a POST /api/keys endpoint for a SaaS product that lets authenticated users
generate API keys for their account.

Deliver the complete implementation: OpenAPI contract, Express/TypeScript handler,
and a security evaluation of what you built.
`.trim();

// ── Format all 4 KB artifacts as a layered system prompt ─────────────────────
function buildSystemPrompt(artifacts) {
  const lines = [];

  lines.push(`You are a senior software engineer. Your responses must be grounded in the`);
  lines.push(`following verified knowledge artifacts from the Alexandrian Protocol.`);
  lines.push(`These artifacts form a citation DAG: KB-ENG-1 → KB-ENG-2, KB-ENG-1 → KB-ENG-3 → KB-ENG-4.`);
  lines.push(`Each artifact is content-addressed (its kbHash is the on-chain contentHash).`);
  lines.push(``);
  lines.push(`When you use knowledge from a KB, cite it explicitly as [KB-ENG-N].`);
  lines.push(``);

  for (const { meta, artifact } of artifacts) {
    lines.push(`${"═".repeat(70)}`);
    lines.push(`KNOWLEDGE ARTIFACT: ${meta.id}  (${meta.layer})`);
    lines.push(`kbHash  : ${artifact.kbHash}`);
    lines.push(`title   : ${artifact.title}`);
    lines.push(`domain  : ${artifact.domain}`);
    lines.push(`summary : ${artifact.summary}`);
    lines.push(``);

    if (artifact.steps?.length) {
      lines.push(`PROCEDURE — ${artifact.steps.length} steps:`);
      for (const step of artifact.steps) {
        lines.push(``);
        lines.push(`  [${meta.id} · Step ${step.id}] ${step.title}`);
        lines.push(`  Rationale  : ${step.rationale}`);
        if (step.action)       lines.push(`  Action     : ${step.action}`);
        if (step.verification) lines.push(`  Verify     : ${step.verification}`);
      }
    }

    if (artifact.checklist?.length) {
      lines.push(`CHECKLIST — ${artifact.checklist.length} items:`);
      for (const item of artifact.checklist) {
        lines.push(``);
        lines.push(`  [${meta.id} · ${item.id}] ${item.title}`);
        lines.push(`  Rationale     : ${item.rationale}`);
        if (item.pass_criteria)     lines.push(`  Pass criteria : ${item.pass_criteria}`);
        if (item.fail_indicators?.length) {
          lines.push(`  Fail if       : ${item.fail_indicators.join(" | ")}`);
        }
      }
    }

    lines.push(``);
  }

  lines.push(`${"═".repeat(70)}`);
  lines.push(``);
  lines.push(`Rules:`);
  lines.push(`- Every claim must be traceable to a specific KB and step/item ID.`);
  lines.push(`- Do not invent steps or checklist items not present in the artifacts.`);
  lines.push(`- For the security checklist section, evaluate your own implementation.`);
  lines.push(`- Use real TypeScript/YAML code. Be specific and complete.`);

  return lines.join("\n");
}

// ── OpenAI call ───────────────────────────────────────────────────────────────
async function callOpenAI(systemPrompt, userQuery, model) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method : "POST",
    headers: {
      "Content-Type" : "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userQuery    },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!OPENAI_API_KEY && !DRY_RUN) {
    console.error(`\n${C.red}Error: OPENAI_API_KEY is required${C.reset}`);
    console.error("  Add it to .env  or  run with DRY_RUN=true");
    process.exit(1);
  }

  // Load all 4 artifacts
  const artifacts = KB_CHAIN.map(meta => {
    try {
      const artifact = JSON.parse(readFileSync(meta.artifactPath, "utf8"));
      return { meta, artifact };
    } catch {
      console.error(`Could not read ${meta.artifactPath}`);
      process.exit(1);
    }
  });

  const userQuery    = process.env.QUERY ?? DEFAULT_QUERY;
  const systemPrompt = buildSystemPrompt(artifacts);

  // ── Header ─────────────────────────────────────────────────────────────────
  console.clear();
  const w = 72;
  console.log(`\n${C.cyan}${"═".repeat(w)}${C.reset}`);
  console.log(bold(white(` ALEXANDRIAN PROTOCOL  —  Full DAG Query`.padEnd(w))));
  console.log(dim(` All 4 KB-ENG artifacts · grounded system context · on-chain attribution`));
  console.log(`${C.cyan}${"═".repeat(w)}${C.reset}`);

  console.log(`
  ${bold(white("Why all 4 KBs?"))}

  ${dim("A real engineering task spans the full API lifecycle — one KB isn't enough.")}
  ${dim("This query requires knowledge from all four layers simultaneously:")}

  ${C.blue}${bold("KB-ENG-1")}${C.reset}  ${dim("─→")}  ${C.green}${bold("KB-ENG-2")}${C.reset}  ${dim("(contract specification branch)")}
  ${C.blue}${bold("KB-ENG-1")}${C.reset}  ${dim("─→")}  ${C.cyan}${bold("KB-ENG-3")}${C.reset}  ${dim("─→")}  ${C.magenta}${bold("KB-ENG-4")}${C.reset}  ${dim("(implementation + security branch)")}

  ${dim("Each KB in the DAG that gets used earns a royalty when settleQuery() fires.")}
  ${dim("The deeper the DAG traversal, the more citations — and more authors paid.")}
  `);

  // ── KB chain summary ───────────────────────────────────────────────────────
  console.log(rule());
  console.log(bold(cyan(` KNOWLEDGE CHAIN  ·  4 artifacts loaded`)));
  console.log(rule());
  console.log();

  for (const { meta, artifact } of artifacts) {
    const payloadDesc = artifact.steps
      ? `${artifact.steps.length} steps`
      : artifact.checklist
        ? `${artifact.checklist.length} checklist items`
        : "unknown";

    console.log(`  ${meta.color}${bold(meta.id)}${C.reset}  ${bold(meta.layer)}`);
    console.log(dim(`     ${artifact.title}`));
    console.log(dim(`     domain: ${artifact.domain}  ·  payload: ${payloadDesc}  ·  royaltyBps: ${meta.royaltyBps}`));
    console.log(dim(`     kbHash: ${artifact.kbHash}`));
    console.log(dim(`     cid:    ${meta.cid}`));
    console.log(dim(`     tx:     ${BASESCAN}/tx/${meta.tx}`));
    if (meta.parents.length > 0) {
      console.log(dim(`     cites:  ${meta.parents.join(", ")}`));
    } else {
      console.log(dim(`     cites:  (root seed — no parents)`));
    }
    console.log();
  }

  // ── System prompt preview ──────────────────────────────────────────────────
  console.log(rule());
  console.log(bold(cyan(` SYSTEM PROMPT  ·  ${systemPrompt.split("\n").length} lines  ·  all 4 KB artifacts embedded`)));
  console.log(rule());

  const promptLines = systemPrompt.split("\n");
  const preview = promptLines.slice(0, 10);
  for (const line of preview) {
    console.log(`  ${gray("│")} ${dim(line)}`);
  }
  console.log(`  ${gray("│")} ${dim(`… (${promptLines.length - 10} more lines: 4 full KB procedures/checklists)`)}`);
  console.log();

  // ── User query ─────────────────────────────────────────────────────────────
  console.log(rule());
  console.log(bold(cyan(` USER QUERY  ·  requires all 4 KB layers to answer`)));
  console.log(rule());
  console.log();
  for (const line of userQuery.split("\n")) {
    console.log(`  ${line}`);
  }
  console.log();

  if (DRY_RUN) {
    console.log(yellow(`  [DRY_RUN=true]  OpenAI call skipped.\n`));
    console.log(dim("  Full system prompt:"));
    console.log(dim("  " + "─".repeat(68)));
    for (const line of systemPrompt.split("\n")) {
      console.log(`  ${dim(line)}`);
    }
    console.log();
    printRoyaltySection(artifacts);
    return;
  }

  // ── LLM call ───────────────────────────────────────────────────────────────
  console.log(rule());
  console.log(bold(cyan(` LLM RESPONSE  ·  ${OPENAI_MODEL}  ·  grounded across all 4 KBs`)));
  console.log(rule());

  console.log(`\n  ${dim(`Calling ${OPENAI_MODEL}…`)}\n`);

  const t0       = Date.now();
  const response = await callOpenAI(systemPrompt, userQuery, OPENAI_MODEL);
  const elapsed  = Date.now() - t0;
  const reply    = response.choices?.[0]?.message?.content ?? "(no content)";
  const usage    = response.usage ?? {};

  console.log(`  ${gray("model")}    ${response.model}`);
  console.log(`  ${gray("latency")}  ${elapsed}ms`);
  console.log(`  ${gray("tokens")}   ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`);
  console.log(`  ${gray("finish")}   ${response.choices?.[0]?.finish_reason}`);
  console.log();
  console.log(bold(white("  Answer:")));
  console.log();
  for (const line of reply.split("\n")) {
    console.log(`  ${line}`);
  }
  console.log();

  printRoyaltySection(artifacts);
}

// ── Royalty + attribution section ─────────────────────────────────────────────
function printRoyaltySection(artifacts) {
  console.log(rule());
  console.log(bold(cyan(` ATTRIBUTION TRAIL  ·  Every KB cited above is cryptographically traceable`)));
  console.log(rule());

  console.log(`
  ${bold(white("Four KBs grounded this response. Four citations. Four royalty streams."))}

  ${dim("KB hash = citation identifier. IPFS CID = content address. tx = proof of authorship.")}
  ${dim("When settleQuery() fires, the contract walks this DAG and distributes the fee.")}
  `);

  for (const { meta, artifact } of artifacts) {
    console.log(`  ${meta.color}${bold(meta.id)}${C.reset}  ${bold(meta.layer)}`);
    console.log(`  ${gray("  kbHash")}  ${cyan(artifact.kbHash)}`);
    console.log(`  ${gray("  cid")}     ${dim(meta.cid)}`);
    console.log(`  ${gray("  tx")}      ${dim(BASESCAN + "/tx/" + meta.tx)}`);
    if (meta.parents.length > 0) {
      console.log(`  ${gray("  cites")}   ${dim(meta.parents.join(", "))}`);
    }
    console.log();
  }

  console.log(rule());
  console.log(bold(cyan(` SETTLEMENT  ·  On-chain royalty routing for this query`)));
  console.log(rule());

  console.log(`
  ${bold(white("If an agent settles each KB it used (0.001 ETH per KB):"))}

  ${dim("settleQuery(KB-ENG-1.kbHash, agentAddress, { value: 0.001 ETH })")}
  ${dim("  └─ 2% protocol fee           →  0.000020 ETH  protocol treasury")}
  ${dim("  └─ remainder                 →  0.000980 ETH  KB-ENG-1 curator")}
  ${dim("  └─ (root seed, no parents — full remainder goes to curator)")}

  ${dim("settleQuery(KB-ENG-2.kbHash, agentAddress, { value: 0.001 ETH })")}
  ${dim("  └─ 500 bps → KB-ENG-1       →  0.000050 ETH  KB-ENG-1 curator")}
  ${dim("  └─ 2% protocol fee           →  0.000020 ETH  protocol treasury")}
  ${dim("  └─ remainder                 →  0.000930 ETH  KB-ENG-2 curator")}

  ${dim("settleQuery(KB-ENG-3.kbHash, agentAddress, { value: 0.001 ETH })")}
  ${dim("  └─ 500 bps → KB-ENG-1       →  0.000050 ETH  KB-ENG-1 curator")}
  ${dim("  └─ 2% protocol fee           →  0.000020 ETH  protocol treasury")}
  ${dim("  └─ remainder                 →  0.000930 ETH  KB-ENG-3 curator")}

  ${dim("settleQuery(KB-ENG-4.kbHash, agentAddress, { value: 0.001 ETH })")}
  ${dim("  └─ 500 bps → KB-ENG-3       →  0.000050 ETH  KB-ENG-3 curator")}
  ${dim("  └─ 2% protocol fee           →  0.000020 ETH  protocol treasury")}
  ${dim("  └─ remainder                 →  0.000930 ETH  KB-ENG-4 curator")}

  ${bold(white("Total for this 4-KB query:  0.004 ETH  (~$0.01 at current prices)"))}
  ${dim("  KB-ENG-1 curator receives royalties from 3 of the 4 settlements")}
  ${dim("  (directly, and as parent of ENG-2 and ENG-3) — the root seed is paid most.")}

  ${bold(white("To execute the full demo:"))}
  ${dim("  DOMAIN=engineering.api.design node scripts/demo-agent.mjs")}
  `);
}

main().catch(err => {
  console.error(`\n${C.red}Fatal:${C.reset} ${err.message}`);
  process.exit(1);
});
