/**
 * High-impact seed procedures for AI/LLM operational KBs.
 * ~500 seeds across architecture, agents, algorithms, research, testing, security, DevOps, data, docs, UX, code quality.
 * Designed to expand to 25k–30k+ KBs (1 seed → 10–50 expansions across domains).
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (title: string, op: string, anti?: string): string =>
  `Operational procedure: ${title}. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: ${anti ?? "vague or non-actionable steps."}`;

/** 1. Advanced Software Architecture (14) */
const ARCHITECTURE: SeedSpec[] = [
  { domain: "software.architecture.microservice", title: "Designing a scalable microservice architecture", concept: C("scalable microservice architecture", "define service boundaries, contracts, and scaling axes") },
  { domain: "software.architecture.ddd", title: "Building a domain-driven design service boundary", concept: C("DDD service boundary", "identify bounded contexts and aggregate roots") },
  { domain: "software.architecture.event_driven", title: "Designing event-driven architecture with message brokers", concept: C("event-driven architecture", "define events, producers, consumers, and broker topology") },
  { domain: "software.architecture.idempotent_api", title: "Designing idempotent APIs", concept: C("idempotent APIs", "use idempotency keys and deterministic handling of retries") },
  { domain: "software.architecture.api_gateway", title: "Implementing API gateway patterns", concept: C("API gateway", "route, auth, rate-limit, and aggregate backend calls") },
  { domain: "software.architecture.cqrs", title: "Designing CQRS architectures", concept: C("CQRS", "separate read and write models and sync paths") },
  { domain: "software.architecture.service_mesh", title: "Designing service mesh observability", concept: C("service mesh observability", "instrument mesh for tracing, metrics, and access logs") },
  { domain: "software.architecture.fault_tolerant", title: "Designing fault-tolerant distributed systems", concept: C("fault-tolerant distributed systems", "define failure modes, timeouts, retries, and fallbacks") },
  { domain: "software.architecture.rate_limiting", title: "Implementing rate limiting strategies", concept: C("rate limiting", "choose algorithm (token bucket, sliding window) and apply per key") },
  { domain: "software.architecture.multitenant", title: "Designing multi-tenant SaaS architecture", concept: C("multi-tenant SaaS", "isolate tenant data, config, and quotas") },
  { domain: "software.architecture.zero_downtime", title: "Designing zero-downtime deployments", concept: C("zero-downtime deployments", "rolling or blue-green with health checks and drain") },
  { domain: "software.architecture.backpressure", title: "Designing backpressure handling", concept: C("backpressure", "propagate load signals and apply backpressure at boundaries") },
  { domain: "software.architecture.dependency_graph", title: "Designing service dependency graphs", concept: C("service dependency graph", "model and validate dependencies; detect cycles") },
  { domain: "software.architecture.tracing", title: "Building distributed tracing pipelines", concept: C("distributed tracing", "inject context, sample, and aggregate spans") },
  { domain: "software.architecture.api_versioning", title: "Designing API versioning strategies", concept: C("API versioning", "version by URL, header, or content; deprecate safely") },
];

/** 2. Agent & LLM System Architecture (14) */
const AGENT_LLM: SeedSpec[] = [
  { domain: "agent.orchestration.multi_agent", title: "Designing multi-agent orchestration pipelines", concept: C("multi-agent orchestration", "define roles, handoffs, and conflict resolution") },
  { domain: "agent.planning.task_decomposition", title: "Implementing task decomposition for LLM agents", concept: C("task decomposition for agents", "split goal into ordered subtasks with dependencies") },
  { domain: "agent.routing.capability", title: "Building capability routing systems", concept: C("capability routing", "map task to capability clusters and retrieve within cluster") },
  { domain: "agent.tools.selection", title: "Designing tool selection strategies", concept: C("tool selection", "match task schema to tool I/O and rank by fit") },
  { domain: "agent.memory.architecture", title: "Implementing agent memory architectures", concept: C("agent memory", "store, index, and retrieve by recency and relevance") },
  { domain: "agent.planning.hierarchical", title: "Designing hierarchical agent planners", concept: C("hierarchical planning", "plan at phases; refine when executing") },
  { domain: "agent.reasoning.reflection", title: "Implementing reflection loops for reasoning", concept: C("reflection loops", "critique output and refine before returning") },
  { domain: "agent.evaluation.pipeline", title: "Designing LLM evaluation pipelines", concept: C("LLM evaluation", "define metrics, run eval set, and track regressions") },
  { domain: "agent.reasoning.chain_of_thought", title: "Implementing chain-of-thought suppression", concept: C("chain-of-thought control", "enable or suppress CoT by task type") },
  { domain: "agent.routing.semantic", title: "Designing semantic routing systems", concept: C("semantic routing", "route by embedding similarity to capability descriptions") },
  { domain: "agent.multi_agent.conflict", title: "Implementing agent conflict resolution", concept: C("agent conflict resolution", "detect conflicts and apply merge or priority rules") },
  { domain: "agent.workflow.goal_driven", title: "Designing goal-driven agent workflows", concept: C("goal-driven workflows", "goal → plan → execute → validate loop") },
  { domain: "agent.discovery.capability_index", title: "Implementing capability discovery indexes", concept: C("capability discovery index", "index KBs by capability for fast routing") },
  { domain: "agent.planning.long_horizon", title: "Designing long-horizon planning agents", concept: C("long-horizon planning", "chunk horizon and replan at checkpoints") },
];

/** 3. Complex Algorithm Engineering (10) */
const ALGORITHMS: SeedSpec[] = [
  { domain: "algorithm.dynamic_programming", title: "Designing dynamic programming solutions", concept: C("DP solutions", "define subproblems, recurrence, and base cases") },
  { domain: "algorithm.graph_traversal", title: "Implementing graph traversal algorithms", concept: C("graph traversal", "BFS/DFS with visited set and goal check") },
  { domain: "algorithm.topological_scheduling", title: "Designing topological scheduling systems", concept: C("topological scheduling", "topo-sort DAG and execute by level") },
  { domain: "algorithm.heuristic_search", title: "Implementing heuristic search algorithms", concept: C("heuristic search", "A* or best-first with admissible heuristic") },
  { domain: "algorithm.constraint_satisfaction", title: "Designing constraint satisfaction solvers", concept: C("CSP solvers", "model variables, domains, constraints; backtrack or infer") },
  { domain: "algorithm.pathfinding", title: "Implementing A* pathfinding systems", concept: C("A* pathfinding", "f = g + h; open/closed sets; reconstruct path") },
  { domain: "algorithm.approximation", title: "Designing approximation algorithms", concept: C("approximation algorithms", "bound ratio to optimum; trade quality for time") },
  { domain: "algorithm.parallel_pipeline", title: "Implementing parallel algorithm pipelines", concept: C("parallel pipelines", "partition work and sync at stages") },
  { domain: "algorithm.data_structure_selection", title: "Designing data structure selection frameworks", concept: C("data structure selection", "match access patterns to structure complexity") },
  { domain: "algorithm.complexity_analysis", title: "Implementing algorithmic complexity analysis", concept: C("complexity analysis", "count steps and space; express in O-notation") },
];

/** 4. Scientific Research Procedures (10) */
const RESEARCH: SeedSpec[] = [
  { domain: "research.experimental.protocol", title: "Designing experimental protocols", concept: C("experimental protocol", "define hypothesis, variables, controls, and sample size") },
  { domain: "research.statistics.hypothesis_testing", title: "Implementing statistical hypothesis testing", concept: C("hypothesis testing", "choose test, set alpha, compute statistic, reject or retain") },
  { domain: "research.simulation.monte_carlo", title: "Designing Monte Carlo simulations", concept: C("Monte Carlo simulations", "sample random inputs and aggregate outcomes") },
  { domain: "research.data.normalization", title: "Implementing data normalization pipelines", concept: C("data normalization", "scale, center, or transform to target distribution") },
  { domain: "research.replication", title: "Designing replication experiments", concept: C("replication experiments", "replicate protocol and compare effect sizes") },
  { domain: "research.meta_analysis", title: "Implementing meta-analysis workflows", concept: C("meta-analysis", "aggregate effect sizes and heterogeneity") },
  { domain: "research.bayesian.inference", title: "Designing Bayesian inference models", concept: C("Bayesian inference", "prior, likelihood, posterior; sample or approximate") },
  { domain: "research.causal.inference", title: "Implementing causal inference pipelines", concept: C("causal inference", "identify confounders and estimate causal effect") },
  { domain: "research.literature.review", title: "Designing scientific literature reviews", concept: C("literature review", "search, screen, extract, and synthesize") },
  { domain: "research.reproducibility", title: "Implementing research reproducibility checks", concept: C("reproducibility checks", "version code, data, and environment; document steps") },
];

/** 5. Predictive Reasoning & Modeling (10) */
const PREDICTIVE: SeedSpec[] = [
  { domain: "ml.forecasting.time_series", title: "Designing time-series forecasting models", concept: C("time-series forecasting", "select model, fit, validate, and forecast horizon") },
  { domain: "ml.feature.engineering", title: "Implementing feature engineering pipelines", concept: C("feature engineering", "derive, select, and validate features") },
  { domain: "ml.risk.scoring", title: "Designing predictive risk scoring models", concept: C("risk scoring", "define risk events and score with calibrated model") },
  { domain: "ml.anomaly.detection", title: "Implementing anomaly detection systems", concept: C("anomaly detection", "baseline distribution; flag by threshold or score") },
  { domain: "ml.probabilistic.modeling", title: "Designing probabilistic modeling frameworks", concept: C("probabilistic modeling", "specify latent structure and infer parameters") },
  { domain: "ml.ensemble.prediction", title: "Implementing ensemble prediction systems", concept: C("ensemble prediction", "combine base models by voting or stacking") },
  { domain: "ml.decision_tree", title: "Designing decision tree reasoning models", concept: C("decision tree reasoning", "split by feature; leaf = prediction or action") },
  { domain: "ml.simulation.forecasting", title: "Implementing simulation-based forecasting", concept: C("simulation-based forecasting", "run scenarios and aggregate outcomes") },
  { domain: "ml.confidence.interval", title: "Designing confidence interval estimation", concept: C("confidence interval estimation", "compute interval for parameter or forecast") },
  { domain: "ml.predictive_maintenance", title: "Implementing predictive maintenance models", concept: C("predictive maintenance", "predict failure window and trigger maintenance") },
];

/** 6. Test Engineering & Validation (10) */
const TESTING: SeedSpec[] = [
  { domain: "software.testing.unit_generation", title: "Designing unit test generation systems", concept: C("unit test generation", "cover branches and edge cases; mock deps") },
  { domain: "software.testing.integration", title: "Implementing integration testing pipelines", concept: C("integration testing", "wire real deps; test boundaries and contracts") },
  { domain: "software.testing.coverage", title: "Designing test coverage analysis", concept: C("test coverage", "instrument and report line/branch coverage") },
  { domain: "software.testing.property_based", title: "Implementing property-based testing", concept: C("property-based testing", "generate inputs; assert invariants hold") },
  { domain: "software.testing.fuzz", title: "Designing fuzz testing frameworks", concept: C("fuzz testing", "mutate inputs and run until failure or budget") },
  { domain: "software.testing.load", title: "Implementing load testing procedures", concept: C("load testing", "define workload and measure latency/throughput") },
  { domain: "software.testing.contract", title: "Designing API contract testing", concept: C("API contract testing", "validate request/response against schema") },
  { domain: "software.testing.regression", title: "Implementing regression testing systems", concept: C("regression testing", "run baseline suite and diff results") },
  { domain: "software.testing.fault_injection", title: "Designing fault injection testing", concept: C("fault injection", "inject failures and verify recovery") },
  { domain: "software.testing.continuous", title: "Implementing continuous testing pipelines", concept: C("continuous testing", "trigger on commit; gate on pass/fail") },
];

/** 7. Codebase Analysis & Refactoring (10) */
const CODE_ANALYSIS: SeedSpec[] = [
  { domain: "software.codebase.complexity", title: "Performing code complexity analysis", concept: C("code complexity analysis", "compute cyclomatic complexity and hotspots") },
  { domain: "software.codebase.circular_deps", title: "Identifying circular dependencies", concept: C("circular dependencies", "build dep graph; detect cycles") },
  { domain: "software.codebase.refactoring", title: "Designing refactoring strategies", concept: C("refactoring strategies", "plan safe steps; preserve behavior") },
  { domain: "software.codebase.dead_code", title: "Detecting dead code paths", concept: C("dead code detection", "reachability from entry; flag unreachable") },
  { domain: "software.codebase.static_analysis", title: "Performing static code analysis", concept: C("static analysis", "parse, analyze, and report violations") },
  { domain: "software.codebase.dependency_pruning", title: "Designing dependency pruning procedures", concept: C("dependency pruning", "identify unused deps and remove") },
  { domain: "software.codebase.modularization", title: "Implementing code modularization", concept: C("code modularization", "extract modules and define interfaces") },
  { domain: "software.codebase.architecture_conformance", title: "Performing architecture conformance checks", concept: C("architecture conformance", "check deps against allowed layers") },
  { domain: "software.codebase.security_scan", title: "Identifying security vulnerabilities in code", concept: C("security vulnerability scan", "run rules and report findings") },
];

/** 8. File System & Project Architecture (10) */
const FILE_ARCHITECTURE: SeedSpec[] = [
  { domain: "project.structure.monorepo", title: "Designing monorepo file structures", concept: C("monorepo structure", "define workspace layout and package boundaries; enforce cross-package dependency rules", "dump all projects into a single flat src folder with no dependency rules") },
  { domain: "project.structure.modular", title: "Designing modular project architectures", concept: C("modular project", "modules with clear APIs and deps") },
  { domain: "project.structure.layered", title: "Implementing layered architecture directories", concept: C("layered directories", "layer rules and enforce in build") },
  { domain: "project.config.management", title: "Designing configuration management systems", concept: C("config management", "env-specific config and secrets") },
  { domain: "project.build.artifacts", title: "Implementing build artifact pipelines", concept: C("build artifact pipeline", "build, version, and publish artifacts") },
  { domain: "project.deps.package", title: "Designing package dependency management", concept: C("package dependency management", "declare and lock deps; resolve conflicts") },
  { domain: "project.docs.structure", title: "Structuring documentation directories", concept: C("documentation structure", "segment docs by audience (dev/ops/product); enforce a folder + template per audience", "mix API, runbook, and product docs in one folder with no audience labels") },
  { domain: "project.cicd.files", title: "Designing CI/CD pipeline file structures", concept: C("CI/CD file structure", "place config and scripts for pipelines") },
  { domain: "project.env.config", title: "Implementing environment configuration management", concept: C("environment config", "per-env vars and validation") },
];

/** 9. Security Engineering (10) */
const SECURITY: SeedSpec[] = [
  { domain: "software.security.threat_modeling", title: "Performing threat modeling analysis", concept: C("threat modeling", "enumerate assets; apply STRIDE per asset; assign CVSS; select controls per risk tier", "add HTTPS and call security done") },
  { domain: "software.security.auth", title: "Designing secure authentication systems", concept: C("secure authentication", "credentials, tokens, and session handling") },
  { domain: "software.security.zero_trust", title: "Implementing zero-trust architectures", concept: C("zero-trust", "verify every request; least privilege") },
  { domain: "software.security.key_rotation", title: "Designing cryptographic key rotation", concept: C("key rotation", "rotate keys and re-encrypt or dual-key") },
  { domain: "software.security.secret_storage", title: "Implementing secure secret storage", concept: C("secure secret storage", "encrypt at rest; access control") },
  { domain: "software.security.api_auth", title: "Designing secure API authentication", concept: C("API authentication", "tokens, scopes, and rate limits") },
  { domain: "software.security.vulnerability_assessment", title: "Performing vulnerability assessments", concept: C("vulnerability assessment", "scan and prioritize remediation") },
  { domain: "software.security.data_storage", title: "Designing secure data storage systems", concept: C("secure data storage", "encryption, access control, retention") },
  { domain: "software.security.audit_logging", title: "Implementing audit logging systems", concept: C("audit logging", "log security-relevant events; tamper-evident") },
];

/** 10. DevOps & Infrastructure (10) */
const DEVOPS: SeedSpec[] = [
  { domain: "devops.cicd.pipeline", title: "Designing CI/CD pipelines", concept: C("CI/CD pipeline", "build, test, deploy stages and gates") },
  { domain: "devops.iac", title: "Implementing infrastructure as code", concept: C("infrastructure as code", "define and apply infra declaratively") },
  { domain: "devops.container.orchestration", title: "Designing container orchestration strategies", concept: C("container orchestration", "schedule, scale, and heal containers") },
  { domain: "devops.kubernetes.deployment", title: "Implementing Kubernetes deployment pipelines", concept: C("Kubernetes deployment", "manifests, rollout, and rollback") },
  { domain: "devops.monitoring", title: "Designing service monitoring systems", concept: C("service monitoring", "metrics, alerts, and dashboards") },
  { domain: "devops.autoscaling", title: "Implementing auto-scaling infrastructure", concept: C("auto-scaling", "scale on metrics and bounds") },
  { domain: "devops.rollback", title: "Designing rollback deployment systems", concept: C("rollback deployment", "trigger and verify rollback path") },
  { domain: "devops.incident", title: "Implementing incident response workflows", concept: C("incident response", "detect, triage, mitigate, and postmortem") },
];

/** 11. Data Engineering (10) */
const DATA_ENGINEERING: SeedSpec[] = [
  { domain: "data.etl.pipeline", title: "Designing ETL pipelines", concept: C("ETL pipeline", "extract, transform, load with idempotency") },
  { domain: "data.validation.framework", title: "Implementing data validation frameworks", concept: C("data validation", "schema and business rules") },
  { domain: "data.warehouse.schema", title: "Designing data warehouse schemas", concept: C("warehouse schema", "star/snowflake and SCD") },
  { domain: "data.streaming.pipeline", title: "Implementing stream processing pipelines", concept: C("stream processing", "consume, process, and sink streams") },
  { domain: "data.versioning", title: "Designing data versioning systems", concept: C("data versioning", "version datasets and lineage") },
  { domain: "data.lineage.tracking", title: "Implementing data lineage tracking", concept: C("data lineage", "track source to sink") },
  { domain: "data.governance", title: "Designing data governance frameworks", concept: C("data governance", "policies, quality, and access") },
  { domain: "data.deduplication", title: "Implementing dataset deduplication", concept: C("dataset deduplication", "match and merge duplicates") },
];

/** 12. Technical Documentation (10) */
const DOCUMENTATION: SeedSpec[] = [
  { domain: "documentation.api", title: "Generating API documentation", concept: C("API documentation", "from spec or code; keep in sync") },
  { domain: "documentation.adr", title: "Writing architecture decision records", concept: C("ADRs", "context, decision, consequences") },
  { domain: "documentation.system_design", title: "Creating system design documents", concept: C("system design doc", "components, data flow, and tradeoffs") },
  { domain: "documentation.specification", title: "Generating technical specification templates", concept: C("technical spec template", "requirements, design, and acceptance") },
  { domain: "documentation.srs", title: "Writing software requirement specifications", concept: C("SRS", "functional and non-functional requirements") },
  { domain: "documentation.onboarding", title: "Creating developer onboarding guides", concept: C("developer onboarding", "setup, workflow, and norms") },
  { domain: "documentation.deployment", title: "Writing deployment documentation", concept: C("deployment documentation", "steps, env, and rollback") },
  { domain: "documentation.testing", title: "Generating testing documentation", concept: C("testing documentation", "strategy, cases, and results") },
  { domain: "documentation.runbooks", title: "Writing runbooks for incident response", concept: C("runbooks", "trigger, steps, and escalation") },
];

/** 13. Core Architecture Principles (20 of 40) */
const CORE_ARCHITECTURE: SeedSpec[] = [
  { domain: "software.architecture.modular", title: "Designing modular system architecture", concept: C("modular architecture", "define modules and interfaces") },
  { domain: "software.architecture.separation_of_concerns", title: "Applying separation of concerns in system design", concept: C("separation of concerns", "partition by responsibility") },
  { domain: "software.architecture.layered", title: "Implementing layered architecture patterns", concept: C("layered architecture", "layers and dependency direction") },
  { domain: "software.architecture.bounded_context", title: "Designing bounded contexts using domain driven design", concept: C("bounded contexts", "DDD boundaries and context maps") },
  { domain: "software.architecture.interface_segregation", title: "Applying interface segregation principles", concept: C("interface segregation", "small, focused interfaces") },
  { domain: "software.architecture.dependency_inversion", title: "Designing dependency inversion structures", concept: C("dependency inversion", "depend on abstractions") },
  { domain: "software.architecture.single_responsibility", title: "Implementing single responsibility components", concept: C("single responsibility", "one reason to change per component") },
  { domain: "software.architecture.loosely_coupled", title: "Designing loosely coupled service architectures", concept: C("loosely coupled services", "minimize direct deps") },
  { domain: "software.architecture.monolith_vs_microservice", title: "Evaluating tradeoffs between monoliths and microservices", concept: C("monolith vs microservice", "evaluate by scale and team") },
  { domain: "software.architecture.service_boundaries", title: "Designing scalable service boundaries", concept: C("service boundaries", "align to domain and scaling needs") },
  { domain: "software.architecture.abstraction_layers", title: "Creating abstraction layers for system flexibility", concept: C("abstraction layers", "hide implementation details") },
  { domain: "software.architecture.plugin", title: "Designing plugin based architectures", concept: C("plugin architecture", "extension points and contracts") },
  { domain: "software.architecture.clean_architecture", title: "Applying clean architecture principles", concept: C("clean architecture", "dependency rule and use cases") },
  { domain: "software.architecture.hexagonal", title: "Implementing hexagonal architecture models", concept: C("hexagonal architecture", "ports and adapters") },
  { domain: "software.architecture.decision_records", title: "Applying architectural decision records", concept: C("architectural decision records", "document context and decision") },
  { domain: "software.architecture.resilience", title: "Implementing system resilience patterns", concept: C("system resilience", "timeouts, retries, circuit breakers") },
  { domain: "software.architecture.observability", title: "Designing system observability layers", concept: C("observability", "logs, metrics, traces") },
  { domain: "software.architecture.decomposition", title: "Implementing system decomposition strategies", concept: C("system decomposition", "split by domain or capability") },
];

/** 14. UX and UI Engineering (15 of 35) */
const UX_UI: SeedSpec[] = [
  { domain: "ux.ui.spacing", title: "Designing consistent UI spacing systems", concept: C("UI spacing system", "scale and apply consistently") },
  { domain: "ux.ui.typography", title: "Implementing typography scale hierarchies", concept: C("typography hierarchy", "scale and semantic roles") },
  { domain: "ux.ui.responsive", title: "Designing responsive layout grids", concept: C("responsive grids", "breakpoints and fluid layout") },
  { domain: "ux.ui.accessibility", title: "Creating accessible user interface components", concept: C("accessible components", "ARIA and keyboard/screen reader") },
  { domain: "ux.ui.wcag", title: "Applying WCAG accessibility principles", concept: C("WCAG principles", "perceivable, operable, understandable, robust") },
  { domain: "ux.ui.interaction_flows", title: "Designing user centered interaction flows", concept: C("interaction flows", "user goals and paths") },
  { domain: "ux.ui.design_tokens", title: "Designing design token systems", concept: C("design tokens", "theme variables and scale") },
  { domain: "ux.ui.state_management", title: "Implementing UI state management patterns", concept: C("UI state management", "local and global state") },
  { domain: "ux.ui.dark_mode", title: "Designing dark mode interface systems", concept: C("dark mode", "theme switch and contrast") },
  { domain: "ux.ui.design_system", title: "Creating scalable design systems", concept: C("design system", "components, tokens, and docs") },
];

/** 15. Code Quality & Best Practices (15 of 40) */
const CODE_QUALITY: SeedSpec[] = [
  { domain: "software.quality.readability", title: "Implementing code readability standards", concept: C("code readability", "naming, length, and structure") },
  { domain: "software.quality.formatting", title: "Designing consistent code formatting rules", concept: C("code formatting", "style guide and auto-format") },
  { domain: "software.quality.linting", title: "Enforcing linting and style guidelines", concept: C("linting", "rules and fix") },
  { domain: "software.quality.code_review", title: "Designing code review procedures", concept: C("code review", "checklist and feedback loop") },
  { domain: "software.quality.error_handling", title: "Designing error handling conventions", concept: C("error handling", "types and propagation") },
  { domain: "software.quality.immutable_data", title: "Implementing immutable data patterns", concept: C("immutable data", "no in-place mutation") },
  { domain: "software.quality.dependency_management", title: "Designing dependency management policies", concept: C("dependency policy", "versioning and updates") },
  { domain: "software.quality.static_analysis", title: "Implementing static analysis pipelines", concept: C("static analysis pipeline", "run and gate on results") },
  { domain: "software.quality.documentation_coverage", title: "Designing code documentation coverage metrics", concept: C("documentation coverage", "measure and improve") },
  { domain: "software.quality.architecture_conformance", title: "Implementing architecture conformance checks", concept: C("architecture conformance", "enforce layer and deps") },
];

/** Flatten and export: ~200+ high-impact seeds. Use with --mode ai-seeds; combine with AI_SEED_SPECS for 25k+ expansion. */
export const HIGH_IMPACT_SEED_SPECS: SeedSpec[] = [
  ...ARCHITECTURE,
  ...AGENT_LLM,
  ...ALGORITHMS,
  ...RESEARCH,
  ...PREDICTIVE,
  ...TESTING,
  ...CODE_ANALYSIS,
  ...FILE_ARCHITECTURE,
  ...SECURITY,
  ...DEVOPS,
  ...DATA_ENGINEERING,
  ...DOCUMENTATION,
  ...CORE_ARCHITECTURE,
  ...UX_UI,
  ...CODE_QUALITY,
];
