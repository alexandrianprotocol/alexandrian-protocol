/**
 * Production-grade SaaS & full-stack blueprint seeds.
 * Best-practice invariants for repo structure, service architecture, documentation,
 * observability, API design, error handling, security, multi-tenant, and operations.
 * Encoded as high-value seeds: Standard + References + Verification.
 */

import type { SeedSpec } from "../ai-generator.js";

function H(standard: string, references: string, failureMode: string, verification: string): string {
  return `Standard: ${standard}. References: ${references}. Failure mode: ${failureMode}. Verification: ${verification}.`;
}

/** 1. Architectural principles */
const ARCHITECTURE: SeedSpec[] = [
  {
    domain: "saas.architecture",
    title: "Enforce separation of concerns across application layers",
    concept: H(
      "Application layers (presentation, application logic, domain logic, infrastructure) must be isolated.",
      "Clean Architecture, Layered Architecture",
      "Tight coupling and untestable code.",
      "Domain logic has no framework or infrastructure imports."
    ),
  },
  {
    domain: "saas.architecture",
    title: "Design SaaS platforms using modular service boundaries",
    concept: H(
      "Services must be organized by domain responsibility with isolated data stores.",
      "Domain-Driven Design, Bounded Context",
      "Shared databases and unclear ownership.",
      "Each service owns its database and communicates through defined APIs."
    ),
  },
  {
    domain: "saas.architecture",
    title: "Abstract infrastructure behind declarative interfaces",
    concept: H(
      "Infrastructure must be declarative and version-controlled.",
      "Infrastructure as Code, Terraform, Kubernetes",
      "Drift and unreproducible environments.",
      "Infrastructure is defined in version control and provisioned from it."
    ),
  },
  {
    domain: "saas.architecture",
    title: "Design for observability first",
    concept: H(
      "All services must emit logs, metrics, and traces.",
      "Three Pillars of Observability, OpenTelemetry",
      "Blind production and slow incident resolution.",
      "Requests can be traced and metrics queried per service."
    ),
  },
  {
    domain: "saas.architecture",
    title: "Isolate failures to prevent cascading outages",
    concept: H(
      "Systems must degrade gracefully when dependencies fail.",
      "Circuit Breaker, Bulkhead, Graceful Degradation",
      "Cascading service failure due to tight coupling.",
      "Failure of one service does not propagate beyond defined boundaries."
    ),
  },
];

/** 2. Repository and documentation standards */
const REPO_DOCS: SeedSpec[] = [
  {
    domain: "saas.repo",
    title: "Enforce repository documentation standards",
    concept: H(
      "Every repository must include structured documentation (README, architecture, setup, runbooks).",
      "Documentation as Code, README-driven development",
      "Unclear onboarding and operational confusion.",
      "Repository contains README, architecture docs, and operational runbooks."
    ),
  },
  {
    domain: "saas.repo",
    title: "Design full-stack repositories using modular monorepo architecture",
    concept: H(
      "Organize codebases into modular packages separating frontend, backend, shared libraries, and infrastructure.",
      "Monorepo Architecture, Domain-Driven Design",
      "Sprawl and inconsistent boundaries.",
      "Repository structure reflects system boundaries (apps/, packages/, services/, infrastructure/)."
    ),
  },
  {
    domain: "saas.repo",
    title: "Use descriptive file naming conventions",
    concept: H(
      "Files must be named according to the primary responsibility they implement.",
      "Naming Conventions, Self-Documenting Code",
      "Helpers, utils, misc with unclear responsibility.",
      "File names describe their functional role (e.g. user-service.ts, auth-middleware.ts)."
    ),
  },
  {
    domain: "saas.repo",
    title: "Maintain operational runbooks for production",
    concept: H(
      "Production systems must include runbooks for incident response, recovery, and rollback.",
      "Runbook-driven operations, SRE Practices",
      "Ad-hoc recovery and prolonged incidents.",
      "docs/runbooks/ contains incident-response, failover, and rollback procedures."
    ),
  },
];

/** 3. Backend service architecture */
const BACKEND: SeedSpec[] = [
  {
    domain: "saas.backend",
    title: "Structure backend services with layered architecture",
    concept: H(
      "Backend services must separate api, domain, and infrastructure layers.",
      "Layered Architecture, Hexagonal Architecture",
      "Domain logic coupled to frameworks and databases.",
      "Domain layer has no direct dependency on API or infrastructure."
    ),
  },
  {
    domain: "saas.backend",
    title: "Implement typed API contracts",
    concept: H(
      "APIs must use typed contracts (OpenAPI, GraphQL schema) for clients and services.",
      "API-First Design, Contract Testing",
      "Breaking changes and inconsistent clients.",
      "API schema is versioned and validated in CI."
    ),
  },
];

/** 4. API design */
const API: SeedSpec[] = [
  {
    domain: "saas.api",
    title: "Implement idempotent APIs for safe retries",
    concept: H(
      "All externally callable write APIs must be idempotent when retries are expected.",
      "Idempotent Receiver Pattern, AWS API Design Guidelines",
      "Duplicate request execution and inconsistent state.",
      "API calls with identical idempotency keys produce identical results."
    ),
  },
  {
    domain: "saas.api",
    title: "Version APIs and maintain backward compatibility",
    concept: H(
      "APIs must be versioned (path or header) with additive changes only.",
      "API Versioning, Semantic Versioning",
      "Breaking changes without notice.",
      "Clients on older versions continue to work; deprecation has notice period."
    ),
  },
  {
    domain: "saas.api",
    title: "Standardize error responses across services",
    concept: H(
      "Error responses must include error_code, message, and request_id.",
      "Structured Error Handling, RFC 7807",
      "Inconsistent error handling and untraceable failures.",
      "All error responses conform to a defined schema with request_id."
    ),
  },
];

/** 5. Error handling */
const ERROR_HANDLING: SeedSpec[] = [
  {
    domain: "saas.reliability",
    title: "Fail fast on invalid state",
    concept: H(
      "Invalid states should terminate early rather than propagate.",
      "Fail Fast Pattern, Defensive Programming",
      "Corrupted state and hard-to-debug failures.",
      "Invalid inputs or state are rejected at boundaries."
    ),
  },
  {
    domain: "saas.reliability",
    title: "Protect external calls with circuit breakers",
    concept: H(
      "External service calls must be protected by circuit breakers.",
      "Circuit Breaker Pattern",
      "Cascading failures when dependencies are down.",
      "Service calls fail fast when dependency health degrades."
    ),
  },
  {
    domain: "saas.reliability",
    title: "Design retry mechanisms with exponential backoff",
    concept: H(
      "Retries must use exponential backoff with jitter to prevent retry storms.",
      "Exponential Backoff Pattern, AWS Retry Guidelines",
      "Retry storms and amplified outages.",
      "Retry rate remains bounded during dependency outages."
    ),
  },
  {
    domain: "saas.reliability",
    title: "Capture failed async jobs in dead letter queues",
    concept: H(
      "Failed asynchronous jobs must be captured in DLQs for inspection and replay.",
      "Dead Letter Queue Pattern",
      "Silent failures and lost messages.",
      "Failed messages are in DLQ with metadata for debugging."
    ),
  },
];

/** 6. Observability */
const OBSERVABILITY: SeedSpec[] = [
  {
    domain: "saas.observability",
    title: "Implement the three pillars of observability",
    concept: H(
      "Services must emit logs, metrics, and traces for operational visibility.",
      "Three Pillars of Observability, OpenTelemetry, Google SRE",
      "Blind production and slow root cause analysis.",
      "Root cause analysis can be performed using telemetry data."
    ),
  },
  {
    domain: "saas.observability",
    title: "Propagate trace identifiers across service boundaries",
    concept: H(
      "All service requests must propagate trace IDs (e.g. W3C Trace Context).",
      "Distributed Tracing, OpenTelemetry",
      "Broken traces and incomplete dependency graph.",
      "Service dependency graph is visible through tracing."
    ),
  },
  {
    domain: "saas.observability",
    title: "Use structured logging with consistent fields",
    concept: H(
      "Logs must include timestamp, service, request_id, level, and message.",
      "Structured Logging, JSON Logging",
      "Unsearchable logs and missing context.",
      "Logs are queryable by request_id and level."
    ),
  },
];

/** 7. Infrastructure and deployment */
const INFRA: SeedSpec[] = [
  {
    domain: "saas.infra",
    title: "Use infrastructure as code for environment management",
    concept: H(
      "Infrastructure must be defined using version-controlled declarative configuration.",
      "Infrastructure as Code, Terraform, Pulumi",
      "Drift and manual changes.",
      "Environments are provisioned from code; changes are reviewed."
    ),
  },
  {
    domain: "saas.infra",
    title: "Implement immutable infrastructure",
    concept: H(
      "Servers and containers must be replaced, not patched in place.",
      "Immutable Infrastructure, Phoenix Server",
      "Configuration drift and inconsistent nodes.",
      "Deployments create new artifacts; old ones are discarded."
    ),
  },
  {
    domain: "saas.infra",
    title: "Design CI/CD with automated gates and rollback",
    concept: H(
      "Pipeline must include build, test, security scan, and deploy with rollback capability.",
      "Continuous Delivery, GitOps",
      "Manual deploys and unrecoverable bad releases.",
      "Rollback procedure is documented and tested."
    ),
  },
  {
    domain: "saas.infra",
    title: "Use blue-green or canary deployment strategies",
    concept: H(
      "Production deployments must use blue-green, canary, or rolling updates.",
      "Blue-Green Deployment, Canary Release",
      "Big-bang releases and high blast radius.",
      "Releases are phased; rollback does not require full redeploy."
    ),
  },
];

/** 8. Security */
const SECURITY: SeedSpec[] = [
  {
    domain: "saas.security",
    title: "Manage secrets using secure vaults",
    concept: H(
      "Secrets must be stored in a vault and fetched at runtime; never in code or plain config.",
      "Secrets Management, HashiCorp Vault, AWS Secrets Manager",
      "Secrets in repo or environment and compromise.",
      "No secrets in code; vault access is audited."
    ),
  },
  {
    domain: "saas.security",
    title: "Enforce TLS for all communication",
    concept: H(
      "All service-to-service and client-to-service communication must use TLS.",
      "Zero Trust, Mutual TLS",
      "Unencrypted traffic and MITM risk.",
      "Traffic is encrypted in transit; TLS is enforced."
    ),
  },
  {
    domain: "saas.security",
    title: "Validate and sanitize all external inputs",
    concept: H(
      "All external inputs must be validated and sanitized before use.",
      "Input Validation, OWASP",
      "Injection and malformed data.",
      "Input validation is applied at API boundaries; invalid input is rejected."
    ),
  },
  {
    domain: "saas.security",
    title: "Scan dependencies for vulnerabilities",
    concept: H(
      "Dependencies must be scanned for known vulnerabilities in CI.",
      "Supply Chain Security, Dependabot, Snyk",
      "Vulnerable dependencies in production.",
      "CI fails or alerts on high/critical vulns; remediation is tracked."
    ),
  },
];

/** 9. Multi-tenant and background processing */
const MULTITENANT_BACKGROUND: SeedSpec[] = [
  {
    domain: "saas.multitenant",
    title: "Design multi-tenant data isolation",
    concept: H(
      "Tenant data must be isolated (shared DB with tenant_id, schema per tenant, or DB per tenant) with clear tradeoffs.",
      "Multi-Tenancy, Tenant Isolation",
      "Data leakage between tenants.",
      "Tenant isolation strategy is documented and enforced in queries."
    ),
  },
  {
    domain: "saas.background",
    title: "Process background work via message queues and workers",
    concept: H(
      "Long-running or async work must go through a message queue and worker pool.",
      "Message Queue, Competing Consumers, Job Queue",
      "Blocking requests and lost work.",
      "Async work is queued; workers process with at-least-once or exactly-once semantics."
    ),
  },
];

/** 10. Testing and developer experience */
const TESTING_DX: SeedSpec[] = [
  {
    domain: "saas.testing",
    title: "Adopt multi-layer testing strategy",
    concept: H(
      "Systems must include unit, integration, and end-to-end tests.",
      "Testing Pyramid, Contract Testing",
      "Brittle or missing coverage.",
      "Test suites cover core functionality across layers (unit, integration, e2e)."
    ),
  },
  {
    domain: "saas.dx",
    title: "Provide one-command setup for development",
    concept: H(
      "Repository must support one-command dev setup (e.g. make dev, npm run dev).",
      "Developer Experience, Onboarding",
      "Slow and inconsistent onboarding.",
      "README documents single command to run the system locally."
    ),
  },
];

/** 11. Platform and product practices */
const PLATFORM: SeedSpec[] = [
  {
    domain: "saas.platform",
    title: "Use feature flags for progressive rollout",
    concept: H(
      "Feature rollout must be controlled by flags with targeting and gradual percentage.",
      "Feature Flags, Progressive Delivery, LaunchDarkly",
      "Big-bang releases and inability to disable features.",
      "Features can be toggled without deploy; rollout is measurable."
    ),
  },
  {
    domain: "saas.platform",
    title: "Monitor cloud cost and set budgets",
    concept: H(
      "Cloud spend must be monitored with budgets and alerts.",
      "Cost Observability, FinOps",
      "Unbounded spend and surprise bills.",
      "Cost dashboards and budget alerts are in place."
    ),
  },
  {
    domain: "saas.platform",
    title: "Verify supply chain integrity of dependencies",
    concept: H(
      "Dependencies must be verified (lockfile, SBOM, signature) for supply chain security.",
      "Supply Chain Security, SLSA, npm audit",
      "Compromised dependencies and build integrity.",
      "Dependencies are pinned and verified in CI."
    ),
  },
];

export const SAAS_FULLSTACK_BLUEPRINT_SEED_SPECS: SeedSpec[] = [
  ...ARCHITECTURE,
  ...REPO_DOCS,
  ...BACKEND,
  ...API,
  ...ERROR_HANDLING,
  ...OBSERVABILITY,
  ...INFRA,
  ...SECURITY,
  ...MULTITENANT_BACKGROUND,
  ...TESTING_DX,
  ...PLATFORM,
];
