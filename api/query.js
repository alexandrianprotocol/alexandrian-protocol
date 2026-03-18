/**
 * api/query.js — Vercel serverless function
 *
 * POST /api/query
 * Body: { question: string }
 *
 * Discovers the most relevant Knowledge Blocks from the live Alexandrian
 * Protocol subgraph (ordered by on-chain reputation score), fetches their
 * IPFS artifacts, builds a grounded system prompt, calls GPT-4o-mini, and
 * returns the answer with full attribution trail and settlement preview.
 *
 * KB selection is fully dynamic. Domains are inferred from question keywords.
 * Falls back to the KB-ENG seed corpus if the subgraph is unavailable or
 * returns no results.
 *
 * Env vars required:
 *   OPENAI_API_KEY
 */

import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";

export const config = { maxDuration: 30 };

// ── Rate limiting (in-process sliding window, persists across warm invocations) ─
//
// Per-IP:   20 requests per 60-second window
// Global:   100 requests per 60-second window
// Input:    max 5,000 characters per question
//
// Note: resets on cold start (acceptable for demo; use Redis for stricter limits).

const RATE_WINDOW_MS    = 60_000; // 1 minute
const RATE_LIMIT_IP     = 20;     // per IP per window
const RATE_LIMIT_GLOBAL = 100;    // total across all IPs per window

const ipWindows    = new Map(); // ip → timestamp[]
const globalWindow = [];        // timestamp[]

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers["x-real-ip"] ?? req.socket?.remoteAddress ?? "unknown";
}

// Returns true if the request should be blocked (rate limited).
function checkRateLimit(ip) {
  const now    = Date.now();
  const cutoff = now - RATE_WINDOW_MS;

  // Clean + check per-IP window
  if (!ipWindows.has(ip)) ipWindows.set(ip, []);
  const ipHits = ipWindows.get(ip).filter(t => t > cutoff);
  if (ipHits.length >= RATE_LIMIT_IP) return true;
  ipHits.push(now);
  ipWindows.set(ip, ipHits);

  // Clean + check global window
  const now2   = Date.now();
  const recent = globalWindow.filter(t => t > cutoff);
  if (recent.length >= RATE_LIMIT_GLOBAL) return true;
  recent.push(now2);
  globalWindow.length = 0;
  globalWindow.push(...recent);

  // Evict stale IP entries to prevent unbounded memory growth
  if (ipWindows.size > 5_000) {
    for (const [k, v] of ipWindows) {
      if (v.every(t => t <= cutoff)) ipWindows.delete(k);
    }
  }

  return false;
}

// ── Response cache ────────────────────────────────────────────────────────────
//
// Uses Upstash Redis (HTTP REST) when UPSTASH_REDIS_REST_URL + _TOKEN are set.
// Falls back to an in-process LRU Map (resets on cold start, fine for demo).

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const CACHE_TTL_S   = 300; // 5 minutes

const responseCache = new Map();
const CACHE_MAX     = 100;

function getCacheKey(question) {
  return "q:" + createHash("sha256").update(question.trim().toLowerCase()).digest("hex").slice(0, 16);
}

async function cacheGet(key) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const r = await fetch(`${UPSTASH_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        signal: AbortSignal.timeout(1_500),
      });
      if (r.ok) {
        const { result } = await r.json();
        if (result) return JSON.parse(result);
      }
    } catch { /* fall through to in-process cache */ }
  }
  return responseCache.get(key) ?? null;
}

async function cacheSet(key, value) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      await fetch(`${UPSTASH_URL}/set/${key}?ex=${CACHE_TTL_S}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ value: JSON.stringify(value) }),
        signal: AbortSignal.timeout(1_500),
      });
    } catch { /* non-fatal: fall through to in-process */ }
  }
  if (responseCache.size >= CACHE_MAX) {
    responseCache.delete(responseCache.keys().next().value);
  }
  responseCache.set(key, value);
}

// ── Subgraph KB discovery ──────────────────────────────────────────────────────

const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/1742359/alexandrian-protocol/version/latest";

const KB_DISCOVERY_QUERY = `
  query EnhanceQueryDiscover($domains: [String!]!, $limit: Int!) {
    knowledgeBlocks(
      first: $limit
      where: { domain_in: $domains, isSlashed: false }
      orderBy: reputationScore
      orderDirection: desc
    ) {
      contentHash
      domain
      kbType
      cid
      queryFee
      reputationScore
      settlementCount
      totalSettledValue
    }
  }
`;

const KB_DISCOVERY_QUERY_ALL = `
  query EnhanceQueryDiscoverAll($limit: Int!) {
    knowledgeBlocks(
      first: $limit
      where: { isSlashed: false }
      orderBy: reputationScore
      orderDirection: desc
    ) {
      contentHash
      domain
      kbType
      cid
      queryFee
      reputationScore
      settlementCount
      totalSettledValue
    }
  }
`;

// ── Type-aware agent behavior hints ───────────────────────────────────────────
// Tells the LLM how to use each KB type. Rendered into the system prompt
// alongside each KB section so the model reasons correctly per type.

const TYPE_AGENT_BEHAVIOR = {
  // Core (on-chain v1)
  Practice:            "Execute the steps procedurally. Follow each step in order.",
  Feature:             "Treat as a deployable specification. Map acceptance criteria to implementation.",
  StateMachine:        "Model transitions. Validate guards before executing side effects.",
  PromptEngineering:   "Apply the template. Substitute variables. Respect model compatibility.",
  ComplianceChecklist: "Verify each requirement. Flag CRITICAL/HIGH severity items first.",
  Rubric:              "Score each dimension against its criteria. Report pass/fail with evidence.",
  // Evidence & grounding
  CaseStudy:           "Compare the past case to the current situation. Adapt the strategy — don't copy blindly.",
  HistoricalRecord:    "Identify temporal trends. Use as baseline for before/after comparisons.",
  Dataset:             "Analyse the schema and samples. Apply statistical reasoning. Validate against the data.",
  // Decision support
  DecisionFramework:   "Evaluate each option against all criteria. Show the scoring. Recommend the winner.",
  Heuristic:           "Check whether the stated condition holds. Apply the rule-of-thumb only if it does.",
  Strategy:            "Decompose into tactics. Sequence execution. Link tactics back to the goal.",
  // Outcomes & feedback
  Outcome:             "Learn from the result. Identify which inputs drove which outputs.",
  Evaluation:          "Apply the criteria to the artifact under review. Report score with rationale.",
  Experiment:          "Verify the hypothesis matches the result. Note confounds and next steps.",
  // Context & constraints
  Assumption:          "Check whether the assumption holds in the current context. Flag if violated.",
  Constraint:          "Filter options against the boundary. Reject any approach that violates it.",
  Environment:         "Confirm the environment matches before applying other KBs.",
  // Relationships
  Ontology:            "Use definitions to disambiguate terms. Use relationships for retrieval expansion.",
  Mapping:             "Translate between representations. Validate completeness of the translation.",
  // Uncertainty
  ConfidenceModel:     "Weight recommendations by the reliability scores. Flag low-confidence claims.",
  RiskModel:           "Rank risks by probability × impact. Prioritise mitigations accordingly.",
  // Learning
  ExampleSet:          "Extract the pattern from the examples. Generalise — do not just copy.",
  PracticeSet:         "Solve the problem then compare against the provided solution.",
  // Planning & orchestration (M2)
  TaskDecomposition:   "Use as the authoritative plan: goal → ordered tasks. Do not skip tasks; refine each with supporting KBs.",
  AgentRole:           "Use to assign responsibilities and outputs per task. Use role outputs as section headers and handoff boundaries.",
};

// Domain inference — keyword patterns → subgraph domain prefixes.
// Ordered from most-specific to least-specific so early matches win.
const DOMAIN_RULES = [
  {
    patterns: [/security|authen|authoriz|jwt|oauth|bearer|permission|csrf|xss|injection|sqli|cors|tls|ssl|zero.?trust/i],
    domains:  ["engineering.api.security"],
  },
  {
    patterns: [/contract|solidity|evm|smart.?contract|token|erc.?20|erc.?721|nft|web3|blockchain|dapp|defi|hardhat|foundry|abi/i],
    domains:  ["engineering.evm"],
  },
  {
    patterns: [/database|schema|migration|postgres|mysql|mongo|redis|sql|nosql|orm|index|storage|data.?model/i],
    domains:  ["engineering.data"],
  },
  {
    patterns: [/deploy|devops|ci.?cd|docker|kubernetes|k8s|pipeline|infrastructure|monitoring|observ|alerting|on.?call|sre/i],
    domains:  ["engineering.ops"],
  },
  {
    patterns: [/agent|prompt|llm|gpt|claude|langchain|embedding|retrieval|rag|chatbot|inference|fine.?tun/i],
    domains:  ["engineering.agent"],
  },
  {
    patterns: [/compliance|owasp|nist|soc.?2|hipaa|gdpr|audit|checklist|standard|regulation|pci/i],
    domains:  ["engineering.compliance"],
  },
  {
    patterns: [/risk|threat|vulnerabilit|attack|exploit|cve|pentest|red.?team/i],
    domains:  ["engineering.risk", "engineering.api.security"],
  },
  {
    patterns: [/experiment|hypothesis|a.?b.?test|canary|rollout|feature.?flag|metric|measure/i],
    domains:  ["engineering.experimentation", "engineering.ops"],
  },
  {
    patterns: [/decision|tradeoff|compare|option|choose|select|evaluation|score|rank/i],
    domains:  ["engineering.decision"],
  },
  {
    patterns: [/case.?stud|postmortem|incident|retrospective|lessons.?learned|history/i],
    domains:  ["engineering.ops", "engineering.compliance"],
  },
  {
    patterns: [/api|rest|graphql|endpoint|openapi|swagger|route|http|request|response|webhook|grpc/i],
    domains:  ["engineering.api.design", "engineering.api.implementation"],
  },
];

/**
 * Infer relevant subgraph domains from the question text.
 * Allows up to 2 rule-group matches so cross-cutting questions
 * (e.g. "risk of this authentication decision") hit all relevant domains.
 * Caps at 4 domains total to keep subgraph queries focused.
 * Returns null when no keywords match, triggering a cross-domain query.
 */
function inferDomains(question) {
  const matched    = new Set();
  let   groupCount = 0;
  for (const { patterns, domains } of DOMAIN_RULES) {
    if (patterns.some(p => p.test(question))) {
      domains.forEach(d => matched.add(d));
      groupCount++;
      if (groupCount >= 2 || matched.size >= 4) break;
    }
  }
  return matched.size > 0 ? [...matched] : null;
}

/**
 * Query the Alexandrian Protocol subgraph for the best KBs.
 * Over-fetches by 3× so we have headroom for caller-side filtering.
 */
async function querySubgraph(domains, limit = 4) {
  const hasDomains = domains && domains.length > 0;
  const fetchLimit = limit * 3;
  const body = hasDomains
    ? { query: KB_DISCOVERY_QUERY, variables: { domains, limit: fetchLimit } }
    : { query: KB_DISCOVERY_QUERY_ALL, variables: { limit: fetchLimit } };

  const res = await fetch(SUBGRAPH_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(8_000),
  });

  if (!res.ok) throw new Error(`Subgraph ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map(e => e.message).join("; "));
  }
  return (json.data?.knowledgeBlocks ?? []).slice(0, limit);
}

// ── KB-ENG fallback corpus ─────────────────────────────────────────────────────
// Used when the subgraph is unreachable or returns no results. These are the
// four published KB-ENG seed KBs — permanently pinned and verified on-chain.

const KB_ENG_FALLBACK = [
  {
    contentHash:   "0x574542249886be6e935764c9b1518b57bae71cab15de273a41d39c190c5d0d20",
    title:         "Stable Production API Design",
    kbType:        "Practice",
    domain:        "engineering.api.design",
    cid:           "QmQfF4NtyFhNeEwxn4GdHhUYT5o2Emmb1r2CDuo1AGe9un",
    queryFeeWei:   "1000000000000000",
    royaltyBps:    0,
    reputationScore: 1000,
    fallback:      true,
  },
  {
    contentHash:   "0x9c9187a7852768097b2b441acbeedb86374cd003d1c02f57cd7178852a36cb1c",
    title:         "OpenAPI Contract Specification",
    kbType:        "Feature",
    domain:        "engineering.api.contracts",
    cid:           "QmdzWRjtbWBQ8DpwzC8pHZ8U9BssHnzvPUDrS6gWeRRyck",
    queryFeeWei:   "1000000000000000",
    royaltyBps:    500,
    reputationScore: 900,
    fallback:      true,
  },
  {
    contentHash:   "0x5181efedb5749f4e6157cf622e63969d3949c7f979258333a11d1b735714e57d",
    title:         "RESTful API Implementation",
    kbType:        "Practice",
    domain:        "engineering.api.implementation",
    cid:           "QmZQ2gV9trEhNvKck8Rmr374k2hTWPU8yPj7btfPqCfWUq",
    queryFeeWei:   "1000000000000000",
    royaltyBps:    500,
    reputationScore: 900,
    fallback:      true,
  },
  {
    contentHash:   "0xc481b00215bda9fd757e7c123459ce5cbe0d1de2b55b6e9f98ae2b99d1eba5e3",
    title:         "API Endpoint Security",
    kbType:        "ComplianceChecklist",
    domain:        "engineering.api.security",
    cid:           "Qmeu9YpyukeA96DptqKoafZo6rYsMwtryJQuFo8h5pDDrS",
    queryFeeWei:   "1000000000000000",
    royaltyBps:    500,
    reputationScore: 850,
    fallback:      true,
  },
];

// ── Local M2 planning KBs (CID-ready, served from repo) ───────────────────────
// These are "ready to publish" KBs used by the upgraded pipeline before they
// are pinned + registered on-chain. They behave like IPFS artifacts, but are
// loaded from the deployed bundle via `local:` pointers.

const KB_TD_LOCAL = [
  {
    title: "Secure Web App — Task Decomposition",
    kbType: "TaskDecomposition",
    domain: "engineering.api.security",
    cid: "local:ipfs/kb-td-1/artifact.json",
    queryFeeWei: "0",
    royaltyBps: 0,
    reputationScore: 0,
    fallback: true,
  },
  {
    title: "CI/CD Pipeline — Task Decomposition",
    kbType: "TaskDecomposition",
    domain: "engineering.ops.cicd",
    cid: "local:ipfs/kb-td-2/artifact.json",
    queryFeeWei: "0",
    royaltyBps: 0,
    reputationScore: 0,
    fallback: true,
  },
  {
    title: "Multi-Tenant System — Task Decomposition",
    kbType: "TaskDecomposition",
    domain: "engineering.data",
    cid: "local:ipfs/kb-td-3/artifact.json",
    queryFeeWei: "0",
    royaltyBps: 0,
    reputationScore: 0,
    fallback: true,
  },
  {
    title: "API Development — Task Decomposition",
    kbType: "TaskDecomposition",
    domain: "engineering.api",
    cid: "local:ipfs/kb-td-4/artifact.json",
    queryFeeWei: "0",
    royaltyBps: 0,
    reputationScore: 0,
    fallback: true,
  },
  {
    title: "Performance Optimization — Task Decomposition",
    kbType: "TaskDecomposition",
    domain: "engineering.performance",
    cid: "local:ipfs/kb-td-5/artifact.json",
    queryFeeWei: "0",
    royaltyBps: 0,
    reputationScore: 0,
    fallback: true,
  },
];

const KB_AR_LOCAL = [
  {
    title: "Backend Engineer — Agent Role",
    kbType: "AgentRole",
    domain: "engineering.api",
    cid: "local:ipfs/kb-ar-1/artifact.json",
    queryFeeWei: "0",
    royaltyBps: 0,
    reputationScore: 0,
    fallback: true,
  },
  {
    title: "Security Auditor — Agent Role",
    kbType: "AgentRole",
    domain: "cybersecurity",
    cid: "local:ipfs/kb-ar-2/artifact.json",
    queryFeeWei: "0",
    royaltyBps: 0,
    reputationScore: 0,
    fallback: true,
  },
  {
    title: "DevOps Engineer — Agent Role",
    kbType: "AgentRole",
    domain: "engineering.ops",
    cid: "local:ipfs/kb-ar-3/artifact.json",
    queryFeeWei: "0",
    royaltyBps: 0,
    reputationScore: 0,
    fallback: true,
  },
  {
    title: "Data Engineer — Agent Role",
    kbType: "AgentRole",
    domain: "engineering.data",
    cid: "local:ipfs/kb-ar-4/artifact.json",
    queryFeeWei: "0",
    royaltyBps: 0,
    reputationScore: 0,
    fallback: true,
  },
  {
    title: "System Architect — Agent Role",
    kbType: "AgentRole",
    domain: "engineering.systems",
    cid: "local:ipfs/kb-ar-5/artifact.json",
    queryFeeWei: "0",
    royaltyBps: 0,
    reputationScore: 0,
    fallback: true,
  },
];

// ── IPFS artifact fetching ────────────────────────────────────────────────────

const IPFS_GATEWAYS  = [
  "https://ipfs.io/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://gateway.pinata.cloud/ipfs",
];
const IPFS_TIMEOUT_MS = 5_000;
const DIVIDER         = "═══════════════════════════════════════════════";

// ── Artifact verification ─────────────────────────────────────────────────────
//
// Default (always):  semantic check — confirm artifact.identity.kb_id matches the
//   contentHash from the subgraph. Proves the artifact claims to be the right KB.
//   Catches stale or mis-pinned IPFS content cheaply with no extra dependencies.
//
// Sampled (optional): set ARTIFACT_HASH_SAMPLE_RATE=0.1 (10%) to also compute
//   SHA-256 of the canonical artifact JSON and log it. This is NOT keccak256
//   (which would require ethers), but is sufficient for detecting content drift.
//   For full keccak256 verification, wire in packages/sdk-core fetchArtifactVerified.
//
const HASH_SAMPLE_RATE = parseFloat(process.env.ARTIFACT_HASH_SAMPLE_RATE ?? "0");

/**
 * Verify a fetched artifact against its expected subgraph contentHash.
 * Returns { ok, reason } — never throws.
 */
function verifyArtifact(artifact, expectedContentHash, cid) {
  // Semantic check: artifact must claim to be the KB we fetched it for
  const kbId = artifact?.identity?.kb_id ?? artifact?.kb_id;
  if (expectedContentHash && !kbId) {
    // Artifact has no kb_id — cannot perform semantic check; log so it is observable
    console.log(`[artifact-verify] SKIP ${cid.slice(0, 16)}… — artifact has no identity.kb_id field`);
    return { ok: true };
  }
  if (expectedContentHash && kbId) {
    // Normalise to lowercase hex for comparison (subgraph returns 0x-prefixed hex)
    const normalised = kbId.startsWith("0x") ? kbId.toLowerCase() : "0x" + kbId.toLowerCase();
    if (normalised !== expectedContentHash.toLowerCase()) {
      return { ok: false, reason: `kb_id mismatch: got ${normalised.slice(0, 14)}… expected ${expectedContentHash.slice(0, 14)}…` };
    }
  }

  // Sampled full-content fingerprint (SHA-256 of canonical JSON — not keccak256)
  if (HASH_SAMPLE_RATE > 0 && Math.random() < HASH_SAMPLE_RATE) {
    try {
      const canonical = JSON.stringify(artifact, Object.keys(artifact).sort());
      const sha256    = createHash("sha256").update(canonical).digest("hex");
      // Log for external comparison — no stored expected value yet, so we don't fail here
      console.log(`[artifact-hash] cid=${cid.slice(0, 16)} sha256=${sha256.slice(0, 16)}…`);
    } catch { /* non-fatal */ }
  }

  return { ok: true };
}

async function fetchArtifact(cid, expectedContentHash = null) {
  // Local artifacts (bundled with the deployment) — used for pre-pin KBs.
  if (typeof cid === "string" && cid.startsWith("local:")) {
    try {
      const rel = cid.slice("local:".length);
      const abs = join(process.cwd(), rel);
      const raw = await readFile(abs, "utf-8");
      const artifact = JSON.parse(raw);
      if (expectedContentHash) {
        const { ok, reason } = verifyArtifact(artifact, expectedContentHash, cid);
        if (!ok) console.warn(`[artifact-verify] WARN ${cid.slice(0, 24)}… — ${reason}`);
      }
      return artifact;
    } catch {
      return null;
    }
  }
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const controller = new AbortController();
      const timer      = setTimeout(() => controller.abort(), IPFS_TIMEOUT_MS);
      const res        = await fetch(`${gateway}/${cid}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const artifact = await res.json();
      if (expectedContentHash) {
        const { ok, reason } = verifyArtifact(artifact, expectedContentHash, cid);
        if (!ok) {
          console.warn(`[artifact-verify] WARN ${cid.slice(0, 16)}… — ${reason}`);
          // Return artifact anyway (don't hard-fail; stale pins still have useful content)
        }
      }
      return artifact;
    } catch { /* try next gateway */ }
  }
  return null;
}

/**
 * Type-specific content extractors.
 * Each returns a formatted multi-line string from the artifact fields.
 * Falls through to summary/generic if fields are absent.
 */
function extractByType(type, artifact) {
  if (!artifact) return null;

  switch (type) {
    // ── Planning & orchestration ─────────────────────────────────────────────
    case "TaskDecomposition":
      if (artifact.goal && Array.isArray(artifact.tasks) && artifact.tasks.length) {
        return [
          `Goal: ${artifact.goal}`,
          "Tasks:",
          ...artifact.tasks.map((t, i) => `  ${i + 1}. ${t.description ?? t.action ?? t}`),
        ].join("\n");
      }
      break;

    case "AgentRole":
      if (artifact.role) {
        const resp = Array.isArray(artifact.responsibilities) ? artifact.responsibilities : [];
        return [
          `Role: ${artifact.role}`,
          resp.length ? "Responsibilities:\n" + resp.map((r) => `  • ${r}`).join("\n") : "",
          Array.isArray(artifact.inputs) && artifact.inputs.length ? `Inputs: ${artifact.inputs.join(", ")}` : "",
          Array.isArray(artifact.outputs) && artifact.outputs.length ? `Outputs: ${artifact.outputs.join(", ")}` : "",
        ].filter(Boolean).join("\n") || null;
      }
      break;

    // ── Core types ──────────────────────────────────────────────────────────
    case "Practice":
    case "procedure":
    case "protocol":
      if (artifact.steps?.length) {
        return artifact.steps
          .map(s => {
            const base = typeof s === "string" ? s : `${s.id ?? ""}: ${s.action ?? s}`;
            const note = s.rationale ?? s.notes;
            return note ? `${base}\n  → ${String(note).slice(0, 180)}` : base;
          })
          .join("\n");
      }
      break;

    case "ComplianceChecklist":
    case "checklist":
      if (artifact.checklist?.length) {
        return artifact.checklist
          .map((item, i) => {
            const sev  = item.severity ? `[${item.severity.toUpperCase()}] ` : "";
            const base = `${sev}item_${i + 1}: ${item.item ?? item}`;
            return item.rationale ? `${base}\n  → ${item.rationale.slice(0, 180)}` : base;
          })
          .join("\n");
      }
      if (artifact.requirements?.length) {
        return artifact.requirements
          .map(r => `[${(r.severity ?? "info").toUpperCase()}] ${r.id ?? ""}: ${r.description ?? r}`)
          .join("\n");
      }
      break;

    case "Rubric":
    case "evaluation":
      if (artifact.dimensions?.length) {
        return artifact.dimensions
          .map(d => `${d.name} (weight: ${d.weight}): ${d.description ?? ""}`)
          .join("\n");
      }
      break;

    case "StateMachine":
      if (artifact.states?.length) {
        const stateLines = artifact.states
          .map(s => `state:${s.id} — ${s.label ?? s.description ?? ""}`)
          .join("\n");
        const txLines = (artifact.transitions ?? [])
          .map(t => `  ${t.from_state} →[${t.trigger}]→ ${t.to_state}`)
          .join("\n");
        return [stateLines, txLines].filter(Boolean).join("\n");
      }
      break;

    case "PromptEngineering":
    case "prompt_engineering":
      if (artifact.template) {
        const vars = (artifact.variables ?? []).map(v => v.name).join(", ");
        return [
          `Technique: ${artifact.technique ?? "unknown"}`,
          vars ? `Variables: ${vars}` : "",
          `Template:\n${artifact.template.slice(0, 600)}`,
        ].filter(Boolean).join("\n");
      }
      break;

    case "Feature":
    case "pattern":
      if (artifact.acceptance_criteria?.length) {
        return [
          `Pattern: ${artifact.implementation_pattern ?? ""}`,
          "Acceptance criteria:",
          ...artifact.acceptance_criteria.map((c, i) => `  ${i + 1}. ${c}`),
        ].filter(Boolean).join("\n");
      }
      break;

    // ── Evidence & grounding ─────────────────────────────────────────────────
    case "CaseStudy":
      return [
        artifact.context   ? `Context: ${artifact.context}` : "",
        artifact.actions   ? `Actions: ${Array.isArray(artifact.actions) ? artifact.actions.join("; ") : artifact.actions}` : "",
        artifact.outcomes  ? `Outcomes: ${Array.isArray(artifact.outcomes) ? artifact.outcomes.join("; ") : artifact.outcomes}` : "",
        artifact.lessons   ? `Lessons: ${artifact.lessons}` : "",
      ].filter(Boolean).join("\n") || null;

    case "HistoricalRecord":
      if (artifact.events?.length) {
        return artifact.events
          .map(e => `[${e.timestamp ?? e.date ?? "?"}] ${e.description ?? e.event ?? e}`)
          .join("\n");
      }
      break;

    case "Dataset":
      return [
        artifact.schema    ? `Schema: ${JSON.stringify(artifact.schema).slice(0, 300)}` : "",
        artifact.row_count ? `Rows: ${artifact.row_count}` : "",
        artifact.notes     ? `Notes: ${artifact.notes}` : "",
        artifact.samples?.length ? `Sample: ${JSON.stringify(artifact.samples[0]).slice(0, 200)}` : "",
      ].filter(Boolean).join("\n") || null;

    // ── Decision support ─────────────────────────────────────────────────────
    case "DecisionFramework":
      return [
        artifact.options?.length
          ? "Options:\n" + artifact.options.map((o, i) => `  ${i + 1}. ${o.name ?? o}: ${o.description ?? ""}`).join("\n")
          : "",
        artifact.criteria?.length
          ? "Criteria:\n" + artifact.criteria.map(c => `  • ${c.name ?? c} (weight: ${c.weight ?? "?"})`).join("\n")
          : "",
        artifact.recommendation ? `Recommendation: ${artifact.recommendation}` : "",
      ].filter(Boolean).join("\n") || null;

    case "Heuristic":
    case "heuristic":
      return [
        artifact.rule       ? `Rule: ${artifact.rule}` : "",
        artifact.condition  ? `When: ${artifact.condition}` : "",
        artifact.exceptions?.length ? `Exceptions: ${artifact.exceptions.join("; ")}` : "",
        artifact.rationale  ? `Rationale: ${artifact.rationale.slice(0, 200)}` : "",
      ].filter(Boolean).join("\n") || null;

    case "Strategy":
      return [
        artifact.goal       ? `Goal: ${artifact.goal}` : "",
        artifact.tactics?.length
          ? "Tactics:\n" + artifact.tactics.map((t, i) => `  ${i + 1}. ${t.name ?? t}: ${t.description ?? ""}`).join("\n")
          : "",
        artifact.success_criteria ? `Success: ${artifact.success_criteria}` : "",
      ].filter(Boolean).join("\n") || null;

    // ── Outcomes & feedback ──────────────────────────────────────────────────
    case "Outcome":
      return [
        artifact.result     ? `Result: ${artifact.result}` : "",
        artifact.metrics    ? `Metrics: ${JSON.stringify(artifact.metrics).slice(0, 200)}` : "",
        artifact.lessons    ? `Lessons: ${artifact.lessons}` : "",
        artifact.applied_kb ? `Applied KB: ${artifact.applied_kb}` : "",
      ].filter(Boolean).join("\n") || null;

    case "Evaluation":
      return [
        artifact.subject    ? `Evaluated: ${artifact.subject}` : "",
        artifact.score !== undefined ? `Score: ${artifact.score}` : "",
        artifact.pass       !== undefined ? `Pass: ${artifact.pass}` : "",
        artifact.criteria?.length ? "Criteria:\n" + artifact.criteria.map(c => `  • ${c}`).join("\n") : "",
        artifact.notes      ? `Notes: ${artifact.notes.slice(0, 300)}` : "",
      ].filter(Boolean).join("\n") || null;

    case "Experiment":
      return [
        artifact.hypothesis ? `Hypothesis: ${artifact.hypothesis}` : "",
        artifact.method     ? `Method: ${artifact.method}` : "",
        artifact.result     ? `Result: ${artifact.result}` : "",
        artifact.conclusion ? `Conclusion: ${artifact.conclusion}` : "",
        artifact.confounds  ? `Confounds: ${artifact.confounds}` : "",
      ].filter(Boolean).join("\n") || null;

    // ── Context & constraints ────────────────────────────────────────────────
    case "Assumption":
    case "constraint":
      return [
        artifact.statement  ? `Statement: ${artifact.statement}` : "",
        artifact.condition  ? `Condition: ${artifact.condition}` : "",
        artifact.validity   ? `Valid when: ${artifact.validity}` : "",
        artifact.scope      ? `Scope: ${artifact.scope}` : "",
        artifact.violation  ? `If violated: ${artifact.violation}` : "",
      ].filter(Boolean).join("\n") || null;

    case "Constraint":
      return [
        artifact.limitation ? `Limitation: ${artifact.limitation}` : "",
        artifact.context    ? `Context: ${artifact.context}` : "",
        artifact.exceptions?.length ? `Exceptions: ${artifact.exceptions.join("; ")}` : "",
      ].filter(Boolean).join("\n") || null;

    case "Environment":
      return [
        artifact.name           ? `Environment: ${artifact.name}` : "",
        artifact.characteristics?.length ? `Characteristics: ${artifact.characteristics.join(", ")}` : "",
        artifact.requirements?.length    ? `Requirements: ${artifact.requirements.join(", ")}` : "",
        artifact.constraints?.length     ? `Constraints: ${artifact.constraints.join(", ")}` : "",
      ].filter(Boolean).join("\n") || null;

    // ── Relationships ────────────────────────────────────────────────────────
    case "Ontology":
      return [
        artifact.concepts?.length
          ? "Concepts:\n" + artifact.concepts.slice(0, 10).map(c => `  ${c.id ?? c.name ?? c}: ${c.definition ?? ""}`).join("\n")
          : "",
        artifact.relationships?.length
          ? "Relations:\n" + artifact.relationships.slice(0, 6).map(r => `  ${r.from} —[${r.type}]→ ${r.to}`).join("\n")
          : "",
      ].filter(Boolean).join("\n") || null;

    case "Mapping":
      return [
        artifact.source     ? `Source: ${artifact.source}` : "",
        artifact.target     ? `Target: ${artifact.target}` : "",
        artifact.rules?.length
          ? "Rules:\n" + artifact.rules.map(r => `  ${r.from ?? r.source} → ${r.to ?? r.target}`).join("\n")
          : "",
      ].filter(Boolean).join("\n") || null;

    // ── Uncertainty ──────────────────────────────────────────────────────────
    case "ConfidenceModel":
      return [
        artifact.reliability !== undefined ? `Reliability: ${artifact.reliability}` : "",
        artifact.factors?.length ? `Factors: ${artifact.factors.join(", ")}` : "",
        artifact.notes      ? `Notes: ${artifact.notes}` : "",
      ].filter(Boolean).join("\n") || null;

    case "RiskModel":
      if (artifact.risks?.length) {
        return artifact.risks
          .map(r => `[P:${r.probability ?? "?"}×I:${r.impact ?? "?"}] ${r.name ?? r.risk}: ${r.mitigation ?? ""}`)
          .join("\n");
      }
      break;

    // ── Learning ─────────────────────────────────────────────────────────────
    case "ExampleSet":
    case "PracticeSet":
      if (artifact.examples?.length) {
        return artifact.examples.slice(0, 5)
          .map((e, i) => `Example ${i + 1}: ${e.input ?? e.problem ?? JSON.stringify(e).slice(0, 120)}`)
          .join("\n");
      }
      break;

    default:
      break;
  }

  return null; // caller falls through to summary/generic
}

// ── Execution pipeline (M2) ───────────────────────────────────────────────────

function detectIntent(question, inferredDomains) {
  const q = question.toLowerCase();
  const domain = inferredDomains?.[0] ?? "engineering.api";
  const type =
    /build|design|implement|create|set up|setup|secure|deploy|migrate|refactor|optimi[sz]e/.test(q)
      ? "build"
      : "ask";
  return { type, domain };
}

function pickTaskDecomposition(intent, question) {
  const q = question.toLowerCase();
  if (intent.domain.includes("engineering.ops.cicd") || /ci\/cd|pipeline|deploy/.test(q)) return KB_TD_LOCAL[1];
  if (intent.domain.includes("engineering.performance") || /perf|latency|throughput|optimi[sz]e/.test(q)) return KB_TD_LOCAL[4];
  if (intent.domain.includes("engineering.data") || /tenant|schema|database|postgres|sql/.test(q)) return KB_TD_LOCAL[2];
  if (intent.domain.includes("engineering.api.security") || /secure|auth|jwt|oauth|login/.test(q)) return KB_TD_LOCAL[0];
  if (intent.domain.startsWith("engineering.api")) return KB_TD_LOCAL[3];
  return KB_TD_LOCAL[3];
}

function pickAgentRoles(intent) {
  const roles = [];
  // Architect is usually helpful for build-class queries
  roles.push(KB_AR_LOCAL[4]);
  if (intent.domain.startsWith("engineering.api")) roles.push(KB_AR_LOCAL[0]);
  if (intent.domain.includes("engineering.api.security") || intent.domain.includes("cybersecurity")) roles.push(KB_AR_LOCAL[1]);
  if (intent.domain.startsWith("engineering.ops")) roles.push(KB_AR_LOCAL[2]);
  if (intent.domain.startsWith("engineering.data")) roles.push(KB_AR_LOCAL[3]);
  // de-dupe by cid
  const seen = new Set();
  return roles.filter((r) => (seen.has(r.cid) ? false : (seen.add(r.cid), true)));
}

async function buildPipelineSystemPrompt(question, domains, warnings) {
  const intent = detectIntent(question, domains);
  if (intent.type !== "build") return null;

  const planMeta = pickTaskDecomposition(intent, question);
  const roleMetas = pickAgentRoles(intent);

  const planArtifact = await fetchArtifact(planMeta.cid, null);
  const roleArtifacts = await Promise.all(roleMetas.map((m) => fetchArtifact(m.cid, null)));

  if (!planArtifact) {
    warnings.push("Pipeline: task decomposition KB unavailable; falling back to standard query enhancement.");
    return null;
  }

  const planTasks = Array.isArray(planArtifact.tasks) ? planArtifact.tasks : [];
  const tasksForRetrieval = planTasks.slice(0, 3); // cap for latency

  // Per-task retrieval: pull 1 KB per task to refine execution.
  const perTask = await Promise.all(
    tasksForRetrieval.map(async (t) => {
      const taskText = (t?.description ?? String(t)).trim();
      const tDomains = inferDomains(taskText);
      let kbs = [];
      try {
        kbs = await querySubgraph(tDomains, 1);
      } catch {
        kbs = [];
      }
      kbs = (kbs ?? []).filter((kb) => kb.cid).map((kb) => ({
        contentHash:     kb.contentHash,
        title:           kb.title ?? kb.domain,
        summary:         kb.summary ?? "",
        kbType:          kb.kbType,
        domain:          kb.domain,
        cid:             kb.cid,
        queryFeeWei:     kb.queryFeeWei ?? kb.queryFee ?? "0",
        royaltyBps:      kb.royaltyBps  ?? 0,
        reputationScore: kb.reputationScore ?? 0,
      }));

      if (!kbs.length) return { task: taskText, kbs: [], artifactSnippets: "" };

      const { prompt, artifactsLoaded } = await buildSystemPrompt(kbs);
      // Extract just the KB sections (skip the global header) by taking last divider block.
      return { task: taskText, kbs, artifactsLoaded, artifactSnippets: prompt };
    }),
  );

  const roleLines = roleArtifacts
    .filter(Boolean)
    .map((a, i) => {
      const meta = roleMetas[i];
      const content = extractByType("AgentRole", a) ?? a?.summary ?? "";
      return `- ${meta.title}\n${content}`;
    })
    .join("\n\n");

  const taskLines = perTask
    .map((pt, i) => {
      const kbSummary = pt.kbs?.length
        ? pt.kbs.map((k) => `  - ${k.title} (${k.kbType}, ${k.domain})`).join("\n")
        : "  - (no live KBs found)";
      return [
        `Task ${i + 1}: ${pt.task}`,
        "Retrieved KBs:",
        kbSummary,
      ].join("\n");
    })
    .join("\n\n");

  const pipelinePrompt = [
    "You are an execution-oriented AI agent using Alexandrian as a query enhancer.",
    "Follow this pipeline strictly:",
    "Query → Intent Detection → TaskDecomposition → AgentRole Mapping → Per-Task KB Retrieval → Composition → Output",
    "",
    `Intent: ${intent.type} (${intent.domain})`,
    "",
    "Task Decomposition (authoritative plan):",
    extractByType("TaskDecomposition", planArtifact) ?? JSON.stringify(planArtifact).slice(0, 800),
    "",
    "Agent Roles (responsibility and handoff boundaries):",
    roleLines || "(none)",
    "",
    "Per-Task Retrieval (live KB signals):",
    taskLines,
    "",
    "Output format requirements:",
    "- Start with: Goal",
    "- Then: Plan (tasks, with owner role per task)",
    "- Then for each task: Steps (from Practices), Code (if provided), Validation (from Checklists/Rubrics)",
    "- End with: Risks & open questions",
  ].join("\n");

  return pipelinePrompt;
}

function formatArtifactSection(kb, artifact, index) {
  const id      = `KB-${index + 1}`;
  const title   = artifact?.title   ?? kb.title  ?? kb.domain;
  const type    = artifact?.kbType  ?? artifact?.kb_type ?? kb.kbType;
  const domain  = artifact?.domain  ?? kb.domain;

  const behavior = TYPE_AGENT_BEHAVIOR[type] ?? "Use the content to ground your response.";

  const content =
    extractByType(type, artifact) ??
    (artifact?.summary ? artifact.summary : null) ??
    "(artifact unavailable — partial context)";

  return [
    DIVIDER,
    `${id} · ${title} (${type})`,
    `Domain: ${domain}`,
    `Hash: ${kb.contentHash.slice(0, 18)}...`,
    `Agent: ${behavior}`,
    DIVIDER,
    content,
  ].join("\n");
}

/**
 * Fetch IPFS artifacts for all KBs, compose the enriched system prompt.
 * Backfills title/summary on each KB object from its fetched artifact.
 * Returns { prompt, artifactsLoaded }.
 */
async function buildSystemPrompt(kbs) {
  const artifactPromises = kbs.map(kb =>
    kb.cid ? fetchArtifact(kb.cid, kb.contentHash ?? null) : Promise.resolve(null)
  );
  const artifacts = await Promise.all(artifactPromises);

  // Backfill metadata from artifact (title, summary, royaltyBps)
  // royaltyBps lives in artifact.provenance.royalty_bps — not exposed as a top-level subgraph field
  for (let i = 0; i < kbs.length; i++) {
    const art = artifacts[i];
    if (!art) continue;
    if (art.title)                          kbs[i].title      = art.title;
    if (art.summary)                        kbs[i].summary    = art.summary;
    if (typeof art.provenance?.royalty_bps === "number") {
      kbs[i].royaltyBps = art.provenance.royalty_bps;
    }
  }

  const sections = kbs.map((kb, i) => formatArtifactSection(kb, artifacts[i], i));
  const loaded   = artifacts.filter(Boolean).length;

  const prompt = [
    "You are an expert assistant. Your responses are grounded exclusively in the following",
    `Knowledge Block${kbs.length > 1 ? "s" : ""} from the Alexandrian Protocol. Every`,
    "recommendation must reference the specific KB and step or checklist item it derives from.",
    "Do not answer from general knowledge if the KB procedures cover the question.",
    "Each KB section includes an 'Agent:' line — this is a type-specific instruction.",
    "Follow it exactly: it tells you HOW to reason with that KB (execute, compare, score, filter, etc.).",
    "",
    ...sections,
    "",
    DIVIDER,
    "RESPONSE FORMAT",
    DIVIDER,
    "Structure your response in clear sections. Cite KB IDs and step/item numbers inline.",
    "Be specific and actionable — not generic advice. Use markdown formatting.",
  ].join("\n");

  return { prompt, artifactsLoaded: loaded };
}

// ── Settlement preview ─────────────────────────────────────────────────────────

const WEI_PER_ETH = 1e18;

function buildSettlementPreview(kbs, protocolFeeBps = 500) {
  let totalEth = 0;
  for (const kb of kbs) {
    totalEth += Number(kb.queryFeeWei ?? "0") / WEI_PER_ETH;
  }

  const protocolFeeEth   = totalEth * (protocolFeeBps / 10_000);
  const distributableEth = totalEth - protocolFeeEth;
  const perKB            = kbs.length > 0 ? distributableEth / kbs.length : 0;

  return {
    totalEth:         Number(totalEth.toFixed(8)),
    protocolFeeBps,
    protocolFeeEth:   Number(protocolFeeEth.toFixed(8)),
    distributableEth: Number(distributableEth.toFixed(8)),
    distribution:     kbs.map(kb => ({
      contentHash:  kb.contentHash,
      domain:       kb.domain,
      royaltyBps:   kb.royaltyBps ?? 0,
      ethReceived:  Number(perKB.toFixed(8)),
    })),
  };
}

// ── Shape subgraph results to match the attribution format ────────────────────

function toAttribution(kbs) {
  return kbs.map((kb, i) => ({
    id:             `KB-${i + 1}`,
    title:          kb.title   ?? kb.domain,
    type:           kb.kbType,
    domain:         kb.domain,
    hash:           kb.contentHash,
    cid:            kb.cid    ?? "",
    royaltyBps:     kb.royaltyBps     ?? 0,
    reputationScore: kb.reputationScore ?? 0,
    fallback:       kb.fallback ?? false,
  }));
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const clientIp = getClientIp(req);
  if (checkRateLimit(clientIp)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({
      error:  "Too many requests",
      detail: "Max 20 requests per minute per IP. Retry after 60 seconds.",
    });
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const { question } = req.body ?? {};
  if (!question || typeof question !== "string" || question.trim().length < 5) {
    return res.status(400).json({ error: "question is required (min 5 chars)" });
  }
  if (question.length > 5_000) {
    return res.status(400).json({ error: "question too long (max 5,000 chars)" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  // ── Cache check ─────────────────────────────────────────────────────────────
  const cKey   = getCacheKey(question);
  const cached = await cacheGet(cKey);
  if (cached) {
    return res.status(200).json({ ...cached, cached: true });
  }

  const warnings = [];

  try {
    // ── 1. Discover relevant KBs from live subgraph ────────────────────────────
    const domains = inferDomains(question);
    let kbs       = [];
    let usingFallback = false;

    try {
      kbs = await querySubgraph(domains, 4);
    } catch (err) {
      warnings.push(`Subgraph unavailable (${err.message}) — using seed corpus fallback.`);
    }

    // Filter out KBs with no CID (unpinned) unless fallback is forced
    kbs = kbs.filter(kb => kb.cid);

    if (kbs.length === 0) {
      kbs = [...KB_ENG_FALLBACK];
      usingFallback = true;
      if (!warnings.length) {
        warnings.push("No live KBs found for this domain — using seed corpus fallback.");
      }
    }

    // Map subgraph shape → internal shape (normalise queryFeeWei / royaltyBps)
    kbs = kbs.map(kb => ({
      contentHash:     kb.contentHash,
      title:           kb.title ?? kb.domain,
      summary:         kb.summary ?? "",
      kbType:          kb.kbType,
      domain:          kb.domain,
      cid:             kb.cid,
      queryFeeWei:     kb.queryFeeWei ?? kb.queryFee ?? "0",
      royaltyBps:      kb.royaltyBps  ?? 0,
      reputationScore: kb.reputationScore ?? 0,
      fallback:        kb.fallback ?? false,
    }));

    // ── 2. Build enriched system prompt from IPFS artifacts ────────────────────
    // M2 pipeline upgrade: if this is a build/implement class query, we first
    // load TaskDecomposition + AgentRole KBs and do limited per-task retrieval.
    const pipelinePrompt = await buildPipelineSystemPrompt(question, domains, warnings);

    const { prompt: basePrompt, artifactsLoaded } = await buildSystemPrompt(kbs);
    const systemPrompt = pipelinePrompt ? `${pipelinePrompt}\n\n${DIVIDER}\n\n${basePrompt}` : basePrompt;

    // ── 3. Call LLM ────────────────────────────────────────────────────────────
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       "gpt-4o-mini",
        temperature: 0.3,
        max_tokens:  1200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: question.trim() },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return res.status(502).json({ error: "OpenAI error", detail: err });
    }

    const data   = await openaiRes.json();
    const answer = data.choices?.[0]?.message?.content ?? "";

    // ── 4. Build settlement preview from real on-chain query fees ──────────────
    const settlement = buildSettlementPreview(kbs);

    const payload = {
      answer,
      attribution:     toAttribution(kbs),
      settlement,
      model:           data.model,
      usage:           data.usage,
      artifactsLoaded, // how many KB artifacts were fetched live from IPFS
      usingFallback,
      warnings,
      cached:          false,
    };

    await cacheSet(cKey, payload);
    return res.status(200).json(payload);

  } catch (err) {
    console.error("query error:", err);
    return res.status(500).json({ error: "Internal error", detail: err.message });
  }
}
