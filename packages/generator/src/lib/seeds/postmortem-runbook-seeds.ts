import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

// ── Cascade Failures ───────────────────────────────────────────────────────
const CASCADE_FAILURES: SeedSpec[] = [
  { domain: "postmortem.cascade.cache_stampede", title: "Cache stampede recovery: isolate, rebuild, restore traffic", concept: C("detect: cache miss rate > 90% + downstream latency spike; action 1: rate-limit upstream requests to 10% normal volume; action 2: designate one worker to populate cache (mutex/lock); action 3: return stale data while rebuilding; restore traffic incrementally 10%/min") },
  { domain: "postmortem.cascade.thundering_herd", title: "Thundering herd mitigation after service restart", concept: C("detect: CPU spike to 100% within 30s of restart with no traffic increase; action: implement request jitter (sleep random 0–2s before retry); add exponential backoff min=1s max=60s; reduce connection pool by 50% during warm-up; validate: request success rate > 99% before full traffic") },
  { domain: "postmortem.cascade.retry_storm", title: "Retry storm containment: circuit breaker and backoff enforcement", concept: C("detect: error rate > 50% + retry volume 5× baseline; open circuit breaker (fail-fast); enforce max 1 retry with jitter; route 10% traffic to healthy replica; alert on-call; gradually close circuit at 5% steps every 60s; require 99% success rate to fully reopen") },
  { domain: "postmortem.cascade.dependency_overload", title: "Downstream dependency overload: shedding and graceful degradation", concept: C("detect: upstream dependency latency > 3× p99 baseline; shed non-critical requests (return 503 with Retry-After header); serve cached fallback for read paths; disable non-essential background jobs; restore when dependency p99 < 1.5× baseline for 5min") },
];

// ── Database Incidents ─────────────────────────────────────────────────────
const DATABASE_INCIDENTS: SeedSpec[] = [
  { domain: "postmortem.database.connection_exhaustion", title: "Database connection pool exhaustion recovery runbook", concept: C("detect: connection_wait_time > 500ms or pool_size at max; action 1: kill idle connections older than 60s; action 2: reduce max_pool_size by 25% to prevent new exhaustion; action 3: identify leaking connection (pg_stat_activity); fix: ensure connections closed in finally blocks; validate: pool utilization < 70%") },
  { domain: "postmortem.database.deadlock_resolution", title: "Deadlock resolution and prevention procedure", concept: C("detect: ERROR 1213 Deadlock or pg log deadlock_detected; identify conflicting transactions in pg_locks; determine lock order causing cycle; fix: enforce consistent lock ordering across all code paths; add retry logic (3 attempts) on deadlock error code; validate: zero deadlocks in 1h post-deploy") },
  { domain: "postmortem.database.replication_split_brain", title: "Replication split-brain detection and recovery procedure", concept: C("detect: two nodes both believe they are primary (check pg_is_in_recovery() = false on both); action: immediately fence the stale primary (revoke write access); identify which node has latest LSN; promote correct node; re-synchronize stale node as replica; audit writes during split-brain window for conflicts") },
  { domain: "postmortem.database.slow_query_incident", title: "Slow query incident response: identify, kill, optimize", concept: C("detect: avg query latency > SLO threshold; query pg_stat_activity for queries running > 30s; kill with pg_terminate_backend(pid); run EXPLAIN ANALYZE on slow query; add missing index; deploy fix with REINDEX CONCURRENTLY; verify p99 < SLO within 15min") },
];

// ── Network & Infrastructure ───────────────────────────────────────────────
const NETWORK_INCIDENTS: SeedSpec[] = [
  { domain: "postmortem.network.packet_loss", title: "Intermittent packet loss investigation and remediation", concept: C("detect: ping loss > 1% or TCP retransmit rate > 0.1%; run mtr/traceroute to identify hop with loss; check NIC errors (ethtool -S eth0 | grep error); verify cable/transceiver health; escalate to ISP if external; validate: retransmit rate < 0.01% for 30min post-fix") },
  { domain: "postmortem.network.dns_resolution_failure", title: "DNS resolution failure: diagnosis and fallback activation", concept: C("detect: NXDOMAIN rate spike or resolution timeout > 5s; check /etc/resolv.conf nameservers; test with dig @8.8.8.8 domain; if internal DNS: check resolver pod health; activate backup resolver; update search domain; validate: all service names resolve within 1s") },
  { domain: "postmortem.network.certificate_expiry", title: "TLS certificate expiry incident response and emergency renewal", concept: C("detect: cert_expiry_days < 7 alert fires; run certbot renew --force-renewal or equivalent; deploy new cert to load balancer; verify: openssl s_client -connect host:443 shows new expiry; update monitoring with new expiry date; post-mortem: add 30-day advance alert") },
  { domain: "postmortem.network.bgp_route_leak", title: "BGP route leak detection and traffic re-routing procedure", concept: C("detect: unexpected traffic volume increase from unexpected ASN; verify in BGP looking glass; issue BGP WITHDRAW for leaked prefix; coordinate with upstream provider; activate anycast failover; validate: traffic returns to expected AS path within 15min") },
];

// ── Application Incidents ──────────────────────────────────────────────────
const APPLICATION_INCIDENTS: SeedSpec[] = [
  { domain: "postmortem.app.memory_leak", title: "Memory leak identification and hot-fix deployment procedure", concept: C("detect: memory usage grows monotonically over hours; take heap dump (jmap or node --heap-snapshot); analyze with memory profiler for growing object counts; identify retention path; deploy fix or restart on schedule; verify: memory stabilizes within 1 RSS cycle; add heap alert at 85%") },
  { domain: "postmortem.app.config_drift", title: "Configuration drift detection and reconciliation runbook", concept: C("detect: service behavior differs between instances; diff running config vs expected (consul-diff, etcd-diff); identify instances with stale config; force config reload (SIGHUP or rolling restart); validate: all instances return same config hash; add config checksum to health check endpoint") },
  { domain: "postmortem.app.feature_flag_incident", title: "Feature flag rollback on incident trigger", concept: C("detect: error rate increase after flag enabled > 1%; immediately disable flag in flag service; verify propagation time (< 30s via SSE or polling); confirm error rate returns to baseline; do not re-enable without root cause analysis; add flag to incident report for audit") },
  { domain: "postmortem.app.deploy_rollback", title: "Emergency rollback procedure for failed production deployment", concept: C("detect: SLO breach (error rate > 1% or p99 > 2×) within 15min of deploy; trigger rollback: kubectl rollout undo deployment/app or equivalent; verify old version pods are Running; confirm metrics return to pre-deploy baseline; lock deployments pending RCA; document rollback time and blast radius") },
];

// ── Postmortem Process ─────────────────────────────────────────────────────
const POSTMORTEM_PROCESS: SeedSpec[] = [
  { domain: "postmortem.process.timeline_reconstruction", title: "Incident timeline reconstruction from logs and alerts", concept: C("collect: alert timestamps, deployment events, config changes, traffic graphs; correlate to 1-minute resolution; identify first anomaly signal (detection time); identify root cause event (trigger time); compute MTTD = detection - trigger; compute MTTR = resolution - detection; export as structured JSON timeline") },
  { domain: "postmortem.process.blameless_rca", title: "Blameless root cause analysis: 5-whys structured procedure", concept: C("start with impact statement; ask why 5 times, each answer becomes next question; stop at systemic cause (process, tooling, design) not individual error; document contributing factors separately; generate action items with owner and due date; review action items at 30-day follow-up") },
  { domain: "postmortem.process.slo_breach_classification", title: "SLO breach severity classification and escalation matrix", concept: C("P0: complete outage (availability=0); P1: degraded service (error_rate>1% or latency>2×SLO); P2: partial impact (<10% users affected); assign severity at detection; P0 pages exec + on-call; P1 pages on-call; P2 creates ticket; severity drives postmortem depth requirement") },
];

export const POSTMORTEM_RUNBOOK_SEED_SPECS: SeedSpec[] = [
  ...CASCADE_FAILURES,
  ...DATABASE_INCIDENTS,
  ...NETWORK_INCIDENTS,
  ...APPLICATION_INCIDENTS,
  ...POSTMORTEM_PROCESS,
];
