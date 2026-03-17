/**
 * 100 super-seed KB templates — graph anchors for 10k derived KBs (v2.5)
 *
 * Design rules:
 *  - One fundamental concept per seed (concept atomicity)
 *  - Universally reusable across domains
 *  - 3–7 reasoning steps (v2.5: structured steps with id, action, inputs, produces)
 *  - identity.is_seed = true, knowledge_inputs.used = []
 *  - execution.cost_estimate for agent strategy selection
 *
 * 10 domains: Agent Planning (12), Reasoning & Analysis (10), Execution (10),
 * Validation (10), Error Handling (8), Tool Usage (8), Knowledge Management (8),
 * Software Engineering (12), Data Systems (12), Security & Reliability (10)
 */

import type { KBv24Artifact, StructuredStep } from "../types/artifact.js";
import { toStructuredSteps } from "../lib/core/steps.js";
import { getStateTransitionForSeed } from "../config/state-ontology.js";

const BASE = {
  knowledge_inputs: {
    minimum_required: 0,
    recommended: 0,
    composition_type: "merge" as const,
    used: [] as { kb_id: string; role: string }[],
  },
  reasoning: { requires: [] as string[], contradicts: [] as string[], related: [] as string[] },
  execution: {
    trust_tier: 1,
    execution_mode: "advisory" as const,
    determinism: "deterministic" as const,
    idempotent: true,
    cost_estimate: {
      resource_class: "cheap" as const,
      expected_token_cost: 150,
      time_complexity: "O(n)",
    },
  },
  evidence: { sources: [] as string[], benchmarks: [] as string[], notes: "" },
  provenance: {
    author: { address: "" },
    royalty_bps: 250,
    lineage: { depth: 0, parent_hash: null as string | null },
  },
};

/** Build a v2.5 super-seed with structured steps (converted from string steps) and cost_estimate. */
function superSeed(
  title: string,
  domain: string,
  claim: string,
  summary: string,
  tags: string[],
  steps: string[],
  success: string[],
  failure: string[],
  metrics: string[]
): KBv24Artifact {
  const structuredSteps: StructuredStep[] = toStructuredSteps(steps, "result");
  const stateTransition = getStateTransitionForSeed(domain, title);
  return {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title,
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.5",
    },
    claim: { statement: claim, confidence: null, falsifiable: true },
    semantic: { summary, tags, domain, difficulty: "intermediate" as const },
    ...BASE,
    validation: { success_conditions: success, failure_conditions: failure, metrics },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [{ name: "goal", type: "task", description: "Goal or context" }],
        outputs: [{ name: "result", type: "execution_strategy", description: "Plan or outcome" }],
        parameters: [],
      },
      inline_artifact: { steps: structuredSteps },
    },
    ...(stateTransition && { state_transition: stateTransition }),
  };
}

// ── Agent Planning (12) ────────────────────────────────────────────────────
const AGENT_PLANNING = [
  ["Goal Definition Strategy", "agent.planning", "Clearly defining goals improves execution clarity and verification.", "Define the objective and success criteria before acting.", ["agent", "planning", "goal"], ["Identify the desired outcome.", "State success criteria.", "Define scope and constraints.", "Record the goal for downstream steps."], ["Goal is stated and criteria are measurable"], ["Vague or missing success criteria"], ["Clarity", "Measurability"]],
  ["Task Decomposition Strategy", "agent.planning.task_decomposition", "Breaking complex goals into smaller tasks improves reliability.", "Split objectives into discrete subtasks with dependencies.", ["agent", "planning", "task-decomposition"], ["Identify the overall objective.", "Divide into discrete subtasks.", "Determine dependencies.", "Prioritize execution order."], ["Subtasks are independent where possible", "Dependencies form a DAG"], ["Single monolithic step", "Circular dependencies"], ["Subtasks count", "DAG depth"]],
  ["Hierarchical Planning", "agent.planning.hierarchical", "Layered planning reduces complexity in multi-step problems.", "Use phases then expand into concrete actions.", ["agent", "planning", "hierarchical"], ["Define high-level objective.", "Break into phases.", "Expand phases into actions.", "Order actions within each phase."], ["Phases are ordered", "Each phase has actions"], ["Phases with no actions"], ["Phase count", "Actions per phase"]],
  ["Dependency Graph Construction", "agent.planning", "Explicit dependency graphs prevent deadlocks and enable parallelization.", "Build a DAG of task dependencies.", ["agent", "planning", "dependencies"], ["List all tasks.", "For each task list prerequisites.", "Build directed graph.", "Verify no cycles."], ["Graph is acyclic", "All tasks reachable"], ["Cycle in graph"], ["Tasks", "Edges"]],
  ["Constraint-Based Planning", "agent.planning", "Stating constraints lets the planner satisfy them before committing.", "List hard/soft constraints; filter plans by satisfaction.", ["agent", "planning", "constraints"], ["Enumerate hard and soft constraints.", "Generate candidate plans.", "Filter by hard constraints.", "Rank by soft constraint satisfaction."], ["All plans satisfy hard constraints"], ["Plan violates hard constraint"], ["Constraints satisfied"]],
  ["Resource Allocation Planning", "agent.planning", "Allocating resources up front prevents contention and underuse.", "Assign resources to tasks within capacity.", ["agent", "planning", "resources"], ["List tasks and resource needs.", "Define capacity per resource.", "Assign resources to tasks.", "Verify capacity not exceeded."], ["Total allocation ≤ capacity"], ["Over-allocation"], ["Utilization"]],
  ["Priority Scheduling", "agent.planning", "Prioritizing tasks ensures critical outcomes first.", "Order tasks by priority and dependencies.", ["agent", "planning", "priority"], ["Score tasks by impact and urgency.", "Respect dependencies.", "Produce execution order.", "Resolve ties deterministically."], ["Order respects dependencies", "Deterministic"], ["Dependency violated"], ["Schedule length"]],
  ["Iterative Planning Loop", "agent.planning", "Refining plans in iterations allows early feedback.", "Produce plan, execute slice, refine from outcomes.", ["agent", "planning", "iterative"], ["Produce initial plan.", "Select minimal executable slice.", "Execute or validate slice.", "Refine plan from results; repeat."], ["Each iteration has a slice", "Refinement is outcome-based"], ["No refinement after failure"], ["Iterations", "Slices completed"]],
  ["Milestone Planning", "agent.planning", "Milestones enable progress checks without full completion.", "Define checkpoints and deliverables per milestone.", ["agent", "planning", "milestone"], ["Define end goal.", "Identify intermediate milestones.", "Assign deliverables to each.", "Order milestones by dependency."], ["Milestones are ordered", "Deliverables defined"], ["Milestone with no deliverable"], ["Milestone count"]],
  ["Execution Sequencing", "agent.planning", "Correct sequencing prevents wasted work and race conditions.", "Order actions so prerequisites run first.", ["agent", "planning", "sequencing"], ["List actions and prerequisites.", "Build dependency order.", "Output linear or parallel sequence.", "Validate no prerequisite after dependent."], ["Prerequisites before dependents"], ["Order violation"], ["Sequence length"]],
  ["Fallback Planning", "agent.planning", "Fallback plans reduce failure impact.", "Define alternate path when primary fails.", ["agent", "planning", "fallback"], ["Define primary plan.", "Identify failure points.", "Define fallback for each.", "Ensure fallbacks are executable."], ["Fallback for each failure point"], ["Fallback not executable"], ["Fallback coverage"]],
  ["Contingency Planning", "agent.planning", "Contingencies handle uncertainty and external changes.", "Plan for likely alternative scenarios.", ["agent", "planning", "contingency"], ["Identify main scenario.", "List alternative scenarios.", "Define response per scenario.", "Trigger conditions for each."], ["Each scenario has response"], ["Missing scenario"], ["Scenarios covered"]],
];

// ── Reasoning & Analysis (10) ───────────────────────────────────────────────
const REASONING_ANALYSIS = [
  ["Deductive Reasoning", "agent.reasoning", "Deduction applies general rules to reach certain conclusions.", "From general premises derive specific conclusions.", ["reasoning", "deduction"], ["State general premises.", "Apply logical rules.", "Derive conclusion.", "Verify conclusion follows."], ["Conclusion follows from premises"], ["Invalid inference"], ["Steps", "Validity"]],
  ["Inductive Reasoning", "agent.reasoning", "Induction generalizes from examples to probable patterns.", "From specific observations infer a general pattern.", ["reasoning", "induction"], ["Gather observations.", "Identify pattern or hypothesis.", "State confidence level.", "Note scope and exceptions."], ["Hypothesis is falsifiable"], ["Overgeneralization"], ["Sample size", "Confidence"]],
  ["Abductive Reasoning", "agent.reasoning", "Abduction infers the best explanation for observations.", "From effect infer most likely cause or explanation.", ["reasoning", "abduction"], ["State observations.", "List candidate explanations.", "Score by fit and simplicity.", "Select best explanation."], ["Explanation fits observations"], ["Unfalsifiable explanation"], ["Candidates", "Fit score"]],
  ["Hypothesis Generation", "agent.reasoning", "Explicit hypotheses guide testing and refinement.", "Form testable hypotheses from the problem.", ["reasoning", "hypothesis"], ["State the problem.", "Generate candidate hypotheses.", "Make each testable.", "Prioritize by impact."], ["Hypotheses are testable"], ["Untestable hypothesis"], ["Hypotheses count"]],
  ["Evidence Evaluation", "agent.reasoning", "Weighing evidence improves conclusion quality.", "Score evidence for and against a claim.", ["reasoning", "evidence"], ["State the claim.", "Gather evidence.", "Score strength and relevance.", "Aggregate for and against."], ["Evidence is weighted"], ["Evidence ignored"], ["Evidence count", "Balance"]],
  ["Contradiction Detection", "agent.reasoning", "Detecting contradictions prevents inconsistent conclusions.", "Compare statements and flag logical conflicts.", ["reasoning", "contradiction"], ["List statements or beliefs.", "Compare pairs for conflict.", "Flag contradictions.", "Report conflicting set."], ["Contradictions are identified"], ["Contradiction missed"], ["Statements", "Conflicts"]],
  ["Comparative Analysis", "agent.reasoning", "Structured comparison supports decisions.", "Compare options on defined criteria.", ["reasoning", "comparison"], ["Define options and criteria.", "Score each option per criterion.", "Aggregate scores.", "Rank or select."], ["All options scored on all criteria"], ["Missing criterion"], ["Options", "Criteria"]],
  ["Causal Reasoning", "agent.reasoning", "Causal models clarify cause-effect relationships.", "Identify causes and effects; avoid correlation-only claims.", ["reasoning", "causal"], ["State effect or outcome.", "List candidate causes.", "Apply causal criteria (order, mechanism).", "Distinguish cause from correlation."], ["Cause precedes effect", "Mechanism stated"], ["Correlation as cause"], ["Causes", "Mechanisms"]],
  ["Scenario Evaluation", "agent.reasoning", "Evaluating scenarios supports robust decisions.", "Enumerate scenarios and assess outcomes.", ["reasoning", "scenario"], ["List possible scenarios.", "Assign likelihood if known.", "Assess outcome per scenario.", "Compare and recommend."], ["Scenarios are enumerated"], ["Key scenario missing"], ["Scenarios", "Outcomes"]],
  ["Decision Framework", "agent.reasoning", "A framework makes decisions consistent and auditable.", "Apply criteria, options, and rules to decide.", ["reasoning", "decision"], ["Define decision and options.", "State criteria and weights.", "Score options.", "Apply rule and output decision."], ["Decision follows from criteria"], ["Arbitrary choice"], ["Options", "Criteria"]],
];

// ── Execution Strategies (10) ───────────────────────────────────────────────
const EXECUTION_STRATEGIES = [
  ["Stepwise Execution", "agent.execution", "Executing in clear steps enables checkpoints and debugging.", "Run one step at a time; validate before next.", ["execution", "stepwise"], ["Get current step.", "Execute step.", "Validate output.", "Advance to next or fail."], ["Each step validated"], ["Step skipped"], ["Steps", "Pass rate"]],
  ["Parallel Execution", "agent.execution", "Parallel execution reduces latency when tasks are independent.", "Run independent tasks concurrently.", ["execution", "parallel"], ["Identify independent tasks.", "Spawn concurrent execution.", "Gather results.", "Merge or sequence outputs."], ["No shared mutable state"], ["Race condition"], ["Tasks", "Latency"]],
  ["Retry Strategy", "agent.execution", "Retries with backoff handle transient failures.", "Retry failed operation with increasing delay.", ["execution", "retry"], ["Execute operation.", "On failure check retryable.", "Wait backoff duration.", "Retry up to max attempts."], ["Backoff increases", "Max attempts bounded"], ["Infinite retry"], ["Attempts", "Success"]],
  ["Idempotent Execution", "agent.execution", "Idempotent operations are safe to retry.", "Design so repeating the operation has the same effect.", ["execution", "idempotent"], ["Define operation.", "Ensure same input → same outcome.", "Use idempotency keys if needed.", "Document preconditions."], ["Repeated call is safe"], ["Side effects on repeat"], ["Idempotency checks"]],
  ["Transaction Pattern", "agent.execution", "Transactions ensure all-or-nothing execution.", "Group operations in a transaction; commit or rollback.", ["execution", "transaction"], ["Begin transaction.", "Execute operations.", "On success commit.", "On failure rollback."], ["Atomic commit or rollback"], ["Partial commit"], ["Operations", "Commits"]],
  ["State Transition Execution", "agent.execution", "Explicit state machines prevent invalid transitions.", "Execute only allowed transitions from current state.", ["execution", "state-machine"], ["Read current state.", "Get input or event.", "Find allowed transition.", "Apply transition; update state."], ["Only allowed transitions"], ["Invalid transition"], ["States", "Transitions"]],
  ["Event-Driven Execution", "agent.execution", "Event-driven flow decouples producers and consumers.", "React to events; emit events for next stage.", ["execution", "event-driven"], ["Subscribe to events.", "On event validate and handle.", "Emit resulting events.", "Log for audit."], ["Events are logged"], ["Event lost"], ["Events", "Handlers"]],
  ["Batch Processing", "agent.execution", "Batching reduces overhead for bulk work.", "Collect items; process in batches.", ["execution", "batch"], ["Collect items up to batch size or timeout.", "Process batch as a unit.", "Report results.", "Repeat."], ["Batch size bounded"], ["Unbounded batch"], ["Batch size", "Throughput"]],
  ["Streaming Processing", "agent.execution", "Streaming handles unbounded data with bounded memory.", "Process items as they arrive; no full load.", ["execution", "streaming"], ["Open stream.", "For each item process.", "Emit or store result.", "Close stream on end."], ["Memory bounded"], ["Full load into memory"], ["Items", "Latency"]],
  ["Workflow Orchestration", "agent.execution", "Orchestration coordinates multi-step workflows.", "Coordinate steps; handle failures and retries.", ["execution", "orchestration"], ["Load workflow definition.", "Execute steps in order.", "Handle step failure.", "Persist progress for resume."], ["Progress persisted"], ["No resume"], ["Steps", "Completions"]],
];

// ── Validation & Testing (10) ──────────────────────────────────────────────
const VALIDATION_TESTING = [
  ["Output Verification Strategy", "software.testing", "Verifying outputs ensures correctness before use.", "Check output against expected schema and invariants.", ["validation", "output"], ["Obtain output.", "Load expected schema.", "Validate structure.", "Check invariants; pass or fail."], ["Output conforms to schema"], ["Invalid output accepted"], ["Pass rate"]],
  ["Input Validation", "software.testing", "Validating input at boundaries prevents injection and errors.", "Validate all inputs against allowlist schema.", ["validation", "input"], ["Define schema per boundary.", "Validate on entry.", "Reject invalid input.", "Log rejections."], ["All inputs validated"], ["Unvalidated input"], ["Rejections"]],
  ["Invariant Checking", "software.testing", "Invariants must hold before and after operations.", "State invariants; check after each change.", ["validation", "invariant"], ["State invariants.", "After operation check each.", "Fail if any violated.", "Report which invariant."], ["Invariants checked"], ["Invariant violated silently"], ["Invariants", "Checks"]],
  ["Unit Test Generation", "software.testing", "Unit tests target single units with clear I/O.", "Generate tests: one unit, mocked deps, assert output.", ["testing", "unit"], ["Identify unit and interface.", "Define cases: input, expected.", "Mock dependencies.", "Run and assert."], ["One unit under test", "Deps mocked"], ["No assertion"], ["Cases", "Pass rate"]],
  ["Regression Testing", "software.testing", "Regression tests catch breakage after changes.", "Run fixed suite after each change; block on failure.", ["testing", "regression"], ["Maintain test suite.", "Run on each change.", "Compare to baseline.", "Block on new failure."], ["Suite run on every change"], ["Suite skipped"], ["Tests", "Failures"]],
  ["Property-Based Testing", "software.testing", "Properties hold for many inputs; generators find counterexamples.", "Define property; generate inputs; assert property.", ["testing", "property"], ["Define property (input → bool).", "Generate random inputs.", "Assert property for each.", "Shrink failing input."], ["Property defined", "Shrinking"], ["No shrinking"], ["Runs", "Counterexamples"]],
  ["Benchmark Testing", "software.testing", "Benchmarks measure performance regressions.", "Run benchmark; compare to baseline.", ["testing", "benchmark"], ["Define benchmark scenario.", "Run and measure.", "Compare to baseline.", "Flag regression."], ["Measurement repeatable"], ["No baseline"], ["Metric", "Delta"]],
  ["Consistency Checking", "software.testing", "Consistency checks detect logical or data drift.", "Compare state or output to expected consistency rules.", ["validation", "consistency"], ["Define consistency rules.", "Gather state or output.", "Check each rule.", "Report violations."], ["Rules checked"], ["Rule skipped"], ["Rules", "Violations"]],
  ["Result Reproducibility", "software.testing", "Reproducible results enable debugging and audit.", "Document and fix seed/version so result can be reproduced.", ["testing", "reproducibility"], ["Fix random seed or version.", "Run and record result.", "Re-run with same seed.", "Assert result matches."], ["Same seed → same result"], ["Non-determinism"], ["Runs", "Match"]],
  ["Quality Metric Evaluation", "software.testing", "Quality metrics track reliability over time.", "Compute metrics (e.g. coverage, latency); track trend.", ["testing", "metrics"], ["Define metrics.", "Run and compute.", "Store or report.", "Compare to threshold or trend."], ["Metrics defined", "Tracked"], ["No trend"], ["Metrics", "Values"]],
];

// ── Error Handling (8) ──────────────────────────────────────────────────────
const ERROR_HANDLING = [
  ["Error Detection Strategy", "agent.error_recovery", "Detecting errors early limits damage.", "Check results and preconditions; classify errors.", ["error", "detection"], ["Execute or read result.", "Check for error signals.", "Classify error type.", "Route to handler."], ["All errors classified"], ["Error ignored"], ["Errors", "Classification"]],
  ["Root Cause Analysis", "agent.error_recovery", "Finding root cause prevents recurrence.", "Trace from symptom to root cause.", ["error", "rca"], ["State the symptom.", "List possible causes.", "Gather evidence.", "Identify root cause."], ["Cause identified", "Evidence cited"], ["Symptom treated as cause"], ["Causes", "Evidence"]],
  ["Retry With Backoff", "agent.error_recovery", "Backoff reduces load during transient failure.", "Retry with exponential or linear backoff.", ["error", "retry"], ["Attempt operation.", "On failure compute delay.", "Wait delay.", "Retry up to limit."], ["Backoff increases", "Limit enforced"], ["No backoff"], ["Attempts", "Success"]],
  ["Fallback Strategy", "agent.error_recovery", "Fallbacks provide degraded service when primary fails.", "On primary failure switch to fallback path.", ["error", "fallback"], ["Try primary path.", "On failure trigger fallback.", "Execute fallback.", "Report degraded mode."], ["Fallback is defined"], ["Fallback fails same way"], ["Fallback use rate"]],
  ["Compensating Transaction", "agent.error_recovery", "Compensation reverses partial work on failure.", "On failure run compensating actions.", ["error", "compensation"], ["Record each action.", "On failure list completed.", "Run compensations in reverse order.", "Verify rolled back."], ["Compensations run", "Order correct"], ["Partial state left"], ["Compensations"]],
  ["Exception Classification", "agent.error_recovery", "Classifying exceptions routes them correctly.", "Map exception to category; handle by category.", ["error", "classification"], ["Catch exception.", "Classify (transient, input, fatal).", "Route to handler.", "Log and optionally escalate."], ["Every exception classified"], ["Unhandled exception"], ["Classes", "Handled"]],
  ["Circuit Breaker Pattern", "agent.error_recovery", "Circuit breaker stops cascading failure.", "After N failures open circuit; retry later.", ["error", "circuit-breaker"], ["Track failures.", "On threshold open circuit.", "Reject or use fallback while open.", "After timeout try again."], ["Circuit opens on threshold"], ["No timeout"], ["State", "Failures"]],
  ["Graceful Degradation", "agent.error_recovery", "Degrading gracefully keeps core function when parts fail.", "Disable non-essential features; keep core working.", ["error", "degradation"], ["Identify essential vs optional.", "On failure disable optional.", "Continue with essential.", "Report degraded mode."], ["Core function preserved"], ["Total failure"], ["Features", "Degraded"]],
];

// ── Tool Usage (8) ─────────────────────────────────────────────────────────
const TOOL_USAGE = [
  ["Tool Selection Strategy", "agent.tool_selection", "Selecting the right tool improves outcome.", "Match task to tool by capability and interface.", ["tool", "selection"], ["Describe task.", "List available tools.", "Score fit.", "Return best tool and params."], ["Tool matches task"], ["Wrong tool selected"], ["Tools", "Match score"]],
  ["Capability Matching", "agent.tool_selection", "Matching capability to need avoids misuse.", "Compare required capability to tool capability.", ["tool", "capability"], ["List required capabilities.", "Get tool capabilities.", "Compare and score.", "Select if sufficient."], ["Capabilities compared"], ["Capability gap ignored"], ["Match", "Gap"]],
  ["Input Adaptation", "agent.tool_selection", "Adapting input to tool interface enables reuse.", "Transform caller input to tool input format.", ["tool", "input"], ["Get caller input.", "Get tool input schema.", "Transform or validate.", "Pass to tool."], ["Input conforms to tool"], ["Invalid input passed"], ["Adaptations"]],
  ["Output Normalization", "agent.tool_selection", "Normalizing output gives a stable interface to callers.", "Transform tool output to standard shape.", ["tool", "output"], ["Get raw tool output.", "Define standard shape.", "Transform and validate.", "Return to caller."], ["Output in standard shape"], ["Raw output exposed"], ["Transformations"]],
  ["Tool Chaining", "agent.tool_selection", "Chaining tools composes complex workflows.", "Pass output of one tool as input to next.", ["tool", "chaining"], ["Define chain order.", "Run first tool.", "Pass output to next.", "Return final output."], ["Output type matches next input"], ["Type mismatch"], ["Tools", "Success"]],
  ["API Interaction Pattern", "agent.execution", "Structured API calls improve reliability.", "Validate input, call, handle errors, parse response.", ["tool", "api"], ["Validate params.", "Build request.", "Send with timeout and retry.", "Parse and return response."], ["Errors handled", "Timeout set"], ["No retry"], ["Calls", "Success rate"]],
  ["Sandbox Execution", "agent.execution", "Sandboxing limits tool impact.", "Run tool in isolated environment.", ["tool", "sandbox"], ["Define sandbox (resource limits).", "Spawn tool in sandbox.", "Capture output.", "Tear down sandbox."], ["Sandbox enforced"], ["Tool escapes sandbox"], ["Runs", "Limits"]],
  ["Result Aggregation", "agent.tool_selection", "Aggregating multiple tool results supports decisions.", "Combine results from multiple tools.", ["tool", "aggregation"], ["Run tools (parallel or sequence).", "Collect results.", "Merge or rank.", "Return aggregated result."], ["All results included"], ["Result dropped"], ["Tools", "Aggregation"]],
];

// ── Knowledge Management (8) ───────────────────────────────────────────────
const KNOWLEDGE_MANAGEMENT = [
  ["Knowledge Graph Construction", "knowledge.graphs", "Graphs enable traversal and reasoning over knowledge.", "Build nodes and edges from structured knowledge.", ["knowledge", "graph"], ["Define node and edge types.", "Extract or ingest facts.", "Create nodes and edges.", "Index for traversal."], ["Graph is connected where intended"], ["Orphan nodes unintentional"], ["Nodes", "Edges"]],
  ["Knowledge Versioning", "knowledge.versioning", "Versioning enables rollback and audit.", "Version each change; support diff and rollback.", ["knowledge", "versioning"], ["On change create new version.", "Store diff or snapshot.", "Expose version history.", "Support rollback."], ["Every change versioned"], ["Overwrite without version"], ["Versions", "Rollbacks"]],
  ["Semantic Tagging", "knowledge.graphs", "Tags improve retrieval and consistency.", "Assign tags from vocabulary to items.", ["knowledge", "tagging"], ["Define vocabulary.", "Tag each item.", "Index by tag.", "Enforce vocabulary."], ["Tags from vocabulary"], ["Free-form only"], ["Tags", "Coverage"]],
  ["Knowledge Deduplication", "knowledge.graphs", "Deduplication avoids redundant nodes.", "Detect duplicates before or after insert.", ["knowledge", "dedup"], ["Compute signature or hash.", "Look up existing.", "If duplicate merge or skip.", "Otherwise insert."], ["Duplicates detected"], ["Duplicate inserted"], ["Checked", "Merged"]],
  ["Source Credibility Evaluation", "knowledge.graphs", "Credibility affects trust in knowledge.", "Score source credibility; use in ranking.", ["knowledge", "credibility"], ["Identify source.", "Gather credibility signals.", "Score source.", "Attach to derived knowledge."], ["Score attached"], ["No scoring"], ["Sources", "Scores"]],
  ["Knowledge Conflict Resolution", "knowledge.graphs", "Resolving conflicts keeps the graph consistent.", "Detect conflicts; apply resolution policy.", ["knowledge", "conflict"], ["Detect conflicting claims.", "Apply policy (newest, source rank).", "Resolve or flag.", "Update graph."], ["Conflict resolved or flagged"], ["Conflict ignored"], ["Conflicts", "Resolved"]],
  ["Knowledge Summarization", "knowledge.graphs", "Summaries support quick retrieval.", "Produce short summary of knowledge item.", ["knowledge", "summary"], ["Get full content.", "Extract key points.", "Produce summary within length.", "Attach to item."], ["Summary within length"], ["Key info missing"], ["Length", "Coverage"]],
  ["Knowledge Retrieval Strategy", "knowledge.graphs", "Retrieval finds relevant knowledge for context.", "Index and query by semantic or keyword.", ["knowledge", "retrieval"], ["Build index.", "Accept query.", "Rank by relevance.", "Return top-k."], ["Results ranked"], ["No ranking"], ["Results", "Precision"]],
];

// ── Software Engineering (12) ──────────────────────────────────────────────
const SOFTWARE_ENGINEERING = [
  ["Modular Architecture", "software.architecture", "Modules reduce coupling and improve reuse.", "Design system as modules with clear boundaries.", ["software", "architecture", "modular"], ["Identify boundaries.", "Define module interfaces.", "Implement behind interface.", "Minimize cross-module deps."], ["Interfaces defined", "Low coupling"], ["No interfaces"], ["Modules", "Coupling"]],
  ["Dependency Injection", "software.design_patterns", "Injecting dependencies improves testability.", "Pass dependencies in; do not construct inside.", ["software", "di"], ["Define interfaces.", "Implement concretions.", "Inject at construction.", "Test with mocks."], ["Deps injected"], ["Deps constructed inside"], ["Deps", "Tests"]],
  ["Interface Abstraction", "software.design_patterns", "Abstractions hide implementation details.", "Expose interface; hide implementation.", ["software", "interface"], ["Define public interface.", "Implement behind it.", "Keep impl details private.", "Document contract."], ["Interface stable"], ["Leaky abstraction"], ["Interfaces"]],
  ["Code Refactoring Strategy", "software.design_patterns", "Refactoring improves structure without changing behavior.", "Improve structure in small steps; test after each.", ["software", "refactoring"], ["Identify smell or goal.", "Choose small refactor.", "Apply and run tests.", "Commit; repeat."], ["Tests pass after each step"], ["Behavior changed"], ["Steps", "Tests"]],
  ["Code Review Process", "software.design_patterns", "Reviews catch defects and improve quality.", "Review code for correctness, style, and design.", ["software", "review"], ["Get change and context.", "Check correctness and edge cases.", "Check style and design.", "Approve or request changes."], ["Review criteria applied"], ["Rubber-stamp"], ["Comments", "Approvals"]],
  ["Debugging Workflow", "software.debugging", "Systematic debugging finds root cause.", "Reproduce, isolate, fix, verify.", ["software", "debugging"], ["Reproduce failure.", "Gather evidence.", "Isolate cause.", "Fix and add test."], ["Reproduced", "Test added"], ["No reproduction"], ["Steps", "Time"]],
  ["Logging Strategy", "software.observability", "Structured logs support diagnosis.", "Log events with level, message, and context.", ["software", "logging"], ["Choose log level.", "Structure message and context.", "Emit log.", "Avoid PII in logs."], ["Structured", "No PII"], ["Unstructured", "PII logged"], ["Events", "Levels"]],
  ["Observability Pattern", "software.observability", "Observability enables diagnosis in production.", "Metrics, logs, and traces for key paths.", ["software", "observability"], ["Define metrics and traces.", "Instrument code.", "Export to backend.", "Alert on SLO."], ["Metrics and traces defined"], ["No traces"], ["Metrics", "Traces"]],
  ["Performance Profiling", "software.performance", "Profiling finds bottlenecks.", "Measure where time or memory is spent.", ["software", "profiling"], ["Run under profiler.", "Identify hot spots.", "Optimize or document.", "Re-measure."], ["Bottleneck identified"], ["No baseline"], ["Hot spots", "Improvement"]],
  ["Load Testing", "software.testing", "Load tests validate behavior under load.", "Apply target load; measure latency and errors.", ["software", "load-testing"], ["Define scenario and load.", "Run load test.", "Measure latency and error rate.", "Compare to SLO."], ["Load and SLO defined"], ["No SLO"], ["RPS", "Latency"]],
  ["Concurrency Control", "software.architecture", "Correct concurrency avoids races and deadlocks.", "Use locks, transactions, or message passing.", ["software", "concurrency"], ["Identify shared state.", "Choose mechanism.", "Apply consistently.", "Test under concurrency."], ["Shared state protected"], ["Data race"], ["Critical sections"]],
  ["State Management", "software.architecture", "Explicit state management reduces bugs.", "Centralize state; make transitions explicit.", ["software", "state"], ["Define state shape.", "Define transitions.", "Single source of truth.", "Validate transitions."], ["Transitions valid"], ["Implicit state"], ["States", "Transitions"]],
];

// ── Data Systems (12) ─────────────────────────────────────────────────────
const DATA_SYSTEMS = [
  ["Schema Design Strategy", "database.schema_design", "Good schemas support query and evolution.", "Design schema for access patterns and constraints.", ["data", "schema"], ["Identify entities and relations.", "Choose normal form.", "Define types and constraints.", "Document access patterns."], ["Schema documented"], ["No constraints"], ["Tables", "Constraints"]],
  ["Database Normalization", "database.schema_design", "Normalization reduces redundancy and anomalies.", "Decompose to normal form.", ["data", "normalization"], ["List attributes and FDs.", "Decompose to 3NF or BCNF.", "Preserve dependencies.", "Verify no redundancy."], ["Normal form achieved"], ["Anomaly possible"], ["Tables", "FDs"]],
  ["Indexing Strategy", "database.indexing", "Indexes speed queries at write cost.", "Add indexes for filter and join columns.", ["data", "indexing"], ["Identify slow queries.", "Check existing indexes.", "Add index for predicate/join.", "Measure plan and latency."], ["Index used in plan"], ["Full scan where index could help"], ["Indexes", "Latency"]],
  ["Query Optimization", "sql.optimization", "Optimization reduces latency and load.", "Analyze plan; add index or rewrite query.", ["data", "query"], ["Get query and plan.", "Identify bottleneck.", "Rewrite or add index.", "Re-measure."], ["Plan improved"], ["No measurement"], ["Queries", "Improvement"]],
  ["ETL Pipeline Construction", "database.schema_design", "ETL moves and transforms data reliably.", "Extract, transform, load with idempotency.", ["data", "etl"], ["Extract from source.", "Transform (clean, map).", "Load to target.", "Support incremental and full."], ["Idempotent where possible"], ["No incremental"], ["Rows", "Latency"]],
  ["Data Validation", "database.schema_design", "Validating data preserves quality.", "Validate on ingest and at boundaries.", ["data", "validation"], ["Define schema or rules.", "Validate on write.", "Reject or quarantine invalid.", "Report quality metrics."], ["Invalid rejected"], ["Invalid stored"], ["Valid", "Invalid"]],
  ["Data Partitioning", "database.schema_design", "Partitioning scales and prunes data.", "Partition by key; prune in queries.", ["data", "partitioning"], ["Choose partition key.", "Partition table or stream.", "Query with partition filter.", "Maintain partition lifecycle."], ["Queries prune partitions"], ["Full scan over partitions"], ["Partitions", "Pruned"]],
  ["Caching Strategy", "database.optimization", "Caching reduces load and latency.", "Cache hot data; invalidate on write.", ["data", "cache"], ["Identify hot data.", "Choose cache layer.", "Set TTL or invalidation.", "Measure hit rate."], ["Invalidation defined"], ["Stale cache"], ["Hit rate", "Latency"]],
  ["Data Replication", "distributed.systems", "Replication improves availability and read scale.", "Replicate with consistency model.", ["data", "replication"], ["Choose consistency.", "Configure replication.", "Monitor lag.", "Handle failover."], ["Lag monitored"], ["No lag check"], ["Replicas", "Lag"]],
  ["Stream Processing", "distributed.systems", "Streams handle unbounded data.", "Process events in order with state.", ["data", "streaming"], ["Consume stream.", "Process with state.", "Emit or sink.", "Checkpoint for recovery."], ["Checkpoints enabled"], ["No recovery"], ["Events", "Latency"]],
  ["Batch Aggregation", "database.optimization", "Batch aggregation reduces query load.", "Pre-aggregate in batches.", ["data", "aggregation"], ["Define aggregation.", "Run batch job.", "Store result.", "Query pre-aggregate."], ["Freshness defined"], ["Stale aggregate"], ["Batch size", "Freshness"]],
  ["Data Consistency Models", "distributed.systems", "Consistency models set expectations.", "Choose and enforce consistency level.", ["data", "consistency"], ["Choose model (strong, eventual).", "Configure system.", "Document for users.", "Monitor violations."], ["Model documented"], ["Violation undetected"], ["Model", "Violations"]],
];

// ── Security & Reliability (10) ────────────────────────────────────────────
const SECURITY_RELIABILITY = [
  ["Authentication Strategy", "software.security", "Authentication verifies identity.", "Verify identity before granting access.", ["security", "authn"], ["Collect credentials.", "Verify against store.", "Issue token or session.", "Reject if invalid."], ["Credentials verified"], ["Auth bypass"], ["Attempts", "Success"]],
  ["Authorization Model", "software.security", "Authorization enforces what identity can do.", "Check permission for each action.", ["security", "authz"], ["Identify principal and resource.", "Load policy.", "Check permission.", "Allow or deny."], ["Every action checked"], ["Default allow"], ["Checks", "Denials"]],
  ["Input Sanitization", "software.security", "Sanitization prevents injection and XSS.", "Sanitize or escape input for context.", ["security", "sanitization"], ["Get input and context.", "Apply allowlist or escape.", "Validate output.", "Use sanitized value."], ["Output safe for context"], ["Raw input in output"], ["Inputs", "Sanitized"]],
  ["Secure API Design", "software.security", "APIs must enforce auth and rate limits.", "Design API with auth, validation, and limits.", ["security", "api"], ["Require auth per endpoint.", "Validate input.", "Rate limit.", "Log access."], ["Auth and limits on all"], ["No rate limit"], ["Endpoints", "Calls"]],
  ["Cryptographic Hashing", "software.security", "Hashing preserves integrity and hides content.", "Use approved hash; verify when needed.", ["security", "hashing"], ["Choose algorithm (e.g. SHA-256).", "Hash content.", "Store or compare.", "Use constant-time for secrets."], ["Approved algorithm"], ["Weak hash"], ["Hashes", "Verify"]],
  ["Secret Management", "software.security", "Secrets must not appear in code or logs.", "Store in vault; inject at runtime.", ["security", "secrets"], ["Store in vault.", "Inject at runtime.", "Rotate periodically.", "Audit access."], ["No secrets in code"], ["Secret in repo"], ["Secrets", "Access"]],
  ["Threat Modeling", "software.security", "Threat models guide mitigations.", "Identify assets, threats, and mitigations.", ["security", "threat-model"], ["List assets.", "Identify threats.", "Score risk.", "Define mitigations."], ["Threats identified"], ["No mitigation"], ["Threats", "Mitigations"]],
  ["Rate Limiting", "software.security", "Rate limiting prevents abuse.", "Limit requests per key or IP.", ["security", "rate-limit"], ["Define limit and window.", "Count per key.", "Reject over limit.", "Return retry-after."], ["Limit enforced"], ["No limit"], ["Limit", "Rejections"]],
  ["Access Logging", "software.security", "Access logs support audit and investigation.", "Log who did what and when.", ["security", "logging"], ["Log identity, action, resource.", "Include timestamp.", "Protect log integrity.", "Retain per policy."], ["Sensitive access logged"], ["No audit trail"], ["Events", "Retention"]],
  ["Integrity Verification", "software.security", "Integrity checks detect tampering.", "Verify hash or signature on read or use.", ["security", "integrity"], ["Compute or store hash/sig.", "On use verify.", "Reject if mismatch.", "Log violation."], ["Verified on use"], ["No verification"], ["Checks", "Failures"]],
];

type SeedRow = readonly [string, string, string, string, string[], string[], string[], string[], string[]];

function fromRow(row: SeedRow): KBv24Artifact {
  return superSeed(
    row[0],
    row[1],
    row[2],
    row[3],
    [...row[4]],
    [...row[5]],
    row[6] ? [...row[6]] : ["Procedure completed.", "Output valid."],
    row[7] ? [...row[7]] : ["Procedure failed.", "Invalid output."],
    row[8] ? [...row[8]] : ["Steps completed", "Result quality"]
  );
}

export const SUPER_SEED_TEMPLATES: KBv24Artifact[] = [
  ...(AGENT_PLANNING as unknown as SeedRow[]).map(fromRow),
  ...(REASONING_ANALYSIS as unknown as SeedRow[]).map(fromRow),
  ...(EXECUTION_STRATEGIES as unknown as SeedRow[]).map(fromRow),
  ...(VALIDATION_TESTING as unknown as SeedRow[]).map(fromRow),
  ...(ERROR_HANDLING as unknown as SeedRow[]).map(fromRow),
  ...(TOOL_USAGE as unknown as SeedRow[]).map(fromRow),
  ...(KNOWLEDGE_MANAGEMENT as unknown as SeedRow[]).map(fromRow),
  ...(SOFTWARE_ENGINEERING as unknown as SeedRow[]).map(fromRow),
  ...(DATA_SYSTEMS as unknown as SeedRow[]).map(fromRow),
  ...(SECURITY_RELIABILITY as unknown as SeedRow[]).map(fromRow),
];
