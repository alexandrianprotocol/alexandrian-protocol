/**
 * Anti-pattern seeds — high-value procedures that prevent or detect common failure patterns.
 * Each seed: Standard, References (pattern name), Failure Mode, Verification.
 * ~150 categories: Architecture, Distributed, Concurrency, Data, ML, DevOps, Security, Frontend.
 */

import type { SeedSpec } from "../ai-generator.js";

function H(
  standard: string,
  references: string,
  failureMode: string,
  verification: string
): string {
  return `Standard: ${standard}. References: ${references}. Failure mode: ${failureMode}. Verification: ${verification}.`;
}

/** Architecture anti-patterns */
const ARCH_ANTIPATTERNS: SeedSpec[] = [
  {
    domain: "antipattern.architecture",
    title: "Prevent god object anti-pattern",
    concept: H(
      "Classes must have a single responsibility.",
      "Single Responsibility Principle",
      "Centralized logic causes unmaintainable code.",
      "Class responsibilities remain narrowly scoped."
    ),
  },
  {
    domain: "antipattern.architecture",
    title: "Avoid big ball of mud architecture",
    concept: H(
      "Enforce boundaries and dependency direction.",
      "Clean Architecture, Bounded Context",
      "No clear structure; changes have unpredictable impact.",
      "Dependency rules enforced; no circular deps."
    ),
  },
  {
    domain: "antipattern.architecture",
    title: "Avoid circular dependencies",
    concept: H(
      "Dependencies must form a DAG; break cycles with interfaces or events.",
      "Dependency Inversion, Event-Driven",
      "Circular deps cause build and runtime failures.",
      "Static analysis reports no cycles."
    ),
  },
  {
    domain: "antipattern.architecture",
    title: "Prevent leaky abstractions",
    concept: H(
      "Abstractions must not expose implementation details.",
      "Abstraction Design, Encapsulation",
      "Callers depend on internals; changes break consumers.",
      "Public API does not expose implementation types."
    ),
  },
];

/** Distributed system anti-patterns */
const DISTRIBUTED_ANTIPATTERNS: SeedSpec[] = [
  {
    domain: "antipattern.distributed",
    title: "Avoid chatty microservice communication",
    concept: H(
      "Aggregate remote calls to minimize network overhead.",
      "API Gateway Pattern, BFF",
      "Latency amplification due to excessive network calls.",
      "Request path contains minimal service hops; N+1 calls avoided."
    ),
  },
  {
    domain: "antipattern.distributed",
    title: "Prevent distributed monolith",
    concept: H(
      "Services must deploy and scale independently.",
      "Microservices, Loose Coupling",
      "Services are coupled; one deploy requires all.",
      "Services deploy and scale independently."
    ),
  },
  {
    domain: "antipattern.distributed",
    title: "Avoid synchronous request chains",
    concept: H(
      "Use async messaging or parallel calls where possible.",
      "Event-Driven Architecture, CQRS",
      "Long chains cause timeout and fragility.",
      "Critical path latency within budget; async where appropriate."
    ),
  },
];

/** Concurrency anti-patterns */
const CONCURRENCY_ANTIPATTERNS: SeedSpec[] = [
  {
    domain: "antipattern.concurrency",
    title: "Avoid shared mutable state in concurrent systems",
    concept: H(
      "Use immutable data or synchronization primitives.",
      "Actor Model, Immutable Data Patterns",
      "Race conditions cause inconsistent state.",
      "Concurrent access cannot produce inconsistent results."
    ),
  },
  {
    domain: "antipattern.concurrency",
    title: "Prevent deadlock in locking design",
    concept: H(
      "Establish global lock ordering or use lock-free structures.",
      "Lock Ordering, Lock-Free Data Structures",
      "Deadlock causes system hang.",
      "No deadlock under concurrency tests."
    ),
  },
  {
    domain: "antipattern.concurrency",
    title: "Avoid busy waiting",
    concept: H(
      "Use blocking or event-driven wait instead of spin loops.",
      "Condition Variables, Async/Await",
      "CPU waste and latency.",
      "No busy-wait in hot path; use wait/notify or async."
    ),
  },
];

/** Data engineering anti-patterns */
const DATA_ANTIPATTERNS: SeedSpec[] = [
  {
    domain: "antipattern.data",
    title: "Prevent data leakage in ML pipelines",
    concept: H(
      "Training data must not contain information from test/validation.",
      "Data Leakage Prevention, Train/Test Split",
      "Inflated metrics; poor production performance.",
      "No feature or target leakage; holdout strict."
    ),
  },
  {
    domain: "antipattern.data",
    title: "Avoid N+1 query pattern",
    concept: H(
      "Batch or join queries to avoid per-item round trips.",
      "Eager Loading, Batch Loading",
      "Database overload and latency.",
      "Query count independent of result size (or bounded)."
    ),
  },
  {
    domain: "antipattern.data",
    title: "Prevent unbounded result sets",
    concept: H(
      "Use pagination or streaming for large results.",
      "Pagination, Cursor-Based Iteration",
      "Memory exhaustion and timeouts.",
      "Large queries use pagination or stream; memory bounded."
    ),
  },
];

/** DevOps anti-patterns */
const DEVOPS_ANTIPATTERNS: SeedSpec[] = [
  {
    domain: "antipattern.devops",
    title: "Avoid manual deployment steps",
    concept: H(
      "All deployment steps must be automated and versioned.",
      "CI/CD, Infrastructure as Code",
      "Human error and inconsistency.",
      "Deployment is fully automated; no manual steps in critical path."
    ),
  },
  {
    domain: "antipattern.devops",
    title: "Prevent configuration drift",
    concept: H(
      "Configuration must be declared and enforced.",
      "IaC, GitOps",
      "Environments diverge; failures in prod only.",
      "Config drift detection in place; remediation automated."
    ),
  },
];

/** Security anti-patterns */
const SECURITY_ANTIPATTERNS: SeedSpec[] = [
  {
    domain: "antipattern.security",
    title: "Prevent hardcoded secrets",
    concept: H(
      "Secrets must be loaded from secure store at runtime.",
      "Secrets Management, Vault",
      "Secrets in repo or binary; compromise.",
      "No secrets in code or config; scan clean."
    ),
  },
  {
    domain: "antipattern.security",
    title: "Avoid trusting client input",
    concept: H(
      "Validate and sanitize all inputs; never trust client.",
      "Input Validation, Allowlist",
      "Injection, XSS, or malformed data.",
      "All inputs validated and sanitized; fuzz tests pass."
    ),
  },
];

/** Frontend anti-patterns */
const FRONTEND_ANTIPATTERNS: SeedSpec[] = [
  {
    domain: "antipattern.frontend",
    title: "Avoid prop drilling",
    concept: H(
      "Use composition, context, or state library for deep tree state.",
      "Composition, React Context, State Management",
      "Unmaintainable prop chains and re-renders.",
      "State placement appropriate; no excessive drilling."
    ),
  },
  {
    domain: "antipattern.frontend",
    title: "Prevent layout thrashing",
    concept: H(
      "Batch reads and writes; avoid read-write-read in loop.",
      "FastDOM, Batch DOM Updates",
      "Jank and poor performance.",
      "No layout thrash in hot path; profile clean."
    ),
  },
];

export const ANTIPATTERN_SEED_SPECS: SeedSpec[] = [
  ...ARCH_ANTIPATTERNS,
  ...DISTRIBUTED_ANTIPATTERNS,
  ...CONCURRENCY_ANTIPATTERNS,
  ...DATA_ANTIPATTERNS,
  ...DEVOPS_ANTIPATTERNS,
  ...SECURITY_ANTIPATTERNS,
  ...FRONTEND_ANTIPATTERNS,
];
