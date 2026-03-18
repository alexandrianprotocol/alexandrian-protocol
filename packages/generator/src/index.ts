/**
 * Alexandrian KB Generator — CLI Entry Point (KBv2.4 / v2.6)
 *
 * Usage:
 *   node dist/index.js [--mode seeds|derived|expansion|ai-seeds|all] [--count <n>] [--target <n>]
 *
 * Options:
 *   --mode   seeds      Generate 100 super-seed KBs only (no parents, no API)
 *            derived    Generate derived KBs from factories (requires seeds in staging first)
 *            expansion  Generate derived KBs via expansion layer (seeds + L1 → more children)
 *            ai-seeds   Generate seed KBs via OpenAI from specs (requires OPENAI_API_KEY in .env)
 *            repair     Enrich existing seeds (title/tags/validation + normalize + expand procedures); no wipe
 *            repair-kb  Fix summary length, metadata, semantic on all staging KBs; validate and rewrite
 *            all        Generate seeds, then derived, then expansion (default)
 *
 *   --count  <n>       Hard cap on total KBs written per run (default: 10000)
 *   --target <n>       Target total for expansion phase; stop when queue size >= target (default: 25000)
 *
 * Seed set (ai-seeds mode): --high-impact | --seeds-combined | --universal | --deep | --web | --frontend-deep | --all-layers
 *   --universal        Use Universal Engineering layer only (~240 seeds)
 *   --deep             Use Deep Engineering Reasoning layer only (~120 seeds)
 *   --web              Use Web Engineering bundle only (~90 seeds: core web + frontend + backend + UX + docs + DevOps)
 *   --frontend-deep    Use Frontend Deep Detail layer only (~120 seeds: layout, typography, CSS, responsive, a11y, components, rendering, perf, micro-interactions, state, observability, testing)
 *   --failure-debug    Failure/debug layer (~30 seeds: software, distributed, performance, frontend, DevOps debugging)
 *   --verification     Verification layer (~20 seeds: architecture, security, performance, code quality verification)
 *   --invariants       High-value invariant seeds (Standard + References + Verification; ~25 seeds)
 *   --antipatterns     Anti-pattern seeds (~20 seeds: god object, chatty services, N+1, data leakage, etc.)
 *   --blueprint        Production SaaS & full-stack blueprint seeds (~40: repo structure, docs, API, observability, security, multi-tenant, feature flags, cost observability)
 *   --all-layers       Use all seed sets including blueprint (~6750+ specs)
 *
 *   --mode execution-plan [--task "..."]  Print Execution Planning Graph (EPG) node for task (steps, skills, KB clusters)
 *   --mode upgrade-seeds [--count N] [--concurrency 5] [--model gpt-4o] [--dry-run]  AI-normalize pending seeds → refined | marginal | failed
 *   --mode grade-report  Quality distribution across refined/marginal/failed + diagnosis + one-number go/no-go
 *   --mode repair-marginal  Re-score marginal artifacts; promote standard/anchor to staging/refined
 *   --mode validate  Two-stage quality gate: (1) pending/ → validateArtifact → pre-refined/ | failed/; (2) refined/ → validateUpgradedEntry → validated/ | failed/ [--dry-run]
 *   --mode audit-kb  Audit staging/refined, marginal, failed for duplicate procedures, missing verification/references
 *   --mode analyze-artifacts  Scan staging/pending seeds to find which should reference IPFS artifacts; report by domain and suggested artifact
 *   --mode validate-artifacts  Validate JSON files in artifacts/ against the Universal Artifact Schema
 *   --mode report-hubs  List artifacts that exceed soft child limit (potential DAG hubs for review)
 *   --mode export-concept-taxonomy  Write concept taxonomy and relationships to concept-taxonomy.json
 *   --mode generate-documentation  For each KB in staging/pending, create documentation artifact in staging/documentation
 *   --mode retrieve [--task "..."] [--top-k 20] [--top-artifacts 15]  Knowledge Retrieval & Ranking: output relevant KBs, artifacts, concepts for a task
 *   --mode export-ontology [--split]  Write Knowledge Ontology (domains, concepts, relationships, techniques, invariants) to ontology.json or ontology/
 *
 * Output:
 *   packages/generator/staging/pending/<kbHash>.json
 */

import dotenv from "dotenv";
import { readFileSync, readdirSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirnameEsm = dirname(fileURLToPath(import.meta.url));
// Load .env from package dir, then from monorepo root (so OPENAI_API_KEY in root works)
dotenv.config();
dotenv.config({ path: join(__dirnameEsm, "..", "..", "..", ".env") });
import { loadQueue, writeRecord, buildDedupSet, buildContentFingerprintSet } from "./lib/core/queue.js";
import { buildRecord, contentFingerprint } from "./lib/core/builder.js";
import type { QueueRecord } from "./lib/core/builder.js";
import { derivedEnvelopeToArtifact } from "./lib/envelope-to-artifact.js";
import { selectParents } from "./lib/selector.js";
import {
  buildExpansionEnvelope,
  expansionKey,
  selectTopPartnersForExpansion,
  isExpandable,
  getDepth,
  getAllowedTransformations,
  TARGET_TOTAL,
  MAX_EXPANSION_PASSES,
} from "./lib/expansion.js";
import { getDomainPairPolicy } from "./config/domain-compatibility.js";
import type { DerivationTransformation } from "./types/artifact.js";
import { generateSeedFromSpec, sampleEpistemicType } from "./lib/ai-generator.js";
import type { SeedSpec } from "./lib/ai-generator.js";
import { HIGH_IMPACT_SEED_SPECS } from "./lib/seeds/high-impact-seeds.js";
import { UNIVERSAL_ENGINEERING_SEED_SPECS } from "./lib/seeds/universal-engineering-seeds.js";
import { DEEP_REASONING_SEED_SPECS } from "./lib/seeds/deep-reasoning-seeds.js";
import { WEB_ENGINEERING_SEED_SPECS } from "./lib/seeds/web-engineering-seeds.js";
import { FRONTEND_DEEP_SEED_SPECS } from "./lib/seeds/frontend-deep-seeds.js";
import { FAILURE_DEBUG_SEED_SPECS } from "./lib/seeds/failure-debug-seeds.js";
import { VERIFICATION_SEED_SPECS } from "./lib/seeds/verification-seeds.js";
import { INVARIANT_SEED_SPECS } from "./lib/seeds/invariant-seeds.js";
import { ANTIPATTERN_SEED_SPECS } from "./lib/seeds/antipattern-seeds.js";
import { SAAS_FULLSTACK_BLUEPRINT_SEED_SPECS } from "./lib/seeds/saas-fullstack-blueprint-seeds.js";
import { DATABASE_ENGINEERING_SEED_SPECS } from "./lib/seeds/database-engineering-seeds.js";
import { ML_MLOPS_SEED_SPECS } from "./lib/seeds/ml-mlops-seeds.js";
import { WEB3_ONCHAIN_SEED_SPECS } from "./lib/seeds/web3-onchain-seeds.js";
import { COLLABORATIVE_REALTIME_SEED_SPECS } from "./lib/seeds/collaborative-realtime-seeds.js";
import { DEVELOPER_TOOLING_SEED_SPECS } from "./lib/seeds/developer-tooling-seeds.js";
import { FINANCIAL_SYSTEMS_SEED_SPECS } from "./lib/seeds/financial-systems-seeds.js";
import { COMPILER_LANGUAGE_TOOLS_SEED_SPECS } from "./lib/seeds/compiler-language-tools-seeds.js";
import { PRODUCT_EXPERIMENTATION_SEED_SPECS } from "./lib/seeds/product-experimentation-seeds.js";
import { AI_SAFETY_RED_TEAMING_SEED_SPECS } from "./lib/seeds/ai-safety-red-teaming-seeds.js";
import { MOBILE_ENGINEERING_SEED_SPECS } from "./lib/seeds/mobile-engineering-seeds.js";
import { SEARCH_IR_SEED_SPECS } from "./lib/seeds/search-information-retrieval-seeds.js";
import { PLATFORM_INFRASTRUCTURE_SEED_SPECS } from "./lib/seeds/platform-infrastructure-seeds.js";
import { DATA_MESH_LAKEHOUSE_SEED_SPECS } from "./lib/seeds/data-mesh-lakehouse-seeds.js";
import { PROTOCOL_NETWORK_DESIGN_SEED_SPECS } from "./lib/seeds/protocol-network-design-seeds.js";
import { CONTENT_CMS_MEDIA_SEED_SPECS } from "./lib/seeds/content-cms-media-seeds.js";
import { GAME_DEVELOPMENT_SEED_SPECS } from "./lib/seeds/game-development-seeds.js";
import { EMBEDDED_IOT_SEED_SPECS } from "./lib/seeds/embedded-iot-seeds.js";
import { DEVELOPER_EXPERIENCE_SEED_SPECS } from "./lib/seeds/developer-experience-seeds.js";
import { KNOWLEDGE_GRAPH_SEMANTIC_SEED_SPECS } from "./lib/seeds/knowledge-graph-semantic-seeds.js";
import { RAG_SYSTEMS_SEED_SPECS } from "./lib/seeds/rag-systems-seeds.js";
import { CYBERSECURITY_SEED_SPECS } from "./lib/seeds/cybersecurity-seeds.js";
import { CRYPTOGRAPHY_APPLIED_SEED_SPECS } from "./lib/seeds/cryptography-applied-seeds.js";
import { ACCESSIBILITY_ENGINEERING_SEED_SPECS } from "./lib/seeds/accessibility-engineering-seeds.js";
import { OBSERVABILITY_TELEMETRY_SEED_SPECS } from "./lib/seeds/observability-telemetry-seeds.js";
import { AUTH_ACCESS_CONTROL_SEED_SPECS } from "./lib/seeds/auth-access-control-seeds.js";
import { PERFORMANCE_ENGINEERING_SEED_SPECS } from "./lib/seeds/performance-engineering-seeds.js";
import { KNOWLEDGE_SYSTEMS_SEED_SPECS } from "./lib/seeds/knowledge-systems-seeds.js";
import { API_DESIGN_PATTERNS_SEED_SPECS } from "./lib/seeds/api-design-patterns-seeds.js";
import { DISTRIBUTED_SYSTEMS_PATTERNS_SEED_SPECS } from "./lib/seeds/distributed-systems-patterns-seeds.js";
import { AI_AGENT_TASK_PLANNING_SEED_SPECS } from "./lib/seeds/ai-agent-task-planning-seeds.js";
import { SOFTWARE_ENGINEERING_EXTENDED_SEED_SPECS } from "./lib/seeds/software-engineering-extended-seeds.js";
import { OPEN_SOURCE_SYSARCH_SEED_SPECS } from "./lib/seeds/open-source-sysarch-seeds.js";
import { ACADEMIC_ALGORITHMS_SEED_SPECS } from "./lib/seeds/academic-algorithms-seeds.js";
import { POSTMORTEM_RUNBOOK_SEED_SPECS } from "./lib/seeds/postmortem-runbook-seeds.js";
import { BENCHMARKING_EVALUATION_SEED_SPECS } from "./lib/seeds/benchmarking-evaluation-seeds.js";
import { REGULATORY_COMPLIANCE_SEED_SPECS } from "./lib/seeds/regulatory-compliance-seeds.js";
import { CICD_PIPELINE_SEED_SPECS } from "./lib/seeds/cicd-pipeline-seeds.js";
import { PERFORMANCE_TUNING_GUIDES_SEED_SPECS } from "./lib/seeds/performance-tuning-guides-seeds.js";
import { getExecutionPlansForDomain, EXECUTION_PLAN_NODES } from "./lib/execution-planning-graph.js";
import { runUpgradeSeedsPipeline } from "./lib/pipeline/upgrade-seeds-pipeline.js";
import { runGradeReport } from "./lib/pipeline/grade-report.js";
import { auditRefinedKb, type AuditResult } from "./lib/audit-kb.js";
import { QUALITY_CONFIG } from "./lib/core/quality-config.js";
import { analyzeSeedsForArtifacts, printArtifactAnalysisSummary } from "./lib/analyze-seeds-for-artifacts.js";
import { validateUniversalArtifact } from "./lib/artifacts/universal-artifact-schema.js";
import { getHubs, MAX_CHILDREN_SOFT, getDependencyWarnings } from "./lib/dag-monitoring.js";
import { CONCEPT_TAXONOMY, CONCEPT_RELATIONSHIPS, CONCEPT_DOMAINS } from "./lib/ontology/concept-taxonomy.js";
import { createDocumentationArtifactFromKb } from "./lib/artifacts/documentation-artifact.js";
import { retrieve } from "./lib/routing/knowledge-retrieval-engine.js";
import { buildKnowledgeOntology, validateOntology } from "./lib/ontology/knowledge-ontology.js";
import { titleTooSimilarInDomain } from "./lib/title-similarity.js";
import { runRepairPass } from "./lib/repair/repair-seeds.js";
import { expandProcedure, isWeakProcedure } from "./lib/repair/procedure-expander.js";
import { repairKB } from "./lib/repair/kbRepair.js";
import { seedQualityReasons, seedQualityScore, SEED_QUALITY_MIN_SCORE, validateStepInterfaceConsistency } from "./lib/ai-seed-quality.js";
import { validateArtifact } from "./lib/core/validator.js";
import { validateUpgradedEntry } from "./lib/upgraded-kb-entry.js";
import { isProcedurallySpecific, proceduralSpecificityScore, PROCEDURAL_SPECIFICITY_MIN_SCORE } from "./lib/procedural-specificity.js";
import { buildTriangleRegistry, isDuplicateTriangle, addTriangleToRegistry } from "./lib/knowledge-triangle.js";
import { SUPER_SEED_TEMPLATES } from "./templates/super-seeds.js";
import { SEED_TEMPLATES } from "./templates/seeds.js";
import { DERIVED_FACTORIES } from "./templates/derived.js";
import { buildCapabilityIndex, getCapabilityNames } from "./lib/routing/capability-clusters.js";
import {
  decomposeTask,
  routeTaskToCapabilities,
  ROUTER_MIN_CONFIDENCE,
} from "./lib/routing/capability-router.js";
import {
  getRecordsForRoutedCapabilities,
  buildNeighborMap,
  expandWithGraphNeighbors,
  getProceduralQualityScore,
  buildExecutionPlanOrder,
} from "./lib/routing/capability-routing-pipeline.js";

/** Enriched capability index entry for runtime ranking without loading full artifact. */
export interface CapabilityIndexEntry {
  kbHash: string;
  domain: string;
  title: string;
  proceduralScore: number;
  stepCount: number;
  tags: string[];
  inputs: string[];
  outputs: string[];
}

function toCapabilityIndexEntry(r: QueueRecord): CapabilityIndexEntry {
  const art = r.artifact;
  const spec = proceduralSpecificityScore(art);
  const steps = art?.payload?.inline_artifact?.steps ?? [];
  return {
    kbHash: r.kbHash,
    domain: r.domain ?? art?.semantic?.domain ?? "",
    title: art?.identity?.title ?? "",
    proceduralScore: spec.score,
    stepCount: Array.isArray(steps) ? steps.length : 0,
    tags: art?.semantic?.tags ?? [],
    inputs: (art?.payload?.interface?.inputs ?? []).map((i) => (i?.name ?? "").trim()).filter(Boolean),
    outputs: (art?.payload?.interface?.outputs ?? []).map((o) => (o?.name ?? "").trim()).filter(Boolean),
  };
}

/** Canonical seeds: 100 super-seeds + benchmark-targeted engineering.* seeds from SEED_TEMPLATES. */
const ALL_SEED_TEMPLATES = [...SUPER_SEED_TEMPLATES, ...SEED_TEMPLATES];

/** Specs for AI-generated seeds (used when --mode ai-seeds). ~86: every concept uses (Example + Decision rule + Anti-example) for stronger procedural generation. */
const AI_SEED_SPECS: SeedSpec[] = [
  // ── Planning (6) ───────────────────────────────────────────────────────────
  { domain: "agent.planning.goal_definition", title: "Goal Definition and Validation", concept: "State objectives and measurable success criteria before acting. Example: goal \"implement auth\" → success criteria [login <200ms, token refresh works, 2FA optional]; validate each is testable. Decision rule: one verb per goal; each criterion is measurable or falsifiable. Anti-example: vague \"improve the system\" with no criteria." },
  { domain: "agent.planning.task_decomposition", title: "Task Decomposition Strategies", concept: "Split a goal into ordered subtasks with explicit dependencies. Example: \"ship feature\" → [design API, write tests, implement, deploy]; tests depend on API. Decision rule: list subtasks; draw dependencies; order by dependency. Anti-example: flat task list with no dependencies or order." },
  { domain: "agent.planning.hierarchical", title: "Hierarchical Planning", concept: "Plan at coarse then fine levels; refine only when executing. Example: phase 1 \"gather\" → [retrieve, parse]; phase 2 \"decide\" → [score, select]; expand phase 2 when phase 1 done. Decision rule: define phases; expand next phase when current completes. Anti-example: single-level plan with no phases." },
  { domain: "agent.planning.dependency_graph", title: "Dependency Graph Planning", concept: "Build a DAG of tasks and run in topological order. Example: A→C, B→C, C→D; run A and B in parallel, then C, then D. Decision rule: build graph; topo-sort; execute by level. Anti-example: linear sequence when tasks could be parallel." },
  { domain: "agent.planning.parallel_execution", title: "Parallel Task Execution", concept: "Run independent subtasks concurrently when safe. Example: subtasks [fetch user, fetch config, fetch schema] share no state → run in parallel; merge results. Decision rule: identify independents; run concurrently; sync at join. Anti-example: running independent tasks sequentially." },
  { domain: "agent.planning.constraint_based", title: "Constraint-Based Planning", concept: "Filter and rank plans by hard then soft constraints. Example: hard [budget ≤100, deadline Friday]; soft [prefer cache]; reject plans violating hard; rank by soft. Decision rule: enumerate constraints; filter by hard; rank by soft. Anti-example: optimizing without stating constraints." },
  // ── Reasoning (6) ───────────────────────────────────────────────────────────
  { domain: "agent.reasoning.deductive", title: "Deductive Reasoning", concept: "Apply a general rule to a specific case to get a certain conclusion. Example: rule \"all X are Y\"; case \"A is X\" → conclude \"A is Y\". Decision rule: state rule; match case; derive conclusion. Anti-example: concluding without a stated rule or matching case." },
  { domain: "agent.reasoning.inductive", title: "Inductive Reasoning", concept: "Generalize from observed examples to a hypothesis. Example: examples [A is Y, B is Y, C is Y] → hypothesis \"all X are Y\"; state confidence. Decision rule: collect examples; infer pattern; state scope and confidence. Anti-example: one example → universal claim with no confidence." },
  { domain: "agent.reasoning.abductive", title: "Abductive Reasoning", concept: "Infer the best explanation for observed evidence. Example: evidence \"wet grass\"; hypotheses [rain, sprinkler, dew]; rank by likelihood and pick best. Decision rule: state evidence; generate hypotheses; rank by fit; choose best. Anti-example: accepting first explanation without comparing alternatives." },
  { domain: "agent.reasoning.multi_step", title: "Multi-Step Reasoning Chains", concept: "Chain intermediate conclusions with labeled intermediate states. Example: premise A → step1 (state S1) → step2 (state S2) → conclusion C; each hop is a named inference. Decision rule: label each intermediate state; ensure step N+1 consumes step N output. Anti-example: opaque \"analyze then conclude\" with no named intermediate states." },
  { domain: "agent.reasoning.decision_trees", title: "Decision Tree Evaluation", concept: "Evaluate a tree of conditions to choose one branch. Example: root \"user logged in?\" → yes [role admin? → action A / else action B], no → action C; traverse one path. Decision rule: define conditions at each node; one outcome per leaf. Anti-example: ad-hoc branching with no tree structure." },
  { domain: "agent.reasoning.uncertainty", title: "Uncertainty Handling and Confidence Estimation", concept: "Attach and propagate confidence so downstream steps know reliability. Example: source A confidence 0.9, source B 0.6 → combined claim with propagated score (e.g. min or product). Decision rule: assign confidence per source; define propagation rule; attach to output. Anti-example: stating a claim with no confidence or source." },
  // ── Memory & context (5) ───────────────────────────────────────────────────
  { domain: "agent.memory.context_compression", title: "Context Compression", concept: "Shrink context while keeping task-critical information. Example: 10 docs → extract [entities, claims, constraints] → 1 summary; preserve fields needed for downstream. Decision rule: define preserved fields; extract then compress; verify retention. Anti-example: truncating by length only and dropping key facts." },
  { domain: "agent.memory.prioritization", title: "Memory Prioritization", concept: "Allocate limited context by budget. Example: token budget 20% system prompt, 50% retrieval, 30% conversation history; rank by recency and relevance; evict lowest score. Decision rule: define budget per category; score then trim. Anti-example: keeping \"most important\" without a numeric budget or eviction rule." },
  { domain: "agent.memory.long_term_retrieval", title: "Long-Term Memory Retrieval", concept: "Query persistent store and bind results to the current task. Example: task \"continue last design\" → query by user_id + type=design → load last N; bind to working context. Decision rule: index by key (user, type, time); query with filters; bind to context. Anti-example: no persistence or query; treating each session as stateless." },
  { domain: "agent.memory.conversation_state", title: "Conversation State Tracking", concept: "Keep dialogue state and resolve references across turns. Example: user \"make it blue\" → resolve \"it\" to last mentioned object; update state { selected: id, color: blue }. Decision rule: track entities and last referent; resolve pronouns; update state each turn. Anti-example: answering without resolving \"it\" or \"that\"." },
  { domain: "agent.memory.knowledge_summarization", title: "Knowledge Summarization", concept: "Reduce a long input to a short summary that preserves specified aspects. Example: input 5-paragraph doc → output 3-bullet summary preserving key claims, evidence, and constraints. Decision rule: define preserved fields (claims, evidence, constraints); extract then compress. Anti-example: generic \"summarize the text\" with no preservation criteria." },
  // ── Tool use & execution (6) ────────────────────────────────────────────────
  { domain: "agent.tools.discovery", title: "Tool Discovery and Selection", concept: "List available tools and pick one that matches the task schema. Example: task needs (url → html); tools [fetch(url), scrape(selector)]; fetch matches → select fetch. Decision rule: get task input/output; compare to each tool schema; pick best match. Anti-example: picking by name or order instead of schema fit." },
  { domain: "agent.tools.invocation", title: "Tool Invocation Protocols", concept: "Call a tool with validated inputs and handle success or error. Example: tool run(code, lang); validate code non-empty, lang in allowlist; call; on error parse message and retry or fail. Decision rule: validate inputs; call; parse response; handle error path. Anti-example: calling with raw user input and no error handling." },
  { domain: "agent.tools.output_validation", title: "Tool Output Validation", concept: "Check tool output against schema and sanitize before use. Example: tool returns JSON; validate shape and types; strip unknown fields; reject if required field missing. Decision rule: define output schema; validate; sanitize; reject or coerce. Anti-example: trusting raw tool output in downstream steps." },
  { domain: "agent.execution.api_patterns", title: "API Interaction Patterns", concept: "Call external APIs with timeouts, retries, and structured error handling. Example: GET /users with timeout 5s, retry 2x on 5xx; on success parse JSON; on failure map to internal error. Decision rule: set timeout and retry policy; parse response; map errors. Anti-example: no timeout or retry; unhandled 5xx." },
  { domain: "agent.execution.workflow_orchestration", title: "Workflow Orchestration", concept: "Run a fixed sequence of steps with clear dataflow and error paths. Example: step1 call API → step2 write to DB → step3 update cache; on step2 failure run rollback and emit failure event. Decision rule: define steps, inputs/outputs per step, and error path per step. Anti-example: \"coordinate workflows\" without naming steps or failure handling." },
  // ── Retrieval (4) ───────────────────────────────────────────────────────────
  { domain: "ai.retrieval.semantic_search", title: "Semantic Search and Embedding Retrieval", concept: "Retrieve by meaning via embeddings and similarity. Example: query \"auth best practices\" → embed query; embed corpus chunks; return top-k by cosine similarity. Decision rule: embed query and candidates; score similarity; return ranked list. Anti-example: keyword-only search when meaning differs from wording." },
  { domain: "ai.retrieval.ranking", title: "Retrieval Ranking Strategies", concept: "Rank retrieved candidates by relevance, recency, or utility. Example: 20 candidates → score by [relevance 0.8, recency 0.2]; sort; take top 5. Decision rule: define score (relevance, recency, diversity); sort; truncate. Anti-example: returning all results unordered or by single naive score." },
  { domain: "knowledge.graphs.deduplication", title: "Knowledge Deduplication", concept: "Find and merge duplicate or near-duplicate knowledge. Example: two nodes \"reentrancy guard\" and \"reentrancy protection\" → same concept; merge into one, keep one canonical form. Decision rule: define similarity (embedding or key); cluster; pick canonical per cluster. Anti-example: keeping duplicate nodes that inflate the graph." },
  { domain: "knowledge.graphs.traversal", title: "Knowledge Graph Traversal and Path Finding", concept: "Traverse a KB DAG to find shortest reasoning path between two concepts. Example: from \"goal\" to \"tool_invocation\" → path [goal, task_decomposition, tool_discovery, tool_invocation]; return path. Decision rule: build or load DAG; run BFS/shortest path; return edge list. Anti-example: random walk or no path when one exists." },
  { domain: "ai.retrieval.context_filtering", title: "Context Selection and Filtering", concept: "Select and filter retrieved items to fit context window. Example: 50 chunks, window 10 → score by relevance + diversity; pick 10 that fit and maximize coverage. Decision rule: score; apply diversity; fill window; respect token limit. Anti-example: concat until full, dropping relevance or diversity." },
  // ── Reliability & guardrails (5) ───────────────────────────────────────────
  { domain: "agent.error_recovery.detection", title: "Error Detection and Recovery", concept: "Detect failure and choose retry, fallback, or escalation. Example: API call fails → retry 2x; still fail → use cached value; no cache → escalate to user. Decision rule: classify error; apply policy (retry/fallback/escalate); log. Anti-example: silent failure or single strategy for all errors." },
  { domain: "ai.guardrails.output_validation", title: "Output Validation and Guardrails", concept: "Check model output against schema and safety rules before use. Example: output must be { answer: string, sources: string[] }; validate shape; block if PII or harmful. Decision rule: define schema and blocklist; validate; reject or sanitize. Anti-example: using raw output without schema or safety check." },
  { domain: "ai.guardrails.self_reflection", title: "Self-Reflection and Iterative Improvement", concept: "Critique own output and refine before returning. Example: draft answer → check against criteria [complete, cited, on-topic]; if fail, list gaps and regenerate. Decision rule: produce draft; score on criteria; if below threshold, refine; repeat or cap. Anti-example: returning first draft with no self-check." },
  { domain: "ai.guardrails.execution_monitoring", title: "Execution Monitoring and Observability", concept: "Log decisions, tool calls, and outcomes for debugging. Example: each step → log { step_id, action, inputs_hash, output_summary, latency }; on error attach stack. Decision rule: log at step boundaries; include ids and timing; aggregate for dashboards. Anti-example: no logs or only final output." },
  // ── Legacy / existing (1; duplicates removed) ──────────────────────────────
  { domain: "software.testing", title: "Unit Test Generation", concept: "Generate tests for one unit with dependencies mocked. Example: function parse(input) → tests [empty input, valid JSON, invalid JSON]; mock readFile. Decision rule: identify unit and deps; generate cases (happy, edge, error); mock deps. Anti-example: integration test labeled as unit or no mocks." },
  // ── More planning (5) ──────────────────────────────────────────────────────
  { domain: "agent.planning.milestone", title: "Milestone Planning", concept: "Define checkpoints and only proceed when each is met. Example: milestone 1 \"API designed\" → gate design review; milestone 2 \"tests pass\" → gate CI. Decision rule: list milestones; block next phase until current done; verify. Anti-example: no gates; \"done when done\" with no checkpoints." },
  { domain: "agent.planning.resource_allocation", title: "Resource Allocation Planning", concept: "Assign limited resources (time, tokens, tools) across subtasks. Example: 1000 tokens total → 200 system, 500 retrieval, 300 response; assign before execution. Decision rule: state budget; allocate per category; track usage. Anti-example: unbounded or ad-hoc allocation." },
  { domain: "agent.planning.iterative", title: "Iterative Planning Loop", concept: "Re-plan when new information arrives; adapt incrementally. Example: plan was [A, B, C]; after A, new constraint → replan [A, B', C']; execute B'. Decision rule: after each step check for new info; if significant, replan from current state. Anti-example: rigid plan that never updates." },
  { domain: "agent.planning.fallback", title: "Fallback and Contingency Planning", concept: "Define fallback paths when the primary plan fails or is blocked. Example: primary \"call API X\"; fallback \"use cache\"; fallback 2 \"ask user\". Decision rule: for each step list fallbacks; on failure try next; log path. Anti-example: single path with no fallback." },
  { domain: "agent.planning.priority_scheduling", title: "Priority Scheduling", concept: "Order tasks by priority and deadlines; preempt when needed. Example: queue [P1 deploy, P2 fix bug, P3 feature]; run P1; if P2 deadline closer, preempt. Decision rule: assign priority and deadline; schedule by priority; preempt by policy. Anti-example: FIFO with no priority or deadline." },
  { domain: "agent.planning.backtracking", title: "Backtracking Search for Plan Repair", concept: "When a plan path fails, backtrack to the last choice point and try the next branch. Example: path [A, B, C] fails at C → backtrack to B, try B'; if no more B options, backtrack to A. Decision rule: record choice points; on fail pop and try next; exhaust or succeed. Anti-example: restart from scratch instead of backtracking." },
  // ── Agent evaluation & multi-agent ─────────────────────────────────────────
  { domain: "agent.evaluation.performance", title: "Agent Performance Self-Evaluation", concept: "Score own output against success criteria and identify improvement levers. Example: output O, criteria [complete, correct, cited]; score each; if low on cited, add step \"attach sources\". Decision rule: define criteria; score output; list gaps; suggest fixes. Anti-example: no self-score or vague \"good enough\"." },
  { domain: "agent.multi_agent.delegation", title: "Task Delegation to Sub-Agents", concept: "Split a task, send subtasks to specialized agents, merge results. Example: task \"research and summarize\" → delegate \"search\" to agent A, \"summarize\" to agent B; collect A output as B input; merge. Decision rule: decompose; assign by capability; define handoff; merge. Anti-example: one agent doing all or no handoff contract." },
  { domain: "agent.prompting.structured_output", title: "Structured Output Enforcement", concept: "Require LLM output to match a typed schema; retry on violation. Example: schema { answer: string, sources: string[] }; parse output; if invalid, retry with schema in prompt; max 2 retries. Decision rule: define schema; parse; validate; retry or fail. Anti-example: free-form output with no schema or retry." },
  // ── More reasoning (5) ─────────────────────────────────────────────────────
  { domain: "agent.reasoning.hypothesis_generation", title: "Hypothesis Generation", concept: "Produce candidate explanations or plans for later evaluation. Example: observation \"error at step 3\" → hypotheses [bug in step 3, bad input from step 2, race]; list with one-line each. Decision rule: state observation; generate N candidates; keep distinct. Anti-example: single hypothesis or indistinguishable candidates." },
  { domain: "agent.reasoning.evidence_evaluation", title: "Evidence Evaluation", concept: "Weigh evidence for and against each hypothesis; update beliefs. Example: H1 \"bug in step 3\"; evidence E1 supports, E2 against → score H1; compare to H2. Decision rule: list evidence per hypothesis; score support/against; rank hypotheses. Anti-example: ignoring contradicting evidence or no scoring." },
  { domain: "agent.reasoning.causal", title: "Causal Reasoning", concept: "Infer cause-effect and reason about interventions. Example: A causes B; if we fix A, B should change; intervention do(not A) → expect not B. Decision rule: state causal graph; identify intervention; predict outcome. Anti-example: correlation only or intervention without prediction." },
  { domain: "agent.reasoning.contradiction_detection", title: "Contradiction Detection", concept: "Find logical or factual contradictions in premises or outputs. Example: \"X is true\" and \"X is false\" in same context → flag contradiction; list conflicting claims. Decision rule: extract claims; compare for negation or conflict; report pairs. Anti-example: missing obvious contradictions or no report." },
  { domain: "agent.reasoning.scenario_evaluation", title: "Scenario Evaluation", concept: "Evaluate outcomes under different assumptions or scenarios. Example: scenario 1 \"no cache\", scenario 2 \"cache hit\" → compare latency and cost; recommend. Decision rule: define scenarios; run or project outcome per scenario; compare. Anti-example: single scenario or no comparison." },
  // ── More memory & context (3) ─────────────────────────────────────────────
  { domain: "agent.memory.sliding_window", title: "Sliding Window Context", concept: "Keep a fixed-size window of recent context; drop or summarize oldest. Example: window size 10 turns; turn 11 → drop turn 1 or summarize turns 1–3 into one. Decision rule: set size; on overflow drop or summarize oldest; append new. Anti-example: unbounded growth or random drop." },
  { domain: "agent.memory.context_budget", title: "Context Budget Allocation", concept: "Allocate context space across system, retrieval, and dialogue. Example: 4k tokens → 500 system, 2k retrieval, 1.5k dialogue; enforce before each call. Decision rule: set budget per segment; measure; trim or reject over. Anti-example: no budget or reactive trim only." },
  { domain: "agent.memory.entity_tracking", title: "Entity and Reference Tracking", concept: "Track entities mentioned and resolve references. Example: user said \"the first one\"; entities [option A, option B]; resolve to option A. Decision rule: maintain entity list; on reference resolve to list item; update on new mention. Anti-example: no entity list or unresolved \"it\"." },
  // ── More tool use (4) ───────────────────────────────────────────────────────
  { domain: "agent.tools.chaining", title: "Tool Chaining", concept: "Feed one tool's output as input to the next; enforce dataflow. Example: tool1(code) → diff; tool2(diff) → review; output of 1 is named and passed to 2. Decision rule: define chain; name outputs; bind next inputs; validate types. Anti-example: implicit or untyped handoff between tools." },
  { domain: "agent.tools.result_aggregation", title: "Result Aggregation", concept: "Merge multiple tool outputs with different schemas into one. Example: tool A returns { code_diff }, tool B returns { test_result }, tool C returns { analysis_report }; merge by mapping each to a common schema (e.g. evidence items) then rank and pick top-k. Decision rule: schema alignment → merge → rank. Anti-example: concatenating results without schema or ranking." },
  { domain: "agent.tools.capability_matching", title: "Capability Matching", concept: "Match task requirements to tool capabilities using schema comparison. Example: task needs (input: code_diff → output: test_result), tool A schema matches exactly → select tool A over tool B (code_diff → analysis_report, output type mismatch). Decision rule: schema coverage → cost → latency. Anti-example: selecting by tool name alone ignores output type mismatch." },
  { domain: "agent.tools.input_adaptation", title: "Input Adaptation for Tools", concept: "Transform user or context data into the shape the tool expects. Example: user gives natural language; tool expects { query: string, limit: number }; extract query, set limit=10. Decision rule: know tool schema; map user/context fields; validate. Anti-example: passing raw user input without mapping or validation." },
  // ── More retrieval (3) ─────────────────────────────────────────────────────
  { domain: "ai.retrieval.hybrid_search", title: "Hybrid Search", concept: "Combine keyword and semantic retrieval for better recall and precision. Example: query → keyword top-20 + semantic top-20 → merge, dedupe, rerank → top-10. Decision rule: run both retrievers; merge; dedupe; optional rerank. Anti-example: only keyword or only semantic when both would help." },
  { domain: "ai.retrieval.chunking", title: "Chunking and Passage Strategy", concept: "Split documents into retrievable chunks with clear boundaries. Example: doc by sections; chunk at section boundary; overlap 1 sentence; max 256 tokens. Decision rule: define boundary (section, paragraph); set size and overlap; index chunks. Anti-example: fixed character split that breaks sentences or sections." },
  { domain: "ai.retrieval.citation_grounding", title: "Citation and Grounding", concept: "Tie model outputs to retrieved passages and attach citations. Example: claim \"X\" → attach [passage_1, passage_3]; output format \"X [1,3]\". Decision rule: for each claim identify source passages; format citation; verify quote. Anti-example: unsourced claims or fake citations." },
  // ── More reliability (4) ───────────────────────────────────────────────────
  { domain: "agent.error_recovery.retry_backoff", title: "Retry with Backoff", concept: "Retry failed operations with increasing delay. Example: fail → wait 1s, retry; fail → wait 2s, retry; fail → wait 4s; cap at 3 retries. Decision rule: set initial delay and backoff; retry until success or max; log. Anti-example: immediate retry with no backoff or unbounded retries." },
  { domain: "agent.error_recovery.circuit_breaker", title: "Circuit Breaker Pattern", concept: "Stop calling a failing dependency; resume after cooldown. Example: 5 failures in a row → open circuit; reject calls for 30s; then half-open, one probe; success → close. Decision rule: count failures; threshold → open; cooldown → half-open; probe → close or reopen. Anti-example: keep calling a known-failing dependency." },
  { domain: "agent.error_recovery.graceful_degradation", title: "Graceful Degradation", concept: "Reduce functionality when a dependency fails but stay usable. Example: recommendation service down → return results without recommendations; show \"recommendations unavailable\". Decision rule: detect failure; disable dependent feature; return partial result; inform user. Anti-example: full failure or silent wrong data." },
  { domain: "agent.error_recovery.compensating", title: "Compensating Transactions", concept: "Undo or compensate when a step in a workflow fails. Example: step 2 of [charge, ship, notify] fails → run compensate(charge) to refund. Decision rule: each step has compensate; on fail run compensates in reverse order. Anti-example: no compensation or partial state left." },
  // ── Software & observability (4) ───────────────────────────────────────────
  { domain: "software.testing.integration", title: "Integration Test Strategy", concept: "Test interactions between components and external services. Example: service A calls B and C; mock B and C; test A with contract assertions. Decision rule: identify boundaries; mock externals; assert requests and responses. Anti-example: testing A in isolation with no contract or mock." },
  { domain: "software.testing.regression", title: "Regression Testing", concept: "Re-run a fixed test suite after changes to catch regressions. Example: commit → run full suite; any failure blocks merge; track flaky tests. Decision rule: define suite; run on change; fail on new failure. Anti-example: no regression suite or ignoring failures." },
  { domain: "software.observability.logging", title: "Structured Logging for Agents", concept: "Log decisions, tool calls, and outcomes in a structured format. Example: each step → { timestamp, step_id, action, input_hash, output_summary, latency_ms }; queryable. Decision rule: structured fields; consistent schema; include ids and timing. Anti-example: free-text logs only or no step-level detail." },
  { domain: "software.security.rate_limiting", title: "Rate Limiting and Quotas", concept: "Enforce rate limits and quotas on API or tool usage. Example: 100 req/min per key; over limit → 429 and retry-after. Decision rule: set limit and window; count per key; reject or throttle over. Anti-example: no limit or per-IP only when per-identity needed." },
  // ── Data & integration (3) ───────────────────────────────────────────────
  { domain: "data.schema.validation", title: "Schema Validation for Data", concept: "Validate structured data against a schema before use. Example: payload must match { name: string, age: number }; validate types and required; reject invalid. Decision rule: define schema; validate on ingest; reject or coerce. Anti-example: using data without validation or silent coercion." },
  { domain: "data.streaming.event_processing", title: "Event Stream Processing", concept: "Consume ordered events, apply stateful transformations, emit derived events. Example: stream of clicks → aggregate by user_id in window 5m → emit summary event. Decision rule: consume in order; maintain state per key; emit on window or trigger. Anti-example: stateless only or out-of-order processing when order matters." },
  { domain: "meta.protocol.attribution", title: "Attribution and Provenance", concept: "Track and cite sources of knowledge in agent outputs. Example: claim from KB X and doc Y → output \"... [X, Y]\"; store (claim, sources). Decision rule: record source per claim; format citation; verify traceability. Anti-example: unsourced claims or fake citations." },
  // ── EVM / Solidity (protocol-critical; replaces vague solidity.patterns) ────
  { domain: "evm.solidity.security", title: "Reentrancy Guard Pattern", concept: "Prevent reentrant calls using a mutex and checks-effects-interactions. Example: modifier nonReentrant { require(!_locked); _locked=true; _; _locked=false; }; do state updates before external calls. Decision rule: guard entry; CEI order; no external call before state final. Anti-example: external call before state update or no guard." },
  { domain: "evm.solidity.access_control", title: "Role-Based Access Control for Contracts", concept: "Assign roles and gate functions with modifiers. Example: onlyRole(MINTER) on mint(); grantRole(MINTER, addr); revokeRole. Decision rule: define roles; modifier onlyRole(role); grant/revoke in admin. Anti-example: single owner only or no role checks on sensitive functions." },
  // ── Distributed systems (5) ───────────────────────────────────────────────
  { domain: "distributed.systems.consensus", title: "Consensus and Agreement", concept: "Reach agreement across nodes despite failures and latency. Example: 3 nodes, 1 faulty; propose value; run consensus (e.g. PBFT); all correct nodes decide same value. Decision rule: define proposal and round; collect votes; decide when quorum. Anti-example: single leader with no fault tolerance or no quorum." },
  { domain: "distributed.systems.replication", title: "Data Replication Strategies", concept: "Replicate data for availability and consistency trade-offs. Example: primary-replica; write to primary; replicate async; read from replica with staleness bound. Decision rule: choose model (sync/async, leader/replica); define consistency; handle failover. Anti-example: no replication or undefined consistency." },
  { domain: "distributed.systems.partitioning", title: "Partitioning and Sharding", concept: "Partition data or workload for scale and locality. Example: users by user_id % 10 → 10 shards; route read/write by key. Decision rule: choose partition key; define routing; handle rebalance. Anti-example: single partition or random key when locality matters." },
  { domain: "distributed.systems.messaging", title: "Message Queue and Event Streaming", concept: "Reliable messaging and event-driven coordination. Example: producer → topic T; consumer group subscribes; at-least-once; ack after process. Decision rule: choose topic/queue; define delivery guarantee; ack and retry. Anti-example: fire-and-forget when delivery matters or no ack." },
  { domain: "distributed.systems.idempotency", title: "Idempotency for Distributed Operations", concept: "Design operations so retries are safe and duplicate-free. Example: request id in payload; store (id, result); retry same id → return stored. Decision rule: id per operation; dedupe by id; same id → same result. Anti-example: retry creates duplicate side effect or no id." },
  // ── ML / model ops (2; RAG/fine_tuning/guardrails removed as duplicates) ───
  { domain: "ml.evaluation.metrics", title: "Model Evaluation and Metrics", concept: "Choose and compute metrics for model quality and fairness. Example: task classification → accuracy, F1, per-class recall; fairness → demographic parity. Decision rule: define metrics per task; compute on held-out set; report and track. Anti-example: single metric or no held-out set." },
  { domain: "ml.ops.prompt_versioning", title: "Prompt Versioning and A/B Testing", concept: "Version and compare prompts for reproducibility. Example: prompt v1 vs v2; same eval set; compare accuracy and latency; promote winner. Decision rule: version prompts; run on same eval; compare; promote. Anti-example: ad-hoc prompts with no version or comparison." },
  // ── Networking & APIs (3) ──────────────────────────────────────────────────
  { domain: "networking.http.caching", title: "HTTP Caching and Invalidation", concept: "Cache responses and invalidate correctly. Example: GET /resource → cache with ETag; revalidate with If-None-Match; on 304 use cache. Decision rule: set cache headers; validate on reuse; invalidate on write. Anti-example: no cache or stale forever." },
  { domain: "networking.api.versioning", title: "API Versioning and Compatibility", concept: "Version APIs and maintain backward compatibility. Example: /v1/users and /v2/users; v2 adds optional field; clients on v1 unchanged. Decision rule: version in path or header; additive changes only; deprecate with notice. Anti-example: breaking change without version or notice." },
  { domain: "networking.auth.oauth", title: "OAuth and Token-Based Auth", concept: "Delegate and verify access with tokens. Example: client → auth server → access_token; API validates token and scope; reject if invalid or expired. Decision rule: issue token with scope; validate on each request; refresh when needed. Anti-example: no scope or no validation." },
  // ── Compliance & governance (3) ───────────────────────────────────────────
  { domain: "compliance.audit_logging", title: "Audit Logging for Compliance", concept: "Log actions for auditability and compliance. Example: who, what, when, resource, result; immutable log; retention 7 years. Decision rule: define audit events; log immutable; retain per policy. Anti-example: no audit or mutable logs." },
  { domain: "compliance.data_retention", title: "Data Retention and Deletion", concept: "Retain and delete data per policy and regulation. Example: PII retain 2 years then delete; job runs daily; soft delete then purge. Decision rule: define retention per type; schedule deletion; verify purge. Anti-example: keep forever or delete without policy." },
  { domain: "compliance.access_control", title: "Access Control and RBAC", concept: "Enforce roles and permissions for resources. Example: role editor can edit doc; check has_role(user, editor) and owns(doc, user) before write. Decision rule: define roles and permissions; check before action; deny by default. Anti-example: allow by default or no role check." },
  // ── Crypto & identity (3) ─────────────────────────────────────────────────
  { domain: "crypto.signatures.verification", title: "Signature Verification", concept: "Verify digital signatures and key binding. Example: message M, signature S, public key P; verify S matches M under P; reject if invalid. Decision rule: obtain key; verify signature; reject on failure. Anti-example: skip verification or wrong key." },
  { domain: "crypto.identity.did", title: "Decentralized Identifiers (DIDs)", concept: "Resolve and verify decentralized identifiers. Example: did:key:xyz → fetch document; verify doc matches did; use controller key. Decision rule: resolve DID to doc; verify; use verified material. Anti-example: trust DID string without resolution or verification." },
  { domain: "crypto.keystore.management", title: "Key and Secret Management", concept: "Store, rotate, and use keys and secrets safely. Example: secret in vault with version; app fetches by id; rotate monthly; old version still valid for grace period. Decision rule: store in vault; access by id; rotate; audit access. Anti-example: secret in code or env with no rotation." },

  // ── ML / RAG pipelines ───────────────────────────────────────────────────
  { domain: "ml.rag.chunking_strategy", title: "RAG Chunking Strategy", concept: "Split documents into retrieval-ready chunks at semantic boundaries. Example: 50-page PDF → split at h2 headings; each chunk max 512 tokens; overlap 64 tokens to preserve context at boundaries. Decision rule: detect boundary type (heading/paragraph/sentence); set max_tokens; apply overlap; index chunk with source offset. Anti-example: fixed-character split that bisects sentences or tables, losing semantic coherence." },
  { domain: "ml.rag.embedding_selection", title: "Embedding Model Selection for RAG", concept: "Choose and validate an embedding model for the retrieval domain. Example: task = code search → evaluate code-aware models vs text-embedding-ada-002 on 100 (query, expected_chunk) pairs; pick by top-5 recall. Decision rule: build eval set of (query, expected_chunk); score top-k recall per candidate model; pick highest; re-evaluate on domain shift. Anti-example: use default embedding model without any domain-specific evaluation." },
  { domain: "ml.rag.reranking", title: "Retrieval Reranking with Cross-Encoder", concept: "Re-score retrieved candidates with a cross-encoder for higher precision. Example: bi-encoder retrieves 20 chunks; cross-encoder scores each (query, chunk) pair jointly; sort by score; keep top 5 for context. Decision rule: first-stage retrieval (fast bi-encoder); second-stage rerank (accurate cross-encoder); truncate at k; monitor reranker latency. Anti-example: return first-stage bi-encoder results unranked when precision matters." },
  { domain: "ml.rag.eval_ragas", title: "RAG Pipeline Evaluation with Metrics", concept: "Measure retrieval and generation quality with defined metrics on a labeled eval set. Example: 50-question eval set with ground-truth answers; compute context_recall, faithfulness, answer_relevancy; require recall>0.7 and faithfulness>0.8 before deploy. Decision rule: build (question, ground_truth) set; run pipeline; compute metrics; block deploy if below threshold; re-evaluate on each pipeline change. Anti-example: manual spot-check with no numeric threshold or eval set." },
  { domain: "ml.rag.context_fusion", title: "Multi-Source Context Fusion", concept: "Merge retrieved chunks from multiple sources into one coherent prompt context. Example: 3 retrievers return [A1, A2], [B1], [C1, C2]; dedupe by content hash; score each by relevance; pack highest-scoring into 2k-token window; label each chunk with source. Decision rule: dedupe; score; pack by relevance descending; label per source; respect token budget. Anti-example: concat chunks in retrieval order without deduplication or relevance scoring." },

  // ── ML / fine-tuning ─────────────────────────────────────────────────────
  { domain: "ml.fine_tuning.peft_lora", title: "LoRA Fine-Tuning with PEFT", concept: "Efficiently fine-tune a large model by training low-rank adapter weights only. Example: base 7B model; apply LoRA r=8, alpha=16 to Q and V attention projections; train on 10k instruction pairs; adapter adds <1% params; merge post-training. Decision rule: choose rank r and target layers; freeze base; train adapters; eval on held-out set; merge or serve as base+adapter. Anti-example: full-parameter fine-tune when compute budget is constrained and LoRA quality is sufficient." },
  { domain: "ml.fine_tuning.instruction_tuning", title: "Instruction Tuning Dataset Construction", concept: "Build and filter instruction-response pairs for supervised fine-tuning. Example: 100k raw QA pairs → filter: answer length > 20 chars; perplexity < 50; format as {system, user, assistant}; shuffle; split 90/5/5 train/val/test. Decision rule: define format; apply quality filters (length, perplexity, diversity); split with no leakage; verify with sample review. Anti-example: no quality filter or test split contaminated with training examples." },
  { domain: "ml.fine_tuning.dpo_alignment", title: "Direct Preference Optimization (DPO)", concept: "Align model behavior from preference pairs without an explicit reward model. Example: collect (prompt, chosen, rejected) pairs from human raters; compute DPO loss = log_prob(chosen) - log_prob(rejected) with reference model regularization; train until win-rate > 65% on eval. Decision rule: collect diverse preference pairs; set beta for KL regularization; train; evaluate win-rate against base; monitor reward hacking. Anti-example: RLHF with a separate reward model when preference data volume is limited." },

  // ── ML / inference optimization ──────────────────────────────────────────
  { domain: "ml.inference.batching", title: "Inference Request Batching", concept: "Group concurrent inference requests to maximize GPU utilization. Example: server receives 12 concurrent requests; bucket by sequence length: 8 short → batch A, 4 long → batch B; run batches; throughput 3× single-request baseline. Decision rule: set max_batch_size and max_wait_ms; group by length bucket; flush on full or timeout; monitor GPU utilization and tail latency. Anti-example: process each request sequentially; GPU idle between requests; low throughput." },
  { domain: "ml.inference.quantization", title: "Model Quantization for Inference", concept: "Reduce model weight precision to cut memory and latency with acceptable quality loss. Example: FP16 model 14GB → INT8 post-training quantization → 7GB; throughput 1.8×; eval perplexity delta 0.3 (acceptable < 0.5); deploy INT8. Decision rule: choose precision target (INT8/INT4/GPTQ); benchmark speed and quality on eval set; accept if quality delta < threshold; monitor for distribution shift. Anti-example: deploy FP32 in production when memory or latency is the constraint." },
  { domain: "ml.inference.kv_cache", title: "KV Cache Optimization for LLM Serving", concept: "Reuse key-value computations for shared prompt prefixes to reduce per-request compute. Example: system prompt shared by all requests (512 tokens); compute KV once at server start; cache in GPU memory; each new request reuses cached KV, computes only new tokens. Decision rule: identify static prefix; pre-compute and cache KV; reuse per request; evict LRU when cache full; measure prefix hit rate. Anti-example: recompute full KV for every request including the static system prompt." },
  { domain: "ml.inference.speculative_decoding", title: "Speculative Decoding for LLM Speed", concept: "Use a small draft model to propose tokens; verify with the large model in one forward pass. Example: draft model (1B) generates 5 candidate tokens; large model (70B) verifies all 5 in parallel; accept tokens up to first mismatch; speedup 2–3× with identical output distribution. Decision rule: draft N tokens with small model; verify in one large-model pass; accept prefix up to first rejection; recompute remainder; tune N for speedup vs acceptance-rate trade-off. Anti-example: autoregressive token-by-token generation with large model only when latency is critical." },

  // ── EVM proxy patterns ───────────────────────────────────────────────────
  { domain: "evm.proxy.transparent", title: "Transparent Proxy Pattern", concept: "Separate admin and user call routing to prevent function-selector clashes. Example: proxy checks msg.sender: if admin → route to proxy admin functions; if user → delegatecall to implementation. Decision rule: check caller identity first; admin calls never reach implementation; user calls always delegatecall; verify with selector collision tool. Anti-example: single proxy where admin and user calls can clash by matching selector on implementation." },
  { domain: "evm.proxy.uups", title: "UUPS Proxy Pattern", concept: "Embed upgrade logic in the implementation to reduce proxy complexity and gas. Example: implementation inherits UUPSUpgradeable; upgradeTo(newImpl) guarded by onlyOwner; constructor calls _disableInitializers(); storage gap reserved. Decision rule: inherit UUPS base; guard upgradeTo; disable initializers in constructor; verify new impl is UUPS-compatible before upgrade. Anti-example: upgradeTo with no access guard or no compatibility check on new implementation." },
  { domain: "evm.proxy.storage_collision", title: "Proxy Storage Collision Prevention", concept: "Use EIP-1967 random slots for proxy admin and implementation to avoid variable collision. Example: implementation slot = keccak256('eip1967.proxy.implementation') - 1; admin slot = keccak256('eip1967.proxy.admin') - 1; never use slot 0. Decision rule: use EIP-1967 or EIP-7201 namespaced slots; never write proxy state to sequential slots; run storage layout diff before every upgrade. Anti-example: proxy admin stored at slot 0, colliding with implementation's first state variable." },

  // ── EVM testing ──────────────────────────────────────────────────────────
  { domain: "evm.testing.foundry_invariants", title: "Foundry Invariant Testing", concept: "Define state invariants and let Foundry's fuzzer find violating call sequences. Example: invariant_totalSupply: assert totalSupply() == sum of all balances; Foundry calls random sequences of mint/burn/transfer; fails on counterexample. Decision rule: write invariant_ functions asserting critical state properties; run forge test --mt invariant; fix every counterexample; add to CI. Anti-example: unit tests only; misses multi-step state drift that invariant fuzzing catches." },
  { domain: "evm.testing.forge_fuzzing", title: "Forge Fuzz Testing", concept: "Parameterize unit tests with random inputs via Foundry's built-in fuzzer. Example: function testTransferFuzz(address to, uint256 amount) public; forge generates 256 random (to, amount) pairs; test fails if unexpected revert or invariant violated. Decision rule: declare function params as fuzz inputs; add assume() to exclude invalid inputs; set runs=256+ in foundry.toml; review counterexamples. Anti-example: single hardcoded test case that misses boundary values and edge inputs." },

  // ── EVM deployment ───────────────────────────────────────────────────────
  { domain: "evm.deployment.create2_factory", title: "CREATE2 Deterministic Deployment", concept: "Deploy contracts at precomputed addresses using a factory, salt, and initcode hash. Example: salt = keccak256(abi.encode(owner, version)); predicted = keccak256(0xff ++ factory ++ salt ++ keccak256(initcode)); deploy; assert address == predicted. Decision rule: compute salt from stable inputs; predict address before deploy; verify post-deploy; use for cross-chain address consistency. Anti-example: CREATE deployed contracts whose address is unknown before deployment." },
  { domain: "evm.deployment.upgrade_scripts", title: "Safe Upgrade Deployment Scripts", concept: "Write upgrade scripts with pre/post verification to prevent bricked proxies. Example: deploy new impl; call proxyAdmin.upgrade(proxy, newImpl); assert proxy.implementation() == newImpl; call smoke-test function; log all addresses. Decision rule: deploy impl; call upgrade; verify implementation slot; run smoke test; log addresses and block; revert script on any assertion failure. Anti-example: call upgrade without verifying implementation slot or running any smoke test." },

  // ── EVM events ───────────────────────────────────────────────────────────
  { domain: "evm.events.topic_encoding", title: "EVM Event Topic Encoding", concept: "Encode indexed event parameters as topics for efficient log filtering. Example: event Transfer(address indexed from, address indexed to, uint256 value); topic[0] = keccak256('Transfer(address,address,uint256)'); topic[1] = from padded to 32 bytes; value goes in data (not indexed). Decision rule: topic[0] = signature hash; indexed params → topic[1..3]; non-indexed params → ABI-encoded data; index high-cardinality filter fields. Anti-example: no indexed fields on Transfer; every log must be decoded to filter by address." },
  { domain: "evm.events.log_filtering", title: "EVM Log Filtering Patterns", concept: "Query contract logs efficiently by topic and block range. Example: eth_getLogs({ address: contractAddr, topics: [transferSig, null, toAddrPadded], fromBlock: 18000000, toBlock: 18001000 }); page 1000-block ranges; dedupe by txHash+logIndex on ingest. Decision rule: filter by address + topic[0]; narrow with topic[1..3]; page in small block ranges; dedupe at ingest; checkpoint last processed block. Anti-example: fetch all logs with no topic filter and filter client-side; times out on large ranges." },

  // ── EVM assembly ─────────────────────────────────────────────────────────
  { domain: "evm.assembly.yul_optimization", title: "Yul Inline Assembly for Gas Optimization", concept: "Use Yul assembly blocks in hot-path functions to eliminate Solidity overhead. Example: function load32(bytes memory b, uint offset) returns (uint256 v) { assembly { v := mload(add(add(b, 0x20), offset)) } } saves ~200 gas vs Solidity equivalent. Decision rule: gas-snapshot first; identify hot path; rewrite in Yul; fuzz both versions for output equivalence; require auditor sign-off. Anti-example: assembly throughout without profiling; compiler already optimizes most cases." },

  // ── Blockchain indexing ──────────────────────────────────────────────────
  { domain: "blockchain.indexing.subgraph_schema", title: "Subgraph Entity Schema Design", concept: "Design entity types and relationships for a Graph Protocol subgraph. Example: entities Token, Transfer, Account; Transfer.from and Transfer.to reference Account; @derivedFrom(field: 'transfers') on Account for reverse lookup; ID = txHash+logIndex. Decision rule: one entity per domain concept; unique ID per entity; use @derivedFrom for reverse edges; avoid deeply nested entities that inflate store writes. Anti-example: single flat entity with all fields concatenated; no relationships; every query loads full table." },
  { domain: "blockchain.indexing.event_handlers", title: "Subgraph Event Handler Patterns", concept: "Write idempotent event handler mappings that perform well at scale. Example: handleTransfer(event): id = event.transaction.hash.toHex() + '-' + event.logIndex.toString(); load or create Account; update balance; save Transfer entity. Decision rule: ID = txHash+logIndex (globally unique); load-or-create for entities; save every modified entity; no unbounded loops inside handlers. Anti-example: use block timestamp as ID (collisions); loop over all historical events inside a handler (O(n²) indexing)." },

  // ── Blockchain wallet ────────────────────────────────────────────────────
  { domain: "blockchain.wallet.eip712_signing", title: "EIP-712 Typed Data Signing", concept: "Sign structured off-chain data and verify on-chain using domain-separated hashes. Example: domain { name, version, chainId, verifyingContract }; struct Order { address maker; uint256 amount; uint256 expiry }; sign with eth_signTypedData_v4; on-chain: recover = ecrecover(hashStruct(Order), sig); assert recover == expectedSigner. Decision rule: define DOMAIN_SEPARATOR and struct type hash; sign off-chain; verify on-chain with ecrecover; include chainId to prevent cross-chain replay. Anti-example: sign raw keccak256(abi.encode(...)) without domain separator; replayable across chains and contracts." },
  { domain: "blockchain.wallet.eip1271", title: "EIP-1271 Contract Signature Verification", concept: "Support smart contract wallet signatures by calling isValidSignature on-chain. Example: EOA check: ecrecover(hash, sig) == signer; contract check: IERC1271(signer).isValidSignature(hash, sig) == 0x1626ba7e; handle both in one verifySignature function. Decision rule: detect if signer is contract (code.length > 0); call isValidSignature; compare magic value; fallback to ecrecover for EOAs. Anti-example: ecrecover only; rejects all multisig and smart-contract wallet signatures." },

  // ── Layer 2 ──────────────────────────────────────────────────────────────
  { domain: "blockchain.l2.optimistic_rollup", title: "Optimistic Rollup Architecture", concept: "Batch transactions and post state roots assuming validity; allow fraud proofs in a challenge window. Example: sequencer batches 1000 txs; posts state root to L1; 7-day challenge window; verifier submits fraud proof with witness if invalid; sequencer stake slashed. Decision rule: batch and post; enforce challenge window before finality; implement fraud proof path; monitor for fraud submissions. Anti-example: accept state root immediately with no challenge window or fraud proof mechanism." },
  { domain: "blockchain.l2.zk_rollup", title: "ZK Rollup Proof Verification", concept: "Post transaction batches with validity proofs verified on L1 for instant finality. Example: prover generates Groth16 proof for 1000-tx batch off-chain; submit proof + new state root to L1 verifier contract; verifier checks pairing (~200k gas); state finalized immediately on success. Decision rule: generate proof off-chain; submit and verify on-chain; finalize state on proof acceptance; no challenge window required. Anti-example: optimistic approach when proof size and prover cost are acceptable and instant finality is needed." },
  { domain: "blockchain.l2.bridge_security", title: "L2 Bridge Security Patterns", concept: "Secure cross-chain asset transfers with proof verification, rate limits, and circuit breakers. Example: user locks ETH on L1; L2 mints wETH after Merkle proof of L1 lock verified; withdrawals rate-limited to 10% of TVL per day; bridge paused automatically on anomaly detection. Decision rule: verify Merkle proof of source-chain event; rate-limit withdrawals; emit events; monitor volume and pause on anomaly. Anti-example: trust relayer message without proof verification; no withdrawal rate limit." },

  // ── DeFi ─────────────────────────────────────────────────────────────────
  { domain: "defi.lending.collateral_management", title: "DeFi Collateral Health Factor", concept: "Track collateral value and enforce health factor above liquidation threshold continuously. Example: user deposits 1 ETH ($2000), borrows $1200 USDC; health_factor = collateralValue * ltvFactor / debtValue = 2000*0.8/1200 = 1.33; liquidation threshold 1.2; warn at 1.25. Decision rule: compute health_factor on every price update; warn below warn threshold; allow liquidation below liquidation threshold; use price oracle with freshness check. Anti-example: check health factor only on user action; undercollateralization discovered too late." },
  { domain: "defi.lending.liquidation_engine", title: "DeFi Liquidation Engine Design", concept: "Execute partial liquidations when health factor falls below threshold and incentivize liquidators. Example: health_factor < 1.2; liquidator repays 50% of debt ($600 USDC); receives ETH collateral + 5% bonus ($630 worth); protocol takes 1% of bonus as fee; health_factor restored. Decision rule: check health_factor < threshold; compute max_repay (closeFactor % of debt); add liquidation_bonus to collateral payout; update state atomically; emit Liquidation event. Anti-example: allow 100% debt repayment in one liquidation (bad debt risk at edge LTV)." },
  { domain: "defi.yield.auto_compounding", title: "Yield Vault Auto-Compounding", concept: "Harvest and reinvest rewards automatically to compound APY without user action. Example: vault holds Curve LP tokens; keeper calls harvest() when pending_rewards * token_price > gas_cost * 3; swaps REWARD → underlying via DEX; re-deposits; vault share price increases. Decision rule: trigger when rewards > gas_cost * safety_multiple; swap rewards to underlying; deposit; emit Compound event with amounts. Anti-example: manual harvest only; compounding frequency depends on user action; APY understated and opportunity cost incurred." },
  { domain: "defi.amm.invariant_math", title: "AMM Constant-Product Invariant", concept: "Implement and verify the constant-product formula for a two-asset pool. Example: pool x=1000 ETH, y=2000000 USDC, k=2e9; swap dx=10 ETH in → dy = y*dx/(x+dx) = 2000000*10/1010 ≈ 19802 USDC out; verify x'*y' == k within rounding. Decision rule: compute output from invariant formula; update reserves; verify invariant holds post-swap; revert if k decreases beyond rounding tolerance. Anti-example: compute output without verifying invariant post-swap; pool vulnerable to precision-based drain." },

  // ── Crypto / ZK and threshold ────────────────────────────────────────────
  { domain: "crypto.zk.circuit_design", title: "ZK Circuit Constraint Design", concept: "Write a zero-knowledge circuit with minimal constraints for a provable statement. Example: statement 'I know preimage x where hash(x)==h'; R1CS circuit: constrain MiMC(x)==h using 512 constraints; public input h; witness x. Decision rule: define public inputs and witness; write constraints; count gates; minimize by choosing hash-friendly primitives (Poseidon > SHA256 in-circuit). Anti-example: use SHA256 in-circuit requiring 25k+ constraints when Poseidon achieves same with 220 constraints." },
  { domain: "crypto.zk.groth16_verification", title: "Groth16 On-Chain Proof Verification", concept: "Verify a Groth16 SNARK on-chain using a Solidity verifier contract. Example: off-chain prover outputs (A: G1, B: G2, C: G1); verifier contract runs pairing check e(A,B)==e(alpha,beta)*e(vk_x,gamma)*e(C,delta); costs ~200k gas; reverts on invalid proof. Decision rule: generate proof off-chain; encode as G1/G2 points; call verifier.verify(proof, publicSignals); revert if pairing fails; regenerate verifier on circuit change. Anti-example: verify proof off-chain only and trust the result; on-chain state changes without on-chain proof check." },
  { domain: "crypto.zk.plonk", title: "PLONK Universal Proof System", concept: "Use PLONK for circuits requiring a universal trusted setup without per-circuit ceremonies. Example: circuit updated monthly; Groth16 requires new ceremony each time; PLONK uses universal SRS from one ceremony; proof size ~800 bytes; verify ~300k gas; trade-off: larger proof than Groth16. Decision rule: use PLONK when circuit changes frequently; use Groth16 for stable high-volume circuits where proof size is critical; choose by update frequency. Anti-example: Groth16 ceremony per monthly circuit change when PLONK's universal SRS would eliminate repeated ceremonies." },
  { domain: "crypto.threshold.mpc_signing", title: "Threshold MPC Signing", concept: "Generate and use signing keys distributed across N parties with T-of-N threshold. Example: 3-of-5 threshold: DKG produces key shares for 5 parties; any 3 co-sign: produce partial sigs; combine into valid ECDSA sig; no single party ever holds the full private key. Decision rule: DKG to distribute shares; require T parties online for signing; verify output signature against group public key; never reconstruct full key. Anti-example: Shamir secret sharing with reconstruction for signing; full key exposed at each signing event." },
  { domain: "crypto.commitment.pedersen", title: "Pedersen Commitment Scheme", concept: "Commit to a value with computational hiding and unconditional binding using elliptic curves. Example: commit(v, r) = v*G + r*H where G, H are independent generators; publish C; reveal (v, r) later; verifier checks v*G + r*H == C; r provides hiding. Decision rule: choose random blinding r; compute C = v*G + r*H; publish C; reveal (v, r) when needed; verify by recomputing. Anti-example: hash commitment H(v) without randomness; brute-forceable for small value spaces." },
  { domain: "crypto.commitment.hash_opening", title: "Hash Commitment and Opening Protocol", concept: "Commit to a secret value with a hash, reveal later to prove prior knowledge. Example: commit phase: C = keccak256(abi.encodePacked(value, nonce)); publish C on-chain; reveal phase: submit (value, nonce); contract verifies keccak256(value, nonce)==C. Decision rule: choose 32-byte random nonce; compute C; publish C before reveal; verify on open; prevent frontrunning with block-number commitment window. Anti-example: commit without nonce; H(value) brute-forced if value space is small." },

  // ── System: event sourcing and CQRS ─────────────────────────────────────
  { domain: "system.event_sourcing.event_store", title: "Event Store Design", concept: "Store domain events in an append-only log as the primary source of truth. Example: stream user-123: events [UserCreated, EmailChanged, UserDeleted]; each event: { stream_id, sequence_no, event_type, payload, timestamp }; load by replaying stream from 0. Decision rule: append only; include stream_id and monotonic sequence_no; no updates or deletes; snapshot periodically for replay performance; test by replaying to known state. Anti-example: mutable user table updated in-place; history and audit trail permanently lost." },
  { domain: "system.event_sourcing.projection", title: "Event Sourcing Read-Model Projections", concept: "Build queryable read models by replaying event streams into denormalized tables. Example: replay UserCreated + EmailChanged events → projection table { user_id, current_email, updated_at }; projection replayable from position 0; checkpoint position for incremental updates. Decision rule: define handler per event type; rebuild from position 0 on schema change; checkpoint after each batch; make projections replayable and disposable. Anti-example: query raw event log on every read request (high latency at scale)." },
  { domain: "system.event_sourcing.snapshot", title: "Aggregate Snapshots for Event Sourcing", concept: "Periodically snapshot aggregate state to avoid replaying the full event stream on every load. Example: after 500 events on stream user-123, snapshot { stream_id, sequence_no: 500, state }; on load: fetch latest snapshot, replay events from sequence 501 onward. Decision rule: snapshot every N events or T time; store sequence_no with snapshot; on load apply snapshot then replay tail; invalidate old snapshots. Anti-example: replay all events from 0 on every aggregate load; O(n) read cost grows unboundedly." },
  { domain: "system.cqrs.read_model", title: "CQRS Read Model Design", concept: "Separate write model (commands) from optimized read model (queries) for independent scaling. Example: write side: CreateOrder command → OrderCreated event; read side: projection builds order_summary table with denormalized customer name; queries hit read table, not aggregate. Decision rule: commands mutate aggregates; aggregates emit events; projections update read tables; queries only touch read tables; deploy read/write sides independently. Anti-example: single normalized table serving both command validation and complex reporting queries." },

  // ── System: saga ─────────────────────────────────────────────────────────
  { domain: "system.saga.choreography", title: "Saga Choreography Pattern", concept: "Coordinate distributed transactions via domain events with no central orchestrator. Example: OrderCreated event → PaymentService processes payment → PaymentCompleted event → InventoryService reserves stock → StockReserved → saga complete. Each service owns its step and compensation. Decision rule: each service subscribes to trigger event; emits success or failure event; each service implements own compensation; no central coordinator. Anti-example: synchronous chain of service calls; one failure cascades and no compensation path." },
  { domain: "system.saga.compensation", title: "Saga Compensation Transactions", concept: "Define and execute compensating actions to undo completed saga steps on downstream failure. Example: saga steps [charge, ship, notify]; charge succeeds, ship fails → run compensate(charge) = issue_refund; emit SagaFailed; compensate idempotently using saga_id. Decision rule: each step has a named compensation; on failure run compensations in reverse order; make each compensation idempotent; log compensation events for audit. Anti-example: no compensation defined; system left in partial-success state after distributed failure." },

  // ── System: message brokers ──────────────────────────────────────────────
  { domain: "system.message_broker.kafka_consumer", title: "Kafka Consumer Group Design", concept: "Design consumer groups for parallel, ordered, and fault-tolerant message processing. Example: topic orders has 6 partitions; consumer group billing has 3 consumers; each consumer owns 2 partitions; partition-level ordering preserved; one consumer failure → Kafka rebalances. Decision rule: partition_count >= consumer_count; partition by ordering key; set max.poll.interval.ms > max processing time; handle rebalance gracefully. Anti-example: single consumer on a high-throughput topic; throughput capped at one consumer's processing rate." },
  { domain: "system.message_broker.offset_management", title: "Kafka Offset Commit Strategy", concept: "Commit offsets after processing to guarantee at-least-once delivery and enable crash recovery. Example: poll batch of 100 messages; process each; commit offset only after all 100 processed successfully; on consumer crash, re-process from last committed offset. Decision rule: disable auto-commit; process batch; commit synchronously after success; make consumers idempotent; dead-letter after max retries. Anti-example: auto-commit before processing; message lost if crash occurs between auto-commit and processing completion." },

  // ── System: API gateway ──────────────────────────────────────────────────
  { domain: "system.api_gateway.auth_delegation", title: "API Gateway Auth Delegation", concept: "Validate tokens at the gateway edge and forward verified identity to downstream services. Example: gateway validates JWT signature and expiry; extracts claims; adds X-User-Id and X-Roles headers; downstream services trust these headers only from gateway (mTLS or IP allowlist). Decision rule: validate token at edge; extract claims; forward as signed identity headers; downstream accept only from authenticated gateway. Anti-example: each microservice validates JWT independently; key distribution complexity grows with service count." },
  { domain: "system.api_gateway.rate_limiting", title: "API Gateway Rate Limiting", concept: "Enforce per-client and per-route request quotas at the gateway with sliding window counters. Example: limit 100 req/min per API key per route; sliding window in Redis; on exceed return 429 with Retry-After header indicating reset time; exempt internal services via allowlist. Decision rule: counter per (client_id, route) in Redis; sliding window; 429 + Retry-After on exceed; whitelist internal caller IPs. Anti-example: rate-limit by IP only; easily bypassed; no Retry-After header; clients retry immediately and amplify load." },

  // ── System: search ───────────────────────────────────────────────────────
  { domain: "system.search.inverted_index", title: "Inverted Index Construction", concept: "Build a term-to-document posting list for full-text search. Example: docs [A: 'fast retry', B: 'retry backoff']; tokenize and normalize; index = {fast:[A], retry:[A,B], backoff:[B]}; query 'retry' → fetch posting list [A, B]; rank by TF-IDF. Decision rule: tokenize; lowercase + stem; build posting list per term; store term frequency; support incremental updates. Anti-example: full-table scan matching LIKE '%term%' on every query." },
  { domain: "system.search.relevance_tuning", title: "Search Relevance Tuning", concept: "Score and rank search results using BM25 with field boosts and evaluate with NDCG. Example: query 'circuit breaker'; BM25 score per doc; boost title field 2×, tag field 1.5×; compute NDCG@10 on 50-query labeled set; iterate boost values. Decision rule: define scoring formula (BM25); add per-field boosts; build labeled eval set; measure NDCG@10; tune boosts; re-evaluate. Anti-example: return results in insertion order; no relevance scoring or evaluation metric." },

  // ── System: caching ──────────────────────────────────────────────────────
  { domain: "system.caching.cache_aside", title: "Cache-Aside Pattern", concept: "Application explicitly manages cache: read from cache, populate on miss, invalidate on write. Example: get user(id): check Redis → miss → load from Postgres → SET Redis key TTL 300s → return; on update user: write to Postgres → DEL Redis key. Decision rule: check cache; on miss load from DB and populate; on write invalidate cache; set TTL; handle cache failures gracefully (fall through to DB). Anti-example: always query DB with no cache; or populate cache without ever invalidating on writes." },
  { domain: "system.caching.write_through", title: "Write-Through Cache Pattern", concept: "Write to cache and DB synchronously on every mutation to maintain consistency. Example: update user email → write to Redis AND Postgres in same operation; read always hits Redis (no stale reads); accept higher write latency for read consistency. Decision rule: write both atomically; cache always matches DB; use when read consistency is critical and write latency is acceptable. Anti-example: write to DB only; cache reads stale data until TTL expires; suitable only for high-tolerance reads." },
  { domain: "system.caching.cache_stampede", title: "Cache Stampede Prevention", concept: "Prevent thundering herd when a popular cache key expires simultaneously for many clients. Example: 10k requests hit expired key; without mitigation → 10k DB queries simultaneously; mitigation: probabilistic early expiration (XFetch) or Redis lock (first thread regenerates, rest wait or serve stale). Decision rule: use probabilistic early refresh (delta * beta * log(ttl_remaining) > random); or mutex lock on miss; or background refresh with stale-while-revalidate. Anti-example: all concurrent requests hit DB on cache miss; DB overloaded; cascading failure." },
  { domain: "system.caching.ttl_strategy", title: "Cache TTL Strategy by Data Class", concept: "Assign TTL values based on data update frequency and staleness tolerance. Example: user session TTL 30m; product catalog TTL 1h; real-time pricing TTL 30s; static assets TTL 7d; classify data before setting TTL. Decision rule: inventory data classes; assign TTL by update frequency × staleness impact; monitor cache hit rate per class; adjust TTL on miss-rate change. Anti-example: uniform 1h TTL for all data regardless of volatility; stale pricing data causes revenue impact." },
  { domain: "system.caching.eviction_policy", title: "Cache Eviction Policy Selection", concept: "Choose LRU, LFU, or FIFO eviction to match the application's cache access pattern. Example: product catalog → allkeys-lru (recently viewed products evicted last); session data with TTL → volatile-ttl; hot static assets → allkeys-lfu (frequently accessed items retained). Decision rule: profile access pattern; LRU for recency-biased workloads; LFU for frequency-biased; set Redis maxmemory; monitor eviction rate; switch policy if hit rate drops. Anti-example: no eviction policy configured; cache grows unbounded until OOM kill." },

  // ── Data engineering ─────────────────────────────────────────────────────
  { domain: "data.lakehouse.delta_lake", title: "Delta Lake ACID Transaction Patterns", concept: "Use Delta Lake for ACID transactions and concurrent writes on object storage. Example: two writers attempt simultaneous updates; Delta uses optimistic concurrency via _delta_log transaction log; conflict detected → one writer retries; readers see consistent snapshot. Decision rule: write through Delta API; use MERGE for upserts; detect conflicts via _delta_log; compact small files with OPTIMIZE; vacuum old versions after retention window. Anti-example: raw Parquet overwrite on S3; concurrent writers produce inconsistent files; readers see partial writes." },
  { domain: "data.lakehouse.time_travel", title: "Lakehouse Time Travel Queries", concept: "Query historical table versions for auditing, debugging, and rollback. Example: Delta table; data incident discovered at 14:00; query: SELECT * FROM orders VERSION AS OF 42; or TIMESTAMP AS OF '2024-03-01 12:00:00'; restore: RESTORE TABLE orders TO VERSION AS OF 42. Decision rule: retain log history >= incident detection window (default 30 days); query by version or timestamp; restore on data incident rather than full backup restore. Anti-example: no version history retained; data incident requires hours of restore from cold backup." },
  { domain: "data.lakehouse.iceberg_format", title: "Apache Iceberg Table Format", concept: "Use Iceberg for schema evolution, partition evolution, and hidden partitioning without rewrites. Example: table partitioned by day(event_time); evolve: add nullable column user_agent → no rewrite; change partitioning to month(event_time) → new data uses new partition, old unchanged. Decision rule: use Iceberg for tables requiring schema or partition evolution; hidden partitioning simplifies queries; snapshot isolation for concurrent reads and writes. Anti-example: Hive-style partition in directory path; partition change requires full table rewrite." },
  { domain: "data.quality.data_contracts", title: "Data Contracts Between Producers and Consumers", concept: "Define and enforce schema agreements at the interface between data producers and consumers. Example: orders table contract: { order_id: string NOT NULL, amount: decimal(10,2), created_at: timestamp }; producer validates before publishing; consumer validates on ingest; contract break triggers pipeline alert and SLA breach. Decision rule: define contract as versioned schema file; validate at source on produce; validate at sink on consume; version with backwards-compatible evolution rules; alert on violation. Anti-example: implicit schema assumption; consumer discovers schema break at query time in production." },
  { domain: "data.quality.lineage", title: "Data Lineage Tracking", concept: "Record the origin and transformation path of every dataset for auditability and debugging. Example: raw_events → clean_events (filter nulls, step 1) → user_aggregates (group by user_id, step 2); each step emits lineage record: {input_datasets, transform_name, output_dataset, run_id, timestamp}. Decision rule: emit lineage event at each transform step; store in lineage graph; query graph to trace column from output back to raw source; audit column-level lineage for PII compliance. Anti-example: no lineage tracking; data quality issue origin untraceable; compliance audit fails." },
  { domain: "data.transformation.dbt_incremental", title: "dbt Incremental Model Patterns", concept: "Process only new or changed records in dbt to avoid full-table refreshes. Example: model with materialized='incremental', unique_key='order_id'; first run: full load; subsequent runs: WHERE updated_at > (SELECT MAX(updated_at) FROM {{this}}); merge on unique_key. Decision rule: set unique_key for dedup; define watermark filter with is_incremental() macro; choose merge strategy; test incremental and full-refresh produce identical output. Anti-example: full table refresh every run on 10B-row table; 3-hour dbt job blocks downstream models." },
  { domain: "data.transformation.idempotent_sql", title: "Idempotent SQL Transformation Design", concept: "Write SQL transforms that produce identical results when executed multiple times. Example: INSERT INTO target SELECT ... WHERE order_id NOT IN (SELECT order_id FROM target); or MERGE target USING source ON target.id=source.id WHEN NOT MATCHED THEN INSERT; running twice has no additional effect. Decision rule: use MERGE or INSERT WHERE NOT EXISTS; wrap in transaction; test idempotency with double-run assertion in CI. Anti-example: INSERT INTO without dedup guard; second run creates duplicate rows; data integrity broken." },
  { domain: "data.feature_store.serving_layer", title: "Feature Store Online Serving Layer", concept: "Serve precomputed ML features at low latency for real-time inference. Example: offline job computes user_avg_spend_30d daily → materializes to Redis keyed by user_id; inference service fetches user_avg_spend_30d from Redis in <5ms; feature freshness monitored; stale features flagged. Decision rule: compute offline; materialize to online store (Redis/DynamoDB); serve by entity key; monitor freshness and latency; fallback to default on miss. Anti-example: compute user_avg_spend_30d at inference time; SQL aggregation adds 500ms latency per request." },
  { domain: "data.streaming.windowing", title: "Stream Processing Window Types", concept: "Apply tumbling, sliding, or session windows to aggregate streaming events. Example: tumbling window 5 min: group clickstream events by 5-min intervals, emit count at window close. Session window with 30-min gap: group user activity into sessions, close on 30-min inactivity. Decision rule: tumbling for fixed-interval aggregates; sliding for moving averages; session for activity-based grouping; set allowed_lateness for late events. Anti-example: micro-batch aggregation without windowing semantics; results depend on arbitrary batch boundaries." },
  { domain: "data.streaming.late_event_handling", title: "Late Event Handling in Stream Processing", concept: "Handle events that arrive after their assigned window has closed without blocking progress. Example: watermark = max_event_time - 10min; events within watermark included in window; events 10-15min late accepted via allowed_lateness=5min; events >15min late routed to dead-letter topic. Decision rule: set watermark based on observed latency distribution; define allowed_lateness; emit corrections for late-but-accepted events; dead-letter beyond allowed lateness. Anti-example: drop all late events silently; or wait indefinitely causing window never to close." },

  // ── Security: supply chain and zero trust ────────────────────────────────
  { domain: "security.supply_chain.slsa", title: "SLSA Supply Chain Security Framework", concept: "Apply SLSA levels to verify artifact provenance and build integrity. Example: SLSA L2: build on hosted CI; generate signed provenance attestation (builder, repo, commit); consumer verifies provenance before deploy; L3: hermetic build with no network access during build. Decision rule: target SLSA L2+; generate signed provenance in CI; verify in CD pipeline before deploy; reject artifacts without valid provenance. Anti-example: deploy artifact without provenance check; supply chain compromise undetectable until post-incident." },
  { domain: "security.supply_chain.sbom", title: "Software Bill of Materials (SBOM)", concept: "Generate and track SBOMs for dependency vulnerability management and compliance. Example: npm build → syft generates CycloneDX SBOM; upload to Dependency-Track; CVE feed auto-alerts on new vulnerability matching any SBOM component; high CVE blocks next deploy. Decision rule: generate SBOM in CI on every build; upload to vulnerability tracker; alert on CVSS >= 7.0; block deploy if critical unpatched; export for compliance audit. Anti-example: no SBOM; CVE in transitive dependency undiscovered until exploitation." },
  { domain: "security.supply_chain.dependency_poisoning", title: "Dependency Confusion Attack Defense", concept: "Prevent attackers from serving malicious packages via public registry namespace squatting. Example: internal package @acme/utils; attacker publishes @acme/utils to npm public registry; npm resolves public over private if registry not scoped. Defense: configure .npmrc to scope @acme → private registry; verify package hash after install; use lockfile. Decision rule: scope internal namespaces to private registry in .npmrc; commit lockfile; verify integrity hash post-install; monitor for namespace squatting alerts. Anti-example: no scope configuration; npm resolves internal package names from public registry." },
  { domain: "security.zero_trust.microsegmentation", title: "Network Microsegmentation", concept: "Divide the network into granular segments with explicit per-segment allow lists. Example: segment: database tier; security group allows only app-tier CIDR on port 5432; denies all other inbound; enforced at network layer; rule changes require PR approval. Decision rule: inventory services and required communication paths; define allow-list per segment; deny-all default; enforce via security groups or policy engine; audit rule changes. Anti-example: flat VPC; any internal service can reach the database on any port." },
  { domain: "security.zero_trust.identity_first", title: "Identity-First Zero Trust Architecture", concept: "Authenticate and authorize every service-to-service call based on cryptographic identity, not network location. Example: service A calls service B; A presents mTLS client cert (SPIFFE ID) + short-lived JWT; B verifies cert SPIFFE ID matches expected workload and JWT claims before processing. Decision rule: every call carries identity credential; verify cryptographically; mTLS for service workloads; user JWT for user requests; deny without verified identity regardless of source IP. Anti-example: trust all traffic from within the VPC; internal calls bypass authentication." },
  { domain: "security.devsecops.sast_integration", title: "SAST Integration in CI Pipeline", concept: "Run static application security testing on every PR and gate merges on findings. Example: PR opened → semgrep runs against diff; CVSS high/critical finding → PR blocked; medium → comment added; low → logged to backlog; developer fixes before merge. Decision rule: run SAST on every PR; map severity to action (block/comment/log); require fix or documented exception for high+; track finding trend over releases. Anti-example: quarterly manual SAST scan; findings not tied to merge gate; critical vuln ships in release." },
  { domain: "security.incident_response.playbook", title: "Incident Response Playbook Design", concept: "Define structured response steps per incident type with assigned roles and time SLAs. Example: data breach playbook: 1. detect and acknowledge (<5 min); 2. isolate affected service; 3. preserve logs; 4. assess scope; 5. notify stakeholders and legal; 6. remediate; 7. post-mortem within 48h. Decision rule: define severity tiers (P1/P2/P3); per tier: acknowledgement SLA, escalation path, communication cadence, remediation steps. Anti-example: ad-hoc response per incident; responders improvise; scope assessment delayed; stakeholders uninformed." },
  { domain: "security.incident_response.forensics", title: "Digital Forensics for Security Incidents", concept: "Preserve and analyze evidence from a compromised system without contaminating it. Example: compromised host: take memory dump (LiME); disk image (dd); collect auth logs, syscall trace, network pcap; isolate host from network; analyze on forensic VM copy; document chain of custody. Decision rule: image before any remediation; collect logs; isolate host; analyze on copy (never original); document every action with timestamp for chain of custody. Anti-example: remediate immediately and wipe disk; evidence destroyed; root cause unresolvable; legal proceedings compromised." },

  // ── Agent debugging and optimization ────────────────────────────────────
  { domain: "agent.debugging.trace_analysis", title: "Agent Execution Trace Analysis", concept: "Reconstruct and analyze an agent's decision path from structured step logs. Example: trace [observe→plan→tool_call(search)→tool_result→decide→respond]; each step logged with {step_id, action, input_hash, output_summary, latency_ms, decision_rationale}; on failure: identify last good step, compare input hashes. Decision rule: log at every step boundary; include hashes and timing; on failure find divergence point; replay from last good step to verify fix. Anti-example: log only final output; step-level failure origin untraceable." },
  { domain: "agent.debugging.failure_taxonomy", title: "Agent Failure Mode Classification", concept: "Classify agent failures into categories to route to the correct fix strategy. Example: failure modes: [hallucination, tool_error, context_overflow, reasoning_loop, permission_denied]; classify by error signal (empty context → overflow; repeated action → loop); increment per-category counter; fix by category (prompt/code/config). Decision rule: capture error type and signal at runtime; map to taxonomy; aggregate per category; prioritize by frequency × severity. Anti-example: all failures logged as 'agent_error'; no classification; fixes are untargeted." },
  { domain: "agent.debugging.replay_debugging", title: "Agent Replay Debugging", concept: "Replay a recorded execution with a modified prompt or tool to isolate the cause of a failure. Example: execution E failed at step 3; record inputs I and tool_calls T; replay with same I + modified prompt P'; compare step-3 output to identify prompt as cause. Decision rule: record inputs, prompts, tool calls, and outputs deterministically; replay with seeded randomness; vary one factor at a time; diff outcomes to identify cause. Anti-example: debug only by re-running live; side effects differ each run; cannot isolate the changed variable." },
  { domain: "agent.optimization.token_efficiency", title: "Agent Token Efficiency Optimization", concept: "Reduce per-call token consumption without measurable quality loss. Example: baseline 4k tokens/call; profile: system prompt 800 tokens; compress to 300 by removing examples and using shorthand; eval quality on 50 tasks; if delta < 2%, accept; net saving 500 tokens × scale. Decision rule: measure baseline tokens/call by segment; compress largest segment first; eval quality on held-out task set; accept if delta within threshold; re-profile after each change. Anti-example: optimize token count without quality eval; quality regression ships to production." },
  { domain: "agent.optimization.latency_reduction", title: "Agent Latency Reduction Strategies", concept: "Profile per-step latency and apply targeted fixes (cache, parallelism, model swap). Example: baseline 3s; profile: LLM call 2s, tool_call 0.5s, overhead 0.5s; cache tool_call for repeated inputs; run LLM+independent tool in parallel; result: 1.2s. Decision rule: measure per-step latency; identify top bottleneck; apply targeted fix (cache/parallel/model-downgrade); measure delta; repeat. Anti-example: optimize without profiling; address non-bottleneck step; latency unchanged." },
  { domain: "agent.benchmarking.capability_eval", title: "Agent Capability Evaluation Suite", concept: "Measure agent performance per capability dimension on a held-out task suite. Example: dimensions [planning, tool_use, reasoning, code_generation]; 20 tasks each; score 0–1 per task; aggregate by dimension; compare baseline vs candidate agent; flag regressions per dimension. Decision rule: define task suite per capability dimension; score each task on defined rubric; aggregate; compare versions; block deploy on any dimension regression. Anti-example: single overall accuracy number; misses capability-specific regressions." },
  { domain: "agent.composition.capability_negotiation", title: "Agent Capability Negotiation Protocol", concept: "Advertise and match agent capabilities before delegating tasks in a multi-agent system. Example: orchestrator needs [semantic_search, code_review]; agent A manifest: [semantic_search, summarize]; agent B manifest: [code_review, lint]; match: delegate search to A, review to B; no matching agent → queue for general agent. Decision rule: agents publish typed capability manifest at registration; orchestrator matches task requirements to manifests; prefer specialist; fallback to general. Anti-example: hardcode agent-to-task assignments; new capabilities require code change to orchestrator." },
  { domain: "agent.state_machine.loop_detection", title: "Agent Execution Loop Detection", concept: "Detect and terminate cyclic execution patterns to prevent infinite loops. Example: agent at step N calls search('rate limiting'); step N+3 calls search('rate limiting') again with same args; hash(action, args) matches history entry → increment loop_counter; at threshold 3 → raise LoopDetected error. Decision rule: hash each (action, normalized_args) per execution; check against history set; on match increment counter; terminate at threshold; log detected cycle for analysis. Anti-example: no loop detection; agent runs until token budget exhausted or wall-clock timeout." },

  // ── Infrastructure ────────────────────────────────────────────────────────
  { domain: "infra.serverless.cold_start", title: "Serverless Cold Start Optimization", concept: "Reduce cold start latency by minimizing initialization overhead in function handlers. Example: Lambda cold start 1.2s baseline; profiled: 80MB bundle, DB connection inside handler; fix: tree-shake to 12MB; move DB connection outside handler to module scope; cold start → 280ms. Decision rule: measure cold start; profile init (bundle size, module load, connections); minimize bundle with tree-shaking; hoist expensive init outside handler; use provisioned concurrency for SLO-critical paths. Anti-example: import entire SDK when one method needed; initialize DB connection on every invocation." },
  { domain: "infra.serverless.event_driven", title: "Event-Driven Serverless Architecture", concept: "Chain serverless functions via event queues for decoupled, scalable workflows. Example: S3 upload event → Lambda processImage (idempotent by object key) → SQS message → Lambda resizeImage → DynamoDB write; each step idempotent. Decision rule: trigger on event; process idempotently using event ID as dedup key; emit output event; avoid direct function-to-function synchronous calls. Anti-example: Lambda A calls Lambda B synchronously; tight coupling; cascading timeouts when B is slow." },
  { domain: "infra.edge.cdn_strategy", title: "CDN Caching and Routing Strategy", concept: "Configure CDN cache rules per content type to maximize cache hit rate and correctness. Example: /static/*: Cache-Control: max-age=31536000, immutable; /api/*: Cache-Control: no-cache; /marketing/*: s-maxage=3600; CDN purge triggered on deploy for marketing pages. Decision rule: classify paths (static/API/dynamic); set Cache-Control per class; configure CDN routing; automate purge on deploy; test cache behavior in staging. Anti-example: default CDN config; API responses accidentally cached; stale data served to users." },
  { domain: "infra.service_mesh.mtls", title: "Mutual TLS in Service Mesh", concept: "Enforce encrypted and mutually authenticated service-to-service communication via sidecar proxies. Example: Istio PeerAuthentication STRICT mode on namespace; all pods get Envoy sidecar; sidecar terminates and initiates mTLS; plain HTTP between pods rejected with 403. Decision rule: set STRICT mTLS mode; verify sidecar injection on all pods; test plain HTTP is rejected; rotate certs via mesh certificate manager; monitor cert expiry. Anti-example: PERMISSIVE mode; plaintext traffic allowed; cannot distinguish authenticated from unauthenticated services." },
  { domain: "infra.secrets.vault_rotation", title: "Automated Secret Rotation with Vault", concept: "Rotate credentials on schedule without service downtime using Vault dynamic secrets. Example: DB password in Vault with TTL 24h; service fetches on startup and caches; Vault rotates DB password at TTL expiry; service re-fetches on next startup or on 401 from DB. Decision rule: store in Vault with TTL; service fetches on start + on auth failure; Vault rotates before TTL; revoke old lease on rotation confirm; audit all access. Anti-example: static password in environment variable; rotation requires redeploy and downtime." },
  { domain: "infra.kubernetes.resource_limits", title: "Kubernetes Resource Requests and Limits", concept: "Set CPU and memory requests and limits on every pod for reliable scheduling and isolation. Example: requests { cpu: 100m, memory: 128Mi }; limits { cpu: 500m, memory: 256Mi }; scheduler places pod on node with 100m CPU and 128Mi free; OOMKill fires if memory exceeds 256Mi. Decision rule: request = p50 usage; limit = p99 usage; monitor OOMKill events and CPU throttle percentage; adjust quarterly. Anti-example: no requests or limits; scheduler cannot place pods reliably; noisy neighbor exhausts node memory." },
  { domain: "infra.kubernetes.health_probes", title: "Kubernetes Liveness and Readiness Probes", concept: "Configure health probes to drive pod lifecycle and traffic routing correctly. Example: liveness: GET /healthz every 10s, fail 3× → restart; readiness: GET /ready every 5s, fail → remove from Service endpoints; startup: 30s initial delay for slow-init apps. Decision rule: liveness = is process alive (restart on fail); readiness = can serve traffic now (remove from LB on fail); startup probe for slow-init; tune thresholds to avoid false restarts. Anti-example: no probes; dead or unready pods receive traffic; rolling deploy sends requests to unready pods." },
  { domain: "infra.kubernetes.rollout_strategy", title: "Kubernetes Rolling Update Strategy", concept: "Configure rolling update parameters to achieve zero-downtime deploys with controlled pace. Example: 10 replicas; strategy: RollingUpdate, maxSurge: 1, maxUnavailable: 0; deploy adds 1 new pod (11 total), waits for readiness, removes 1 old pod; repeats until done. Decision rule: maxUnavailable=0 for zero-downtime; maxSurge=1 for controlled rollout; monitor with kubectl rollout status; automatic rollback on readiness probe failures. Anti-example: Recreate strategy (all pods killed before new start); full downtime during every deploy." },

  // ── Software engineering practices ───────────────────────────────────────
  { domain: "software.refactoring.strangler_fig", title: "Strangler Fig Migration Pattern", concept: "Incrementally replace a legacy system by routing traffic to new implementation one endpoint at a time. Example: legacy monolith handles /orders; build new service; add proxy routing /orders/v2 to new, /orders to legacy; migrate endpoints one at a time; verify parity; decommission monolith at 0% traffic. Decision rule: introduce facade/proxy; route one endpoint per sprint to new; verify functional parity; shift traffic; remove legacy endpoint after N days. Anti-example: big-bang rewrite; full cutover on day N; high risk, no rollback." },
  { domain: "software.refactoring.parallel_change", title: "Parallel Change (Expand-Contract) Pattern", concept: "Make breaking interface changes backwards-compatible by expanding then contracting in phases. Example: rename API field user_id → userId; phase 1: write both fields in response; phase 2: migrate all consumers to userId over 2 sprints; phase 3: remove user_id field. Decision rule: expand (add new alongside old); migrate all consumers; contract (remove old); deploy each phase independently without coordination. Anti-example: rename field in one deploy; existing consumers break immediately." },
  { domain: "software.refactoring.feature_flag_migration", title: "Feature Flag Migration Strategy", concept: "Use feature flags to decouple code deploy from feature release, enabling gradual rollout and instant rollback. Example: new checkout flow behind flag CHECKOUT_V2; deploy to 0%; ramp 5%→25%→100% over 3 weeks with metric gates; error rate increase → rollback flag instantly without redeploy. Decision rule: wrap new code path in flag; deploy at 0%; ramp with metric gates; full rollout; remove flag after 30 stable days. Anti-example: deploy feature to 100% on release day; rollback requires code revert and redeploy." },
  { domain: "software.concurrency.lock_free", title: "Lock-Free Data Structures with CAS", concept: "Implement concurrent data structures using compare-and-swap atomics to avoid lock contention. Example: lock-free counter: loop { old = count; if CAS(&count, old, old+1) break }; lock-free stack push: loop { old = head; new = Node(val, old); if CAS(&head, old, new) break }. Decision rule: use platform atomic CAS; retry loop on contention; validate ABA problem handling; test with thread sanitizer and stress test. Anti-example: mutex on every counter increment; lock contention becomes bottleneck under high concurrency." },
  { domain: "software.concurrency.actor_model", title: "Actor Model Concurrency Pattern", concept: "Encapsulate state in actors that communicate exclusively via async messages, eliminating shared-state races. Example: UserActor holds user state; receives UpdateEmail(newEmail) message; validates and updates state sequentially; sends EmailUpdated reply; no other actor touches user state directly. Decision rule: one actor per stateful entity; communicate only via typed messages; no shared mutable state; test with simulated message sequences and failure injection. Anti-example: shared HashMap<userId, User> accessed by multiple threads; requires locks; prone to deadlock." },
  { domain: "software.api_design.backwards_compat", title: "API Backwards Compatibility Rules", concept: "Evolve APIs without breaking existing clients by following strict additive-change rules. Example: adding optional response field: safe; adding required request field: breaking → new version; removing field: breaking → deprecate with sunset date first. Decision rule: additive changes only on existing version (add optional fields/endpoints); breaking changes → new version; deprecate old with Sunset header; monitor client adoption before sunset. Anti-example: remove or rename field on existing version; clients break without notice or migration path." },
  { domain: "software.dependency.vulnerability_scanning", title: "Dependency Vulnerability Scanning in CI", concept: "Scan third-party dependencies for known CVEs in CI and gate deploys on severity. Example: npm audit or Trivy in CI; CVSS >= 7.0 → block PR merge; CVSS 4–6.9 → add comment with remediation link; CVSS < 4 → log to backlog. Decision rule: scan on every PR and scheduled weekly; map CVSS to gate action; require fix or documented exception for high+; track SLA for remediation. Anti-example: manual quarterly scan; no merge gate; critical CVE in production undiscovered until exploit." },

  // ── DevOps ────────────────────────────────────────────────────────────────
  { domain: "devops.cicd.canary_deploy", title: "Canary Deployment Pattern", concept: "Deploy to a small user percentage first; validate metrics before progressive rollout. Example: deploy v2 to 5% of pods; monitor for 10 min: if error rate < 0.1% and p99 latency < 200ms → expand to 50%, then 100%; automated rollback on threshold breach. Decision rule: define canary size %; define health metric thresholds; automated rollback on breach; increment only on healthy canary; keep canary period >= one traffic peak cycle. Anti-example: deploy to 100% at once; no metric validation window; rollback requires redeploy." },
  { domain: "devops.cicd.rollback_strategy", title: "CI/CD Rollback Strategy Design", concept: "Define and test automated rollback paths for every production deploy. Example: deploy v2; readiness probe fails on > 20% pods → automated rollback to v1 image within 2 min; DB migration designed to be reversible; rollback script tested in staging every sprint. Decision rule: every deploy defines rollback path; automate trigger on health check failure; test rollback in staging; document DB rollback steps; verify rollback completes within SLO. Anti-example: manual rollback with no script; DB migration irreversible; rollback takes 45 min during incident." },
  { domain: "devops.monitoring.slo_definition", title: "Service Level Objective Definition", concept: "Define SLOs with measurable SLIs and error budgets to align reliability with business needs. Example: SLI = proportion of requests completing < 200ms; SLO = 99.9% over 30-day rolling window; error budget = 0.1% = 43 min/month; measure with Prometheus histogram. Decision rule: define SLI (metric); set target %; choose window (28 or 30 days); compute error budget; alert at 50% and 90% consumption; review quarterly. Anti-example: SLA only in contract with no internal SLO; reliability not measured until breach." },
  { domain: "devops.monitoring.error_budget", title: "Error Budget Policy", concept: "Use error budget consumption rate to gate feature deploys and trigger reliability sprints. Example: error budget 43 min/month; after 14 days, 35 min consumed (81%); trigger: freeze non-critical feature deploys; engineering switches to reliability backlog until budget resets. Decision rule: track budget consumption daily; alert at 50%; freeze feature work at 80% consumed; reliability sprint until budget recovered; resume normal cadence after reset. Anti-example: measure error budget but apply no policy; feature deploys continue regardless of reliability state." },
  { domain: "devops.monitoring.incident_response", title: "On-Call Incident Response Process", concept: "Define escalation, communication, and resolution steps for production incidents with SLAs per severity. Example: P1 alert fires → on-call acknowledges in 5 min; notify lead + stakeholders; 15-min update cadence; mitigate first then root-cause; post-mortem within 48h with corrective actions. Decision rule: define P1/P2/P3 with acknowledgement SLAs; escalate on breach; mitigation before root-cause for P1; mandatory post-mortem for P1; track corrective action completion. Anti-example: no severity tiers; on-call debugs root cause before mitigating; stakeholders uninformed during outage." },

  // ── Frontend ──────────────────────────────────────────────────────────────
  { domain: "frontend.react.component_patterns", title: "React Component Composition Patterns", concept: "Compose UIs from specialized patterns to separate data-fetching from rendering and avoid prop-drilling. Example: Container/Presentational: UserListContainer fetches users, passes to UserList (pure renderer); Compound component: Tabs wraps Tab children, manages active state via context. Decision rule: separate data-fetch from render; compound pattern for shared implicit state; render props or composition over prop-drilling beyond 2 levels. Anti-example: single component that fetches, transforms, and renders; cannot test rendering logic independently." },
  { domain: "frontend.react.state_management", title: "React State Management Strategy", concept: "Choose state location and tool by scope and update frequency to minimize unnecessary re-renders. Example: modal open/close → useState; server data → React Query (cache + dedupe); global auth state → Zustand; URL state → search params. Decision rule: local state first; server state with React Query; global UI state with Zustand; URL for shareable state; avoid Redux for apps without complex derived state. Anti-example: all state in Redux; every component re-renders on any state change; fetch logic in reducers." },
  { domain: "frontend.react.suspense_streaming", title: "React Suspense and Streaming SSR", concept: "Stream HTML progressively and hydrate incrementally using Suspense boundaries. Example: <Suspense fallback={<Spinner/>}><SlowDataComponent/></Suspense>; server streams HTML shell immediately; SlowDataComponent HTML streamed when data ready; client hydrates progressively as chunks arrive. Decision rule: wrap slow components in Suspense with meaningful fallback; use streaming SSR (Next.js App Router); test with throttled connection; avoid Suspense around fast components. Anti-example: wait for all data before sending any HTML; high TTFB; blank screen during slow data fetch." },
  { domain: "frontend.performance.core_web_vitals", title: "Core Web Vitals Optimization", concept: "Measure and improve LCP, INP, and CLS to meet Google's performance thresholds. Example: LCP = 4.2s (poor); root cause = hero image 800KB uncompressed; fix: convert to WebP 120KB, add fetchpriority='high', preload link; LCP → 1.6s (good); monitor with CrUX dashboard. Decision rule: measure with CrUX (real users) not only Lighthouse; identify root cause per metric; fix (image, layout shift, JS blocking); verify with RUM before/after. Anti-example: optimize Lighthouse lab score only; CrUX field data shows no improvement for real users." },
  { domain: "frontend.performance.bundle_splitting", title: "JavaScript Bundle Splitting and Lazy Loading", concept: "Split code by route and lazy-load non-critical chunks to reduce initial parse and execute time. Example: single bundle 820KB → route split: /dashboard → dashboardChunk.js (loaded on navigate), shared vendor chunk; initial bundle 820KB → 85KB; TTI improves 1.8s. Decision rule: split by route with dynamic import(); lazy-load below-fold features; extract vendor chunk; analyze with bundle analyzer; set size budget per chunk. Anti-example: single bundle including all routes and libraries; user downloads and parses everything on first page load." },

  // ── API design ────────────────────────────────────────────────────────────
  { domain: "api.rest.idempotency_design", title: "REST API Idempotency Design", concept: "Design mutating endpoints to be safe for client retries without duplicating side effects. Example: POST /payments with Idempotency-Key: uuid123 header; server stores (key → result) for 24h; retry with same key → return stored result without new charge. Decision rule: require Idempotency-Key on POST/PATCH; store (key, result) on first execution; return stored on duplicate key; expire after 24h; document key uniqueness requirements. Anti-example: POST /payments with no idempotency; network timeout + client retry → double charge." },
  { domain: "api.rest.pagination_patterns", title: "REST API Pagination Patterns", concept: "Paginate large collections with cursor or keyset pagination for correctness and performance. Example: cursor-based: GET /items?after=cursor_abc&limit=20; response: { items: [...], next_cursor: 'cursor_xyz' }; client follows next_cursor until null. Decision rule: cursor-based for real-time feeds (stable under inserts); keyset for sorted tables; offset for admin UIs with page navigation; always include next link or cursor. Anti-example: return all records in one response; or OFFSET-based on large table (full scan to offset position)." },
  { domain: "api.rest.error_contracts", title: "REST API Error Response Contract", concept: "Standardize error response shape across all endpoints for consistent client error handling. Example: all errors return HTTP status + { error: { code: 'VALIDATION_ERROR', message: 'human readable', details: [{field: 'email', issue: 'invalid format'}] } }; 400 for client errors; 500 for server. Decision rule: standardize on RFC 7807 Problem Detail or custom schema; use HTTP status correctly; include machine-readable code; include field-level details for validation errors. Anti-example: 200 OK with { success: false, msg: 'failed' }; clients cannot use HTTP status; no field-level detail." },
  { domain: "api.graphql.dataloader_pattern", title: "GraphQL DataLoader Batching Pattern", concept: "Batch database calls within a request using DataLoader to eliminate N+1 query problems. Example: query 10 posts each with author field; without DataLoader: 10 SELECT * FROM users WHERE id=?; with DataLoader: batch into SELECT * FROM users WHERE id IN (...); 1 query. Decision rule: one DataLoader per entity type per request; collect keys per tick; batch into one query; cache within request lifetime; never share DataLoader across requests. Anti-example: call DB in resolver for each parent item; 100-item list → 101 queries." },
  { domain: "api.graphql.schema_federation", title: "GraphQL Schema Federation with Apollo", concept: "Compose a unified graph from independently deployed subgraph services. Example: Users subgraph owns User type with @key(fields: 'id'); Orders subgraph references User with @external; gateway merges; client queries user.orders across subgraphs transparently. Decision rule: define @key on shared entities; use @external and @requires for cross-subgraph fields; each subgraph independently deployable and testable; gateway handles composition. Anti-example: monolithic schema in one service; scaling one domain requires deploying the entire graph." },
  { domain: "api.graphql.subscription_design", title: "GraphQL Subscription Design", concept: "Implement real-time subscriptions with pub/sub backend, authentication, and backpressure. Example: subscription OnOrderUpdated(orderId: ID!); server uses Redis pub/sub; on order update → publish to channel → filter by orderId → push to subscriber WebSocket; limit 500 concurrent subscribers per server; drop slow subscribers after buffer full. Decision rule: pub/sub backend for fan-out; filter events per subscriber; authenticate at connection time; apply backpressure (drop or buffer); monitor active subscriber count. Anti-example: poll query every second to simulate real-time; server load grows linearly with clients and polling interval." },
];

// ── Path setup ────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const STAGING_PENDING      = join(__dirname, "..", "staging", "pending");
const STAGING_PRE_REFINED  = join(__dirname, "..", "staging", "pre-refined");  // Stage 1 validate output
const STAGING_REFINED      = join(__dirname, "..", "staging", "refined");
const STAGING_VALIDATED    = join(__dirname, "..", "staging", "validated");     // Stage 2 validate output
const STAGING_MARGINAL     = join(__dirname, "..", "staging", "marginal");
const STAGING_FAILED       = join(__dirname, "..", "staging", "failed");
const STAGING_DOCUMENTATION = join(__dirname, "..", "staging", "documentation");
const ARTIFACTS_DIR = join(__dirname, "..", "artifacts");

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(): {
  mode: string;
  maxCount: number;
  targetTotal: number;
  dryRun: boolean;
  allowSimilarTitle: boolean;
  task: string;
  highImpactSeeds: boolean;
  seedsCombined: boolean;
  universalSeeds: boolean;
  deepSeeds: boolean;
  allLayers: boolean;
  webSeeds: boolean;
  frontendDeepSeeds: boolean;
  failureDebugSeeds: boolean;
  verificationSeeds: boolean;
  invariantSeeds: boolean;
  antipatternSeeds: boolean;
  blueprintSeeds: boolean;
  upgradeConcurrency: number;
  aiConcurrency: number;
  upgradeModel: string;
  topK: number;
  topArtifacts: number;
  ontologySplit: boolean;
} {
  const args = process.argv.slice(2);

  let mode = "all";
  let maxCount = 10000;
  let targetTotal = TARGET_TOTAL;
  let dryRun = false;
  let allowSimilarTitle = false;
  let task = "";
  let highImpactSeeds = false;
  let seedsCombined = false;
  let universalSeeds = false;
  let deepSeeds = false;
  let allLayers = false;
  let webSeeds = false;
  let frontendDeepSeeds = false;
  let failureDebugSeeds = false;
  let verificationSeeds = false;
  let invariantSeeds = false;
  let antipatternSeeds = false;
  let blueprintSeeds = false;
  let upgradeConcurrency = 5;
  let aiConcurrency = 10;
  let upgradeModel = "";
  let topK = 20;
  let topArtifacts = 15;
  let ontologySplit = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--mode" && args[i + 1]) {
      mode = args[++i];
    } else if (arg.startsWith("--mode=")) {
      mode = arg.split("=")[1];
    } else if (arg === "--count" && args[i + 1]) {
      maxCount = parseInt(args[++i], 10);
    } else if (arg.startsWith("--count=")) {
      maxCount = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--target" && args[i + 1]) {
      targetTotal = parseInt(args[++i], 10);
    } else if (arg.startsWith("--target=")) {
      targetTotal = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--allow-similar-title") {
      allowSimilarTitle = true;
    } else if (arg === "--high-impact") {
      highImpactSeeds = true;
    } else if (arg === "--seeds-combined") {
      seedsCombined = true;
    } else if (arg === "--universal") {
      universalSeeds = true;
    } else if (arg === "--deep") {
      deepSeeds = true;
    } else if (arg === "--all-layers") {
      allLayers = true;
    } else if (arg === "--web") {
      webSeeds = true;
    } else if (arg === "--frontend-deep") {
      frontendDeepSeeds = true;
    } else if (arg === "--failure-debug") {
      failureDebugSeeds = true;
    } else if (arg === "--verification") {
      verificationSeeds = true;
    } else if (arg === "--invariants") {
      invariantSeeds = true;
    } else if (arg === "--antipatterns") {
      antipatternSeeds = true;
    } else if (arg === "--blueprint") {
      blueprintSeeds = true;
    } else if (arg === "--concurrency" && args[i + 1]) {
      upgradeConcurrency = parseInt(args[++i], 10) || 5;
    } else if (arg === "--ai-concurrency" && args[i + 1]) {
      aiConcurrency = Math.min(parseInt(args[++i], 10) || 10, 20);
    } else if (arg === "--model" && args[i + 1]) {
      upgradeModel = args[++i];
    } else if (arg === "--task" && args[i + 1]) {
      task = args[++i];
    } else if (arg.startsWith("--task=")) {
      task = arg.split("=").slice(1).join("=").replace(/^["']|["']$/g, "");
    } else if (arg === "--top-k" && args[i + 1]) {
      topK = parseInt(args[++i], 10) || 20;
    } else if (arg.startsWith("--top-k=")) {
      topK = parseInt(arg.split("=")[1], 10) || 20;
    } else if (arg === "--top-artifacts" && args[i + 1]) {
      topArtifacts = parseInt(args[++i], 10) || 15;
    } else if (arg.startsWith("--top-artifacts=")) {
      topArtifacts = parseInt(arg.split("=")[1], 10) || 15;
    } else if (arg === "--split") {
      ontologySplit = true;
    }
  }

  const allowedModes = [
    "seeds", "derived", "expansion", "ai-seeds", "repair", "scan-quality", "grade-seeds",
    "export-capability-index", "routing-debug", "execution-plan", "expand-procedures", "repair-kb",
    "upgrade-seeds", "audit-kb", "grade-report", "repair-marginal", "analyze-artifacts", "validate-artifacts", "report-hubs", "export-concept-taxonomy", "generate-documentation", "retrieve", "export-ontology", "all",
  ];
  if (!allowedModes.includes(mode)) {
    console.error(`Unknown mode: ${mode}. Must be ${allowedModes.join(" | ")}`);
    process.exit(1);
  }

  if (isNaN(maxCount) || maxCount <= 0) {
    console.error(`Invalid --count value. Must be a positive integer.`);
    process.exit(1);
  }
  if (isNaN(targetTotal) || targetTotal <= 0) targetTotal = TARGET_TOTAL;

  return { mode, maxCount, targetTotal, dryRun, allowSimilarTitle, task, highImpactSeeds, seedsCombined, universalSeeds, deepSeeds, allLayers, webSeeds, frontendDeepSeeds, failureDebugSeeds, verificationSeeds, invariantSeeds, antipatternSeeds, blueprintSeeds, upgradeConcurrency, aiConcurrency, upgradeModel, topK, topArtifacts, ontologySplit };
}

// ── Main ──────────────────────────────────────────────────────────────────────

function getDepthForStats(r: QueueRecord): number {
  return r.artifact?.provenance?.lineage?.depth ?? (r.isSeed ? 0 : 1);
}

/** Cap depth for display (legacy artifacts may have bogus depth); L5 = "5 or more". */
const MAX_DEPTH_DISPLAY = 5;

function stats(pool: QueueRecord[]): void {
  const byDepth: Record<number, number> = {};
  const byDomain: Record<string, number> = {};
  const hashToDomain = new Map<string, string>();
  for (const r of pool) {
    const d = getDepthForStats(r);
    const capped =
      typeof d === "number" && Number.isFinite(d) ? Math.min(Math.max(0, d), MAX_DEPTH_DISPLAY) : 0;
    byDepth[capped] = (byDepth[capped] ?? 0) + 1;
    const dom = r.artifact?.semantic?.domain ?? "unknown";
    byDomain[dom] = (byDomain[dom] ?? 0) + 1;
    hashToDomain.set(r.kbHash, dom);
  }
  const depthOrder = Object.entries(byDepth)
    .map(([d, n]) => [Number(d), n] as const)
    .sort((a, b) => a[0] - b[0]);
  const depthStr = depthOrder.map(([d, n]) => `L${d}${d === MAX_DEPTH_DISPLAY ? "+" : ""}=${n}`).join(", ");
  console.log(`  By depth: ${depthStr}`);
  const domains = Object.entries(byDomain).sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log(`  Top domains: ${domains.map(([d, n]) => `${d}=${n}`).join(", ")}`);

  const derived = pool.filter((r) => getDepthForStats(r) >= 1);
  if (derived.length > 0) {
    let crossDomain = 0;
    let totalParents = 0;
    const childCount = new Map<string, number>();
    for (const r of pool) childCount.set(r.kbHash, 0);
    for (const r of derived) {
      const used = r.artifact?.knowledge_inputs?.used ?? [];
      totalParents += used.length;
      const roots = new Set(used.map((u) => (hashToDomain.get(u.kb_id) ?? "").split(".")[0]).filter(Boolean));
      if (roots.size >= 2) crossDomain++;
      for (const u of used) childCount.set(u.kb_id, (childCount.get(u.kb_id) ?? 0) + 1);
    }
    const avgParents = (totalParents / derived.length).toFixed(1);
    const crossPct = ((100 * crossDomain) / derived.length).toFixed(0);
    const totalChildRefs = [...childCount.values()].reduce((a, b) => a + b, 0);
    const avgChildren = pool.length > 0 ? (totalChildRefs / pool.length).toFixed(1) : "0";
    console.log(`  Derived: ${derived.length}; cross-domain: ${crossPct}%; avg parents: ${avgParents}; avg children/node: ${avgChildren}`);
  }
}

const ROUTING_DEBUG_SAMPLE_TASK =
  "Find vulnerabilities in this Solidity contract and suggest secure patterns.";

async function main(): Promise<void> {
  const { mode, maxCount, targetTotal, dryRun, allowSimilarTitle, task, highImpactSeeds, seedsCombined, universalSeeds, deepSeeds, allLayers, webSeeds, frontendDeepSeeds, failureDebugSeeds, verificationSeeds, invariantSeeds, antipatternSeeds, blueprintSeeds, upgradeConcurrency, aiConcurrency, upgradeModel, topK, topArtifacts, ontologySplit } = parseArgs();

  console.log(`\nAlexandrian KB Generator (KBv2.6)`);
  console.log(`  mode   : ${mode}`);
  console.log(`  limit  : ${maxCount} KBs per run`);
  console.log(`  target : ${targetTotal} (expansion)`);
  if (dryRun) console.log(`  dryRun : true`);
  if (allowSimilarTitle) console.log(`  allowSimilarTitle : true`);
  console.log(`  output : ${STAGING_PENDING}\n`);

  if (mode === "export-capability-index") {
    const pool = loadQueue(STAGING_PENDING);
    const v24 = pool.filter((r) => r.artifact?.semantic?.domain != null);
    const index = buildCapabilityIndex(v24);
    const out: Record<string, CapabilityIndexEntry[]> = {};
    for (const cap of getCapabilityNames()) {
      const records = index.get(cap) ?? [];
      out[cap] = records.map((r) => toCapabilityIndexEntry(r));
    }
    const outPath = join(STAGING_PENDING, "..", "capability-index.json");
    writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");
    console.log(`Capability index written to ${outPath} (${getCapabilityNames().length} capabilities, ${v24.length} KBs)`);
    return;
  }

  if (mode === "routing-debug") {
    const pool = loadQueue(STAGING_PENDING);
    const v24 = pool.filter((r) => r.artifact?.semantic?.domain != null);
    if (v24.length === 0) {
      console.log("No KBs in staging. Run seeds or expansion first.");
      return;
    }
    const index = buildCapabilityIndex(v24);
    const neighborMap = buildNeighborMap(v24);
    const taskText = (task && task.trim()) || ROUTING_DEBUG_SAMPLE_TASK;

    console.log("Task:\n  " + taskText);
    const subtasks = decomposeTask(taskText);
    if (subtasks.length > 1) {
      console.log("\nDecomposition:");
      subtasks.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    }

    const scoreByCap = new Map<string, number>();
    for (const st of subtasks) {
      const routed = routeTaskToCapabilities(st, ROUTER_MIN_CONFIDENCE);
      for (const { capability, score } of routed) {
        const cur = scoreByCap.get(capability) ?? 0;
        if (score > cur) scoreByCap.set(capability, score);
      }
    }
    const merged: { capability: string; score: number }[] = [...scoreByCap.entries()]
      .filter(([, s]) => s > ROUTER_MIN_CONFIDENCE)
      .map(([capability, score]) => ({ capability, score }))
      .sort((a, b) => b.score - a.score);

    console.log("\nRouter (score > " + ROUTER_MIN_CONFIDENCE + "):");
    merged.forEach((r) => console.log(`  ${r.capability} (${r.score.toFixed(2)})`));
    if (merged.length === 0) {
      console.log("  (no capabilities above threshold)");
      return;
    }

    const routedForRetrieval = merged.map((r) => ({ capability: r.capability, score: r.score }));
    let candidates = getRecordsForRoutedCapabilities(index, routedForRetrieval);
    console.log("\nCandidate KBs per capability:");
    for (const { capability } of routedForRetrieval) {
      const list = index.get(capability) ?? [];
      console.log(`  ${capability} → ${list.length}`);
    }
    console.log("\nAfter retrieval: " + candidates.length + " procedures");

    const beforeExpand = candidates.length;
    candidates = expandWithGraphNeighbors(v24, candidates, neighborMap, 8);
    if (candidates.length > beforeExpand) {
      console.log("After graph expansion: " + candidates.length + " procedures");
    }

    const shortlistSize = Math.min(8, candidates.length);
    const shortlist = [...candidates]
      .sort((a, b) => getProceduralQualityScore(b) - getProceduralQualityScore(a))
      .slice(0, shortlistSize);
    console.log("\nShortlist (top " + shortlistSize + " by procedural quality):");
    shortlist.forEach((r, i) => {
      const title = (r.artifact?.identity?.title ?? "").slice(0, 60) || r.kbHash.slice(0, 16);
      console.log(`  ${i + 1}. ${title}`);
    });

    const plan = buildExecutionPlanOrder(shortlist);
    console.log("\nExecution plan (interface-chained order):");
    plan.forEach((r, i) => {
      const title = (r.artifact?.identity?.title ?? "").slice(0, 50) || r.kbHash.slice(0, 12);
      console.log(`  ${i + 1}. ${title}`);
    });
    return;
  }

  if (mode === "execution-plan") {
    const taskText = (task && task.trim()) || "design a web application";
    const t = taskText.toLowerCase();
    const taskToDomain: [RegExp | string, string][] = [
      [/web|frontend|saas|dashboard|rest api|graphql/i, "web_engineering"],
      [/distributed|microservice|event.driven|streaming/i, "distributed_systems"],
      [/machine learning|ml pipeline|model train|inference/i, "machine_learning"],
      [/data pipeline|etl|data engineering/i, "data_engineering"],
      [/scientific|research|experiment/i, "scientific_research"],
      [/algorithm|complexity/i, "algorithm_engineering"],
      [/secure|security|threat|auth/i, "security_engineering"],
      [/ci\/cd|devops|deploy|pipeline/i, "devops"],
      [/monitoring|observability|logging|tracing/i, "observability"],
      [/testing|test strategy|reliability/i, "testing_reliability"],
      [/ux|user experience|usability/i, "product_ux"],
      [/software architecture|architecture design|modular/i, "software_architecture"],
    ];
    let matchedDomain = "software_architecture";
    for (const [pattern, domain] of taskToDomain) {
      if (typeof pattern === "string" ? t.includes(pattern) : pattern.test(taskText)) {
        matchedDomain = domain;
        break;
      }
    }
    const plans = getExecutionPlansForDomain(matchedDomain);
    console.log("Task: " + taskText);
    console.log("Matched domain: " + matchedDomain);
    if (plans.length === 0) {
      console.log("\nNo execution plan for this domain. Available plan_ids: " + EXECUTION_PLAN_NODES.map((n) => n.plan_id).join(", "));
      return;
    }
    for (const node of plans) {
      console.log("\nExecution plan: " + node.plan_id);
      if (node.description) console.log("  " + node.description);
      console.log("  Steps:");
      node.steps.forEach((s, i) => console.log("    " + (i + 1) + ". " + s));
      console.log("  Required skills: " + node.required_skills.join(", "));
      console.log("  Attach KB clusters: " + node.attached_kb_clusters.join(", "));
    }
    return;
  }

  if (mode === "upgrade-seeds") {
    console.log("Upgrade seeds: pending → AI normalization → validation → repair → refined | marginal | failed");
    const result = await runUpgradeSeedsPipeline({
      pendingDir: STAGING_PENDING,
      refinedDir: STAGING_REFINED,
      marginalDir: STAGING_MARGINAL,
      failedDir: STAGING_FAILED,
      count: maxCount,
      concurrency: upgradeConcurrency,
      model: upgradeModel || undefined,
      dryRun,
    });
    const total = result.total || result.upgraded + result.failed + result.marginal + result.skipped;
    console.log(
      `Upgraded: ${result.upgraded}, marginal: ${result.marginal}, failed: ${result.failed}, skipped: ${result.skipped} (total: ${total})`
    );
    if (result.errors.length > 0) {
      console.log("Errors (first 20):");
      result.errors.slice(0, 20).forEach((e) => console.log(`  ${e.kbHash.slice(0, 12)}… ${e.error}`));
    }
    if (!dryRun) {
      if (result.upgraded > 0) console.log(`Refined: ${STAGING_REFINED}`);
      if (result.marginal > 0) console.log(`Marginal (repair queue): ${STAGING_MARGINAL}`);
      if (result.failed > 0) console.log(`Failed: ${STAGING_FAILED}`);
    }
    // Exit code contract for CI / automated runs
    if (total > 0) {
      const failRate = result.failed / total;
      const marginalRate = result.marginal / total;
      const { maxFailRate, maxMarginalRate } = QUALITY_CONFIG.pipelineAlerts;
      if (failRate > maxFailRate) {
        console.error(
          `QUALITY GATE FAILED: ${(failRate * 100).toFixed(1)}% failed (threshold: ${maxFailRate * 100}%)`
        );
        process.exit(1);
      }
      if (marginalRate > maxMarginalRate) {
        console.warn(
          `QUALITY WARNING: ${(marginalRate * 100).toFixed(1)}% marginal (threshold: ${maxMarginalRate * 100}%) — marginals in repair queue`
        );
      }
    }
    return;
  }

  if (mode === "analyze-artifacts") {
    const records = loadQueue(STAGING_PENDING);
    if (records.length === 0) {
      console.log("No seeds in staging/pending. Run seeds or ai-seeds first.");
      return;
    }
    const result = analyzeSeedsForArtifacts(records);
    printArtifactAnalysisSummary(result);
    return;
  }

  if (mode === "generate-documentation") {
    const records = loadQueue(STAGING_PENDING);
    if (records.length === 0) {
      console.log("No KBs in staging. Run seeds or expansion first.");
      return;
    }
    if (!existsSync(STAGING_DOCUMENTATION)) mkdirSync(STAGING_DOCUMENTATION, { recursive: true });
    let written = 0;
    for (const record of records) {
      const doc = createDocumentationArtifactFromKb(record);
      const filename = `artifact_documentation_${record.kbHash}.json`;
      writeFileSync(join(STAGING_DOCUMENTATION, filename), JSON.stringify(doc, null, 2), "utf-8");
      written++;
    }
    console.log(`Documentation artifacts written: ${written} → ${STAGING_DOCUMENTATION}`);
    return;
  }

  if (mode === "retrieve") {
    const taskText = (task ?? "").trim();
    if (!taskText) {
      console.error("--mode retrieve requires --task \"...\" (e.g. --task \"design authentication system\")");
      process.exit(1);
    }
    const pool = loadQueue(STAGING_PENDING);
    if (pool.length === 0) {
      console.log("No KBs in staging. Run seeds or expansion first.");
      return;
    }
    const result = retrieve(taskText, pool, { topK, topArtifacts });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (mode === "export-concept-taxonomy") {
    const outPath = join(STAGING_PENDING, "..", "concept-taxonomy.json");
    const payload = {
      schema: "alexandrian.concept_taxonomy.v1",
      domains: CONCEPT_DOMAINS,
      concepts: CONCEPT_TAXONOMY,
      relationships: CONCEPT_RELATIONSHIPS,
      count: CONCEPT_TAXONOMY.length,
    };
    writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf-8");
    console.log(`Concept taxonomy written to ${outPath} (${CONCEPT_TAXONOMY.length} concepts, ${CONCEPT_RELATIONSHIPS.length} relationships)`);
    return;
  }

  if (mode === "export-ontology") {
    const ontology = buildKnowledgeOntology();
    const validation = validateOntology(ontology);
    if (!validation.valid) {
      console.error("Ontology validation failed:");
      validation.errors.forEach((e) => console.error(`  ${e}`));
      process.exit(1);
    }
    const stagingDir = join(STAGING_PENDING, "..");
    if (ontologySplit) {
      const ontologyDir = join(stagingDir, "ontology");
      if (!existsSync(ontologyDir)) mkdirSync(ontologyDir, { recursive: true });
      writeFileSync(join(ontologyDir, "domains.json"), JSON.stringify({ schema: ontology.schema, ontology_version: ontology.ontology_version, domains: ontology.domains }, null, 2), "utf-8");
      writeFileSync(join(ontologyDir, "concepts.json"), JSON.stringify({ schema: ontology.schema, ontology_version: ontology.ontology_version, concepts: ontology.concepts }, null, 2), "utf-8");
      writeFileSync(join(ontologyDir, "relationships.json"), JSON.stringify({ schema: ontology.schema, ontology_version: ontology.ontology_version, relationships: ontology.relationships }, null, 2), "utf-8");
      writeFileSync(join(ontologyDir, "techniques.json"), JSON.stringify({ schema: ontology.schema, ontology_version: ontology.ontology_version, techniques: ontology.techniques }, null, 2), "utf-8");
      writeFileSync(join(ontologyDir, "invariants.json"), JSON.stringify({ schema: ontology.schema, ontology_version: ontology.ontology_version, invariants: ontology.invariants }, null, 2), "utf-8");
      console.log(`Ontology written to ${ontologyDir}/ (domains, concepts, relationships, techniques, invariants)`);
    } else {
      const outPath = join(stagingDir, "ontology.json");
      writeFileSync(outPath, JSON.stringify(ontology, null, 2), "utf-8");
      console.log(`Ontology written to ${outPath} (${ontology.concepts.length} concepts, ${ontology.relationships.length} relationships, ${ontology.techniques.length} techniques, ${ontology.invariants.length} invariants)`);
    }
    return;
  }

  if (mode === "report-hubs") {
    const records = loadQueue(STAGING_PENDING);
    if (records.length === 0) {
      console.log("No KBs in staging. Run seeds or expansion first.");
      return;
    }
    const hubs = getHubs(records, MAX_CHILDREN_SOFT);
    if (hubs.length === 0) {
      console.log(`No hubs detected (no artifact has >= ${MAX_CHILDREN_SOFT} children).`);
      return;
    }
    console.log(`Potential hubs (>= ${MAX_CHILDREN_SOFT} children) — review for quality and balance:\n`);
    for (const h of hubs) {
      console.log(`  ${h.kb_id}  children=${h.childCount}  domain=${h.domain ?? "-"}  title=${h.title ?? "-"}`);
    }
    console.log(`\nTotal: ${hubs.length} artifact(s) flagged. Consider rebalancing parent selection during expansion.`);
    return;
  }

  if (mode === "validate-artifacts") {
    if (!existsSync(ARTIFACTS_DIR)) {
      console.log("Artifacts dir not found:", ARTIFACTS_DIR);
      return;
    }
    const files = readdirSync(ARTIFACTS_DIR).filter((f) => f.endsWith(".json") && f !== "artifact-index.json");
    let ok = 0;
    let fail = 0;
    for (const file of files) {
      const path = join(ARTIFACTS_DIR, file);
      const raw = readFileSync(path, "utf-8");
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch (e) {
        console.log(`[FAIL] ${file}: invalid JSON`);
        fail++;
        continue;
      }
      const result = validateUniversalArtifact(json);
      if (result.valid) {
        console.log(`[OK] ${file}`);
        ok++;
      } else {
        console.log(`[FAIL] ${file}:`, result.errors.join("; "));
        fail++;
      }
    }
    console.log(`\nUniversal Artifact Schema validation: ${ok} passed, ${fail} failed (${files.length} files)`);
    return;
  }

  if (mode === "audit-kb") {
    const buckets: { dir: string; label: string; severity: "blocking" | "informational" | "diagnostic" }[] = [
      { dir: STAGING_REFINED, label: "staging/refined", severity: "blocking" },
      { dir: STAGING_MARGINAL, label: "staging/marginal", severity: "informational" },
      { dir: STAGING_FAILED, label: "staging/failed", severity: "diagnostic" },
    ];
    let totalIssues = 0;
    for (const { dir, label, severity } of buckets) {
      const audit: AuditResult = auditRefinedKb(dir);
      console.log(`\n[${severity}] ${label}: ${audit.total} entries, ${audit.issues.length} issue(s)`);
      if (audit.issues.length > 0) {
        totalIssues += audit.issues.length;
        const byKind: Record<string, number> = {};
        for (const i of audit.issues) {
          byKind[i.kind] = (byKind[i.kind] ?? 0) + 1;
          console.log(`  [${i.kind}] ${i.file}: ${i.message}`);
        }
        console.log(`  By kind: ${JSON.stringify(byKind)}`);
        if (audit.duplicateGroups.length > 0) {
          console.log(`  Duplicate procedure groups: ${audit.duplicateGroups.length}`);
        }
      }
    }
    if (totalIssues === 0) console.log("\nNo issues found across refined, marginal, and failed.");
    return;
  }

  if (mode === "grade-report") {
    await runGradeReport({
      refined: STAGING_REFINED,
      marginal: STAGING_MARGINAL,
      failed: STAGING_FAILED,
      reportsDir: join(__dirname, "..", "staging", "reports"),
    });
    return;
  }

  // ── Two-stage quality gate ────────────────────────────────────────────────
  //
  // Stage 1: staging/pending/ → validateArtifact() → staging/pre-refined/  (or staging/failed/)
  //   Structural gate on the full KBv24Artifact. Catches schema violations before
  //   the expensive AI upgrade-seeds pass runs.
  //
  // Stage 2: staging/refined/ → validateUpgradedEntry() → staging/validated/ (or staging/failed/)
  //   Quality gate on the flat UpgradedKBEntry produced by upgrade-seeds.
  //   Ensures procedure length, summary, references, and verification fields meet
  //   the bar required for publishing.
  //
  // publish.mjs should read from staging/validated/ (or refined/ as fallback).
  // Run: node dist/index.js --mode validate [--dry-run]
  //
  if (mode === "validate") {
    mkdirSync(STAGING_PRE_REFINED, { recursive: true });
    mkdirSync(STAGING_VALIDATED,   { recursive: true });
    mkdirSync(STAGING_FAILED,      { recursive: true });

    // ── Stage 1: pending/ → structural validation → pre-refined/ or failed/ ──
    const pendingFiles = existsSync(STAGING_PENDING)
      ? readdirSync(STAGING_PENDING).filter((f) => f.endsWith(".json"))
      : [];

    let s1Pass = 0, s1Fail = 0;
    console.log(`\nStage 1: structural validation of ${pendingFiles.length} pending KBs`);

    for (const file of pendingFiles) {
      const srcPath = join(STAGING_PENDING, file);
      let record: unknown;
      try {
        record = JSON.parse(readFileSync(srcPath, "utf-8"));
      } catch {
        console.error(`  [error] ${file}: invalid JSON — moving to failed/`);
        if (!dryRun) {
          writeFileSync(
            join(STAGING_FAILED, file),
            JSON.stringify({ _file: file, _stage: 1, errors: ["invalid JSON"] }, null, 2),
            "utf-8"
          );
        }
        s1Fail++;
        continue;
      }

      const artifact = (record as Record<string, unknown>).artifact ?? record;
      const result = validateArtifact(artifact);

      if (result.valid) {
        if (!dryRun) {
          // Write annotated copy to pre-refined/, then remove original from pending/
          writeFileSync(
            join(STAGING_PRE_REFINED, file),
            JSON.stringify({ ...(record as object), _stage1_validated: true }, null, 2),
            "utf-8"
          );
          unlinkSync(srcPath);
        }
        s1Pass++;
        console.log(`  [pass] ${file.slice(0, 20)}…`);
      } else {
        if (!dryRun) {
          // Write annotated failure to failed/, remove original from pending/
          writeFileSync(
            join(STAGING_FAILED, file),
            JSON.stringify({ ...(record as object), _stage: 1, _errors: result.errors }, null, 2),
            "utf-8"
          );
          unlinkSync(srcPath);
        }
        s1Fail++;
        console.log(`  [fail] ${file.slice(0, 20)}… ${result.errors.slice(0, 2).join("; ")}`);
      }
    }

    console.log(`  Stage 1 done: ${s1Pass} pass → pre-refined/, ${s1Fail} fail → failed/\n`);

    // ── Stage 2: refined/ → quality validation → validated/ or failed/ ──────
    const refinedFiles = existsSync(STAGING_REFINED)
      ? readdirSync(STAGING_REFINED).filter((f) => f.endsWith(".json"))
      : [];

    let s2Pass = 0, s2Fail = 0;
    console.log(`Stage 2: quality validation of ${refinedFiles.length} refined KBs`);

    for (const file of refinedFiles) {
      const srcPath = join(STAGING_REFINED, file);
      let entry: unknown;
      try {
        entry = JSON.parse(readFileSync(srcPath, "utf-8"));
      } catch {
        console.error(`  [error] ${file}: invalid JSON — moving to failed/`);
        if (!dryRun) {
          writeFileSync(
            join(STAGING_FAILED, file),
            JSON.stringify({ _file: file, _stage: 2, errors: ["invalid JSON"] }, null, 2),
            "utf-8"
          );
        }
        s2Fail++;
        continue;
      }

      // Discriminate between QueueRecord (has .artifact field) and UpgradedKBEntry (flat).
      // Stage 2 can only quality-gate UpgradedKBEntry; QueueRecord files pass through
      // (they belong to Stage 1 / upgrade-seeds, not the quality gate).
      const entryObj = entry as Record<string, unknown>;
      const isQueueRecord = entryObj.artifact !== undefined && typeof entryObj.artifact === "object";

      if (isQueueRecord) {
        // QueueRecord: use Stage 1 structural validator on the artifact field
        const structResult = validateArtifact(entryObj.artifact);
        if (structResult.valid) {
          if (!dryRun) {
            writeFileSync(
              join(STAGING_VALIDATED, file),
              JSON.stringify({ ...entryObj, _stage2_validated: true, _type: "QueueRecord" }, null, 2),
              "utf-8"
            );
          }
          s2Pass++;
          console.log(`  [pass/QR] ${file.slice(0, 20)}…`);
        } else {
          if (!dryRun) {
            writeFileSync(
              join(STAGING_FAILED, file),
              JSON.stringify({ ...entryObj, _stage: 2, _type: "QueueRecord", _errors: structResult.errors }, null, 2),
              "utf-8"
            );
          }
          s2Fail++;
          console.log(`  [fail/QR] ${file.slice(0, 20)}… ${structResult.errors.slice(0, 2).join("; ")}`);
        }
        continue;
      }

      // UpgradedKBEntry: run quality gate
      const result = validateUpgradedEntry(entry);

      if (result.valid) {
        if (!dryRun) {
          writeFileSync(
            join(STAGING_VALIDATED, file),
            JSON.stringify({ ...entryObj, _stage2_validated: true }, null, 2),
            "utf-8"
          );
        }
        s2Pass++;
        console.log(`  [pass] ${file.slice(0, 20)}…`);
      } else {
        if (!dryRun) {
          writeFileSync(
            join(STAGING_FAILED, file),
            JSON.stringify({ ...entryObj, _stage: 2, _errors: result.errors }, null, 2),
            "utf-8"
          );
        }
        s2Fail++;
        console.log(`  [fail] ${file.slice(0, 20)}… ${result.errors.slice(0, 2).join("; ")}`);
      }
    }

    console.log(`  Stage 2 done: ${s2Pass} pass → validated/, ${s2Fail} fail → failed/\n`);

    const total = s1Pass + s1Fail + s2Pass + s2Fail;
    const failRate = total > 0 ? ((s1Fail + s2Fail) / total * 100).toFixed(1) : "0.0";
    console.log(`── Validate summary ──────────────────────────────────────`);
    console.log(`  Stage 1 (structural): ${s1Pass} pass, ${s1Fail} fail`);
    console.log(`  Stage 2 (quality):    ${s2Pass} pass, ${s2Fail} fail`);
    console.log(`  Overall fail rate:    ${failRate}%`);
    if (dryRun) console.log(`  [dry-run] no files written`);
    return;
  }

  if (mode === "repair-marginal") {
    const { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } = await import("fs");
    const { join } = await import("path");
    const { scoreDimensions } = await import("./lib/pipeline/score-and-repair-pipeline.js");
    const { QUALITY_CONFIG } = await import("./lib/core/quality-config.js");
    if (!existsSync(STAGING_MARGINAL)) {
      console.log("No staging/marginal directory.");
      return;
    }
    const files = readdirSync(STAGING_MARGINAL).filter((f) => f.endsWith(".json"));
    let promoted = 0;
    for (const file of files) {
      const path = join(STAGING_MARGINAL, file);
      let parsed: { _quality?: { classification: string }; domain?: string };
      try {
        parsed = JSON.parse(readFileSync(path, "utf-8"));
      } catch {
        continue;
      }
      const entry = { ...parsed };
      delete (entry as Record<string, unknown>)._quality;
      const scores = scoreDimensions(entry as import("./lib/upgraded-kb-entry.js").UpgradedKBEntry);
      if (scores.classification !== "standard" && scores.classification !== "anchor") continue;
      const recordToWrite = {
        ...entry,
        ...(parsed.domain != null && parsed.domain !== "" ? { domain: parsed.domain } : {}),
        _quality: {
          score: scores.weighted,
          classification: scores.classification,
          dimensions: {
            executability: scores.executability,
            atomicity: scores.atomicity,
            epistemicHonesty: scores.epistemicHonesty,
            depth: scores.depth,
          },
          failureReasons: scores.failureReasons,
          scoredAt: new Date().toISOString(),
        },
      };
      const outPath = join(STAGING_REFINED, file);
      if (!existsSync(STAGING_REFINED)) {
        const { mkdirSync } = await import("fs");
        mkdirSync(STAGING_REFINED, { recursive: true });
      }
      writeFileSync(outPath, JSON.stringify(recordToWrite, null, 2), "utf-8");
      unlinkSync(path);
      promoted++;
    }
    console.log(`repair-marginal: promoted ${promoted} to staging/refined (re-scored; no AI repair).`);
    return;
  }

  if (mode === "expand-procedures") {
    const { unlinkSync, existsSync } = await import("fs");
    let records = loadQueue(STAGING_PENDING);
    const weak = records.filter((r) => isWeakProcedure(r.artifact));
    let expandedCount = 0;
    const errors: string[] = [];
    for (const record of weak) {
      const expanded = expandProcedure(record.artifact);
      if (expanded === record.artifact) continue;
      const repaired = repairKB(expanded);
      const consistency = validateStepInterfaceConsistency(repaired);
      if (!consistency.valid) {
        errors.push(`[${record.kbHash.slice(0, 10)}…] ${consistency.errors.join("; ")}`);
        continue;
      }
      const validation = validateArtifact(repaired);
      if (!validation.valid) {
        errors.push(`[${record.kbHash.slice(0, 10)}…] ${validation.errors.join("; ")}`);
        continue;
      }
      const otherRecords = records.filter((r) => r.kbHash !== record.kbHash);
      const dedupSet = buildDedupSet(otherRecords);
      const fpSet = buildContentFingerprintSet(otherRecords);
      let newRecord: QueueRecord;
      try {
        newRecord = buildRecord(repaired, dedupSet, fpSet);
      } catch (e) {
        errors.push(`[${record.kbHash.slice(0, 10)}…] ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
      if (newRecord.kbHash === record.kbHash) continue;
      if (!dryRun) {
        const oldPath = join(STAGING_PENDING, `${record.kbHash}.json`);
        if (existsSync(oldPath)) {
          try {
            unlinkSync(oldPath);
          } catch (e) {
            errors.push(`[${record.kbHash}] remove failed: ${e instanceof Error ? e.message : String(e)}`);
            continue;
          }
        }
        writeRecord(STAGING_PENDING, newRecord);
        records = records.map((r) => (r.kbHash === record.kbHash ? newRecord : r));
      }
      expandedCount += 1;
    }
    console.log(`Expand procedures: ${expandedCount} expanded (${weak.length} weak, ${records.length} total)`);
    if (errors.length > 0) errors.forEach((e) => console.error("  ", e));
    return;
  }

  if (mode === "repair-kb") {
    const { unlinkSync, existsSync } = await import("fs");
    let records = loadQueue(STAGING_PENDING);
    let repairedCount = 0;
    const errors: string[] = [];
    const oldHashToNew = new Map<string, string>();

    for (const record of records) {
      let artifact = repairKB(record.artifact);
      artifact = expandProcedure(artifact);
      const consistency = validateStepInterfaceConsistency(artifact);
      if (!consistency.valid) {
        errors.push(`[${record.kbHash.slice(0, 10)}…] ${consistency.errors.join("; ")}`);
        continue;
      }
      const validation = validateArtifact(artifact);
      if (!validation.valid) {
        errors.push(`[${record.kbHash.slice(0, 10)}…] ${validation.errors.join("; ")}`);
        continue;
      }
      const otherRecords = records.filter((r) => r.kbHash !== record.kbHash);
      const dedupSet = buildDedupSet(otherRecords);
      const fpSet = buildContentFingerprintSet(otherRecords);
      let newRecord: QueueRecord;
      try {
        newRecord = buildRecord(artifact, dedupSet, fpSet);
      } catch (e) {
        errors.push(`[${record.kbHash.slice(0, 10)}…] ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
      if (newRecord.kbHash === record.kbHash) continue;
      if (!dryRun) {
        const oldPath = join(STAGING_PENDING, `${record.kbHash}.json`);
        if (existsSync(oldPath)) {
          try {
            unlinkSync(oldPath);
          } catch (e) {
            errors.push(`[${record.kbHash}] remove failed: ${e instanceof Error ? e.message : String(e)}`);
            continue;
          }
        }
        writeRecord(STAGING_PENDING, newRecord);
        records = records.map((r) => (r.kbHash === record.kbHash ? newRecord : r));
        oldHashToNew.set(record.kbHash, newRecord.kbHash);
      }
      repairedCount += 1;
    }

    while (oldHashToNew.size > 0 && !dryRun) {
      let remapped = 0;
      const nextMap = new Map<string, string>();
      for (const record of records) {
        const used = record.artifact?.knowledge_inputs?.used ?? [];
        const newUsed = used.map((u) => {
          const newId = oldHashToNew.get(u.kb_id);
          return newId ? { ...u, kb_id: newId } : u;
        });
        const hasChange = used.some((u, i) => newUsed[i].kb_id !== u.kb_id);
        if (!hasChange) continue;
        const updatedArtifact = {
          ...record.artifact,
          knowledge_inputs: { ...record.artifact.knowledge_inputs, used: newUsed },
        };
        const validation = validateArtifact(updatedArtifact);
        if (!validation.valid) {
          errors.push(`[${record.kbHash.slice(0, 10)}…] remap: ${validation.errors.join("; ")}`);
          continue;
        }
        const otherRecords = records.filter((r) => r.kbHash !== record.kbHash);
        const dedupSet = buildDedupSet(otherRecords);
        const fpSet = buildContentFingerprintSet(otherRecords);
        let newRecord: QueueRecord;
        try {
          newRecord = buildRecord(updatedArtifact, dedupSet, fpSet);
        } catch (e) {
          errors.push(`[${record.kbHash.slice(0, 10)}…] remap: ${e instanceof Error ? e.message : String(e)}`);
          continue;
        }
        if (newRecord.kbHash === record.kbHash) continue;
        const oldPath = join(STAGING_PENDING, `${record.kbHash}.json`);
        if (existsSync(oldPath)) {
          try {
            unlinkSync(oldPath);
          } catch (e) {
            errors.push(`[${record.kbHash}] remap remove failed: ${e instanceof Error ? e.message : String(e)}`);
            continue;
          }
        }
        writeRecord(STAGING_PENDING, newRecord);
        records = records.map((r) => (r.kbHash === record.kbHash ? newRecord : r));
        nextMap.set(record.kbHash, newRecord.kbHash);
        remapped += 1;
      }
      if (remapped === 0) break;
      repairedCount += remapped;
      oldHashToNew.clear();
      nextMap.forEach((v, k) => oldHashToNew.set(k, v));
    }

    console.log(`Repair KB: ${repairedCount} rewritten (${records.length} total)`);
    if (errors.length > 0) errors.forEach((e) => console.error("  ", e));
    return;
  }

  if (mode === "repair") {
    const result = runRepairPass(STAGING_PENDING, { dryRun });
    console.log(`Repair pass: repaired=${result.repaired}, skipped=${result.skipped}`);
    if (result.errors.length > 0) {
      result.errors.forEach((e) => console.error("  ", e));
    }
    const pool = loadQueue(STAGING_PENDING);
    if (pool.length > 0) {
      console.log("\nStaging queue after repair:");
      stats(pool);
    }
    return;
  }

  if (mode === "scan-quality") {
    const pool = loadQueue(STAGING_PENDING);
    const seeds = pool.filter((r) => r.artifact?.identity?.is_seed === true);
    const low = seeds.filter((r) => {
      const { score } = seedQualityReasons(r.artifact);
      return score < SEED_QUALITY_MIN_SCORE;
    });
    console.log(`Seed quality scan (min score ${SEED_QUALITY_MIN_SCORE}/8)`);
    console.log(`  Total seeds: ${seeds.length}`);
    console.log(`  Low quality: ${low.length}`);
    if (low.length > 0) {
      console.log("\nLow-quality seeds:");
      for (const r of low) {
        const { score, missing } = seedQualityReasons(r.artifact);
        const title = (r.artifact?.identity?.title ?? "").slice(0, 50) || "(no title)";
        const domain = r.artifact?.semantic?.domain ?? "?";
        console.log(`  ${r.kbHash.slice(0, 18)}…  score=${score}  domain=${domain}  "${title}"`);
        console.log(`    missing: ${missing.join(", ")}`);
      }
    }
    return;
  }

  if (mode === "grade-seeds") {
    const pool = loadQueue(STAGING_PENDING);
    const seeds = pool.filter((r) => r.artifact?.identity?.is_seed === true);
    if (seeds.length === 0) {
      console.log("No seeds in staging queue.");
      return;
    }
    const qualityScores = seeds.map((r) => seedQualityScore(r.artifact));
    const specScores = seeds.map((r) => proceduralSpecificityScore(r.artifact));
    const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / seeds.length;
    const avgSpec = specScores.reduce((a, b) => a + b.score, 0) / seeds.length;
    const composite = seeds.map((_, i) => (qualityScores[i] + specScores[i].score) / 2);
    const avgComposite = composite.reduce((a, b) => a + b, 0) / seeds.length;

    const hist = (scores: number[], max: number) => {
      const h: Record<number, number> = {};
      for (let i = 0; i <= max; i++) h[i] = 0;
      for (const s of scores) h[Math.round(s)] = (h[Math.round(s)] ?? 0) + 1;
      return h;
    };
    const qualityHist = hist(qualityScores, 8);
    const specHist = specScores.map((r) => r.score);
    const specHistAgg = hist(specHist, 8);

    const meetingQuality = seeds.filter((_, i) => qualityScores[i] >= SEED_QUALITY_MIN_SCORE).length;
    const meetingSpec = seeds.filter((_, i) => specScores[i].score >= PROCEDURAL_SPECIFICITY_MIN_SCORE).length;

    const breakdown = {
      withTitle: seeds.filter((r) => (r.artifact?.identity?.title ?? "").trim() && r.artifact.identity.title !== "Untitled").length,
      tagsGe3: seeds.filter((r) => (r.artifact?.semantic?.tags?.length ?? 0) >= 3).length,
      withSuccess: seeds.filter((r) => (r.artifact?.validation?.success_conditions?.length ?? 0) > 0).length,
      withFailure: seeds.filter((r) => (r.artifact?.validation?.failure_conditions?.length ?? 0) > 0).length,
      specVerbs: specScores.filter((_, i) => specScores[i].breakdown.specificVerbs).length,
      explicitInputs: specScores.filter((_, i) => specScores[i].breakdown.explicitInputs).length,
      domainVars: specScores.filter((_, i) => specScores[i].breakdown.domainVars).length,
    };

    const gradeFromComposite = (c: number) => {
      if (c >= 7) return "A";
      if (c >= 6) return "B";
      if (c >= 5) return "C";
      if (c >= 4) return "D";
      return "F";
    };
    const letterGrade = gradeFromComposite(avgComposite);

    console.log("═══════════════════════════════════════════════════════════");
    console.log("  SEED QUALITY GRADE REPORT");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  Total seeds: ${seeds.length}`);
    console.log("");
    console.log("  Composite grade (quality + procedural specificity):");
    console.log(`    Average composite: ${avgComposite.toFixed(2)} / 8.0`);
    console.log(`    Letter grade:     ${letterGrade}`);
    console.log("");
    console.log("  Seed quality score (0–8): title, tags≥3, validation, steps, consistency, domain");
    console.log(`    Average: ${avgQuality.toFixed(2)}  |  ≥${SEED_QUALITY_MIN_SCORE}: ${meetingQuality}/${seeds.length} (${((100 * meetingQuality) / seeds.length).toFixed(0)}%)`);
    console.log(`    Distribution: ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `${i}=${qualityHist[i] ?? 0}`).join("  ")}`);
    console.log("");
    console.log("  Procedural specificity (0–8): specific verbs, inputs, outputs, chaining, domain vars, step count");
    console.log(`    Average: ${avgSpec.toFixed(2)}  |  ≥${PROCEDURAL_SPECIFICITY_MIN_SCORE}: ${meetingSpec}/${seeds.length} (${((100 * meetingSpec) / seeds.length).toFixed(0)}%)`);
    console.log(`    Distribution: ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `${i}=${specHistAgg[i] ?? 0}`).join("  ")}`);
    console.log("");
    console.log("  Dimension breakdown (% of seeds):");
    console.log(`    With title: ${((100 * breakdown.withTitle) / seeds.length).toFixed(0)}%  |  Tags ≥3: ${((100 * breakdown.tagsGe3) / seeds.length).toFixed(0)}%`);
    console.log(`    Success conditions: ${((100 * breakdown.withSuccess) / seeds.length).toFixed(0)}%  |  Failure conditions: ${((100 * breakdown.withFailure) / seeds.length).toFixed(0)}%`);
    console.log(`    Specific action verbs: ${((100 * breakdown.specVerbs) / seeds.length).toFixed(0)}%  |  Non-generic inputs: ${((100 * breakdown.explicitInputs) / seeds.length).toFixed(0)}%`);
    console.log(`    Domain-relevant vars: ${((100 * breakdown.domainVars) / seeds.length).toFixed(0)}%`);
    console.log("");

    const ranked = seeds.map((r, i) => ({ record: r, composite: composite[i], quality: qualityScores[i], spec: specScores[i].score }));
    ranked.sort((a, b) => b.composite - a.composite);
    console.log("  Top 5 seeds (by composite score):");
    for (const { record, composite, quality, spec } of ranked.slice(0, 5)) {
      const title = (record.artifact?.identity?.title ?? "").slice(0, 45) || "(no title)";
      console.log(`    ${composite.toFixed(1)}  Q:${quality} P:${spec}  ${record.artifact?.semantic?.domain ?? "?"}  "${title}"`);
    }
    console.log("");
    console.log("  Bottom 5 seeds (by composite score):");
    for (const { record, composite, quality, spec } of ranked.slice(-5).reverse()) {
      const title = (record.artifact?.identity?.title ?? "").slice(0, 45) || "(no title)";
      console.log(`    ${composite.toFixed(1)}  Q:${quality} P:${spec}  ${record.artifact?.semantic?.domain ?? "?"}  "${title}"`);
    }
    console.log("═══════════════════════════════════════════════════════════");
    return;
  }

  let seedsWritten = 0;
  let derivedWritten = 0;
  let expansionWritten = 0;
  let seedsSkipped = 0;
  let derivedSkipped = 0;
  let totalWritten = 0;

  // ── Phase 1: Seeds ────────────────────────────────────────────────────────

  if (mode === "seeds" || mode === "all") {
    console.log(`Phase 1: generating seed KBs (${ALL_SEED_TEMPLATES.length} templates)`);

    const existing = loadQueue(STAGING_PENDING);
    const dedupSet = buildDedupSet(existing);
    const existingV24 = existing.filter((r) => r.artifact?.semantic?.domain != null);
    const contentFingerprintSet = buildContentFingerprintSet(existingV24);

    // Build claim index for Jaccard near-duplicate detection (activates dormant check in buildRecord)
    const claimIndex = new Map<string, string>();
    for (const r of existingV24) {
      const fp = contentFingerprint(r.artifact);
      const claim = (r.artifact?.claim?.statement ?? "").toLowerCase();
      if (fp && claim) claimIndex.set(fp, claim);
    }

    for (const template of ALL_SEED_TEMPLATES) {
      if (totalWritten >= maxCount) {
        console.log(`  [limit reached] stopping at ${maxCount} KBs`);
        break;
      }

      try {
        const record = buildRecord(template, dedupSet, contentFingerprintSet, claimIndex);
        writeRecord(STAGING_PENDING, record);
        dedupSet.add(record.kbHash);
        const fp = contentFingerprint(record.artifact);
        if (fp) contentFingerprintSet.add(fp);
        seedsWritten++;
        totalWritten++;
        console.log(
          `  [seed] ${record.kbHash.slice(0, 12)}... ` +
            `${record.domain} / ${record.artifact.identity.epistemic_type} — ` +
            `"${record.artifact.identity.title}"`
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (
          message.startsWith("DUPLICATE_ENVELOPE") ||
          message.startsWith("DUPLICATE_CONTENT") ||
          message.startsWith("NEAR_DUPLICATE")
        ) {
          seedsSkipped++;
          console.log(
            `  [skip] duplicate: ${template.semantic.domain} / ${template.identity.title}`
          );
        } else {
          console.error(
            `  [error] ${template.semantic.domain} / ${template.identity.title}: ${message}`
          );
        }
      }
    }

    console.log(`\n  Seeds written : ${seedsWritten}`);
    console.log(`  Seeds skipped : ${seedsSkipped} (duplicates)\n`);
  }

  // ── Phase 1b: AI-generated seeds ───────────────────────────────────────────

  if (mode === "ai-seeds") {
    const seedSpecs: SeedSpec[] = allLayers
      ? [
          ...AI_SEED_SPECS,
          ...HIGH_IMPACT_SEED_SPECS,
          ...UNIVERSAL_ENGINEERING_SEED_SPECS,
          ...DEEP_REASONING_SEED_SPECS,
          ...WEB_ENGINEERING_SEED_SPECS,
          ...FRONTEND_DEEP_SEED_SPECS,
          ...FAILURE_DEBUG_SEED_SPECS,
          ...VERIFICATION_SEED_SPECS,
          ...INVARIANT_SEED_SPECS,
          ...ANTIPATTERN_SEED_SPECS,
          ...SAAS_FULLSTACK_BLUEPRINT_SEED_SPECS,
          ...DATABASE_ENGINEERING_SEED_SPECS,
          ...ML_MLOPS_SEED_SPECS,
          ...WEB3_ONCHAIN_SEED_SPECS,
          ...COLLABORATIVE_REALTIME_SEED_SPECS,
          ...DEVELOPER_TOOLING_SEED_SPECS,
          ...FINANCIAL_SYSTEMS_SEED_SPECS,
          ...COMPILER_LANGUAGE_TOOLS_SEED_SPECS,
          ...PRODUCT_EXPERIMENTATION_SEED_SPECS,
          ...AI_SAFETY_RED_TEAMING_SEED_SPECS,
          ...MOBILE_ENGINEERING_SEED_SPECS,
          ...SEARCH_IR_SEED_SPECS,
          ...PLATFORM_INFRASTRUCTURE_SEED_SPECS,
          ...DATA_MESH_LAKEHOUSE_SEED_SPECS,
          ...PROTOCOL_NETWORK_DESIGN_SEED_SPECS,
          ...CONTENT_CMS_MEDIA_SEED_SPECS,
          ...GAME_DEVELOPMENT_SEED_SPECS,
          ...EMBEDDED_IOT_SEED_SPECS,
          ...DEVELOPER_EXPERIENCE_SEED_SPECS,
          ...KNOWLEDGE_GRAPH_SEMANTIC_SEED_SPECS,
          ...RAG_SYSTEMS_SEED_SPECS,
          ...CYBERSECURITY_SEED_SPECS,
          ...CRYPTOGRAPHY_APPLIED_SEED_SPECS,
          ...ACCESSIBILITY_ENGINEERING_SEED_SPECS,
          ...OBSERVABILITY_TELEMETRY_SEED_SPECS,
          ...AUTH_ACCESS_CONTROL_SEED_SPECS,
          ...PERFORMANCE_ENGINEERING_SEED_SPECS,
          ...KNOWLEDGE_SYSTEMS_SEED_SPECS,
          ...API_DESIGN_PATTERNS_SEED_SPECS,
          ...DISTRIBUTED_SYSTEMS_PATTERNS_SEED_SPECS,
          ...AI_AGENT_TASK_PLANNING_SEED_SPECS,
          ...SOFTWARE_ENGINEERING_EXTENDED_SEED_SPECS,
          ...OPEN_SOURCE_SYSARCH_SEED_SPECS,
          ...ACADEMIC_ALGORITHMS_SEED_SPECS,
          ...POSTMORTEM_RUNBOOK_SEED_SPECS,
          ...BENCHMARKING_EVALUATION_SEED_SPECS,
          ...REGULATORY_COMPLIANCE_SEED_SPECS,
          ...CICD_PIPELINE_SEED_SPECS,
          ...PERFORMANCE_TUNING_GUIDES_SEED_SPECS,
        ]
      : blueprintSeeds
        ? SAAS_FULLSTACK_BLUEPRINT_SEED_SPECS
        : failureDebugSeeds
        ? FAILURE_DEBUG_SEED_SPECS
        : verificationSeeds
          ? VERIFICATION_SEED_SPECS
          : invariantSeeds
            ? INVARIANT_SEED_SPECS
            : antipatternSeeds
              ? ANTIPATTERN_SEED_SPECS
              : webSeeds
                ? WEB_ENGINEERING_SEED_SPECS
                : frontendDeepSeeds
                  ? FRONTEND_DEEP_SEED_SPECS
                  : universalSeeds
                    ? UNIVERSAL_ENGINEERING_SEED_SPECS
                    : deepSeeds
                      ? DEEP_REASONING_SEED_SPECS
                      : seedsCombined
                        ? [...AI_SEED_SPECS, ...HIGH_IMPACT_SEED_SPECS]
                        : highImpactSeeds
                          ? HIGH_IMPACT_SEED_SPECS
                          : AI_SEED_SPECS;
    const layerLabel =
      allLayers
        ? " [all-layers]"
        : blueprintSeeds
          ? " [blueprint]"
          : failureDebugSeeds
            ? " [failure-debug]"
            : verificationSeeds
              ? " [verification]"
              : invariantSeeds
                ? " [invariants]"
                : antipatternSeeds
                  ? " [antipatterns]"
                  : webSeeds
                    ? " [web]"
                    : frontendDeepSeeds
                      ? " [frontend-deep]"
                      : universalSeeds
                        ? " [universal]"
                        : deepSeeds
                          ? " [deep]"
                          : highImpactSeeds
                            ? " [high-impact]"
                            : seedsCombined
                              ? " [combined]"
                              : "";
    console.log(`Phase 1b: generating seeds via OpenAI (${Math.min(seedSpecs.length, maxCount)} specs${layerLabel})`);
    const existing = loadQueue(STAGING_PENDING);
    const v24 = existing.filter((r) => r.artifact?.semantic?.domain != null);
    const dedupSet = buildDedupSet(v24);
    const contentFingerprintSet = buildContentFingerprintSet(v24);
    const triangleRegistry = buildTriangleRegistry(v24);

    const toGenerate = seedSpecs.slice(0, maxCount);
    console.log(`  Concurrency: ${aiConcurrency} parallel OpenAI calls`);

    // Process specs in concurrent batches. JS single-threaded event loop ensures
    // dedup set mutations are race-free: Promise callbacks execute sequentially.
    for (let batchStart = 0; batchStart < toGenerate.length && totalWritten < maxCount; batchStart += aiConcurrency) {
      const batch = toGenerate.slice(batchStart, batchStart + aiConcurrency);
      const results = await Promise.allSettled(
        batch.map((spec) => generateSeedFromSpec(spec, { epistemicType: sampleEpistemicType() }))
      );

      for (let j = 0; j < results.length; j++) {
        if (totalWritten >= maxCount) break;
        const spec = batch[j];
        const result = results[j];

        if (result.status === "rejected") {
          const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
          if (message.includes("DUPLICATE_ENVELOPE") || message.includes("DUPLICATE_CONTENT")) {
            console.log(`  [skip] duplicate: ${spec.domain} / ${spec.title}`);
          } else {
            console.error(`  [error] ${spec.domain} / ${spec.title}: ${message}`);
          }
          continue;
        }

        try {
          let artifact = repairKB(result.value);
          const domain = artifact.semantic?.domain ?? spec.domain;
          const title = (artifact.identity?.title ?? "").trim();
          if (!allowSimilarTitle && title && titleTooSimilarInDomain(title, domain, v24)) {
            console.log(
              `  [skip] title too similar to existing in domain: "${title.slice(0, 50)}..." (${spec.domain})`
            );
            continue;
          }
          const record = buildRecord(artifact, dedupSet, contentFingerprintSet);
          if (isDuplicateTriangle(record.artifact, triangleRegistry)) {
            console.log(`  [skip] duplicate knowledge triangle: ${spec.domain} / ${spec.title}`);
            continue;
          }
          addTriangleToRegistry(record.artifact, triangleRegistry);
          writeRecord(STAGING_PENDING, record);
          dedupSet.add(record.kbHash);
          const fp = contentFingerprint(record.artifact);
          if (fp) contentFingerprintSet.add(fp);
          v24.push(record);
          totalWritten++;
          console.log(
            `  [ai-seed] ${record.kbHash.slice(0, 12)}... ${record.domain} — "${record.artifact.identity.title}"`
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes("DUPLICATE_ENVELOPE") || message.includes("DUPLICATE_CONTENT")) {
            console.log(`  [skip] duplicate: ${spec.domain} / ${spec.title}`);
          } else {
            console.error(`  [error] ${spec.domain} / ${spec.title}: ${message}`);
          }
        }
      }

      const pct = Math.min(100, Math.round((batchStart + batch.length) / toGenerate.length * 100));
      process.stdout.write(`  Progress: ${batchStart + batch.length}/${toGenerate.length} specs (${pct}%) — written: ${totalWritten}\r`);
    }
    console.log(`\n  AI seeds written : ${totalWritten}\n`);
  }

  // ── Phase 2: Derived ──────────────────────────────────────────────────────

  if (mode === "derived" || mode === "all") {
    console.log(
      `Phase 2: generating derived KBs (${DERIVED_FACTORIES.length} factories)`
    );

    const rawPool = loadQueue(STAGING_PENDING);
    const pool = rawPool.filter(
      (r): r is typeof rawPool[0] =>
        Boolean(r.artifact?.semantic?.domain != null)
    );
    const dedupSet = buildDedupSet(pool);
    const contentFingerprintSet = buildContentFingerprintSet(pool);
    const triangleRegistry = buildTriangleRegistry(pool);

    if (pool.length === 0) {
      console.warn(`  [warn] Staging queue is empty or has no v2.4 artifacts — run with --mode seeds first`);
    } else if (rawPool.length !== pool.length) {
      console.log(`  [info] Using ${pool.length} v2.4 KBs from staging (${rawPool.length - pool.length} legacy skipped)`);
    }

    for (const factory of DERIVED_FACTORIES) {
      if (totalWritten >= maxCount) {
        console.log(`  [limit reached] stopping at ${maxCount} KBs`);
        break;
      }

      const parents = selectParents(pool, factory.requiredDomains, factory.requiredCount);

      if (parents.length < factory.requiredCount) {
        derivedSkipped++;
        console.log(
          `  [skip] ${factory.name}: need ${factory.requiredCount} parents from ` +
            `[${factory.requiredDomains.join(", ")}], found ${parents.length}`
        );
        continue;
      }

      try {
        const envelope = factory.build(parents);
        let input = derivedEnvelopeToArtifact(envelope, parents);
        input = repairKB(input);
        const record = buildRecord(input, dedupSet, contentFingerprintSet);
        if (!isProcedurallySpecific(record.artifact, PROCEDURAL_SPECIFICITY_MIN_SCORE)) {
          derivedSkipped++;
          continue;
        }
        if (isDuplicateTriangle(record.artifact, triangleRegistry, parents)) {
          derivedSkipped++;
          continue;
        }
        addTriangleToRegistry(record.artifact, triangleRegistry);
        writeRecord(STAGING_PENDING, record);
        dedupSet.add(record.kbHash);
        const fp = contentFingerprint(record.artifact);
        if (fp) contentFingerprintSet.add(fp);
        pool.push(record);
        derivedWritten++;
        totalWritten++;
        console.log(
          `  [derived] ${record.kbHash.slice(0, 12)}... ` +
            `${record.domain} — "${record.artifact.identity.title}" ` +
            `(${parents.length} parents)`
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.startsWith("DUPLICATE_ENVELOPE") || message.startsWith("DUPLICATE_CONTENT")) {
          derivedSkipped++;
          console.log(`  [skip] duplicate: ${factory.name}`);
        } else if (message.startsWith("MIN_PARENTS_VIOLATED")) {
          derivedSkipped++;
          console.log(`  [skip] ${factory.name}: ${message}`);
        } else {
          console.error(`  [error] ${factory.name}: ${message}`);
        }
      }
    }

    console.log(`\n  Derived written : ${derivedWritten}`);
    console.log(`  Derived skipped : ${derivedSkipped}\n`);
  }

  // ── Phase 3: Expansion (grow graph toward target) ─────────────────────────

  if (mode === "expansion" || mode === "all") {
    console.log(`Phase 3: expansion (target queue size ${targetTotal})`);

    const rawPool = loadQueue(STAGING_PENDING);
    const pool = rawPool.filter(
      (r): r is typeof rawPool[0] => Boolean(r.artifact?.semantic?.domain != null)
    );
    const dedupSet = buildDedupSet(pool);
    const contentFingerprintSet = buildContentFingerprintSet(pool);
    const triangleRegistry = buildTriangleRegistry(pool);
    const expansionKeys = new Set<string>();

    // Allow depth ≤ 5 as expansion parents. L4/L5 nodes (1400+) dramatically
    // increase the combinatorial space and allow multi-pass growth toward 10k+.
    const expandable = pool.filter((r) => isExpandable(r, 5));
    let pass = 0;
    let addedThisPass = 1;

    while (
      pool.length < Math.min(targetTotal, maxCount) &&
      addedThisPass > 0 &&
      pass < MAX_EXPANSION_PASSES
    ) {
      addedThisPass = 0;
      pass++;
      for (const record of expandable) {
        if (totalWritten >= maxCount || pool.length >= targetTotal) break;
        // Try top 8 cross-domain partners per record per pass (domain-diverse ordering).
        // This prevents stalling when the single best partner's triplets are exhausted.
        const others = selectTopPartnersForExpansion(expandable, record, 8, true);
        if (others.length === 0) continue;
        for (const other of others) {
        if (totalWritten >= maxCount || pool.length >= targetTotal) break;
        const policy = getDomainPairPolicy(record.domain, other.domain);
        if (policy === "reject") continue;
        const allowed: DerivationTransformation[] =
          policy === "synthesis_only"
            ? ["composition"]
            : getAllowedTransformations(record.domain, other.domain);
        for (const transformation of allowed) {
          if (totalWritten >= maxCount || pool.length >= targetTotal) break;
          const key = expansionKey(record, other, transformation);
          if (expansionKeys.has(key)) continue;
          try {
            const envelope = buildExpansionEnvelope(record, other, transformation);
            const parents = [record, other];
            let input = derivedEnvelopeToArtifact(envelope, parents);
            input = repairKB(input);
            const built = buildRecord(input, dedupSet, contentFingerprintSet);
            if (!isProcedurallySpecific(built.artifact, PROCEDURAL_SPECIFICITY_MIN_SCORE)) {
              expansionKeys.add(key);
              continue;
            }
            if (isDuplicateTriangle(built.artifact, triangleRegistry, parents)) {
              expansionKeys.add(key);
              continue;
            }
            addTriangleToRegistry(built.artifact, triangleRegistry);
            writeRecord(STAGING_PENDING, built);
            dedupSet.add(built.kbHash);
            const fp = contentFingerprint(built.artifact);
            if (fp) contentFingerprintSet.add(fp);
            expansionKeys.add(key);
            pool.push(built);
            if (getDepth(built) <= 3) expandable.push(built);
            expansionWritten++;
            totalWritten++;
            addedThisPass++;
            if (expansionWritten <= 20 || addedThisPass <= 5) {
              console.log(
                `  [expansion] ${built.kbHash.slice(0, 12)}... ${built.domain} — ${transformation} (pass ${pass})`
              );
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.startsWith("DUPLICATE_ENVELOPE") || message.startsWith("DUPLICATE_CONTENT")) {
              expansionKeys.add(key);
            }
          }
        }
        } // end others loop
      }
      if (addedThisPass > 0) {
        console.log(`  [expansion] pass ${pass}: +${addedThisPass} (queue: ${pool.length})`);
      }
    }
    if (pass >= MAX_EXPANSION_PASSES) {
      console.log(`  [expansion] stopped after ${MAX_EXPANSION_PASSES} passes (safety cap)`);
    }

    console.log(`\n  Expansion written : ${expansionWritten}`);
    console.log(`  Queue size : ${pool.length}\n`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  const finalPool = loadQueue(STAGING_PENDING);

  console.log(`────────────────────────────────`);
  console.log(`  Seeds written     : ${seedsWritten}`);
  console.log(`  Derived written   : ${derivedWritten}`);
  console.log(`  Expansion written : ${expansionWritten}`);
  console.log(`  Total written     : ${totalWritten}`);
  console.log(`  Total in queue    : ${finalPool.length}`);
  console.log(`  Output dir        : ${STAGING_PENDING}`);
  console.log(`────────────────────────────────`);
  if (finalPool.length > 0) {
    console.log(`  Stats:`);
    stats(finalPool);
  }
  console.log(``);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
