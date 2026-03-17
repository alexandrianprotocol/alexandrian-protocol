 /**
 * Procedural specificity filter — reject vague meta-procedures (combine/merge/analyze)
 * in favor of actionable, deterministic steps. Improves agent usability and KB quality.
 *
 * Score 0–8: specific verbs (+2), explicit inputs (+1), explicit outputs (+1),
 * step chaining (+1), domain-specific vars (+2), sufficient step count (+1).
 * Accept when score >= PROCEDURAL_SPECIFICITY_MIN_SCORE (6).
 */

import type { KBv24Artifact, StructuredStep, StepItem } from "../types/artifact.js";

/** Vague verbs that describe thinking/knowledge manipulation, not concrete operations. */
export const LOW_SPECIFICITY_VERBS = new Set([
  "combine", "merge", "synthesize", "synthesise", "analyze", "analyse",
  "consider", "review", "interpret", "study", "examine", "derive", "reflect",
  "identify_shared", "identify_insights", "evaluate_results", "evaluate_information",
  "extract_insights", "merge_workflows", "combine_insights", "derive_guidance",
]);

/** High-specificity action verbs: data transformation, decision, execution. */
const HIGH_SPECIFICITY_PATTERN = /^(extract|parse|sanitize|normalize|encode|decode|filter|aggregate|rank|sort|evaluate|compare|select|prioritize|score|validate|classify|invoke|query|generate|execute|apply|construct|compile|transform|map|detect|implement|emit|store|enforce|define|restate|add|apply_constraints|construct_template|validate_against|define_goal|identify_subtasks|map_dependencies)(_|$)/i;

/** Generic input/output names that indicate weak interface specificity. */
const GENERIC_IO = new Set(["context", "data", "information", "input", "inputs", "output", "outputs", "result", "results"]);

/** Domain root → expected tokens for domain consistency (step/interface overlap). */
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  "agent": ["goal", "task", "plan", "step", "action", "execute", "tool", "prompt", "decompose", "schedule", "evaluation", "delegate", "backtrack", "structured_output", "schema"],
  "ai": ["prompt", "model", "generation", "embedding", "retrieval", "context", "output", "template", "persona"],
  "software": [
    "test", "input", "output", "code", "api", "schema", "validation",
    "architecture", "service", "circuit_breaker", "circuit", "saga", "microservice", "pattern",
    "security", "secret", "auth", "sanitize", "injection", "rate_limit",
    "observability", "logging", "trace", "metric", "event",
  ],
  "knowledge": ["source", "graph", "dedup", "citation", "provenance", "summarize", "retrieve", "traversal", "path", "dag"],
  "meta": ["protocol", "attribution", "provenance", "constraint", "compliance"],
  "data": ["schema", "validation", "field", "record", "query", "partition", "stream", "event", "emit", "contract", "lineage", "catalog"],
  "evm": [
    "contract", "solidity", "gas", "transaction", "event", "emit", "indexed",
    "reentrancy", "checks_effects", "checks", "effects", "interaction", "storage", "state", "call",
    "access_control", "role", "modifier", "guard",
  ],
  "database": ["schema", "query", "index", "transaction", "replication"],
  "sql": ["query", "optimize", "index", "join", "filter"],
  "distributed": ["consensus", "replication", "partition", "shard", "message", "event", "idempotency", "quorum"],
  "ml": ["model", "prompt", "embedding", "metric", "fine_tune", "rag", "guardrail"],
  "networking": ["http", "cache", "api", "version", "oauth", "token", "timeout", "retry"],
  "compliance": ["audit", "log", "retention", "access", "rbac", "policy"],
  "crypto": ["signature", "key", "secret", "did", "verify", "keystore"],
  "auth": ["mfa", "totp", "fido2", "rbac", "role", "permission", "token", "session", "oauth", "sso", "credential", "password", "secret", "key", "rotate", "revoke", "scope", "claim", "jwt", "oidc", "saml", "zero_trust", "policy", "grant", "refresh", "access"],
  "perf": ["profile", "flame_graph", "cpu", "memory", "latency", "throughput", "benchmark", "load", "cache", "query", "optimize", "index", "jit", "gc", "bottleneck", "sampling", "heap", "trace", "budget"],
  "api": ["endpoint", "rest", "graphql", "pagination", "idempotency", "webhook", "versioning", "schema", "contract", "rate_limit", "authentication", "authorization", "status_code", "header", "payload", "cursor", "deprecation"],
  "game": ["entity", "component", "system", "loop", "physics", "render", "sprite", "collision", "state", "scene", "asset", "ecs", "tick", "interpolation"],
  "embedded": ["firmware", "rtos", "interrupt", "gpio", "uart", "i2c", "spi", "flash", "sensor", "watchdog", "ota", "power", "scheduler", "peripheral"],
  "mobile": ["lifecycle", "push", "notification", "offline", "sync", "navigation", "gesture", "permission", "bundle", "store", "keychain"],
  "platform": ["cluster", "node", "pod", "service", "ingress", "namespace", "quota", "autoscaler", "deploy", "rollout", "helm", "terraform"],
  "search": ["index", "query", "ranking", "embedding", "retrieval", "tokenize", "analyzer", "shard", "relevance", "score", "facet", "suggest"],
  "content": ["cms", "slug", "publish", "draft", "media", "transcode", "cdn", "cache", "seo", "schema", "webhook", "preview"],
  "protocol": ["frame", "handshake", "message", "packet", "state", "version", "negotiate", "ack", "retry", "timeout", "wire", "binary"],
  "collab": ["crdt", "ot", "presence", "cursor", "sync", "conflict", "merge", "operation", "session", "broadcast"],
  "devtools": ["cli", "ast", "plugin", "lsp", "lint", "format", "codegen", "build", "watch", "repl", "transform"],
  "finance": ["ledger", "transaction", "balance", "reconcile", "payment", "fraud", "currency", "settlement", "audit", "compliance"],
  "compiler": ["token", "parse", "ast", "type", "ir", "optimize", "codegen", "symbol", "scope", "emit", "ssa"],
  "product": ["flag", "experiment", "variant", "metric", "rollout", "cohort", "conversion", "funnel", "sample", "significance"],
  "safety": ["injection", "jailbreak", "policy", "guardrail", "red_team", "monitor", "audit", "classify", "filter", "prompt"],
  "dx": ["onboarding", "golden_path", "idp", "template", "catalog", "scaffold", "docs", "feedback", "metric", "cognitive"],
  "observability": ["trace", "metric", "log", "span", "sample", "alert", "slo", "dashboard", "otel", "cardinality", "budget"],
  "accessibility": ["aria", "wcag", "role", "focus", "keyboard", "screen_reader", "contrast", "label", "landmark", "tab"],
  "sysarch": ["pod", "node", "partition", "replica", "leader", "follower", "consumer", "producer", "vacuum", "index", "checkpoint", "replication", "cluster", "namespace", "volume", "topic", "offset", "lag"],
  "academic": ["gradient", "convergence", "epoch", "batch", "loss", "learning_rate", "consensus", "quorum", "term", "vote", "hash", "proof", "cipher", "key", "algorithm", "bound", "complexity"],
  "postmortem": ["incident", "outage", "rollback", "mitigation", "detection", "recovery", "runbook", "alert", "latency", "error_rate", "cascade", "circuit_breaker", "timeline", "rca"],
  "benchmark": ["throughput", "latency", "p99", "tps", "accuracy", "metric", "eval", "sample", "threshold", "baseline", "regression", "slo", "load", "rps"],
  "regulatory": ["compliance", "audit", "retention", "consent", "breach", "dsar", "phi", "pii", "control", "risk", "policy", "gdpr", "hipaa", "soc2", "pci", "iso"],
  "cicd": ["deploy", "pipeline", "artifact", "rollback", "canary", "blue_green", "build", "release", "migration", "gate", "scan", "terraform", "drift", "promotion"],
  "tuning": ["latency", "throughput", "buffer", "cache", "index", "pool", "gc", "memory", "cpu", "gpu", "query", "connection", "batch", "thread", "heap"],
};

function getDomainRoot(domain: string): string {
  return domain.split(".")[0] ?? "agent";
}

function tokenize(s: string): Set<string> {
  const normalized = s.toLowerCase().replace(/[^a-z0-9_\s]/g, " ").replace(/\s+/g, " ");
  return new Set(normalized.split(" ").filter(Boolean));
}

/** Returns true if the step action is high-specificity (concrete operation). */
function isSpecificAction(action: string): boolean {
  if (!action || typeof action !== "string") return false;
  const lower = action.trim().toLowerCase();
  if (LOW_SPECIFICITY_VERBS.has(lower)) return false;
  return HIGH_SPECIFICITY_PATTERN.test(lower) || /^[a-z]+_[a-z0-9_]+$/.test(lower);
}

/** Check if steps are mostly high-specificity (not all combine/merge/analyze). */
function stepsUseSpecificVerbs(steps: StepItem[]): boolean {
  const structured = steps.filter((s): s is StructuredStep => typeof s === "object" && s != null && "action" in s);
  if (structured.length === 0) return false;
  const specific = structured.filter((s) => isSpecificAction((s as StructuredStep).action));
  return specific.length >= Math.ceil(structured.length / 2);
}

/** Check interface has at least one non-generic input. */
function hasExplicitInputs(artifact: KBv24Artifact): boolean {
  const inputs = artifact.payload?.interface?.inputs ?? [];
  if (inputs.length === 0) return false;
  const names = inputs.map((i) => i.name?.toLowerCase().trim()).filter(Boolean);
  const hasNonGeneric = names.some((n) => !GENERIC_IO.has(n));
  return hasNonGeneric;
}

/** Check interface has at least one output. */
function hasExplicitOutputs(artifact: KBv24Artifact): boolean {
  const outputs = artifact.payload?.interface?.outputs ?? [];
  return outputs.length > 0;
}

/** Check each step has inputs and produces (traceability). */
function stepChainingValid(artifact: KBv24Artifact): boolean {
  const steps = artifact.payload?.inline_artifact?.steps ?? [];
  const iface = artifact.payload?.interface;
  const inputNames = new Set((iface?.inputs ?? []).map((i) => i.name));
  let available = new Set(inputNames);
  for (const s of steps) {
    if (typeof s !== "object" || s == null || !("inputs" in s)) continue;
    const step = s as StructuredStep;
    const inputs = Array.isArray(step.inputs) ? step.inputs : [];
    const produces = Array.isArray(step.produces) ? step.produces : [];
    if (inputs.length === 0 && available.size === 0) return false;
    for (const inp of inputs) {
      if (!available.has(inp)) return false;
    }
    for (const p of produces) available.add(p);
  }
  return true;
}

/** Check input/output names overlap domain keywords or domain segments. */
function hasDomainRelevantVars(artifact: KBv24Artifact): boolean {
  const domain = artifact.semantic?.domain ?? "";
  const root = getDomainRoot(domain);
  const keywords = DOMAIN_KEYWORDS[root] ?? DOMAIN_KEYWORDS.agent;
  const kwSet = new Set(keywords.map((k) => k.toLowerCase()));
  for (const segment of domain.split(".").filter(Boolean)) {
    const norm = segment.toLowerCase().replace(/-/g, "_");
    kwSet.add(norm);
    if (norm.includes("_")) kwSet.add(norm.replace(/_/g, ""));
  }
  const iface = artifact.payload?.interface;
  const names: string[] = [
    ...(iface?.inputs ?? []).map((i) => i.name),
    ...(iface?.outputs ?? []).map((o) => o.name),
  ].filter(Boolean);
  const steps = artifact.payload?.inline_artifact?.steps ?? [];
  for (const s of steps) {
    if (typeof s === "object" && s != null && "action" in s) {
      names.push((s as StructuredStep).action);
      names.push(...((s as StructuredStep).produces ?? []));
    }
  }
  const tokens = new Set<string>();
  for (const n of names) tokenize(n).forEach((t) => tokens.add(t));
  for (const kw of kwSet) {
    if (tokens.has(kw)) return true;
    for (const t of tokens) {
      if (t.includes(kw) || (kw.length >= 4 && t.includes(kw.replace(/_/g, "")))) return true;
    }
  }
  return false;
}

/** Sufficient step count for type (simplified epistemic_type): procedural 4+, evaluative 3+, declarative 2+. */
function sufficientStepCount(artifact: KBv24Artifact): boolean {
  const steps = artifact.payload?.inline_artifact?.steps ?? [];
  const n = steps.length;
  const ep = artifact.identity?.epistemic_type ?? "procedural";
  return (
    (ep === "procedural" && n >= 4) ||
    (ep === "evaluative" && n >= 3) ||
    (ep === "declarative" && n >= 2)
  );
}

export const PROCEDURAL_SPECIFICITY_MIN_SCORE = 6;

export interface ProceduralSpecificityScoreResult {
  score: number;
  max: number;
  breakdown: { specificVerbs: boolean; explicitInputs: boolean; explicitOutputs: boolean; stepChaining: boolean; domainVars: boolean; stepCount: boolean };
}

/**
 * Score artifact 0–8 for procedural specificity. Accept if >= PROCEDURAL_SPECIFICITY_MIN_SCORE.
 */
export function proceduralSpecificityScore(artifact: KBv24Artifact): ProceduralSpecificityScoreResult {
  const steps = artifact.payload?.inline_artifact?.steps ?? [];
  const breakdown = {
    specificVerbs: stepsUseSpecificVerbs(steps),
    explicitInputs: hasExplicitInputs(artifact),
    explicitOutputs: hasExplicitOutputs(artifact),
    stepChaining: stepChainingValid(artifact),
    domainVars: hasDomainRelevantVars(artifact),
    stepCount: sufficientStepCount(artifact),
  };
  let score = 0;
  if (breakdown.specificVerbs) score += 2;
  if (breakdown.explicitInputs) score += 1;
  if (breakdown.explicitOutputs) score += 1;
  if (breakdown.stepChaining) score += 1;
  if (breakdown.domainVars) score += 2;
  if (breakdown.stepCount) score += 1;
  return { score, max: 8, breakdown };
}

/** Returns true if artifact meets minimum procedural specificity (default 6/8). */
export function isProcedurallySpecific(artifact: KBv24Artifact, minScore: number = PROCEDURAL_SPECIFICITY_MIN_SCORE): boolean {
  return proceduralSpecificityScore(artifact).score >= minScore;
}
