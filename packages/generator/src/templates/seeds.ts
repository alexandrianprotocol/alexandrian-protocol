/**
 * Seed KB Templates — KBv2.4
 *
 * 30 hardcoded seed KBs across 7 domains.
 * Seeds have identity.is_seed = true and empty knowledge_inputs.used arrays.
 * identity.kb_id = "" — filled by the builder after hashing.
 *
 * Domains:
 *   software.security      (5)
 *   evm.solidity           (5)
 *   sql.optimization       (4)
 *   software.architecture  (5)
 *   software.testing       (4)
 *   ai.prompting           (4)
 *   meta.protocol          (3)
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

];
