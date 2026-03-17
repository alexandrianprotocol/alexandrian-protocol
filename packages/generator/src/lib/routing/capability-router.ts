/**
 * Capability router — classify a task string into one or more capability names with confidence scores.
 * Filter by score > ROUTER_MIN_CONFIDENCE to avoid activating irrelevant clusters.
 * Production: replace with embedding-based similarity to capability descriptions.
 */

import { getCapabilityNames } from "./capability-clusters.js";

export const ROUTER_MIN_CONFIDENCE = 0.4;

export interface RoutedCapability {
  capability: string;
  score: number;
}

/** Task text → capability names. Multiple matches allowed. */
const TASK_KEYWORDS: Record<string, string[]> = {
  Planning: ["plan", "planning", "goal", "task decomposition", "milestone", "backtrack", "schedule", "priority"],
  Reasoning: ["reasoning", "deduct", "infer", "hypothesis", "evidence", "contradiction", "scenario", "multi-step"],
  Memory: ["memory", "context", "retrieval", "summariz", "compression", "prioritization", "sliding window"],
  Tools: ["tool", "api", "workflow", "orchestration", "invocation", "chaining", "aggregation"],
  Evaluation: ["evaluate", "self-evaluation", "performance", "score", "criteria"],
  MultiAgent: ["multi-agent", "delegation", "sub-agent", "delegate"],
  Prompting: ["prompt", "structured output", "schema", "llm output"],
  Retrieval: ["retrieve", "search", "embedding", "ranking", "chunk", "citation", "rag"],
  Guardrails: ["guardrail", "validation", "safety", "self-reflection", "monitoring"],
  ErrorRecovery: ["error", "retry", "fallback", "circuit breaker", "degradation", "compensat"],
  Security: ["vulnerability", "sanitiz", "injection", "xss", "auth", "reentrancy", "solidity contract", "audit", "secure"],
  Architecture: ["microservice", "architecture", "distributed", "replication", "consensus", "partition", "saga", "design"],
  Testing: ["test", "unit test", "integration", "regression", "fuzz"],
  Observability: ["observability", "logging", "trace", "metric", "monitor", "debug"],
  DataSystems: ["sql", "query", "database", "schema", "index", "etl", "replication"],
  Streaming: ["stream", "event", "message queue", "kafka", "ordered events"],
  Compliance: ["compliance", "audit", "retention", "rbac", "access control", "policy"],
  Crypto: ["signature", "verify", "did", "keystore", "key management", "crypto"],
  EVM: ["solidity", "contract", "evm", "reentrancy", "checks-effects", "gas", "smart contract", "settlement"],
  KnowledgeGraphs: ["knowledge graph", "deduplication", "traversal", "attribution", "provenance"],
  ML: ["model", "metric", "prompt version", "fine-tun", "evaluation", "forecast", "simulation", "research", "hypothesis"],
  Networking: ["http", "cache", "api version", "oauth", "token", "timeout"],
  DevOps: ["ci/cd", "pipeline", "deploy", "kubernetes", "container", "infrastructure as code", "rollback", "incident"],
  Documentation: ["documentation", "adr", "runbook", "api doc", "onboarding", "specification"],
  UX: ["ux", "ui", "accessibility", "wcag", "design system", "responsive", "design token"],
  CodeQuality: ["code quality", "refactor", "lint", "static analysis", "code review", "complexity", "dead code"],
  AgentOrchestration: ["multi-agent", "orchestration", "capability routing", "tool selection", "agent memory", "hierarchical plan"],
  DeepReasoning: ["tradeoff", "causal", "root cause", "decision tree", "optimization", "reliability", "risk analysis", "adversarial", "hypothesis", "algorithm", "complex system", "evolution", "migration", "systems thinking"],
  /** Web application tasks → attach Web Engineering KB bundle */
  WebEngineering: ["web application", "web app", "web platform", "design a web", "build a web", "saas", "full-stack", "fullstack", "web page", "rest api", "graphql api", "api service", "backend service", "frontend", "user interface", "dashboard ui", "responsive layout", "single page", "spa"],
  Frontend: ["frontend", "user interface", "ui ", "react", "vue", "angular", "dashboard", "web page", "responsive", "component", "design system", "accessibility", "wcag", "layout", "typography", "css"],
  Backend: ["backend", "rest api", "graphql", "api service", "server", "microservice", "api design", "service layer", "database layer"],
  FrontendDeep: ["layout", "spacing", "typography", "css architecture", "responsive design", "accessibility", "component architecture", "browser rendering", "frontend performance", "micro-interaction", "state management", "frontend testing"],
  FailureDebug: ["debug", "diagnos", "troubleshoot", "memory leak", "stack trace", "race condition", "network partition", "queue backlog", "latency spike", "bottleneck", "deployment failure", "pipeline error"],
  Verification: ["verify", "validate", "check", "audit", "compliance", "coverage", "benchmark", "security audit"],
  Invariant: ["circuit breaker", "idempotent", "backpressure", "graceful degradation", "loose coupling", "observability", "retry", "tracing"],
  Antipattern: ["anti-pattern", "antipattern", "god object", "tight coupling", "chatty", "N+1", "data leakage", "hardcoded secret", "prop drilling"],
  SaaSBlueprint: ["saas", "full-stack", "monorepo", "repository structure", "runbook", "observability", "api design", "multi-tenant", "feature flag", "cost observability", "supply chain"],
};

const CAP_NAMES = getCapabilityNames();

/** Score 0–1 from keyword match: more / longer matches → higher. */
function keywordScore(task: string, keywords: string[]): number {
  const t = (task ?? "").toLowerCase();
  let best = 0;
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    if (!t.includes(k)) continue;
    const strength = 0.3 + 0.7 * Math.min(1, k.length / 12);
    if (strength > best) best = strength;
  }
  return best;
}

/**
 * Classify a task into capabilities with confidence scores.
 * Keep only score > ROUTER_MIN_CONFIDENCE; sort by score descending.
 */
export function routeTaskToCapabilities(task: string, minScore: number = ROUTER_MIN_CONFIDENCE): RoutedCapability[] {
  const t = (task ?? "").trim();
  const out: RoutedCapability[] = [];
  for (const cap of CAP_NAMES) {
    const keywords = TASK_KEYWORDS[cap as keyof typeof TASK_KEYWORDS];
    if (!keywords) continue;
    const score = keywordScore(t, keywords);
    if (score > minScore) out.push({ capability: cap, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/**
 * Legacy: return only capability names (no scores). Prefer routeTaskToCapabilities for ranking.
 */
export function classifyTaskToCapabilities(task: string): string[] {
  return routeTaskToCapabilities(task).map((r) => r.capability);
}

/**
 * Decompose a task into subtasks for per-subtask routing (improves accuracy for multi-part tasks).
 * Simple heuristic: split on " and ", " then ", " with ", comma, or period.
 * Production: use LLM or structured decomposition.
 */
export function decomposeTask(task: string): string[] {
  const t = (task ?? "").trim();
  if (!t) return [];
  const parts = t
    .split(/\s+and\s+|\s+then\s+|\s+with\s+|,\s*|\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
  return parts.length > 0 ? parts : [t];
}
