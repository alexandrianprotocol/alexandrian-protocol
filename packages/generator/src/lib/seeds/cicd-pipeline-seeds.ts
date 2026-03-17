import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

// ── Deployment Strategies ──────────────────────────────────────────────────
const DEPLOYMENT_STRATEGIES: SeedSpec[] = [
  { domain: "cicd.deploy.canary", title: "Canary deployment: traffic split, validation gate, and promotion", concept: C("deploy new version to 5% of pods; route 5% traffic via weighted load balancer; observe for 10min: error_rate < 0.1% and p99 < SLO; if healthy: promote to 25%, 50%, 100% with 10min observation each; if degraded at any stage: rollback to 0% in < 60s; block promotion on SLO breach") },
  { domain: "cicd.deploy.blue_green", title: "Blue-green deployment: environment swap and rollback procedure", concept: C("maintain blue (current) and green (new) environments; deploy new version to green; run smoke tests against green; switch load balancer to green; monitor 15min; if healthy: decommission blue after 1h; if degraded: flip LB back to blue in < 30s; keep blue warm for 1h post-switch as rollback buffer") },
  { domain: "cicd.deploy.feature_flag_rollout", title: "Feature flag progressive rollout with kill-switch procedure", concept: C("deploy code behind flag=off; enable for 1% of users; monitor error_rate and user_feedback 24h; double cohort every 24h if healthy (1%→2%→5%→10%→25%→50%→100%); kill-switch: disable flag in < 30s if error_rate increases > 0.5% above baseline; remove flag code after 100% stable for 7 days") },
  { domain: "cicd.deploy.rollback_trigger", title: "Automated rollback trigger: SLO breach detection and execution", concept: C("monitor: error_rate and p99 latency for 5min post-deploy; rollback trigger: error_rate > 1% OR p99 > 2×baseline for 2min sustained; execute: kubectl rollout undo or pipeline rollback job; notify on-call; lock deployments until RCA; validate: metrics return to pre-deploy baseline within 5min") },
  { domain: "cicd.deploy.database_migration", title: "Zero-downtime database migration: expand-contract pattern", concept: C("step 1 expand: add new column/table (backward compatible); deploy app that writes to both old and new schema; step 2 migrate: backfill historical data in batches of 1000 rows; step 3 cutover: deploy app that reads from new schema only; step 4 contract: drop old column after 1 deploy cycle; never DROP column in same deploy as schema ADD") },
];

// ── Pipeline Validation ────────────────────────────────────────────────────
const PIPELINE_VALIDATION: SeedSpec[] = [
  { domain: "cicd.pipeline.build_verification", title: "Build verification test suite: gates and pass criteria", concept: C("gate 1: unit tests pass (coverage ≥ 80%); gate 2: lint and type-check clean; gate 3: build artifact produced with correct size bounds; gate 4: SBOM generated and no critical CVEs; gate 5: artifact signed with build key; block merge if any gate fails; surface results in PR comment within 5min") },
  { domain: "cicd.pipeline.integration_test_gate", title: "Integration test gate: ephemeral environment spin-up and teardown", concept: C("provision: ephemeral env from IaC (terraform apply -target=staging) in < 5min; run: integration test suite against ephemeral env; required pass rate: 100% of P0 tests, 95% of P1 tests; teardown: destroy env on pass or fail (terraform destroy); cost gate: ephemeral env cost < $1 per run") },
  { domain: "cicd.pipeline.secret_scanning", title: "Secret scanning in CI pipeline: detect and block credential leaks", concept: C("scan: every commit for secrets matching patterns (AWS keys, API tokens, PEM blocks, connection strings); block merge on any detection; allowlist: test fixtures in /test/fixtures with explicit annotation; alert: notify security team on detection; remediate: revoke credential, rewrite git history, re-scan to confirm clean") },
  { domain: "cicd.pipeline.artifact_promotion", title: "Artifact promotion across environments with immutability guarantee", concept: C("build artifact once; tag with git_sha and build_id; promote same artifact through: build → staging → production (never rebuild); validate artifact hash matches at each stage; sign artifact at build; verify signature before deploy; reject re-built artifacts (different hash = different artifact)") },
  { domain: "cicd.pipeline.dependency_update", title: "Automated dependency update pipeline with regression gate", concept: C("scan: weekly automated dependency update PRs (Dependabot or Renovate); gate: run full test suite + security scan on update PR; auto-merge if: tests pass, no new CVEs, version bump is minor or patch; require human review for: major version, packages with known breaking changes; track: update velocity and failed updates") },
];

// ── Infrastructure as Code ─────────────────────────────────────────────────
const IAC: SeedSpec[] = [
  { domain: "cicd.iac.terraform_plan_review", title: "Terraform plan review gate: resource change classification", concept: C("run terraform plan on PR; classify changes: Create (safe), Update in-place (safe), Replace (review required), Destroy (block); block merge if any Destroy without explicit approval; surface plan diff in PR comment; apply only from protected branch with plan artifact from PR") },
  { domain: "cicd.iac.drift_detection", title: "Infrastructure drift detection and reconciliation procedure", concept: C("run terraform plan against production state every 6h; alert if planned_changes > 0 (drift detected); classify: expected drift (from manual hotfix) vs unexpected; reconcile: apply drift correction within 24h; emergency drift: apply immediately with approval; log all drift events with cause") },
  { domain: "cicd.iac.environment_parity", title: "Environment parity enforcement between staging and production", concept: C("define parity checklist: same IaC modules, same versions, same instance types (proportional), same network topology; validate parity gate before each production deploy; drift: document and track parity exceptions in ADR; auto-detect: compare terraform state files for module version mismatch") },
];

// ── Release Management ─────────────────────────────────────────────────────
const RELEASE_MANAGEMENT: SeedSpec[] = [
  { domain: "cicd.release.changelog_generation", title: "Automated changelog generation from conventional commits", concept: C("enforce commit format: type(scope): description (feat, fix, chore, docs, refactor); generate changelog: group by type, extract breaking changes (BREAKING CHANGE footer); tag release with semver: breaking=major, feat=minor, fix=patch; publish changelog to release notes; validate: all PRs merged have valid commit format") },
  { domain: "cicd.release.release_train", title: "Release train cadence: branching, freeze, and publish procedure", concept: C("branch: cut release/v{version} from main on Monday; freeze: no new features merged to release branch after cutoff; bugfix: cherry-pick only verified fixes during freeze; tag: publish on Friday after QA sign-off; next cycle: immediately open next release branch; hotfix: patch release outside train on P0 severity") },
  { domain: "cicd.release.rollback_runbook", title: "Release rollback runbook: criteria, steps, and communication", concept: C("criteria: error_rate > 1% OR data corruption detected OR security vulnerability exploited; decision: on-call lead authorizes rollback; execute: redeploy previous artifact version (< 5min); notify: status page update within 2min; communicate: internal Slack alert with impact summary; postmortem: within 24h of resolution") },
];

export const CICD_PIPELINE_SEED_SPECS: SeedSpec[] = [
  ...DEPLOYMENT_STRATEGIES,
  ...PIPELINE_VALIDATION,
  ...IAC,
  ...RELEASE_MANAGEMENT,
];
