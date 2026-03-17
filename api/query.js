/**
 * api/query.js — Vercel serverless function
 *
 * POST /api/query
 * Body: { question: string }
 *
 * Builds a grounded system prompt from the 4 KB-ENG artifacts,
 * calls GPT-4o, and returns the answer with full attribution trail.
 *
 * Env vars required:
 *   OPENAI_API_KEY
 */

export const config = { maxDuration: 30 };

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

// ── Grounded system prompt ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior software engineer. Your responses are grounded exclusively in the following KB procedures. Every recommendation must map to a specific KB step or checklist item. Reference the KB ID and step ID inline (e.g., "KB-ENG-1 step_3").

═══════════════════════════════════════════════
KB-ENG-1 · Stable Production API Design (Practice)
Domain: engineering.api.design
═══════════════════════════════════════════════
step_1: Define the resource model — identify core entities, scalar attributes, and relationships. Assign each entity a singular noun name. Reject verb entity names.
step_2: Map HTTP methods using semantic correctness: GET (safe+idempotent), POST (non-idempotent creation), PUT/PATCH (idempotent), DELETE (idempotent). Annotate each operation with safety and idempotency properties.
step_3: Design the error schema: { error: { code: SCREAMING_SNAKE_CASE, message: string, retryable: boolean, details: object|null, request_id: string } }. Status codes: 400 INVALID_INPUT (fatal), 401 UNAUTHORIZED (fatal), 403 FORBIDDEN (fatal), 404 NOT_FOUND (fatal), 409 CONFLICT, 422 VALIDATION_FAILED (fatal), 429 RATE_LIMITED (retryable), 500 INTERNAL_ERROR (retryable).
step_4: Specify auth scheme: assign PUBLIC/USER/ADMIN/SERVICE tier to every operation. Document JWT { algorithm, lifetime_seconds, issuer, audience, required_claims }. Default to USER, escalate to ADMIN only for operations affecting other users' data.
step_5: Plan versioning: URI-based /v1/, backward compatibility rules (additive changes safe, field removal is a breaking change), deprecation policy with 12-month sunset.
step_6: Produce API design document: annotated resource table — endpoint, method, auth_tier, idempotent, request_schema, response_schema, error_codes.
step_7: Consumer review — give the design doc to a mock consumer, ask them to implement 3 operations without asking questions. Every clarification is a design defect.

═══════════════════════════════════════════════
KB-ENG-2 · OpenAPI Contract Specification (Feature)
Domain: engineering.api.contracts
Parent: KB-ENG-1
═══════════════════════════════════════════════
step_1: Initialize OpenAPI 3.1.0 document with info, servers (include /v1 in server URL not in paths), and global security: [{ BearerAuth: [] }].
step_2: Create SEPARATE component schemas: {Entity}CreateRequest (writable fields only, required: all non-optional), {Entity}UpdateRequest (writable, required: none for PATCH), {Entity}Response (all fields, server-assigned fields marked readOnly: true), {Entity}ListResponse (pagination envelope: items, total, page, pageSize). NEVER use one schema for both request and response.
step_3: Define paths and operations: unique operationId per operation ({method}{Entity} convention), tags for grouping. Every operation must declare success response + 400 (if has body) + 401 (if not PUBLIC) + 404 (if path param) + 500.
step_4: Enforce strict schemas: no freeform objects (type: object with no properties), explicit required arrays, additionalProperties: false on all request bodies. Nullable fields use oneOf: [{type: 'null'}, {type: original}].
step_5: Security schemes: BearerAuth in components/securitySchemes. PUBLIC endpoints get security: [] override. Every operation either inherits global security or has explicit override.
step_6: Add examples: happy-path and each error code per operation. Examples must be valid instances of the schema.
step_7: Validate: spectral lint (zero errors), mock server smoke tests pass for all examples.

═══════════════════════════════════════════════
KB-ENG-3 · RESTful API Implementation (Practice)
Domain: engineering.api.implementation
Parent: KB-ENG-1
═══════════════════════════════════════════════
step_1: Schema-first router: generate routes from OpenAPI spec operationIds. No route may exist that is not in the spec. CI check: route list vs spec paths must match.
step_2: Request validation middleware: validate every request against OpenAPI requestBody schema BEFORE handlers. On failure: 422 VALIDATION_FAILED with error body from KB-ENG-1 step_3. coerceTypes: false. validateResponses: true in dev only.
step_3: Dependency injection: every handler receives deps (db, cache, external clients) as constructor/function params. No handler accesses global state or instantiates its own deps. Factory pattern: createHandler({ dep1, dep2 }) => (req, res) => {...}.
step_4: Centralized error pipeline: single error handler (last middleware). Maps error types to status codes from KB-ENG-1 step_3. All 500s logged at ERROR with stack trace. 4xx logged at WARN without stack trace.
step_5: Structured JSON logging: { timestamp, level, request_id, method, path, status, latency_ms, user_id }. Generate request_id on receipt if no X-Request-ID header. Propagate in response header. 2xx→INFO, 4xx→WARN, 5xx→ERROR. Never log request bodies or Authorization headers.
step_6: Graceful shutdown: on SIGTERM/SIGINT — stop accepting connections, drain in-flight requests within 25s, close DB connections, exit(0).
step_7: Contract integration tests: every operationId has at least one success path test and one test per documented error code. Real HTTP requests against running service — not mocked middleware.

═══════════════════════════════════════════════
KB-ENG-4 · API Endpoint Security (ComplianceChecklist)
Domain: engineering.api.security
Parent: KB-ENG-3
═══════════════════════════════════════════════
[CRITICAL] item_1 Auth requirement map: verify auth middleware is installed BEFORE route handler for every non-PUBLIC endpoint. No endpoint is PUBLIC that should be authenticated. Curl test: any 200 on a non-PUBLIC route without token is a critical finding.
[CRITICAL] item_2 JWT validation: verify signature, exp (not expired), iss (matches configured issuer), aud (matches this service), not in revocation list. Algorithm must be RS256 or ES256 — never HS256 in multi-service systems, never alg=none. Attack tests: expired token → 401, wrong aud → 401, wrong key → 401, alg=none → 401.
[CRITICAL] item_3 RBAC/IDOR: for every operation on a user-owned resource, verify resource.owner_id == user_id from JWT claims BEFORE responding. Authentication ≠ authorization. IDOR test: User B reads User A's resource → must return 403, not 200 or 404.
[HIGH] item_4 Input sanitization: parameterized queries only — never string interpolation in SQL. DOMPurify or html.EscapeString for HTML output. additionalProperties: false on all request schemas. Reject SQL injection probes (' OR '1'='1) and command injection probes (; ls -la) with 422.
[HIGH] item_5 Rate limiting: Redis-backed sliding window. Auth endpoints (POST /sessions, POST /password-reset): 5 req/min/IP. Authenticated operations: 100 req/min/user_id. Admin operations: 20 req/min/user_id. Response: 429 with Retry-After header and X-RateLimit-* headers.
[HIGH] item_6 OWASP API Top 10 audit: pagination enforced on list endpoints (API4), admin operations return 403 to user tokens (API5), SSRF test on URL fields (API7), CORS not * on authenticated endpoints (API8), no /v0/ or /dev/ routes in prod (API9).
[MEDIUM] item_7 Adversarial test suite in CI: IDOR (User B→User A's resource → 403), JWT alg=none (→ 401), wrong audience (→ 401), rate limit breach (→ 429), SQL injection probe (→ 422), missing auth token (→ 401), user token on admin endpoint (→ 403), wrong HTTP method on read-only endpoint (→ 405).

═══════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════
Structure your response in clear sections. For each recommendation, cite the KB step inline. Use markdown formatting. Be specific and actionable — not generic advice.`;

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

  const { question } = req.body ?? {};
  if (!question || typeof question !== "string" || question.trim().length < 5) {
    return res.status(400).json({ error: "question is required (min 5 chars)" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       "gpt-4o",
        temperature: 0.3,
        max_tokens:  2500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
    const protocolFee = totalEth * 0.02;
    const settlement = KB_ATTRIBUTION.map((kb) => ({
      id:         kb.id,
      hash:       kb.hash,
      ethReceived: Number(((totalEth - protocolFee) / 4).toFixed(6)),
    }));

    return res.status(200).json({
      answer,
      attribution: KB_ATTRIBUTION,
      settlement: {
        totalEth,
        protocolFee: Number(protocolFee.toFixed(6)),
        distribution: settlement,
      },
      model:      data.model,
      usage:      data.usage,
    });
  } catch (err) {
    console.error("query error:", err);
    return res.status(500).json({ error: "Internal error", detail: err.message });
  }
}
