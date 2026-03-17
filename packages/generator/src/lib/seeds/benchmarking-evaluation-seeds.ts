import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

// ── ML Benchmarking ────────────────────────────────────────────────────────
const ML_BENCHMARKS: SeedSpec[] = [
  { domain: "benchmark.ml.inference_throughput", title: "ML model inference throughput benchmark procedure", concept: C("warm-up: run 100 batches before measurement; measure: record tokens/sec or samples/sec over 1000 batches; vary batch_size from 1 to max_batch; report: mean, p50, p95, p99 throughput; baselines: compare to published MLCommons results; environment: fix GPU clock, disable dynamic power scaling") },
  { domain: "benchmark.ml.latency_p99", title: "Inference latency p99 measurement and SLO validation", concept: C("measure: record end-to-end latency for each request over N=10000 samples; compute percentiles (p50, p95, p99, p999); SLO threshold: p99 < 500ms; reject configuration if p99 > SLO; repeat across 3 independent runs; report coefficient of variation < 5%") },
  { domain: "benchmark.ml.accuracy_regression", title: "Model accuracy regression test: threshold-based pass/fail", concept: C("define eval_dataset: held-out 1000 samples not in training; compute accuracy/F1 on eval_dataset; compare to baseline_accuracy from champion model; fail if accuracy < baseline - threshold (e.g. 0.5%); report per-class metrics for imbalanced datasets; block deployment on regression") },
  { domain: "benchmark.ml.memory_footprint", title: "Model memory footprint measurement and budget enforcement", concept: C("measure: GPU memory = torch.cuda.max_memory_allocated() after forward pass; CPU memory = tracemalloc peak during batch; budget: model_size_gb + activation_gb < hardware_limit × 0.85; fail if over budget; measure with max_batch_size; report memory efficiency = throughput/GB") },
  { domain: "benchmark.ml.energy_efficiency", title: "ML training energy consumption measurement and reporting", concept: C("instrument: use nvidia-smi power draw at 100ms intervals; compute: energy_J = sum(power_W × interval_s); normalize: energy_per_sample = total_energy / total_samples; compare across: FP32 vs FP16 vs INT8; report: training_cost_kwh = total_energy / 3600000; target: energy/sample improves by ≥20% vs prior version") },
];

// ── Database Benchmarking ──────────────────────────────────────────────────
const DB_BENCHMARKS: SeedSpec[] = [
  { domain: "benchmark.database.tpcc", title: "TPC-C OLTP benchmark execution and throughput validation", concept: C("configure: scale_factor = target_warehouses (1 warehouse ≈ 100MB); run: mix of NewOrder(45%), Payment(43%), OrderStatus(4%), Delivery(4%), StockLevel(4%); measure: tpmC = NewOrder transactions/min; validate: < 0.1% error rate; warmup 10min before measurement; report tpmC and $/tpmC") },
  { domain: "benchmark.database.sysbench_oltp", title: "sysbench OLTP read/write latency benchmark procedure", concept: C("prepare: sysbench oltp_read_write prepare --tables=10 --table-size=1000000; run: --threads=32 --time=300 --report-interval=10; measure: latency p95 and p99, TPS; validate: p99 < 50ms at target TPS; compare: runs across index configurations; report: TPS and latency per thread count") },
  { domain: "benchmark.database.query_regression", title: "SQL query regression test suite with execution plan validation", concept: C("catalog: 100 representative production queries with expected plan hash and max_exec_ms; run: EXPLAIN ANALYZE each query; fail if: exec_time > 2× baseline OR plan hash changes (plan regression); alert on new Seq Scan; schedule: run on every schema migration; output: regression report JSON") },
  { domain: "benchmark.database.connection_scalability", title: "Database connection scalability benchmark: throughput vs concurrency", concept: C("vary: concurrent connections from 10 to max_connections in steps of 10; measure: TPS and latency at each concurrency level; identify: saturation point where TPS plateaus and latency inflects; optimal_pool_size = saturation_point × 0.8; validate: pool_size setting in app matches optimal") },
];

// ── API and Load Testing ───────────────────────────────────────────────────
const LOAD_TESTING: SeedSpec[] = [
  { domain: "benchmark.load.k6_scenario", title: "k6 load test scenario design and SLO gate procedure", concept: C("design: ramp-up 0→target_rps over 2min; sustain target_rps for 10min; ramp-down 2min; SLO gates: p95_latency < 200ms, error_rate < 0.1%, p99 < 500ms; fail: if any SLO gate breached during sustain phase; output: k6 summary JSON with pass/fail per threshold") },
  { domain: "benchmark.load.soak_test", title: "Soak test for memory leak and resource exhaustion detection", concept: C("run: sustained 60% of peak load for 24h; monitor: heap_used, open_file_descriptors, active_connections every 60s; fail: if any metric grows monotonically over 4h without plateau; detect: leak signature = linear growth R² > 0.9 over window; alert before OOM kill") },
  { domain: "benchmark.load.spike_test", title: "Spike test: system behavior under sudden 10× traffic increase", concept: C("baseline: 10min at normal load; spike: increase to 10× target_rps in 10s; sustain: 2min; recover: return to normal; measure: time_to_error (should be 0), time_to_recover (< 60s), error_rate during spike; validate autoscaler triggers within 30s; document max sustainable spike ratio") },
  { domain: "benchmark.load.capacity_model", title: "Capacity model: request rate to resource consumption mapping", concept: C("measure: CPU%, memory_MB, DB_connections at 10%, 25%, 50%, 75%, 100% of target_RPS; fit linear regression: resource = a × RPS + b; compute: max_RPS = (resource_limit - b) / a; apply safety_factor = 0.7; capacity_limit = max_RPS × 0.7; alert when RPS > capacity_limit × 0.8") },
];

// ── Evaluation Frameworks ──────────────────────────────────────────────────
const EVAL_FRAMEWORKS: SeedSpec[] = [
  { domain: "benchmark.eval.llm_harness", title: "LLM evaluation harness setup and benchmark suite execution", concept: C("install lm-evaluation-harness; select tasks: MMLU, HellaSwag, TruthfulQA, GSM8K; run: lm_eval --model hf --model_args pretrained=model_path --tasks task_list --num_fewshot 5; report: accuracy per task, mean across tasks; compare to published baseline; fail if any task drops > 2% vs baseline") },
  { domain: "benchmark.eval.rag_metrics", title: "RAG pipeline evaluation: RAGAS metrics and threshold gates", concept: C("build: 200-question eval set with ground-truth answers and contexts; compute: faithfulness = fraction of answer claims supported by context; answer_relevancy = cosine(answer_embedding, question_embedding); context_recall = fraction of ground-truth covered by retrieved context; gate: faithfulness > 0.85, context_recall > 0.75") },
  { domain: "benchmark.eval.ab_test_significance", title: "A/B test statistical significance calculation and minimum sample size", concept: C("compute: min_sample = (z_α/2 + z_β)² × 2 × p(1-p) / δ²; z_α/2=1.96 (95% CI), z_β=0.84 (80% power); δ = minimum detectable effect; run test until min_sample reached per variant; compute p-value with two-proportion z-test; reject H0 if p < 0.05; report: lift, CI, and p-value") },
  { domain: "benchmark.eval.chaos_engineering", title: "Chaos engineering experiment: hypothesis, inject, measure, learn", concept: C("define: steady_state_hypothesis (e.g. p99_latency < 200ms); inject failure: kill random pod / add 100ms network latency / fill disk 90%; observe: does steady state hold during fault?; measure: time_to_detect, time_to_mitigate; abort if impact > expected blast radius; document: system resilience score per failure type") },
];

export const BENCHMARKING_EVALUATION_SEED_SPECS: SeedSpec[] = [
  ...ML_BENCHMARKS,
  ...DB_BENCHMARKS,
  ...LOAD_TESTING,
  ...EVAL_FRAMEWORKS,
];
