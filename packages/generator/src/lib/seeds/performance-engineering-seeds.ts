/**
 * Performance Engineering Seeds (~90 seed procedures).
 * Profiling, load testing, flame graph analysis, query optimization,
 * caching, memory tuning, JIT optimization, and capacity planning.
 * Domain: perf.*
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. CPU profiling (10) */
const CPU_PROFILING: SeedSpec[] = [
  { domain: "perf.profiling.cpu", title: "Performing CPU profiling with sampling profilers", concept: C("sample call stack at N Hz; aggregate by function; identify hot paths; measure % CPU per function; compare before/after") },
  { domain: "perf.profiling.flame_graph", title: "Analyzing flame graphs for CPU hotspot identification", concept: C("x-axis: CPU time proportion; y-axis: call stack depth; wide plateaus = hot functions; fix widest first") },
  { domain: "perf.profiling.wall_clock", title: "Distinguishing wall clock vs CPU time in performance profiling", concept: C("wall time includes I/O wait; CPU time excludes it; high wall + low CPU = I/O bound; high both = CPU bound") },
  { domain: "perf.profiling.continuous", title: "Implementing continuous profiling for production performance monitoring", concept: C("always-on sampling at 1-10 Hz overhead; aggregate in cloud; diff releases; identify regressions; Pyroscope/Parca") },
  { domain: "perf.profiling.async", title: "Profiling async and event-loop applications for performance issues", concept: C("Node.js: event loop lag; Python asyncio: task duration; identify: blocking calls, long awaits, microtask storms") },
  { domain: "perf.profiling.jvm", title: "Profiling JVM applications with async-profiler and JFR", concept: C("async-profiler: native sampling; JFR: production safe; identify: GC pause, JIT compilation, thread contention, lock wait") },
  { domain: "perf.profiling.go", title: "Profiling Go applications with pprof", concept: C("pprof HTTP endpoint; cpu, heap, goroutine, mutex, block profiles; go tool pprof; flame graph view; alloc vs live heap") },
  { domain: "perf.profiling.python", title: "Profiling Python applications with cProfile and py-spy", concept: C("py-spy: sampling, no code change, production safe; cProfile: deterministic, development; vizualize with snakeviz") },
  { domain: "perf.profiling.system", title: "Performing system-level CPU profiling with perf and eBPF", concept: C("perf record -g; perf report; eBPF for kernel + user space; off-CPU analysis; CPU frequency scaling effect") },
  { domain: "perf.profiling.differential", title: "Performing differential flame graph analysis between builds", concept: C("capture profile before and after change; diff flame graph: red = regression, blue = improvement; focus on red") },
];

/** 2. Memory profiling (10) */
const MEMORY: SeedSpec[] = [
  { domain: "perf.memory.heap_profiling", title: "Profiling heap memory allocation to identify memory hotspots", concept: C("sample allocations; aggregate by call site; identify: frequent small allocs, large retained objects, leak sites") },
  { domain: "perf.memory.leak_detection", title: "Detecting memory leaks in long-running services", concept: C("monitor heap growth over time; take heap snapshots; diff: objects growing without release; identify retaining path") },
  { domain: "perf.memory.gc_tuning", title: "Tuning garbage collector parameters for performance optimization", concept: C("JVM: G1GC; target GC pause < 10ms; tune: heap size, region size, concurrent thread count; monitor GC logs") },
  { domain: "perf.memory.allocation_pressure", title: "Reducing allocation pressure to improve GC performance", concept: C("profile allocation rate; reduce: object creation in hot paths, boxing primitives, intermediate collections; pool objects") },
  { domain: "perf.memory.cache_efficiency", title: "Optimizing memory access patterns for CPU cache efficiency", concept: C("SoA over AoS for SIMD; hot data contiguous; minimize cache line false sharing; measure cache misses with perf stat") },
  { domain: "perf.memory.footprint", title: "Reducing service memory footprint for cost optimization", concept: C("measure RSS; identify: large caches, bloated dependencies, duplicate data; reduce to min viable + headroom") },
  { domain: "perf.memory.off_heap", title: "Designing off-heap memory management for large datasets", concept: C("direct ByteBuffer in JVM; mmap for file-backed; avoid GC pressure for large data; careful manual lifetime management") },
  { domain: "perf.memory.retention", title: "Analyzing memory retention paths to resolve object lifetime issues", concept: C("heap dump; OQL query; find shortest retention path from GC root to leaking object; fix reference chain") },
  { domain: "perf.memory.virtual_memory", title: "Analyzing virtual memory usage vs resident set size", concept: C("VSZ: all mapped; RSS: resident in RAM; high VSZ + low RSS = sparse; high RSS + growth = suspect leak") },
  { domain: "perf.memory.oom", title: "Designing OOM kill prevention and memory limit procedures", concept: C("set memory limit with headroom; configure OOM killer priority; monitor high-water mark; alert at 80% limit") },
];

/** 3. Load testing (10) */
const LOAD_TESTING: SeedSpec[] = [
  { domain: "perf.load.design", title: "Designing load test scenarios for production-representative workloads", concept: C("model: RPS distribution per endpoint, user think time, session length, payload sizes; replay production traffic") },
  { domain: "perf.load.ramp", title: "Implementing ramped load test procedures for capacity discovery", concept: C("ramp: 10% → 25% → 50% → 100% → 150% of target; measure: latency p99, error rate, saturation at each step") },
  { domain: "perf.load.soak", title: "Implementing soak test procedures for leak and degradation detection", concept: C("sustained target load for 4-24 hours; monitor: memory growth, latency trend, error rate trend; detect slow leaks") },
  { domain: "perf.load.spike", title: "Implementing spike test procedures for sudden load handling", concept: C("ramp instantly to 2-5x normal; measure: time to degrade, time to recover, max error rate; test autoscaling response") },
  { domain: "perf.load.baseline", title: "Establishing performance baselines for regression detection", concept: C("run load test on every release; compare p50/p95/p99 to baseline; fail CI on > 10% regression; store in time series") },
  { domain: "perf.load.tool_selection", title: "Selecting load testing tools for different performance testing needs", concept: C("k6: developer-friendly, scripted, CI-native; Gatling: Scala DSL, reports; Locust: Python, distributed; wrk: raw HTTP") },
  { domain: "perf.load.distributed", title: "Designing distributed load test execution for high RPS targets", concept: C("coordinate workers via controller; divide RPS across workers; aggregate results centrally; 1 worker per 10k RPS") },
  { domain: "perf.load.data", title: "Designing realistic test data generation for load tests", concept: C("production-like data variety; unique IDs to prevent cache bias; parameterize per virtual user; avoid hot key clustering") },
  { domain: "perf.load.environment", title: "Designing isolated load test environments for accurate results", concept: C("production-mirror infra; no shared resources with prod; dedicated DB; production config; network topology match") },
  { domain: "perf.load.analysis", title: "Analyzing load test results to identify performance bottlenecks", concept: C("correlate: latency → DB slow queries, CPU, GC, thread pool exhaustion; plot timeline with system metrics overlaid") },
];

/** 4. Database query optimization (10) */
const QUERY_OPT: SeedSpec[] = [
  { domain: "perf.database.query_plan", title: "Analyzing query execution plans to identify optimization opportunities", concept: C("EXPLAIN ANALYZE; identify: seq scan, nested loop on large tables, high cost nodes; rewrite or index to fix") },
  { domain: "perf.database.index_optimization", title: "Optimizing database index selection for query performance", concept: C("index columns in WHERE, JOIN, ORDER BY; composite index column order = selectivity then equality then range") },
  { domain: "perf.database.n_plus_one", title: "Detecting and eliminating N+1 query patterns in application code", concept: C("detect: query count proportional to result set; fix: eager load with JOIN or batch load by IDs; ORM select_related") },
  { domain: "perf.database.slow_query", title: "Implementing slow query logging and analysis procedures", concept: C("log queries > threshold; pg_stat_statements; aggregate by normalized query; investigate top 10 by total_time") },
  { domain: "perf.database.connection_pool", title: "Tuning database connection pool size for optimal throughput", concept: C("pool size = (core_count * 2) + effective_spindle_count; measure wait time; alert on pool exhaustion") },
  { domain: "perf.database.pagination", title: "Implementing efficient database pagination for large result sets", concept: C("keyset pagination: WHERE id > last_id LIMIT N; not OFFSET; consistent performance regardless of page number") },
  { domain: "perf.database.covering_index", title: "Designing covering indexes to eliminate table heap access", concept: C("include all columns in SELECT in index; eliminates table lookup; verify Index Only Scan in EXPLAIN; storage tradeoff") },
  { domain: "perf.database.partitioning", title: "Using table partitioning for query performance on large tables", concept: C("partition by date range or hash; pruning on partition key; local indexes per partition; maintenance per partition") },
  { domain: "perf.database.vacuum", title: "Implementing PostgreSQL vacuum and maintenance procedures for performance", concept: C("autovacuum tuning; bloat monitoring; manual VACUUM ANALYZE after bulk changes; fill_factor for update-heavy tables") },
  { domain: "perf.database.read_replica", title: "Optimizing read performance with read replica routing", concept: C("route read-only queries to replica; handle replication lag; staleness tolerance per query type; connection pool per role") },
];

/** 5. Caching strategies (10) */
const CACHING: SeedSpec[] = [
  { domain: "perf.cache.strategy", title: "Selecting caching strategies for different data access patterns", concept: C("cache-aside for read-heavy; write-through for consistency; write-behind for write-heavy; cache-first for static data") },
  { domain: "perf.cache.ttl", title: "Designing TTL policies for cached data freshness management", concept: C("TTL = max acceptable staleness; jitter TTL ± 10% to prevent thundering herd; shorter TTL for volatile data") },
  { domain: "perf.cache.invalidation", title: "Implementing cache invalidation strategies for data consistency", concept: C("event-based: invalidate on write event; tag-based: invalidate by tag group; time-based: TTL expiry; choose by consistency need") },
  { domain: "perf.cache.stampede", title: "Preventing cache stampede with probabilistic early expiry", concept: C("PER: probabilistically recompute before expiry based on delta and TTL; prevents thundering herd on expiry") },
  { domain: "perf.cache.warming", title: "Implementing cache warming procedures for cold start performance", concept: C("pre-populate on deploy; background warm before traffic shift; identify hot keys from production access logs") },
  { domain: "perf.cache.tiered", title: "Designing tiered caching architectures for latency reduction", concept: C("L1: in-process memory (< 1ms); L2: shared Redis (< 5ms); L3: persistent DB; check each level; fill on miss") },
  { domain: "perf.cache.eviction", title: "Selecting cache eviction policies for memory-constrained caches", concept: C("LRU: recency; LFU: frequency; ARC: adaptive; W-TinyLFU: best general; match to access pattern; measure hit rate") },
  { domain: "perf.cache.distributed", title: "Designing distributed cache consistency in multi-node deployments", concept: C("consistent hashing for sharding; replication for availability; read-your-writes: route same key to same node") },
  { domain: "perf.cache.hit_rate", title: "Measuring and optimizing cache hit rates", concept: C("hit rate = hits / (hits + misses); target > 90%; analyze misses by key pattern; adjust TTL or capacity for misses") },
  { domain: "perf.cache.cdn", title: "Optimizing CDN caching for static and dynamic content", concept: C("cache-control: max-age for static; s-maxage for CDN; Vary header; surrogate keys for tag-based purge; stale-while-revalidate") },
];

/** 6. Network performance (8) */
const NETWORK_PERF: SeedSpec[] = [
  { domain: "perf.network.latency", title: "Profiling and reducing service-to-service network latency", concept: C("measure per-hop latency; identify: serialization, DNS lookup, TCP connect, TLS handshake; optimize each") },
  { domain: "perf.network.http2", title: "Optimizing HTTP/2 multiplexing for API performance", concept: C("multiplex requests on single connection; header compression; server push for known dependencies; remove connection headers") },
  { domain: "perf.network.grpc_perf", title: "Optimizing gRPC performance for high-throughput microservices", concept: C("keepalive; max concurrent streams; protobuf over JSON; client-side load balancing; connection pooling per host") },
  { domain: "perf.network.payload", title: "Reducing API payload sizes for network performance optimization", concept: C("field selection; gzip compression; binary format (protobuf, msgpack); pagination; sparse fieldsets; partial responses") },
  { domain: "perf.network.dns", title: "Optimizing DNS resolution performance in service architectures", concept: C("cache DNS responses; increase TTL for stable services; DNS prefetch; avoid per-request DNS lookup; local resolver") },
  { domain: "perf.network.tcp_tuning", title: "Tuning TCP parameters for high-throughput service performance", concept: C("TCP_NODELAY for latency; SO_REUSEPORT for load distribution; tcp_rmem/wmem for throughput; congestion control algorithm") },
  { domain: "perf.network.connection_pooling", title: "Implementing connection pooling for external service calls", concept: C("pool HTTP connections per host; max connections per host; keepalive timeout; health check idle connections; size to P99 concurrency") },
  { domain: "perf.network.geo", title: "Reducing network latency with geographic request routing", concept: C("route to nearest region; anycast DNS; measure RTT per region; CDN edge for cacheable content; data residency constraints") },
];

/** 7. JIT and runtime optimization (8) */
const JIT: SeedSpec[] = [
  { domain: "perf.jit.jvm_warmup", title: "Optimizing JVM JIT compilation warmup procedures", concept: C("profile during warmup; pre-warm before traffic; AOT compile hot paths; tiered compilation; measure steady-state vs cold") },
  { domain: "perf.jit.deoptimization", title: "Diagnosing and fixing JVM JIT deoptimization issues", concept: C("print deoptimization events; cause: type instability, uncommon trap; make hot paths monomorphic; reduce type polymorphism") },
  { domain: "perf.jit.inlining", title: "Optimizing JIT inlining for hot method performance", concept: C("-XX:MaxInlineSize; inline hot small methods; avoid inline limit by splitting large methods; check with JIT log") },
  { domain: "perf.jit.v8_optimization", title: "Writing V8-friendly JavaScript for JIT optimization", concept: C("monomorphic functions: consistent argument types; avoid deleting properties; hidden class stability; avoid eval and arguments") },
  { domain: "perf.jit.pypy", title: "Optimizing Python code for PyPy JIT compilation", concept: C("avoid CPython C extensions; pure Python hot paths; avoid dynamism in hot loops; numeric loops JIT well") },
  { domain: "perf.jit.graalvm", title: "Using GraalVM native image for startup and memory optimization", concept: C("AOT compilation; fast startup; low footprint; closed-world assumption; configure reflection and resources at build") },
  { domain: "perf.jit.pgo", title: "Implementing profile-guided optimization for compiled languages", concept: C("instrument binary; collect production profiles; recompile with profiles; hot paths inlined and optimized; 10-20% gain") },
  { domain: "perf.jit.simd", title: "Utilizing SIMD vectorization for numerical performance optimization", concept: C("auto-vectorization via compiler; enable AVX2/AVX-512; data layout: SoA for SIMD; avoid branches in hot loops") },
];

/** 8. Capacity planning (10) */
const CAPACITY: SeedSpec[] = [
  { domain: "perf.capacity.modeling", title: "Designing capacity planning models for service infrastructure", concept: C("model: RPS × avg latency = concurrency (Little's Law); resource per concurrency unit; headroom factor; growth rate") },
  { domain: "perf.capacity.forecasting", title: "Implementing traffic growth forecasting for capacity planning", concept: C("trend from 90-day history; seasonal model; growth rate from business metrics; plan for peak × 1.5 headroom") },
  { domain: "perf.capacity.vertical", title: "Designing vertical scaling procedures for compute resources", concept: C("measure: CPU and memory utilization; right-size to target 60% avg; upgrade instance tier; test before production") },
  { domain: "perf.capacity.horizontal", title: "Designing horizontal scaling procedures for stateless services", concept: C("identify scaling metric; set scale-out threshold at 70% target metric; scale-in with cooldown; test autoscaling") },
  { domain: "perf.capacity.database_sizing", title: "Sizing database resources for query volume and data growth", concept: C("IOPS from query profile; storage from data growth rate × 12 months; CPU from query load; connection count per service") },
  { domain: "perf.capacity.bottleneck", title: "Identifying system bottlenecks for capacity investment prioritization", concept: C("measure: CPU, memory, IOPS, network, thread pools, connection pools; bottleneck = resource limiting throughput first") },
  { domain: "perf.capacity.cost", title: "Optimizing infrastructure cost while maintaining performance targets", concept: C("cost per RPS; identify over-provisioned resources; right-size; spot instances for batch; reserved for stable baseline") },
  { domain: "perf.capacity.database_query_optimization", title: "Reducing database compute requirements through query optimization", concept: C("slow query analysis; index additions; query rewrites; caching; each reduces DB load and defers capacity spend") },
  { domain: "perf.capacity.gpu_memory", title: "Managing GPU memory fragmentation and utilization for ML workloads", concept: C("defragment by clearing CUDA cache; set memory fraction; batch size tuning; mixed precision; gradient checkpointing") },
  { domain: "perf.capacity.service_throughput", title: "Scaling service throughput to meet demand with minimal latency regression", concept: C("throughput = capacity / avg_service_time; add capacity when utilization > 70%; measure latency at each capacity level") },
];

export const PERFORMANCE_ENGINEERING_SEED_SPECS: SeedSpec[] = [
  ...CPU_PROFILING,
  ...MEMORY,
  ...LOAD_TESTING,
  ...QUERY_OPT,
  ...CACHING,
  ...NETWORK_PERF,
  ...JIT,
  ...CAPACITY,
];
