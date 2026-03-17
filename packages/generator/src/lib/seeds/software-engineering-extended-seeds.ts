/**
 * Software Engineering Extended Seeds (~80 seed procedures).
 * Testing depth, refactoring, dependency management, code quality,
 * software design principles, and engineering practices.
 * Domain: software.engineering.*
 * Complements high-impact-seeds.ts with deeper procedural coverage.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Testing depth (12) */
const TESTING: SeedSpec[] = [
  { domain: "software.testing.coverage_threshold", title: "Implementing test coverage threshold enforcement in CI pipelines", concept: C("measure line/branch coverage; fail CI if below threshold; set threshold at 80% line, 70% branch; track trend") },
  { domain: "software.testing.tdd", title: "Implementing test-driven development procedures", concept: C("red: write failing test; green: minimal code to pass; refactor: improve code keeping tests green; repeat per feature") },
  { domain: "software.testing.mutation", title: "Implementing mutation testing to validate test suite effectiveness", concept: C("introduce mutations: flip condition, delete statement; run tests; surviving mutant = test gap; fix or accept") },
  { domain: "software.testing.golden_file", title: "Implementing golden file testing for output stability validation", concept: C("capture output as golden file; compare on test run; diff on change; update intentionally with review; deterministic output required") },
  { domain: "software.testing.approval", title: "Implementing approval testing for complex output validation", concept: C("received output vs approved output; human approves on first run; auto-fail on change; auto-approve in CI with review") },
  { domain: "software.testing.parameterized", title: "Designing parameterized test suites for data-driven validation", concept: C("test cases as data: input + expected output; single test function; covers edge cases systematically; easy to extend") },
  { domain: "software.testing.end_to_end", title: "Designing end-to-end test suites for critical user journeys", concept: C("real browser or API client; full stack; critical paths only; flaky test quarantine; run on merge to main") },
  { domain: "software.testing.snapshot", title: "Implementing snapshot testing for UI component rendering", concept: C("render component; serialize to snapshot; compare on test run; review diff on change; update with intention") },
  { domain: "software.testing.component", title: "Designing component testing strategies for UI isolation", concept: C("test component in isolation; mock dependencies; test: render, interaction, state change, edge cases; no E2E overhead") },
  { domain: "software.testing.chaos", title: "Designing chaos engineering experiments for system resilience validation", concept: C("hypothesis: system handles X failure; inject failure; measure; validate hypothesis; steady state baseline required") },
  { domain: "software.testing.performance_regression", title: "Implementing performance regression testing in CI pipelines", concept: C("benchmark critical paths; compare to baseline; fail on > 10% regression; store results in time series; trend alert") },
  { domain: "software.testing.fuzz_integration", title: "Integrating fuzz testing into software engineering pipelines", concept: C("add fuzzing targets for parsing and validation; run in CI with time budget; corpus coverage tracking; fix crashes immediately") },
];

/** 2. Refactoring procedures (10) */
const REFACTORING: SeedSpec[] = [
  { domain: "software.refactoring.extract_method", title: "Implementing extract method refactoring procedures", concept: C("identify cohesive code block; extract to named function; replace original with call; verify tests still pass") },
  { domain: "software.refactoring.strangler_fig", title: "Implementing strangler fig pattern for legacy system migration", concept: C("facade in front of legacy; implement new path incrementally; route traffic to new; remove legacy when coverage = 100%") },
  { domain: "software.refactoring.branch_by_abstraction", title: "Implementing branch-by-abstraction for large-scale refactoring", concept: C("add abstraction layer; implement both old and new behind it; route new code to new impl; remove old impl; remove layer") },
  { domain: "software.refactoring.feature_flags_refactor", title: "Using feature flags to safely deploy refactored code", concept: C("flag gates old vs new impl; deploy both; route to new % gradually; monitor metrics; remove old on full rollout") },
  { domain: "software.refactoring.data_migration", title: "Designing safe data migration procedures for schema changes", concept: C("dual-write old and new schema; backfill new schema; verify parity; switch reads to new; remove old; no downtime") },
  { domain: "software.refactoring.dependency_inversion", title: "Applying dependency inversion refactoring to decouple modules", concept: C("introduce interface; make concrete depend on interface; inject implementation; verify tests pass; enable mocking") },
  { domain: "software.refactoring.complexity_reduction", title: "Reducing cyclomatic complexity through targeted refactoring", concept: C("measure: complexity > 10 = target; extract conditional blocks; early returns; strategy pattern; re-measure after") },
  { domain: "software.refactoring.test_coverage_first", title: "Establishing test coverage before refactoring legacy code", concept: C("characterization tests: record current behavior; golden tests; achieve coverage; then refactor safely; tests catch regression") },
  { domain: "software.refactoring.rename", title: "Implementing safe rename refactoring procedures across codebases", concept: C("IDE rename; verify all references updated; search for string literals; update docs; check external APIs if public") },
  { domain: "software.refactoring.decompose_conditional", title: "Refactoring complex conditional logic with decomposition patterns", concept: C("extract condition to named predicate; extract branches to named functions; use polymorphism for type-based branching") },
];

/** 3. Dependency management (10) */
const DEPENDENCIES: SeedSpec[] = [
  { domain: "software.dependency_management.upgrade", title: "Designing dependency upgrade procedures for security and compatibility", concept: C("weekly automated PRs; review changelog; test; merge; track: days since last upgrade per dependency; alert on CVE") },
  { domain: "software.dependency_management.pinning", title: "Implementing dependency version pinning strategies", concept: C("pin exact versions in lockfile; range in manifest; automated update PRs; reproducible builds with lockfile") },
  { domain: "software.dependency_management.audit", title: "Implementing dependency security audit procedures in CI", concept: C("npm audit or pip-audit or Snyk in CI; block on critical; track vulnerabilities; SLA by severity for remediation") },
  { domain: "software.dependency_management.bloat", title: "Detecting and removing unused dependencies from projects", concept: C("depcheck or similar; list unused; remove; verify build and tests pass; measure bundle size before/after") },
  { domain: "software.dependency_management.sbom", title: "Generating software bill of materials for dependency tracking", concept: C("SBOM in SPDX or CycloneDX format; generate at build; include transitive deps; publish with release; scan for CVEs") },
  { domain: "software.dependency_management.circular", title: "Detecting and resolving circular dependency issues in codebases", concept: C("madge or similar tool; detect cycles in import graph; break cycles by extracting shared module or inverting dependency") },
  { domain: "software.dependency_management.major_upgrade", title: "Designing major version dependency upgrade procedures", concept: C("read migration guide; branch upgrade; update usage; run tests; fix deprecations; test in staging; phased rollout") },
  { domain: "software.dependency_management.peer", title: "Managing peer dependency conflicts in shared library development", concept: C("declare peer deps; test with min and max peer versions; document compatibility matrix; warn on unsupported version") },
  { domain: "software.dependency_management.internal", title: "Designing internal package dependency management in monorepos", concept: C("workspace protocol for local deps; semantic versioning for published; dependency graph in monorepo tooling") },
  { domain: "software.dependency_management.license", title: "Auditing dependency licenses for compliance", concept: C("license-checker or FOSSA; list all licenses; block copyleft in commercial; document approved list; alert on new license") },
];

/** 4. Code quality procedures (10) */
const CODE_QUALITY: SeedSpec[] = [
  { domain: "software.code_quality.review_procedure", title: "Designing code review procedures for quality enforcement", concept: C("checklist: correctness, tests, naming, complexity, security, docs; two approvals for critical paths; blocking vs non-blocking") },
  { domain: "software.code_quality.pr_size", title: "Enforcing pull request size limits for review effectiveness", concept: C("max 400 lines changed; split large PRs; stacked PRs for dependent changes; bot enforces limit in CI") },
  { domain: "software.code_quality.naming", title: "Implementing naming convention enforcement procedures", concept: C("lint rules for naming; camelCase, PascalCase, SCREAMING_SNAKE by context; descriptive not abbreviated; consistent codebase") },
  { domain: "software.code_quality.dead_code_elimination", title: "Implementing dead code detection and elimination procedures", concept: C("static analysis finds unreachable code; coverage gaps identify unused; remove in dedicated cleanup PRs; track reduction") },
  { domain: "software.code_quality.comments", title: "Implementing code comment quality standards", concept: C("comment why not what; API docs on public interfaces; avoid stale comments; update comments with code changes") },
  { domain: "software.code_quality.type_safety", title: "Implementing type safety enforcement procedures for dynamically typed codebases", concept: C("strict TypeScript or mypy; no any in production code; explicit return types; typed tests; block type errors in CI") },
  { domain: "software.code_quality.solid_validation", title: "Validating SOLID principle adherence in code review procedures", concept: C("SRP: one reason to change; OCP: extend without modify; LSP: substitutable; ISP: small interfaces; DIP: abstractions") },
  { domain: "software.code_quality.technical_debt", title: "Implementing technical debt tracking and remediation procedures", concept: C("TODO/FIXME with ticket reference; debt register by component; allocate 20% sprint capacity to debt; track trend") },
  { domain: "software.code_quality.documentation_coverage", title: "Measuring and enforcing API documentation coverage", concept: C("enforce JSDoc or docstring on public API; coverage tool; block undocumented public exports in CI; template per type") },
  { domain: "software.code_quality.pair_programming", title: "Designing pair programming procedures for complex problem solving", concept: C("driver writes; navigator reviews; swap every 25 min; use for: complex logic, security-critical code, knowledge transfer") },
];

/** 5. Software design principles (10) */
const DESIGN_PRINCIPLES: SeedSpec[] = [
  { domain: "software.engineering.dry", title: "Applying DRY principle to eliminate code duplication", concept: C("identify duplication; extract shared abstraction; single source of truth; balance DRY vs premature abstraction") },
  { domain: "software.engineering.yagni", title: "Applying YAGNI principle to avoid speculative features", concept: C("build only for current requirements; no future-proofing without evidence of need; remove unused abstractions") },
  { domain: "software.engineering.kiss", title: "Applying KISS principle to maintain system simplicity", concept: C("simplest solution that works; avoid unnecessary abstraction; complexity budget per module; review for over-engineering") },
  { domain: "software.engineering.fail_fast", title: "Implementing fail-fast validation patterns in software systems", concept: C("validate inputs at boundaries; throw early on invalid; surface errors before damage propagates; explicit preconditions") },
  { domain: "software.engineering.defensive", title: "Implementing defensive programming procedures for robust systems", concept: C("validate all inputs; assert invariants; handle all error paths; no silent failures; degrade gracefully") },
  { domain: "software.engineering.design_by_contract", title: "Implementing design-by-contract procedures for module interfaces", concept: C("preconditions: caller's responsibility; postconditions: callee's guarantee; invariants: always true; document per function") },
  { domain: "software.engineering.cohesion", title: "Measuring and improving module cohesion in software design", concept: C("high cohesion: module does one thing; move unrelated functions out; LCOM metric; split by single responsibility") },
  { domain: "software.engineering.coupling", title: "Measuring and reducing coupling between software modules", concept: C("coupling types: content, control, stamp, data, message; prefer message; depend on interfaces not implementations") },
  { domain: "software.engineering.encapsulation", title: "Implementing encapsulation to protect module invariants", concept: C("private internal state; public interface only; validate on mutation; expose behavior not data; immutable where possible") },
  { domain: "software.engineering.composition", title: "Applying composition over inheritance in software design", concept: C("compose behavior from small focused objects; avoid deep inheritance; mixins for reuse; easier to test and reason about") },
];

/** 6. Engineering process (10) */
const PROCESS: SeedSpec[] = [
  { domain: "software.engineering.process.definition_of_done", title: "Implementing definition of done procedures for engineering tasks", concept: C("done = code + tests + docs + review + CI pass + deployed to staging; checklist in PR template; enforced by reviewer") },
  { domain: "software.engineering.process.sprint_planning", title: "Designing sprint planning procedures for engineering teams", concept: C("estimate by story points or t-shirt size; capacity = team velocity; prioritize by value + risk; buffer 20% for toil") },
  { domain: "software.engineering.process.postmortem", title: "Implementing blameless postmortem procedures for engineering incidents", concept: C("timeline; contributing factors; 5-whys; action items with owners and dates; share widely; track action completion") },
  { domain: "software.engineering.process.adr", title: "Implementing architectural decision record procedures", concept: C("template: context, decision, consequences, alternatives considered; stored in repo; never modified; superseded by new ADR") },
  { domain: "software.engineering.process.on_call", title: "Designing on-call rotation procedures for engineering teams", concept: C("rotation schedule; handover procedure; runbook links; escalation policy; toil tracking; post-on-call review") },
  { domain: "software.engineering.process.incident_drill", title: "Designing incident response drill procedures for engineering teams", concept: C("simulated incident; use real runbooks; measure MTTD and MTTR; debrief; update playbooks; quarterly cadence") },
  { domain: "software.engineering.process.feature_flags_lifecycle", title: "Implementing feature flag lifecycle management procedures", concept: C("create → ship → GA → deprecate → remove; max age 90 days; flag owner; cleanup PR auto-generated; track stale flags") },
  { domain: "software.engineering.process.release", title: "Designing release management procedures for software deployments", concept: C("release checklist: tests pass, staging validated, rollback ready, runbook updated, stakeholders notified; release notes") },
  { domain: "software.engineering.process.code_freeze", title: "Implementing code freeze procedures for release stabilization", concept: C("freeze N days before release; only bug fixes; exception process; dedicated branch; automated freeze enforcement") },
  { domain: "software.engineering.process.engineering_metrics", title: "Measuring software engineering team productivity metrics", concept: C("DORA: deploy frequency, lead time, MTTR, CFR; cycle time; test coverage trend; incident count; track weekly") },
];

export const SOFTWARE_ENGINEERING_EXTENDED_SEED_SPECS: SeedSpec[] = [
  ...TESTING,
  ...REFACTORING,
  ...DEPENDENCIES,
  ...CODE_QUALITY,
  ...DESIGN_PRINCIPLES,
  ...PROCESS,
];
