import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

// ── Database Query Optimization ────────────────────────────────────────────
const DB_QUERY_TUNING: SeedSpec[] = [
  { domain: "tuning.db.index_selection", title: "Index selection for query latency optimization: B-tree vs hash vs GIN", concept: C("profile: identify queries with Seq Scan on table > 100k rows; choose: B-tree for range/order, hash for equality, GIN for JSONB/arrays/fulltext; create index CONCURRENTLY; validate: EXPLAIN shows Index Scan; measure: p99 latency before/after; reject if write TPS drops > 10% (index overhead)") },
  { domain: "tuning.db.n_plus_one", title: "N+1 query detection and batch loading fix", concept: C("detect: query count grows linearly with result set (N queries for N records); instrument with query log or ORM query counter; fix: replace N+1 with single JOIN or IN clause batch fetch; validate: query count is O(1) not O(N) for result set; measure: p99 endpoint latency improvement; test with result set sizes 1, 10, 100, 1000") },
  { domain: "tuning.db.query_plan_cache", title: "Prepared statement plan caching for repeated query optimization", concept: C("use parameterized queries (not string concat); database caches plan after first execution; validate: pg_stat_statements shows plan cache hits; avoid: dynamic column selection or variable table names in prepared statements; monitor: plan_cache_invalidation_count; re-prepare on schema change") },
  { domain: "tuning.db.partition_pruning", title: "Partition pruning validation for time-series query optimization", concept: C("design: partition by time column (created_at); ensure WHERE clause includes partition key; validate EXPLAIN shows 'Partitions: p2024_01' not all partitions; enable: constraint_exclusion=partition; measure: query scans N/total_partitions fraction of data; reject: full partition scan on partitioned table") },
];

// ── GPU Tuning ─────────────────────────────────────────────────────────────
const GPU_TUNING: SeedSpec[] = [
  { domain: "tuning.gpu.memory_utilization", title: "GPU memory utilization optimization: batch sizing and gradient checkpointing", concept: C("measure: nvidia-smi --query-gpu=memory.used,memory.total; target: memory_used/memory_total > 0.85; increase batch_size until OOM, then reduce by 10%; enable gradient_checkpointing to trade compute for memory (-30% memory, +20% compute); use mixed precision (fp16) to halve memory; validate: throughput improves with same model quality") },
  { domain: "tuning.gpu.kernel_fusion", title: "CUDA kernel fusion to reduce memory bandwidth bottleneck", concept: C("profile: nvprof or Nsight to identify kernel launch overhead and memory-bound kernels; fuse: combine consecutive element-wise ops (relu+add+layernorm) into single kernel via torch.compile or custom CUDA; validate: memory bandwidth utilization decreases; measure: tokens/sec improvement; accept if throughput gain > 5%") },
  { domain: "tuning.gpu.tensor_parallelism", title: "Tensor parallelism configuration for multi-GPU inference", concept: C("partition: attention heads and FFN weight matrices across N GPUs; each GPU holds 1/N of parameters; all-reduce after each layer; configure tensor_parallel_size = N; validate: GPU memory per device ≈ total_params / N × 2 bytes (fp16); measure: latency reduction vs single GPU; diminishing returns above 8 GPUs for most models") },
  { domain: "tuning.gpu.quantization_accuracy", title: "INT8 quantization calibration and accuracy validation procedure", concept: C("calibrate: run representative dataset (1000 samples) through model in fp16; compute activation ranges per layer; apply symmetric int8 quantization; validate: accuracy delta < 0.5% on eval set; latency: int8 inference 2× faster than fp16 on compatible hardware; fallback: keep sensitive layers in fp16 (attention, layer norm)") },
];

// ── Network Throughput ─────────────────────────────────────────────────────
const NETWORK_TUNING: SeedSpec[] = [
  { domain: "tuning.network.tcp_buffer", title: "TCP buffer size tuning for high-throughput data transfer", concept: C("formula: optimal_buffer = bandwidth_bps × round_trip_time_s (bandwidth-delay product); set: net.core.rmem_max and wmem_max = 2× BDP; net.ipv4.tcp_rmem and tcp_wmem = 'min default max'; validate: iperf3 throughput matches theoretical bandwidth; check: ss -i to confirm buffer sizes in use") },
  { domain: "tuning.network.connection_reuse", title: "HTTP connection reuse optimization: keep-alive and connection pooling", concept: C("enable: HTTP/1.1 keep-alive or HTTP/2 multiplexing; configure: connection pool size = concurrent_requests × avg_latency_s × target_rps (Little's Law); monitor: connection_reuse_ratio = requests / connections; validate: connection setup overhead < 1% of request time; avoid: connection per request pattern") },
  { domain: "tuning.network.cdn_cache_hit", title: "CDN cache hit ratio optimization: cache-control header tuning", concept: C("set Cache-Control: max-age=N for static assets (N=31536000 for immutable); Vary header: only on Accept-Language, Accept-Encoding (never Authorization); measure: CDN cache_hit_ratio = cache_hits / total_requests; target: > 90% for static, > 70% for semi-static; avoid: query string cache busting; use path-based versioning") },
  { domain: "tuning.network.grpc_streaming", title: "gRPC streaming optimization: flow control and keepalive tuning", concept: C("set: GRPC_ARG_HTTP2_BDP_PROBE=1; GRPC_ARG_KEEPALIVE_TIME_MS=30000; GRPC_ARG_KEEPALIVE_TIMEOUT_MS=10000; flow control: initial window size = 65535 (default), increase to 1MB for high-throughput; validate: no GOAWAY frames; measure: throughput in MB/s; tune max_concurrent_streams per connection") },
];

// ── JVM and Runtime ────────────────────────────────────────────────────────
const RUNTIME_TUNING: SeedSpec[] = [
  { domain: "tuning.jvm.gc_tuning", title: "JVM GC tuning: G1GC configuration for low-latency applications", concept: C("set: -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:G1HeapRegionSize=16m; heap: -Xms = -Xmx (avoid resize pauses); target: GC pause < 100ms at p99; monitor: GC log with -Xlog:gc*; alert: if GC time > 5% of wall clock; tune: region size if humongous object allocations > 10%") },
  { domain: "tuning.jvm.thread_pool_sizing", title: "JVM thread pool sizing formula for CPU-bound and IO-bound workloads", concept: C("CPU-bound: pool_size = CPU_cores + 1; IO-bound: pool_size = CPU_cores × (1 + wait_time/compute_time); measure: wait_time and compute_time from profiler; validate: CPU utilization 70-80% at target throughput; monitor: thread_pool_queue_size < 100 at steady state; resize: if queue grows, add threads up to 2× CPU_cores") },
  { domain: "tuning.runtime.nodejs_event_loop", title: "Node.js event loop lag monitoring and optimization procedure", concept: C("measure: event loop lag = actual_timer_delay - expected_delay (using setImmediate timestamp diff); alert: lag > 100ms; diagnose: use --prof to identify blocking callbacks; fix: move CPU-intensive work to worker_threads; validate: event loop lag < 10ms at p99 under load; limit synchronous JSON.parse on large payloads") },
  { domain: "tuning.runtime.python_gil", title: "Python GIL contention identification and concurrency workaround", concept: C("diagnose: GIL contention when CPU bound tasks scale poorly beyond 1 core; measure: py-spy to show GIL wait time; fix: CPU-bound → multiprocessing.Pool; IO-bound → asyncio or threading; validate: throughput scales linearly with CPU cores using multiprocessing; use numpy/C extensions that release GIL") },
];

// ── Linux and OS Tuning ────────────────────────────────────────────────────
const OS_TUNING: SeedSpec[] = [
  { domain: "tuning.os.file_descriptors", title: "Linux file descriptor limit tuning for high-concurrency servers", concept: C("check: ulimit -n (default 1024); set: ulimit -n 65536 in process startup; persist: /etc/security/limits.conf → '* soft nofile 65536 hard nofile 65536'; validate: cat /proc/{pid}/limits shows updated fd limit; monitor: lsof -p {pid} | wc -l; alert if > 80% of limit") },
  { domain: "tuning.os.cpu_affinity", title: "CPU affinity pinning for latency-sensitive processes", concept: C("identify: NUMA topology with numactl --hardware; pin: taskset -c 0-3 ./process or numactl --cpunodebind=0 ./process; validate: latency variance reduces with pinning; avoid: pinning across NUMA nodes (cross-NUMA memory access adds 100ns+); measure: p99 latency before/after pinning; disable: CPU frequency scaling (cpupower frequency-set -g performance)") },
];

export const PERFORMANCE_TUNING_GUIDES_SEED_SPECS: SeedSpec[] = [
  ...DB_QUERY_TUNING,
  ...GPU_TUNING,
  ...NETWORK_TUNING,
  ...RUNTIME_TUNING,
  ...OS_TUNING,
];
