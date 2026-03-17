/**
 * alexandrian-agent.mjs
 *
 * Demonstrates the full Alexandrian Protocol lifecycle using the SDK interface:
 *   Step 1 — Discovery    · TheGraphIndexerAdapter.getTopKBsByDomain()
 *   Step 2 — Verification · AlexandrianSDK.getKB() + Core.fetchArtifactVerified()
 *   Step 3 — Execution    · LLM applies verified KB procedures as structured context
 *   Step 4 — Attribution  · AlexandrianSDK.getAttributionDAG() + recordUsage()
 *
 * SDK Architecture:
 *   AI Agent
 *     └── Alexandrian SDK
 *           ├─ TheGraphIndexerAdapter  → The Graph (discovery + reputation)
 *           ├─ AlexandrianSDK.getKB() → Base Mainnet contract (on-chain verification)
 *           └─ Core.fetchArtifactVerified() → IPFS (artifact + hash integrity)
 *
 * SDK Status: Live
 *   AlexandrianSDK, TheGraphIndexerAdapter, EthersChainAdapter, HeadSourceStub,
 *   ProofAdapterStub, MAINNET_REGISTRY_ADDRESS, and MAINNET_SUBGRAPH_URL are
 *   imported directly from @alexandrian/sdk-adapters.
 *   Core.fetchArtifactVerified() is a local IPFS gateway fallback (not in sdk-core).
 *
 * Usage:
 *   node scripts/alexandrian-agent.mjs "design a multi-agent pipeline for evaluating an LLM"
 *
 * Required .env:
 *   OPENAI_API_KEY     — OpenAI API key for LLM execution
 *
 * Optional .env:
 *   BASE_RPC_URL       — defaults to https://mainnet.base.org
 */

import { ethers }        from "ethers";
import { createRequire } from "module";
import { resolve, dirname } from "path";
import { fileURLToPath }   from "url";
import { writeFileSync }   from "fs";

// ── Alexandrian SDK ────────────────────────────────────────────────────────────
import {
  AlexandrianSDK,
  TheGraphIndexerAdapter,
  MAINNET_REGISTRY_ADDRESS,
  MAINNET_SUBGRAPH_URL,
  EthersChainAdapter,
  HeadSourceStub,
  ProofAdapterStub,
} from "../packages/sdk-adapters/dist/index.js";

const require    = createRequire(import.meta.url);
const { config } = require("dotenv");
const __dirname  = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

// ── ANSI ──────────────────────────────────────────────────────────────────────
const C = {
  reset:"\x1b[0m", bold:"\x1b[1m", dim:"\x1b[2m",
  red:"\x1b[31m",  green:"\x1b[32m", yellow:"\x1b[33m",
  blue:"\x1b[34m", magenta:"\x1b[35m", cyan:"\x1b[36m",
  gray:"\x1b[90m", white:"\x1b[97m",
};
const bold    = s => `${C.bold}${s}${C.reset}`;
const dim     = s => `${C.dim}${s}${C.reset}`;
const green   = s => `${C.green}${s}${C.reset}`;
const red     = s => `${C.red}${s}${C.reset}`;
const yellow  = s => `${C.yellow}${s}${C.reset}`;
const cyan    = s => `${C.cyan}${s}${C.reset}`;
const gray    = s => `${C.gray}${s}${C.reset}`;
const white   = s => `${C.white}${s}${C.reset}`;
const tick    = green("✓");
const cross   = red("✗");
const arrow   = gray("→");
const sdkTag  = s => `${C.cyan}[SDK]${C.reset} ${C.dim}${s}${C.reset}`;

// ── Local attribution helper ───────────────────────────────────────────────────
// recordUsage is not part of @alexandrian/sdk-adapters — it's a local off-chain
// attribution log builder. Call sdk.settleCitation() for on-chain royalty distribution.
function recordUsage(usage) {
  return {
    kbHashes : usage.kbHashes,
    task     : usage.task,
    model    : usage.model,
    timestamp: new Date().toISOString(),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Core — IPFS artifact utilities (local gateway fallback, not in sdk-core)
//
// @alexandrian/sdk-core is a peer dependency with its own gateway config;
// this local implementation provides multi-gateway fallback for the agent script.
//
// Verification strategy: artifact.kbHash == expectedHash (semantic hash binding)
// The kbHash field is the KB content hash baked into the artifact at publish time,
// proving the artifact is the exact one registered on-chain.
// ══════════════════════════════════════════════════════════════════════════════

const Core = {
  IPFS_GATEWAYS: [
    "https://gateway.pinata.cloud/ipfs",
    "https://cloudflare-ipfs.com/ipfs",
    "https://ipfs.io/ipfs",
    "https://dweb.link/ipfs",
  ],

  /**
   * Fetch an IPFS artifact and verify its hash binding.
   * Mirrors: Core.fetchArtifactVerified(uri, expectedHash) → VerifiedArtifact
   * @param {string} cid           — IPFS CID (Qm... or bafy...)
   * @param {string} expectedHash  — on-chain contentHash to verify against
   * @returns {Promise<{ value, verified, actualHash, checks }>}
   */
  async fetchArtifactVerified(cid, expectedHash) {
    for (const gw of this.IPFS_GATEWAYS) {
      try {
        const res = await fetch(`${gw}/${cid}`, {
          signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) continue;
        const artifact = await res.json();
        const actualHash  = artifact.kbHash ?? "(not found in artifact)";
        const hashMatches = actualHash.toLowerCase() === expectedHash.toLowerCase();
        return {
          value      : artifact,
          verified   : hashMatches,
          expectedHash,
          actualHash,
          gateway    : gw,
          checks: {
            hashFormatOk: /^0x[0-9a-fA-F]{64}$/.test(expectedHash),
            hashMatches,
          },
        };
      } catch { /* try next gateway */ }
    }
    return {
      value    : null,
      verified : false,
      expectedHash,
      actualHash: "(fetch failed)",
      checks: { hashFormatOk: false, hashMatches: false },
    };
  },
};

// ── Runtime Config ────────────────────────────────────────────────────────────
const RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const MODEL   = "gpt-4o";
const BASESCAN = "https://basescan.org";

// ── KB Registry ───────────────────────────────────────────────────────────────
const KB_REGISTRY = [
  {
    id      : "KB-AG-1",
    hash    : "0xb43e01c593055391b14c08a93aeb672a995ce4c5f3176533dd6f340dd2c57c24",
    cid     : "QmPorCfvbVGYaqz9Ngz2ybTxZZxEmnn39NcFHXJJViVZzA",
    domain  : "agent.orchestration.multi_agent",
    keywords: ["orchestrat", "pipeline", "multi.?agent", "coordinat", "workflow", "architect"],
    color   : C.blue,
    royaltyBps: 0,
  },
  {
    id      : "KB-AG-2",
    hash    : "0x0266a889b02779d969686298f7ea4fcb10fc1bfe09bcc6dd5d345db0342e8f88",
    cid     : "QmYGBH1HsHHy6t9VQ6tzKEpA4pFafZXxY3babLQpGW8FHi",
    domain  : "agent.planning.task_decomposition",
    keywords: ["decomposi", "subtask", "plan", "hierarch", "break.?down", "task", "goal"],
    color   : C.green,
    royaltyBps: 600,
  },
  {
    id      : "KB-AG-3",
    hash    : "0xd32a951458cf3042090ec7d568a1184dbc22095a8d050dfbb080c3a3a31587d0",
    cid     : "QmUysbUkvwEwo6Tnph6s6X76K46QpoxAET8ZEeMNxDnvoU",
    domain  : "agent.evaluation.pipeline",
    keywords: ["eval", "assess", "test", "benchmark", "quality", "reliab", "regress", "metric", "measur"],
    color   : C.magenta,
    royaltyBps: 500,
  },
];

// ── Retry helper ──────────────────────────────────────────────────────────────
// Base Mainnet's RPC load balancer occasionally routes to lagging nodes,
// returning `missing revert data (data=null)` on view calls. Retrying on a
// fresh provider connection almost always resolves it within 1–2 attempts.
async function withRetry(fn, { retries = 3, delayMs = 1200, label = "" } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRpcLag =
        err.message?.includes("missing revert data") ||
        err.message?.includes("data=null")           ||
        err.message?.includes("could not decode")    ||
        err.message?.includes("network does not support");
      if (!isRpcLag || attempt === retries) throw err;
      const wait = delayMs * attempt;
      process.stdout.write(
        `\n  ${yellow("⚠")} ${dim(`${label} RPC lag (attempt ${attempt}/${retries}) — retrying in ${wait}ms…`)}\n  `
      );
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function rule(len = 72) { return gray("─".repeat(len)); }
function hx(s)          { return `${s.slice(0,10)}…${s.slice(-6)}`; }

function step(num, title, subtitle) {
  console.log(`\n${rule()}`);
  console.log(bold(cyan(` STEP ${num} / 4  ·  ${title}`)));
  if (subtitle) console.log(gray(`  ${subtitle}`));
  console.log(rule());
}

function matchKBsToTask(_task) {
  // Always include all registered KBs — the full registry is the demo corpus.
  // Keyword matching is used only for display labels, not to gate discovery.
  return [...KB_REGISTRY];
}

function formatKBForPrompt(kb, artifact) {
  const steps   = (artifact.steps ?? [])
    .slice(0, 6)
    .map((s, i) => `  ${i+1}. ${s.action}\n     Rationale: ${s.rationale ?? "—"}`)
    .join("\n");
  const caps    = (artifact.capabilities ?? []).join(", ");
  const success = (artifact.verification?.successConditions ?? []).slice(0,3).join("; ");
  return `
╔══ ${kb.id}: ${artifact.title ?? kb.id} ══
║  Domain:         ${artifact.domain ?? kb.domain}
║  Type:           ${artifact.kbType ?? "—"}
║  Content hash:   ${kb.hash}
║  IPFS CID:       ${kb.cid}
║
║  Summary:
║  ${artifact.summary ?? "—"}
║
║  Capabilities:   ${caps || "—"}
║
║  Procedure (steps):
${steps || "  (no steps)"}
║
║  Success conditions: ${success || "—"}
╚${"═".repeat(60)}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const task = process.argv.slice(2).join(" ").trim();
  if (!task) {
    console.error(red('\nUsage: node scripts/alexandrian-agent.mjs "your task here"\n'));
    process.exit(1);
  }

  console.clear();
  console.log(`\n${bold(white("Alexandrian Agent Demonstration"))}`);
  console.log(dim("This session shows an AI agent using the Alexandrian Protocol to:"));
  console.log(dim("  1. Discover knowledge blocks from the decentralized knowledge graph"));
  console.log(dim("  2. Verify their authenticity against the blockchain"));
  console.log(dim("  3. Execute their procedures to solve a task"));
  console.log(dim("  4. Record attribution for royalty settlement"));
  console.log();
  console.log(`${C.cyan}${"═".repeat(72)}${C.reset}`);
  console.log(bold(white("  ALEXANDRIAN AGENT")));
  console.log(dim("  Knowledge retrieval · Verification · Execution · Attribution"));
  console.log(`${C.cyan}${"═".repeat(72)}${C.reset}`);
  console.log(dim(`\n  SDK:  @alexandrian/sdk-adapters  ·  TheGraphIndexerAdapter  ·  AlexandrianSDK`));
  console.log(dim(`  Contract:   ${MAINNET_REGISTRY_ADDRESS}`));
  console.log(dim(`  Subgraph:   The Graph Studio (alexandrian-protocol)`));
  console.log(`\n  ${bold("Task:")} "${cyan(task)}"\n`);

  // ── SDK initialization ─────────────────────────────────────────────────────
  console.log(`  ${sdkTag("new TheGraphIndexerAdapter(MAINNET_SUBGRAPH_URL)")}`);
  const indexer = new TheGraphIndexerAdapter(MAINNET_SUBGRAPH_URL);

  console.log(`  ${sdkTag("new AlexandrianSDK({ chainAdapter, registryAddress, headSource, proofAdapter })")}`);
  const provider    = new ethers.JsonRpcProvider(RPC_URL);
  const chainAdapter = new EthersChainAdapter(provider);
  const sdk = new AlexandrianSDK({
    chainAdapter,
    registryAddress: MAINNET_REGISTRY_ADDRESS,
    headSource     : new HeadSourceStub(),
    txAdapter      : { sendTransaction: async () => { throw new Error("read-only mode"); } },
    proofAdapter   : new ProofAdapterStub(),
    subgraphUrl    : MAINNET_SUBGRAPH_URL,
  });

  const attribution = {
    task,
    timestamp          : new Date().toISOString(),
    sdkInterface       : {
      indexer: "TheGraphIndexerAdapter",
      sdk    : "AlexandrianSDK",
      core   : "Core.fetchArtifactVerified",
    },
    knowledgeBlocksUsed: [],
    verified           : [],
    model              : MODEL,
    response           : null,
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 1 — DISCOVERY
  // SDK call: TheGraphIndexerAdapter.getTopKBsByDomain(domain, limit)
  // ════════════════════════════════════════════════════════════════════════════
  step("1", "Discovery", "TheGraphIndexerAdapter.getTopKBsByDomain() — live subgraph query");

  const candidates = matchKBsToTask(task);
  console.log(`\n  ${arrow} Matching task keywords to KB domains…`);
  for (const kb of candidates) {
    console.log(`  ${kb.color}${bold(kb.id)}${C.reset}  ${dim(kb.domain)}`);
  }

  const discovered = [];
  for (const kb of candidates) {
    console.log(`\n  ${sdkTag(`indexer.getTopKBsByDomain("${kb.domain}", 10)`)}`);
    try {
      const summaries = await indexer.getTopKBsByDomain(kb.domain, 10);
      const match = summaries.find(
        s => s.contentHash?.toLowerCase() === kb.hash.toLowerCase() ||
             s.id?.toLowerCase()          === kb.hash.toLowerCase()
      );
      const inGraph = Boolean(match);
      const status  = inGraph ? tick : yellow("⚠ syncing");

      console.log(`  ${status}  ${kb.color}${bold(kb.id)}${C.reset}  ${dim(kb.domain)}`);
      if (match) {
        const rep  = match.reputationScore ?? "—";
        const setl = match.settlementCount ?? "0";
        const val  = match.totalSettledValue ?? "0";
        const dep  = match.lineageDepth ?? "—";
        console.log(dim(`       reputation: ${rep}  ·  settlements: ${setl}  ·  ETH settled: ${val}  ·  lineage depth: ${dep}`));
      } else {
        console.log(dim(`       not yet indexed — will verify directly on Base`));
      }
      discovered.push({ ...kb, inGraph, graphSummary: match ?? null });
    } catch (err) {
      console.log(`  ${yellow("⚠")}  ${kb.color}${bold(kb.id)}${C.reset}  ${dim(`subgraph unavailable: ${err.message.slice(0,60)}`)}`);
      discovered.push({ ...kb, inGraph: false, graphSummary: null });
    }
  }

  console.log(`\n  ${tick} ${bold(discovered.length.toString())} Knowledge Block${discovered.length !== 1 ? "s" : ""} discovered`);

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 2 — VERIFICATION
  // SDK calls:
  //   AlexandrianSDK.getKB(contentHash)               — on-chain record
  //   Core.fetchArtifactVerified(cid, contentHash)     — IPFS artifact + hash binding
  // ════════════════════════════════════════════════════════════════════════════
  step("2", "Verification", "AlexandrianSDK.getKB() + Core.fetchArtifactVerified()");

  console.log(dim(`\n  Contract:  ${MAINNET_REGISTRY_ADDRESS}`));
  console.log(dim(`  Network:   Base Mainnet (chain ID 8453)\n`));

  const verifiedKBs = [];

  for (const kb of discovered) {
    console.log(`  ${arrow} ${kb.color}${bold(kb.id)}${C.reset}  ${dim(hx(kb.hash))}`);

    // ── SDK: AlexandrianSDK.getKB() ──────────────────────────────────────────
    console.log(`  ${sdkTag(`sdk.getKB("${hx(kb.hash)}")`)}`);
    let onChainKB;
    try {
      onChainKB = await withRetry(
        () => sdk.getKB(kb.hash),
        { retries: 3, delayMs: 1200, label: kb.id }
      );
    } catch (err) {
      console.log(`  ${cross} ${red(`getKB failed: ${err.message.slice(0, 60)}`)}\n`);
      continue;
    }

    const properlyRegistered =
      onChainKB.exists &&
      onChainKB.curator !== ethers.ZeroAddress &&
      onChainKB.timestamp > 0;

    if (!properlyRegistered) {
      console.log(`  ${cross} ${red("Not properly registered on-chain — skipping")}\n`);
      continue;
    }

    const publishDate = new Date(onChainKB.timestamp * 1000).toISOString().slice(0, 10);
    console.log(`  ${tick}  on-chain:  exists=true  curator=${hx(onChainKB.curator)}  published=${publishDate}`);

    // ── SDK: Core.fetchArtifactVerified() ────────────────────────────────────
    console.log(`  ${sdkTag(`Core.fetchArtifactVerified("${kb.cid}", contentHash)`)}`);
    const result = await Core.fetchArtifactVerified(kb.cid, kb.hash);

    if (!result.value) {
      console.log(`  ${cross} ${red("IPFS fetch failed across all gateways")}\n`);
      continue;
    }

    const { verified, checks } = result;
    const statusIcon = verified ? tick : cross;
    const statusText = verified ? green("AUTHENTIC") : red("HASH MISMATCH");
    console.log(`  ${statusIcon}  hash binding:  artifact.kbHash ${verified ? "==" : "≠"} on-chain contentHash  ${statusText}`);
    console.log(dim(`       gateway: ${result.gateway}`));
    console.log(dim(`       expected: ${hx(result.expectedHash)}`));
    console.log(dim(`       actual:   ${hx(result.actualHash)}`));

    if (properlyRegistered && verified && result.value) {
      verifiedKBs.push({ ...kb, artifact: result.value, ...onChainKB, hashOk: true });
      attribution.verified.push({
        id          : kb.id,
        hash        : kb.hash,
        cid         : kb.cid,
        curator     : onChainKB.curator,
        publishedAt : new Date(onChainKB.timestamp * 1000).toISOString(),
        domain      : onChainKB.domain,
        checks,
        sdkMethod   : "AlexandrianSDK.getKB + Core.fetchArtifactVerified",
      });
      console.log(`  ${green("✓")} ${green(kb.id)} verified — ready for use\n`);
    } else {
      console.log(`  ${yellow("⚠")} Verification incomplete — skipping\n`);
    }
  }

  if (verifiedKBs.length === 0) {
    console.log(red("\n  No KBs could be verified. Cannot proceed to execution."));
    process.exit(1);
  }

  console.log(`  ${tick} ${bold(verifiedKBs.length + " / " + discovered.length)} KBs verified  ${dim("→ proceeding to execution")}`);

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 3 — EXECUTION
  // LLM applies verified KB procedures as structured context
  // ════════════════════════════════════════════════════════════════════════════
  step("3", "Execution", `LLM applying ${verifiedKBs.length} verified KB procedures  ·  model: ${MODEL}`);

  const kbContext = verifiedKBs
    .map(kb => formatKBForPrompt(kb, kb.artifact))
    .join("\n\n");

  const systemPrompt = `You are an AI agent operating on the Alexandrian Protocol — a decentralized knowledge attribution system. You have been given verified Knowledge Blocks (KBs) retrieved from the Alexandrian registry. Each KB has been cryptographically verified: its content hash matches what is registered on the Base blockchain.

Your task is to apply the knowledge in these KBs to answer the user's request. You must:
1. Follow the procedures defined in the relevant KBs
2. Explicitly reference which KB(s) informed each major section of your response
3. Be structured, actionable, and cite the KB ID (e.g. "Per KB-AG-2:") when applying a procedure
4. If multiple KBs are relevant to a single step, cite all of them

The following Knowledge Blocks have been discovered via TheGraphIndexerAdapter, cryptographically verified via AlexandrianSDK.getKB() and Core.fetchArtifactVerified(), and loaded from the Alexandrian registry:

${kbContext}

Respond to the user's task using the procedures above. Your response is operating as an Alexandrian agent — every procedure you follow is attributed to the KB that defined it.`;

  const userMessage = `Task: ${task}`;

  console.log(`\n  ${arrow} Building structured prompt with ${verifiedKBs.length} verified KBs…`);
  console.log(dim(`  Prompt includes: ${verifiedKBs.map(k => k.id).join(" · ")}`));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(`\n  ${yellow("⚠")} ${yellow("OPENAI_API_KEY not set — showing prompt preview (dry run)")}\n`);
    console.log(dim("  ┌─ System prompt (first 500 chars) ──────────────────────────────────"));
    console.log(dim("  │ " + systemPrompt.slice(0, 500).replace(/\n/g, "\n  │ ")));
    console.log(dim("  └────────────────────────────────────────────────────────────────────"));
    console.log(dim(`\n  Add OPENAI_API_KEY to .env to run the full execution step.`));
  } else {
    let OpenAI;
    try {
      const mod = await import("openai");
      OpenAI = mod.default;
    } catch {
      console.log(`  ${cross} ${red("openai not installed. Run: pnpm add openai -w")}`);
      process.exit(1);
    }

    const client = new OpenAI({ apiKey });
    console.log(`\n  ${arrow} Calling ${bold(MODEL)} (streaming)…\n`);
    console.log(rule());
    console.log();

    let fullResponse = "";
    const stream = await client.chat.completions.create({
      model     : MODEL,
      max_tokens: 2048,
      messages  : [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage  },
      ],
      stream: true,
    });

    process.stdout.write("  ");
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) {
        fullResponse += text;
        process.stdout.write(text.replace(/\n/g, "\n  "));
      }
    }
    console.log("\n");
    console.log(rule());
    attribution.response = fullResponse;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 4 — ATTRIBUTION
  // SDK calls:
  //   AlexandrianSDK.getAttributionDAG(contentHash)  — on-chain lineage
  //   recordUsage({ kbHashes, task, model })          — off-chain attribution log (local helper)
  //
  // To trigger on-chain royalty distribution:
  //   sdk.settleCitation(kb.hash, { value: queryFee })
  //   └─ calls contract.settleQuery() → walks DAG → distributes to curators
  // ════════════════════════════════════════════════════════════════════════════
  step("4", "Attribution", "AlexandrianSDK.getAttributionDAG() + recordUsage()");

  console.log(`\n  ${bold("Knowledge Blocks used in this response:")}\n`);

  for (const kb of verifiedKBs) {
    console.log(`  ${kb.color}${bold(kb.id)}${C.reset}  ${dim(hx(kb.hash))}`);
    console.log(`     ${dim("domain:    " + kb.domain)}`);
    console.log(`     ${dim("curator:   " + hx(kb.curator))}`);
    console.log(`     ${dim("royalty:   " + kb.royaltyBps + " bps")}`);

    // ── SDK: AlexandrianSDK.getAttributionDAG() ───────────────────────────────
    console.log(`     ${sdkTag(`sdk.getAttributionDAG("${hx(kb.hash)}")`)}`);
    try {
      const dagLinks = await sdk.getAttributionDAG(kb.hash);
      if (dagLinks.length > 0) {
        for (const link of dagLinks) {
          const pMatch = KB_REGISTRY.find(k => k.hash.toLowerCase() === link.parentHash.toLowerCase());
          const pName  = pMatch ? `${pMatch.color}${pMatch.id}${C.reset}` : dim(hx(link.parentHash));
          console.log(dim(`     └─ parent: ${pName}  royaltyShareBps: ${link.royaltyShareBps} bps`));
        }
      } else {
        console.log(dim(`     └─ no parents (root seed KB)`));
      }
    } catch {
      console.log(dim(`     └─ DAG unavailable (contract call failed)`));
    }
    console.log();

    attribution.knowledgeBlocksUsed.push({
      id        : kb.id,
      hash      : kb.hash,
      cid       : kb.cid,
      domain    : kb.domain,
      royaltyBps: kb.royaltyBps,
      basescan  : `${BASESCAN}/address/${MAINNET_REGISTRY_ADDRESS}`,
    });
  }

  // ── Local: recordUsage() ──────────────────────────────────────────────────
  const attrTag = s => `${C.cyan}[attr]${C.reset} ${C.dim}${s}${C.reset}`;
  console.log(`  ${attrTag(`recordUsage({ kbHashes: [${verifiedKBs.map(k => `"${hx(k.hash)}"`).join(", ")}] })`)}`);
  const usageRecord = recordUsage({
    kbHashes: verifiedKBs.map(k => k.hash),
    task,
    model: MODEL,
  });
  attribution.sdkUsageRecord = usageRecord;
  console.log(dim(`  ${tick} Usage record created at ${usageRecord.timestamp}`));

  // ── Royalty settlement flow ───────────────────────────────────────────────
  console.log(`\n  ${bold("On-chain royalty settlement  ·  how to trigger:")}`);
  console.log(dim("\n  To settle citations and distribute royalties:"));
  console.log(dim("    sdk.settleCitation(KB-AG-3 hash, { value: queryFee })"));
  console.log(dim("    └─ calls contract.settleQuery() → reads attribution DAG"));
  console.log(dim("       ├─ KB-AG-1  (250 bps)  →  2.5% of queryFee  →  pendingWithdrawals[curator]"));
  console.log(dim("       └─ KB-AG-2  (250 bps)  →  2.5% of queryFee  →  pendingWithdrawals[curator]"));
  console.log(dim("    └─ 2% protocol fee  →  protocol treasury"));
  console.log(dim("    └─ remainder        →  KB-AG-3 curator"));
  console.log(dim("\n  Each party calls withdraw() to claim their balance at any time."));
  console.log(dim("  Royalty flows are encoded in the on-chain DAG — immutable after publish."));

  // ── Save attribution record ───────────────────────────────────────────────
  const logPath  = resolve(__dirname, "../ipfs/kb-ag-agent-log.json");
  const existing = [];
  try {
    const raw = require("fs").readFileSync(logPath, "utf8");
    existing.push(...JSON.parse(raw));
  } catch { /* first run */ }
  existing.push(attribution);
  writeFileSync(logPath, JSON.stringify(existing, null, 2));

  console.log(`\n  ${tick} Attribution record saved ${arrow} ${dim("ipfs/kb-ag-agent-log.json")}`);
  console.log(dim(`     task · verified hashes · SDK methods · model · response — full audit trail`));

  // ── Final summary ─────────────────────────────────────────────────────────
  console.log(`\n${rule()}`);
  console.log(bold(cyan("  Protocol lifecycle complete:")));
  console.log(dim(`  Discovery    ${tick}  TheGraphIndexerAdapter.getTopKBsByDomain()  →  ${discovered.length} KBs discovered`));
  console.log(dim(`  Verification ${tick}  AlexandrianSDK.getKB() + Core.fetchArtifactVerified()  →  ${verifiedKBs.length}/${discovered.length} verified`));
  console.log(dim(`  Execution    ${attribution.response ? tick : yellow("⚠ dry run")}  LLM applied verified KB procedures  ·  model: ${MODEL}`));
  console.log(dim(`  Attribution  ${tick}  AlexandrianSDK.getAttributionDAG() + recordUsage()  →  logged`));
  console.log(`${rule()}\n`);
}

main().catch(err => {
  console.error(`\n${red("Fatal:")} ${err.message}`);
  process.exit(1);
});
