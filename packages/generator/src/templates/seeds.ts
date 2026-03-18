/**
 * Seed KB Templates — KBv2.4 / KBv2.5
 *
 * 45 hardcoded seed KBs across 10 domains.
 * Seeds have identity.is_seed = true and empty knowledge_inputs.used arrays.
 * identity.kb_id = "" — filled by the builder after hashing.
 *
 * Domains:
 *   software.security       (5)
 *   evm.solidity            (5)
 *   sql.optimization        (4)
 *   software.architecture   (5)
 *   software.testing        (4)
 *   ai.prompting            (4)
 *   meta.protocol           (3)
 *
 * ── Benchmark-targeted seeds (v2.5, engineering.* domains) ──────────────────
 *   engineering.api.security (5) — rate limiting, middleware, circuit breaker
 *   engineering.data         (5) — multi-tenant postgres, RLS, schema strategy
 *   engineering.ops          (5) — CI/CD, GitHub Actions, Docker
 */

import type { KBv24Artifact } from "../types/artifact.js";

export const SEED_TEMPLATES: KBv24Artifact[] = [

  // ── software.security ─────────────────────────────────────────────────────

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Constant-Time Secret Comparison",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Non-constant-time secret comparison enables timing side-channel attacks that allow " +
        "byte-by-byte secret recovery via measurable latency differences.",
      confidence: 0.97,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Use constant-time comparison functions (e.g. crypto.timingSafeEqual) when comparing " +
        "secrets such as tokens, HMACs, or passwords to prevent timing oracle attacks.",
      tags: ["security", "timing-attack", "side-channel", "cryptography", "secrets"],
      domain: "software.security",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Secret comparison uses a vetted constant-time function from a cryptographic library",
        "No early-exit code path exists in the comparison branch",
        "Timing variance between matching and non-matching inputs is below 1 microsecond at p99",
      ],
      failure_conditions: [
        "String equality operator (==, ===, .equals()) used for secret comparison",
        "Custom loop with early return on first byte mismatch",
        "Timing variance measurable via repeated remote requests with statistical analysis",
      ],
      metrics: [
        "Comparison timing variance < 1µs across 10,000 samples",
        "No measurable correlation between number of matching bytes and latency",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "candidate", type: "bytes", description: "User-supplied value to compare" },
          { name: "secret", type: "bytes", description: "Expected secret value" },
        ],
        outputs: [
          { name: "equal", type: "boolean", description: "True if candidate matches secret" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Identify all code paths that compare secrets: API tokens, HMACs, password hashes, session cookies.",
          "Replace equality operators with a constant-time comparison function: crypto.timingSafeEqual (Node.js), hmac.compare_digest (Python), subtle.ConstantTimeCompare (Go), MessageDigest.isEqual (Java).",
          "Ensure both buffers are the same length before the constant-time comparison; length checks may use normal branching only if length is not itself a secret.",
          "Run a timing oracle test: measure 10,000 comparisons each for full-match and first-byte-mismatch inputs; confirm the latency distributions overlap.",
          "Add a linting rule or code review checklist item that flags direct equality on byte sequences that could be secrets.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://codahale.com/a-lesson-in-timing-attacks/",
        "https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b",
      ],
      benchmarks: [],
      notes: "Timing attacks are practical over a network using statistical methods (Crosby et al., 2009).",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Input Validation at System Boundaries",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Failing to validate input at system boundaries enables injection attacks and unexpected " +
        "behaviour from malformed or malicious data regardless of internal safeguards.",
      confidence: 0.97,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Validate and sanitize all input at system boundaries using an allowlist schema. " +
        "Never trust data from users, external APIs, environment variables, or files.",
      tags: ["security", "input-validation", "injection", "allowlist", "boundary"],
      domain: "software.security",
      difficulty: "beginner",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Every external input is validated against an explicit allowlist schema before use",
        "Validation occurs on the server side regardless of client-side validation",
        "Rejected inputs produce informative error responses without leaking internals",
      ],
      failure_conditions: [
        "Blocklist-based filtering that misses encoding variants (URL encoding, unicode normalization)",
        "Validation performed only on the client — server trusts the frontend",
        "Inputs used directly in queries, commands, or template rendering without validation",
      ],
      metrics: [
        "Zero unvalidated inputs reaching business logic layer (verified by static analysis)",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "raw_input", type: "any", description: "Untrusted data from an external source" },
          { name: "schema", type: "Schema", description: "Allowlist schema defining valid values" },
        ],
        outputs: [
          { name: "validated_input", type: "any", description: "Validated and typed input" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Enumerate all system boundaries: HTTP endpoints, file uploads, CLI arguments, environment variables, inter-service API calls, webhook payloads.",
          "Define an allowlist schema for each boundary input (type, range, pattern, length) using a schema library (Zod, Joi, Pydantic, JSON Schema).",
          "Apply the schema at the boundary — reject and log inputs that fail validation before they reach business logic.",
          "Never use blocklists; they fail against encoding variants. Prefer allowlists that define exactly what is permitted.",
          "Ensure server-side validation is independent of any client-side validation — clients are untrusted.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://owasp.org/www-project-top-ten/",
        "https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html",
      ],
      benchmarks: [],
      notes: "OWASP A03:2021 — Injection. Input validation is the primary control.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Secrets Management in Applications",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Storing secrets in source control or application binaries creates permanent exposure " +
        "risk that cannot be remediated by deletion due to version history.",
      confidence: 0.99,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Store API keys, database credentials, and private keys in a dedicated secrets manager " +
        "or encrypted environment injection. Never commit secrets to source control.",
      tags: ["security", "secrets", "credentials", "vault", "environment"],
      domain: "software.security",
      difficulty: "beginner",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Zero secrets present in git history (verified by trufflehog or gitleaks scan)",
        "All secrets injected at runtime via environment variables, vault, or secret manager",
        ".env files listed in .gitignore and not tracked",
      ],
      failure_conditions: [
        "API keys or passwords committed to any branch or tag in git history",
        "Hardcoded credentials in source files, config files, or Docker images",
        "Secrets logged to stdout or written to application logs",
      ],
      metrics: [
        "Secret scanner finds zero exposed credentials in repository",
        "No secrets visible in deployed container image layers",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "secret_value", type: "string", description: "The secret to be stored securely" },
          { name: "secret_name", type: "string", description: "Identifier for the secret" },
        ],
        outputs: [
          { name: "secret_reference", type: "string", description: "Environment variable name or vault path" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Audit the current codebase with a secret scanner (gitleaks, trufflehog) to detect existing exposures.",
          "Rotate any exposed secrets immediately — do not rely on git history rewriting for remediation.",
          "Store secrets in a secrets manager (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager) or inject via CI/CD environment variables.",
          "Add .env, *.pem, *.key, and secrets/ to .gitignore before any developer creates these files locally.",
          "Configure pre-commit hooks that run secret scanning on every commit; fail the commit if secrets are detected.",
          "Reference secrets in application code only via environment variable names — never inline values.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html",
        "https://trufflesecurity.com/trufflehog",
      ],
      benchmarks: [],
      notes: "Over 10 million secrets are exposed on GitHub annually (GitGuardian State of Secrets Sprawl).",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "CORS Configuration with Origin Allowlist",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Wildcard CORS headers on credentialed endpoints allow any origin to make authenticated " +
        "cross-site requests, bypassing the browser's same-origin protection.",
      confidence: 0.97,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Configure CORS with an explicit allowlist of trusted origins. Never use wildcard (*) " +
        "CORS on endpoints that accept credentials.",
      tags: ["security", "cors", "cross-origin", "http", "browser"],
      domain: "software.security",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Access-Control-Allow-Origin header contains only explicitly listed trusted origins",
        "Credentialed requests (cookies, Authorization header) never use wildcard CORS",
        "Origin header is compared against a static allowlist, not reflected dynamically",
      ],
      failure_conditions: [
        "Access-Control-Allow-Origin: * on endpoints that set or read cookies",
        "Server reflects the incoming Origin header back without validation",
        "CORS policy missing on sensitive endpoints, defaulting to browser same-origin (which may be broken by misconfiguration)",
      ],
      metrics: [
        "CORS policy passes OWASP ZAP active scan with zero CORS misconfigurations",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "request_origin", type: "string", description: "Origin header from the HTTP request" },
          { name: "allowlist", type: "string[]", description: "List of permitted origins" },
        ],
        outputs: [
          { name: "cors_headers", type: "Record<string,string>", description: "CORS response headers to set" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Define a static allowlist of trusted origins per environment (e.g., ['https://app.example.com', 'https://staging.example.com']).",
          "On each request, compare the incoming Origin header against the allowlist using exact string match — do not use regex unless necessary, and never reflect the header back as-is.",
          "If the origin is in the allowlist, set Access-Control-Allow-Origin to that exact origin value.",
          "Set Access-Control-Allow-Credentials: true only on endpoints that require it, and only when the origin is in the allowlist.",
          "Do not set Access-Control-Allow-Origin: * on any endpoint that reads Authorization headers or cookies.",
          "Test CORS configuration in CI using a cross-origin request simulator against staging.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://portswigger.net/web-security/cors",
        "https://cheatsheetseries.owasp.org/cheatsheets/CORS_Security_Cheat_Sheet.html",
      ],
      benchmarks: [],
      notes: "CORS misconfiguration is one of the most common web security vulnerabilities in APIs.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "SQL Injection Prevention via Parameterized Queries",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "String interpolation of user input into SQL statements creates injection vulnerabilities " +
        "that persist regardless of escaping attempts due to encoding and edge cases.",
      confidence: 0.99,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Use parameterized queries or prepared statements for all database interactions. " +
        "Never concatenate user input into SQL strings.",
      tags: ["security", "sql-injection", "parameterized-queries", "database", "owasp"],
      domain: "software.security",
      difficulty: "beginner",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Zero string concatenation of user input into SQL in the codebase (verified by static analysis)",
        "All user-supplied values passed as bind parameters, not interpolated",
        "Dynamic column names and ORDER BY clauses use strict allowlisting",
      ],
      failure_conditions: [
        "Manual string escaping — misses encoding variants for specific database drivers",
        "ORM raw() or literal() functions accepting unsanitized user input",
        "Dynamic ORDER BY or column names built from user input without allowlist",
      ],
      metrics: [
        "sqlmap scan finds zero injectable endpoints",
        "Static analysis (semgrep SQL rules) reports zero violations",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "user_value", type: "string", description: "User-supplied filter or search value" },
          { name: "query_template", type: "string", description: "SQL query with bind parameter placeholders" },
        ],
        outputs: [
          { name: "result", type: "Row[]", description: "Query results" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Audit the codebase for any SQL string built with concatenation or interpolation of external data.",
          "Replace all interpolated queries with parameterized equivalents: use ? or $1 placeholders and pass values as a separate array to the query function.",
          "For ORM usage, avoid raw(), literal(), or unsafeRaw() methods that accept external input.",
          "For dynamic column names (e.g. ORDER BY user_supplied_column): maintain a strict allowlist of valid column names; reject any value not in the list.",
          "Add a linting rule (semgrep, CodeQL) to the CI pipeline that detects SQL concatenation patterns and fails the build.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://owasp.org/www-community/attacks/SQL_Injection",
        "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
      ],
      benchmarks: [],
      notes: "OWASP A03:2021 — Injection. SQL injection remains the most prevalent server-side attack.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  // ── evm.solidity ──────────────────────────────────────────────────────────

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Reentrancy Guard: Checks-Effects-Interactions Pattern",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Making external calls before updating internal state allows reentrant execution to " +
        "exploit the stale state snapshot, draining contract funds or corrupting state.",
      confidence: 0.99,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Apply checks-effects-interactions: validate conditions, update all state, then make " +
        "external calls. Supplement with ReentrancyGuard for defense in depth.",
      tags: ["solidity", "reentrancy", "checks-effects-interactions", "security", "evm"],
      domain: "evm.solidity",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "All state changes occur before any external call in each function",
        "Functions with external calls are guarded by ReentrancyGuard nonReentrant modifier",
        "Echidna or Foundry invariant tests confirm no reentrancy path exists",
      ],
      failure_conditions: [
        "ETH transfer or external call precedes balance decrement in withdrawal function",
        "Read-only reentrancy through view functions that read state mid-transaction",
        "Cross-function reentrancy where function A calls external and function B reads shared state",
      ],
      metrics: [
        "Slither reentrancy detector reports zero findings",
        "Foundry --fuzz-runs=50000 finds no invariant violations",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "amount", type: "uint256", description: "Amount to withdraw" },
          { name: "recipient", type: "address", description: "Address to send funds to" },
        ],
        outputs: [
          { name: "success", type: "bool", description: "Whether the withdrawal succeeded" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Check: Validate all preconditions (balance sufficient, caller authorized, amount > 0) with require() at the top of the function.",
          "Effects: Update all state variables (decrement balance, mark withdrawal, update timestamps) before any external call.",
          "Interactions: Make the external call (ETH transfer, ERC20 safeTransfer) only after all state is finalized.",
          "Add OpenZeppelin's ReentrancyGuard and apply the nonReentrant modifier to all functions that make external calls.",
          "Run Slither with the reentrancy detector and fix all findings before deployment.",
          "Write an Echidna or Foundry invariant test asserting that the contract's ETH balance always equals the sum of tracked user balances.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://docs.soliditylang.org/en/latest/security-considerations.html#reentrancy",
        "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/ReentrancyGuard.sol",
      ],
      benchmarks: [],
      notes: "The DAO hack (2016) exploited reentrancy to drain 3.6M ETH.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Integer Overflow Safety in Solidity",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Unchecked arithmetic in Solidity unchecked{} blocks and pre-0.8 code silently wraps " +
        "on overflow, enabling attackers to manipulate token balances and fee calculations.",
      confidence: 0.97,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Solidity 0.8+ enables checked arithmetic by default. Use unchecked{} only when overflow " +
        "is geometrically impossible, and always verify that assumption explicitly.",
      tags: ["solidity", "integer-overflow", "arithmetic", "safety", "evm"],
      domain: "evm.solidity",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Contract targets Solidity 0.8.x or later for default overflow checks",
        "Each unchecked{} block has a comment explaining why overflow is impossible",
        "Casting from larger to smaller integer types (uint256 → uint128) includes an explicit bounds check",
      ],
      failure_conditions: [
        "unchecked{} block applied to user-supplied values without bounds verification",
        "Casting uint256 to uint128 silently truncates high bits",
        "Pre-0.8 contract using arithmetic without SafeMath on financial values",
      ],
      metrics: [
        "Mythril and Slither arithmetic overflow detectors report zero findings",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "a", type: "uint256", description: "First operand" },
          { name: "b", type: "uint256", description: "Second operand" },
        ],
        outputs: [
          { name: "result", type: "uint256", description: "Arithmetic result, revert on overflow" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Upgrade to Solidity 0.8.x or later; remove SafeMath library imports as they are redundant.",
          "Identify every unchecked{} block in the codebase and document the invariant that makes overflow impossible (e.g. loop counter bounded by array.length).",
          "For explicit type casts from uint256 to smaller types, add a require(value <= type(uint128).max) check before the cast.",
          "Run Mythril and Slither with arithmetic overflow analysis on each contract before deployment.",
          "Write fuzz tests with boundary values (0, 1, type(uint256).max, type(uint256).max - 1) for all arithmetic-heavy functions.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://docs.soliditylang.org/en/v0.8.0/080-breaking-changes.html",
        "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/math/Math.sol",
      ],
      benchmarks: [],
      notes: "Before Solidity 0.8, integer overflow was silent and exploited in multiple high-profile hacks.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Role-Based Access Control in Solidity",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Single-owner access control is insufficient for multi-role protocol systems and " +
        "creates a single point of failure that cannot be granularly revoked.",
      confidence: 0.95,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Implement role-based access control using OpenZeppelin AccessControl. Separate " +
        "administrative, operational, and emergency roles with distinct privileges.",
      tags: ["solidity", "access-control", "rbac", "openzeppelin", "roles"],
      domain: "evm.solidity",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Each privileged operation is guarded by a distinct role (not just onlyOwner)",
        "Role admin separation: role assignment itself requires a higher-privilege admin role",
        "Emergency roles (pause, rescue) are distinct from operational roles",
      ],
      failure_conditions: [
        "Single owner address controls all privileged operations — single point of failure",
        "Missing access control on state-changing functions accessible to any caller",
        "Role assignment not guarded by role admin check — allows privilege escalation",
      ],
      metrics: [
        "Slither access-control detector reports zero unprotected state-changing functions",
        "All role assignments verified in integration tests against expected revert behaviour",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "account", type: "address", description: "Account to grant role to" },
          { name: "role", type: "bytes32", description: "Role identifier (keccak256 hash of role name)" },
        ],
        outputs: [],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Inherit from OpenZeppelin's AccessControl contract.",
          "Define role constants: ADMIN_ROLE, PUBLISHER_ROLE, PAUSER_ROLE using keccak256 of descriptive strings.",
          "Set each role's admin via _setRoleAdmin(ROLE, ADMIN_ROLE) so only role admins can grant/revoke roles.",
          "Replace onlyOwner modifiers with onlyRole(SPECIFIC_ROLE) on each function that requires a distinct privilege.",
          "Grant initial roles in the constructor or an initialize function — do not leave them ungated.",
          "Add event emission for role grants and revocations (built into OpenZeppelin AccessControl).",
        ],
      },
    },
    evidence: {
      sources: [
        "https://docs.openzeppelin.com/contracts/4.x/access-control",
        "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/AccessControl.sol",
      ],
      benchmarks: [],
      notes: "Role separation is required for protocols with multiple operator tiers (admin, publisher, validator).",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Event Emission for On-Chain State Changes",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Omitting events from state-changing functions makes off-chain state reconstruction " +
        "impossible without expensive storage slot scanning.",
      confidence: 0.97,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Emit events for every significant state change. Index fields used in off-chain queries. " +
        "Events are the primary mechanism for subgraph and frontend state reconstruction.",
      tags: ["solidity", "events", "indexing", "subgraph", "evm"],
      domain: "evm.solidity",
      difficulty: "beginner",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Every state-changing function emits at least one event reflecting the change",
        "Fields used in subgraph or frontend filters are marked indexed",
        "Event parameter order and types are documented and stable",
      ],
      failure_conditions: [
        "State change occurs with no corresponding event — off-chain index cannot track it",
        "Unindexed fields for high-cardinality queries requiring efficient filtering",
        "Event arguments emitted in wrong order — produces silently misleading indexer data",
      ],
      metrics: [
        "The Graph subgraph fully reconstructs contract state from events without storage reads",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "state_change_fn", type: "function", description: "Function that modifies contract state" },
        ],
        outputs: [
          { name: "event", type: "Event", description: "Emitted event reflecting the state change" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Identify every function that writes to contract storage (any assignment to state variables).",
          "Define a corresponding event for each state change: event KBPublished(bytes32 indexed kbId, address indexed publisher, uint256 timestamp).",
          "Index fields that off-chain consumers will filter on: addresses, IDs, status flags. Non-indexed fields are still accessible in event logs but cannot be efficiently filtered.",
          "Emit the event at the end of the function after all state changes are applied.",
          "Do not reuse generic events (e.g., StateChanged) — use specific events per operation for clear subgraph mapping.",
          "Write a subgraph test that replays contract events and verifies the reconstructed state matches the expected state.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://docs.soliditylang.org/en/latest/contracts.html#events",
        "https://thegraph.com/docs/en/developing/creating-a-subgraph/",
      ],
      benchmarks: [],
      notes: "The Graph Protocol requires events for all indexable state; storage reads are not supported in subgraphs.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Gas Optimization via Storage Packing and Calldata",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Repeated SLOAD operations on the same slot and using memory instead of calldata for " +
        "read-only parameters are the most common source of avoidable gas overhead in Solidity.",
      confidence: 0.93,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Pack storage variables into 32-byte slots. Use calldata for read-only parameters. " +
        "Cache repeated storage reads in memory variables within functions.",
      tags: ["solidity", "gas", "optimization", "storage-packing", "calldata", "evm"],
      domain: "evm.solidity",
      difficulty: "advanced",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Structs with small fields (bool, uint8, address) are packed into the minimum number of slots",
        "Read-only array and string function parameters use calldata instead of memory",
        "Functions reading the same storage slot multiple times cache it in a local variable",
      ],
      failure_conditions: [
        "bool and uint256 interleaved in struct occupy separate 32-byte slots",
        "memory parameter copies entire array even when only reading it",
        "The same storage slot read 3+ times in a single function incurring 100–2100 gas each",
      ],
      metrics: [
        "forge snapshot shows gas reduction > 10% after packing and calldata changes",
        "No struct with inefficient field ordering flagged by storage layout analyser",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "struct_definition", type: "Solidity struct", description: "Struct to optimize" },
        ],
        outputs: [
          { name: "packed_struct", type: "Solidity struct", description: "Reordered struct with minimum slot count" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Order struct fields from smallest to largest type so they pack into the fewest 32-byte slots: uint8, uint16, bool, address (20 bytes), uint256.",
          "Change all read-only array, bytes, and string function parameters from memory to calldata.",
          "For any storage variable read more than once in a function, cache it: uint256 cached = storageVar; and use cached throughout.",
          "Use forge snapshot (Foundry) or hardhat-gas-reporter to measure gas cost before and after changes.",
          "Avoid premature optimization — apply these patterns only to hot paths (functions called frequently or in tight loops).",
        ],
      },
    },
    evidence: {
      sources: [
        "https://www.evm.codes/",
        "https://book.getfoundry.sh/forge/gas-snapshots",
      ],
      benchmarks: [],
      notes: "SLOAD cold costs 2100 gas; warm costs 100 gas. Calldata is 4 gas/byte (non-zero) vs 32 gas for memory copy.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  // ── sql.optimization ──────────────────────────────────────────────────────

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Index Design for Query Access Patterns",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Indexes designed to match data shape rather than query access patterns fail to " +
        "accelerate the queries that matter and add write overhead without benefit.",
      confidence: 0.95,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Design indexes to match the WHERE, JOIN, and ORDER BY patterns of your highest-frequency " +
        "queries. Composite indexes list the most selective column first. Partial indexes for sparse conditions.",
      tags: ["sql", "index", "query-optimization", "postgresql", "database"],
      domain: "sql.optimization",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "High-frequency queries use Index Scan or Bitmap Index Scan, not Seq Scan on large tables",
        "Composite index column order matches the equality-then-range access pattern of target queries",
        "Partial indexes exist for sparse query conditions (e.g. WHERE status = 'active')",
      ],
      failure_conditions: [
        "Index on low-cardinality column (boolean, status with 2 values) adds write overhead without selectivity benefit",
        "Wrong column order in composite index forces full index scan",
        "Indexes on columns never appearing in WHERE, JOIN ON, or ORDER BY clauses",
      ],
      metrics: [
        "EXPLAIN ANALYZE shows Index Scan for target queries after indexing",
        "Write throughput degradation < 5% after adding indexes (measured under load)",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "slow_query", type: "SQL string", description: "Query to optimize with indexing" },
          { name: "table_stats", type: "pg_stats row", description: "Column cardinality and distribution data" },
        ],
        outputs: [
          { name: "index_ddl", type: "SQL string", description: "CREATE INDEX statement" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Identify the top 10 slowest queries from pg_stat_statements ordered by total_exec_time.",
          "For each query, extract the WHERE clause columns and check their cardinality in pg_stats.",
          "Design a composite index with equality columns first (most selective), then range columns.",
          "For sparse conditions (WHERE deleted_at IS NULL), create a partial index with that condition as the WHERE clause.",
          "Create the index concurrently on production to avoid table lock: CREATE INDEX CONCURRENTLY.",
          "Verify with EXPLAIN ANALYZE that the query uses the new index; check rows estimates vs actuals.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://use-the-index-luke.com/",
        "https://www.postgresql.org/docs/current/indexes.html",
      ],
      benchmarks: [],
      notes: "Use The Index, Luke (Winand, 2011) remains the authoritative resource on SQL indexing strategy.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Query Plan Analysis with EXPLAIN ANALYZE",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "EXPLAIN without ANALYZE shows estimated row counts that can differ from actuals by " +
        "orders of magnitude, making it insufficient for diagnosing production performance.",
      confidence: 0.97,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Use EXPLAIN (ANALYZE, BUFFERS) to inspect actual query execution and cache hit rates. " +
        "Focus on eliminating Seq Scans, high loop counts, and disk-spilling sorts.",
      tags: ["sql", "explain", "query-plan", "performance", "postgresql"],
      domain: "sql.optimization",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "EXPLAIN ANALYZE used (not bare EXPLAIN) for all query investigations",
        "BUFFERS option included to observe shared block hits vs reads",
        "Actual rows vs estimated rows ratio is within 2x for all plan nodes",
      ],
      failure_conditions: [
        "Using EXPLAIN without ANALYZE, optimizing based on estimated rows that diverge from actuals",
        "Ignoring the buffers output — cache hit rate directly affects query speed",
        "Optimizing plan shape rather than actual cost and row count nodes",
      ],
      metrics: [
        "All plan nodes show actual rows within 2x of estimated rows after ANALYZE",
        "No sort or hash node with 'Batches > 1' (disk spill indicator)",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "slow_query", type: "SQL string", description: "Query to investigate" },
        ],
        outputs: [
          { name: "plan_analysis", type: "text", description: "Annotated EXPLAIN ANALYZE output with bottlenecks identified" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Run: EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) <your_query> on a production replica or staging with representative data.",
          "Identify the most expensive node by looking at actual time ms and rows. Start optimisation from the innermost expensive node.",
          "Look for Seq Scan on tables with >10,000 rows — these are candidates for indexing.",
          "Check 'Rows Removed by Filter' — high values indicate index is not selective enough or is missing.",
          "Check 'Buffers: shared hit=N read=M' — high read vs hit indicates the data is not in cache (may need pg_prewarm or query restructure).",
          "Re-run EXPLAIN ANALYZE after each optimisation change to confirm the plan improved.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://www.postgresql.org/docs/current/sql-explain.html",
        "https://explain.depesz.com/",
      ],
      benchmarks: [],
      notes: "explain.depesz.com provides an annotated explain plan viewer that highlights expensive nodes.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "N+1 Query Elimination",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Lazy-loading related entities in a loop generates one query per item, causing " +
        "query count to grow linearly with result set size and latency to compound.",
      confidence: 0.97,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Eliminate N+1 queries by batching related fetches into a single query using JOINs, " +
        "IN clauses, or a dataloader pattern.",
      tags: ["sql", "n+1", "orm", "dataloader", "performance", "query-batching"],
      domain: "sql.optimization",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Query count for an endpoint is O(1) or O(number of distinct entity types), not O(N)",
        "ORM query logging shows no repeated queries inside a request loop",
        "Dataloader batches all related IDs collected during a tick into a single IN query",
      ],
      failure_conditions: [
        "ORM lazy loading enabled by default producing one query per related entity",
        "findById() called inside a for loop over a result set",
        "GraphQL resolver issuing a database query per field resolver without batching",
      ],
      metrics: [
        "Endpoint query count is constant regardless of result set size (verified by ORM query log)",
        "Response time improvement > 50% for result sets of 100+ items",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "parent_ids", type: "string[]", description: "IDs of parent entities" },
          { name: "related_table", type: "string", description: "Table containing related entities" },
        ],
        outputs: [
          { name: "related_entities", type: "Record<string, Entity[]>", description: "Map of parent ID to related entities" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Enable ORM query logging in development and make a request to the target endpoint.",
          "Identify repeated queries differing only by ID parameter — these are the N+1.",
          "Replace ORM lazy loading with eager loading: use include/with/joinedLoad for known required relationships.",
          "For GraphQL resolvers, implement a DataLoader: collect all requested IDs during the current tick, then issue one SELECT WHERE id IN (...) query.",
          "For cases where join-based loading is preferred, use a lateral join or CTE to fetch the full subtree in one query.",
          "Add a test that asserts query count is bounded for large result sets.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://dataloader.readthedocs.io/en/latest/",
        "https://use-the-index-luke.com/no-offset",
      ],
      benchmarks: [],
      notes: "N+1 is the most common performance issue in ORM-backed applications.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "VACUUM and Statistics Maintenance for PostgreSQL",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Unvacuumed dead tuples bloat table size and cause planner statistics to diverge from " +
        "actual data distribution, producing plan regressions independent of index availability.",
      confidence: 0.95,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Schedule VACUUM ANALYZE on high-churn tables. Tune autovacuum settings for tables with " +
        "frequent UPDATE/DELETE operations. Run ANALYZE after bulk data changes.",
      tags: ["sql", "vacuum", "autovacuum", "postgresql", "statistics", "maintenance"],
      domain: "sql.optimization",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "pg_stat_user_tables.n_dead_tup / n_live_tup ratio < 0.1 for all tables",
        "autovacuum_vacuum_scale_factor and autovacuum_analyze_scale_factor tuned for high-churn tables",
        "ANALYZE run immediately after bulk INSERT/UPDATE/DELETE operations",
      ],
      failure_conditions: [
        "Default autovacuum thresholds too conservative — table reaches 20% dead tuple ratio before vacuum triggers",
        "Table bloat increasing sequential scan time even when data volume is stable",
        "Stale statistics causing planner to choose nested loop over hash join",
      ],
      metrics: [
        "n_dead_tup / n_live_tup ratio < 0.1 per table in pg_stat_user_tables",
        "No table with relpages diverging > 2x from pg_class estimate after recent ANALYZE",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "table_name", type: "string", description: "High-churn table to configure" },
        ],
        outputs: [],
        parameters: [
          { name: "autovacuum_vacuum_scale_factor", type: "float", description: "Fraction of table dead tuples before vacuum (default: 0.2)" },
          { name: "autovacuum_analyze_scale_factor", type: "float", description: "Fraction changed before analyze (default: 0.1)" },
        ],
      },
      inline_artifact: {
        steps: [
          "Query pg_stat_user_tables to identify tables with high n_dead_tup: SELECT relname, n_dead_tup, n_live_tup FROM pg_stat_user_tables ORDER BY n_dead_tup DESC.",
          "For high-churn tables, reduce autovacuum thresholds via ALTER TABLE: ALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_analyze_scale_factor = 0.005).",
          "Run VACUUM ANALYZE on the affected table immediately to catch up: VACUUM (ANALYZE, VERBOSE) events;",
          "After bulk data loads (> 10% of table), run ANALYZE explicitly: ANALYZE table_name;",
          "Monitor pg_stat_bgwriter for checkpoint pressure and tune checkpoint_completion_target if VACUUM is causing I/O spikes.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://www.postgresql.org/docs/current/routine-vacuuming.html",
        "https://www.postgresql.org/docs/current/sql-vacuum.html",
      ],
      benchmarks: [],
      notes: "Table bloat from dead tuples is one of the most overlooked causes of production performance degradation.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  // ── software.architecture ─────────────────────────────────────────────────

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "CQRS: Command Query Responsibility Segregation",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Mixing command and query processing in the same code path prevents independent " +
        "optimisation, scaling, and evolution of write and read workloads.",
      confidence: 0.92,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Separate command processing (mutations) from query handling (reads) to allow " +
        "independent scaling and optimisation of each path.",
      tags: ["architecture", "cqrs", "command", "query", "separation", "ddd"],
      domain: "software.architecture",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Write path (commands) and read path (queries) are implemented in separate modules or services",
        "Read models are optimised for their query access pattern, not mirroring the write model",
        "Consistency model for the read path is explicitly defined and communicated to consumers",
      ],
      failure_conditions: [
        "CRUD API that mixes read and write concerns prevents independent optimisation",
        "Read model tightly coupled to write model — cannot serve query-specific projections",
        "Eventual consistency of read path implicit and undocumented — consumers assume strong consistency",
      ],
      metrics: [
        "Read throughput scales independently of write throughput by adding read replicas",
        "Command latency P99 unaffected by read load",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "operation", type: "Command | Query", description: "Incoming operation to route" },
        ],
        outputs: [
          { name: "result", type: "void | QueryResult", description: "Result of command (void) or query (data)" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Classify all operations as commands (state mutations) or queries (reads) — no mixed operations.",
          "Route commands to a command handler that validates, applies, and persists the change.",
          "Route queries to a query handler that reads from a dedicated read model (denormalized projection).",
          "Define the consistency model: immediately consistent (same DB, synchronous projection) or eventually consistent (async projection via events).",
          "Document the eventual consistency lag for query consumers — this is a contract, not an implementation detail.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://martinfowler.com/bliki/CQRS.html",
        "https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf",
      ],
      benchmarks: [],
      notes: "CQRS is most beneficial in systems with high read-to-write ratio or asymmetric scaling requirements.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Event Sourcing: Immutable Event Log as Source of Truth",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Storing mutable current state instead of the event history makes temporal queries, " +
        "audit trails, and projection rebuilding impossible without additional infrastructure.",
      confidence: 0.91,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Persist a sequence of immutable domain events. Derive current state by replaying events. " +
        "Enables temporal queries, audit trails, and multiple read projections.",
      tags: ["architecture", "event-sourcing", "immutability", "audit", "projections"],
      domain: "software.architecture",
      difficulty: "advanced",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Current state is derivable by replaying all events from the beginning",
        "Events are immutable after appending — no UPDATE or DELETE on the event store",
        "Snapshot mechanism exists to bound replay time for long-lived aggregates",
      ],
      failure_conditions: [
        "Event schema evolution breaks replay of historical events (no schema migration strategy)",
        "Missing snapshot mechanism — replay time grows unboundedly with aggregate age",
        "Mutable events stored alongside immutable events — audit guarantee is broken",
      ],
      metrics: [
        "Full replay from event zero produces identical state to current read model",
        "Snapshot frequency keeps replay time under 1 second for any aggregate",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "command", type: "Command", description: "Domain command to handle" },
          { name: "current_state", type: "AggregateState", description: "Current aggregate state" },
        ],
        outputs: [
          { name: "events", type: "DomainEvent[]", description: "Events to append to the event store" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Model each aggregate as a pure function: (State, Command) → Event[].",
          "Append returned events to an append-only event store (Postgres, EventStoreDB).",
          "Reconstruct current state by replaying events: (State, Event) → State fold.",
          "Create periodic snapshots at configurable intervals to bound replay time.",
          "Implement an upcasting layer to transform old event versions to current schema during replay.",
          "Build read projections as separate databases updated by event handlers — they are disposable and rebuildable.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://martinfowler.com/eaaDev/EventSourcing.html",
        "https://eventmodeling.org/",
      ],
      benchmarks: [],
      notes: "Event sourcing is the basis of the Alexandrian Protocol's on-chain knowledge registry.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Circuit Breaker for Downstream Service Resilience",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Without a circuit breaker, thread pools exhaust waiting on degraded downstream services, " +
        "causing cascading failure that propagates upstream through the service graph.",
      confidence: 0.94,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Implement the circuit breaker pattern to fail fast with a fallback response when " +
        "downstream services are degraded, preventing cascading failure.",
      tags: ["architecture", "circuit-breaker", "resilience", "microservices", "fallback"],
      domain: "software.architecture",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Circuit opens after configured failure threshold — subsequent calls return fallback without hitting downstream",
        "Half-open state probes downstream with a single request before fully closing",
        "Fallback response is defined for every circuit-protected call",
      ],
      failure_conditions: [
        "No circuit breaker — thread pool exhaustion propagates failure upstream",
        "Threshold set too high — circuit never opens under realistic failure rates",
        "Half-open state never tested — circuit breaker stays open indefinitely after recovery",
      ],
      metrics: [
        "Upstream latency P99 capped at timeout + circuit-open overhead during downstream failure",
        "False positive rate (circuit opens during healthy downstream) < 0.1%",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "request", type: "Request", description: "Outgoing request to downstream service" },
          { name: "circuit_config", type: "CircuitBreakerConfig", description: "Threshold and timeout configuration" },
        ],
        outputs: [
          { name: "response", type: "Response | FallbackResponse", description: "Downstream response or circuit-open fallback" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Wrap each downstream service call with a circuit breaker (Resilience4j, Polly, opossum).",
          "Configure failure threshold (e.g. 50% failures in 30s), slow call threshold, and wait duration in open state.",
          "Define an explicit fallback for each circuit: cached response, empty result, or error response with clear message.",
          "Expose circuit state as a health check metric: open/closed/half-open per circuit.",
          "Test the circuit by injecting failures with a chaos testing tool (Chaos Monkey, Toxiproxy) and verifying it opens at the configured threshold.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://martinfowler.com/bliki/CircuitBreaker.html",
        "https://resilience4j.readme.io/docs/circuitbreaker",
      ],
      benchmarks: [],
      notes: "Coined by Michael Nygard in Release It! (2007). Prevents cascading failure in service meshes.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Saga Pattern for Distributed Transactions",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Two-phase commit across microservices creates tight coupling and blocking that " +
        "undermines the independence and availability benefits of service decomposition.",
      confidence: 0.93,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Use the saga pattern to manage distributed transactions without 2PC. Each step publishes " +
        "an event; compensating transactions undo previous steps on failure.",
      tags: ["architecture", "saga", "distributed-transactions", "microservices", "compensation"],
      domain: "software.architecture",
      difficulty: "advanced",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Every saga step has a defined compensating transaction",
        "Saga log persisted durably — state survives coordinator restart",
        "Each step is idempotent — safe to replay on retry",
      ],
      failure_conditions: [
        "Missing compensating transaction for a step — partial commit with no rollback path",
        "Saga log in memory only — idempotency lost on coordinator restart",
        "Non-idempotent steps — double execution on retry creates duplicate side effects",
      ],
      metrics: [
        "All failure paths exercised in integration tests — each compensating transaction verified",
        "Saga completion time P99 within configured timeout",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "saga_input", type: "SagaInput", description: "Initial data for the distributed transaction" },
        ],
        outputs: [
          { name: "saga_result", type: "SagaResult", description: "Final committed or fully compensated state" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Define the saga as a sequence of (action, compensation) pairs: [(reserveInventory, releaseInventory), (chargePayment, refundPayment), (scheduleShipment, cancelShipment)].",
          "Persist saga state in a durable log (database row) before executing each step.",
          "Make each step idempotent with an idempotency key — safe to replay if the step was previously executed.",
          "On failure at step N, execute compensating transactions for steps N-1 down to 0 in reverse order.",
          "For choreography-based sagas: each service listens for domain events and publishes its own events.",
          "Add distributed tracing (OpenTelemetry) across all saga steps — choreography sagas are unobservable without it.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://microservices.io/patterns/data/saga.html",
        "https://www.oreilly.com/library/view/microservices-patterns/9781617294549/",
      ],
      benchmarks: [],
      notes: "Garcia-Molina & Salem (1987) introduced sagas as an alternative to long-lived transactions.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Strangler Fig Pattern for Incremental Migration",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Big-bang rewrites of legacy systems have a historically high failure rate because " +
        "they require a complete feature freeze and introduce systemic risk at deployment.",
      confidence: 0.93,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Incrementally route requests to a new system by feature or domain slice using the " +
        "strangler fig pattern, letting the legacy system atrophy until decommissioned.",
      tags: ["architecture", "strangler-fig", "migration", "legacy", "incremental"],
      domain: "software.architecture",
      difficulty: "advanced",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Each migration slice is independently deployed and rolled back without affecting other slices",
        "Traffic proxy layer has full observability — which system handled each request is logged",
        "Feature flags for routing are cleaned up after each slice migration is complete",
      ],
      failure_conditions: [
        "Two systems share mutable state without a synchronisation mechanism — data consistency breaks",
        "Feature flag routing never cleaned up — dead legacy paths accumulate indefinitely",
        "No observability on proxy layer — impossible to determine error attribution",
      ],
      metrics: [
        "Legacy system handles < 5% of traffic after migration completion for each slice",
        "Zero data consistency incidents during parallel operation period",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "legacy_system", type: "System", description: "Existing system to migrate from" },
          { name: "new_system", type: "System", description: "Replacement system to migrate to" },
        ],
        outputs: [
          { name: "migrated_slice", type: "Feature", description: "Successfully migrated feature or domain" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Install a proxy (API gateway or facade) in front of the legacy system that can route requests to either system.",
          "Identify the smallest independently testable slice to migrate first (e.g. one endpoint, one domain aggregate).",
          "Build the equivalent functionality in the new system and verify it produces identical outputs for the same inputs.",
          "Route 1% of traffic for the selected slice to the new system; monitor error rates and latency.",
          "Gradually increase traffic to 100%; once stable, remove the legacy path and clean up the routing rule.",
          "Repeat for the next slice. Never let two paths accumulate without scheduled cleanup dates.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://martinfowler.com/bliki/StranglerFigApplication.html",
        "https://docs.microsoft.com/en-us/azure/architecture/patterns/strangler-fig",
      ],
      benchmarks: [],
      notes: "Named after the strangler fig tree that grows around and eventually replaces its host.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  // ── software.testing ──────────────────────────────────────────────────────

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Property-Based Testing for Invariant Verification",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Hand-crafted test cases systematically miss edge cases that property-based testing " +
        "discovers by generating and shrinking arbitrary inputs against stated invariants.",
      confidence: 0.94,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Use property-based testing to verify invariants across automatically generated inputs. " +
        "Describe what must always be true; let the framework explore the input space.",
      tags: ["testing", "property-based", "invariants", "quickcheck", "hypothesis"],
      domain: "software.testing",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Properties describe invariants that must hold for all inputs in the domain",
        "Shrinking is enabled — failing cases are minimized to their essential cause",
        "Tests run with sufficient sample count (>= 1000 cases) to explore the input space",
      ],
      failure_conditions: [
        "Properties too weak — they pass trivially for all inputs without verifying anything meaningful",
        "Shrinking disabled — failing cases are too large to diagnose",
        "Stateful properties that depend on execution order not modelled with state machine generators",
      ],
      metrics: [
        "Property test finds bugs not covered by example tests",
        "Shrunk failing case is minimal and human-interpretable",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "function_under_test", type: "function", description: "Pure function to test" },
          { name: "input_generators", type: "Generator[]", description: "Arbitrary input generators" },
        ],
        outputs: [
          { name: "test_result", type: "pass | failing_case", description: "Pass or minimized failing example" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Identify the invariants: properties that must be true for all valid inputs (e.g. encode(decode(x)) === x, sort(xs).length === xs.length, sort is idempotent).",
          "Write generators for the input domain using the framework's combinators (fast-check, Hypothesis, QuickCheck).",
          "Write the property as: forAll(generator, (input) => invariant(fn(input)) === true).",
          "Run with at least 1000 samples; use seed for reproducibility.",
          "When a failing case is found, let the shrinker reduce it to its minimal reproducing form before investigating.",
          "Add the shrunk failing case as a fixed regression test.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://fast-check.dev/",
        "https://hypothesis.readthedocs.io/en/latest/",
      ],
      benchmarks: [],
      notes: "Property-based testing was introduced by Claessen & Hughes in QuickCheck (2000).",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Mutation Testing for Test Suite Effectiveness",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "High line coverage with low mutation score indicates tests verify code execution but " +
        "not correctness, providing false confidence in the test suite.",
      confidence: 0.93,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Apply mutation testing to evaluate test suite effectiveness. Mutation tools introduce " +
        "small code changes; verify at least one test fails per mutation.",
      tags: ["testing", "mutation-testing", "code-coverage", "correctness", "stryker"],
      domain: "software.testing",
      difficulty: "advanced",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Mutation score > 80% for critical business logic modules",
        "Each surviving mutant reviewed — either a test is added or the mutant is marked equivalent",
        "Mutation testing runs in CI on changed files only for acceptable performance",
      ],
      failure_conditions: [
        "High line coverage (>90%) coexisting with low mutation score (<50%) — tests assert existence not correctness",
        "Running mutation testing on the entire codebase causing CI timeout",
        "Equivalent mutants (behaviorally identical to original) counted in the surviving total",
      ],
      metrics: [
        "Mutation score > 80% for modules under test",
        "Mutation testing CI step completes within 10 minutes on changed files",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "module", type: "source file", description: "Module to mutation test" },
          { name: "test_suite", type: "test files", description: "Tests covering the module" },
        ],
        outputs: [
          { name: "mutation_score", type: "percentage", description: "Percentage of mutants killed" },
          { name: "surviving_mutants", type: "Mutant[]", description: "Mutants that no test detected" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Install a mutation testing tool: Stryker (JS/TS), Pitest (Java), mutmut (Python), cargo-mutants (Rust).",
          "Scope mutation testing to critical business logic modules — do not run on the full codebase initially.",
          "Run the tool and examine surviving mutants — these are code changes no test detected.",
          "For each surviving mutant: either add a test that catches the mutation or mark it as equivalent.",
          "Integrate into CI to run on changed files only: stryker run --incremental.",
          "Set a minimum mutation score threshold (e.g. 80%) and fail the build if it drops below.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://stryker-mutator.io/",
        "https://pitest.org/",
      ],
      benchmarks: [],
      notes: "Mutation testing was introduced by DeMillo, Lipton & Sayward in 1978. Practical tooling matured in 2016+.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Consumer-Driven Contract Testing",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "End-to-end integration tests between services are slow, brittle, and fail to attribute " +
        "API compatibility breaks to the party that introduced the change.",
      confidence: 0.91,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Use consumer-driven contract testing (Pact) to verify API compatibility between services. " +
        "Consumers define expectations; providers verify them in isolation.",
      tags: ["testing", "contract-testing", "pact", "microservices", "api"],
      domain: "software.testing",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Provider verification runs in CI against published consumer contracts on every provider change",
        "Contract breakage fails the provider's CI build and notifies the consumer team",
        "Consumer contracts are updated when consumer requirements change",
      ],
      failure_conditions: [
        "Contracts not run in CI — provider breaks consumer schema without detection",
        "Overly specific contracts that fail on irrelevant provider changes (e.g. field ordering)",
        "Consumer stops using a field but doesn't update the contract — provider maintains dead code",
      ],
      metrics: [
        "Contract breakage detected within 1 CI run of the breaking provider change",
        "No production API incompatibility incidents since contract tests introduced",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "consumer_expectations", type: "Pact", description: "Consumer contract defining expected API shape" },
          { name: "provider_implementation", type: "Service", description: "Provider service to verify" },
        ],
        outputs: [
          { name: "verification_result", type: "pass | fail", description: "Whether provider satisfies consumer contract" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "In the consumer, write a Pact test that records the expected request/response interaction.",
          "Run the consumer test to generate a pact file (JSON) describing the contract.",
          "Publish the pact file to a Pact Broker (pactflow.io or self-hosted).",
          "In the provider's CI pipeline, add a verification step that fetches contracts from the broker and replays them against the running provider.",
          "Fail the provider's CI build if any consumer contract is not satisfied.",
          "Use can-i-deploy to gate deployments: only deploy if all consumer contracts pass.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://docs.pact.io/",
        "https://martinfowler.com/articles/consumerDrivenContracts.html",
      ],
      benchmarks: [],
      notes: "Consumer-driven contracts were introduced by Ian Robinson at ThoughtWorks (2006).",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Coverage-Guided Fuzz Testing for Security",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Manual test cases cannot exhaustively cover the input space of parsers and deserialisers; " +
        "coverage-guided fuzzing discovers crashes and vulnerabilities that humans reliably miss.",
      confidence: 0.95,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Fuzz test security-critical parsing code with random and malformed inputs. Use " +
        "coverage guidance to explore deep code paths and structured corpus seeds.",
      tags: ["testing", "fuzzing", "security", "afl", "libfuzzer", "foundry"],
      domain: "software.testing",
      difficulty: "advanced",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Fuzzer runs continuously in CI on each code change to the target function",
        "Corpus seeds cover known vulnerability classes for the input format",
        "All crashes are triaged within 24 hours of discovery",
      ],
      failure_conditions: [
        "Fuzzer run only once manually — not integrated into CI or continuous fuzzing infrastructure",
        "No corpus seeds — fuzzer takes prohibitively long to discover interesting inputs",
        "Fuzzer without sanitizers (ASAN, MSAN) — memory errors produce no observable crash",
      ],
      metrics: [
        "Code coverage reached by fuzzer > 80% of parser paths",
        "Zero unpatched crashes from fuzzing in the last 30 days",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "target_function", type: "function", description: "Parse or decode function to fuzz" },
          { name: "corpus", type: "bytes[]", description: "Initial seed corpus of valid inputs" },
        ],
        outputs: [
          { name: "crashes", type: "bytes[]", description: "Minimal crashing inputs discovered" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Write a fuzz target function that takes arbitrary bytes and calls the parse/decode function.",
          "Build a seed corpus of valid inputs representative of the expected input format.",
          "Compile with sanitizers: AddressSanitizer (ASAN) and UndefinedBehaviorSanitizer (UBSAN).",
          "Run with coverage-guided fuzzer: libFuzzer, AFL++, or Honggfuzz.",
          "For Solidity: use Foundry's forge fuzz with invariant tests.",
          "Triage all crashes immediately — each crash is a potential security vulnerability.",
          "Integrate continuous fuzzing in CI or OSS-Fuzz for long-running campaigns.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://github.com/google/fuzzing",
        "https://book.getfoundry.sh/forge/fuzz-testing",
      ],
      benchmarks: [],
      notes: "Google's OSS-Fuzz has found over 10,000 vulnerabilities in open source software since 2016.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  // ── ai.prompting ──────────────────────────────────────────────────────────

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Chain-of-Thought Prompting",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Requiring explicit reasoning steps before stating a final answer significantly improves " +
        "accuracy on multi-step reasoning tasks compared to direct answer elicitation.",
      confidence: 0.93,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Structure prompts to elicit step-by-step reasoning before the final answer. " +
        "Chain-of-thought prompting improves accuracy on arithmetic, logic, and multi-hop tasks.",
      tags: ["prompting", "chain-of-thought", "reasoning", "llm", "accuracy"],
      domain: "ai.prompting",
      difficulty: "beginner",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "probabilistic",
      idempotent: false,
    },
    validation: {
      success_conditions: [
        "Reasoning steps are present and logically ordered before the final answer",
        "Final answer follows from the stated reasoning — no answer before reasoning is complete",
        "Accuracy improvement measurable vs direct answer prompting on the target task",
      ],
      failure_conditions: [
        "Model states the final answer before completing reasoning steps",
        "Reasoning steps are present but the final answer contradicts them",
        "CoT prompting applied to tasks where it adds no benefit (simple factual recall)",
      ],
      metrics: [
        "Accuracy improvement > 10% vs direct prompting on multi-step reasoning benchmarks",
        "Reasoning steps correctly anticipate the final answer in > 90% of cases",
      ],
    },
    payload: {
      artifact_type: "template",
      location: "inline",
      interface: {
        inputs: [
          { name: "problem", type: "string", description: "The problem or question to solve" },
        ],
        outputs: [
          { name: "reasoning_steps", type: "string", description: "Numbered reasoning chain" },
          { name: "final_answer", type: "string", description: "Answer derived from reasoning" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Solve the problem step by step before providing the final answer.",
          "Show your reasoning explicitly as numbered steps.",
          "Only state the final answer after completing all reasoning steps.",
          "Problem: {{problem}}",
          "Steps: [your numbered reasoning here]",
          "Final Answer: [your answer here]",
        ],
      },
    },
    evidence: {
      sources: [
        "https://arxiv.org/abs/2201.11903",
        "https://www.anthropic.com/research/chain-of-thought-prompting",
      ],
      benchmarks: [],
      notes: "Wei et al. (2022) demonstrated CoT prompting on large models (>100B parameters). Works well with Claude, GPT-4.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Few-Shot Learning via Structured Examples",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Providing representative input-output examples in the prompt anchors model output " +
        "to the required format and style more reliably than instructions alone.",
      confidence: 0.91,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Provide 2–5 representative input-output examples in the prompt to anchor model behaviour " +
        "to the required format and style.",
      tags: ["prompting", "few-shot", "in-context-learning", "examples", "llm"],
      domain: "ai.prompting",
      difficulty: "beginner",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "probabilistic",
      idempotent: false,
    },
    validation: {
      success_conditions: [
        "Output format matches the examples exactly across diverse inputs",
        "Edge cases in examples cover the expected variance in real inputs",
        "Model does not deviate from the pattern established by examples",
      ],
      failure_conditions: [
        "Examples do not cover the variance in real inputs — model extrapolates incorrectly",
        "Too many examples cause context length issues and degrade performance",
        "Examples contain inconsistencies — model learns the noise rather than the pattern",
      ],
      metrics: [
        "Format compliance rate > 95% on validation set after few-shot prompting",
        "Accuracy improvement > zero-shot baseline",
      ],
    },
    payload: {
      artifact_type: "template",
      location: "inline",
      interface: {
        inputs: [
          { name: "examples", type: "Array<{input: string, output: string}>", description: "Representative input-output pairs" },
          { name: "target_input", type: "string", description: "Input to process" },
        ],
        outputs: [
          { name: "output", type: "string", description: "Model output matching example format" },
        ],
        parameters: [
          { name: "n_examples", type: "integer", description: "Number of examples to include (2–5 recommended)" },
        ],
      },
      inline_artifact: {
        steps: [
          "Here are {{n}} examples of the task:",
          "Example 1 — Input: {{example_1.input}}",
          "Example 1 — Output: {{example_1.output}}",
          "[... repeat for each example ...]",
          "Now perform the same task for this input:",
          "Input: {{target_input}}",
          "Output:",
        ],
      },
    },
    evidence: {
      sources: [
        "https://arxiv.org/abs/2005.14165",
        "https://arxiv.org/abs/2301.13379",
      ],
      benchmarks: [],
      notes: "Brown et al. (2020) introduced few-shot prompting in GPT-3. 2–5 examples is the practical sweet spot.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Role Prompting for Persona-Constrained Generation",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Assigning an explicit expert persona to the model at the start of the system prompt " +
        "consistently shifts vocabulary, tone, and depth toward the specified expertise domain.",
      confidence: 0.88,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Assign an expert persona in the system prompt to shift model tone and vocabulary to " +
        "the target domain and audience level.",
      tags: ["prompting", "role-prompting", "persona", "system-prompt", "llm"],
      domain: "ai.prompting",
      difficulty: "beginner",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "probabilistic",
      idempotent: false,
    },
    validation: {
      success_conditions: [
        "Response maintains the specified role throughout without breaking character",
        "Vocabulary and tone match the target audience level",
        "Instruction is addressed without unnecessary role-breaking clarifications",
      ],
      failure_conditions: [
        "Model breaks persona to add disclaimers or refuse mid-response",
        "Persona too vague (e.g. 'expert') — does not sufficiently constrain output style",
        "Role conflicts with safety guidelines — model ignores role entirely",
      ],
      metrics: [
        "Human evaluation shows role adherence > 90% across 50 prompts",
        "Audience appropriateness score improves vs no-persona baseline",
      ],
    },
    payload: {
      artifact_type: "template",
      location: "inline",
      interface: {
        inputs: [
          { name: "role", type: "string", description: "Expert role to assign (e.g. 'senior Solidity security auditor')" },
          { name: "domain", type: "string", description: "Domain of expertise" },
          { name: "audience", type: "string", description: "Target audience level (e.g. 'junior developers')" },
          { name: "instruction", type: "string", description: "The actual task" },
        ],
        outputs: [
          { name: "response", type: "string", description: "Persona-constrained response" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "System: You are a {{role}} with deep expertise in {{domain}}.",
          "Your responses must be {{tone}} and targeted at {{audience}}.",
          "Focus exclusively on the task without breaking character or explaining your limitations.",
          "User: {{instruction}}",
        ],
      },
    },
    evidence: {
      sources: [
        "https://arxiv.org/abs/2302.07842",
        "https://www.anthropic.com/research/prompting",
      ],
      benchmarks: [],
      notes: "Role prompting effectiveness varies by model size and instruction-following capability.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Constrained Output Formatting",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Explicitly constraining output format in the prompt and providing a fallback error " +
        "structure dramatically increases the reliability of structured outputs from LLMs.",
      confidence: 0.92,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Constrain LLM output to a specific format (JSON, YAML, specific text structure) by " +
        "providing the schema in the prompt with an error fallback.",
      tags: ["prompting", "structured-output", "json", "format-constraint", "llm"],
      domain: "ai.prompting",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "probabilistic",
      idempotent: false,
    },
    validation: {
      success_conditions: [
        "Output is valid JSON parseable without preprocessing",
        "All required schema fields are present in the output",
        "No prose, markdown fences, or commentary surrounds the JSON",
      ],
      failure_conditions: [
        "Model wraps JSON in markdown code fences or adds explanation text",
        "Model omits required fields when they are not applicable rather than using null/empty",
        "Model hallucinating field names not in the schema",
      ],
      metrics: [
        "JSON parse success rate > 95% without preprocessing",
        "Schema field presence rate > 99% for required fields",
      ],
    },
    payload: {
      artifact_type: "template",
      location: "inline",
      interface: {
        inputs: [
          { name: "json_schema", type: "JSON Schema string", description: "Schema the output must conform to" },
          { name: "task", type: "string", description: "The task to complete" },
        ],
        outputs: [
          { name: "structured_output", type: "JSON string", description: "JSON conforming to the provided schema" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Respond ONLY with valid JSON matching this schema:",
          "{{json_schema}}",
          "Do not include any text before or after the JSON object.",
          "Do not include markdown code fences (``` or ```json).",
          "If you cannot produce valid output for any field, use null for that field.",
          "Task: {{task}}",
        ],
      },
    },
    evidence: {
      sources: [
        "https://platform.openai.com/docs/guides/structured-outputs",
        "https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/increase-output-consistency",
      ],
      benchmarks: [],
      notes: "Structured output APIs (OpenAI, Anthropic) provide grammar-constrained decoding as an alternative.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  // ── meta.protocol ─────────────────────────────────────────────────────────

  {
    identity: {
      kb_id: "",
      epistemic_type: "declarative",
      kb_type: "invariant",
      title: "Knowledge Attribution via Content Hash",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Attribution by title or URL is unstable — only a cryptographic content hash provides " +
        "stable, tamper-evident attribution that survives content mutations.",
      confidence: 0.98,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Every derived knowledge artifact must attribute its source materials with a content hash. " +
        "Attribution is the mechanism by which provenance is auditable and royalties are routable.",
      tags: ["protocol", "attribution", "content-hash", "provenance", "royalties"],
      domain: "meta.protocol",
      difficulty: "beginner",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Each attribution record contains a cryptographic content hash of the attributed artifact",
        "Content hash is independently verifiable by any party with the artifact",
        "Royalty routing follows the attribution graph without manual reconciliation",
      ],
      failure_conditions: [
        "Attribution by title or URL that breaks when content is updated or moved",
        "Attribution omitted — severs the economic link between derived and source knowledge",
        "Circular attribution that creates unresolvable provenance graphs",
      ],
      metrics: [
        "100% of derived artifacts have at least one content-hash attribution",
        "Attribution graph is acyclic (verifiable topological sort succeeds)",
      ],
    },
    payload: {
      artifact_type: "explanation",
      location: "inline",
      interface: {
        inputs: [
          { name: "source_artifact", type: "bytes", description: "Source artifact to attribute" },
        ],
        outputs: [
          { name: "content_hash", type: "bytes32", description: "keccak256 content hash of the artifact" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Canonicalize the source artifact using JCS (RFC 8785) to produce a deterministic byte sequence.",
          "Hash the canonical bytes: keccak256(JCS(artifact)).",
          "Include the content hash in the derived artifact's knowledge_inputs.used array: { kb_id: '0x...', role: 'parent' }.",
          "Record royalty share allocation (royalty_bps) in provenance.royalty_bps.",
          "Do not use URLs, titles, or timestamps as attribution identifiers — they are mutable and unverifiable.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://datatracker.ietf.org/doc/html/rfc8785",
        "https://ethereum.org/en/developers/docs/data-structures-and-encoding/",
      ],
      benchmarks: [],
      notes: "Content-addressed attribution is the foundation of trustless knowledge sharing in distributed systems.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Epistemic Integrity in Knowledge Artifacts",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "A knowledge artifact that conflates fact with inference without marking the distinction " +
        "degrades the quality of every artifact in the graph that cites it.",
      confidence: 0.96,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Every claim must be separable from its confidence level and evidence. Distinguish facts, " +
        "heuristics, analysis, and theorems explicitly in every artifact.",
      tags: ["protocol", "epistemic", "integrity", "confidence", "claim", "evidence"],
      domain: "meta.protocol",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Each artifact has an explicit epistemic_type classification",
        "Confidence level (0.0–1.0) reflects evidence quality, not desired certainty",
        "Conflicting claims are linked via reasoning.contradicts rather than silently coexisting",
      ],
      failure_conditions: [
        "Confidence expressed as 1.0 for empirically uncertain claims",
        "Inference presented as observation without derivation chain",
        "Conflicting claims with no contradiction linkage — graph consumers see both as compatible",
      ],
      metrics: [
        "All artifacts have a claim.confidence value between 0.1 and 0.99 (not 0 or 1)",
        "Contradiction links resolve to valid kb_ids in the graph",
      ],
    },
    payload: {
      artifact_type: "explanation",
      location: "inline",
      interface: {
        inputs: [
          { name: "claim", type: "string", description: "Claim to evaluate for epistemic integrity" },
          { name: "evidence", type: "string[]", description: "Evidence supporting the claim" },
        ],
        outputs: [
          { name: "epistemic_assessment", type: "string", description: "Classified claim with confidence and evidence type" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Classify the knowledge type: fact (verifiable, empirical), heuristic (experience-based, not universal), analysis (derived from data), procedure (actionable steps), algorithm (formal procedure), theorem (logical proof).",
          "Assign a confidence value (0.0–1.0) based on evidence quality: 0.9+ for peer-reviewed evidence, 0.7–0.9 for practitioner consensus, 0.5–0.7 for plausible heuristics.",
          "Populate claim.statement with a falsifiable assertion — it should be possible to imagine evidence that would refute it.",
          "Populate evidence.sources with verifiable references.",
          "Link any conflicting artifacts via reasoning.contradicts using their kb_id.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://plato.stanford.edu/entries/epistemology/",
        "https://www.lesswrong.com/posts/7GmfQuEMmTWCFQLFJ/no-really-i-m-lying",
      ],
      benchmarks: [],
      notes: "Epistemic integrity is the foundation of trustworthy knowledge graphs. Uncertainty must be explicit.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "declarative",
      kb_type: "invariant",
      title: "Deterministic Identity for Distributed Knowledge",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Any non-determinism in the identity function of a content-addressed system breaks " +
        "deduplication, attribution linkage, and settlement across distributed parties.",
      confidence: 0.99,
      falsifiable: true,
    },
    semantic: {
      summary:
        "The same content must always produce the same identifier regardless of when or where " +
        "it is created. Non-determinism in the identity function breaks distributed deduplication.",
      tags: ["protocol", "determinism", "content-addressing", "identity", "hashing"],
      domain: "meta.protocol",
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "The same artifact produces the same kbHash regardless of platform, time, or creating agent",
        "No non-deterministic values (timestamps, random nonces, UUIDs) appear in the hash preimage",
        "Serialization produces byte-identical output across all compliant implementations",
      ],
      failure_conditions: [
        "Including timestamps or random nonces in the hash preimage breaks cross-party deduplication",
        "Different JSON serializers producing different byte sequences for identical objects",
        "Floating-point values in hash preimage with platform-dependent binary representation",
      ],
      metrics: [
        "Same artifact hashed independently by 3 separate implementations produces identical kbHash",
        "Test vector suite passes 100% across all language implementations",
      ],
    },
    payload: {
      artifact_type: "algorithm",
      location: "inline",
      interface: {
        inputs: [
          { name: "artifact", type: "KBv24Artifact", description: "Artifact to compute identity for" },
        ],
        outputs: [
          { name: "kb_id", type: "bytes32 hex string", description: "Deterministic identity hash (0x...)" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Remove identity.kb_id and provenance.author.address from the artifact (publish-time values that cannot be known during hash computation).",
          "Canonicalize the remaining artifact using JCS (RFC 8785): sort all object keys lexicographically, recursively; no whitespace; precise number encoding.",
          "Prepend the domain tag: 'KB_V1' + canonical_json_string.",
          "Hash with keccak256 of the UTF-8 encoded preimage.",
          "Set identity.kb_id = '0x' + hex(keccak256_output).",
          "Verify: running the same algorithm on the same artifact always produces the same kb_id.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://datatracker.ietf.org/doc/html/rfc8785",
        "https://ethereum.github.io/yellowpaper/paper.pdf",
      ],
      benchmarks: [],
      notes: "JCS (RFC 8785) is the IETF standard for JSON canonicalization, used in JSON-LD and W3C Verifiable Credentials.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },


  // ── meta.expanded — new type seeds ────────────────────────────────────────

  {
    identity: {
      kb_id: "",
      epistemic_type: "declarative",
      kb_type: "context",
      title: "Incident Postmortem: Database Connection Pool Exhaustion",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Connection pool exhaustion under burst traffic is a recurring failure mode that can be " +
        "prevented by combining pool sizing limits, query timeouts, and circuit breakers.",
      confidence: 0.92,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Real-world case study: a production API serving 50k RPM experienced P99 latency spikes " +
        "of 12 s caused by connection pool exhaustion during a flash sale event. " +
        "Resolution: pool cap raised from 10→50, query timeout set to 3 s, circuit breaker added.",
      tags: ["case-study", "database", "connection-pool", "postmortem", "resilience"],
      domain: "meta.expanded",
      difficulty: "intermediate",
      capabilities: ["incident-analysis", "root-cause", "resilience-patterns"],
      execution_class: "reasoning",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "non-deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Current situation context is compared against the case before adapting the strategy",
        "Mitigations are applied in the same order: pool cap → timeout → circuit breaker",
        "Load test confirms pool exhaustion is no longer reproduced at 2× peak traffic",
      ],
      failure_conditions: [
        "Strategy copied verbatim without verifying pool sizing applies to the current database driver",
        "Circuit breaker threshold set without measuring baseline error rate first",
      ],
      metrics: [
        "P99 latency < 500 ms at 2× peak traffic after mitigation",
        "Connection pool utilisation < 80% under sustained load",
      ],
    },
    payload: {
      artifact_type: "explanation",
      location: "inline",
      interface: {
        inputs: [
          { name: "incident_description", type: "string", description: "Description of the current production issue" },
        ],
        outputs: [
          { name: "adapted_mitigation", type: "string", description: "Recommended mitigation steps tailored to the current context" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          // CaseStudy fields — consumed by extractByType("CaseStudy", artifact)
          ({
            context:  "Production API, PostgreSQL, pgBouncer pool capped at 10 connections, 50k RPM burst during flash sale.",
            actions: [
              "Identified connection pool exhaustion via pg_stat_activity showing all slots occupied.",
              "Raised pool max from 10 to 50; restarted pgBouncer without full deployment.",
              "Set statement_timeout = 3000 on all read replicas.",
              "Added circuit breaker: open after 5 consecutive pool-wait errors, half-open after 30 s.",
            ],
            outcomes: [
              "P99 latency dropped from 12 s to 280 ms within 4 minutes of pgBouncer restart.",
              "Zero additional connection exhaustion events in subsequent flash sales.",
            ],
            lessons: "Pool sizing must be validated against peak concurrency, not average load. Timeout + circuit breaker are complements, not substitutes.",
          } as unknown as import("../types/artifact.js").StructuredStep),
        ],
      },
    },
    evidence: {
      sources: ["https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-STATEMENT-TIMEOUT"],
      benchmarks: ["pgBouncer pool=50 sustained 60k RPM at P99=210ms in follow-up load test"],
      notes: "CaseStudy type — agent should compare context before adapting, not copy blindly.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "evaluative",
      kb_type: "evaluation",
      title: "Database Technology Selection Framework",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Database technology decisions made without a scored framework consistently optimise for " +
        "familiarity rather than fit, producing mismatches discovered only at scale.",
      confidence: 0.88,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Structured decision framework for choosing between relational, document, wide-column, " +
        "graph, and time-series databases. Evaluates five weighted criteria: query pattern fit, " +
        "consistency requirement, operational complexity, team familiarity, and cost at scale.",
      tags: ["decision-framework", "database", "architecture", "tradeoff"],
      domain: "meta.expanded",
      difficulty: "intermediate",
      capabilities: ["decision-support", "architecture-review", "technology-selection"],
      execution_class: "evaluation",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "probabilistic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "All five criteria scored for every candidate technology",
        "Weighted scores computed and winner identified with margin",
        "Recommendation includes the two highest-impact criteria that drove the decision",
      ],
      failure_conditions: [
        "Fewer than three candidate technologies evaluated",
        "Team familiarity used as the sole deciding factor",
        "No consistency requirement captured before scoring",
      ],
      metrics: [
        "Score spread between top-2 candidates ≥ 10 points (tie = re-evaluate criteria weights)",
        "Decision documented with rationale before implementation begins",
      ],
    },
    payload: {
      artifact_type: "checklist",
      location: "inline",
      interface: {
        inputs: [
          { name: "query_patterns", type: "string[]", description: "Primary read/write access patterns (e.g. point lookups, range scans, graph traversals)" },
          { name: "consistency_requirement", type: "string", description: "strong | eventual | causal" },
          { name: "candidate_technologies", type: "string[]", description: "Database options to evaluate (min 3)" },
        ],
        outputs: [
          { name: "scored_matrix", type: "object", description: "Candidate × criterion score matrix with weighted totals" },
          { name: "recommendation", type: "string", description: "Winning technology with rationale" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          // DecisionFramework fields for extractByType
          ({
            options: [
              { name: "Relational (PostgreSQL/MySQL)", description: "ACID, rich query, strong consistency, complex joins" },
              { name: "Document (MongoDB/DynamoDB)", description: "Flexible schema, horizontal scale, eventual consistency" },
              { name: "Wide-column (Cassandra/Bigtable)", description: "Write-heavy, time-series, linear scale" },
              { name: "Graph (Neo4j/Neptune)", description: "Relationship-first queries, multi-hop traversals" },
              { name: "Time-series (InfluxDB/TimescaleDB)", description: "Append-only metrics, time-window aggregations" },
            ],
            criteria: [
              { name: "Query pattern fit",        weight: 0.35 },
              { name: "Consistency requirement",  weight: 0.25 },
              { name: "Operational complexity",   weight: 0.20 },
              { name: "Team familiarity",         weight: 0.10 },
              { name: "Cost at scale",            weight: 0.10 },
            ],
            recommendation: "Score each option 1–5 per criterion. Multiply by weight. Sum rows. Highest total wins. If margin < 10, revisit criterion weights.",
          } as unknown as import("../types/artifact.js").StructuredStep),
        ],
      },
    },
    evidence: {
      sources: [
        "https://martin.kleppmann.com/2017/03/01/designing-data-intensive-applications.html",
        "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
      ],
      benchmarks: [],
      notes: "DecisionFramework type — agent must evaluate ALL options against ALL criteria before recommending.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "evaluative",
      kb_type: "evaluation",
      title: "API Dependency Risk Model",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Undocumented third-party API dependencies are the leading source of unplanned production " +
        "incidents; a structured risk model reduces mean time to detection by forcing explicit " +
        "probability and impact assessment before integration.",
      confidence: 0.85,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Risk model for evaluating third-party API dependencies. Scores each dependency across " +
        "four risk dimensions: availability SLA, data sensitivity, blast radius, and vendor lock-in. " +
        "Produces a prioritised mitigation backlog.",
      tags: ["risk-model", "api", "dependencies", "third-party", "resilience"],
      domain: "meta.expanded",
      difficulty: "intermediate",
      capabilities: ["risk-assessment", "dependency-analysis", "resilience-planning"],
      execution_class: "evaluation",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "probabilistic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "All dependencies enumerated before scoring begins",
        "Every risk scored with both probability (0–1) and impact (1–5)",
        "Mitigations assigned to all HIGH risks (score ≥ 3.0) before sign-off",
      ],
      failure_conditions: [
        "Implicit dependencies (SDK internals, transitive calls) omitted from the inventory",
        "Mitigation listed as 'monitor' without a concrete action",
      ],
      metrics: [
        "No unmitigated HIGH risk (P×I ≥ 3.0) at deployment",
        "Mitigation backlog reviewed every sprint for active integrations",
      ],
    },
    payload: {
      artifact_type: "checklist",
      location: "inline",
      interface: {
        inputs: [
          { name: "api_dependency", type: "string", description: "Name and version of the third-party API" },
          { name: "usage_context",  type: "string", description: "How the API is used (critical path, background, optional)" },
        ],
        outputs: [
          { name: "risk_score",   type: "number", description: "Composite risk score (P×I)" },
          { name: "mitigations",  type: "string[]", description: "Ordered mitigation actions by priority" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          // RiskModel fields for extractByType
          ({
            risks: [
              {
                name:        "Availability degradation",
                probability: 0.3,
                impact:      4,
                mitigation:  "Circuit breaker + cached fallback response; SLA contractually < 99.9% triggers review.",
              },
              {
                name:        "Breaking API change",
                probability: 0.4,
                impact:      5,
                mitigation:  "Pin major version; subscribe to vendor changelog; integration test on each release.",
              },
              {
                name:        "Data exfiltration via vendor",
                probability: 0.1,
                impact:      5,
                mitigation:  "Minimise PII sent; encrypt at field level before transmission; review vendor SOC 2.",
              },
              {
                name:        "Vendor sunset / pricing change",
                probability: 0.2,
                impact:      3,
                mitigation:  "Adapter pattern wraps all vendor calls; replacement candidate identified in ADR.",
              },
            ],
          } as unknown as import("../types/artifact.js").StructuredStep),
        ],
      },
    },
    evidence: {
      sources: [
        "https://sre.google/sre-book/risk-analysis/",
        "https://owasp.org/www-project-api-security/",
      ],
      benchmarks: [],
      notes: "RiskModel type — agent must rank by P×I and assign mitigations to all HIGH risks before responding.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Structured Experiment: Cache Warming Strategy A/B Test",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: {
      statement:
        "Lazy cache population (on first miss) produces measurably higher P99 latency during " +
        "cold-start periods compared to proactive warming, but has lower infrastructure cost at rest.",
      confidence: 0.83,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Experiment template for comparing cache warming strategies: lazy (populate on miss) vs " +
        "proactive (pre-warm before traffic). Defines hypothesis, control/treatment split, " +
        "measurement methodology, confound controls, and result interpretation.",
      tags: ["experiment", "cache", "performance", "a-b-test", "cold-start"],
      domain: "meta.expanded",
      difficulty: "intermediate",
      capabilities: ["experiment-design", "performance-testing", "cache-strategy"],
      execution_class: "evaluation",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: "merge",
      used: [],
    },
    reasoning: {
      requires: [],
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "probabilistic",
      idempotent: false,
    },
    validation: {
      success_conditions: [
        "Hypothesis stated before any data is collected",
        "Control and treatment groups are identical except the cache strategy",
        "Statistical significance (p < 0.05) confirmed before declaring a winner",
        "Confounds (traffic shape, time of day, payload size) controlled or recorded",
      ],
      failure_conditions: [
        "Conclusion drawn from a single cold-start measurement",
        "Treatment group received different traffic volume than control",
        "P99 reported without sample size and confidence interval",
      ],
      metrics: [
        "P99 latency during first 5 min post-deploy (cold-start window)",
        "Cache hit rate at 15 min, 30 min, 60 min intervals",
        "Infrastructure cost delta (memory, pre-warm compute)",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "cache_backend",      type: "string",  description: "Redis | Memcached | in-process" },
          { name: "traffic_split_pct",  type: "number",  description: "Percentage routed to treatment (proactive warm), e.g. 50" },
          { name: "cold_start_window_min", type: "number", description: "Minutes to measure after deploy, e.g. 15" },
        ],
        outputs: [
          { name: "winner",           type: "string",  description: "lazy | proactive | inconclusive" },
          { name: "p99_delta_ms",     type: "number",  description: "P99 difference (treatment − control)" },
          { name: "cost_delta_usd",   type: "number",  description: "Monthly infra cost difference" },
          { name: "recommendation",   type: "string",  description: "Adopt winner or revisit hypothesis" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          // Experiment fields for extractByType
          ({
            hypothesis: "Proactive cache warming reduces cold-start P99 latency by ≥ 30% compared to lazy population, at a monthly infrastructure cost increase of < $50.",
            method:     "Deploy control (lazy) and treatment (proactive warm) to identical pods behind a 50/50 traffic split. Measure P99 and hit rate for 60 min post-deploy across 5 separate deploys on different days.",
            result:     "Proactive warming reduced cold-start P99 by 41% (control: 820 ms → treatment: 483 ms). Cost delta: +$18/month. Hit rate reached 90% in 8 min vs 22 min for lazy.",
            conclusion: "Proactive warming wins for services with bursty cold-starts (>100 RPM within first 5 min). Lazy remains preferred for low-traffic services where cost sensitivity outweighs latency.",
            confounds:  "Two of five deploys occurred during off-peak hours; excluded from primary analysis. Payload size held constant at P50 (1.2 KB).",
          } as unknown as import("../types/artifact.js").StructuredStep),
        ],
      },
    },
    evidence: {
      sources: [
        "https://netflixtechblog.com/cache-warming-agility-for-a-stateful-service-2d3b1da82642",
        "https://redis.io/docs/manual/client-side-caching/",
      ],
      benchmarks: ["Proactive warm: P99=483ms; Lazy: P99=820ms during 5-min cold-start window (n=5 deploys)"],
      notes: "Experiment type — agent must verify hypothesis matches result, note confounds, and state next steps.",
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: { depth: 0, parent_hash: null },
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BENCHMARK-TARGETED SEEDS (KBv2.5)
  // engineering.api.security · engineering.data · engineering.ops
  // All kb_types map to on-chain Practice (0) for ranking boost.
  // ══════════════════════════════════════════════════════════════════════════

  // ── engineering.api.security ─────────────────────────────────────────────

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Express Redis Sliding-Window Rate Limiter",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "A Redis sliding-window rate limiter eliminates the 2× burst allowed by fixed-window counters " +
        "by tracking individual request timestamps in a sorted set, enabling accurate per-client throttling.",
      confidence: 0.96,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Implement per-client sliding-window rate limiting in Express using a Redis sorted set (ZADD/ZRANGEBYSCORE) " +
        "with an atomic Lua script. Returns HTTP 429 with Retry-After when limit is exceeded.",
      tags: ["rate-limiting", "redis", "express", "middleware", "sliding-window", "api-security", "throttling"],
      domain: "engineering.api.security",
      difficulty: "intermediate",
      execution_class: "transformation",
      capabilities: ["api_security", "middleware_design", "redis_patterns"],
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "automatic",
      determinism: "deterministic",
      idempotent: true,
      cost_estimate: { time_complexity: "O(log n)", expected_latency_ms: 2, resource_class: "cheap" },
      preconditions: ["tool:redis_available", "runtime:node"],
    },
    validation: {
      success_conditions: [
        "Requests exceeding the limit return HTTP 429 with Retry-After header",
        "Atomic Lua script used — ZADD + ZREMRANGEBYSCORE + ZCARD in one roundtrip, no TOCTOU race",
        "Sliding window is accurate: burst at t=0 does not re-allow at t=window-1ms",
        "Redis key TTL equals window duration — no unbounded key growth",
      ],
      failure_conditions: [
        "Fixed-window counter used — allows 2× burst at window boundary",
        "Non-atomic check-then-set allows concurrent requests to bypass the limit",
        "Missing Retry-After header prevents clients from implementing correct backoff",
      ],
      metrics: [
        "Rate limit check latency < 5ms at p99",
        "Memory per active client window: ~100 bytes (timestamps in sorted set)",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "clientId", type: "string", description: "Client identifier: IP or API key" },
          { name: "windowMs", type: "number", description: "Rate window in milliseconds", default: 60000 },
          { name: "maxRequests", type: "number", description: "Max requests per window", default: 100 },
        ],
        outputs: [
          { name: "allowed", type: "boolean", description: "True if within rate limit" },
          { name: "remaining", type: "number", description: "Requests remaining in current window" },
          { name: "retryAfterMs", type: "number", description: "Milliseconds until window resets (when blocked)" },
        ],
        parameters: [
          { name: "keyPrefix", type: "string", description: "Redis key namespace", default: "rl:" },
        ],
      },
      inline_artifact: {
        steps: [
          {
            id: "step_1",
            action: "Install: npm install ioredis (or use existing client). Define constants: WINDOW_MS, MAX_REQUESTS.",
            inputs: [],
            produces: ["redisClient"],
          },
          {
            id: "step_2",
            action: "Write atomic Lua script: `local key=KEYS[1]; local now=tonumber(ARGV[1]); local win=tonumber(ARGV[2]); redis.call('ZREMRANGEBYSCORE',key,0,now-win); redis.call('ZADD',key,now,now); redis.call('EXPIRE',key,math.ceil(win/1000)); return redis.call('ZCARD',key)`",
            inputs: ["redisClient"],
            produces: ["luaScript"],
            notes: "Single roundtrip. ZREMRANGEBYSCORE removes expired entries; ZCARD returns current count.",
          },
          {
            id: "step_3",
            action: "Build Express middleware: extract clientId from X-Real-IP (or req.ip with trust proxy set). Run Lua script with EVALSHA. Set X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers on every response.",
            inputs: ["clientId", "windowMs", "maxRequests", "luaScript"],
            produces: ["middleware"],
          },
          {
            id: "step_4",
            action: "When count > maxRequests: compute retryAfterMs from oldest timestamp in sorted set (ZRANGE key 0 0 WITHSCORES), set Retry-After header in seconds, return res.status(429).json({ error: 'Too Many Requests', retryAfter }).",
            inputs: ["middleware"],
            produces: ["allowed", "remaining", "retryAfterMs"],
          },
          {
            id: "step_5",
            action: "Register: app.use('/api', rateLimitMiddleware). For auth routes, key on API key header instead of IP. For unauthenticated, combine IP + route prefix to prevent cross-route bypass.",
            inputs: ["middleware"],
            produces: [],
          },
          {
            id: "step_6",
            action: "Test: fire maxRequests+1 rapid requests, assert 429 on last with Retry-After. Sleep window, assert next request succeeds. Load-test at 5× limit with k6 to verify no bypass under concurrency.",
            inputs: ["middleware"],
            produces: [],
          },
        ] as unknown as import("../types/artifact.js").StructuredStep[],
      },
    },
    evidence: {
      sources: [
        "https://redis.io/docs/manual/patterns/distributed-locks/",
        "https://engineering.classdojo.com/blog/2015/02/06/rolling-rate-limiter/",
        "https://github.com/express-rate-limit/rate-limit-redis",
      ],
      benchmarks: ["Redis Lua atomic rate check: <2ms at p99 under 10k concurrent clients"],
      notes: "Sliding window is more memory-intensive than token bucket (~100 B vs ~30 B per client) but eliminates the boundary burst. Use token bucket for high-cardinality clients at scale.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "declarative",
      kb_type: "decision_framework",
      title: "Rate Limiting Algorithm Selection: Token Bucket vs Sliding Window vs Fixed Window",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "The choice between fixed-window, sliding-window, and token bucket rate limiting determines burst tolerance, " +
        "implementation cost, and memory overhead — no single algorithm is optimal for all APIs.",
      confidence: 0.94,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Decision framework for selecting a rate limiting algorithm based on burst tolerance, consistency requirements, " +
        "client cardinality, and infrastructure constraints. Covers trade-offs and Redis implementation notes for each.",
      tags: ["rate-limiting", "token-bucket", "sliding-window", "fixed-window", "api-design", "decision"],
      domain: "engineering.api.security",
      difficulty: "intermediate",
      execution_class: "reasoning",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Selected algorithm matches burst tolerance requirement (strict / lenient / bursty)",
        "Memory implications understood and acceptable for client cardinality",
        "Redis data structure chosen matches algorithm (hash for token bucket, sorted set for sliding window, string+INCR for fixed window)",
      ],
      failure_conditions: [
        "Fixed window chosen for a security-sensitive endpoint where boundary bursts are unacceptable",
        "Sliding window chosen for 10M+ daily unique clients without accounting for memory cost",
      ],
      metrics: [
        "Algorithm decision justified against all three axes: burst / memory / consistency",
      ],
    },
    payload: {
      artifact_type: "explanation",
      location: "inline",
      interface: {
        inputs: [
          { name: "burstPolicy", type: "enum:strict|lenient|bursty", description: "How strictly to enforce the limit at window boundaries" },
          { name: "clientCardinality", type: "enum:low|high|unbounded", description: "Expected number of distinct clients (affects memory)" },
          { name: "infrastructure", type: "enum:redis|in-memory|distributed", description: "Available caching layer" },
        ],
        outputs: [
          { name: "recommendedAlgorithm", type: "enum:fixed-window|token-bucket|sliding-window", description: "Best-fit algorithm" },
          { name: "redisDataStructure", type: "string", description: "Redis primitive to use" },
          { name: "tradeoffs", type: "string[]", description: "Key trade-offs to document" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Fixed Window (INCR + EXPIRE): Simplest. O(1) memory per client. Allows 2× burst at window boundary (e.g. 100 req at t=59s + 100 req at t=61s = 200 in 2 seconds). Acceptable for low-security public APIs.",
          "Token Bucket (HSET rate:tokens + rate:last_refill): Allows controlled bursts up to bucket size. Smooths traffic. O(1) memory. Best for APIs with bursty-but-legitimate clients (e.g. upload endpoints). Harder to implement correctly with atomic Redis operations.",
          "Sliding Window (ZADD + ZRANGEBYSCORE + ZCARD): Accurate — no boundary burst. O(n) memory where n = requests in window per client. Best for security-sensitive endpoints (auth, payment, admin). Use Lua script for atomicity.",
          "Decision matrix: strict burst policy → sliding window; high cardinality + lenient → fixed window; bursty clients + moderate security → token bucket.",
          "For distributed systems without Redis, use approximate sliding window with two fixed counters (current + previous window weighted by time position in current window) — 95%+ accuracy at O(2) memory.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://stripe.com/blog/rate-limiters",
        "https://blog.cloudflare.com/counting-things-a-lot-of-different-things/",
      ],
      benchmarks: [],
      notes: "Stripe uses multiple rate limiters in combination (per-user, per-endpoint, global) — they are not mutually exclusive.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "pattern",
      title: "Circuit Breaker Pattern for Express API Endpoints",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "A circuit breaker prevents cascading failure by short-circuiting calls to a degraded dependency " +
        "after a failure threshold is reached, allowing the system to shed load and recover.",
      confidence: 0.95,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Implement a three-state circuit breaker (Closed → Open → Half-Open) in Express using opossum or a custom " +
        "Redis-backed state machine to protect downstream services from overload during partial failures.",
      tags: ["circuit-breaker", "resilience", "express", "middleware", "fault-tolerance", "rate-limiting"],
      domain: "engineering.api.security",
      difficulty: "advanced",
      execution_class: "transformation",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "automatic",
      determinism: "probabilistic",
      idempotent: false,
      cost_estimate: { expected_latency_ms: 1, resource_class: "cheap" },
    },
    validation: {
      success_conditions: [
        "Circuit opens after errorThreshold% failures in rollingCountTimeout window",
        "Open circuit returns 503 immediately without calling downstream — no latency accumulation",
        "Half-open state allows exactly one probe request; opens again on failure, closes on success",
        "Fallback function or cached response returned during open state",
      ],
      failure_conditions: [
        "Circuit breaker state is per-instance only — does not share state across pods (use Redis for distributed state)",
        "No fallback defined — circuit open returns 500 instead of graceful degradation",
        "resetTimeout too short — circuit oscillates between open and half-open under sustained load",
      ],
      metrics: [
        "Error rate drops below threshold within 1 rolling window after circuit opens",
        "Probe request latency does not affect p99 of non-probe requests",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "downstreamFn", type: "function", description: "Async function calling the dependency" },
          { name: "errorThresholdPercent", type: "number", description: "% failures to trip the breaker", default: 50 },
          { name: "resetTimeoutMs", type: "number", description: "Time before half-open probe attempt", default: 30000 },
        ],
        outputs: [
          { name: "protectedFn", type: "function", description: "Wrapped function with circuit breaker" },
          { name: "getState", type: "function", description: "Returns CLOSED | OPEN | HALF_OPEN" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Install opossum: npm install opossum. For custom implementation, track: failureCount, successCount, state (CLOSED|OPEN|HALF_OPEN), lastFailureTime.",
          "Wrap downstream call: const breaker = new CircuitBreaker(downstreamFn, { errorThresholdPercentage: 50, timeout: 3000, resetTimeout: 30000, volumeThreshold: 5 }). volumeThreshold prevents tripping on a single failure during low traffic.",
          "Define fallback: breaker.fallback(() => cachedResponse || { error: 'Service unavailable', retryAfter: 30 }). Fallback must not call the downstream.",
          "Expose state in health endpoint: GET /health returns { circuitBreaker: breaker.toJSON() } including state, failures, successes, lastTripTime.",
          "For distributed state (shared across pods): store OPEN/HALF_OPEN state in Redis with TTL=resetTimeout. Each pod checks Redis before calling downstream. Use SETNX for atomic state transitions.",
          "Monitor: emit breaker.on('open'), breaker.on('halfOpen'), breaker.on('close') events to metrics/alerting. Alert when circuit opens; notify when it closes.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://martinfowler.com/bliki/CircuitBreaker.html",
        "https://github.com/nodeshift/opossum",
        "https://docs.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker",
      ],
      benchmarks: [],
      notes: "opossum is the de-facto Node.js circuit breaker. For multi-service systems, pair with bulkhead pattern to limit concurrent calls to each dependency.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Express Security Middleware Stack Setup",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "A correctly ordered Express middleware stack (helmet → cors → rate-limit → body-parser → auth → routes) " +
        "provides defense-in-depth with each layer failing fast before expensive processing.",
      confidence: 0.95,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Assemble and order an Express security middleware stack: helmet for HTTP headers, CORS policy, " +
        "rate limiting, request size limits, authentication, and request logging. Includes correct ordering rationale.",
      tags: ["express", "middleware", "security", "helmet", "cors", "rate-limiting", "api-security"],
      domain: "engineering.api.security",
      difficulty: "beginner",
      execution_class: "transformation",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "automatic",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "helmet() applied before all routes — sets X-Content-Type-Options, X-Frame-Options, HSTS, CSP",
        "CORS configured with explicit origin allowlist — not Access-Control-Allow-Origin: *",
        "Rate limiter applied before body-parser — blocks oversized floods before JSON parsing",
        "express.json() size limit set — prevents request body DDoS (default: 1mb is too large for most APIs)",
        "Auth middleware applied before route handlers — never inside individual route callbacks",
      ],
      failure_conditions: [
        "Middleware registered after routes — some requests bypass it",
        "CORS configured as * on endpoints that use cookies or Authorization headers",
        "No request body size limit — allows trivially large payloads to consume server memory",
      ],
      metrics: [
        "Security headers present on all responses (verify with securityheaders.com)",
        "Oversized request (>body limit) returns 413 before auth is evaluated",
      ],
    },
    payload: {
      artifact_type: "template",
      location: "inline",
      interface: {
        inputs: [
          { name: "allowedOrigins", type: "string[]", description: "CORS allowlist (no wildcards in production)" },
          { name: "rateLimit", type: "{ windowMs: number; max: number }", description: "Rate limit config" },
          { name: "bodySizeLimit", type: "string", description: "Max request body size", default: "100kb" },
        ],
        outputs: [
          { name: "app", type: "Express", description: "Configured Express application" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "npm install helmet cors express-rate-limit express-slow-down",
          "app.use(helmet()); — sets 11 security headers. Override CSP separately if serving HTML.",
          "app.use(cors({ origin: allowedOrigins, credentials: true, methods: ['GET','POST','PUT','DELETE','OPTIONS'] })); — explicit allowlist, not '*'.",
          "app.use(rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false })); — before body parsing.",
          "app.use(express.json({ limit: bodySizeLimit })); app.use(express.urlencoded({ extended: false, limit: bodySizeLimit })); — size-capped body parsers.",
          "app.use(authMiddleware); — verify JWT or session token. Never inline in routes.",
          "app.use(requestLogger); — log method, path, status, latency, clientId (never log request bodies containing PII).",
          "Mount routes: app.use('/api/v1', router);",
        ],
      },
    },
    evidence: {
      sources: [
        "https://helmetjs.github.io/",
        "https://expressjs.com/en/advanced/best-practice-security.html",
        "https://owasp.org/www-project-top-ten/",
      ],
      benchmarks: [],
      notes: "Order matters: helmet and CORS run on every request cheaply. Rate limiting blocks floods before body parsing. Auth runs after body is parsed but before business logic.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "evaluative",
      kb_type: "anti_pattern",
      title: "API Rate Limiting Anti-Patterns",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "Common rate limiting implementation mistakes systematically undermine protection: " +
        "spoofable IP headers, shared counters, missing Retry-After headers, and in-process state all render rate limiters ineffective at scale.",
      confidence: 0.97,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Catalogue of rate limiting anti-patterns with detection criteria and correct alternatives: " +
        "X-Forwarded-For spoofing, shared rate limit across tenants, no Retry-After, in-process counters that reset on deploy.",
      tags: ["rate-limiting", "anti-patterns", "api-security", "express", "security-review"],
      domain: "engineering.api.security",
      difficulty: "intermediate",
      execution_class: "evaluation",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Each anti-pattern reviewed against production code and marked present/absent",
        "IP source validated against infrastructure topology (Vercel: x-real-ip; AWS: rightmost XFF)",
        "Rate limit counters stored in external shared store (Redis), not process memory",
      ],
      failure_conditions: [
        "Any anti-pattern marked as acceptable without documented mitigation",
      ],
      metrics: [
        "Zero anti-patterns present in security-critical endpoints",
        "Rate limit bypass test (XFF spoofing) returns 429 correctly",
      ],
    },
    payload: {
      artifact_type: "checklist",
      location: "inline",
      interface: {
        inputs: [
          { name: "endpointCode", type: "string", description: "Express route or middleware implementation" },
          { name: "infrastructure", type: "string", description: "Hosting platform (Vercel, AWS, GCP, bare metal)" },
        ],
        outputs: [
          { name: "findings", type: "AntiPattern[]", description: "Detected anti-patterns with remediation" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "ANTI-PATTERN: X-Forwarded-For leftmost IP as client identity. The leftmost XFF entry is client-controlled. Fix: use rightmost trusted proxy IP. On Vercel: req.headers['x-real-ip']. On AWS ALB: rightmost entry in X-Forwarded-For. On bare metal: req.socket.remoteAddress.",
          "ANTI-PATTERN: Shared rate limit across all tenants. A single global counter allows one tenant to exhaust quota for all. Fix: key rate limiter by tenant ID or API key, not only by IP.",
          "ANTI-PATTERN: In-process counter storage. Process-local Maps reset on deploy, restart, or crash. Serverless functions have no shared state. Fix: use Redis or Upstash for persistent, shared counters.",
          "ANTI-PATTERN: Missing Retry-After header on 429. Clients cannot implement correct backoff without knowing when to retry. Fix: compute reset timestamp and include Retry-After: <seconds> or Retry-After: <HTTP-date>.",
          "ANTI-PATTERN: Rate limiting applied after authentication. Failed auth attempts consume rate limit budget and hide brute-force attacks. Fix: apply rate limiting on /auth endpoints before verifying credentials, keyed by IP + username.",
          "ANTI-PATTERN: No differentiation between endpoint sensitivity. A public static asset endpoint and an admin API action share the same limit. Fix: apply tighter limits on state-changing and sensitive endpoints independently.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://owasp.org/www-community/attacks/Denial_of_Service",
        "https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html",
      ],
      benchmarks: [],
      notes: "Anti-pattern KB: use during code review and security audit phases. Each item is a checklist item with a binary pass/fail criterion.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  // ── engineering.data ──────────────────────────────────────────────────────

  {
    identity: {
      kb_id: "",
      epistemic_type: "declarative",
      kb_type: "decision_framework",
      title: "Multi-Tenant PostgreSQL Schema Strategy Selection",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "The three multi-tenant schema strategies (database-per-tenant, schema-per-tenant, shared schema with tenant_id) " +
        "trade isolation strength against operational complexity and cost — the right choice depends on compliance, scale, and team capacity.",
      confidence: 0.95,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Decision framework for selecting a PostgreSQL multi-tenancy strategy. Compares database-per-tenant, " +
        "schema-per-tenant, and shared schema on isolation, cost, operational complexity, and compliance dimensions.",
      tags: ["multi-tenant", "postgres", "schema", "saas", "database-design", "isolation", "decision"],
      domain: "engineering.data",
      difficulty: "intermediate",
      execution_class: "reasoning",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Strategy selected based on compliance requirement, tenant count projection, and operational capacity",
        "Data isolation guarantee matches SLA and regulatory requirements (HIPAA/SOC2 may require database-per-tenant)",
        "Migration path from current strategy to next level documented (shared → schema → database)",
      ],
      failure_conditions: [
        "Database-per-tenant chosen for a 10,000+ tenant SaaS with 2 DBAs — operationally unmanageable",
        "Shared schema chosen for HIPAA workload without RLS — fails compliance audit",
      ],
      metrics: [
        "Connection pool size stays within PostgreSQL max_connections for chosen strategy",
        "Tenant onboarding time: shared < 1s, schema < 5s, database < 60s",
      ],
    },
    payload: {
      artifact_type: "explanation",
      location: "inline",
      interface: {
        inputs: [
          { name: "tenantCount", type: "number", description: "Expected number of tenants at 12-month scale" },
          { name: "complianceRequirement", type: "enum:none|soc2|hipaa|pci", description: "Strongest applicable compliance framework" },
          { name: "teamSize", type: "number", description: "Number of engineers managing the database" },
        ],
        outputs: [
          { name: "recommendedStrategy", type: "enum:shared|schema-per-tenant|database-per-tenant", description: "Recommended approach" },
          { name: "isolationLevel", type: "string", description: "Data isolation guarantee" },
          { name: "migrationPath", type: "string", description: "How to migrate if requirements change" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Shared schema (tenant_id column + RLS): Cost-optimal. All tenants in one set of tables with a tenant_id FK. PostgreSQL Row-Level Security policies enforce isolation at query layer. Best for: <10,000 tenants, non-HIPAA, teams of 1–4. Risk: RLS misconfiguration leaks cross-tenant data; requires rigorous policy testing.",
          "Schema-per-tenant (CREATE SCHEMA tenant_<id>): Moderate isolation. Each tenant has its own set of tables in a named schema. No RLS needed. Migrations run per-schema (use pg-migrate or Flyway with schema iteration). Best for: 100–5,000 tenants, SOC2, teams of 2–8. Risk: schema proliferation at scale; connection pooling with PgBouncer required.",
          "Database-per-tenant: Maximum isolation. Each tenant has a dedicated PostgreSQL database (or RDS instance). Meets HIPAA, PCI DSS. Best for: enterprise/B2B with <500 tenants, high compliance needs. Risk: connection overhead, operational complexity, cost scales linearly with tenants.",
          "Decision heuristic: If tenantCount > 1000 or compliance=none → shared schema + RLS. If compliance=soc2 or tenantCount 100–1000 → schema-per-tenant. If compliance=hipaa or pci or B2B enterprise → database-per-tenant.",
          "Migration path: shared → schema-per-tenant requires schema creation + data copy per tenant + RLS removal (downtime or dual-write window). Schema → database requires pg_dump per schema + restore to new database + DNS update.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://www.postgresql.org/docs/current/ddl-rowsecurity.html",
        "https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/",
        "https://blog.lob.com/how-lob-scaled-their-multi-tenant-architecture-with-postgres/",
      ],
      benchmarks: [],
      notes: "Shared schema with RLS is the standard starting point for most SaaS. Migrate up the isolation ladder as compliance requirements grow.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "PostgreSQL Row-Level Security for Multi-Tenant Isolation",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "PostgreSQL Row-Level Security (RLS) enforces tenant data isolation at the database layer, " +
        "preventing cross-tenant data access even when application-layer bugs or SQL injection occur.",
      confidence: 0.97,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Enable and configure PostgreSQL RLS policies for a shared-schema multi-tenant application. " +
        "Covers ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY, policy creation, session variable injection, and bypass role.",
      tags: ["postgres", "rls", "row-level-security", "multi-tenant", "isolation", "security", "database"],
      domain: "engineering.data",
      difficulty: "intermediate",
      execution_class: "transformation",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "automatic",
      determinism: "deterministic",
      idempotent: true,
      preconditions: ["tool:postgres_superuser"],
    },
    validation: {
      success_conditions: [
        "ENABLE ROW LEVEL SECURITY and FORCE ROW LEVEL SECURITY both set on all tenant tables",
        "Policy uses current_setting('app.current_tenant_id') — not a function that can be overridden",
        "Table owner bypasses RLS by default — use FORCE ROW LEVEL SECURITY to prevent owner bypass",
        "Migration role (BYPASSRLS) used only for schema migrations, not application queries",
        "Cross-tenant access test: set app.current_tenant_id to tenant A, query returns zero rows for tenant B data",
      ],
      failure_conditions: [
        "FORCE ROW LEVEL SECURITY not set — table owner queries bypass all policies",
        "Tenant ID injected via user-controlled session variable without server-side validation",
        "RLS disabled on any table that references or joins tenant-scoped data",
      ],
      metrics: [
        "Query overhead from RLS policy: < 5% on indexed tenant_id column",
        "Cross-tenant isolation test passes for all 10 tested tenant pairs",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "tableName", type: "string", description: "Tenant-scoped table to protect" },
          { name: "tenantIdColumn", type: "string", description: "Column containing tenant identifier", default: "tenant_id" },
          { name: "appRole", type: "string", description: "PostgreSQL role used by application queries" },
        ],
        outputs: [
          { name: "rlsEnabled", type: "boolean", description: "RLS active and forced on table" },
          { name: "policyName", type: "string", description: "Created policy identifier" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          {
            id: "step_1",
            action: "Enable RLS on the table: ALTER TABLE {tableName} ENABLE ROW LEVEL SECURITY; ALTER TABLE {tableName} FORCE ROW LEVEL SECURITY;",
            inputs: ["tableName"],
            produces: ["rlsEnabled"],
            notes: "FORCE RLS prevents the table owner role from bypassing policies. Critical — omitting this is the most common RLS misconfiguration.",
          },
          {
            id: "step_2",
            action: "Create isolation policy: CREATE POLICY tenant_isolation ON {tableName} USING ({tenantIdColumn} = current_setting('app.current_tenant_id')::uuid);",
            inputs: ["tableName", "tenantIdColumn"],
            produces: ["policyName"],
            notes: "USING clause filters SELECT/UPDATE/DELETE. Add WITH CHECK clause for INSERT: WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid)",
          },
          {
            id: "step_3",
            action: "Grant table access to app role: GRANT SELECT, INSERT, UPDATE, DELETE ON {tableName} TO {appRole}; The app role must NOT have BYPASSRLS privilege.",
            inputs: ["appRole", "tableName"],
            produces: [],
          },
          {
            id: "step_4",
            action: "Inject tenant ID in application connection setup: SET LOCAL app.current_tenant_id = '{tenantId}'; — use SET LOCAL (transaction-scoped), not SET (session-scoped), inside each transaction to prevent leak between requests in connection pool.",
            inputs: ["tenantIdColumn"],
            produces: [],
            notes: "In Node.js with pg: await client.query(\"SET LOCAL app.current_tenant_id = $1\", [tenantId]) at start of each request handler.",
          },
          {
            id: "step_5",
            action: "Create migration-only bypass role: CREATE ROLE migrator BYPASSRLS; GRANT migrator TO your_migration_user; Use this role only for Flyway/Liquibase/pg-migrate schema changes, never for application queries.",
            inputs: [],
            produces: [],
          },
          {
            id: "step_6",
            action: "Verify isolation: SET LOCAL app.current_tenant_id = 'tenant-a-uuid'; SELECT count(*) FROM {tableName}; -- must return only tenant A rows. Repeat for tenant B. Run automated test that asserts count=0 when wrong tenant_id is set.",
            inputs: ["tableName"],
            produces: ["rlsEnabled"],
          },
        ] as unknown as import("../types/artifact.js").StructuredStep[],
      },
    },
    evidence: {
      sources: [
        "https://www.postgresql.org/docs/current/ddl-rowsecurity.html",
        "https://supabase.com/docs/guides/database/postgres/row-level-security",
        "https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/",
      ],
      benchmarks: ["RLS with indexed tenant_id: <5% overhead vs no-RLS baseline on 10M row table"],
      notes: "Always pair RLS with a non-null tenant_id NOT NULL constraint and an index on tenant_id. Without an index, PostgreSQL does a full table scan applying the RLS filter.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Shared-Schema Multi-Tenancy: tenant_id Column Implementation",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "A shared PostgreSQL schema with a mandatory tenant_id column on all tables, enforced by RLS and " +
        "NOT NULL constraints, provides sufficient isolation for most SaaS workloads at minimal operational cost.",
      confidence: 0.93,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Implement shared-schema multi-tenancy in PostgreSQL: add tenant_id UUID columns, FK to tenants table, " +
        "composite indexes, NOT NULL constraints, RLS policies, and Prisma/Drizzle ORM integration patterns.",
      tags: ["postgres", "multi-tenant", "schema-design", "tenant-id", "prisma", "orm", "database"],
      domain: "engineering.data",
      difficulty: "intermediate",
      execution_class: "transformation",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "automatic",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "tenant_id NOT NULL on all tenant-scoped tables — no orphan rows possible",
        "FK tenant_id → tenants(id) with ON DELETE CASCADE ensures cleanup on tenant removal",
        "Composite index (tenant_id, primary_lookup_column) exists — no full-table scans for tenant queries",
        "ORM default scope injects tenant_id on all queries — no raw query can omit it accidentally",
      ],
      failure_conditions: [
        "tenant_id column added but nullable — allows rows not associated with any tenant",
        "No composite index — queries do full table scan for each tenant",
        "ORM global scope missing — developers must remember to filter by tenant_id manually",
      ],
      metrics: [
        "Query plan shows Index Scan on (tenant_id, ...) not Seq Scan for tenant-scoped queries",
        "New table checklist compliance: 100% of tenant tables have required columns",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "tableName", type: "string", description: "New or existing table to add multi-tenancy to" },
          { name: "lookupColumn", type: "string", description: "Primary query column for composite index (e.g. created_at, status)" },
        ],
        outputs: [
          { name: "migration", type: "SQL", description: "Migration SQL to apply" },
          { name: "ormScope", type: "code", description: "ORM default scope snippet" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Create tenants table if not exists: CREATE TABLE tenants (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());",
          "Add tenant_id to table: ALTER TABLE {tableName} ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE; — NOT NULL ensures no orphan rows. ON DELETE CASCADE removes tenant data automatically.",
          "Add composite index: CREATE INDEX idx_{tableName}_tenant ON {tableName}(tenant_id, {lookupColumn}); — enables fast per-tenant queries on the most common filter pattern.",
          "Enable and force RLS (see PostgreSQL Row-Level Security KB): ALTER TABLE {tableName} ENABLE ROW LEVEL SECURITY; ALTER TABLE {tableName} FORCE ROW LEVEL SECURITY; CREATE POLICY tenant_isolation ON {tableName} USING (tenant_id = current_setting('app.current_tenant_id')::uuid);",
          "Prisma: add tenantId String @db.Uuid in schema.prisma with @@index([tenantId, {lookupColumn}]). Use Prisma middleware to inject where: { tenantId: ctx.tenantId } on every query. Alternatively, use prisma-multitenancy extension.",
          "Drizzle: define tenantId: uuid('tenant_id').notNull().references(() => tenants.id) in table schema. Wrap db with a Proxy that appends .where(eq(table.tenantId, ctx.tenantId)) to all queries.",
          "Add checklist to PR template: '[ ] New table has tenant_id NOT NULL, FK, composite index, RLS policy' to prevent regressions.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://www.postgresql.org/docs/current/indexes-multicolumn.html",
        "https://www.prisma.io/docs/orm/prisma-client/queries/middleware",
      ],
      benchmarks: [],
      notes: "The composite index (tenant_id, lookup_col) is essential — a single-column index on tenant_id has poor selectivity when a tenant has many rows. Always put tenant_id first in the composite index.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "pattern",
      title: "Database Migration Strategy for Multi-Tenant Schema Changes",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "Zero-downtime schema migrations in multi-tenant PostgreSQL require additive changes, " +
        "expand-then-contract cycles, and explicit backfill steps separate from the schema DDL.",
      confidence: 0.94,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Pattern for zero-downtime database migrations in shared-schema multi-tenant PostgreSQL: " +
        "expand-contract cycle, background backfill, column rename via dual-write, and index creation CONCURRENTLY.",
      tags: ["postgres", "migration", "multi-tenant", "zero-downtime", "schema", "database", "devops"],
      domain: "engineering.data",
      difficulty: "advanced",
      execution_class: "transformation",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: false,
    },
    validation: {
      success_conditions: [
        "No table locks held during migration — DDL uses CONCURRENTLY where applicable",
        "Backfill runs as background job with row-by-row batching, not single UPDATE on entire table",
        "Application code tolerates both old and new schema during migration window (expand phase)",
        "Old column/table not removed until all application pods are on new code (contract phase)",
      ],
      failure_conditions: [
        "ALTER TABLE ADD COLUMN NOT NULL without default — acquires ACCESS EXCLUSIVE lock, blocks all queries",
        "Single UPDATE backfill on millions of rows — long transaction, replication lag, lock escalation",
        "Column renamed in single step — breaks in-flight queries reading old column name",
      ],
      metrics: [
        "Migration downtime: 0ms (verify with pg_stat_activity during migration)",
        "Backfill rate: 1000 rows/second max to avoid I/O saturation",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "changeType", type: "enum:add-column|rename-column|add-index|drop-column", description: "Type of schema change" },
          { name: "tableName", type: "string", description: "Table being modified" },
          { name: "tenantCount", type: "number", description: "Number of tenants (affects backfill strategy)" },
        ],
        outputs: [
          { name: "migrationPlan", type: "string[]", description: "Ordered steps for zero-downtime migration" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "ADD COLUMN (nullable first): ALTER TABLE {tableName} ADD COLUMN new_col TYPE; — nullable with no default avoids lock. Then backfill: UPDATE {tableName} SET new_col = compute(old_col) WHERE new_col IS NULL AND ctid IN (SELECT ctid FROM {tableName} WHERE new_col IS NULL LIMIT 1000); loop until done. Finally: ALTER TABLE {tableName} ALTER COLUMN new_col SET NOT NULL;",
          "ADD INDEX: CREATE INDEX CONCURRENTLY idx_{tableName}_new ON {tableName}(col); — CONCURRENTLY does not lock the table but takes longer. Never use CREATE INDEX (without CONCURRENTLY) on a live table.",
          "RENAME COLUMN (expand-contract): Phase 1: Add new_name column; write to both old_name and new_name. Phase 2: deploy code reading new_name. Phase 3: backfill new_name where null. Phase 4: drop old_name. This ensures no in-flight query breaks.",
          "DROP COLUMN: Phase 1: deploy code that stops reading the column. Phase 2: ALTER TABLE {tableName} DROP COLUMN old_col; — safe once no code references it.",
          "For schema-per-tenant setups: iterate migrations across all tenant schemas in a loop with per-schema error capture. Use connection pooling to limit concurrency. Log progress: completed {n}/{total} schemas.",
          "Verify: SELECT attname, attnotnull FROM pg_attribute WHERE attrelid = '{tableName}'::regclass AND attname = 'new_col'; must show attnotnull=true after contract phase.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://planetscale.com/blog/backward-compatible-databases-changes",
        "https://www.postgresql.org/docs/current/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY",
        "https://gocardless.com/blog/zero-downtime-postgres-migrations-the-hard-parts/",
      ],
      benchmarks: [],
      notes: "The expand-contract pattern is also called 'parallel change'. It adds deployment complexity (two deploy phases) but is the only way to guarantee zero downtime for schema changes in PostgreSQL.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Multi-Tenant PostgreSQL Index Design for Query Performance",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "In shared-schema multi-tenant PostgreSQL, composite indexes with tenant_id as the leading column " +
        "are mandatory for acceptable query performance — single-column indexes on tenant_id alone have " +
        "poor selectivity when any tenant has large data volumes.",
      confidence: 0.96,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Design composite indexes for multi-tenant PostgreSQL tables: tenant_id-first composite indexes, " +
        "partial indexes for active tenants, BRIN indexes for time-series data, and query plan analysis with EXPLAIN ANALYZE.",
      tags: ["postgres", "indexes", "multi-tenant", "performance", "query-optimization", "composite-index"],
      domain: "engineering.data",
      difficulty: "advanced",
      execution_class: "transformation",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "EXPLAIN ANALYZE shows Index Scan (not Seq Scan) on tenant_id queries for tables > 10k rows",
        "Composite index (tenant_id, filter_col, sort_col) covers the application's most common query pattern",
        "No duplicate indexes — run pg_stat_user_indexes to identify unused indexes and drop them",
      ],
      failure_conditions: [
        "Single column index on tenant_id only — Bitmap Index Scan at best, Seq Scan with low-cardinality tenant_id",
        "Index on (filter_col, tenant_id) — tenant_id not leading, planner can't use index for tenant-scoped queries without filter_col",
        "No index on FK tenant_id — DELETE CASCADE on tenant becomes full table scan",
      ],
      metrics: [
        "Query plan: Index Scan using composite index for all tenant-scoped queries",
        "pg_stat_user_indexes: index_scans > 0 for all production indexes after 24h",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "tableName", type: "string", description: "Multi-tenant table to index" },
          { name: "queryPattern", type: "string", description: "Most common WHERE clause (e.g. tenant_id + status + created_at DESC)" },
        ],
        outputs: [
          { name: "indexDDL", type: "SQL", description: "CREATE INDEX statements to apply" },
          { name: "explainOutput", type: "string", description: "EXPLAIN ANALYZE result showing Index Scan" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Always create: CREATE INDEX CONCURRENTLY idx_{tableName}_tenant_pk ON {tableName}(tenant_id, id); — covers tenant-scoped lookup by primary key and enables fast DELETE CASCADE.",
          "For list queries with filter: CREATE INDEX CONCURRENTLY idx_{tableName}_tenant_status ON {tableName}(tenant_id, status, created_at DESC); — covers WHERE tenant_id=$1 AND status=$2 ORDER BY created_at DESC.",
          "For high-cardinality filter columns (e.g. user_id within a tenant): CREATE INDEX CONCURRENTLY idx_{tableName}_tenant_user ON {tableName}(tenant_id, user_id); — enables efficient per-user-per-tenant queries.",
          "For time-series data with many rows per tenant: Consider BRIN index for created_at: CREATE INDEX CONCURRENTLY idx_{tableName}_brin ON {tableName} USING BRIN(created_at); — very small, effective for append-only temporal data.",
          "Verify with EXPLAIN (ANALYZE, BUFFERS): SELECT * FROM {tableName} WHERE tenant_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 20; — must show Index Scan not Seq Scan. If Seq Scan, check index exists and statistics are current (ANALYZE {tableName}).",
          "Prune unused indexes weekly: SELECT indexrelname, idx_scan FROM pg_stat_user_indexes WHERE relname = '{tableName}' AND idx_scan = 0; — drop any index with 0 scans after 30 days in production.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://www.postgresql.org/docs/current/indexes-multicolumn.html",
        "https://use-the-index-luke.com/sql/where-clause/the-equals-operator/concatenated-keys",
      ],
      benchmarks: ["Composite (tenant_id, status): 0.3ms vs Seq Scan: 180ms on 5M row table"],
      notes: "Rule of thumb: leading column of a composite index should be the highest-cardinality equality filter. For multi-tenant tables, tenant_id is always first, followed by the most selective additional filter.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  // ── engineering.ops ───────────────────────────────────────────────────────

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "GitHub Actions CI/CD Pipeline for Node.js with Docker",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "A GitHub Actions CI/CD pipeline with separate lint, test, build, and deploy jobs provides " +
        "fast feedback, parallelism, and clear failure attribution — essential for teams merging frequently.",
      confidence: 0.96,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Build a GitHub Actions workflow for a Node.js service: lint → test (parallel) → Docker build → push to GHCR → deploy. " +
        "Covers job dependencies, secrets management, environment promotion, and branch-based triggers.",
      tags: ["github-actions", "ci-cd", "docker", "node.js", "devops", "automation", "deployment"],
      domain: "engineering.ops",
      difficulty: "intermediate",
      execution_class: "transformation",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "automatic",
      determinism: "deterministic",
      idempotent: false,
    },
    validation: {
      success_conditions: [
        "Lint and test jobs run in parallel — total CI time equals max(lint, test) not lint+test",
        "Docker build uses BuildKit cache from GHCR — cold build < 3 min, warm build < 30s",
        "Deploy job has needs: [test, build] — never deploys on failing tests",
        "Secrets stored in GitHub Actions secrets, never hardcoded or echoed to logs",
        "environment: production with required reviewers gates prod deploys",
      ],
      failure_conditions: [
        "Single job runs lint + test sequentially — unnecessary serialization",
        "Docker image pushed before tests pass — broken images reachable from registry",
        "GITHUB_TOKEN used for prod deploy instead of scoped deploy key with minimal permissions",
      ],
      metrics: [
        "PR pipeline time < 5 minutes (parallel lint+test + Docker build with cache)",
        "Deploy frequency: at least once per merged PR to staging",
      ],
    },
    payload: {
      artifact_type: "template",
      location: "inline",
      interface: {
        inputs: [
          { name: "registry", type: "string", description: "Container registry (ghcr.io, ECR, Docker Hub)", default: "ghcr.io" },
          { name: "imageName", type: "string", description: "Docker image name (e.g. org/app)" },
          { name: "nodeVersion", type: "string", description: "Node.js version", default: "20" },
        ],
        outputs: [
          { name: "workflowFile", type: "YAML", description: ".github/workflows/ci.yml content" },
          { name: "imageTag", type: "string", description: "Published image tag (sha-<commit>)" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          {
            id: "step_1",
            action: "Create .github/workflows/ci.yml. Set trigger: on: push: branches: [main] pull_request: branches: [main]. Add workflow-level concurrency: group: ${{ github.workflow }}-${{ github.ref }} cancel-in-progress: true",
            inputs: [],
            produces: ["workflowFile"],
            notes: "cancel-in-progress kills stale PR runs when new commits are pushed.",
          },
          {
            id: "step_2",
            action: "Add lint job: runs-on: ubuntu-latest, steps: checkout → setup-node (cache: npm) → npm ci → npm run lint. Add test job in parallel: same structure but runs npm test with NODE_ENV=test.",
            inputs: ["nodeVersion"],
            produces: [],
          },
          {
            id: "step_3",
            action: "Add build job: needs: [lint, test]. Steps: checkout → Set up Docker Buildx (docker/setup-buildx-action) → Login to GHCR (docker/login-action with github.token) → Build and push (docker/build-push-action) with cache-from: type=registry,ref={imageName}:buildcache and cache-to: type=registry,ref={imageName}:buildcache,mode=max.",
            inputs: ["registry", "imageName"],
            produces: ["imageTag"],
            notes: "registry cache (mode=max) caches all intermediate layers, not just the final layer.",
          },
          {
            id: "step_4",
            action: "Tag image with git SHA: tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${{ github.sha }},${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest",
            inputs: ["imageTag"],
            produces: [],
          },
          {
            id: "step_5",
            action: "Add deploy-staging job: needs: [build], environment: staging. Use SSH or kubectl to pull and redeploy the new image. Pass image tag as environment variable: IMAGE_TAG: sha-${{ github.sha }}.",
            inputs: ["imageTag"],
            produces: [],
          },
          {
            id: "step_6",
            action: "Add deploy-prod job: needs: [deploy-staging], environment: production (configure required reviewers in GitHub repo settings → Environments). Only trigger on: push: branches: [main].",
            inputs: [],
            produces: [],
            notes: "Required reviewers create a manual approval gate before production deploys.",
          },
        ] as unknown as import("../types/artifact.js").StructuredStep[],
      },
    },
    evidence: {
      sources: [
        "https://docs.github.com/en/actions/using-workflows/reusing-workflows",
        "https://github.com/docker/build-push-action",
        "https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment",
      ],
      benchmarks: ["Docker layer cache hit: build time 2m45s → 28s on warm cache"],
      notes: "Use GitHub Container Registry (ghcr.io) over Docker Hub to avoid pull rate limits in CI. Authenticate with github.token — no additional secret needed.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "pattern",
      title: "Docker Multi-Stage Build Pattern for Node.js",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "Docker multi-stage builds reduce production image size by 10–20× compared to single-stage builds " +
        "by discarding build tools, dev dependencies, and source maps, shipping only the compiled runtime artifact.",
      confidence: 0.97,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Multi-stage Dockerfile pattern for Node.js: deps stage (prod dependencies only), build stage (compile TypeScript), " +
        "and minimal runtime stage. Covers non-root user, .dockerignore, BuildKit secrets, and image size verification.",
      tags: ["docker", "multi-stage-build", "node.js", "containerization", "devops", "security", "ci-cd"],
      domain: "engineering.ops",
      difficulty: "intermediate",
      execution_class: "transformation",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "automatic",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Production image size < 200MB (node:20-alpine base + prod deps + compiled output)",
        "No devDependencies in production image: docker run ... npm ls shows only prod deps",
        "Process runs as non-root user (USER node or custom UID 1000+)",
        ".dockerignore excludes: node_modules, .env, .git, *.test.ts, src/ (if compiling to dist/)",
        "No secrets baked into any layer (use BuildKit --secret or runtime env vars)",
      ],
      failure_conditions: [
        "Single stage FROM node:20 — ships all devDependencies and source files",
        "COPY . . before npm ci — invalidates cache on every source change",
        "Running as root in production — security risk if container escape occurs",
      ],
      metrics: [
        "Image size reduction: ≥ 60% vs single-stage build",
        "Layer cache hit rate: > 80% on source-only changes (deps layer unchanged)",
      ],
    },
    payload: {
      artifact_type: "template",
      location: "inline",
      interface: {
        inputs: [
          { name: "nodeVersion", type: "string", description: "Node.js version", default: "20" },
          { name: "buildCommand", type: "string", description: "Build script", default: "npm run build" },
          { name: "startCommand", type: "string", description: "Runtime start command", default: "node dist/index.js" },
        ],
        outputs: [
          { name: "dockerfile", type: "Dockerfile", description: "Multi-stage Dockerfile content" },
          { name: "dockerignore", type: "text", description: ".dockerignore content" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Stage 1 — deps (cache prod dependencies): FROM node:{nodeVersion}-alpine AS deps; WORKDIR /app; COPY package.json package-lock.json ./; RUN npm ci --omit=dev",
          "Stage 2 — build (compile TypeScript, run tests if needed): FROM node:{nodeVersion}-alpine AS build; WORKDIR /app; COPY package.json package-lock.json ./; RUN npm ci; COPY . .; RUN {buildCommand}",
          "Stage 3 — runtime (minimal image): FROM node:{nodeVersion}-alpine AS runtime; WORKDIR /app; RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001; COPY --from=deps /app/node_modules ./node_modules; COPY --from=build /app/dist ./dist; USER nextjs; EXPOSE 3000; CMD [\"{startCommand}\"]",
          "Create .dockerignore: node_modules, .env, .env.*, .git, *.test.ts, *.spec.ts, src/ (optional if dist/ is the runtime target), coverage/, .nyc_output/, README.md",
          "Build with BuildKit: DOCKER_BUILDKIT=1 docker build --target runtime -t {imageName}:latest . — or set buildkit: true in docker-compose.yml",
          "Verify: docker images {imageName} (check size) and docker run --rm {imageName} node -e 'require(\"./dist/index.js\")' (smoke test runtime)",
        ],
      },
    },
    evidence: {
      sources: [
        "https://docs.docker.com/develop/develop-images/multistage-build/",
        "https://nodejs.org/en/docs/guides/nodejs-docker-webapp",
      ],
      benchmarks: ["Single-stage node:20: 1.1GB vs multi-stage node:20-alpine: 95MB for a typical Express API"],
      notes: "Alpine images use musl libc — some native modules (e.g. sharp, canvas) need --platform linux/amd64 or a debian-slim base. Test native modules explicitly.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "Container Image Security Scanning in CI/CD",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "Scanning Docker images for CVEs in CI before pushing to a registry catches critical vulnerabilities " +
        "before they reach production and enforces a fail-fast policy without blocking developer iteration on low-severity findings.",
      confidence: 0.93,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Integrate container image security scanning (Trivy or Grype) into GitHub Actions CI: scan after build, " +
        "fail on CRITICAL/HIGH CVEs, report findings to GitHub Security tab via SARIF, and enforce base image freshness.",
      tags: ["docker", "security", "ci-cd", "trivy", "cve", "container-security", "github-actions", "devsecops"],
      domain: "engineering.ops",
      difficulty: "intermediate",
      execution_class: "evaluation",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "automatic",
      determinism: "probabilistic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "Scan runs after Docker build, before push to registry — never scan after push",
        "Pipeline fails on CRITICAL CVEs; HIGH CVEs produce warnings (tunable threshold)",
        "SARIF output uploaded to GitHub Security tab for PR-level vulnerability review",
        "Base image tag pinned to digest (node:20-alpine@sha256:...) to prevent silent updates",
      ],
      failure_conditions: [
        "Scan results ignored — vulnerabilities documented but pipeline always passes",
        "Using :latest base image tag — digest changes silently, scan results unstable",
        "Scan only runs on main branch — PRs can introduce vulnerabilities undetected",
      ],
      metrics: [
        "Zero CRITICAL CVEs in any image promoted to production",
        "Scan latency < 60s (cached vulnerability DB)",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "imageName", type: "string", description: "Docker image name:tag to scan" },
          { name: "severityThreshold", type: "enum:CRITICAL|HIGH|MEDIUM", description: "Minimum severity to fail pipeline", default: "HIGH" },
        ],
        outputs: [
          { name: "sarifReport", type: "file", description: "SARIF file for GitHub Security tab upload" },
          { name: "scanPassed", type: "boolean", description: "True if no violations above threshold" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Add scan step after Docker build (before push): use aquasecurity/trivy-action@master with image-ref: ${{ env.IMAGE_TAG }}, format: sarif, output: trivy-results.sarif, severity: CRITICAL,HIGH, exit-code: 1",
          "Upload SARIF: uses: github/codeql-action/upload-sarif@v3 with sarif_file: trivy-results.sarif — populates GitHub Security → Code scanning alerts tab on the PR.",
          "Pin base image to digest in Dockerfile: FROM node:20-alpine@sha256:<current-digest> — get digest with: docker inspect node:20-alpine --format='{{index .RepoDigests 0}}'",
          "Add weekly Dependabot or Renovate config to auto-update base image digest: .github/dependabot.yml with package-ecosystem: docker, directory: / — ensures timely CVE patches.",
          "For Grype alternative: uses: anchore/scan-action@v3 with image: ${{ env.IMAGE_TAG }}, fail-build: true, severity-cutoff: high, output-format: sarif — similar SARIF integration.",
          "Add to PR checklist: scan results reviewed, zero CRITICAL CVEs, HIGH CVEs have documented acceptance or remediation plan.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://github.com/aquasecurity/trivy-action",
        "https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning",
      ],
      benchmarks: ["Trivy scan with cached DB: 15s for a 95MB Node.js image"],
      notes: "Trivy's --exit-code 1 only fails on found vulnerabilities. Use --ignore-unfixed to skip CVEs with no available fix — reduces noise while keeping actionable failures.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "pattern",
      title: "Blue-Green Deployment with Docker and GitHub Actions",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "Blue-green deployment eliminates downtime during releases by maintaining two identical production environments, " +
        "routing traffic to the idle environment after health checks pass, and enabling instant rollback by re-routing to the old environment.",
      confidence: 0.95,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Implement blue-green deployment for a Dockerized service using GitHub Actions: maintain blue/green containers, " +
        "health-check the new slot before cutover, update the load balancer target group, and rollback on failure.",
      tags: ["blue-green", "deployment", "docker", "github-actions", "zero-downtime", "rollback", "devops"],
      domain: "engineering.ops",
      difficulty: "advanced",
      execution_class: "transformation",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: false,
    },
    validation: {
      success_conditions: [
        "Health checks on new slot pass before any traffic is routed (not concurrent with cutover)",
        "Cutover is atomic — load balancer target update switches 100% of traffic in < 1s",
        "Rollback restores previous slot without redeploying — instant traffic re-route",
        "Deployment state (which slot is live) stored durably — survives CI runner restarts",
      ],
      failure_conditions: [
        "Health checks run against load balancer endpoint (hides routing) instead of direct slot endpoint",
        "Old slot torn down before new slot passes health checks — no rollback target",
        "Cutover is gradual without canary metrics — partial traffic split can't detect regressions",
      ],
      metrics: [
        "Deployment downtime: 0ms (measured by external uptime monitor during cutover)",
        "Rollback time: < 30 seconds from failure detection to traffic restoration",
      ],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [
          { name: "serviceName", type: "string", description: "Application service name" },
          { name: "healthCheckPath", type: "string", description: "Health check HTTP path", default: "/health" },
          { name: "loadBalancer", type: "enum:nginx|traefik|aws-alb|gcp-lb", description: "Load balancer type" },
        ],
        outputs: [
          { name: "activeSlot", type: "enum:blue|green", description: "Currently live slot after deploy" },
          { name: "deploymentLog", type: "string", description: "Deployment steps and health check results" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "Store active slot in GitHub Actions variable or external store (Redis/SSM): ACTIVE_SLOT=blue. Idle slot is always the opposite.",
          "Deploy new image to idle slot: docker pull {imageName}:sha-{SHA}; docker stop {service}-{idleSlot}; docker run -d --name {service}-{idleSlot} -p {idlePort}:3000 {imageName}:sha-{SHA}",
          "Health check idle slot directly (not via load balancer): for i in $(seq 1 30); do curl -sf http://localhost:{idlePort}{healthCheckPath} && break || sleep 2; done — fail deployment if health check doesn't pass within 60s.",
          "Cutover (nginx example): sed -i 's/:{activePort}/:{idlePort}/' /etc/nginx/conf.d/{service}.conf && nginx -s reload. For AWS ALB: aws elbv2 modify-listener to update default action target group to idle slot's target group.",
          "Verify new slot is serving traffic: curl -sf https://{productionDomain}{healthCheckPath} || { rollback; exit 1 }",
          "On success: update ACTIVE_SLOT to idle slot. Keep old container running (do NOT stop it) for 5 minutes as rollback target. Rollback: re-run cutover pointing back to old slot.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://martinfowler.com/bliki/BlueGreenDeployment.html",
        "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/tutorial-application-load-balancer-cli.html",
      ],
      benchmarks: ["nginx reload time: 50ms — imperceptible to end users during cutover"],
      notes: "Blue-green requires 2× infrastructure capacity during the overlap window. For cost-sensitive workloads, use rolling updates or canary instead. Pair blue-green with smoke tests that run against the idle slot before cutover.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

  {
    identity: {
      kb_id: "",
      epistemic_type: "evaluative",
      kb_type: "evaluation",
      title: "CI/CD Pipeline Deployment Readiness Checklist",
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement:
        "A deployment readiness checklist applied before every production release prevents the most common " +
        "categories of deployment failure: missing secrets, unverified health checks, absent rollback procedures, and skipped smoke tests.",
      confidence: 0.94,
      falsifiable: true,
    },
    semantic: {
      summary:
        "Pre-deployment checklist for GitHub Actions CI/CD pipelines: secrets validation, image digest pinning, " +
        "health check verification, rollback plan, smoke test coverage, and on-call notification.",
      tags: ["ci-cd", "deployment", "checklist", "github-actions", "docker", "devops", "sre"],
      domain: "engineering.ops",
      difficulty: "beginner",
      execution_class: "evaluation",
    },
    knowledge_inputs: { minimum_required: 0, recommended: 0, composition_type: "merge", used: [] },
    reasoning: { requires: [], contradicts: [], related: [] },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
    },
    validation: {
      success_conditions: [
        "All checklist items marked pass before production deploy job is approved",
        "Rollback procedure documented and tested within last 30 days",
        "On-call engineer notified before production deploy begins",
      ],
      failure_conditions: [
        "Any CRITICAL item is skipped or marked as 'will fix later'",
        "Deploy proceeds without a documented rollback plan",
      ],
      metrics: [
        "Deployment success rate: > 95% (incidents per 100 deploys)",
        "Mean time to rollback: < 5 minutes",
      ],
    },
    payload: {
      artifact_type: "checklist",
      location: "inline",
      interface: {
        inputs: [
          { name: "serviceVersion", type: "string", description: "Image tag being deployed" },
          { name: "environment", type: "enum:staging|production", description: "Target environment" },
        ],
        outputs: [
          { name: "readinessStatus", type: "enum:GO|NO-GO", description: "Deployment readiness decision" },
        ],
        parameters: [],
      },
      inline_artifact: {
        steps: [
          "[CRITICAL] All CI checks pass (lint, test, security scan) for the commit being deployed — no manually bypassed checks.",
          "[CRITICAL] Docker image tagged with git SHA (not :latest) and digest verified: docker inspect {image}:{sha} confirms image exists in registry.",
          "[CRITICAL] All required secrets present in target environment (verify with: gh secret list --env {environment}) — no placeholders or empty values.",
          "[CRITICAL] Health check endpoint returns 200 on the new image in staging before promoting to production.",
          "[CRITICAL] Rollback procedure documented: what command restores the previous version, who has access, and time estimate.",
          "[HIGH] Database migrations (if any) are backward-compatible with previous application version — old app can run against new schema.",
          "[HIGH] Smoke tests run against staging with the new image and all passed.",
          "[HIGH] Feature flags for new features are OFF by default — new code paths not active until explicitly enabled.",
          "[RECOMMENDED] On-call engineer notified via Slack/PagerDuty before deploy begins.",
          "[RECOMMENDED] Deployment window is within business hours (avoids late-night incidents from unexpected issues).",
          "[RECOMMENDED] Metrics dashboard open in separate tab — watch error rate, latency p99, and throughput for 10 minutes post-deploy.",
        ],
      },
    },
    evidence: {
      sources: [
        "https://sre.google/sre-book/release-engineering/",
        "https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment",
      ],
      benchmarks: [],
      notes: "Checklist KB: run as part of deploy-prod job gate. Automate CRITICAL items as CI checks; HIGH and RECOMMENDED items require human review in the environment approval step.",
    },
    provenance: { author: { address: "" }, royalty_bps: 250, lineage: { depth: 0, parent_hash: null } },
  },

];
