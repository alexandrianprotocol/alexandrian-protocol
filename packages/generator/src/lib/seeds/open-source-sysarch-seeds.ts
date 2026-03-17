import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

// ── Kubernetes ─────────────────────────────────────────────────────────────
const KUBERNETES: SeedSpec[] = [
  { domain: "sysarch.kubernetes.scheduling", title: "Kubernetes pod scheduling constraints and node affinity", concept: C("define nodeSelector or affinity rules; label nodes by class; use taints/tolerations to isolate workloads; validate with kubectl get pods -o wide; reject unschedulable pods after 60s pending") },
  { domain: "sysarch.kubernetes.resource_limits", title: "Setting resource requests and limits to prevent OOM eviction", concept: C("set requests = measured p50 usage; set limits = 2× requests; use LimitRange to enforce namespace defaults; monitor with kubectl top pods; evict pods exceeding limits before node OOM") },
  { domain: "sysarch.kubernetes.rolling_update", title: "Rolling deployment update strategy with zero downtime", concept: C("set maxSurge=1, maxUnavailable=0; define readinessProbe with initialDelaySeconds; new pods must pass readiness before old pods terminate; rollback with kubectl rollout undo on failure signal") },
  { domain: "sysarch.kubernetes.hpa", title: "Horizontal Pod Autoscaler configuration and scaling behavior", concept: C("set targetCPUUtilizationPercentage=70; define scaleUp.stabilizationWindowSeconds=30; scaleDown.stabilizationWindowSeconds=300; use custom metrics via metrics-server; validate with kubectl describe hpa") },
  { domain: "sysarch.kubernetes.network_policy", title: "Network policy for pod-to-pod traffic isolation", concept: C("default-deny all ingress/egress; whitelist by podSelector and namespaceSelector; apply least-privilege per service; validate with netpol test tools; log denied connections via CNI plugin") },
  { domain: "sysarch.kubernetes.pvc_storage", title: "PersistentVolumeClaim provisioning and storage class selection", concept: C("define storageClassName per workload type (SSD vs HDD); set accessModes to ReadWriteOnce for stateful, ReadWriteMany for shared; request 20% headroom above expected usage; monitor with kubectl get pvc") },
  { domain: "sysarch.kubernetes.pod_disruption", title: "PodDisruptionBudget to maintain availability during node drain", concept: C("set minAvailable=N-1 for N replicas; apply PDB before node drain; kubectl drain honors PDB; block drain if PDB would be violated; validate quorum is preserved during rolling maintenance") },
  { domain: "sysarch.kubernetes.configmap_secret", title: "ConfigMap and Secret rotation without pod restart", concept: C("mount secrets as volumes (not env vars) for live reload; use projected volumes; annotate pods with secret version hash; trigger rolling update when secret changes; never log secret values") },
  { domain: "sysarch.kubernetes.etcd_backup", title: "etcd backup and restore procedure for cluster recovery", concept: C("snapshot etcd with etcdctl snapshot save every 6h; copy to off-cluster storage; restore: stop apiserver, restore snapshot, restart etcd, validate cluster health; test restore monthly in staging") },
  { domain: "sysarch.kubernetes.failure_cascade", title: "Preventing cascading pod failure from node pressure", concept: C("set node memory pressure eviction threshold at 85%; prioritize system-critical pods with PriorityClass; use Pod QoS Guaranteed class for stateful workloads; isolate noisy-neighbor with resource quotas per namespace") },
];

// ── Apache Kafka ───────────────────────────────────────────────────────────
const KAFKA: SeedSpec[] = [
  { domain: "sysarch.kafka.partition_sizing", title: "Kafka partition count sizing for throughput targets", concept: C("partitions = target_throughput / per-partition_throughput; per-partition max ~10MB/s; over-partition causes metadata overhead; rebalance partitions only during maintenance windows; monitor lag with consumer-groups.sh") },
  { domain: "sysarch.kafka.replication_factor", title: "Replication factor and ISR configuration for durability", concept: C("set replication.factor=3 for production; min.insync.replicas=2; acks=all on producer; if ISR < min.insync.replicas, producer gets NotEnoughReplicasException; prefer broker spread across availability zones") },
  { domain: "sysarch.kafka.consumer_lag", title: "Consumer lag monitoring and alert threshold procedure", concept: C("alert when consumer_lag > max_acceptable_lag (e.g. 10k messages); compute lag = log-end-offset - committed-offset per partition; scale consumer group if lag grows over 15min window; identify slow consumers by throughput delta") },
  { domain: "sysarch.kafka.compaction", title: "Log compaction configuration for key-based retention", concept: C("set cleanup.policy=compact; min.cleanable.dirty.ratio=0.5; compaction retains latest value per key; use for changelog topics; validate with kafka-log-dirs.sh; do not compact high-cardinality append-only topics") },
  { domain: "sysarch.kafka.producer_idempotency", title: "Idempotent producer configuration to prevent duplicate messages", concept: C("enable.idempotence=true; max.in.flight.requests.per.connection=5; retries=MAX_INT; broker assigns producer_id and sequence number; duplicate detection via (producer_id, partition, sequence); verify with exactly-once test harness") },
  { domain: "sysarch.kafka.consumer_rebalance", title: "Minimizing consumer rebalance disruption with static membership", concept: C("set group.instance.id per consumer for static membership; session.timeout.ms=30000; rebalance only on timeout or explicit leave; use cooperative-sticky assignor to minimize partition movement; monitor rebalance events in consumer metrics") },
  { domain: "sysarch.kafka.schema_registry", title: "Schema evolution with backward-compatible Avro schema registration", concept: C("register schema before producing; compatibility mode=BACKWARD (new schema reads old data); bump schema version on field addition with default; reject incompatible changes; consumers always deserialize with schema ID embedded in message") },
  { domain: "sysarch.kafka.retention_sizing", title: "Topic retention policy sizing for storage and replay requirements", concept: C("retention.ms = max(replay_window_hours × 3600000, 604800000); retention.bytes = broker_disk × 0.6 / topic_count; monitor disk with kafka.log.Log.Size; compact high-value topics; delete transient topics after 24h") },
];

// ── PostgreSQL ─────────────────────────────────────────────────────────────
const POSTGRES: SeedSpec[] = [
  { domain: "sysarch.postgres.vacuum", title: "VACUUM and autovacuum tuning to prevent table bloat", concept: C("set autovacuum_vacuum_scale_factor=0.01 for large tables; autovacuum_cost_delay=2ms; monitor pg_stat_user_tables.n_dead_tup; run VACUUM ANALYZE after bulk loads; bloat > 20% triggers manual VACUUM FULL during maintenance") },
  { domain: "sysarch.postgres.index_bloat", title: "Index bloat detection and REINDEX procedure", concept: C("query pgstattuple for index bloat ratio; bloat > 30% triggers REINDEX CONCURRENTLY; monitor index_size vs table_size ratio; schedule REINDEX on low-traffic windows; never REINDEX without CONCURRENTLY on production") },
  { domain: "sysarch.postgres.connection_pooling", title: "PgBouncer connection pooling configuration for high concurrency", concept: C("pool_mode=transaction for stateless services; max_client_conn = application_threads × instances; server_pool_size = max_postgres_connections / pool_count; monitor avg_wait_time; reject connections if pool exhausted") },
  { domain: "sysarch.postgres.replication_lag", title: "Streaming replication lag monitoring and failover threshold", concept: C("compute lag_bytes = pg_wal_lsn_diff(sent_lsn, replay_lsn); alert at lag_bytes > 100MB; failover if lag_seconds > max_tolerable_rpo; use pg_promote() on standby; update DNS CNAME to new primary within 30s") },
  { domain: "sysarch.postgres.query_plan", title: "Query plan analysis and index optimization with EXPLAIN ANALYZE", concept: C("run EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON); identify Seq Scan on large tables; add composite index matching WHERE + ORDER BY columns; verify with pg_stat_statements.total_exec_time delta; validate p95 query latency improvement") },
  { domain: "sysarch.postgres.write_ahead_log", title: "WAL configuration for durability and performance tradeoff", concept: C("synchronous_commit=on for critical writes; off for high-throughput logging; wal_level=replica for streaming; checkpoint_completion_target=0.9; monitor wal_buffers_full; pg_walfile_name(pg_current_wal_lsn()) for lag tracking") },
  { domain: "sysarch.postgres.partitioning", title: "Table partitioning strategy for time-series and high-volume tables", concept: C("partition by RANGE on created_at; create monthly child tables; use pg_partman for automation; attach/detach partitions without lock; query planner prunes partitions via constraint exclusion; validate with EXPLAIN partition pruning") },
  { domain: "sysarch.postgres.deadlock_detection", title: "Deadlock prevention and detection in concurrent write workloads", concept: C("set deadlock_timeout=1s; log deadlocks with log_lock_waits=on; enforce consistent lock ordering across transactions; use SELECT FOR UPDATE SKIP LOCKED for queue patterns; monitor pg_locks for blocking queries") },
];

export const OPEN_SOURCE_SYSARCH_SEED_SPECS: SeedSpec[] = [
  ...KUBERNETES,
  ...KAFKA,
  ...POSTGRES,
];
