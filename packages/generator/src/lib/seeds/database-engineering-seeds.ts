/**
 * Database Engineering Seeds (~90 seed procedures).
 * Deep database engineering: schema design, indexing, migrations, pooling, OLAP, time-series,
 * sharding, replication, query optimization, and transaction patterns.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Schema design & normalization (10) */
const SCHEMA_DESIGN: SeedSpec[] = [
  { domain: "database.schema.normalization", title: "Normalizing relational schemas to third normal form", concept: C("identify partial and transitive deps; eliminate by decomposition") },
  { domain: "database.schema.normalization", title: "Designing BCNF schemas for transactional systems", concept: C("every determinant is a candidate key; verify per relation") },
  { domain: "database.schema.normalization", title: "Choosing denormalization strategies for read performance", concept: C("measure read/write ratio; denormalize hot join paths with materialized columns") },
  { domain: "database.schema.design", title: "Designing polymorphic entity schemas", concept: C("choose STI, CTI, or JSON column based on query pattern and type count") },
  { domain: "database.schema.design", title: "Designing soft-delete patterns in relational schemas", concept: C("add deleted_at; partial index on IS NULL; exclude from default queries") },
  { domain: "database.schema.design", title: "Modeling many-to-many relationships with junction tables", concept: C("junction table with composite PK; index both FK directions") },
  { domain: "database.schema.design", title: "Designing audit trail schemas for entity history", concept: C("shadow table or event log; append-only; FK to entity") },
  { domain: "database.schema.design", title: "Designing multi-tenant schema isolation strategies", concept: C("choose row-level, schema-per-tenant, or DB-per-tenant by isolation and scale") },
  { domain: "database.schema.types", title: "Choosing column types for precision-sensitive data", concept: C("use NUMERIC/DECIMAL for currency; BIGINT for IDs; TIMESTAMPTZ for time") },
  { domain: "database.schema.design", title: "Designing versioned entity schemas", concept: C("version column + effective dates; query by max version per entity") },
];

/** 2. Index strategy & query planning (10) */
const INDEXING: SeedSpec[] = [
  { domain: "database.index.btree", title: "Designing B-tree index strategies for range queries", concept: C("index leading columns of WHERE and ORDER BY; verify with EXPLAIN") },
  { domain: "database.index.composite", title: "Designing composite index column ordering", concept: C("highest selectivity first; cover ORDER BY direction; avoid low-cardinality prefix") },
  { domain: "database.index.partial", title: "Implementing partial indexes for sparse predicates", concept: C("WHERE clause in index definition; reduces size and locks hot path") },
  { domain: "database.index.covering", title: "Designing covering indexes to eliminate table lookups", concept: C("INCLUDE non-predicate output columns; verify index-only scan in EXPLAIN") },
  { domain: "database.index.gin", title: "Designing GIN indexes for full-text and JSONB search", concept: C("GIN for multi-valued columns; GiST for ranges; pick by operator class") },
  { domain: "database.query.plan", title: "Analyzing and fixing slow query execution plans", concept: C("EXPLAIN ANALYZE; identify seq scans, high rows; add index or rewrite join") },
  { domain: "database.query.plan", title: "Eliminating N+1 query patterns in ORM usage", concept: C("identify per-row child fetch; replace with eager load or batch query") },
  { domain: "database.query.optimization", title: "Rewriting correlated subqueries as joins or CTEs", concept: C("correlated subquery → lateral join or CTE; verify plan cost drops") },
  { domain: "database.query.optimization", title: "Designing efficient pagination for large result sets", concept: C("keyset pagination with indexed cursor column; avoid OFFSET beyond 1000") },
  { domain: "database.index.maintenance", title: "Designing index maintenance and bloat monitoring", concept: C("track pg_stat_user_indexes; REINDEX CONCURRENTLY on bloat > 30%") },
];

/** 3. Migration engineering (8) */
const MIGRATIONS: SeedSpec[] = [
  { domain: "database.migration.zero_downtime", title: "Designing zero-downtime schema migration procedures", concept: C("expand-contract: add nullable column, backfill, add constraint, drop old") },
  { domain: "database.migration.backfill", title: "Implementing safe backfill strategies for large tables", concept: C("batch by PK range; sleep between batches; monitor replication lag") },
  { domain: "database.migration.rollback", title: "Designing rollback-safe migration procedures", concept: C("each migration reversible; test down migration in CI before merging") },
  { domain: "database.migration.versioning", title: "Implementing migration versioning systems", concept: C("sequential timestamps as version; lock table prevents concurrent apply") },
  { domain: "database.migration.column_rename", title: "Renaming columns in production without downtime", concept: C("add new column, dual-write, backfill, update reads, drop old") },
  { domain: "database.migration.constraint", title: "Adding NOT NULL constraints to existing columns safely", concept: C("add as nullable, backfill, set NOT VALID check, VALIDATE CONSTRAINT separately") },
  { domain: "database.migration.foreign_key", title: "Adding foreign keys to large tables without locking", concept: C("add FK NOT VALID; VALIDATE CONSTRAINT in separate non-locking step") },
  { domain: "database.migration.index", title: "Creating indexes concurrently on live tables", concept: C("CREATE INDEX CONCURRENTLY; monitor for invalid state; verify after") },
];

/** 4. Connection & pooling management (8) */
const POOLING: SeedSpec[] = [
  { domain: "database.pooling.sizing", title: "Sizing connection pool parameters for workloads", concept: C("pool = (cores * 2) + effective_spindle; benchmark at target TPS") },
  { domain: "database.pooling.pgbouncer", title: "Configuring PgBouncer modes for connection workloads", concept: C("transaction mode for short queries; session mode for advisory locks; statement mode avoid") },
  { domain: "database.pooling.overflow", title: "Designing connection overflow handling strategies", concept: C("queue overflow; timeout and return 503; alert on pool exhaustion") },
  { domain: "database.pooling.health", title: "Implementing connection pool health check procedures", concept: C("keepalive queries; evict stale; reconnect on error; validate on borrow") },
  { domain: "database.pooling.read_replica", title: "Routing reads to replica pools with stale-read tolerance", concept: C("route SELECTs to replica; fallback to primary on replication lag > threshold") },
  { domain: "database.pooling.multitenancy", title: "Designing per-tenant connection pool isolation", concept: C("pool per tenant shard; size by tier; cap to prevent noisy-neighbor") },
  { domain: "database.pooling.serverless", title: "Managing database connections in serverless environments", concept: C("external pool (RDS Proxy, PgBouncer); avoid per-lambda connection creation") },
  { domain: "database.pooling.timeout", title: "Configuring connection acquisition timeouts and retries", concept: C("acquire timeout < p99 SLA; retry with backoff; circuit break on sustained failure") },
];

/** 5. OLAP & analytics databases (8) */
const OLAP: SeedSpec[] = [
  { domain: "database.olap.schema", title: "Designing star and snowflake schemas for analytics", concept: C("fact table + dimension tables; denormalize dimensions for query speed") },
  { domain: "database.olap.partitioning", title: "Implementing table partitioning for analytics queries", concept: C("partition by date or tenant; prune partitions in query; monitor partition count") },
  { domain: "database.olap.materialized_view", title: "Designing materialized views for pre-aggregated analytics", concept: C("materialized view per reporting grain; refresh schedule vs query freshness SLA") },
  { domain: "database.olap.columnar", title: "Choosing columnar storage for aggregation workloads", concept: C("columnar for wide scan+aggregate; row store for point lookups and updates") },
  { domain: "database.olap.slowly_changing", title: "Implementing slowly changing dimension strategies", concept: C("SCD Type 2: add row per change with effective dates; query by point in time") },
  { domain: "database.olap.incremental", title: "Designing incremental ETL patterns for data warehouses", concept: C("watermark on updated_at; extract delta; upsert by key; advance watermark on commit") },
  { domain: "database.olap.cube", title: "Designing pre-aggregated OLAP cube structures", concept: C("aggregate by dimension combinations; roll up from fact; cache top queries") },
  { domain: "database.olap.cost", title: "Optimizing query costs in distributed analytics engines", concept: C("partition pruning; predicate pushdown; columnar projection; avoid cross-joins") },
];

/** 6. Time-series & specialized stores (8) */
const TIMESERIES: SeedSpec[] = [
  { domain: "database.timeseries.schema", title: "Designing time-series table schemas for high ingest", concept: C("timestamp + tag columns as PK; chunk by time interval; hypertable or partition") },
  { domain: "database.timeseries.retention", title: "Implementing data retention and downsampling policies", concept: C("continuous aggregate by coarser interval; drop raw chunks after window") },
  { domain: "database.timeseries.compression", title: "Configuring time-series compression strategies", concept: C("columnar compression on cold chunks; compress after min_interval; verify query plan") },
  { domain: "database.timeseries.gap_fill", title: "Designing gap-fill queries for sparse time-series data", concept: C("generate_series + LEFT JOIN; last-observation-carried-forward or interpolate") },
  { domain: "database.graph.design", title: "Designing graph database schemas for relationship queries", concept: C("vertex + edge tables or native graph; index by adjacency; traverse with recursive CTE or Cypher") },
  { domain: "database.document.schema", title: "Designing document store schemas with JSONB", concept: C("JSONB for variable structure; GIN index on key paths; avoid deep nesting") },
  { domain: "database.search.fts", title: "Implementing full-text search indexes in PostgreSQL", concept: C("tsvector column; GIN index; websearch_to_tsquery; rank by ts_rank_cd") },
  { domain: "database.vector.index", title: "Designing vector similarity search indexes", concept: C("HNSW or IVFFlat; dimension and ef_construction tradeoff; combine with metadata filter") },
];

/** 7. Sharding & distribution (8) */
const SHARDING: SeedSpec[] = [
  { domain: "database.sharding.strategy", title: "Choosing sharding strategies for distributed databases", concept: C("hash sharding for uniform distribution; range sharding for scan locality; avoid hotspot keys") },
  { domain: "database.sharding.hotspot", title: "Detecting and resolving shard hotspots", concept: C("monitor per-shard QPS; split hot shard; use random suffix for monotonic keys") },
  { domain: "database.sharding.cross_shard", title: "Designing cross-shard query strategies", concept: C("scatter-gather with application join; or route by tenant; avoid cross-shard transactions") },
  { domain: "database.sharding.rebalance", title: "Implementing shard rebalancing procedures", concept: C("move shard range; dual-write; cutover with lock; verify counts before drop") },
  { domain: "database.sharding.key_design", title: "Designing shard keys to avoid sequential bottlenecks", concept: C("UUID v4 or ULID; avoid auto-increment as shard key; verify distribution") },
  { domain: "database.sharding.tenant", title: "Implementing tenant-aware sharding for SaaS", concept: C("tenant_id as shard key prefix; all tenant queries route to single shard") },
  { domain: "database.sharding.schema", title: "Designing schema consistency across shards", concept: C("schema migrations applied to all shards; versioned and idempotent") },
  { domain: "database.sharding.fan_out", title: "Designing fan-out query aggregation across shards", concept: C("parallel query per shard; aggregate in application layer; timeout and partial result policy") },
];

/** 8. Replication & consistency (8) */
const REPLICATION: SeedSpec[] = [
  { domain: "database.replication.lag", title: "Monitoring and handling replication lag in read replicas", concept: C("measure lag by WAL position diff; route writes to primary if lag > threshold") },
  { domain: "database.replication.read_your_writes", title: "Implementing read-your-writes consistency patterns", concept: C("session token with write LSN; replica waits for LSN or routes to primary") },
  { domain: "database.replication.failover", title: "Designing automatic failover procedures for primary databases", concept: C("health check + promote standby; update DNS or proxy; validate data integrity") },
  { domain: "database.replication.logical", title: "Implementing logical replication for selective table sync", concept: C("publication on source; subscription on target; monitor slot lag; avoid DDL") },
  { domain: "database.replication.conflict", title: "Resolving write conflicts in multi-primary replication", concept: C("last-write-wins by timestamp; or custom conflict function; log for audit") },
  { domain: "database.replication.cdc", title: "Implementing change data capture pipelines", concept: C("WAL-based CDC (Debezium); stream to Kafka; downstream consumer idempotent") },
  { domain: "database.replication.geo", title: "Designing geo-distributed replication strategies", concept: C("primary per region with async replication; local reads; cross-region writes route to home region") },
  { domain: "database.replication.backup", title: "Designing continuous backup and point-in-time recovery", concept: C("WAL archiving to object store; test PITR monthly; RPO and RTO SLA") },
];

/** 9. Query optimization (8) */
const QUERY_OPT: SeedSpec[] = [
  { domain: "database.query.join_order", title: "Optimizing join order for multi-table queries", concept: C("join smallest-to-largest; push predicates before join; hint if planner wrong") },
  { domain: "database.query.cte", title: "Choosing between CTEs and subqueries for performance", concept: C("CTE is optimization fence in Postgres < 12; inline as subquery unless reuse needed") },
  { domain: "database.query.window", title: "Using window functions for ranking and aggregation", concept: C("PARTITION BY grouping key; ORDER BY rank column; ROWS/RANGE frame spec") },
  { domain: "database.query.bulk", title: "Implementing bulk insert and upsert strategies", concept: C("COPY for bulk ingest; INSERT ... ON CONFLICT DO UPDATE for upsert; batch by 1k rows") },
  { domain: "database.query.vacuum", title: "Designing autovacuum tuning for high-write tables", concept: C("scale_factor=0; threshold by row count; track dead tuple ratio; emergency VACUUM") },
  { domain: "database.query.stats", title: "Maintaining query planner statistics for accurate plans", concept: C("ANALYZE after large loads; increase statistics target for skewed columns") },
  { domain: "database.query.lock", title: "Identifying and reducing lock contention in queries", concept: C("track pg_locks; use SELECT ... FOR UPDATE SKIP LOCKED for queues; minimize txn duration") },
  { domain: "database.query.cache", title: "Designing query result caching strategies", concept: C("cache at application layer with TTL; invalidate on write; use Redis SETEX") },
];

/** 10. Transaction & locking patterns (8) */
const TRANSACTIONS: SeedSpec[] = [
  { domain: "database.transaction.isolation", title: "Choosing transaction isolation levels for workloads", concept: C("READ COMMITTED default; REPEATABLE READ for snapshot; SERIALIZABLE for conflicts") },
  { domain: "database.transaction.optimistic", title: "Implementing optimistic locking with version columns", concept: C("version column; UPDATE WHERE version = expected; 0 rows = conflict; retry") },
  { domain: "database.transaction.pessimistic", title: "Implementing pessimistic locking with SELECT FOR UPDATE", concept: C("SELECT FOR UPDATE in transaction; SKIP LOCKED for queue; timeout to avoid deadlock") },
  { domain: "database.transaction.deadlock", title: "Detecting and preventing database deadlocks", concept: C("consistent lock ordering; short transactions; detect via pg_locks; log and retry") },
  { domain: "database.transaction.saga", title: "Designing distributed saga transaction patterns", concept: C("choreography or orchestration; compensating transactions per step; idempotent steps") },
  { domain: "database.transaction.two_phase", title: "Implementing two-phase commit for distributed transactions", concept: C("PREPARE TRANSACTION; coordinate commit or abort; avoid for hot paths") },
  { domain: "database.transaction.idempotency", title: "Designing idempotent write operations", concept: C("idempotency key column with unique constraint; UPSERT on conflict; return existing") },
  { domain: "database.transaction.long_running", title: "Managing long-running transactions safely", concept: C("timeout long transactions; break into batches; monitor age via pg_stat_activity") },
];

export const DATABASE_ENGINEERING_SEED_SPECS: SeedSpec[] = [
  ...SCHEMA_DESIGN,
  ...INDEXING,
  ...MIGRATIONS,
  ...POOLING,
  ...OLAP,
  ...TIMESERIES,
  ...SHARDING,
  ...REPLICATION,
  ...QUERY_OPT,
  ...TRANSACTIONS,
];
