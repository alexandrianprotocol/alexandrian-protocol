/**
 * api/retrieve.js — Vercel serverless function
 *
 * POST /api/retrieve
 * Body: { query: string, types?: string[], domains?: string[], limit?: number }
 *
 * Pure KB retrieval — no LLM call, no blockchain exposure.
 * Discovers the most relevant Knowledge Blocks from the live Alexandrian
 * Protocol subgraph, fetches their IPFS artifacts, and returns structured KB
 * data plus a ready-to-use enriched system prompt.
 *
 * This is the foundation layer for:
 *   - alexandrian.enhance(query)     — 1-line JS client
 *   - AlexandrianRetriever           — LangChain adapter
 *   - AlexandrianNodeRetriever       — LlamaIndex adapter
 *   - Any custom LLM integration     — caller passes enrichedPrompt to their LLM
 *
 * No API keys required. Suitable for free-tier, server-side, and edge usage.
 *
 * Response shape:
 * {
 *   enrichedPrompt: string,    // ready-to-use system prompt for any LLM
 *   kbs: KBResult[],           // structured KB metadata for attribution
 *   settlementPreview: {...},  // economic preview if caller wants to settle on-chain
 *   warnings: string[],        // non-fatal issues (IPFS timeouts, subgraph lag, etc.)
 *   cached: boolean,
 *   artifactsLoaded: number,   // how many IPFS artifacts were fetched live
 *   usingFallback: boolean,    // true if live subgraph returned 0 results
 * }
 */

import { createHash } from "crypto";

export const config = { maxDuration: 30 };

// ── Rate limiting ─────────────────────────────────────────────────────────────

const RATE_WINDOW_MS    = 60_000;
const RATE_LIMIT_IP     = 60;   // higher than /api/query — no LLM cost
const RATE_LIMIT_GLOBAL = 300;

const ipWindows    = new Map();
const globalWindow = [];

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers["x-real-ip"] ?? req.socket?.remoteAddress ?? "unknown";
}

function checkRateLimit(ip) {
  const now    = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  if (!ipWindows.has(ip)) ipWindows.set(ip, []);
  const ipHits = ipWindows.get(ip).filter(t => t > cutoff);
  if (ipHits.length >= RATE_LIMIT_IP) return true;
  ipHits.push(now);
  ipWindows.set(ip, ipHits);
  const recent = globalWindow.filter(t => t > cutoff);
  if (recent.length >= RATE_LIMIT_GLOBAL) return true;
  recent.push(now);
  globalWindow.length = 0;
  globalWindow.push(...recent);
  if (ipWindows.size > 5_000) {
    for (const [k, v] of ipWindows) {
      if (v.every(t => t <= cutoff)) ipWindows.delete(k);
    }
  }
  return false;
}

// ── Response cache ────────────────────────────────────────────────────────────

const responseCache = new Map();
const CACHE_MAX     = 200;

function getCacheKey(query, types, domains, limit) {
  const raw = JSON.stringify({ q: query.trim().toLowerCase(), types, domains, limit });
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

function cacheGet(key) { return responseCache.get(key) ?? null; }

function cacheSet(key, value) {
  if (responseCache.size >= CACHE_MAX) {
    responseCache.delete(responseCache.keys().next().value);
  }
  responseCache.set(key, value);
}

// ── Subgraph KB discovery ─────────────────────────────────────────────────────

const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/1742359/alexandrian-protocol/version/latest";

const KB_DISCOVERY_QUERY = `
  query RetrieveDiscover($domains: [String!]!, $limit: Int!) {
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
  query RetrieveDiscoverAll($limit: Int!) {
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

async function querySubgraph(domains, limit) {
  const hasDomains = domains && domains.length > 0;
  const fetchLimit = limit * 3; // over-fetch for type filtering
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
  return json.data?.knowledgeBlocks ?? [];
}

// ── Domain inference ──────────────────────────────────────────────────────────
// Ordered most-specific to least-specific so early matches win.

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

// ── Fallback corpus ───────────────────────────────────────────────────────────

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

// ── IPFS artifact fetching ────────────────────────────────────────────────────

const IPFS_GATEWAYS  = [
  "https://ipfs.io/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://gateway.pinata.cloud/ipfs",
];
const IPFS_TIMEOUT_MS = 5_000;
const DIVIDER         = "═══════════════════════════════════════════════";

const TYPE_AGENT_BEHAVIOR = {
  Practice:            "Execute the steps procedurally. Follow each step in order.",
  Feature:             "Treat as a deployable specification. Map acceptance criteria to implementation.",
  StateMachine:        "Model transitions. Validate guards before executing side effects.",
  PromptEngineering:   "Apply the template. Substitute variables. Respect model compatibility.",
  ComplianceChecklist: "Verify each requirement. Flag CRITICAL/HIGH severity items first.",
  Rubric:              "Score each dimension against its criteria. Report pass/fail with evidence.",
  CaseStudy:           "Compare the past case to the current situation. Adapt the strategy — don't copy blindly.",
  DecisionFramework:   "Evaluate each option against all criteria. Show the scoring. Recommend the winner.",
  RiskModel:           "Rank risks by probability × impact. Prioritise mitigations accordingly.",
  Experiment:          "Verify the hypothesis matches the result. Note confounds and next steps.",
};

async function fetchArtifact(cid) {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const controller = new AbortController();
      const timer      = setTimeout(() => controller.abort(), IPFS_TIMEOUT_MS);
      const res        = await fetch(`${gateway}/${cid}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      return await res.json();
    } catch { /* try next gateway */ }
  }
  return null;
}

function formatArtifactSection(kb, artifact, index) {
  const id       = `KB-${index + 1}`;
  const title    = artifact?.title   ?? kb.title   ?? kb.domain;
  const type     = artifact?.kbType  ?? artifact?.kb_type ?? kb.kbType;
  const domain   = artifact?.domain  ?? kb.domain;
  const behavior = TYPE_AGENT_BEHAVIOR[type] ?? "Use the content to ground your response.";

  let content = "";
  if (artifact?.steps?.length) {
    content = artifact.steps
      .map(s => {
        const base = typeof s === "string" ? s : `${s.id ?? ""}: ${s.action ?? s}`;
        const note = s.rationale ?? s.notes;
        return note ? `${base}\n  → ${String(note).slice(0, 180)}` : base;
      })
      .join("\n");
  } else if (artifact?.checklist?.length) {
    content = artifact.checklist
      .map((item, i) => {
        const sev  = item.severity ? `[${item.severity.toUpperCase()}] ` : "";
        const base = `${sev}item_${i + 1}: ${item.item ?? item}`;
        return item.rationale ? `${base}\n  → ${item.rationale.slice(0, 180)}` : base;
      })
      .join("\n");
  } else if (artifact?.summary) {
    content = artifact.summary;
  } else {
    content = "(artifact unavailable — partial context)";
  }

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

async function buildEnrichedPrompt(kbs) {
  const artifactPromises = kbs.map(kb =>
    kb.cid ? fetchArtifact(kb.cid) : Promise.resolve(null)
  );
  const artifacts = await Promise.all(artifactPromises);

  for (let i = 0; i < kbs.length; i++) {
    const art = artifacts[i];
    if (!art) continue;
    if (art.title)  kbs[i].title   = art.title;
    if (art.summary) kbs[i].summary = art.summary;
    if (typeof art.provenance?.royalty_bps === "number") {
      kbs[i].royaltyBps = art.provenance.royalty_bps;
    }
  }

  const sections = kbs.map((kb, i) => formatArtifactSection(kb, artifacts[i], i));
  const loaded   = artifacts.filter(Boolean).length;

  const enrichedPrompt = [
    "You are an expert assistant. Your responses are grounded exclusively in the following",
    `Knowledge Block${kbs.length > 1 ? "s" : ""} from the Alexandrian Protocol. Every`,
    "recommendation must reference the specific KB and step or checklist item it derives from.",
    "Do not answer from general knowledge if the KB procedures cover the question.",
    "Each KB section includes an 'Agent:' line — follow it exactly.",
    "",
    ...sections,
    "",
    DIVIDER,
    "RESPONSE FORMAT",
    DIVIDER,
    "Structure your response in clear sections. Cite KB IDs and step/item numbers inline.",
    "Be specific and actionable — not generic advice. Use markdown formatting.",
  ].join("\n");

  return { enrichedPrompt, artifactsLoaded: loaded };
}

// ── Settlement preview ────────────────────────────────────────────────────────

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
      contentHash: kb.contentHash,
      domain:      kb.domain,
      royaltyBps:  kb.royaltyBps ?? 0,
      ethReceived: Number(perKB.toFixed(8)),
    })),
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Rate limiting ────────────────────────────────────────────────────────────
  const clientIp = getClientIp(req);
  if (checkRateLimit(clientIp)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({
      error:  "Too many requests",
      detail: "Max 60 requests per minute per IP.",
    });
  }

  // ── Input validation ─────────────────────────────────────────────────────────
  const { query, types, domains: reqDomains, limit: reqLimit } = req.body ?? {};

  if (!query || typeof query !== "string" || query.trim().length < 3) {
    return res.status(400).json({ error: "query is required (min 3 chars)" });
  }
  if (query.length > 2_000) {
    return res.status(400).json({ error: "query too long (max 2,000 chars)" });
  }

  const limit = Math.min(Math.max(Number(reqLimit) || 4, 1), 10);

  // ── Cache check ──────────────────────────────────────────────────────────────
  const cKey   = getCacheKey(query, types, reqDomains, limit);
  const cached = cacheGet(cKey);
  if (cached) return res.status(200).json({ ...cached, cached: true });

  const warnings = [];

  try {
    // ── 1. Domain inference ────────────────────────────────────────────────────
    // Prefer caller-supplied domains; fall back to keyword inference.
    const domains = (reqDomains?.length > 0)
      ? reqDomains
      : inferDomains(query);

    // ── 2. Subgraph discovery ─────────────────────────────────────────────────
    let kbs = [];
    let usingFallback = false;

    try {
      kbs = await querySubgraph(domains, limit);
    } catch (err) {
      warnings.push(`Subgraph unavailable (${err.message}) — using seed corpus.`);
    }

    // Optional type filter (client-side after subgraph fetch)
    if (types?.length > 0) {
      const typeSet = new Set(types.map(t => t.toLowerCase()));
      kbs = kbs.filter(kb => typeSet.has((kb.kbType ?? "").toLowerCase()));
    }

    kbs = kbs.filter(kb => kb.cid).slice(0, limit);

    if (kbs.length === 0) {
      kbs = [...KB_ENG_FALLBACK].slice(0, limit);
      usingFallback = true;
      if (!warnings.length) {
        warnings.push("No live KBs found — using seed corpus fallback.");
      }
    }

    // Normalise shape
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
      settlementCount: kb.settlementCount ?? "0",
      totalSettledValue: kb.totalSettledValue ?? "0",
      fallback:        kb.fallback ?? false,
    }));

    // ── 3. Fetch IPFS artifacts + build enriched prompt ────────────────────────
    const { enrichedPrompt, artifactsLoaded } = await buildEnrichedPrompt(kbs);

    // ── 4. Settlement preview ──────────────────────────────────────────────────
    const settlementPreview = buildSettlementPreview(kbs);

    // ── 5. Response ────────────────────────────────────────────────────────────
    const payload = {
      enrichedPrompt,
      kbs: kbs.map((kb, i) => ({
        id:              `KB-${i + 1}`,
        contentHash:     kb.contentHash,
        title:           kb.title,
        summary:         kb.summary,
        kbType:          kb.kbType,
        domain:          kb.domain,
        cid:             kb.cid,
        reputationScore: kb.reputationScore,
        settlementCount: kb.settlementCount,
        totalSettledValue: kb.totalSettledValue,
        queryFeeWei:     kb.queryFeeWei,
        royaltyBps:      kb.royaltyBps,
        fallback:        kb.fallback,
      })),
      settlementPreview,
      artifactsLoaded,
      usingFallback,
      warnings,
      cached: false,
    };

    cacheSet(cKey, payload);
    return res.status(200).json(payload);

  } catch (err) {
    console.error("retrieve error:", err);
    return res.status(500).json({ error: "Internal error", detail: err.message });
  }
}
