/**
 * Verification & Evaluation Layer (~500 seeds).
 * Ensures the agent checks its own work: architecture, security, performance, code quality verification.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** Architecture verification */
const ARCH_VERIFICATION: SeedSpec[] = [
  { domain: "verification.architecture", title: "Verifying system scalability", concept: C("define load target; run load test; confirm SLO") },
  { domain: "verification.architecture", title: "Validating architecture constraints", concept: C("check dependency rules; run static analysis; enforce boundaries") },
  { domain: "verification.architecture", title: "Evaluating modular boundaries", concept: C("review modules; check coupling; verify interface stability") },
  { domain: "verification.architecture", title: "Verifying service contract compliance", concept: C("run contract tests; compare to spec; fix drift") },
  { domain: "verification.architecture", title: "Validating deployment topology", concept: C("compare desired vs actual; check placement; fix config") },
];

/** Security verification */
const SECURITY_VERIFICATION: SeedSpec[] = [
  { domain: "verification.security", title: "Validating authentication security", concept: C("test auth flows; check token handling; verify session") },
  { domain: "verification.security", title: "Verifying access control policies", concept: C("enumerate roles; test RBAC/ABAC; fix misconfig") },
  { domain: "verification.security", title: "Checking cryptographic implementation", concept: C("verify algorithm and key usage; check randomness; audit") },
  { domain: "verification.security", title: "Validating input sanitization", concept: C("fuzz inputs; test injection; fix validation") },
  { domain: "verification.security", title: "Verifying secrets management", concept: C("audit secret usage; check rotation; no hardcode") },
];

/** Performance verification */
const PERF_VERIFICATION: SeedSpec[] = [
  { domain: "verification.performance", title: "Validating performance benchmarks", concept: C("run benchmark; compare baseline; regress or accept") },
  { domain: "verification.performance", title: "Verifying system throughput targets", concept: C("measure under load; compare to SLO; tune or scale") },
  { domain: "verification.performance", title: "Validating latency budgets", concept: C("measure p99; compare to budget; optimize path") },
  { domain: "verification.performance", title: "Verifying resource utilization limits", concept: C("measure CPU/memory; compare to limit; fix leak or quota") },
  { domain: "verification.performance", title: "Validating cache effectiveness", concept: C("measure hit rate; compare to target; tune or redesign") },
];

/** Code quality verification */
const CODE_QUALITY_VERIFICATION: SeedSpec[] = [
  { domain: "verification.code_quality", title: "Validating code maintainability", concept: C("run complexity metrics; enforce thresholds; refactor") },
  { domain: "verification.code_quality", title: "Verifying test coverage", concept: C("run coverage; enforce minimum; add tests") },
  { domain: "verification.code_quality", title: "Validating static analysis results", concept: C("run linter/SAST; fix or suppress; gate in CI") },
  { domain: "verification.code_quality", title: "Verifying dependency hygiene", concept: C("audit deps; check vulns; upgrade or replace") },
  { domain: "verification.code_quality", title: "Validating documentation completeness", concept: C("check public API docs; verify examples; update") },
];

export const VERIFICATION_SEED_SPECS: SeedSpec[] = [
  ...ARCH_VERIFICATION,
  ...SECURITY_VERIFICATION,
  ...PERF_VERIFICATION,
  ...CODE_QUALITY_VERIFICATION,
];
