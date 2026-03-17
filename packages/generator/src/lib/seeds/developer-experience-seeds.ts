/**
 * Developer Experience Seeds (~65 seed procedures).
 * Internal developer portals, golden paths, cognitive load reduction,
 * docs-as-code, onboarding automation, DX metrics, and developer productivity.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Internal developer portals (10) */
const IDP: SeedSpec[] = [
  { domain: "dx.portal.architecture", title: "Designing internal developer portal architectures", concept: C("portal = catalog + scaffolding + docs + metrics; plugin architecture; Backstage or custom; team owns their plugins") },
  { domain: "dx.portal.catalog", title: "Implementing software catalog in internal developer portals", concept: C("register: service, library, API, dataset; auto-discover from git; owner, SLO, dependencies, runbooks per entity") },
  { domain: "dx.portal.templates", title: "Designing service template systems in developer portals", concept: C("template = cookiecutter or Backstage Software Template; parameterized; creates repo with CI/CD pre-wired; guided") },
  { domain: "dx.portal.techdocs", title: "Implementing docs-as-code pipelines for developer portals", concept: C("mkdocs or docusaurus; build from repo; publish to portal on merge; search indexed; team owns their docs") },
  { domain: "dx.portal.search", title: "Designing unified search in internal developer portals", concept: C("index: catalog, docs, runbooks, APIs, teams; single search bar; rank by relevance and recency; filter by type") },
  { domain: "dx.portal.apis", title: "Surfacing internal API documentation in developer portals", concept: C("auto-import OpenAPI/AsyncAPI specs; render interactive docs; link to catalog entity; version selector") },
  { domain: "dx.portal.scorecards", title: "Implementing service quality scorecards in developer portals", concept: C("score by: has runbook, has SLO, has owner, passes tests, has docs, dependency up to date; track trend") },
  { domain: "dx.portal.onboarding", title: "Designing developer onboarding journeys via developer portals", concept: C("guided checklist: setup, first PR, first deploy, first on-call; links to each step; progress tracking") },
  { domain: "dx.portal.announcements", title: "Implementing platform announcements in developer portals", concept: C("banner for: outages, breaking changes, deprecations, migrations; targeted by team; dismiss and snooze") },
  { domain: "dx.portal.metrics", title: "Displaying DORA metrics and developer productivity in portals", concept: C("deploy frequency, lead time, MTTR, change failure rate per team; trend chart; benchmark vs org average") },
];

/** 2. Golden paths (8) */
const GOLDEN_PATHS: SeedSpec[] = [
  { domain: "dx.golden_path.design", title: "Designing golden path workflows for common engineering tasks", concept: C("golden path = opinionated, supported, documented standard way; escape hatch documented; maintained by platform team") },
  { domain: "dx.golden_path.new_service", title: "Designing new service golden path from zero to production", concept: C("scaffold → CI/CD → observability → service catalog registration → runbook → SLO → done; all automated") },
  { domain: "dx.golden_path.database", title: "Designing golden path for database provisioning and migration", concept: C("request via IDP → provision → connection string in secrets manager → migration tooling pre-configured") },
  { domain: "dx.golden_path.feature_flag", title: "Designing golden path for feature flag adoption", concept: C("create flag in portal → SDK auto-configured → evaluation logging pre-wired → cleanup reminder after N days") },
  { domain: "dx.golden_path.observability", title: "Designing golden path for service observability setup", concept: C("template includes: structured logging, metrics instrumentation, trace auto-injection; dashboard auto-created") },
  { domain: "dx.golden_path.security", title: "Designing golden path for security compliance in new services", concept: C("SAST pre-configured; secret scanning; dependency audit; security review checklist in PR template; SBOM generation") },
  { domain: "dx.golden_path.testing", title: "Designing golden path for test infrastructure setup", concept: C("unit test framework pre-configured; integration test harness ready; CI test stage pre-wired; coverage gate") },
  { domain: "dx.golden_path.adoption", title: "Driving golden path adoption through incentives and metrics", concept: C("scorecard rewards golden path compliance; track off-path services; support only golden path in SLA; migration guide") },
];

/** 3. Documentation systems (8) */
const DOCS: SeedSpec[] = [
  { domain: "dx.docs.as_code", title: "Implementing docs-as-code pipelines for engineering documentation", concept: C("docs in repo as markdown; CI builds and deploys on merge; PR review for docs changes; lint prose; version with code") },
  { domain: "dx.docs.architecture", title: "Designing documentation architecture for engineering teams", concept: C("Diataxis: tutorials, how-tos, reference, explanation; separate by type; cross-link; search indexed") },
  { domain: "dx.docs.api", title: "Implementing automated API documentation generation pipelines", concept: C("OpenAPI from code annotations or spec; render with Redoc or Swagger UI; publish on deploy; link from catalog") },
  { domain: "dx.docs.runbook", title: "Designing runbook standards and templates for operational docs", concept: C("trigger, impact, diagnosis steps, remediation, escalation; link from alert; tested quarterly; owned by team") },
  { domain: "dx.docs.adr", title: "Implementing architecture decision record processes", concept: C("ADR template: context, decision, consequences, alternatives; stored in repo; indexed in portal; never deleted") },
  { domain: "dx.docs.freshness", title: "Implementing documentation freshness tracking and alerts", concept: C("last reviewed date per doc; alert owners on docs > N months old; block merge if linked docs outdated") },
  { domain: "dx.docs.search", title: "Implementing documentation search for engineering knowledge bases", concept: C("full-text + semantic search; index on publish; rank by recency and relevance; filter by doc type and team") },
  { domain: "dx.docs.contribution", title: "Designing low-friction documentation contribution workflows", concept: C("edit button on every page; PR preview with rendered diff; review by doc owner or auto-merge on minor change") },
];

/** 4. Onboarding automation (8) */
const ONBOARDING: SeedSpec[] = [
  { domain: "dx.onboarding.checklist", title: "Designing automated onboarding checklists for new engineers", concept: C("checklist: accounts, access, local setup, first PR, first deploy, team intro; progress tracked in portal; automated checks") },
  { domain: "dx.onboarding.environment", title: "Automating developer environment setup for new engineers", concept: C("bootstrap script: installs tools, clones repos, configures credentials; idempotent; tested weekly in CI") },
  { domain: "dx.onboarding.access", title: "Automating access provisioning for new engineering hires", concept: C("role-based access groups; join team → get group access; manager triggers; audit access granted; time-boxed for contractors") },
  { domain: "dx.onboarding.buddy", title: "Designing engineering buddy program systems for knowledge transfer", concept: C("auto-assign buddy on day 1; structured 30/60/90 day touchpoints; feedback survey; buddy rotation to spread load") },
  { domain: "dx.onboarding.day_one", title: "Designing day-one engineering onboarding experiences", concept: C("laptop ready day 1; credentials working; welcome tour of platform tools; first PR merged; wins early") },
  { domain: "dx.onboarding.codebase_tour", title: "Designing codebase orientation procedures for new engineers", concept: C("architecture overview doc; service map in portal; key entry points annotated; guided tour PR comment walk-through") },
  { domain: "dx.onboarding.feedback", title: "Collecting and acting on engineering onboarding feedback", concept: C("survey at day 7, 30, 90; rating + free text; trend analysis; owner per feedback category; close loop with reporter") },
  { domain: "dx.onboarding.time_to_productivity", title: "Measuring and optimizing time-to-first-contribution for new engineers", concept: C("track days to first merged PR; first production deploy; set target; identify blockers from onboarding feedback") },
];

/** 5. DX metrics (8) */
const DX_METRICS: SeedSpec[] = [
  { domain: "dx.metrics.dora", title: "Implementing DORA metrics measurement for engineering teams", concept: C("deploy frequency: deploys per day; lead time: commit to prod; MTTR: incident detection to recovery; CFR: failed deploys %") },
  { domain: "dx.metrics.space", title: "Implementing SPACE framework metrics for developer productivity", concept: C("satisfaction, performance, activity, communication, efficiency; survey + system metrics; team-level not individual") },
  { domain: "dx.metrics.build_time", title: "Measuring and optimizing CI/CD build time metrics", concept: C("track p50/p95 build time per pipeline; trend over time; alert on regression; attribute to slowest stage") },
  { domain: "dx.metrics.pr_cycle", title: "Measuring pull request cycle time for developer flow", concept: C("PR open to merge: total; breakdown: time-to-first-review, review cycles, time-in-merge-queue; team dashboard") },
  { domain: "dx.metrics.flakiness", title: "Measuring and reducing test flakiness impact on developer flow", concept: C("track flake rate per test; quarantine above threshold; alert owners; dedicate time each sprint to flake reduction") },
  { domain: "dx.metrics.toil", title: "Measuring engineering toil to identify automation opportunities", concept: C("survey: hours per week on manual tasks; categorize by type; automate highest-volume first; track reduction over time") },
  { domain: "dx.metrics.incident_impact", title: "Measuring incident impact on developer productivity", concept: C("track: incidents per team per month, pager load per engineer, after-hours pages; target max per SRE contract") },
  { domain: "dx.metrics.satisfaction", title: "Measuring developer satisfaction with tooling and processes", concept: C("quarterly DX survey; eNPS for tooling; segment by tenure and team; act on lowest-scoring dimensions") },
];

/** 6. Cognitive load reduction (8) */
const COGNITIVE_LOAD: SeedSpec[] = [
  { domain: "dx.cogload.complexity", title: "Identifying and reducing accidental complexity in engineering systems", concept: C("audit: # of tools, # of config formats, # of deployment patterns; consolidate; hide complexity in platform") },
  { domain: "dx.cogload.abstractions", title: "Designing platform abstractions to reduce developer cognitive load", concept: C("abstract away: cloud provider, infrastructure, observability; expose simple interfaces; validate abstraction with user research") },
  { domain: "dx.cogload.defaults", title: "Designing opinionated defaults to reduce decision fatigue", concept: C("sensible defaults for: log format, metric naming, alert thresholds; override only when needed; document why") },
  { domain: "dx.cogload.context_switching", title: "Reducing context switching costs in developer workflows", concept: C("consolidate tools into portal; deep links from alert to service to runbook; reduce number of required tools") },
  { domain: "dx.cogload.feedback_loops", title: "Shortening developer feedback loops for faster iteration", concept: C("local: < 1s; PR CI: < 5 min; staging deploy: < 10 min; production: fast and safe; measure and target each") },
  { domain: "dx.cogload.automation", title: "Automating repetitive developer tasks to reduce cognitive overhead", concept: C("automate: dependency updates, changelog generation, release notes, version bumps; bot PRs for review") },
  { domain: "dx.cogload.error_messages", title: "Designing actionable error messages for developer tools", concept: C("error = what happened + why + how to fix; link to docs; include context (file, line, config value); no jargon") },
  { domain: "dx.cogload.local_dev", title: "Designing local development environment parity with production", concept: C("docker-compose for local services; seed data scripts; feature flags work locally; same config format as prod") },
];

export const DEVELOPER_EXPERIENCE_SEED_SPECS: SeedSpec[] = [
  ...IDP,
  ...GOLDEN_PATHS,
  ...DOCS,
  ...ONBOARDING,
  ...DX_METRICS,
  ...COGNITIVE_LOAD,
];
