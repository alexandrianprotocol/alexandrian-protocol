/**
 * ML & MLOps Seeds (~90 seed procedures).
 * Machine learning engineering and operations: feature stores, training pipelines,
 * evaluation, model serving, drift detection, RLHF, experiment tracking, and governance.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Feature engineering (10) */
const FEATURE_ENGINEERING: SeedSpec[] = [
  { domain: "ml.feature.engineering", title: "Designing feature pipelines for tabular ML models", concept: C("define feature → transformation → validation chain; test each step independently") },
  { domain: "ml.feature.selection", title: "Implementing feature selection using importance scores", concept: C("train baseline; compute SHAP or permutation importance; drop below threshold") },
  { domain: "ml.feature.encoding", title: "Encoding categorical features for tree and linear models", concept: C("ordinal for tree models; one-hot for linear; target encoding with cross-val for high-cardinality") },
  { domain: "ml.feature.scaling", title: "Scaling and normalizing numeric features", concept: C("StandardScaler for linear models; MinMax for bounded; RobustScaler for outliers") },
  { domain: "ml.feature.temporal", title: "Engineering temporal features from time-series data", concept: C("lag features; rolling stats; cyclical encoding (sin/cos) for calendar fields") },
  { domain: "ml.feature.interaction", title: "Designing feature interaction terms for linear models", concept: C("explicit product features; polynomial expansion; validate lift over base") },
  { domain: "ml.feature.embedding", title: "Generating entity embeddings for sparse categorical features", concept: C("train embedding layer or use pre-trained; freeze or fine-tune; validate by neighbor similarity") },
  { domain: "ml.feature.leakage", title: "Detecting and preventing feature leakage", concept: C("audit each feature's temporal origin; future info must not appear in training window") },
  { domain: "ml.feature.store", title: "Designing feature store architecture for online and offline serving", concept: C("offline store for training; online store for serving; point-in-time correct joins for training") },
  { domain: "ml.feature.freshness", title: "Designing feature freshness SLAs for online serving", concept: C("max_staleness per feature; alert on lag; fallback to default on timeout") },
];

/** 2. Training pipeline design (10) */
const TRAINING_PIPELINE: SeedSpec[] = [
  { domain: "mlops.training.dag", title: "Designing ML training DAGs with artifact versioning", concept: C("each step produces versioned artifact; downstream steps consume by hash; reruns skip unchanged") },
  { domain: "mlops.training.reproducibility", title: "Implementing reproducible ML training procedures", concept: C("seed all random sources; pin dependencies; log hyperparams and data hash") },
  { domain: "mlops.training.distributed", title: "Designing distributed training pipelines for large models", concept: C("data parallel: shard batch; gradient sync at step; monitor loss curves per node") },
  { domain: "mlops.training.hyperparameter", title: "Implementing hyperparameter search strategies", concept: C("Bayesian optimization or Optuna; define search space; early stop on bad trials") },
  { domain: "mlops.training.checkpoint", title: "Designing model checkpoint and resume strategies", concept: C("checkpoint every N steps; save optimizer state; resume from latest valid checkpoint") },
  { domain: "mlops.training.data_split", title: "Designing train/validation/test split procedures", concept: C("stratify by label; time-based split for temporal data; hold out test until final eval") },
  { domain: "mlops.training.class_imbalance", title: "Handling class imbalance in training pipelines", concept: C("oversample minority, undersample majority, or class-weight; validate on balanced metric") },
  { domain: "mlops.training.data_validation", title: "Validating training data quality before model fitting", concept: C("schema check; distribution check vs reference; fail pipeline on anomaly") },
  { domain: "mlops.training.curriculum", title: "Designing curriculum learning strategies", concept: C("order samples easy-to-hard; adaptive difficulty by loss; validate sample ordering") },
  { domain: "mlops.training.cost", title: "Optimizing GPU compute cost in training pipelines", concept: C("profile per-step time; mixed precision (fp16); gradient checkpointing; spot instance handling") },
];

/** 3. Model evaluation (10) */
const EVALUATION: SeedSpec[] = [
  { domain: "ml.eval.metrics", title: "Choosing evaluation metrics aligned with business objectives", concept: C("match metric to task (F1 for imbalanced; NDCG for ranking; AUC for scoring)") },
  { domain: "ml.eval.sliced", title: "Implementing sliced evaluation across population segments", concept: C("evaluate on each cohort; surface worst-performing slice; gate on per-slice threshold") },
  { domain: "ml.eval.offline", title: "Designing offline evaluation harnesses for models", concept: C("fixed eval dataset; run at each version; track metric history; alert on regression") },
  { domain: "ml.eval.calibration", title: "Evaluating and improving model calibration", concept: C("reliability diagram; ECE; Platt scaling or isotonic regression to recalibrate") },
  { domain: "ml.eval.confusion", title: "Analyzing confusion matrices for classification models", concept: C("compute per-class precision/recall; diagnose false positive vs false negative cost") },
  { domain: "ml.eval.ranking", title: "Implementing ranking model evaluation procedures", concept: C("NDCG@K; MRR; MAP; compute on held-out queries; compare to baseline ranker") },
  { domain: "ml.eval.regression", title: "Designing regression model evaluation procedures", concept: C("RMSE; MAE; MAPE; residual plots; check heteroscedasticity") },
  { domain: "ml.eval.baseline", title: "Establishing meaningful model baselines", concept: C("naive predictor (mean, majority class, last value); new model must beat baseline on primary metric") },
  { domain: "ml.eval.human", title: "Designing human evaluation protocols for generative models", concept: C("rater rubric; inter-rater agreement (Cohen's κ); blind side-by-side comparison") },
  { domain: "ml.eval.ab_shadow", title: "Implementing shadow scoring for model comparison", concept: C("run new model in shadow; compare outputs to production; no user impact") },
];

/** 4. Model serving architecture (8) */
const SERVING: SeedSpec[] = [
  { domain: "mlops.serving.realtime", title: "Designing real-time model serving architectures", concept: C("REST or gRPC endpoint; serialize input; run inference; return within latency SLA") },
  { domain: "mlops.serving.batch", title: "Designing batch inference pipelines", concept: C("partition dataset; parallelize inference workers; write results to store with job ID") },
  { domain: "mlops.serving.latency", title: "Optimizing model serving latency with quantization and pruning", concept: C("INT8 quantization; weight pruning; benchmark on target hardware; validate accuracy delta") },
  { domain: "mlops.serving.scaling", title: "Designing auto-scaling policies for model serving endpoints", concept: C("scale on GPU utilization or queue depth; min instances > 0 to avoid cold start") },
  { domain: "mlops.serving.multi_model", title: "Designing multi-model serving systems", concept: C("model router by input type; shared runtime; version-aware routing; fallback policy") },
  { domain: "mlops.serving.caching", title: "Implementing prediction caching for deterministic inputs", concept: C("hash input → cache key; TTL by staleness tolerance; invalidate on model update") },
  { domain: "mlops.serving.fallback", title: "Designing fallback strategies for model serving failures", concept: C("health check; fall back to simpler model or rule; log degraded mode; alert") },
  { domain: "mlops.serving.streaming", title: "Implementing streaming inference for token-level generation", concept: C("server-sent events or gRPC streaming; flush token on generation; timeout on stall") },
];

/** 5. Experiment tracking (8) */
const EXPERIMENT_TRACKING: SeedSpec[] = [
  { domain: "mlops.experiments.logging", title: "Implementing experiment metadata logging standards", concept: C("log: run ID, git SHA, data hash, hyperparams, metrics per epoch; queryable store") },
  { domain: "mlops.experiments.comparison", title: "Designing experiment comparison workflows", concept: C("select baseline run; compare metric deltas; statistical test on eval set; visualize") },
  { domain: "mlops.experiments.reproducibility", title: "Auditing experiment reproducibility from logs", concept: C("replay: same seed + data hash + config → same metrics within tolerance") },
  { domain: "mlops.experiments.registry", title: "Designing ML experiment and model registries", concept: C("register run → stage → promote to production; tag with eval metrics and dataset version") },
  { domain: "mlops.experiments.search", title: "Implementing experiment search and filtering systems", concept: C("index by metric; filter by tag; compare selected runs; export to report") },
  { domain: "mlops.experiments.lineage", title: "Tracking data and model lineage across experiments", concept: C("link model version → training run → dataset version → feature pipeline version") },
  { domain: "mlops.experiments.hypothesis", title: "Designing experiment hypothesis logging procedures", concept: C("pre-register hypothesis; record expected metric delta; evaluate post-run; persist outcome") },
  { domain: "mlops.experiments.cost", title: "Tracking compute cost per experiment run", concept: C("instrument GPU-hours and storage per run; alert on cost outliers; budget gates") },
];

/** 6. Drift detection & monitoring (8) */
const DRIFT: SeedSpec[] = [
  { domain: "mlops.drift.data", title: "Implementing data distribution drift detection", concept: C("KS test or PSI vs reference window; alert when drift score > threshold") },
  { domain: "mlops.drift.concept", title: "Detecting concept drift in model predictions", concept: C("track prediction distribution and outcome rates; alert on shift; trigger retraining") },
  { domain: "mlops.drift.feature", title: "Monitoring feature distribution shifts in production", concept: C("log feature stats per hour; compare to training distribution; flag > 2σ shift") },
  { domain: "mlops.drift.label", title: "Designing label drift monitoring for supervised models", concept: C("track outcome label rate over time; alert on unexpected shift vs historical baseline") },
  { domain: "mlops.drift.performance", title: "Monitoring model performance degradation in production", concept: C("compute metric on labeled slice; compare to baseline; page on sustained regression") },
  { domain: "mlops.drift.retraining", title: "Designing automated retraining triggers from drift signals", concept: C("drift threshold → queue retrain job; validate new model; promote if better") },
  { domain: "mlops.drift.shadow", title: "Implementing shadow deployment for drift validation", concept: C("new model in shadow; compare output distributions; promote if stable after N requests") },
  { domain: "mlops.drift.alerting", title: "Designing multi-level drift alerting strategies", concept: C("warn at mild drift; page at severe drift; auto-fallback at critical threshold") },
];

/** 7. Data pipeline for ML (8) */
const DATA_PIPELINE: SeedSpec[] = [
  { domain: "mlops.data.ingestion", title: "Designing raw data ingestion pipelines for ML", concept: C("schema-validated ingest; deduplication; partition by date; write to lakehouse layer") },
  { domain: "mlops.data.labeling", title: "Implementing data labeling pipeline quality controls", concept: C("label schema; inter-annotator agreement; consensus or adjudication; version label set") },
  { domain: "mlops.data.versioning", title: "Versioning datasets for ML reproducibility", concept: C("content-hash dataset; store manifest; tag to experiment run; immutable once registered") },
  { domain: "mlops.data.augmentation", title: "Designing data augmentation pipelines for training", concept: C("augmentation types by modality; apply in dataloader; validate label preservation") },
  { domain: "mlops.data.filtering", title: "Implementing data quality filtering for training sets", concept: C("quality score per sample; threshold filter; log rejection rate; audit rejected samples") },
  { domain: "mlops.data.synthetic", title: "Generating synthetic training data for rare events", concept: C("SMOTE or GAN; validate synthetic distribution vs real; blend ratio by task") },
  { domain: "mlops.data.pii", title: "Implementing PII scrubbing in ML training pipelines", concept: C("NER-based PII detection; redact or mask; audit scrubber coverage; do not store raw PII") },
  { domain: "mlops.data.sampling", title: "Designing efficient data sampling strategies for large datasets", concept: C("stratified sample by label and cohort; reservoir sampling for streaming; validate coverage") },
];

/** 8. RLHF & fine-tuning pipelines (8) */
const RLHF: SeedSpec[] = [
  { domain: "ml.rlhf.preference", title: "Designing preference data collection pipelines for RLHF", concept: C("pairwise or pointwise rating; rater guidelines; IAA check; version preference dataset") },
  { domain: "ml.rlhf.reward_model", title: "Training reward models from human preference data", concept: C("Bradley-Terry model; pairwise loss; eval on held-out comparison; calibration check") },
  { domain: "ml.rlhf.ppo", title: "Implementing PPO training loops for language model alignment", concept: C("rollout → score → advantage → policy update; KL penalty to reference; clip reward") },
  { domain: "ml.finetune.sft", title: "Designing supervised fine-tuning pipelines for LLMs", concept: C("format dataset as prompt+completion; train with causal LM loss; eval on held-out benchmark") },
  { domain: "ml.finetune.lora", title: "Implementing LoRA adapters for parameter-efficient fine-tuning", concept: C("inject LoRA on attention layers; rank and alpha as hyperparams; merge for serving") },
  { domain: "ml.finetune.catastrophic", title: "Mitigating catastrophic forgetting in fine-tuning", concept: C("EWC regularization or replay buffer of base task data; eval on base benchmarks post-tune") },
  { domain: "ml.rlhf.dpo", title: "Implementing DPO training as an alternative to PPO", concept: C("reference model + preferred/rejected pairs; DPO loss; no reward model needed") },
  { domain: "ml.finetune.evaluation", title: "Evaluating fine-tuned models against base and task benchmarks", concept: C("eval on task benchmark + base capability set; track regression; gate promotion on both") },
];

/** 9. Model registry & governance (8) */
const GOVERNANCE: SeedSpec[] = [
  { domain: "mlops.registry.versioning", title: "Designing model versioning and staging workflows", concept: C("version = semver; stages: dev → staging → production; promote with eval gate") },
  { domain: "mlops.registry.lineage", title: "Recording full model lineage in the registry", concept: C("model card: training data, hyperparams, metrics, eval results, authors; immutable on register") },
  { domain: "mlops.registry.promotion", title: "Designing model promotion gating procedures", concept: C("automated eval gate; human approval for production; rollback path required before promote") },
  { domain: "mlops.registry.deprecation", title: "Implementing model deprecation procedures", concept: C("mark deprecated; migrate consumers; sunset date; archive artifacts after sunset") },
  { domain: "mlops.governance.bias", title: "Auditing models for demographic bias", concept: C("disaggregate metrics by protected attribute; fairness constraint; document in model card") },
  { domain: "mlops.governance.explainability", title: "Implementing model explainability for production decisions", concept: C("SHAP or LIME per prediction; log explanations for audited decisions; threshold on confidence") },
  { domain: "mlops.governance.access", title: "Designing access control for model registry", concept: C("RBAC on registry; role: scientist, reviewer, deployer; audit log on promote/rollback") },
  { domain: "mlops.governance.compliance", title: "Implementing ML model compliance documentation", concept: C("model card per version; risk tier; intended use; limitations; approved use cases") },
];

export const ML_MLOPS_SEED_SPECS: SeedSpec[] = [
  ...FEATURE_ENGINEERING,
  ...TRAINING_PIPELINE,
  ...EVALUATION,
  ...SERVING,
  ...EXPERIMENT_TRACKING,
  ...DRIFT,
  ...DATA_PIPELINE,
  ...RLHF,
  ...GOVERNANCE,
];
