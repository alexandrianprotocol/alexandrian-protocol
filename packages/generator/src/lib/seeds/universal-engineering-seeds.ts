/**
 * Universal Engineering KB Layer (~800 seed procedures).
 * Cross-cutting procedures that attach to almost any engineering/software task:
 * architecture discipline, documentation, UX, testing, observability, security, DevOps, data, research reproducibility, performance, knowledge linking.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Architecture discipline (50 explicit) */
const ARCHITECTURE: SeedSpec[] = [
  { domain: "universal.architecture", title: "Applying separation of concerns in system design", concept: C("partition by responsibility; minimal coupling") },
  { domain: "universal.architecture", title: "Designing modular system architectures", concept: C("define modules and stable interfaces") },
  { domain: "universal.architecture", title: "Implementing layered architecture patterns", concept: C("layers with defined dependency direction") },
  { domain: "universal.architecture", title: "Designing bounded contexts using domain-driven design", concept: C("DDD bounded contexts and context maps") },
  { domain: "universal.architecture", title: "Applying single responsibility principles", concept: C("one reason to change per component") },
  { domain: "universal.architecture", title: "Designing loosely coupled service architectures", concept: C("minimize direct dependencies; use contracts") },
  { domain: "universal.architecture", title: "Implementing dependency inversion patterns", concept: C("depend on abstractions, not concretions") },
  { domain: "universal.architecture", title: "Designing service interface contracts", concept: C("explicit API and versioning") },
  { domain: "universal.architecture", title: "Defining stable dependency boundaries", concept: C("stable core; volatile at edges") },
  { domain: "universal.architecture", title: "Designing extensible component interfaces", concept: C("open for extension, closed for modification") },
  { domain: "universal.architecture", title: "Implementing plugin architecture patterns", concept: C("extension points and discovery") },
  { domain: "universal.architecture", title: "Designing event-driven architecture models", concept: C("events, producers, consumers; eventual consistency") },
  { domain: "universal.architecture", title: "Implementing microservice orchestration layers", concept: C("orchestrate or choreograph; saga if needed") },
  { domain: "universal.architecture", title: "Designing domain event architectures", concept: C("domain events and handlers") },
  { domain: "universal.architecture", title: "Creating system capability maps", concept: C("map capabilities to components") },
  { domain: "universal.architecture", title: "Designing architecture evolution strategies", concept: C("incremental change; deprecation path") },
  { domain: "universal.architecture", title: "Implementing architecture review processes", concept: C("review gates and ADRs") },
  { domain: "universal.architecture", title: "Designing architectural governance frameworks", concept: C("standards and exceptions") },
  { domain: "universal.architecture", title: "Creating architectural decision records", concept: C("context, decision, consequences") },
  { domain: "universal.architecture", title: "Implementing system decomposition strategies", concept: C("split by domain or capability") },
  { domain: "universal.architecture", title: "Designing resilient service boundaries", concept: C("timeouts, retries, fallbacks at boundaries") },
  { domain: "universal.architecture", title: "Implementing fault isolation patterns", concept: C("isolate failure domains") },
  { domain: "universal.architecture", title: "Designing circuit breaker patterns", concept: C("open/closed/half-open; fail fast") },
  { domain: "universal.architecture", title: "Implementing retry and backoff strategies", concept: C("exponential backoff; idempotency") },
  { domain: "universal.architecture", title: "Designing service health monitoring", concept: C("liveness, readiness, dependency checks") },
  { domain: "universal.architecture", title: "Implementing graceful degradation mechanisms", concept: C("reduce features under load") },
  { domain: "universal.architecture", title: "Designing failover architectures", concept: C("active/passive or active/active") },
  { domain: "universal.architecture", title: "Implementing redundancy strategies", concept: C("N+1 or multi-region") },
  { domain: "universal.architecture", title: "Designing distributed coordination systems", concept: C("consensus or leader election when needed") },
  { domain: "universal.architecture", title: "Implementing consistency management strategies", concept: C("strong vs eventual; conflict resolution") },
  { domain: "universal.architecture", title: "Designing system scalability models", concept: C("scale axes and limits") },
  { domain: "universal.architecture", title: "Implementing horizontal scaling patterns", concept: C("add instances; stateless or shard") },
  { domain: "universal.architecture", title: "Designing load distribution systems", concept: C("load balancer and health checks") },
  { domain: "universal.architecture", title: "Implementing asynchronous processing pipelines", concept: C("queues and workers") },
  { domain: "universal.architecture", title: "Designing service throttling strategies", concept: C("rate limit per client or resource") },
  { domain: "universal.architecture", title: "Implementing backpressure mechanisms", concept: C("propagate load signals") },
  { domain: "universal.architecture", title: "Designing distributed task queues", concept: C("durable queue; at-least-once or exactly-once") },
  { domain: "universal.architecture", title: "Implementing batch processing systems", concept: C("batch size and flush policy") },
  { domain: "universal.architecture", title: "Designing system elasticity policies", concept: C("scale up/down by metric") },
  { domain: "universal.architecture", title: "Implementing auto-scaling infrastructure", concept: C("min/max and scaling triggers") },
  { domain: "universal.architecture", title: "Designing modular library systems", concept: C("public API and internal modules") },
  { domain: "universal.architecture", title: "Implementing shared component repositories", concept: C("version and publish artifacts") },
  { domain: "universal.architecture", title: "Designing version compatibility policies", concept: C("semver and compatibility matrix") },
  { domain: "universal.architecture", title: "Implementing backward compatibility strategies", concept: C("additive changes; deprecation window") },
  { domain: "universal.architecture", title: "Designing API lifecycle management", concept: C("version, deprecate, sunset") },
  { domain: "universal.architecture", title: "Implementing interface versioning systems", concept: C("URL or header versioning") },
  { domain: "universal.architecture", title: "Designing service upgrade strategies", concept: C("rolling or blue-green") },
  { domain: "universal.architecture", title: "Implementing rolling deployment patterns", concept: C("deploy one by one; health check") },
  { domain: "universal.architecture", title: "Designing feature flag systems", concept: C("flags and targeting rules") },
  { domain: "universal.architecture", title: "Implementing release gating mechanisms", concept: C("gates: tests, approval, metrics") },
];

/** 2. Code quality & maintainability (20 explicit) */
const CODE_QUALITY: SeedSpec[] = [
  { domain: "universal.code_quality", title: "Enforcing consistent code formatting standards", concept: C("style guide and auto-format") },
  { domain: "universal.code_quality", title: "Designing descriptive naming conventions", concept: C("naming rules and glossary") },
  { domain: "universal.code_quality", title: "Implementing static code analysis pipelines", concept: C("run analyzers; gate on severity") },
  { domain: "universal.code_quality", title: "Designing automated code quality checks", concept: C("quality gates in CI") },
  { domain: "universal.code_quality", title: "Implementing linting workflows", concept: C("lint and fix in pipeline") },
  { domain: "universal.code_quality", title: "Designing code review procedures", concept: C("checklist and approval") },
  { domain: "universal.code_quality", title: "Implementing maintainability scoring metrics", concept: C("metrics and thresholds") },
  { domain: "universal.code_quality", title: "Designing code complexity thresholds", concept: C("cyclomatic complexity limits") },
  { domain: "universal.code_quality", title: "Implementing modular code structures", concept: C("modules and visibility") },
  { domain: "universal.code_quality", title: "Designing reusable component libraries", concept: C("API stability and docs") },
  { domain: "universal.code_quality", title: "Implementing code refactoring workflows", concept: C("safe steps; preserve behavior") },
  { domain: "universal.code_quality", title: "Designing dependency upgrade policies", concept: C("schedule and test upgrades") },
  { domain: "universal.code_quality", title: "Implementing dead code detection", concept: C("reachability; remove unused") },
  { domain: "universal.code_quality", title: "Designing code ownership models", concept: C("owners and CODEOWNERS") },
  { domain: "universal.code_quality", title: "Implementing code audit procedures", concept: C("periodic review and remediation") },
  { domain: "universal.code_quality", title: "Designing debugging instrumentation", concept: C("logs and traces; minimal overhead") },
  { domain: "universal.code_quality", title: "Implementing structured logging patterns", concept: C("structured fields; levels") },
  { domain: "universal.code_quality", title: "Designing deterministic function behavior", concept: C("same input → same output") },
  { domain: "universal.code_quality", title: "Implementing defensive programming practices", concept: C("validate inputs; handle errors") },
  { domain: "universal.code_quality", title: "Designing error handling conventions", concept: C("error types and propagation") },
];

/** 3. Technical documentation (20 explicit) */
const DOCUMENTATION: SeedSpec[] = [
  { domain: "universal.documentation", title: "Writing architecture decision records", concept: C("context, decision, consequences") },
  { domain: "universal.documentation", title: "Designing system design documents", concept: C("components, data flow, tradeoffs") },
  { domain: "universal.documentation", title: "Writing API reference documentation", concept: C("from spec or code; keep in sync") },
  { domain: "universal.documentation", title: "Creating developer onboarding guides", concept: C("setup, workflow, norms") },
  { domain: "universal.documentation", title: "Writing deployment runbooks", concept: C("steps, env, rollback") },
  { domain: "universal.documentation", title: "Designing troubleshooting documentation", concept: C("symptoms, causes, fixes") },
  { domain: "universal.documentation", title: "Writing incident response playbooks", concept: C("trigger, steps, escalation") },
  { domain: "universal.documentation", title: "Designing technical glossary documents", concept: C("terms and definitions") },
  { domain: "universal.documentation", title: "Creating developer workflow documentation", concept: C("branch, PR, release flow") },
  { domain: "universal.documentation", title: "Writing operational procedures", concept: C("repeatable steps; approvals") },
  { domain: "universal.documentation", title: "Designing documentation linking strategies", concept: C("cross-links; avoid broken links") },
  { domain: "universal.documentation", title: "Implementing documentation version control", concept: C("version with code or product") },
  { domain: "universal.documentation", title: "Designing documentation validation checks", concept: C("lint links and structure") },
  { domain: "universal.documentation", title: "Creating documentation templates", concept: C("template per doc type") },
  { domain: "universal.documentation", title: "Writing configuration documentation", concept: C("env vars and defaults") },
  { domain: "universal.documentation", title: "Designing architecture diagrams", concept: C("C4 or similar; keep current") },
  { domain: "universal.documentation", title: "Creating system capability documentation", concept: C("capabilities and owners") },
  { domain: "universal.documentation", title: "Writing dependency documentation", concept: C("deps and upgrade path") },
  { domain: "universal.documentation", title: "Designing documentation indexing systems", concept: C("search and taxonomy") },
  { domain: "universal.documentation", title: "Creating searchable documentation systems", concept: C("full-text and facets") },
];

/** 4. UX/UI (10) */
const UX_UI: SeedSpec[] = [
  { domain: "universal.ux_ui", title: "Designing responsive interface layouts", concept: C("breakpoints and fluid layout") },
  { domain: "universal.ux_ui", title: "Implementing UI spacing systems", concept: C("spacing scale and usage") },
  { domain: "universal.ux_ui", title: "Designing typography scale hierarchies", concept: C("type scale and roles") },
  { domain: "universal.ux_ui", title: "Creating accessible interface components", concept: C("ARIA; keyboard; screen reader") },
  { domain: "universal.ux_ui", title: "Implementing WCAG accessibility standards", concept: C("WCAG levels and testing") },
  { domain: "universal.ux_ui", title: "Designing user interaction flows", concept: C("user goals and paths") },
  { domain: "universal.ux_ui", title: "Creating consistent visual hierarchy systems", concept: C("contrast and hierarchy") },
  { domain: "universal.ux_ui", title: "Designing mobile responsive interfaces", concept: C("mobile-first or adaptive") },
  { domain: "universal.ux_ui", title: "Implementing reusable UI component libraries", concept: C("components and tokens") },
  { domain: "universal.ux_ui", title: "Designing design token systems", concept: C("tokens and theme") },
];

/** 5. Testing & validation (10) */
const TESTING: SeedSpec[] = [
  { domain: "universal.testing", title: "Designing unit testing strategies", concept: C("cover branches; mock deps") },
  { domain: "universal.testing", title: "Implementing integration testing pipelines", concept: C("real deps; boundaries") },
  { domain: "universal.testing", title: "Designing end-to-end testing workflows", concept: C("user flows; env isolation") },
  { domain: "universal.testing", title: "Implementing regression testing systems", concept: C("baseline suite; diff") },
  { domain: "universal.testing", title: "Designing property-based testing frameworks", concept: C("generators; invariants") },
  { domain: "universal.testing", title: "Implementing fuzz testing procedures", concept: C("mutate inputs; run to failure") },
  { domain: "universal.testing", title: "Designing load testing pipelines", concept: C("workload; latency/throughput") },
  { domain: "universal.testing", title: "Implementing stress testing systems", concept: C("beyond capacity; break point") },
  { domain: "universal.testing", title: "Designing security testing procedures", concept: C("SAST/DAST; penetration") },
  { domain: "universal.testing", title: "Implementing API contract testing", concept: C("request/response vs schema") },
];

/** 6. Observability & monitoring (10) */
const OBSERVABILITY: SeedSpec[] = [
  { domain: "universal.observability", title: "Designing system observability architectures", concept: C("logs, metrics, traces") },
  { domain: "universal.observability", title: "Implementing distributed tracing pipelines", concept: C("context propagation; sampling") },
  { domain: "universal.observability", title: "Designing log aggregation systems", concept: C("collect, index, retain") },
  { domain: "universal.observability", title: "Implementing structured logging standards", concept: C("structured fields; levels") },
  { domain: "universal.observability", title: "Designing metrics collection systems", concept: C("counters, gauges, histograms") },
  { domain: "universal.observability", title: "Implementing system health monitoring", concept: C("liveness, readiness") },
  { domain: "universal.observability", title: "Designing anomaly detection pipelines", concept: C("baseline; alert on deviation") },
  { domain: "universal.observability", title: "Implementing alerting systems", concept: C("rules, routing, escalation") },
  { domain: "universal.observability", title: "Designing service dependency graphs", concept: C("topology; impact analysis") },
  { domain: "universal.observability", title: "Implementing performance dashboards", concept: C("key metrics; drill-down") },
];

/** 7. Security & safety (10) */
const SECURITY: SeedSpec[] = [
  { domain: "universal.security", title: "Designing threat modeling workflows", concept: C("assets, threats, mitigations") },
  { domain: "universal.security", title: "Implementing secure authentication systems", concept: C("credentials, tokens, sessions") },
  { domain: "universal.security", title: "Designing authorization models", concept: C("RBAC/ABAC; least privilege") },
  { domain: "universal.security", title: "Implementing zero trust architectures", concept: C("verify every request") },
  { domain: "universal.security", title: "Designing secure API authentication", concept: C("tokens, scopes, rate limits") },
  { domain: "universal.security", title: "Implementing input validation frameworks", concept: C("validate and sanitize all inputs") },
  { domain: "universal.security", title: "Designing secret management systems", concept: C("encrypt; access control") },
  { domain: "universal.security", title: "Implementing secure configuration management", concept: C("no secrets in config; vault") },
  { domain: "universal.security", title: "Designing vulnerability scanning pipelines", concept: C("scan; prioritize; remediate") },
  { domain: "universal.security", title: "Implementing security audit logging", concept: C("security events; tamper-evident") },
];

/** 8. DevOps & deployment (10) */
const DEVOPS: SeedSpec[] = [
  { domain: "universal.devops", title: "Designing CI/CD pipelines", concept: C("build, test, deploy stages") },
  { domain: "universal.devops", title: "Implementing automated deployment systems", concept: C("trigger and verify") },
  { domain: "universal.devops", title: "Designing infrastructure-as-code frameworks", concept: C("declarative; versioned") },
  { domain: "universal.devops", title: "Implementing container orchestration", concept: C("schedule, scale, heal") },
  { domain: "universal.devops", title: "Designing multi-environment deployment strategies", concept: C("env parity; promotion") },
  { domain: "universal.devops", title: "Implementing blue-green deployment patterns", concept: C("two envs; switch traffic") },
  { domain: "universal.devops", title: "Designing rollback procedures", concept: C("trigger and verify rollback") },
  { domain: "universal.devops", title: "Implementing release automation systems", concept: C("gates and automation") },
  { domain: "universal.devops", title: "Designing infrastructure monitoring", concept: C("infra metrics and alerts") },
  { domain: "universal.devops", title: "Implementing automated environment provisioning", concept: C("provision from code") },
];

/** 9. Data engineering (10) */
const DATA: SeedSpec[] = [
  { domain: "universal.data", title: "Designing ETL pipelines", concept: C("extract, transform, load; idempotent") },
  { domain: "universal.data", title: "Implementing data validation frameworks", concept: C("schema and business rules") },
  { domain: "universal.data", title: "Designing dataset versioning systems", concept: C("version and lineage") },
  { domain: "universal.data", title: "Implementing data lineage tracking", concept: C("source to sink") },
  { domain: "universal.data", title: "Designing schema evolution systems", concept: C("additive; compatibility") },
  { domain: "universal.data", title: "Implementing data quality monitoring", concept: C("checks and alerts") },
  { domain: "universal.data", title: "Designing data governance frameworks", concept: C("policies, quality, access") },
  { domain: "universal.data", title: "Implementing dataset deduplication", concept: C("match and merge") },
  { domain: "universal.data", title: "Designing streaming data pipelines", concept: C("consume, process, sink") },
  { domain: "universal.data", title: "Implementing data anonymization workflows", concept: C("PII detection and anonymize") },
];

/** 10. Research reproducibility (10) */
const RESEARCH_REPRO: SeedSpec[] = [
  { domain: "universal.research_repro", title: "Designing experiment tracking systems", concept: C("params, metrics, artifacts") },
  { domain: "universal.research_repro", title: "Implementing reproducible research pipelines", concept: C("version code, data, env") },
  { domain: "universal.research_repro", title: "Designing dataset provenance tracking", concept: C("origin and transformations") },
  { domain: "universal.research_repro", title: "Implementing experiment replication procedures", concept: C("replicate protocol; compare") },
  { domain: "universal.research_repro", title: "Designing research artifact preservation", concept: C("store and cite artifacts") },
  { domain: "universal.research_repro", title: "Implementing scientific workflow documentation", concept: C("document steps and deps") },
  { domain: "universal.research_repro", title: "Designing statistical validation workflows", concept: C("assumptions and tests") },
  { domain: "universal.research_repro", title: "Implementing research data governance", concept: C("retention; access") },
  { domain: "universal.research_repro", title: "Designing hypothesis validation pipelines", concept: C("hypothesis; test; report") },
  { domain: "universal.research_repro", title: "Implementing experiment audit trails", concept: C("immutable log of changes") },
];

/** 11. Performance engineering (10) */
const PERFORMANCE: SeedSpec[] = [
  { domain: "universal.performance", title: "Designing system performance benchmarks", concept: C("workload; metrics; baseline") },
  { domain: "universal.performance", title: "Implementing latency profiling workflows", concept: C("instrument; analyze hotspots") },
  { domain: "universal.performance", title: "Designing throughput measurement systems", concept: C("load; measure ops/s") },
  { domain: "universal.performance", title: "Implementing memory profiling pipelines", concept: C("allocations; leaks") },
  { domain: "universal.performance", title: "Designing CPU optimization strategies", concept: C("profile; optimize hot paths") },
  { domain: "universal.performance", title: "Implementing concurrency performance analysis", concept: C("contention; parallelism") },
  { domain: "universal.performance", title: "Designing caching strategies", concept: C("what to cache; invalidation") },
  { domain: "universal.performance", title: "Implementing load testing pipelines", concept: C("sustained load; SLO") },
  { domain: "universal.performance", title: "Designing resource utilization monitoring", concept: C("CPU, memory, I/O") },
  { domain: "universal.performance", title: "Implementing performance regression detection", concept: C("compare to baseline; alert") },
];

/** 12. Knowledge linking & traceability (10) */
const KNOWLEDGE_LINKING: SeedSpec[] = [
  { domain: "universal.knowledge", title: "Creating cross-reference links between documentation", concept: C("links; validate; fix broken") },
  { domain: "universal.knowledge", title: "Designing knowledge dependency graphs", concept: C("nodes and edges; impact") },
  { domain: "universal.knowledge", title: "Implementing knowledge indexing systems", concept: C("index for search and routing") },
  { domain: "universal.knowledge", title: "Designing capability mapping frameworks", concept: C("capability to artifact map") },
  { domain: "universal.knowledge", title: "Implementing knowledge provenance tracking", concept: C("origin and derivation") },
  { domain: "universal.knowledge", title: "Designing semantic linking between procedures", concept: C("semantic relations; traversal") },
  { domain: "universal.knowledge", title: "Implementing documentation reference validation", concept: C("resolve refs; report broken") },
  { domain: "universal.knowledge", title: "Designing knowledge update propagation", concept: C("when source changes; notify or cascade") },
  { domain: "universal.knowledge", title: "Implementing knowledge integrity checks", concept: C("consistency and completeness") },
  { domain: "universal.knowledge", title: "Designing traceable engineering workflows", concept: C("trace task to artifacts and deps") },
];

export const UNIVERSAL_ENGINEERING_SEED_SPECS: SeedSpec[] = [
  ...ARCHITECTURE,
  ...CODE_QUALITY,
  ...DOCUMENTATION,
  ...UX_UI,
  ...TESTING,
  ...OBSERVABILITY,
  ...SECURITY,
  ...DEVOPS,
  ...DATA,
  ...RESEARCH_REPRO,
  ...PERFORMANCE,
  ...KNOWLEDGE_LINKING,
];
