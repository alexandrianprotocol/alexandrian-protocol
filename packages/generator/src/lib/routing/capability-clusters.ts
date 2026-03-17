/**
 * Capability clustering for routing — group KB artifacts into capability categories
 * so retrieval can be limited to a cluster (e.g. 40–120 clusters of dozens/hundreds of KBs)
 * instead of searching 10k+ at once. Reduces selection overload for LLMs.
 *
 * Flow: Task → Capability Router → Relevant capability groups → Retrieve within cluster → Shortlist (5–8) → Execution plan.
 */

import type { QueueRecord } from "../core/builder.js";

/** Capability name → domain prefixes that belong to this capability (prefix match, case-insensitive). */
export const CAPABILITY_CLUSTERS: Record<string, string[]> = {
  Planning: ["agent.planning"],
  Reasoning: ["agent.reasoning"],
  Memory: ["agent.memory"],
  Tools: ["agent.tools", "agent.execution"],
  Evaluation: ["agent.evaluation"],
  MultiAgent: ["agent.multi_agent"],
  Prompting: ["agent.prompting", "ai.prompting"],
  Retrieval: ["ai.retrieval"],
  Guardrails: ["ai.guardrails"],
  ErrorRecovery: ["agent.error_recovery"],
  Security: ["software.security", "evm.solidity.security", "compliance.access_control", "crypto.", "universal.security"],
  Architecture: ["software.architecture", "distributed.systems", "project.structure", "universal.architecture"],
  Testing: ["software.testing", "universal.testing"],
  Observability: ["software.observability", "software.architecture.service_mesh", "universal.observability", "universal.performance"],
  DataSystems: ["data.", "database.", "sql.", "universal.data"],
  Streaming: ["data.streaming", "distributed.systems.messaging"],
  Compliance: ["compliance."],
  Crypto: ["crypto.", "evm.solidity.access_control"],
  EVM: ["evm.solidity"],
  KnowledgeGraphs: ["knowledge.graphs", "meta.protocol", "universal.knowledge"],
  ML: ["ml.", "research.", "algorithm.", "universal.research_repro"],
  Networking: ["networking."],
  DevOps: ["devops.", "universal.devops"],
  Documentation: ["documentation.", "universal.documentation"],
  UX: ["ux.ui", "universal.ux_ui"],
  CodeQuality: ["software.quality", "software.codebase", "universal.code_quality"],
  AgentOrchestration: ["agent.orchestration", "agent.routing", "agent.workflow", "agent.discovery"],
  /** Universal + Deep layers (cross-cutting and reasoning). */
  DeepReasoning: ["deep."],
  /** Web application development — Task → KB attachment (core + frontend + backend + UX). */
  WebEngineering: ["web."],
  /** Frontend engineering (web UI, components, UX). */
  Frontend: ["web.frontend", "web.ux"],
  /** Backend / API services. */
  Backend: ["web.backend"],
  /** Frontend deep detail layer (layout, typography, CSS, a11y, rendering, etc.). */
  FrontendDeep: ["frontend."],
  /** Failure mode & debugging knowledge. */
  FailureDebug: ["failure_debug."],
  /** Verification & evaluation (agent checks its work). */
  Verification: ["verification."],
  /** High-value engineering invariants (standards + pattern references). */
  Invariant: ["invariant."],
  /** Anti-pattern prevention. */
  Antipattern: ["antipattern."],
  /** Production SaaS & full-stack blueprint (repo, docs, observability, API, security, multi-tenant). */
  SaaSBlueprint: ["saas."],
};

const CAPABILITY_NAMES = Object.keys(CAPABILITY_CLUSTERS);

/** Normalize domain for prefix matching. */
function norm(domain: string): string {
  return (domain ?? "").trim().toLowerCase();
}

/**
 * Return capability names that this domain belongs to (a domain can be in multiple clusters).
 */
export function getCapabilitiesForDomain(domain: string): string[] {
  const d = norm(domain);
  if (!d) return [];
  const out: string[] = [];
  for (const [cap, prefixes] of Object.entries(CAPABILITY_CLUSTERS)) {
    for (const p of prefixes) {
      const prefix = norm(p);
      if (d === prefix || d.startsWith(prefix + ".")) {
        out.push(cap);
        break;
      }
    }
  }
  return out;
}

/**
 * Build capability index: for each capability, list of QueueRecords in that cluster.
 * Use this to restrict retrieval to a cluster (e.g. vector search only within cluster).
 */
export function buildCapabilityIndex(records: QueueRecord[]): Map<string, QueueRecord[]> {
  const index = new Map<string, QueueRecord[]>();
  for (const cap of CAPABILITY_NAMES) {
    index.set(cap, []);
  }
  for (const r of records) {
    const domain = r.domain ?? r.artifact?.semantic?.domain ?? "";
    const caps = getCapabilitiesForDomain(domain);
    for (const c of caps) {
      const list = index.get(c) ?? [];
      list.push(r);
      index.set(c, list);
    }
  }
  return index;
}

/**
 * Get records that belong to any of the given capabilities (union).
 * Use after routing: task → [Security, EVM] → getRecordsForCapabilities(index, ["Security", "EVM"]).
 */
export function getRecordsForCapabilities(
  index: Map<string, QueueRecord[]>,
  capabilities: string[]
): QueueRecord[] {
  const seen = new Set<string>();
  const out: QueueRecord[] = [];
  for (const cap of capabilities) {
    const list = index.get(cap) ?? [];
    for (const r of list) {
      if (!seen.has(r.kbHash)) {
        seen.add(r.kbHash);
        out.push(r);
      }
    }
  }
  return out;
}

/** Return list of capability names (for router output validation). */
export function getCapabilityNames(): string[] {
  return [...CAPABILITY_NAMES];
}
