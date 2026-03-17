/**
 * Observability & Telemetry Seeds (~80 seed procedures).
 * OpenTelemetry instrumentation, trace sampling, metrics cardinality,
 * log aggregation, synthetic monitoring, alert correlation,
 * SLO engineering, and chaos engineering.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. OpenTelemetry instrumentation (10) */
const OTEL: SeedSpec[] = [
  { domain: "observability.otel.instrumentation", title: "Implementing OpenTelemetry SDK instrumentation for services", concept: C("configure TracerProvider + MeterProvider + LoggerProvider; auto-instrumentation for frameworks; manual for business logic") },
  { domain: "observability.otel.traces", title: "Designing OpenTelemetry trace instrumentation for request flows", concept: C("span per operation; parent-child relationships; span name: method + route; attributes: http.method, db.statement, error") },
  { domain: "observability.otel.context_propagation", title: "Implementing trace context propagation across service boundaries", concept: C("W3C TraceContext header; inject on outgoing; extract on incoming; baggage for non-trace context; async propagation") },
  { domain: "observability.otel.metrics", title: "Designing OpenTelemetry metric instrument selection", concept: C("Counter for monotonic cumulative; Histogram for distributions; Gauge for current value; UpDownCounter for bidirectional") },
  { domain: "observability.otel.semantic_conventions", title: "Implementing OpenTelemetry semantic conventions for span attributes", concept: C("http.method, http.route, http.status_code; db.system, db.statement; rpc.method; error.type; follow spec exactly") },
  { domain: "observability.otel.collector", title: "Designing OpenTelemetry Collector pipeline architectures", concept: C("receivers → processors → exporters; batch processor; memory limiter; tail sampling; fan-out to multiple backends") },
  { domain: "observability.otel.sdk_config", title: "Configuring OpenTelemetry SDK resource attributes for service identity", concept: C("service.name, service.version, deployment.environment, host.name; set via SDK or OTEL_RESOURCE_ATTRIBUTES env") },
  { domain: "observability.otel.custom_spans", title: "Implementing custom span instrumentation for business operations", concept: C("span per critical business operation; record: user ID, tenant, feature flag, input params; error span on exception") },
  { domain: "observability.otel.async", title: "Implementing OpenTelemetry instrumentation for async and event-driven systems", concept: C("link spans for async causality; inject context into message headers; extract on consumer side; linked vs child spans") },
  { domain: "observability.otel.migration", title: "Migrating from vendor-specific tracing to OpenTelemetry", concept: C("install OTEL SDK alongside vendor; route to both; validate OTEL output; remove vendor SDK; update dashboards") },
];

/** 2. Trace sampling strategies (8) */
const SAMPLING: SeedSpec[] = [
  { domain: "observability.sampling.head", title: "Implementing head-based trace sampling strategies", concept: C("decision at trace start; probabilistic: sample rate per service; deterministic by trace ID hash; propagate decision") },
  { domain: "observability.sampling.tail", title: "Implementing tail-based trace sampling for intelligent retention", concept: C("buffer complete traces; evaluate after completion; keep: errors, slow, high-value; discard: fast healthy; collector-based") },
  { domain: "observability.sampling.adaptive", title: "Designing adaptive sampling to control trace volume under load", concept: C("target traces/second; adjust sample rate by volume; per-endpoint rate limits; always sample errors and slow traces") },
  { domain: "observability.sampling.priority", title: "Implementing priority sampling for high-value trace retention", concept: C("always sample: errors, latency outliers, critical paths; probabilistic for healthy; force-sample via header override") },
  { domain: "observability.sampling.stratified", title: "Designing stratified trace sampling by endpoint and tenant", concept: C("per-route sample rate; higher rate for critical paths; tenant-level rate for multi-tenant; combine rules") },
  { domain: "observability.sampling.cost", title: "Calculating trace storage cost models for sampling rate decisions", concept: C("avg trace size × traces/day × retention days × storage cost; 1% sample reduces cost 100x; balance cost and coverage") },
  { domain: "observability.sampling.remote", title: "Implementing remote sampling configuration for dynamic adjustment", concept: C("sampling config from control plane; update without redeploy; per-service, per-operation, per-tenant overrides") },
  { domain: "observability.sampling.testing", title: "Validating trace sampling correctness in observability pipelines", concept: C("verify: always-sample traces appear; expected sample rate in metrics; no orphaned spans; parent-child links intact") },
];

/** 3. Metrics design (10) */
const METRICS: SeedSpec[] = [
  { domain: "observability.metrics.red", title: "Implementing RED metrics for service observability", concept: C("Rate: requests/second; Errors: error rate; Duration: latency histogram; instrument every service entry point") },
  { domain: "observability.metrics.use", title: "Implementing USE metrics for resource observability", concept: C("Utilization: % time busy; Saturation: queue length; Errors: error count; instrument every resource: CPU, disk, network") },
  { domain: "observability.metrics.four_golden", title: "Implementing Google's four golden signals for service monitoring", concept: C("latency, traffic, errors, saturation; alert on latency p99, error rate, saturation > threshold; dashboard per service") },
  { domain: "observability.metrics.cardinality", title: "Managing metrics cardinality to control observability costs", concept: C("avoid: user ID, IP, request ID as label; high cardinality explodes storage; use histograms not per-user gauges") },
  { domain: "observability.metrics.histogram", title: "Designing histogram metrics for latency distribution tracking", concept: C("bucket boundaries for expected range; p50/p95/p99 from histogram; avoid summary (not aggregatable); native histograms") },
  { domain: "observability.metrics.naming", title: "Designing consistent metric naming conventions", concept: C("namespace_subsystem_unit_suffix; snake_case; unit in name (seconds, bytes, total); no duplication of unit in labels") },
  { domain: "observability.metrics.aggregation", title: "Designing metrics aggregation rules for federated monitoring", concept: C("recording rules pre-aggregate expensive queries; reduce query time; version recording rules; keep raw for debugging") },
  { domain: "observability.metrics.business", title: "Implementing business metric instrumentation alongside technical metrics", concept: C("instrument: signups, checkouts, revenue, feature usage; correlate with technical metrics; unified dashboard") },
  { domain: "observability.metrics.sli", title: "Designing SLI metrics as foundation for SLO measurement", concept: C("SLI: good events / total events; define good: status < 500 AND latency < 500ms; instrument consistently") },
  { domain: "observability.metrics.exemplars", title: "Implementing metric exemplars for trace-metric correlation", concept: C("attach trace ID to histogram sample; link from metric spike to exemplar trace; OpenMetrics exemplar format") },
];

/** 4. Log aggregation pipelines (8) */
const LOGGING: SeedSpec[] = [
  { domain: "observability.logging.structured", title: "Implementing structured logging standards for log aggregation", concept: C("JSON lines; required fields: timestamp, level, service, trace_id, span_id, message; no string concatenation for log") },
  { domain: "observability.logging.pipeline", title: "Designing log aggregation pipeline architectures", concept: C("collector agent → buffer (Kafka) → processor (Logstash/Fluent Bit) → storage (Elasticsearch/Loki); backpressure handling") },
  { domain: "observability.logging.parsing", title: "Designing log parsing and field extraction pipelines", concept: C("parse: timestamp, level, fields; Grok for unstructured; JSON parse for structured; drop unparseable after metric") },
  { domain: "observability.logging.retention", title: "Designing log retention and tiering policies", concept: C("hot: 7 days full text; warm: 30 days indexed; cold: 90 days compressed; archive: 1 year S3 Glacier; enforce by policy") },
  { domain: "observability.logging.correlation", title: "Implementing trace-log correlation via trace context injection", concept: C("inject trace_id, span_id into all log entries; link from trace view to logs; filter logs by trace_id") },
  { domain: "observability.logging.sampling", title: "Implementing log sampling to control high-volume log costs", concept: C("sample debug logs 1%; info 10%; warn 100%; error 100%; head-based by severity; never sample security logs") },
  { domain: "observability.logging.alerting", title: "Designing log-based alerting for error detection", concept: C("alert on: error log rate spike, pattern match for critical errors; debounce; route by service owner; log context in alert") },
  { domain: "observability.logging.audit", title: "Implementing audit logging separate from operational logging", concept: C("immutable audit log; who, what, when, source IP, outcome; separate store; no sampling; query by entity and time") },
];

/** 5. Alerting and incident detection (10) */
const ALERTING: SeedSpec[] = [
  { domain: "observability.alerting.slo_based", title: "Designing SLO-based alerting with error budget burn rates", concept: C("fast burn: 14.4x rate consumes 2% budget in 1h → page; slow burn: 1x rate → ticket; multi-window: short+long") },
  { domain: "observability.alerting.thresholds", title: "Designing static threshold alerting for operational metrics", concept: C("error rate > 5%; latency p99 > 1s; CPU > 90%; alert only when sustained > N minutes; document threshold rationale") },
  { domain: "observability.alerting.anomaly", title: "Implementing anomaly detection alerting for dynamic baselines", concept: C("seasonal baseline from historic data; alert on deviation > N sigma; reduces false positives vs static thresholds") },
  { domain: "observability.alerting.routing", title: "Designing alert routing and escalation policies", concept: C("route by: service, severity, time of day; primary on-call → escalate after N minutes; override for incidents; notification channel per severity") },
  { domain: "observability.alerting.suppression", title: "Implementing alert suppression to reduce noise during incidents", concept: C("maintenance windows suppress expected alerts; incident silence correlates alerts; parent alert suppresses children") },
  { domain: "observability.alerting.correlation", title: "Implementing alert correlation to reduce notification fatigue", concept: C("group alerts by: service, source, time window; root cause analysis alert; suppress symptoms when cause alerted") },
  { domain: "observability.alerting.quality", title: "Measuring alert quality and reducing false positive rate", concept: C("track: alert→page rate, false positive rate, MTTD per alert; audit monthly; remove or tune high-noise alerts") },
  { domain: "observability.alerting.runbook_linking", title: "Linking alerts to runbooks for faster incident response", concept: C("alert annotation: runbook_url; runbook: trigger, diagnosis, remediation, escalation; test runbook quarterly") },
  { domain: "observability.alerting.multiwindow", title: "Implementing multi-window multi-burn-rate SLO alerts", concept: C("page: 1h + 5min both burning at 14.4x; ticket: 6h + 30min at 6x; 1h + 5min at 3x; matches Google SRE book") },
  { domain: "observability.alerting.deadman", title: "Implementing dead man's switch alerts for pipeline health", concept: C("expect metric update every N minutes; alert if not received; detects: stuck pipeline, agent crash, network partition") },
];

/** 6. SLO engineering (8) */
const SLO: SeedSpec[] = [
  { domain: "observability.slo.definition", title: "Defining service level objectives for reliability targets", concept: C("SLO = SLI target over window; 99.9% requests < 500ms over 28 days; align to user experience; not too tight") },
  { domain: "observability.slo.error_budget", title: "Implementing error budget tracking and consumption reporting", concept: C("budget = (1 - target) × window events; consumed = bad events; remaining = budget - consumed; alert on burn rate") },
  { domain: "observability.slo.dashboard", title: "Designing SLO compliance dashboards for engineering teams", concept: C("SLO compliance %; error budget remaining %; burn rate chart; bad event count; historical compliance trend") },
  { domain: "observability.slo.review", title: "Designing SLO review procedures for reliability governance", concept: C("monthly: review compliance, budget consumption, incidents; quarterly: adjust targets; post-incident SLO impact review") },
  { domain: "observability.slo.freeze", title: "Implementing error budget freeze policies for reliability protection", concept: C("freeze: no new feature deploys when < 10% budget remaining; lift on budget recovery; exception process") },
  { domain: "observability.slo.customer_facing", title: "Designing customer-facing SLA commitments backed by internal SLOs", concept: C("internal SLO tighter than external SLA; SLA 99.9%, SLO 99.95%; buffer for measurement error and response time") },
  { domain: "observability.slo.dependencies", title: "Accounting for dependency SLOs in composite service SLO design", concept: C("composite SLO = product of dependency SLOs; tight dependency SLO required for tight service SLO; upstream negotiation") },
  { domain: "observability.slo.automation", title: "Automating SLO compliance monitoring and reporting pipelines", concept: C("compute SLO compliance daily; store in time series; auto-generate weekly report; alert on consecutive miss") },
];

/** 7. Synthetic monitoring (8) */
const SYNTHETIC: SeedSpec[] = [
  { domain: "observability.synthetic.design", title: "Designing synthetic monitoring checks for critical user journeys", concept: C("script key user journeys; run from multiple locations; alert on failure or latency breach; test auth and checkout flows") },
  { domain: "observability.synthetic.api", title: "Implementing API synthetic monitoring for endpoint health", concept: C("HTTP check: status, response time, body assertion; run every 1 minute; alert on 2 consecutive failures; geo distribution") },
  { domain: "observability.synthetic.browser", title: "Implementing browser-based synthetic monitoring for UI flows", concept: C("Playwright or Selenium script; login, navigate, interact; screenshot on failure; assert elements present; run globally") },
  { domain: "observability.synthetic.canary", title: "Designing canary synthetic tests for deployment validation", concept: C("run synthetic on canary before promoting to production; rollback if canary synthetic fails; gate on synthetic pass") },
  { domain: "observability.synthetic.data", title: "Managing synthetic test data for persistent monitoring checks", concept: C("dedicated test accounts; seed data per environment; clean up after test run; never real user data in synthetic") },
  { domain: "observability.synthetic.alerting", title: "Configuring synthetic monitoring alerting policies", concept: C("alert after 2 consecutive failures from same location; flap suppression; multi-region confirmation before page") },
  { domain: "observability.synthetic.performance", title: "Implementing synthetic performance monitoring for Web Vitals", concept: C("Lighthouse CI in synthetic runner; track LCP, CLS, INP; alert on regression; compare deploy to baseline") },
  { domain: "observability.synthetic.dependency", title: "Implementing synthetic third-party dependency monitoring", concept: C("test payment gateway, auth provider, CDN health; alert if third-party SLA at risk; trigger incident if down") },
];

export const OBSERVABILITY_TELEMETRY_SEED_SPECS: SeedSpec[] = [
  ...OTEL,
  ...SAMPLING,
  ...METRICS,
  ...LOGGING,
  ...ALERTING,
  ...SLO,
  ...SYNTHETIC,
];
