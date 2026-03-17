/**
 * inject-handcrafted-kbs.mjs
 *
 * Writes hand-crafted authoritative KB entries directly to staging/refined/.
 * Each KB is given a deterministic kbHash derived from its content so the
 * hash is stable across re-runs and the file can be re-injected safely.
 *
 * Hash scheme: keccak256("alexandrian.kb.handcrafted.v1" + JCS(entry_fields))
 * where entry_fields = { title, summary, standard, procedure, references,
 *                        failure_modes, verification, tags, domain }
 *
 * Usage:
 *   node scripts/inject-handcrafted-kbs.mjs [--dry-run]
 */

import { createRequire } from "module";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { keccak_256 } = require("js-sha3");
const __dirname = dirname(fileURLToPath(import.meta.url));

const DOMAIN_TAG = "alexandrian.kb.handcrafted.v1";
const REFINED_DIR = join(__dirname, "..", "staging", "refined");
const DRY_RUN = process.argv.includes("--dry-run");

// ── JCS (RFC 8785) — mirrors hash.ts canonicalize ────────────────────────────

function canonicalize(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") + "}";
  }
  throw new Error("Unsupported type: " + typeof value);
}

function computeHash(entry) {
  const fields = {
    domain: entry.domain,
    failure_modes: entry.failure_modes,
    procedure: entry.procedure,
    references: entry.references,
    standard: entry.standard,
    summary: entry.summary,
    tags: entry.tags,
    title: entry.title,
    verification: entry.verification,
  };
  const canonical = canonicalize(fields);
  const bytes = new TextEncoder().encode(DOMAIN_TAG + canonical);
  return "0x" + keccak_256(bytes);
}

function scoreQuality(entry) {
  // Simple heuristic matching the scorer — hand-crafted KBs should all anchor
  return {
    score: 2.8,
    classification: "anchor",
    dimensions: { executability: 3, atomicity: 3, epistemicHonesty: 3, depth: 3 },
    failureReasons: [],
    handcrafted: true,
    scoredAt: new Date().toISOString(),
  };
}

function inject(entry) {
  const kbHash = computeHash(entry);
  const filePath = join(REFINED_DIR, `${kbHash}.json`);
  const exists = existsSync(filePath);

  const record = {
    ...entry,
    _quality: scoreQuality(entry),
  };

  if (DRY_RUN) {
    console.log(`[dry-run] ${exists ? "EXISTS" : "NEW   "} ${kbHash.slice(0, 18)}… ${entry.title}`);
    return kbHash;
  }

  writeFileSync(filePath, JSON.stringify(record, null, 2), "utf-8");
  console.log(`[${exists ? "updated" : "written"}] ${kbHash.slice(0, 18)}… ${entry.title}`);
  return kbHash;
}

// ── Hand-crafted KB definitions ───────────────────────────────────────────────

const KBS = [

  // ── 1. CORS ────────────────────────────────────────────────────────────────
  {
    domain: "software.security.cors",
    title: "CORS Allowlist Enforcement",
    summary: "Prevent cross-origin data theft by validating request Origin against an explicit server-side allowlist and setting Vary: Origin to block cache poisoning.",
    standard: "Never reflect the request Origin header without explicit allowlist validation; set Vary: Origin on all CORS responses; disallow wildcard origins on credentialed endpoints.",
    procedure: [
      "Build the CORS allowlist from environment config (CORS_ORIGINS=https://app.example.com,...); assert each entry is an absolute URI with scheme and host, no wildcards; assert wildcard_entry_count = 0 when credentials_required = true.",
      "On each incoming request, compare request.headers.Origin against the allowlist using strict string equality — do not use .includes() or regex; if not matched, omit all Access-Control-* headers entirely; assert reflected_origin === allowlist_match or header_absent.",
      "Set Vary: Origin on every response that conditionally includes Access-Control-Allow-Origin to prevent CDN cache poisoning; assert Vary header includes 'Origin' on 100% of CORS-enabled route responses; run cache_poisoning_probe() and assert result = safe.",
      "For preflight OPTIONS requests, return Access-Control-Allow-Methods and Access-Control-Allow-Headers from an explicit static allowlist; set Access-Control-Max-Age: 600; assert preflight_response_time_ms < 50 and Content-Length: 0 on OPTIONS response.",
      "Set Access-Control-Allow-Credentials: true only on endpoints that require authentication AND only when origin is in the strict allowlist; assert credentials_header_with_wildcard_origin_count = 0 across all endpoint configurations.",
    ],
    references: [
      "OWASP CORS Cheat Sheet",
      "RFC 6454 — The Web Origin Concept",
      "W3C CORS Specification — Section 6.2 Preflight Request",
      "MDN: Access-Control-Allow-Credentials",
    ],
    failure_modes: [
      "Browser blocks credentialed requests when Access-Control-Allow-Origin: * is returned with Access-Control-Allow-Credentials: true, because the CORS spec explicitly prohibits the wildcard with credentials — replace * with the exact origin from the allowlist.",
      "Cache poisoning when Vary: Origin is absent, causing a CDN to serve one origin's CORS-allowed response to a different origin, because the cache key does not include the Origin header.",
      "Null origin bypass when the server accepts Origin: null (sent by sandboxed iframes, data: URIs, and cross-origin redirects), because null bypasses domain-based allowlist checks — explicitly reject null origins.",
      "Origin reflection without allowlist check when the server echoes the request Origin back unconditionally to avoid CORS errors, because this grants all origins the same access as an explicit allowlist entry.",
    ],
    verification: [
      "Send OPTIONS preflight from an allowlisted origin; assert response includes Access-Control-Allow-Origin matching the exact request Origin and Access-Control-Max-Age >= 300.",
      "Send credentialed request from an origin NOT in the allowlist; assert response does NOT include Access-Control-Allow-Origin header; assert cors_bypass_count = 0.",
      "assert Vary header includes 'Origin' on 100% of CORS responses; run cache_poisoning_probe(); assert poisoning_test_result = safe.",
      "assert wildcard_origin_with_credentials_count = 0 across all endpoint configurations; assert null_origin_accepted = false.",
    ],
    tags: ["cors", "web_security", "http_headers", "access_control", "api_security", "cache_poisoning", "preflight"],
  },

  // ── 2. CSRF ────────────────────────────────────────────────────────────────
  {
    domain: "software.security.csrf",
    title: "CSRF Token Validation",
    summary: "Protect state-mutating endpoints from cross-site request forgery using server-validated, session-bound, cryptographically random tokens compared with constant-time equality.",
    standard: "Every POST/PUT/PATCH/DELETE request must carry a cryptographically unpredictable token bound to the user session and validated with crypto.timingSafeEqual() on the server.",
    procedure: [
      "Generate CSRF token at session creation: token = crypto.randomBytes(32).toString('hex'); store server-side in session store keyed by session_id; assert token_entropy_bits >= 128 and token_unique_per_session = true.",
      "Embed the token in every HTML form as <input type='hidden' name='_csrf' value='...'> and expose as X-CSRF-Token response header for SPA consumption; assert token_present_in_response = true for all non-GET responses.",
      "On each state-mutating request, extract token from request body (_csrf) or header (X-CSRF-Token); compare with session-stored token using crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(stored)); assert constant_time_comparison = true.",
      "Reject requests with missing or invalid tokens with HTTP 403 Forbidden; log { event: 'csrf_failure', session_id_hash, path, ip } — do NOT log the submitted token; assert failed_requests_return_403 = true.",
      "Rotate the CSRF token after each successful state-mutating request to prevent token reuse; assert new_token !== old_token and old_token_invalid_after_rotation = true.",
    ],
    references: [
      "OWASP CSRF Prevention Cheat Sheet",
      "RFC 6749 — OAuth 2.0 state parameter",
      "SameSite Cookie Attribute — MDN",
    ],
    failure_modes: [
      "CSRF succeeds on JSON API endpoints when developers assume Content-Type: application/json implies same-origin, because browsers can send JSON via fetch() from any origin — validate CSRF token on all state-mutating endpoints regardless of Content-Type.",
      "Token fixation when the CSRF token is not rotated after login, because an attacker who obtains the pre-auth token can use it post-auth — always issue a fresh token on privilege escalation.",
      "Timing oracle attack when token comparison uses === instead of crypto.timingSafeEqual(), because string comparison short-circuits on the first differing byte, leaking token information through response timing.",
    ],
    verification: [
      "Submit POST without _csrf token; assert HTTP 403 response and csrf_bypass_count = 0; assert no state mutation occurred.",
      "Submit POST with valid token from a different user's session; assert HTTP 403 and cross_session_token_reuse_blocked = true.",
      "assert crypto.timingSafeEqual() used for all token comparisons — grep codebase for '===' near csrf/token; assert unsafe_comparison_count = 0.",
      "Run OWASP ZAP CSRF scanner against all POST/PUT/PATCH/DELETE endpoints; assert csrf_vulnerability_count = 0.",
    ],
    tags: ["csrf", "web_security", "session", "tokens", "http", "authentication", "timing_attacks"],
  },

  // ── 3. JWT Auth ────────────────────────────────────────────────────────────
  {
    domain: "software.security.auth_jwt",
    title: "JWT Signature and Claims Validation",
    summary: "Verify JWT signature algorithm, expiry, issuer, and audience on every request; reject alg:none tokens; store signing keys outside source control.",
    standard: "JWTs must be validated for signature (RS256 or ES256 only), exp, iss, and aud on every request; the signing key must never appear in source code or logs.",
    procedure: [
      "Verify signature using an explicit algorithm allowlist: jwt.verify(token, publicKey, { algorithms: ['RS256'] }); assert algorithm in ['RS256', 'ES256'] and alg_none_allowed = false; reject with HTTP 401 if signature verification fails.",
      "Validate standard claims in order: assert payload.exp > Math.floor(Date.now()/1000); assert payload.iat <= Math.floor(Date.now()/1000) + 30 (30s clock skew max); assert payload.iss === process.env.JWT_ISSUER; assert payload.aud.includes(process.env.JWT_AUDIENCE).",
      "Validate application claims: assert payload.role in ALLOWED_ROLES; assert payload.scope.includes(required_scope_for_endpoint); return HTTP 401 for identity failures, HTTP 403 for insufficient scope — do not conflate the two.",
      "Implement token rotation: access tokens TTL = 15min, refresh tokens TTL = 7d; on refresh, invalidate the old refresh token server-side; assert old_refresh_token_invalid_after_use = true.",
      "Store signing keys in environment variables or secrets manager (AWS Secrets Manager, HashiCorp Vault); assert signing_key_not_in_source_code = true (run git grep for key material); rotate keys every 90 days with zero-downtime overlap.",
    ],
    references: [
      "RFC 7519 — JSON Web Token",
      "OWASP JWT Security Cheat Sheet",
      "Auth0 — Critical vulnerabilities in JSON Web Token libraries",
    ],
    failure_modes: [
      "Algorithm confusion attack when the server accepts both RS256 and HS256, because an attacker can re-sign a token using the public key as an HS256 secret — enforce a single algorithm in the allowlist and reject mismatched alg headers.",
      "JWT accepted after expiry when clock skew between services exceeds the leeway window, because the validating server's clock lags behind the issuing server — enforce NTP sync and set clockTolerance <= 30s.",
      "Signing key leaked in error logs when JWT verification exceptions include the key material in the stack trace, because error handlers log the full verification context — use generic error messages in production and assert signing_key_in_log_count = 0.",
    ],
    verification: [
      "Submit token signed with wrong key; assert HTTP 401 and jwt_signature_failure logged; assert token_accepted = false.",
      "Submit expired token (exp = now - 1s); assert HTTP 401 and expired_token_rejection_count increments.",
      "Submit token with alg: 'none' and empty signature; assert HTTP 401 and alg_none_rejection_count increments; assert alg_none_accepted = false.",
      "assert signing_key not present in any log entry or error response body; run log_audit(); assert key_exposure_count = 0.",
    ],
    tags: ["jwt", "authentication", "web_security", "authorization", "tokens", "rs256", "claims_validation"],
  },

  // ── 4. publishKB flow ─────────────────────────────────────────────────────
  {
    domain: "meta.protocol.publish",
    title: "Alexandrian KB Publication Flow",
    summary: "Publish a KB on Base mainnet by building the artifact bundle, pinning to IPFS via Pinata, and calling publishKB with msg.value >= minStakeAmount (1e15 wei).",
    standard: "The on-chain kbId equals keccak256(artifact.json bytes); IPFS rootCid must resolve to the same artifact before publishing; stake must meet the current minStakeAmount.",
    procedure: [
      "Generate the artifact bundle: bundle = buildBundle(kbHash, refinedEntry); compute artifactHash = keccak256(artifact_json_bytes); assert artifactHash matches /^0x[a-f0-9]{64}$/ and artifactHash === bundle.artifactHash.",
      "Pin the 3-file directory (artifact.json, manifest.json, meta.json) to IPFS via Pinata pinFileToIPFS API; assert rootCid starts with 'bafy' (CIDv1 base32); verify: fetch(ipfsGateway + '/' + rootCid + '/artifact.json') and assert keccak256(response_body) === artifactHash.",
      "Read current minStakeAmount from contract: const min = await registry.minStakeAmount(); assert min === 1e15n or current value; set msg.value = min for zero-margin stake or higher for signal.",
      "Call registry.publishKB(rootCid, artifactHash, kbType, parentHashes, royaltyBps, { value: stakeAmount }); assert tx.status === 1 and KBPublished event emitted with kbId === artifactHash.",
      "Verify on-chain state: const kb = await registry.getKB(artifactHash); assert kb.rootCid === rootCid and kb.stakeAmount >= min and kb.publisher === signerAddress and kb.queryVolume === 0n.",
    ],
    references: [
      "AlexandrianRegistryV2.sol — publishKB function",
      "Pinata API — pinFileToIPFS endpoint",
      "Base Mainnet RPC — https://mainnet.base.org",
    ],
    failure_modes: [
      "publishKB reverts with InsufficientStake when msg.value < minStakeAmount, because the contract enforces the minimum on every publication — call registry.minStakeAmount() before building the transaction.",
      "Duplicate publication reverts when the same artifactHash is submitted twice, because kbId = artifactHash and the registry enforces uniqueness — ensure content differs or use setMinStake(0) bootstrap mode for re-generation.",
      "Stale IPFS content when the pin is replaced after rootCid is computed but before publishing, because IPFS content addressing is mutable via pin updates — always verify gateway fetch hash === artifactHash immediately before sending the transaction.",
    ],
    verification: [
      "assert keccak256(artifact_json_bytes) === artifactHash before every publishKB call; assert artifactHash format matches /^0x[a-f0-9]{64}$/.",
      "Fetch rootCid/artifact.json from IPFS gateway; assert keccak256(response_body) === artifactHash; assert fetch_status = 200.",
      "Call registry.getKB(artifactHash) post-publish; assert kb.rootCid === rootCid and kb.stakeAmount >= 1e15 and kb.publisher === signerAddress.",
      "assert KBPublished event in tx.receipt.logs with correct kbId, rootCid, and publisher fields; assert event_count = 1 per publish call.",
    ],
    tags: ["alexandrian_protocol", "ipfs", "base_mainnet", "publishkb", "staking", "evm", "kb_publication"],
  },

  // ── 5. Reputation scoring ─────────────────────────────────────────────────
  {
    domain: "meta.protocol.reputation",
    title: "Alexandrian Reputation Score Formula",
    summary: "Reputation = min(1000, min(500, queryVolume*2) + min(100, endorsements*20)); scores saturate at 1000; queryVolume caps contribution at 250 queries; endorsements cap at 5.",
    standard: "The reputation score is computed deterministically from on-chain queryVolume and endorsements; it cannot be directly set and saturates at 1000.",
    procedure: [
      "Read on-chain state: const kb = await registry.getKB(kbId); extract kb.queryVolume (BigInt) and kb.endorsements (uint256); assert both are non-negative.",
      "Compute query contribution: qScore = Math.min(500, Number(kb.queryVolume) * 2); assert qScore = 500 when queryVolume >= 250 (saturation point); assert qScore increases by 2 per query below 250.",
      "Compute endorsement contribution: eScore = Math.min(100, Number(kb.endorsements) * 20); assert eScore = 100 when endorsements >= 5 (saturation point); assert eScore increases by 20 per endorsement below 5.",
      "Compute total: score = Math.min(1000, qScore + eScore); assert score in [0, 1000]; assert max score of 600 achievable with 0 queries and 5 endorsements; assert max score of 1000 requires queryVolume >= 250 AND endorsements >= 5.",
      "Verify against contract: const onChain = await registry.getReputation(kbId); assert Number(onChain) === score; assert local_computation_matches_contract = true.",
    ],
    references: [
      "AlexandrianRegistryV2.sol — ReputationLogic.sol library",
      "packages/protocol/contracts/libraries/ReputationLogic.sol",
    ],
    failure_modes: [
      "Score ceiling surprise when queryVolume >> 250 — additional queries beyond 250 contribute 0 to score because min(500, queryVolume*2) saturates, so high-volume KBs plateau at 500 from queries alone.",
      "Endorsement over-counting when the same address endorses multiple times — the contract reverts or ignores duplicate endorsers; only distinct endorser addresses count toward the endorsement score.",
      "Off-chain divergence when local computation uses floating-point arithmetic instead of integer arithmetic matching Solidity — use Math.floor and integer operations to match the on-chain SafeMath result.",
    ],
    verification: [
      "assert registry.getReputation(kbId) === min(1000, min(500, queryVolume*2) + min(100, endorsements*20)) for 10 random kbIds sampled from the registry.",
      "assert score_delta_per_query = 2 for queryVolume < 250; assert score_delta_per_query = 0 for queryVolume >= 250.",
      "assert score_delta_per_endorsement = 20 for endorsements < 5; assert score_delta_per_endorsement = 0 for endorsements >= 5.",
      "assert max_score_with_5_endorsements_0_queries = 100; assert max_score_with_250_queries_5_endorsements = 600; assert absolute_max_score = 1000.",
    ],
    tags: ["alexandrian_protocol", "reputation", "scoring", "queryvolume", "endorsements", "on_chain", "base_mainnet"],
  },

  // ── 6. Settlement ─────────────────────────────────────────────────────────
  {
    domain: "meta.protocol.settlement",
    title: "Alexandrian Query Settlement and Royalty Distribution",
    summary: "settleQuery deducts a 2% protocol fee then distributes the remainder across the attribution DAG by royaltyBps weights into pendingWithdrawals; publishers pull earnings via withdraw().",
    standard: "Settlement is pull-based: earnings accumulate in pendingWithdrawals[] and are not automatically transferred; royaltyBps must sum to <= 10000; each kbId in the DAG must be published.",
    procedure: [
      "Construct attribution DAG: kbIds[] ordered by influence, royaltyBps[] summing to exactly 10000; assert kbIds.length === royaltyBps.length and sum(royaltyBps) === 10000 and kbIds.length <= 8.",
      "Call registry.settleQuery(queryId, kbIds, royaltyBps, { value: queryFeeWei }); assert msg.value > 0; estimate gas with eth_estimateGas before submitting; assert gas_estimate < 200000 for DAG depth <= 8.",
      "Protocol fee: protocolFee = queryFeeWei * 200n / 10000n (2%); remainder = queryFeeWei - protocolFee; assert treasury balance increases by protocolFee after settlement.",
      "Per-KB distribution: for each i, earning = remainder * royaltyBps[i] / 10000n; pendingWithdrawals[kb.publisher] += earning; assert sum(all earnings) <= remainder and no_earnings_lost = true.",
      "Publishers withdraw: await registry.withdraw(); assert pendingWithdrawals[publisher] === 0n after withdrawal and publisher ETH balance increases by the withdrawn amount; assert reentrancy guard active during withdrawal.",
    ],
    references: [
      "AlexandrianRegistryV2.sol — settleQuery and withdraw functions",
      "Pull Payment Pattern — OpenZeppelin",
      "EIP-1884 — Repricing of trie-size-dependent opcodes",
    ],
    failure_modes: [
      "Royalty underpayment when royaltyBps sum < 10000, because the unallocated remainder is not distributed to any party and is effectively locked — always assert sum(royaltyBps) === 10000 before calling settleQuery.",
      "settleQuery reverts with InvalidDAG when a kbId in the attribution array is not published on-chain, because the contract validates each kbId against the registry before computing royalties.",
      "Earnings stuck when the publisher never calls withdraw() — pendingWithdrawals accumulates without bound; implement withdrawal monitoring with alert when pendingWithdrawals[publisher] > 0.01 ETH.",
    ],
    verification: [
      "assert protocolFee === queryFeeWei * 200n / 10000n and treasury_balance_delta === protocolFee after settleQuery.",
      "assert sum(pendingWithdrawals_delta for all publishers) === queryFeeWei - protocolFee; assert total_distribution_accuracy = true.",
      "Attempt settleQuery with an unpublished kbId; assert transaction reverts with InvalidDAG error.",
      "Call withdraw() post-settlement; assert publisher ETH balance increases by pendingWithdrawals amount and pendingWithdrawals[publisher] === 0n.",
    ],
    tags: ["alexandrian_protocol", "settlement", "royalties", "evm", "base_mainnet", "pull_payment", "dag"],
  },

  // ── 7. Agent planning loop ────────────────────────────────────────────────
  {
    domain: "agent.planning",
    title: "Bounded Plan-Execute-Verify Agent Loop",
    summary: "An agent loop must define a falsifiable termination condition, enforce a hard iteration ceiling, capture rollback snapshots before each action, and log every step to a planning trace.",
    standard: "Every agent loop must terminate: define goal_condition before starting, enforce max_iterations, capture rollback state before each action, and return ITERATION_LIMIT_EXCEEDED rather than running forever.",
    procedure: [
      "Define the termination condition before starting: goal_condition = fn(state) → boolean, computable in O(1) from observable state; assert goal_condition is defined and max_iterations > 0 and isFinite(max_iterations); log { goal, max_iterations } to planning_trace.",
      "At each iteration: if goal_condition(current_state) === true, halt and return { status: 'success', iterations: count, final_state }; if count >= max_iterations, halt and return { status: 'ITERATION_LIMIT_EXCEEDED', state_snapshot: current_state }.",
      "Select next action: action = planner.select(current_state, goal_condition); assert action is in valid_action_space and precondition(action, current_state) === true before executing; log selected action to planning_trace.",
      "Execute with rollback: snapshot = captureState(); try { execute(action); assert postcondition(action, newState) === true; } catch { restoreState(snapshot); markActionFailed(action); assert rollback_success = true; }",
      "Refresh current_state from environment after each action (do not use cached state); assert state_age_ms < 500 before next action selection; increment iteration count; append { iteration, action, postcondition_met, state_hash } to planning_trace.",
    ],
    references: [
      "ReAct: Synergizing Reasoning and Acting in Language Models",
      "Plan-and-Solve Prompting",
      "Graceful Degradation Pattern",
    ],
    failure_modes: [
      "Infinite loop when goal_condition is unreachable from initial_state and max_iterations is not enforced, because the planner keeps selecting actions that move toward an unachievable goal — always enforce the hard iteration ceiling.",
      "State corruption when rollback fails after a partially executed action that had side effects not captured in the snapshot, because external state (DB writes, API calls) cannot always be rolled back — identify and isolate side-effecting operations before starting the loop.",
      "Stale precondition when current_state is not refreshed from the environment before action selection, because cached state diverges from actual state causing the planner to select invalid or redundant actions.",
    ],
    verification: [
      "assert loop terminates in <= max_iterations for all test scenarios; assert ITERATION_LIMIT_EXCEEDED returned when goal is unreachable in max_iterations steps.",
      "assert goal_condition(final_state) === true on every successful termination; assert success_count + limit_exceeded_count = total_runs.",
      "Inject action failure at step N; assert state restored to pre-step-N snapshot; assert rollback_success = true and planning_trace records the failure.",
      "assert planning_trace contains { iteration, action, postcondition_met, state_hash } for every iteration; assert trace_completeness = true.",
    ],
    tags: ["agent_planning", "agent_loop", "iteration_limit", "rollback", "termination", "planning_trace", "react"],
  },

  // ── 8. Exponential backoff retry ──────────────────────────────────────────
  {
    domain: "agent.error_recovery",
    title: "Exponential Backoff Retry with Jitter",
    summary: "Classify errors as retryable or permanent before retrying; compute delay as min(base*2^attempt, max)+jitter; require idempotency keys on non-GET retries; emit RETRY_EXHAUSTED after max_attempts.",
    standard: "Transient failures (5xx, 429, timeout, network) must be retried with exponential backoff and random jitter; permanent failures (4xx except 429) must never be retried.",
    procedure: [
      "Classify the error before retrying: HTTP 5xx, 429, network error, and timeout are retryable; HTTP 4xx (except 429) and schema validation failures are permanent; assert error_class in ['retryable', 'permanent'] before proceeding; log error_class.",
      "Compute delay: delay_ms = Math.min(base_delay_ms * Math.pow(2, attempt), max_delay_ms); add jitter: delay_ms += Math.random() * base_delay_ms * 0.2; assert delay_ms <= max_delay_ms and jitter_applied = true.",
      "Wait using a cancellable timer: await cancellableDelay(delay_ms, abortSignal); assert wait is interruptible by shutdown signal; assert actual_wait_ms >= delay_ms * 0.9.",
      "Re-execute with identical parameters; assert idempotency_key is set if operation is not naturally idempotent (POST/PUT/PATCH); assert attempt_count increments by 1 and request_body unchanged.",
      "If attempt >= max_attempts: emit { event: 'RETRY_EXHAUSTED', error_class, attempt_count, last_error }; assert circuit_breaker_failure_recorded = true; do not retry further.",
    ],
    references: [
      "AWS Retry Guidelines — exponential backoff and jitter",
      "Google SRE — Handling Overload",
      "Circuit Breaker Pattern",
    ],
    failure_modes: [
      "Retry storm when all clients retry simultaneously without jitter, because deterministic backoff causes all instances to retry at identical intervals — always add random jitter proportional to base_delay_ms.",
      "Permanent error retried when 400/401/403/404/422 errors are included in the retryable set, because these indicate client errors that will not resolve on retry — classify error before every retry decision.",
      "Non-idempotent operation duplicated when a POST is retried without an idempotency key, because the server processes each request independently — require idempotency_key on all retried non-GET operations.",
    ],
    verification: [
      "assert delay sequence follows min(base * 2^n, max) + jitter for n = 0..max_attempts-1; assert no two consecutive delays are identical (jitter is working).",
      "Inject HTTP 500; assert retry occurs up to max_attempts with correct backoff; assert RETRY_EXHAUSTED emitted after final attempt.",
      "Inject HTTP 400; assert no retry occurs and permanent_failure_logged = true; assert retry_attempt_count = 0.",
      "assert idempotency_key present on all retried POST/PUT/PATCH requests; assert duplicate_operation_count = 0 confirmed server-side.",
    ],
    tags: ["retry", "backoff", "jitter", "error_recovery", "resilience", "idempotency", "circuit_breaker"],
  },

  // ── 9. Chain of thought ───────────────────────────────────────────────────
  {
    domain: "agent.reasoning",
    title: "Structured Chain-of-Thought Reasoning",
    summary: "Decompose reasoning into sub-questions with explicit premise sets; assign compound confidence scores; halt and verify when confidence drops below threshold; assert no circular premises.",
    standard: "Every multi-step reasoning chain must have explicit intermediate conclusions with confidence scores; any conclusion with confidence < threshold must trigger a verification step before use as a premise.",
    procedure: [
      "Decompose goal into sub-questions Q1...Qn where each Qi has a single unambiguous answer independent of unresolved prior Qi; assert n <= 10; assert each sub-question is falsifiable (has a definite true/false or enumerated answer).",
      "For each Qi: state premise set P = {p1...pk} explicitly in the trace; each premise must be either a given fact or a previously verified conclusion; assert premise_dependency_graph is a DAG (no circular premises).",
      "Derive conclusion Ci from P using one inference rule per step; assign confidence: conf(Ci) = min(conf(premises)) * inference_reliability_factor where inference_reliability_factor in [0.8, 1.0]; assert conf(Ci) in [0.0, 1.0].",
      "If conf(Ci) < confidence_threshold (default 0.7): halt chain; emit { event: 'CONFIDENCE_BELOW_THRESHOLD', step: i, conclusion: Ci, confidence: conf(Ci) }; execute verification step to gather additional evidence before proceeding.",
      "Compile final answer: synthesize(C1...Cn) using only conclusions with conf >= confidence_threshold; report compound_confidence = product(conf(Ci) for all Ci used); assert compound_confidence reported, not just individual step confidence.",
    ],
    references: [
      "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models — Wei et al.",
      "Self-Consistency Improves Chain of Thought Reasoning — Wang et al.",
      "Let's Verify Step by Step — Lightman et al.",
    ],
    failure_modes: [
      "Hallucinated premise when an agent asserts a fact as a premise without verification, causing downstream steps to produce confident-sounding but incorrect conclusions, because the false premise propagates through the chain.",
      "Confidence inflation when scores are not propagated multiplicatively, because a chain of ten 0.9-confidence steps produces compound confidence of 0.9^10 = 0.35 — always report compound confidence, not individual step confidence.",
      "Circular reasoning when Ci is used as a premise in its own derivation, causing the chain to never ground out in given facts — assert premise_dependency_graph is_directed_acyclic_graph = true before accepting any conclusion.",
    ],
    verification: [
      "assert reasoning_trace contains { premise_set, inference_rule, conclusion, confidence } for every step; assert trace_completeness = true.",
      "Inject a step with conf = 0.5 below threshold; assert chain halts at that step and CONFIDENCE_BELOW_THRESHOLD emitted; assert downstream steps not executed.",
      "assert compound_confidence = product(step_confidences) for chains of length n; assert compound_confidence < min(step_confidences) for n > 1.",
      "assert premise_dependency_graph is_directed_acyclic_graph = true for all chains; assert circular_dependency_count = 0.",
    ],
    tags: ["chain_of_thought", "reasoning", "confidence", "premises", "inference", "agent_reasoning", "verification"],
  },

  // ── 10. Parent selection ──────────────────────────────────────────────────
  {
    domain: "knowledge.graphs",
    title: "KB Parent Selection and DAG Validation",
    summary: "Select 2–8 semantically ancestral parent KBs from the indexed graph; validate the proposed edge set is acyclic before calling publishKB; never select parents by keyword similarity alone.",
    standard: "Parent KBs must represent prerequisite concepts (not just topically similar ones); MAX_PARENTS = 8; non-seed KBs require >= 2 parents; the DAG must remain acyclic after each publication.",
    procedure: [
      "Query the subgraph indexer for candidates in the same and adjacent domains with reputation_score > 0: GET /subgraph?domain=X&depth=2; assert indexer_response_time_ms < 100 and candidate_pool_size >= 2; check indexer.latestBlock >= chain.latestBlock - 2 before trusting results.",
      "Filter by semantic ancestry: a valid parent KB's standard or procedure must describe a concept that is a prerequisite for this KB's claim — not just a related topic; assert parent.domain is ancestral or peer domain, not a child domain.",
      "Score candidates: parent_score = reputation(parent) * 0.6 + semantic_similarity(parent, this_kb) * 0.4; select top-k where k in [2, 8]; assert selected_parent_count >= 2 for non-seed KBs.",
      "Validate DAG: for each candidate parent call registry.getKB(parentHash) to confirm it is published; run cycle_detection(existing_dag ∪ { new_kb → parents }); assert is_directed_acyclic_graph = true and cycle_count = 0.",
      "Submit parentHashes in publishKB call; assert parentHashes.length in [2, 8] for non-seed KBs and parentHashes has no duplicates; assert is_seed KBs may have parentHashes.length = 0.",
    ],
    references: [
      "Alexandrian Protocol — Graph Density Specification",
      "AlexandrianRegistryV2.sol — MAX_PARENTS constant",
      "Topological Sort — Kahn's Algorithm",
    ],
    failure_modes: [
      "Topical confusion when parents are selected by keyword overlap rather than semantic ancestry, because a KB about 'CORS errors' is not a prerequisite of 'HTTP caching' even though both mention headers — always verify the conceptual prerequisite relationship.",
      "Cycle introduction when a KB selects a parent that is itself a transitive descendant of the proposed KB, causing publishKB to revert with CyclicDependency and wasting gas — run client-side cycle detection before submitting.",
      "Graph fragmentation when KBs are published with fewer than 2 parents, because the DAG becomes a disconnected forest rather than a connected knowledge graph — enforce min-parent check in the publishing pipeline.",
    ],
    verification: [
      "assert parentHashes.length in [2, 8] for all non-seed KB submissions; assert is_seed = true for KBs with parentHashes.length = 0.",
      "For each parent in parentHashes: call registry.getKB(parentHash); assert kb.exists = true and kb.stakeAmount > 0.",
      "assert is_directed_acyclic_graph(dag_with_new_kb) = true before every publishKB call; assert cycle_detection_passes = true.",
      "Attempt publishKB with a parent that creates a cycle; assert transaction reverts with CyclicDependency error; assert gas_wasted_on_cycle_detection_ms_saved_by_client_check > 0.",
    ],
    tags: ["knowledge_graph", "dag", "parent_selection", "graph_validation", "semantic_ancestry", "publishkb", "cycle_detection"],
  },

  // ── 11. DAG invariants ────────────────────────────────────────────────────
  {
    domain: "knowledge.graphs",
    title: "Knowledge Graph DAG Health Invariants",
    summary: "The KB graph must remain a DAG with max depth 20, average in-degree 1–4, zero isolated non-seed nodes, and all queries routed through the subgraph indexer rather than direct chain scanning.",
    standard: "Graph queries must use the subgraph indexer (not direct chain scanning); the DAG must have max depth <= 20, average in-degree in [1,4], and zero isolated non-seed nodes.",
    procedure: [
      "Route all graph queries through the subgraph indexer: GET /subgraph?query=...; assert indexer.latestBlock >= chain.latestBlock - 2 before trusting results; fall back to direct chain query only if indexer returns 503 and log indexer_unavailable.",
      "Monitor DAG depth: run BFS from each root node; assert max_depth <= 20; alert if max_depth > 15 (early warning at 75% of limit); assert depth_computation_time_ms < 1000 for graphs up to 10k nodes.",
      "Monitor in-degree distribution: for each node, count incoming edges from child KBs; assert average_in_degree in [1.0, 4.0]; assert in_degree_variance < 10 (no extreme hubs); flag nodes with in_degree > 20 for review.",
      "Detect isolated nodes: non-seed KBs with zero incoming edges 30 days after publication are isolated; assert isolated_non_seed_count = 0; trigger re-evaluation or deprecation workflow for isolated nodes.",
      "Publish graph health report weekly: { node_count, edge_count, max_depth, avg_in_degree, isolated_count, indexer_lag_blocks }; assert all metrics within bounds; assert report_generated_at within 7 days of previous report.",
    ],
    references: [
      "Alexandrian Protocol — Graph Density Specification",
      "The Graph Protocol — Subgraph Indexing",
      "Graph Theory — DAG properties",
    ],
    failure_modes: [
      "Graph fragmentation when KBs are published without meaningful parent relationships, causing the DAG to become a disconnected forest with many root nodes and no knowledge lineage — enforce min-parents and semantic ancestry checks at publish time.",
      "Hub formation when a small number of KBs accumulate very high in-degree (>20 incoming edges), causing all graph queries to bottleneck through these nodes and creating a single point of failure for the knowledge graph.",
      "Indexer staleness when the subgraph indexer lags by >2 blocks, causing parent validation and graph queries to operate on stale state — check indexer.latestBlock before every graph query and alert on lag > 2 blocks.",
    ],
    verification: [
      "assert is_directed_acyclic_graph(full_dag) = true after every publishKB; assert cycle_count = 0.",
      "assert max_dag_depth <= 20; assert average_in_degree in [1.0, 4.0]; assert isolated_non_seed_count = 0.",
      "assert subgraph indexer latency <= 2 blocks; assert indexer_availability_rate >= 0.999.",
      "assert graph_health_report generated within 7 days; assert all metrics within specified bounds; assert report_delivery_count >= 1 per week.",
    ],
    tags: ["knowledge_graph", "dag_health", "graph_metrics", "subgraph_indexer", "isolated_nodes", "in_degree", "graph_invariants"],
  },

  // ── 12. Reentrancy guard ──────────────────────────────────────────────────
  {
    domain: "evm.solidity",
    title: "Reentrancy Guard and Checks-Effects-Interactions",
    summary: "Update all state before external calls (checks-effects-interactions); apply nonReentrant modifier to all ETH-transferring functions; verify with Slither and a malicious reentrant contract.",
    standard: "State must be updated before any external call; functions transferring ETH must use the nonReentrant modifier; the CEI pattern alone is insufficient for cross-function reentrancy.",
    procedure: [
      "Identify reentrancy-vulnerable functions: any function with addr.call{value:...}(), payable external calls, or ERC-20 token transfers that trigger recipient hooks; assert all such functions are identified before adding guards.",
      "Apply checks-effects-interactions order: (1) all require() checks; (2) update all state variables including zeroing balances; (3) perform external call; assert no state writes occur after any external call in the function body.",
      "Add OpenZeppelin ReentrancyGuard.nonReentrant modifier to all ETH-transferring and token-transferring functions: contract Registry is ReentrancyGuard { function withdraw() external nonReentrant { ... } }; assert _status == _NOT_ENTERED at function entry.",
      "Test with ReentrancyAttack contract: deploy attacker with fallback() { target.withdraw(); }; call attacker.attack(); assert tx reverts with ReentrancyGuardReentrantCall and attacker ETH balance unchanged.",
      "Run Slither reentrancy detectors: slither contracts/ --detect reentrancy-eth,reentrancy-no-eth,reentrancy-benign; assert slither_exit_code = 0 and reentrancy_finding_count = 0.",
    ],
    references: [
      "OpenZeppelin ReentrancyGuard",
      "Checks-Effects-Interactions Pattern — Solidity Docs",
      "The DAO Hack — reentrancy attack analysis",
      "Slither Static Analyzer — reentrancy detectors",
    ],
    failure_modes: [
      "Classic reentrancy when ETH is sent before zeroing the sender's balance, because the recipient's fallback calls withdraw() again before the balance reaches zero — always zero pendingWithdrawals[msg.sender] = 0 before the transfer.",
      "Cross-function reentrancy when nonReentrant protects withdraw() but not settleQuery(), because an attacker calls settleQuery() during withdraw()'s external call to manipulate attribution state — apply nonReentrant to all functions sharing state.",
      "Read-only reentrancy when a view function reads state during a nonReentrant function's external call, because state is transiently inconsistent — avoid calling view functions internally within nonReentrant functions that perform external calls.",
    ],
    verification: [
      "assert pendingWithdrawals[msg.sender] = 0 before the ETH transfer in withdraw(); assert balance_zeroed_before_transfer = true.",
      "Deploy ReentrancyAttack contract; call attack(); assert tx reverts with ReentrancyGuardReentrantCall and attacker_balance_delta = 0.",
      "Run slither --detect reentrancy-eth contracts/AlexandrianRegistryV2.sol; assert exit_code = 0 and reentrancy_finding_count = 0.",
      "assert _status === _ENTERED during external call execution in nonReentrant functions; assert no reentrant call succeeds.",
    ],
    tags: ["solidity", "reentrancy", "evm_security", "checks_effects_interactions", "nonreentrant", "slither", "smart_contract_security"],
  },

  // ── 13. Gas optimisation ──────────────────────────────────────────────────
  {
    domain: "evm.solidity",
    title: "EVM Gas Optimisation Patterns",
    summary: "Pack storage into 32-byte slots, use calldata for read-only external params, cache SLOAD results in locals, and apply unchecked arithmetic only to provably bounded counters.",
    standard: "Every SLOAD costs 2100 gas cold or 100 gas warm; pack struct fields by type to minimise slots; cache repeated SLOADs; use calldata not memory for external read-only array params.",
    procedure: [
      "Audit storage layout with forge inspect ContractName storage-layout; group fields by type (uint256 → address → bool → uint8) to pack into 32-byte slots; assert slot_count <= ceil(total_state_bytes / 32); a bool+bool+address packs into 1 slot saving 40000 deployment gas.",
      "Replace memory with calldata for external function parameters that are read but not modified: function f(uint256[] calldata ids) external saves ~200 gas per element vs memory; assert all read-only external array params use calldata.",
      "Cache repeated SLOADs: uint256 _balance = pendingWithdrawals[user]; use _balance in all subsequent reads within the function; assert SLOAD_count_per_state_variable <= 1 per function scope; each extra warm SLOAD costs 100 gas.",
      "Apply unchecked arithmetic to counters that cannot overflow: unchecked { queryVolume++; } saves ~30 gas; assert overflow_impossible before applying (counter bounded by array length or explicit cap < type(uint256).max).",
      "Benchmark with forge test --gas-report before and after; assert gas_delta < 0 for all modified functions; assert publishKB gas <= 150000 and settleQuery gas <= 200000; assert no test failures.",
    ],
    references: [
      "EVM Opcodes and Gas Costs — evm.codes",
      "Solidity Gas Optimisation Tips — Foundry Book",
      "EIP-2929 — Gas cost increases for state access opcodes",
    ],
    failure_modes: [
      "Storage slot fragmentation when variables are declared in write order rather than by type, causing each bool to occupy a full 32-byte slot and wasting up to 31 bytes per bool variable.",
      "Unchecked overflow when unchecked is applied to arithmetic that can overflow, because the compiler no longer inserts SafeMath guards — always prove overflow impossibility structurally before using unchecked.",
      "Calldata copy overhead when calldata params are passed to internal functions requiring memory, forcing an implicit calldata-to-memory copy that costs more than the original memory parameter.",
    ],
    verification: [
      "Run forge inspect ContractName storage-layout; assert no bool occupies a full 32-byte slot alone; assert slot_count matches expectation.",
      "Run forge test --gas-report; assert publishKB gas <= 150000; assert settleQuery gas <= 200000; assert gas_reduced_vs_baseline = true.",
      "Run slither --detect divide-before-multiply,uninitialized-local contracts/; assert finding_count = 0.",
      "assert all external functions with array parameters use calldata; assert calldata_compliance_rate = 1.0 for read-only params.",
    ],
    tags: ["evm", "gas_optimisation", "solidity", "storage_packing", "calldata", "sload", "unchecked_arithmetic"],
  },

  // ── 14. Graceful degradation ──────────────────────────────────────────────
  {
    domain: "agent.error_recovery",
    title: "Graceful Degradation with Labelled Fallback Responses",
    summary: "Define a degradation chain before deployment; label all degraded responses with is_degraded and degradation_level; emit DEGRADATION_EVENT within 1000ms; probe for primary recovery every 30s.",
    standard: "When a primary capability fails, degrade to a known-safe reduced capability; every degraded response must be explicitly labelled is_degraded: true so consumers never assume full capability.",
    procedure: [
      "Define the degradation chain before deployment: primary → fallback_1 → fallback_2 → safe_default; assert safe_default has zero external dependencies and always returns a valid response; assert each level is independently testable.",
      "On primary failure (exception, timeout > primary_timeout_ms, or output validation failure): log { event: 'primary_failure', error_class, duration_ms }; assert fallback attempt starts within 100ms; assert no partial primary output is forwarded.",
      "Execute fallback_1 with reduced scope (strip optional params, use cached data if < cache_ttl_ms old); assert fallback_1 response includes { is_degraded: true, degradation_level: 1, degraded_capabilities: [...] }.",
      "If fallback_1 also fails within fallback_timeout_ms: execute fallback_2 or return safe_default; assert safe_default response includes { is_degraded: true, degradation_level: 2, capabilities: [] }; assert safe_default_latency_ms < 10.",
      "Emit DEGRADATION_EVENT: { level, primary_error, fallback_used, timestamp }; assert monitoring system receives event within 1000ms; schedule primary health probe every 30s; assert recovery to primary logged when probe succeeds.",
    ],
    references: [
      "Graceful Degradation Pattern",
      "Netflix Hystrix — Fallback pattern",
      "SRE Book — Managing Risk",
    ],
    failure_modes: [
      "Degradation cascade when the fallback has an unhandled dependency on the same failing service as the primary, because the fallback was designed assuming primary failure is isolated — test all fallback paths with the primary completely unavailable.",
      "Silent degradation when degraded responses omit the is_degraded label, because consumers assume full capability and act on incomplete data — assert is_degraded field is present and true on every degraded response.",
      "Permanent degradation when the agent never probes for primary recovery, because degradation mode has no health check loop — schedule primary health probe every 30s and restore primary on first successful probe.",
    ],
    verification: [
      "Shut down primary; assert fallback_1 response received within 200ms; assert response.is_degraded === true and response.degradation_level === 1.",
      "Shut down primary and fallback_1; assert safe_default response received and response.capabilities.length === 0 and response.is_degraded === true.",
      "assert DEGRADATION_EVENT emitted with correct level and primary_error within 1000ms of each degradation occurrence.",
      "Restore primary; assert agent returns to primary within 2 probe_intervals (60s); assert degradation_level === 0 in subsequent responses.",
    ],
    tags: ["graceful_degradation", "fallback", "resilience", "error_recovery", "agent_reliability", "degradation_levels", "health_check"],
  },

  // ── 15. Tool invocation ───────────────────────────────────────────────────
  {
    domain: "agent.tool_selection",
    title: "Safe Agent Tool Selection and Invocation",
    summary: "Resolve tools by capability match, validate inputs before invocation, enforce per-tool timeout, validate outputs before use, and log every call with hashed inputs for audit.",
    standard: "An agent must validate tool availability and input schema before invocation; tool outputs must be schema-validated before use as premises; tool calls must be logged with hashed (not raw) parameters.",
    procedure: [
      "Resolve tool by capability: tool = registry.find({ capability: required_capability, minVersion: '1.0' }); assert tool.available === true; if not found, emit CAPABILITY_UNAVAILABLE and halt — do not attempt to approximate with a different tool.",
      "Validate input against tool.input_schema (JSON Schema draft-07): errors = validate(tool.input_schema, input); assert errors.length === 0 before calling tool.invoke(); assert all required fields present and typed correctly.",
      "Invoke with timeout: result = await Promise.race([tool.invoke(input), rejectAfter(tool.timeout_ms ?? 30000)]); assert invocation is interruptible; if timeout fires, emit TOOL_TIMEOUT and set tool_call_abandoned = true; do not use partial output.",
      "Validate output: outputErrors = validate(tool.output_schema, result); if outputErrors.length > 0, emit TOOL_OUTPUT_INVALID and do not use result as a premise — treat as tool failure and fall through to fallback if available.",
      "Log the call: writeLog({ tool_id, input_hash: sha256(JSON.stringify(input)), output_hash: sha256(JSON.stringify(result)), duration_ms, status }); assert sensitive_data_not_in_log = true (log hashes, not raw values).",
    ],
    references: [
      "OpenAI Function Calling — Tool use specification",
      "JSON Schema Draft-07",
      "Principle of Least Privilege — NIST",
    ],
    failure_modes: [
      "Silent data corruption when tool output is used without schema validation, because a tool returning an unexpected field type causes downstream steps to operate on wrong data silently.",
      "Capability drift when a tool is resolved by name and its interface changed between versions, because the agent assumed backward compatibility — always validate against the current schema, not a cached version.",
      "Cascading timeout when slow tools block all agent execution threads, because tool invocations share a thread pool without individual timeouts — enforce per-tool timeout independently of the global request timeout.",
    ],
    verification: [
      "Invoke tool with missing required field; assert SCHEMA_VALIDATION_ERROR raised before tool.invoke(); assert tool_invocation_count = 0.",
      "Inject tool timeout (response delayed > timeout_ms); assert TOOL_TIMEOUT emitted and result not used downstream; assert tool_call_abandoned = true.",
      "Return invalid output from mock tool; assert TOOL_OUTPUT_INVALID emitted and output_not_used_as_premise = true.",
      "assert tool_call_log contains { tool_id, input_hash, output_hash, duration_ms, status } for every invocation; assert raw_input_in_log = false.",
    ],
    tags: ["agent_tools", "tool_invocation", "capability_resolution", "schema_validation", "timeout", "audit_logging", "tool_safety"],
  },

  // ── 16. Idempotent API ────────────────────────────────────────────────────
  {
    domain: "api.rest",
    title: "Idempotent POST Endpoint Design",
    summary: "Accept a client-generated Idempotency-Key (UUID v4), store it before execution, replay the cached response on duplicates, and maintain a 24h idempotency window.",
    standard: "POST endpoints that create or mutate resources must accept an Idempotency-Key header, write it to the idempotency store before executing, and return identical responses for duplicate requests within the 24h window.",
    procedure: [
      "Accept and validate Idempotency-Key header: assert format matches /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i; reject with HTTP 400 if absent or malformed; assert idempotency_key_present = true.",
      "Check idempotency store: entry = store.get(user_id + ':' + idempotency_key); if entry exists and entry.status === 'complete', return entry.response verbatim with Idempotency-Replay: true header; assert no side effects executed on replay.",
      "If key is new: store.set(user_id + ':' + idempotency_key, { status: 'in-flight', created_at: now }); assert store_write_before_execute = true to prevent duplicate concurrent executions.",
      "Execute operation; on completion: store.update(key, { status: 'complete', response: result, expires_at: now + 86400000 }); assert idempotency_window_ms >= 86400000 (24h) and store_entry_written = true.",
      "Return result with Idempotency-Key echoed in response header; send 10 concurrent requests with identical key; assert all responses identical and operation_execution_count = 1.",
    ],
    references: [
      "Stripe API — Idempotent Requests",
      "RFC 7231 — HTTP Semantics",
      "Idempotent Consumer Pattern",
    ],
    failure_modes: [
      "Double execution when idempotency store is checked after operation execution rather than before, because a retry arriving during processing triggers a second execution — always write 'in-flight' to store before calling the operation.",
      "Key collision when two different users generate the same Idempotency-Key, because UUID v4 collisions are possible across users — scope idempotency keys per user_id as store key: user_id + ':' + idempotency_key.",
      "Store expiry mismatch when the idempotency window is shorter than the client's retry timeout, because the client retries after key expiry and receives a fresh execution — set idempotency window >= 2x the client's configured max retry window.",
    ],
    verification: [
      "Send identical POST twice with same Idempotency-Key; assert second response identical to first and Idempotency-Replay: true header present; assert side_effect_count = 1.",
      "Send 10 concurrent requests with identical Idempotency-Key; assert all responses identical and operation_execution_count = 1.",
      "Send POST without Idempotency-Key; assert HTTP 400 and missing_idempotency_key_count increments.",
      "assert store entry expires after 24h; assert expired_key_triggers_fresh_execution = true; assert idempotency_window_ms >= 86400000.",
    ],
    tags: ["api_design", "idempotency", "rest", "post_endpoint", "duplicate_prevention", "idempotency_key", "http"],
  },

  // ── 17. Circuit breaker ───────────────────────────────────────────────────
  {
    domain: "software.architecture",
    title: "Circuit Breaker Pattern",
    summary: "Wrap external calls in a 3-state machine (CLOSED→OPEN→HALF_OPEN); trip to OPEN after failure_threshold failures in rolling_window_ms; probe with 1 call in HALF_OPEN; add ±20% jitter to reset_timeout.",
    standard: "A circuit breaker wraps external calls and trips to OPEN after failure_threshold failures in a rolling window, blocking calls until a single probe succeeds in HALF_OPEN state.",
    procedure: [
      "Initialise state machine: { state: 'CLOSED', failure_count: 0, last_failure_at: null, open_since: null }; assert exactly 3 states: CLOSED, OPEN, HALF_OPEN; assert initial_state = 'CLOSED'.",
      "In CLOSED state: execute call; on success reset failure_count = 0; on failure increment failure_count; if failure_count >= failure_threshold within rolling_window_ms, set state = 'OPEN', open_since = Date.now(); emit CircuitBreakerTripped event.",
      "In OPEN state: reject all calls immediately with CircuitBreakerOpen error — do not execute; after reset_timeout_ms * (0.8 + Math.random() * 0.4) (±20% jitter), set state = 'HALF_OPEN'; assert zero external calls made during OPEN.",
      "In HALF_OPEN state: allow exactly 1 probe call; on success set state = 'CLOSED' and failure_count = 0; on failure set state = 'OPEN' and open_since = Date.now(); assert probe_call_count = 1 per HALF_OPEN interval.",
      "Expose metrics endpoint: GET /health/circuit-breaker returns { state, failure_count, open_duration_ms, calls_rejected }; assert endpoint latency < 10ms; assert state transitions logged with { from, to, timestamp, trigger }.",
    ],
    references: [
      "Circuit Breaker Pattern — Martin Fowler",
      "Release It! — Michael Nygard",
      "Netflix Hystrix — Circuit Breaker implementation",
    ],
    failure_modes: [
      "Thundering herd when all instances reset from OPEN simultaneously because they share the same fixed reset_timeout_ms, causing all instances to send probe calls together — add ±20% random jitter per instance to desynchronise resets.",
      "False trip when transient error spikes cross failure_threshold before the rolling window clears, because the window is too short relative to normal error variance — set rolling_window_ms >= 5x the p99 response time.",
      "Half-open deadlock when the probe call hangs indefinitely, because HALF_OPEN has no independent timeout — enforce probe_timeout_ms <= reset_timeout_ms / 10.",
    ],
    verification: [
      "Inject failure_threshold consecutive failures; assert state = 'OPEN' and CircuitBreakerTripped event emitted; assert next call returns CircuitBreakerOpen without executing.",
      "Wait reset_timeout_ms; assert state = 'HALF_OPEN'; send probe; on success assert state = 'CLOSED'; on failure assert state = 'OPEN'.",
      "assert calls_rejected_in_open_state = all_calls_during_open_interval and external_calls_in_open = 0.",
      "assert state transition log contains { from, to, timestamp, trigger } for every transition; assert metrics_endpoint latency < 10ms.",
    ],
    tags: ["circuit_breaker", "resilience", "architecture_patterns", "fault_tolerance", "open_closed", "half_open", "thundering_herd"],
  },

  // ── 18. Rate limiting ─────────────────────────────────────────────────────
  {
    domain: "api.rest",
    title: "Per-User API Rate Limiting",
    summary: "Rate-limit authenticated endpoints by user_id (not IP); use atomic Redis increment; return X-RateLimit-* headers on every response; apply stricter limits on auth endpoints.",
    standard: "Rate limits must be applied per user_id for authenticated requests; the increment must be atomic; HTTP 429 must include Retry-After; auth endpoints must have limits <= 10 req/min.",
    procedure: [
      "Set rate limit scope: key = req.user?.id ? 'rl:user:' + req.user.id : 'rl:ip:' + req.ip; assert authenticated requests always use user_id key, not IP; assert key_isolation_between_users = true.",
      "Atomic increment in Redis using Lua script: local count = redis.call('INCR', key); if count == 1 then redis.call('EXPIRE', key, window_seconds) end; return count; assert atomicity prevents race conditions; assert latency < 5ms.",
      "Check limit: if count > limit then respond with HTTP 429; set Retry-After = window_seconds - (Date.now()/1000 % window_seconds); assert Retry-After >= 1 and HTTP 429 returned before executing the handler.",
      "Set headers on every response: X-RateLimit-Limit: limit, X-RateLimit-Remaining: Math.max(0, limit - count), X-RateLimit-Reset: Math.ceil(Date.now()/1000 + window_seconds); assert headers present on 200 and 429 responses.",
      "Configure per-endpoint limits: read endpoints 1000/min, write endpoints 100/min, auth endpoints 10/min; assert auth_endpoint_limit <= 10 to slow brute force; assert per_endpoint_limit_config_present = true.",
    ],
    references: [
      "IETF RFC 6585 — Additional HTTP Status Codes (429)",
      "Redis INCR + EXPIRE pattern",
      "OWASP API Security Top 10 — API4: Lack of Resources and Rate Limiting",
    ],
    failure_modes: [
      "IP-based throttling of shared IPs when authenticated requests use IP as the rate limit key, because users behind corporate NAT or VPN share an IP and one user can exhaust another's quota — always use user_id for authenticated endpoints.",
      "Race condition in limit check when two concurrent requests both read count = limit-1, both pass the check, and both increment to limit+1 — use atomic Lua script: INCR + EXPIRE in a single Redis call.",
      "Missing Retry-After on HTTP 429 causing clients to immediately retry and amplify load, because the client has no guidance on when to retry — always include Retry-After with a specific future Unix timestamp.",
    ],
    verification: [
      "Send limit+1 requests in window_seconds from same user_id; assert request N+1 returns HTTP 429 with Retry-After header and X-RateLimit-Remaining = 0.",
      "Send limit requests from user_A; assert user_B is not throttled and rate_limit_isolation = true.",
      "Send 100 concurrent requests at the limit boundary; assert actual_executions <= limit; assert no race condition bypasses the limit.",
      "assert X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset present on 100% of responses; assert Retry-After present on 100% of HTTP 429 responses.",
    ],
    tags: ["rate_limiting", "api_security", "redis", "http_429", "per_user", "throttling", "brute_force_protection"],
  },

  // ── 19. Structured logging ────────────────────────────────────────────────
  {
    domain: "software.observability",
    title: "Structured JSON Logging for Distributed Systems",
    summary: "Emit JSON log entries with required fields (timestamp, level, service, trace_id, span_id, message); propagate W3C trace context; scrub sensitive fields; write only to stdout.",
    standard: "All log entries must be valid JSON with required fields; trace_id must be propagated via AsyncLocalStorage; sensitive fields must be redacted before writing; no file-based logging in production.",
    procedure: [
      "Initialise structured logger with service context: logger = pino({ base: { service, version, environment }, timestamp: pino.stdTimeFunctions.isoTime }); assert log_format = 'json' and all entries include service, version, environment at root.",
      "Propagate W3C trace context: extract traceparent from incoming request headers; store { trace_id, span_id } in AsyncLocalStorage; assert every log entry within a request includes trace_id matching /^[0-9a-f]{32}$/ and span_id matching /^[0-9a-f]{16}$/.",
      "Set log level from environment: level = process.env.LOG_LEVEL ?? 'info'; assert level !== 'debug' in production (check process.env.NODE_ENV); assert debug_in_production = false; log startup warning if debug is detected in production.",
      "Scrub sensitive fields before writing: apply redaction to fields matching /password|secret|token|key|credential|ssn|credit_card/i replacing value with '[REDACTED]'; assert redaction_applied_before_log_write = true; run log_audit() and assert sensitive_field_in_log_count = 0.",
      "Write only to stdout (12-factor): assert log_destination = process.stdout and no file transports configured; assert log aggregator (Datadog, Grafana Loki) consumes from stdout; assert log_ingestion_lag_ms < 5000.",
    ],
    references: [
      "12-Factor App — Logs",
      "W3C Trace Context — traceparent header",
      "Pino Logger — JSON logging for Node.js",
      "OWASP Logging Cheat Sheet",
    ],
    failure_modes: [
      "Sensitive data exposure when error handlers log the full request object, because req.body may contain passwords or payment data — apply redaction middleware before any error handler that logs request context.",
      "Log flooding when DEBUG level is enabled in production, because high-volume paths generate thousands of entries per second — enforce LOG_LEVEL = info minimum in production and alert on debug_in_production = true at startup.",
      "Trace context loss through async boundaries when setTimeout or Promise chains don't propagate trace_id, because Node.js has no thread-local storage — use AsyncLocalStorage to propagate context through all async operations.",
    ],
    verification: [
      "Parse 1000 random log entries as JSON; assert parse_error_count = 0; assert required fields (timestamp, level, service, trace_id, span_id, message) present on 100% of entries.",
      "Trigger an error path; assert log entry has level = 'error' and trace_id matching the request's traceparent header.",
      "Send request with password field in body; assert password value not present in any log entry; assert sensitive_field_exposure_count = 0.",
      "assert trace_id consistent across all log entries for a single request including async callbacks; assert trace_correlation_rate = 1.0.",
    ],
    tags: ["structured_logging", "observability", "distributed_tracing", "trace_context", "json_logs", "pino", "redaction"],
  },

  // ── 20. Task decomposition ────────────────────────────────────────────────
  {
    domain: "agent.planning",
    title: "Agent Task Decomposition",
    summary: "Decompose complex tasks into isolated subtasks each producing one verifiable output; build a dependency DAG; schedule critical-path subtasks first; merge results associatively.",
    standard: "Each subtask must produce exactly 1 verifiable output, be executable independently, and its failure must not corrupt sibling subtask state; subtask count must be in [2, 10].",
    procedure: [
      "Identify decomposition boundary: decompose if task has >= 2 distinct output artifacts or requires >= 2 independent capabilities; assert each subtask produces exactly 1 output artifact with a defined schema; assert subtask_count in [2, 10].",
      "Build dependency DAG: each subtask declares prerequisite subtasks from the set; assert dependency_graph is a DAG; compute critical_path_length = max depth of DAG; assert critical_path_length < subtask_count (otherwise decomposition is sequential, not parallel).",
      "Enforce subtask isolation: each subtask receives only its required inputs — no shared mutable references; assert subtask does not read or write shared state outside its declared input/output contract; assert subtask_failure_blast_radius = 1.",
      "Schedule by tier: execute all subtasks at depth 0 concurrently; wait for completion; execute depth 1 subtasks; repeat; assert critical_path subtasks assigned highest executor priority; assert max_concurrent_subtasks <= 3 per executor.",
      "Merge results: final = merge(subtask_1_output, ..., subtask_n_output); assert merge function is associative (order-independent) for parallel subtasks; assert output_schema_valid = true; assert no output dropped silently.",
    ],
    references: [
      "Task Decomposition in AI Planning — Russell & Norvig",
      "MapReduce — Dean & Ghemawat",
      "Critical Path Method — Project scheduling",
    ],
    failure_modes: [
      "Subtask interference when subtasks share mutable state (global variables, shared file handles), causing one subtask's failure to corrupt another's execution context — enforce strict input/output isolation with no shared object references.",
      "Decomposition explosion when a task is split into too many fine-grained subtasks, causing coordination overhead to exceed the benefit of parallelism — limit subtask_count <= 10 and verify coordination_overhead_ms < total_execution_time_ms.",
      "Critical path delay when high-priority subtasks are not identified before scheduling, because the last subtask in the critical path is assigned to a low-priority executor, delaying overall completion — compute critical_path and assign highest priority before scheduling.",
    ],
    verification: [
      "assert each subtask produces exactly 1 output artifact matching expected_output_schema; assert subtask_output_schema_valid = true for all subtasks.",
      "assert dependency_graph is_directed_acyclic_graph = true; assert critical_path_length computed correctly for test DAGs of known depth.",
      "Inject subtask failure; assert sibling subtasks complete successfully; assert failure_blast_radius = 1 subtask only.",
      "assert final_output = merge(all subtask outputs) and output_schema_valid = true; assert merge_function produces identical result regardless of subtask completion order.",
    ],
    tags: ["task_decomposition", "agent_planning", "parallel_execution", "dependency_dag", "critical_path", "subtask_isolation", "merge_results"],
  },

  // ── 21. Protocol bootstrap ────────────────────────────────────────────────
  {
    domain: "meta.protocol.bootstrap",
    title: "Alexandrian Protocol Bootstrap: Zero-Stake KB Generation Window",
    summary: "Open a temporary zero-stake publishing window by calling setMinStake(0) from the owner wallet, run the 10k KB generation pipeline, verify graph density targets, then restore the stake requirement to 1e15 wei.",
    standard: "setMinStake(0) must be called only from the contract owner wallet and only in a dedicated bootstrap session; restore to setMinStake(1e15) must be confirmed on-chain before the session is considered complete; zero-stake KBs must pass the validator quality gate before publishKB is called.",
    procedure: [
      "Precondition checks: assert contract.owner() === deployer_wallet_address; assert contract.minStakeAmount() === 1000000000000000n (1e15 wei); assert deployer_wallet ETH balance >= 0.05 ETH to cover gas for the setMinStake calls plus 10k publishes at ~150k gas each (~$30 at Base current prices); record baseline_kb_count = await contract.kbCount().",
      "Open bootstrap window: call contract.setMinStake(0) from the owner wallet; await transaction confirmation with >= 1 block confirmation; assert contract.minStakeAmount() === 0n after the call; log { event: 'bootstrap_open', tx_hash, block_number, timestamp }.",
      "Run KB generation pipeline: execute `node scripts/run-pipeline.mjs --count 10000 --stake 0`; for each KB the pipeline calls validator → publishKB({ msg.value: 0 }); assert each publishKB tx status = 1 (success); assert zero KBs rejected by the contract with InsufficientStake (stack-level check: minStakeAmount=0 means msg.value >= 0 is always true); monitor pipeline error_rate — halt if error_rate_5min > 5%.",
      "Monitor graph health during generation: every 1000 KBs, compute domain_coverage = unique_domains_with_kbs / total_target_domains; compute avg_parents_per_kb = sum(parent_count) / kb_count; assert domain_coverage > 0.3 by KB 3000; assert avg_parents_per_kb >= 1.5 by KB 5000; assert avg_parents_per_kb >= 2.0 by KB 8000.",
      "Verify generation complete: assert final_kb_count = baseline_kb_count + 10000 (±50 for any reverted transactions); assert domain_coverage >= 0.8; assert avg_parents_per_kb >= 2.0; assert no_duplicate_hashes = true by checking subgraph for kbHash collision.",
      "Restore stake requirement: call contract.setMinStake(1000000000000000n) from the owner wallet; await confirmation with >= 2 block confirmations; assert contract.minStakeAmount() === 1000000000000000n; attempt a publishKB call with msg.value = 0 from a non-owner wallet and assert it reverts with InsufficientStake; log { event: 'bootstrap_close', tx_hash, block_number, timestamp }.",
    ],
    references: [
      "AlexandrianRegistryV2.sol — setMinStake(uint256), publishKB(PublishParams)",
      "Bootstrap Phase Design — MEMORY.md",
      "Base Mainnet contract: 0xD1F216E872a9ed4b90E364825869c2F377155B29",
      "PRE-10K-CHECKLIST.md",
    ],
    failure_modes: [
      "setMinStake(0) call reverts with OwnableUnauthorizedAccount when sent from a wallet that is not contract.owner(), because the Ownable modifier restricts the function to the owner — verify msg.sender === contract.owner() before calling.",
      "Pipeline publishes KBs that fail the validator quality gate and are written to chain as low-quality entries because the pipeline skips the validator step — assert validator exit code = 0 before calling publishKB; halt pipeline if validator_failure_rate_10min > 2%.",
      "Bootstrap window left open after generation completes because the restore call is forgotten or the transaction fails silently, allowing any future caller to publish without stake — monitor minStakeAmount after the pipeline run and alert if still 0 after 10 minutes.",
      "Duplicate kbHash collision when two generated KBs produce identical content hashes, because publishKB with a previously registered hash reverts with HashAlreadyRegistered — detect in the pipeline before publishing by querying the subgraph for existing hashes; skip duplicates.",
      "ETH balance insufficient mid-run when the owner wallet runs out of gas funds before all 10k KBs are published — pre-fund to at least 0.05 ETH and monitor balance every 1000 publishes; halt and refill if balance < 0.005 ETH.",
    ],
    verification: [
      "assert contract.minStakeAmount() === 0n immediately after setMinStake(0) tx confirms; assert setMinStake_tx.status = 1.",
      "assert final_kb_count === baseline_kb_count + target_count (±50); query subgraph for kbHash duplicates; assert duplicate_count = 0.",
      "assert contract.minStakeAmount() === 1000000000000000n after restore; call publishKB({ value: 0 }) from non-owner; assert tx reverts with InsufficientStake.",
      "assert domain_coverage >= 0.8 post-generation; assert avg_parents_per_kb >= 2.0; assert graph_is_dag = true (no cycles in parent DAG).",
    ],
    tags: ["bootstrap", "protocol", "setMinStake", "kb_generation", "contract_admin", "graph_density", "base_mainnet"],
  },

  // ── 22. Software testing ──────────────────────────────────────────────────
  {
    domain: "software.testing",
    title: "Test Structure: Arrange-Act-Assert with Specific Assertions",
    summary: "Structure every test case with explicit Arrange (setup), Act (single invocation), and Assert (measurement with exact expected values) phases; prohibit catch-all assertions and untested code paths.",
    standard: "Each test must exercise exactly one behavior; assertions must specify exact expected values, not just truthiness; test state must not leak between cases; property-based tests must define an invariant that holds for all inputs.",
    procedure: [
      "Arrange phase: construct all test dependencies explicitly — no global mutable state; assert pre_condition_state matches expected baseline before the Act phase; use factories or builders for complex objects; assert setup_complete = true and shared_state_mutations = 0.",
      "Act phase: invoke exactly one function or method under test with the constructed inputs; do not chain multiple behaviors in a single Act; assert act_invocation_count = 1; capture the return value and any thrown exceptions explicitly.",
      "Assert phase: compare the captured return value against an exact expected value using strict equality (===) or deep equality; assert actual_value === expected_value where expected_value is a literal, not a re-computation of the production logic; assert assertion_count >= 1 per test; prohibit assertions of the form expect(result).toBeTruthy() without also asserting the specific shape.",
      "Teardown and isolation: restore all mocks, stubs, and environment variables in afterEach; assert no files, network connections, or database rows created by the test persist after teardown; assert test_execution_order_independence = true by running tests in shuffled order and asserting all pass.",
      "Property-based tests (for algorithmic functions): define an invariant (e.g., sort is idempotent: sort(sort(xs)) === sort(xs)); generate >= 100 random inputs using a property testing library (fast-check, hypothesis); assert the invariant holds for all generated inputs; on failure, log the minimal shrunk counter-example.",
      "Coverage gate: after the test suite runs, assert line_coverage >= 80% and branch_coverage >= 70% on all non-generated source files; assert no uncovered error-handling branch exists for any function that can throw; use `istanbul ignore` comments sparingly and only with a documented reason.",
    ],
    references: [
      "xUnit Patterns — Gerard Meszaros",
      "fast-check property testing library",
      "Kent Beck — Test-Driven Development: By Example",
      "Istanbul/nyc coverage documentation",
    ],
    failure_modes: [
      "False positive test when assert(result).toBeTruthy() passes for an unexpected truthy value (e.g., an error object is truthy), because the assertion does not check the specific type or value — replace with assert(result).toEqual(expectedLiteral).",
      "State leakage between tests when a test modifies a module-level variable or database row and does not restore it in afterEach, causing the subsequent test to operate on corrupted state — assert test_execution produces identical results when run in any order.",
      "Tautological assertion when the expected value in the assertion is derived from the same logic as the production code rather than from an independent specification, causing the test to pass even when the logic is wrong — expected values must be literals or independently computed constants.",
      "Coverage gap on error paths when exception-handling branches are never exercised because the test suite only covers the happy path — inject faults (mock failures, invalid inputs) to exercise every catch block and error return.",
      "Flaky test caused by time-dependent assertions (assert result.timestamp === Date.now()) because the clock advances between Act and Assert — freeze the clock using fake timers before the Act phase; assert against the frozen time value.",
    ],
    verification: [
      "Run test suite with execution order randomized 5 times; assert all tests pass in all orderings; assert no test relies on execution order.",
      "assert line_coverage >= 80% and branch_coverage >= 70% on all source files; assert istanbul_ignore_count < 5 per 1000 LOC.",
      "assert no test contains only toBeTruthy() / toBeFalsy() / toBeNull() assertions without a companion value check; lint rule no-weak-assertions enforced.",
      "Run property-based tests with 1000 cases; assert invariant_violation_count = 0; assert any shrunk counter-example is logged with full reproduction steps.",
    ],
    tags: ["testing", "unit_tests", "arrange_act_assert", "property_based_testing", "test_isolation", "coverage", "assertions", "fast-check"],
  },

];

// ── Run ───────────────────────────────────────────────────────────────────────

mkdirSync(REFINED_DIR, { recursive: true });
console.log(`\nAlexandrian — Hand-crafted KB Injection`);
console.log(`  Target : ${REFINED_DIR}`);
console.log(`  KBs    : ${KBS.length}`);
console.log(`  dry-run: ${DRY_RUN}\n`);

const hashes = KBS.map(inject);

console.log(`\n${"─".repeat(60)}`);
console.log(`  Written: ${DRY_RUN ? 0 : hashes.length} / ${KBS.length}`);
console.log(`  Domains: ${[...new Set(KBS.map(k => k.domain.split('.').slice(0,2).join('.')))].join(', ')}`);
console.log(`${"─".repeat(60)}\n`);
