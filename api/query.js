/**
 * api/query.js — Vercel serverless function
 *
 * POST /api/query
 * Body: { question: string }
 *
 * Builds a grounded system prompt from the 4 KB-ENG artifacts,
 * calls GPT-4o-mini, and returns the answer with full attribution trail.
 * Identical questions are served from an in-process cache (warm instances).
 *
 * Env vars required:
 *   OPENAI_API_KEY
 */

import { createHash } from "crypto";

export const config = { maxDuration: 30 };

// ── Rate limiting (in-process sliding window, persists across warm invocations) ─
//
// Per-IP:   20 requests per 60-second window
// Global:   100 requests per 60-second window
// Input:    max 5,000 characters per question
//
// Note: resets on cold start (acceptable for demo; use Redis for stricter limits).

const RATE_WINDOW_MS  = 60_000; // 1 minute
const RATE_LIMIT_IP   = 20;     // per IP per window
const RATE_LIMIT_GLOBAL = 100;  // total across all IPs per window

const ipWindows     = new Map(); // ip → timestamp[]
const globalWindow  = [];        // timestamp[]

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers["x-real-ip"] ?? req.socket?.remoteAddress ?? "unknown";
}

// Returns true if the request should be blocked (rate limited).
function checkRateLimit(ip) {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;

  // Clean + check per-IP window
  if (!ipWindows.has(ip)) ipWindows.set(ip, []);
  const ipHits = ipWindows.get(ip).filter(t => t > cutoff);
  if (ipHits.length >= RATE_LIMIT_IP) return true;
  ipHits.push(now);
  ipWindows.set(ip, ipHits);

  // Clean + check global window
  const now2 = Date.now();
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

// ── Response cache (persists across requests within a warm serverless instance) ─
const responseCache = new Map();
const CACHE_MAX = 100; // evict oldest when full

function getCacheKey(question) {
  return createHash("sha256").update(question.trim().toLowerCase()).digest("hex").slice(0, 16);
}

function cacheGet(key) { return responseCache.get(key) ?? null; }

function cacheSet(key, value) {
  if (responseCache.size >= CACHE_MAX) {
    // evict the oldest entry
    responseCache.delete(responseCache.keys().next().value);
  }
  responseCache.set(key, value);
}

// ── KB-ENG Attribution metadata ───────────────────────────────────────────────

const KB_ATTRIBUTION = [
  {
    id:     "KB-ENG-1",
    title:  "Stable Production API Design",
    type:   "Practice",
    domain: "engineering.api.design",
    hash:   "0x574542249886be6e935764c9b1518b57bae71cab15de273a41d39c190c5d0d20",
    cid:    "QmQfF4NtyFhNeEwxn4GdHhUYT5o2Emmb1r2CDuo1AGe9un",
    tx:     "0x910b534b5da8dde3a0e0e6be71b8406e35dea2de2868334f0ae0f5b93d42b8e4",
    block:  43465242,
    royaltyBps: 0,
    parents: [],
    color:  "#818cf8",
  },
  {
    id:     "KB-ENG-2",
    title:  "OpenAPI Contract Specification",
    type:   "Feature",
    domain: "engineering.api.contracts",
    hash:   "0x9c9187a7852768097b2b441acbeedb86374cd003d1c02f57cd7178852a36cb1c",
    cid:    "QmdzWRjtbWBQ8DpwzC8pHZ8U9BssHnzvPUDrS6gWeRRyck",
    tx:     "0x9ed0bff86d5a179ff6ff7f3ee40c15473071d48a2f014b2b79328a3b70941a49",
    block:  43465244,
    royaltyBps: 500,
    parents: ["KB-ENG-1"],
    color:  "#34d399",
  },
  {
    id:     "KB-ENG-3",
    title:  "RESTful API Implementation",
    type:   "Practice",
    domain: "engineering.api.implementation",
    hash:   "0x5181efedb5749f4e6157cf622e63969d3949c7f979258333a11d1b735714e57d",
    cid:    "QmZQ2gV9trEhNvKck8Rmr374k2hTWPU8yPj7btfPqCfWUq",
    tx:     "0x12ba3da15871a00c0baa4063508243c5c8bf9ee8be7f292c66fb3fa828bc20da",
    block:  43465245,
    royaltyBps: 500,
    parents: ["KB-ENG-1"],
    color:  "#f472b6",
  },
  {
    id:     "KB-ENG-4",
    title:  "API Endpoint Security",
    type:   "ComplianceChecklist",
    domain: "engineering.api.security",
    hash:   "0xc481b00215bda9fd757e7c123459ce5cbe0d1de2b55b6e9f98ae2b99d1eba5e3",
    cid:    "Qmeu9YpyukeA96DptqKoafZo6rYsMwtryJQuFo8h5pDDrS",
    tx:     "0xb827012cdcf1ecd3c62bd7b2f035abb2ac744d2139abbf60695bd2d2714dc493",
    block:  43465248,
    royaltyBps: 500,
    parents: ["KB-ENG-3"],
    color:  "#fb923c",
  },
];

// ── IPFS artifact fetching ────────────────────────────────────────────────────

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://gateway.pinata.cloud/ipfs",
];
const IPFS_TIMEOUT_MS = 5_000;
const DIVIDER = "═══════════════════════════════════════════════";

async function fetchArtifact(cid) {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), IPFS_TIMEOUT_MS);
      const res = await fetch(`${gateway}/${cid}`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return await res.json();
    } catch { /* try next gateway */ }
  }
  return null;
}

function formatArtifactSection(kb, artifact, index) {
  const label  = kb.id;
  const title  = artifact?.title  ?? kb.title;
  const type   = artifact?.kbType ?? kb.type;
  const domain = artifact?.domain ?? kb.domain;
  let content  = "";

  if (artifact?.steps?.length) {
    content = artifact.steps
      .map((s) => `${s.id}: ${s.action}`)
      .join("\n");
  } else if (artifact?.checklist?.length) {
    content = artifact.checklist
      .map((item, i) => {
        const sev = item.severity ? `[${item.severity.toUpperCase()}] ` : "";
        return `${sev}item_${i + 1}: ${item.item}`;
      })
      .join("\n");
  } else if (artifact?.summary) {
    content = artifact.summary;
  } else {
    content = "(artifact unavailable — partial context)";
  }

  return [
    DIVIDER,
    `${label} · ${title} (${type})`,
    `Domain: ${domain}`,
    DIVIDER,
    content,
  ].join("\n");
}

/**
 * Build the system prompt by fetching live artifacts from IPFS.
 * Falls back gracefully — if a gateway is slow or offline the KB section
 * will note partial context rather than blocking the whole request.
 * Returns { prompt, artifactsLoaded } so callers know how many KBs injected.
 */
async function buildSystemPrompt(kbs) {
  const artifactPromises = kbs.map((kb) => fetchArtifact(kb.cid));
  const artifacts = await Promise.all(artifactPromises);

  const sections = kbs.map((kb, i) => formatArtifactSection(kb, artifacts[i], i));
  const loaded   = artifacts.filter(Boolean).length;

  const prompt = [
    "You are a senior software engineer. Your responses are grounded exclusively in the",
    "following Knowledge Block procedures fetched live from the Alexandrian Protocol.",
    "Every recommendation must map to a specific KB step or checklist item.",
    `Reference the KB ID and step ID inline (e.g., "${kbs[0]?.id ?? "KB-ENG-1"} step_3").`,
    "",
    ...sections,
    "",
    DIVIDER,
    "RESPONSE FORMAT",
    DIVIDER,
    "Structure your response in clear sections. Cite the KB step inline.",
    "Be specific and actionable — not generic advice. Use markdown formatting.",
  ].join("\n");

  return { prompt, artifactsLoaded: loaded };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
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
      error: "Too many requests",
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
  const cKey = getCacheKey(question);
  const cached = cacheGet(cKey);
  if (cached) {
    return res.status(200).json({ ...cached, cached: true });
  }

  try {
    // ── Build prompt from live IPFS artifacts ──────────────────────────────────
    const { prompt: systemPrompt, artifactsLoaded } = await buildSystemPrompt(KB_ATTRIBUTION);

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
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

    // Settlement routing: 0.001 ETH total, split across DAG
    // KB-ENG-1 receives royalties from KB-ENG-2, KB-ENG-3 (500 bps each)
    // KB-ENG-3 receives royalties from KB-ENG-4 (500 bps)
    const totalEth   = 0.004;
    const protocolFee = totalEth * 0.05; // 5% — matches setProtocolFee(500) on contract
    const settlement = KB_ATTRIBUTION.map((kb) => ({
      id:         kb.id,
      hash:       kb.hash,
      ethReceived: Number(((totalEth - protocolFee) / 4).toFixed(6)),
    }));

    const payload = {
      answer,
      attribution: KB_ATTRIBUTION,
      settlement: {
        totalEth,
        protocolFee: Number(protocolFee.toFixed(6)),
        distribution: settlement,
      },
      model:           data.model,
      usage:           data.usage,
      artifactsLoaded, // how many KB artifacts were fetched live from IPFS
      cached:          false,
    };

    cacheSet(cKey, payload);
    return res.status(200).json(payload);
  } catch (err) {
    console.error("query error:", err);
    return res.status(500).json({ error: "Internal error", detail: err.message });
  }
}
