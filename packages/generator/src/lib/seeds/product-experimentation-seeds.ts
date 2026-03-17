/**
 * Product Experimentation Seeds (~60 seed procedures).
 * Feature flags, A/B testing infrastructure, statistical analysis,
 * experiment governance, metrics pipelines, and progressive rollout.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Feature flag systems (10) */
const FEATURE_FLAGS: SeedSpec[] = [
  { domain: "experimentation.flags.evaluation", title: "Designing feature flag evaluation engine architectures", concept: C("rule evaluation: user → targeting rules → default; first matching rule wins; fallback to default") },
  { domain: "experimentation.flags.targeting", title: "Implementing user targeting rules for feature flags", concept: C("target by: userId, email regex, cohort membership, percentage; evaluate rules in priority order") },
  { domain: "experimentation.flags.override", title: "Designing flag override systems for testing and QA", concept: C("per-user override via header, cookie, or admin panel; overrides bypass targeting; log override use") },
  { domain: "experimentation.flags.consistency", title: "Ensuring consistent flag evaluation for same user", concept: C("hash userId + flagKey → deterministic assignment; sticky to avoid flicker; server-side authoritative") },
  { domain: "experimentation.flags.sdk", title: "Designing client and server SDK interfaces for feature flags", concept: C("isEnabled(key, context) → bool; getVariant(key, context) → string; blocking init or streaming updates") },
  { domain: "experimentation.flags.caching", title: "Implementing flag evaluation caching for low-latency access", concept: C("cache flag config in process memory; refresh on interval or push; TTL fallback if source unavailable") },
  { domain: "experimentation.flags.kill_switch", title: "Designing kill switch patterns for emergency feature disable", concept: C("flag with 100% off default; operator toggles without deploy; propagates within seconds via push") },
  { domain: "experimentation.flags.lifecycle", title: "Managing feature flag lifecycle from creation to cleanup", concept: C("create → ship → cleanup; track flag age; alert on stale flags > 90 days; automate cleanup PRs") },
  { domain: "experimentation.flags.audit", title: "Auditing feature flag changes and evaluations", concept: C("log: flag change (who, what, when); sample evaluations with context; alert on unexpected distribution") },
  { domain: "experimentation.flags.gradual_rollout", title: "Implementing percentage-based gradual rollout flags", concept: C("bucket by hash(userId + salt) mod 100; enable for users < rollout%; increase % over time; monitor metrics") },
];

/** 2. A/B testing infrastructure (10) */
const AB_TESTING: SeedSpec[] = [
  { domain: "experimentation.ab.assignment", title: "Designing A/B experiment assignment systems", concept: C("hash(userId + experimentId) mod N → variant; deterministic; sticky for user lifetime") },
  { domain: "experimentation.ab.bucketing", title: "Implementing traffic bucketing for experiment isolation", concept: C("namespace experiments to avoid overlap; mutual exclusion groups; holdout separate from all experiments") },
  { domain: "experimentation.ab.exposure", title: "Implementing experiment exposure logging", concept: C("log on first evaluation: userId, experimentId, variantId, timestamp; deduplicate; use for analysis join") },
  { domain: "experimentation.ab.holdout", title: "Designing holdout group architectures for long-term impact", concept: C("holdout excluded from all experiments; measure cumulative impact vs holdout; size 5–10% of traffic") },
  { domain: "experimentation.ab.mutual_exclusion", title: "Implementing mutual exclusion groups for experiment isolation", concept: C("define exclusion groups; assign each user to at most one experiment in group; hash into group layer") },
  { domain: "experimentation.ab.multivariate", title: "Designing multivariate test architectures", concept: C("independent factors; factorial assignment; interaction effects require larger N; prefer A/B for most cases") },
  { domain: "experimentation.ab.override", title: "Implementing A/B test variant overrides for QA testing", concept: C("per-user variant override via header or admin; overridden users excluded from analysis; log override") },
  { domain: "experimentation.ab.ramp", title: "Designing A/B test traffic ramp-up procedures", concept: C("start at 5%/5%; check guardrail metrics; ramp to 50%/50% if clean; monitor throughout") },
  { domain: "experimentation.ab.srm", title: "Detecting sample ratio mismatch in A/B experiments", concept: C("expected vs actual assignment ratio; chi-squared test; SRM < 0.001 p-value is critical; investigate trigger") },
  { domain: "experimentation.ab.logging", title: "Designing A/B experiment event logging pipelines", concept: C("exposure event + metric events; join on userId + timestamp; event schema versioned; stream to warehouse") },
];

/** 3. Statistical analysis (10) */
const STATISTICS: SeedSpec[] = [
  { domain: "experimentation.stats.mde", title: "Calculating minimum detectable effect for experiment sizing", concept: C("MDE = f(power, alpha, baseline rate, sample size); solve for N given desired MDE") },
  { domain: "experimentation.stats.power", title: "Computing statistical power for A/B experiment designs", concept: C("power = 1 - β; typically 80%; requires: effect size, alpha, N; increase N to increase power") },
  { domain: "experimentation.stats.sequential", title: "Implementing sequential testing for continuous monitoring", concept: C("alpha spending function; always-valid p-values; peek any time; use GST or mSPRT methods") },
  { domain: "experimentation.stats.ttest", title: "Implementing t-test analysis for continuous metrics", concept: C("Welch's t-test; compute t statistic; p-value < alpha → significant; report CI and effect size") },
  { domain: "experimentation.stats.proportion", title: "Implementing proportion tests for binary metrics", concept: C("z-test for proportions; pooled standard error; two-tailed; Bonferroni for multiple metrics") },
  { domain: "experimentation.stats.cuped", title: "Implementing CUPED variance reduction in A/B analysis", concept: C("subtract covariate-adjusted pre-experiment metric; reduces variance; same expectation; smaller N needed") },
  { domain: "experimentation.stats.multiple_testing", title: "Controlling false discovery rate in multiple metric testing", concept: C("Benjamini-Hochberg for FDR control; Bonferroni for FWER; declare primary metric; treat others exploratory") },
  { domain: "experimentation.stats.outliers", title: "Handling outlier users in A/B experiment analysis", concept: C("cap or winsorize at 99th percentile per metric; document cap value; sensitive metrics need log transform") },
  { domain: "experimentation.stats.bayesian", title: "Implementing Bayesian A/B analysis for decision making", concept: C("prior on conversion rate; update with observed; compute P(B > A); credible interval; no sample size required") },
  { domain: "experimentation.stats.segment", title: "Implementing segment analysis for A/B experiment results", concept: C("stratify by key dimensions; report effect per segment; declare subgroups pre-hoc; bonferroni correct") },
];

/** 4. Experiment governance (8) */
const GOVERNANCE: SeedSpec[] = [
  { domain: "experimentation.governance.hypothesis", title: "Designing experiment hypothesis and pre-registration workflows", concept: C("pre-register: hypothesis, primary metric, MDE, runtime, segments; no changes after start; archive outcomes") },
  { domain: "experimentation.governance.review", title: "Implementing experiment review and approval processes", concept: C("experiment proposal: hypothesis + metrics + risks; peer review; approve or request revision; log decision") },
  { domain: "experimentation.governance.duration", title: "Designing experiment runtime policies to avoid peeking", concept: C("run full pre-determined runtime; do not peek for significance before runtime; alert only on guardrails") },
  { domain: "experimentation.governance.guardrails", title: "Implementing guardrail metric monitoring for experiments", concept: C("guardrails: latency, error rate, revenue; monitor continuously; auto-pause experiment on guardrail breach") },
  { domain: "experimentation.governance.documentation", title: "Designing experiment result documentation standards", concept: C("record: hypothesis, result, p-value, CI, recommendation, decision, learnings; persist in knowledge base") },
  { domain: "experimentation.governance.replication", title: "Designing experiment replication procedures for key results", concept: C("replicate significant results with new traffic slice; confirm direction and magnitude; address novelty effects") },
  { domain: "experimentation.governance.calendar", title: "Managing experiment calendar and traffic allocation", concept: C("track traffic by experiment; avoid overallocation; schedule for non-overlapping windows; holiday exclusions") },
  { domain: "experimentation.governance.interleaving", title: "Designing interleaved experiment scheduling for ranking systems", concept: C("interleave results from two rankers per request; preference signal from click; reduces exposure needed") },
];

/** 5. Metrics pipelines (8) */
const METRICS: SeedSpec[] = [
  { domain: "experimentation.metrics.definition", title: "Designing experiment metric definitions and computation", concept: C("metric = aggregate function over events; define: event, filter, aggregation, entity; version metric definition") },
  { domain: "experimentation.metrics.pipeline", title: "Building event-to-metric computation pipelines", concept: C("ingest events → join with exposure → aggregate per user → aggregate per variant; batch or streaming") },
  { domain: "experimentation.metrics.scorecard", title: "Designing experiment scorecard reporting systems", concept: C("scorecard: primary metric at top; guardrails; secondary metrics; delta, CI, p-value per metric; color code") },
  { domain: "experimentation.metrics.northstar", title: "Defining north star metrics aligned with business outcomes", concept: C("one primary metric per experiment; leading indicator of long-term value; resistant to gaming") },
  { domain: "experimentation.metrics.surrogate", title: "Designing surrogate metrics for long-horizon outcomes", concept: C("short-term surrogate correlated with long-term metric; validate correlation on historical experiments") },
  { domain: "experimentation.metrics.denominator", title: "Selecting correct denominators for experiment metrics", concept: C("exposed users as denominator; not total users; per-user averages over per-event for variance control") },
  { domain: "experimentation.metrics.data_quality", title: "Validating experiment metric data quality pre-analysis", concept: C("check event counts per day; SRM test; outlier check; data lag check; halt analysis if quality fails") },
  { domain: "experimentation.metrics.long_term", title: "Designing long-term experiment holdouts for persistent impact measurement", concept: C("holdout excluded for 1–6 months; measure cumulative metric delta vs holdout; extrapolate long-term ROI") },
];

/** 6. Progressive rollout (8) */
const ROLLOUT: SeedSpec[] = [
  { domain: "experimentation.rollout.strategy", title: "Designing percentage-based progressive rollout strategies", concept: C("1% → 5% → 20% → 50% → 100%; monitor at each stage; defined dwell time per stage; auto-advance or manual") },
  { domain: "experimentation.rollout.canary", title: "Implementing canary deployment patterns for feature rollouts", concept: C("canary = small % of traffic; compare error rate and latency vs baseline; promote or rollback by threshold") },
  { domain: "experimentation.rollout.dark_launch", title: "Designing dark launch patterns for backend feature validation", concept: C("run new code path in shadow; compare outputs; no user-visible change; validate correctness before expose") },
  { domain: "experimentation.rollout.ring", title: "Designing ring-based deployment rollout architectures", concept: C("ring 0: internal; ring 1: beta users; ring 2: small % production; ring 3: full; gate each ring by metrics") },
  { domain: "experimentation.rollout.kill_switch", title: "Integrating kill switches into progressive rollout pipelines", concept: C("instant rollback to 0% via flag; no deploy needed; alert on anomaly → operator pulls kill switch") },
  { domain: "experimentation.rollout.geographic", title: "Designing geographic-based feature rollout strategies", concept: C("roll out by region; monitor region metrics; expand to next region if clean; useful for compliance staging") },
  { domain: "experimentation.rollout.cohort", title: "Designing cohort-based rollout for targeted populations", concept: C("roll to specific cohort (beta, power users) first; collect feedback; iterate; then broad rollout") },
  { domain: "experimentation.rollout.automation", title: "Automating progressive rollout advancement with metric gates", concept: C("metric gate: if error rate < threshold AND latency p99 stable after N hours → auto-advance to next stage") },
];

export const PRODUCT_EXPERIMENTATION_SEED_SPECS: SeedSpec[] = [
  ...FEATURE_FLAGS,
  ...AB_TESTING,
  ...STATISTICS,
  ...GOVERNANCE,
  ...METRICS,
  ...ROLLOUT,
];
