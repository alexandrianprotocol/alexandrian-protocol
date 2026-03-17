/**
 * High-value engineering invariant seeds.
 * Each seed is expressed as an actionable standard with: Standard, References (design pattern / best practice),
 * Failure Mode, and Verification Criteria — not just conceptual truths.
 * Derived from foundational engineering (DDIA, Clean Architecture, SRE, etc.).
 */

import type { SeedSpec } from "../ai-generator.js";

/** Build concept string: Standard + References + Failure Mode + Verification (generator-friendly). */
function H(
  standard: string,
  references: string,
  failureMode: string,
  verification: string
): string {
  return `Standard: ${standard}. References: ${references}. Failure mode: ${failureMode}. Verification: ${verification}.`;
}

/** Complexity & system design */
const COMPLEXITY_SYSTEM: SeedSpec[] = [
  {
    domain: "invariant.architecture",
    title: "Prevent cascading failures using circuit breaker pattern",
    concept: H(
      "External service calls must be protected by circuit breakers.",
      "Circuit Breaker Pattern",
      "Service dependency failure propagates system-wide.",
      "Service calls fail fast when dependency health degrades."
    ),
  },
  {
    domain: "invariant.architecture",
    title: "Design distributed systems with failure isolation boundaries",
    concept: H(
      "Use bulkhead isolation and circuit breakers to prevent cascading failures.",
      "Bulkhead Pattern, Circuit Breaker Pattern",
      "Failure of one service propagates across system boundaries.",
      "Failure of one service does not propagate across boundaries."
    ),
  },
  {
    domain: "invariant.architecture",
    title: "Enforce loose coupling via interface-based service boundaries",
    concept: H(
      "Services must communicate via stable interface contracts rather than internal dependencies.",
      "Interface Segregation Principle, Service-Oriented Architecture",
      "Tight coupling causes fragility and prevents evolution.",
      "Service replacement does not require modification of dependent services."
    ),
  },
  {
    domain: "invariant.architecture",
    title: "Implement graceful degradation strategies for overload protection",
    concept: H(
      "When capacity limits are reached, systems must degrade non-critical functionality.",
      "Graceful Degradation, Backpressure Control",
      "Systems collapse under load instead of degrading predictably.",
      "Critical system functions remain available during peak load."
    ),
  },
  {
    domain: "invariant.architecture",
    title: "Design retry mechanisms using exponential backoff",
    concept: H(
      "Retries must use exponential backoff with jitter to prevent retry storms.",
      "Exponential Backoff Pattern, AWS Retry Guidelines",
      "Retry storms amplify system failures.",
      "Retry storms do not amplify system failures."
    ),
  },
  {
    domain: "invariant.architecture",
    title: "Implement observability using the three pillars model",
    concept: H(
      "Systems must expose logs, metrics, and traces.",
      "Three Pillars of Observability, Google SRE Practices",
      "Root cause of failures cannot be identified.",
      "Root cause analysis can be performed using telemetry data."
    ),
  },
  {
    domain: "invariant.architecture",
    title: "Ensure message processing idempotency",
    concept: H(
      "Message consumers must safely process duplicate messages.",
      "Idempotent Consumer Pattern",
      "Message duplication causes inconsistent state.",
      "Repeated processing produces identical state."
    ),
  },
  {
    domain: "invariant.architecture",
    title: "Implement backpressure in high-throughput systems",
    concept: H(
      "Systems must signal producers when consumer capacity is exceeded.",
      "Reactive Streams Backpressure",
      "Unbounded queues cause system collapse.",
      "Queue depth remains bounded during peak traffic."
    ),
  },
  {
    domain: "invariant.architecture",
    title: "Instrument distributed systems with end-to-end tracing",
    concept: H(
      "All service calls must propagate trace identifiers.",
      "OpenTelemetry, Distributed Tracing",
      "Root cause of failures cannot be identified across services.",
      "Service dependency graph visible through tracing."
    ),
  },
];

/** Distributed systems */
const DISTRIBUTED: SeedSpec[] = [
  {
    domain: "invariant.distributed",
    title: "Design for network partition inevitability",
    concept: H(
      "Assume partitions occur; design for consistency vs availability tradeoff.",
      "CAP Theorem, Partition Tolerance",
      "System assumes network is reliable and fails incorrectly.",
      "System degrades gracefully under partition."
    ),
  },
  {
    domain: "invariant.distributed",
    title: "Account for idempotency in retry mechanisms",
    concept: H(
      "Retry mechanisms must not cause duplicate side effects.",
      "Idempotent Receiver Pattern",
      "Duplicate requests cause inconsistent state.",
      "API calls with identical idempotency keys produce identical results."
    ),
  },
  {
    domain: "invariant.distributed",
    title: "Design for partial system failure",
    concept: H(
      "Treat partial failure as normal; isolate and degrade.",
      "Fault Isolation, Bulkhead Pattern",
      "Single component failure takes down system.",
      "Failure isolation reduces blast radius."
    ),
  },
];

/** Software engineering */
const SOFTWARE_ENG: SeedSpec[] = [
  {
    domain: "invariant.software",
    title: "Enforce single responsibility per component",
    concept: H(
      "Classes and modules must have one reason to change.",
      "Single Responsibility Principle, Clean Architecture",
      "God objects cause unmaintainable code.",
      "Component responsibilities remain narrowly scoped."
    ),
  },
  {
    domain: "invariant.software",
    title: "Maintain interface stability for evolution",
    concept: H(
      "Public interfaces must remain stable; extend via new types or versioning.",
      "Open/Closed Principle, API Versioning",
      "Breaking changes force costly downstream updates.",
      "Interface compatibility verified by contract tests."
    ),
  },
  {
    domain: "invariant.software",
    title: "Eliminate code duplication",
    concept: H(
      "Duplicate logic must be consolidated into single source of truth.",
      "DRY Principle",
      "Duplication increases maintenance cost and bug risk.",
      "No duplicate logic across codebase (lint/analysis)."
    ),
  },
  {
    domain: "invariant.software",
    title: "Ensure build reproducibility",
    concept: H(
      "Builds must be reproducible from versioned inputs.",
      "Reproducible Builds, Lockfile",
      "Non-deterministic builds cause undebuggable failures.",
      "Same inputs produce same artifact hash."
    ),
  },
];

/** Reliability engineering */
const RELIABILITY: SeedSpec[] = [
  {
    domain: "invariant.reliability",
    title: "Define and enforce error budgets",
    concept: H(
      "Balance reliability and innovation using explicit error budgets.",
      "Google SRE, Error Budget Policy",
      "Either over-conservative or unreliable releases.",
      "Error budget tracked and enforced in release process."
    ),
  },
  {
    domain: "invariant.reliability",
    title: "Rehearse incident response procedures",
    concept: H(
      "Incident runbooks must be tested and updated regularly.",
      "Incident Management, Postmortem Culture",
      "Incidents escalate due to unclear or outdated procedures.",
      "Runbook drills succeed; postmortems document improvements."
    ),
  },
  {
    domain: "invariant.reliability",
    title: "Design for graceful degradation under load",
    concept: H(
      "Systems must degrade non-critical features when overloaded.",
      "Graceful Degradation, Circuit Breaker",
      "System fails entirely under load.",
      "Critical path remains available; degraded features documented."
    ),
  },
];

/** Data / ML */
const DATA_ML: SeedSpec[] = [
  {
    domain: "invariant.data_ml",
    title: "Validate data quality before model training",
    concept: H(
      "Training data must be validated for distribution and quality.",
      "Data Quality Framework, ML Pipeline",
      "Garbage in, garbage out; biased or broken models.",
      "Data validation checks pass before training."
    ),
  },
  {
    domain: "invariant.data_ml",
    title: "Evaluate models on held-out data",
    concept: H(
      "Model evaluation must use unseen data to avoid overfitting.",
      "Train/Validation/Test Split, Cross-Validation",
      "Overfitting; poor generalization.",
      "Evaluation metrics on held-out set meet acceptance criteria."
    ),
  },
  {
    domain: "invariant.data_ml",
    title: "Ensure training pipeline reproducibility",
    concept: H(
      "Training runs must be reproducible from code and data version.",
      "Reproducibility, Experiment Tracking",
      "Results cannot be reproduced or audited.",
      "Same code and data version produce same model artifact."
    ),
  },
];

export const INVARIANT_SEED_SPECS: SeedSpec[] = [
  ...COMPLEXITY_SYSTEM,
  ...DISTRIBUTED,
  ...SOFTWARE_ENG,
  ...RELIABILITY,
  ...DATA_ML,
];
