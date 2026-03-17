/**
 * AI Agent Task Planning Seeds (~80 seed procedures).
 * Task decomposition, tool selection, multi-agent coordination,
 * execution retry policies, planning strategies, goal management,
 * and agentic workflow design.
 * Domain: agent.planning.*
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Task decomposition strategies (10) */
const DECOMPOSITION: SeedSpec[] = [
  { domain: "agent.planning.task_decomposition", title: "Implementing hierarchical task decomposition for complex agent goals", concept: C("decompose goal → subgoals → leaf tasks; dependency graph; execute leaves first; compose results up hierarchy") },
  { domain: "agent.planning.task_decomposition", title: "Implementing recursive task decomposition with depth limits", concept: C("decompose until task is atomic; max depth = N; leaf = directly executable; detect circular decompositions") },
  { domain: "agent.planning.task_decomposition", title: "Designing task dependency graph construction for agent planning", concept: C("task node; dependency edges; topological sort; execute by level; parallelize within level; detect cycles") },
  { domain: "agent.planning.task_decomposition", title: "Implementing LLM-guided task decomposition with structured output", concept: C("prompt: goal → JSON task list with dependencies; validate schema; check completeness; re-prompt if missing steps") },
  { domain: "agent.planning.task_decomposition", title: "Designing task granularity selection for agent planning", concept: C("atomic: single tool call; compound: multi-step; choose by context window and tool capability; avoid over-decomposition") },
  { domain: "agent.planning.task_decomposition", title: "Implementing task decomposition with pre-condition and post-condition checking", concept: C("each task: pre-conditions, action, post-conditions; verify pre before execute; verify post after; abort if mismatch") },
  { domain: "agent.planning.task_decomposition", title: "Designing adaptive task decomposition based on intermediate results", concept: C("execute first task; observe result; re-plan remaining tasks; add tasks if result reveals complexity; remove if not needed") },
  { domain: "agent.planning.task_decomposition", title: "Implementing parallel task decomposition for independent subtask execution", concept: C("identify independent subtasks; execute in parallel; join results; handle partial failure; timeout per parallel branch") },
  { domain: "agent.planning.task_decomposition", title: "Designing task decomposition templates for common agent workflows", concept: C("template library: research, write, debug, deploy; instantiate with goal-specific parameters; validate against template schema") },
  { domain: "agent.planning.task_decomposition", title: "Implementing task scope management to prevent goal drift in decomposition", concept: C("anchor each subtask to original goal; score relevance; prune off-topic subtasks; human review on scope expansion") },
];

/** 2. Tool selection ranking (10) */
const TOOL_SELECTION: SeedSpec[] = [
  { domain: "agent.planning.tool_selection_ranking", title: "Designing tool selection ranking systems for agent task execution", concept: C("score each tool: capability match + availability + cost + reliability; select highest score; fallback on failure") },
  { domain: "agent.planning.tool_selection_ranking", title: "Implementing capability-based tool matching for agent planning", concept: C("task schema → required capabilities; tool schema → provided capabilities; match and score by coverage") },
  { domain: "agent.planning.tool_selection_ranking", title: "Designing tool selection with cost and latency constraints", concept: C("prefer cheaper tool if capability equivalent; reject tools exceeding latency budget; track cost per tool call") },
  { domain: "agent.planning.tool_selection_ranking", title: "Implementing tool selection fallback chains for reliability", concept: C("primary tool fails → fallback tool → final fallback or error; document fallback chain per capability; test all levels") },
  { domain: "agent.planning.tool_selection_ranking", title: "Designing semantic tool retrieval for large tool libraries", concept: C("embed tool descriptions; embed task description; cosine similarity; retrieve top-K tools; re-rank by context fit") },
  { domain: "agent.planning.tool_selection_ranking", title: "Implementing tool selection history to avoid ineffective tools", concept: C("log: tool, task type, outcome; exclude tools that failed > N times on similar tasks; prefer proven tools") },
  { domain: "agent.planning.tool_selection_ranking", title: "Designing tool selection for multi-step task tool sequences", concept: C("select tool per step; ensure output format of step N matches input format of step N+1; type-check tool chain") },
  { domain: "agent.planning.tool_selection_ranking", title: "Implementing tool permission validation before selection", concept: C("check agent has permission for tool; scope validates before selection; deny unauthorized tools; log denied selections") },
  { domain: "agent.planning.tool_selection_ranking", title: "Designing tool selection for resource-constrained agent environments", concept: C("prefer lightweight tools under resource limits; monitor tool memory and CPU; degrade gracefully under constraint") },
  { domain: "agent.planning.tool_selection_ranking", title: "Implementing tool version selection and compatibility checking", concept: C("tool has version; agent specifies min version; select compatible version; alert on deprecated tool usage") },
];

/** 3. Multi-agent conflict resolution (10) */
const MULTI_AGENT_CONFLICT: SeedSpec[] = [
  { domain: "agent.planning.multi_agent_conflict_resolution", title: "Designing multi-agent conflict detection procedures", concept: C("conflict: two agents write same resource; detect via lock contention or state divergence; log conflict event; escalate") },
  { domain: "agent.planning.multi_agent_conflict_resolution", title: "Implementing priority-based multi-agent conflict resolution", concept: C("assign priority per agent; higher priority wins conflict; lower priority retries with updated context; log resolution") },
  { domain: "agent.planning.multi_agent_conflict_resolution", title: "Designing voting-based conflict resolution for peer agent disagreements", concept: C("agents vote on conflicting decisions; majority wins; tie-break by agent seniority or random; log dissenting agents") },
  { domain: "agent.planning.multi_agent_conflict_resolution", title: "Implementing resource locking for multi-agent coordination", concept: C("agent acquires lock before modifying shared resource; release on complete; TTL prevents deadlock; queue for contenders") },
  { domain: "agent.planning.multi_agent_conflict_resolution", title: "Designing orchestrator-mediated conflict resolution for multi-agent systems", concept: C("orchestrator detects conflict; pauses conflicting agents; resolves by policy; resumes winning agent; retries loser") },
  { domain: "agent.planning.multi_agent_conflict_resolution", title: "Implementing output merging for parallel agent results", concept: C("merge: dedup, union, or semantic merge; detect contradictions; flag contradictions for human review; select by confidence") },
  { domain: "agent.planning.multi_agent_conflict_resolution", title: "Designing task allocation to minimize multi-agent conflicts", concept: C("partition work by domain; exclusive zones per agent; overlap only for review; handoff protocols at boundaries") },
  { domain: "agent.planning.multi_agent_conflict_resolution", title: "Implementing disagreement logging for multi-agent audit trails", concept: C("log: agents involved, conflict type, resolution method, outcome; analyze conflict frequency; improve allocation policy") },
  { domain: "agent.planning.multi_agent_conflict_resolution", title: "Designing deadlock detection in multi-agent resource waiting graphs", concept: C("build wait-for graph; detect cycle = deadlock; break by aborting lowest-priority agent; log deadlock events") },
  { domain: "agent.planning.multi_agent_conflict_resolution", title: "Implementing human escalation for unresolvable multi-agent conflicts", concept: C("conflict resolution fails → pause agents → human review queue → decision → resume; log escalation and decision") },
];

/** 4. Execution retry policies (10) */
const RETRY: SeedSpec[] = [
  { domain: "agent.planning.execution_retry_policy", title: "Designing execution retry policies for failed agent tool calls", concept: C("retry on: timeout, transient error; do not retry: auth error, invalid input, quota exceeded; max N retries; log each") },
  { domain: "agent.planning.execution_retry_policy", title: "Implementing exponential backoff retry for agent tool failures", concept: C("wait = min(max_wait, base × 2^attempt × jitter); prevents thundering herd; configurable per tool; log wait durations") },
  { domain: "agent.planning.execution_retry_policy", title: "Designing retry budget management for agent execution plans", concept: C("budget = max total retries across plan; decrement on each retry; abort plan when budget exhausted; log budget consumption") },
  { domain: "agent.planning.execution_retry_policy", title: "Implementing step-level vs plan-level retry policies for agent workflows", concept: C("step retry: retry same step N times; plan retry: re-plan from failure point; choose by failure type and context") },
  { domain: "agent.planning.execution_retry_policy", title: "Designing error classification for agent retry policy selection", concept: C("transient: network timeout → retry; permanent: invalid schema → do not retry; unknown → retry once then classify") },
  { domain: "agent.planning.execution_retry_policy", title: "Implementing context-aware retry with updated information", concept: C("on retry: re-fetch fresh context; update tool inputs; re-rank tools; retry with improved attempt not identical repeat") },
  { domain: "agent.planning.execution_retry_policy", title: "Designing circuit breaker patterns for agent tool call reliability", concept: C("open circuit after N failures; fast fail during open; probe after cooldown; close on success; per-tool circuit breaker") },
  { domain: "agent.planning.execution_retry_policy", title: "Implementing dead letter handling for permanently failed agent tasks", concept: C("exhausted retries → dead letter queue; human review; root cause analysis; fix and replay or discard") },
  { domain: "agent.planning.execution_retry_policy", title: "Designing idempotent agent actions for safe retry execution", concept: C("idempotency key per action; store result; return stored on retry; idempotent side effects required for retry safety") },
  { domain: "agent.planning.execution_retry_policy", title: "Implementing retry observability for agent execution monitoring", concept: C("log: retry count, error type, wait time, outcome; alert on high retry rate; track per tool and per agent") },
];

/** 5. Goal management (10) */
const GOAL_MANAGEMENT: SeedSpec[] = [
  { domain: "agent.planning.goal_management", title: "Designing agent goal state representation and tracking", concept: C("goal: description, success criteria, deadline, priority; track: pending, in_progress, completed, failed; log transitions") },
  { domain: "agent.planning.goal_management", title: "Implementing goal completion verification procedures for agents", concept: C("verify: post-conditions met, success criteria satisfied, output schema valid; assert before marking complete") },
  { domain: "agent.planning.goal_management", title: "Designing goal priority ordering for multi-goal agent systems", concept: C("goals ranked by: urgency, impact, dependency; highest priority first; re-rank on new goal arrival or context change") },
  { domain: "agent.planning.goal_management", title: "Implementing goal abandonment procedures when goals become infeasible", concept: C("detect: resource exhausted, impossible pre-conditions, timeout; mark abandoned; log reason; escalate to human or parent agent") },
  { domain: "agent.planning.goal_management", title: "Designing goal dependency management for ordered execution", concept: C("goal graph with dependency edges; execute when dependencies complete; fail dependent on dependency failure") },
  { domain: "agent.planning.goal_management", title: "Implementing goal progress tracking for long-running agent tasks", concept: C("decompose into milestones; track completion %; report progress on interval; ETA estimate; pause on anomaly") },
  { domain: "agent.planning.goal_management", title: "Designing goal conflict detection for multi-goal agent systems", concept: C("detect: two goals require contradictory state; resource conflict; prioritize by urgency; defer or merge conflicting goals") },
  { domain: "agent.planning.goal_management", title: "Implementing goal validation before agent execution begins", concept: C("validate: goal is specific, measurable, achievable with available tools; reject ambiguous; clarify before starting") },
  { domain: "agent.planning.goal_management", title: "Designing goal memory and context persistence across agent sessions", concept: C("persist goal state to durable store; restore on session resume; link partial results to goal; continue from checkpoint") },
  { domain: "agent.planning.goal_management", title: "Implementing goal audit trails for agent accountability", concept: C("log: goal created, plan generated, each action, outcome, completion; immutable trail; query by goal ID for review") },
];

/** 6. Agentic workflow design (10) */
const WORKFLOW: SeedSpec[] = [
  { domain: "agent.planning.workflow", title: "Designing stateful agentic workflow architectures with checkpointing", concept: C("checkpoint state after each step; resume from last checkpoint on failure; store: step index, context, partial results") },
  { domain: "agent.planning.workflow", title: "Implementing human-in-the-loop approval gates in agentic workflows", concept: C("pause before high-impact actions; request human confirmation; timeout if no response; log decision and approver") },
  { domain: "agent.planning.workflow", title: "Designing agentic workflow branching based on intermediate results", concept: C("branch: result satisfies condition A → path A, else → path B; dynamic branching vs static; re-plan on unexpected result") },
  { domain: "agent.planning.workflow", title: "Implementing agentic workflow rollback procedures for failed executions", concept: C("compensating actions per step; rollback in reverse order; verify each compensation; log rollback events") },
  { domain: "agent.planning.workflow", title: "Designing agentic workflow observability with execution traces", concept: C("trace per workflow; span per step; log: tool called, inputs, outputs, duration, errors; visualize execution graph") },
  { domain: "agent.planning.workflow", title: "Implementing agentic workflow timeout and deadline management", concept: C("deadline per workflow and per step; timeout step → retry or skip; abort workflow on deadline exceeded; notify requester") },
  { domain: "agent.planning.workflow", title: "Designing event-driven agentic workflow triggers", concept: C("trigger on: schedule, user event, upstream completion, threshold breach; evaluate conditions; start workflow on match") },
  { domain: "agent.planning.workflow", title: "Implementing agentic workflow output validation before delivery", concept: C("validate output: schema, content policy, completeness, accuracy; reject and re-execute if invalid; max retry before escalate") },
  { domain: "agent.planning.workflow", title: "Designing agentic workflow resource quota enforcement", concept: C("budget: max tokens, tool calls, time, cost; enforce per workflow; abort on budget exceeded; report consumption") },
  { domain: "agent.planning.workflow", title: "Implementing agentic workflow versioning for long-running processes", concept: C("version workflow definition; in-flight workflows complete on old version; new starts use new version; migration path") },
];

export const AI_AGENT_TASK_PLANNING_SEED_SPECS: SeedSpec[] = [
  ...DECOMPOSITION,
  ...TOOL_SELECTION,
  ...MULTI_AGENT_CONFLICT,
  ...RETRY,
  ...GOAL_MANAGEMENT,
  ...WORKFLOW,
];
