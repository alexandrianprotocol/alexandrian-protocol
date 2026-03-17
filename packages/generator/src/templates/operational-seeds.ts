/**
 * Operational seed templates — agent capability loop
 *
 * KBs designed for agent use: decide, plan, execute, verify.
 * Each has inputs, outputs, steps, success_conditions, failure_conditions.
 * Domains align with config/agent-capability-domains.ts.
 */

import type { KBv24Artifact, EpistemicType } from "../types/artifact.js";

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
  },
  evidence: { sources: [] as string[], benchmarks: [] as string[], notes: "" },
  provenance: {
    author: { address: "" },
    royalty_bps: 250,
    lineage: { depth: 0, parent_hash: null as string | null },
  },
};

function seed(
  title: string,
  domain: string,
  claim: string,
  summary: string,
  tags: string[],
  steps: string[],
  success: string[],
  failure: string[],
  metrics: string[],
  epistemic_type: EpistemicType = "procedural"
): KBv24Artifact {
  return {
    identity: {
      kb_id: "",
      epistemic_type,
      kb_type: "procedure",
      title,
      version: "1.0.0",
      status: "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.4",
    },
    claim: { statement: claim, confidence: 0.9, falsifiable: true },
    semantic: { summary, tags, domain, difficulty: "intermediate" as const },
    ...BASE,
    validation: { success_conditions: success, failure_conditions: failure, metrics },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [{ name: "goal", type: "string", description: "High-level goal or task" }],
        outputs: [{ name: "plan", type: "string", description: "Structured plan or next steps" }],
        parameters: [],
      },
      inline_artifact: { steps },
    },
  };
}

/** Planning & reasoning (agent.planning, etc.) */
export const PLANNING_SEEDS: KBv24Artifact[] = [
  seed(
    "Task Decomposition Strategy",
    "agent.planning.task_decomposition",
    "Breaking a complex goal into smaller tasks improves planning reliability and enables incremental verification.",
    "Strategy for decomposing complex goals into manageable subtasks with clear inputs and outputs.",
    ["agent", "planning", "task-decomposition"],
    [
      "Identify the overall objective and success criteria.",
      "Split the objective into discrete subtasks that can be executed or verified independently.",
      "Define dependencies between subtasks (order and data flow).",
      "Prioritize execution order and identify parallelizable work.",
      "Assign inputs and outputs to each subtask so agents can chain them.",
    ],
    ["All subtasks have defined inputs and outputs", "Dependencies form a DAG with no cycles"],
    ["Single monolithic step with no decomposition", "Circular dependencies between subtasks"],
    ["Number of subtasks", "Depth of decomposition", "Parallelism potential"]
  ),
  seed(
    "Hierarchical Planning Model",
    "agent.planning.hierarchical",
    "Hierarchical planning reduces complexity in multi-step problem solving by grouping actions into phases.",
    "Use layered planning: high-level phases then detailed actions within each phase.",
    ["agent", "planning", "hierarchical"],
    [
      "Define the high-level objective.",
      "Break the objective into phases (e.g. discover, design, implement, validate).",
      "Expand each phase into concrete actions or sub-goals.",
      "Execute actions sequentially within each phase; phases may have ordering constraints.",
    ],
    ["Phases are ordered and non-overlapping", "Each phase has at least one actionable step"],
    ["Phases with no concrete actions", "Unbounded recursion in expansion"],
    ["Phase count", "Actions per phase", "Total steps"]
  ),
  seed(
    "Goal Prioritization Framework",
    "agent.planning",
    "Explicit prioritization of goals prevents thrashing and ensures critical outcomes are achieved first.",
    "Prioritize goals by impact, urgency, and dependencies before allocating resources.",
    ["agent", "planning", "prioritization"],
    [
      "List all candidate goals or tasks.",
      "Score each by impact (outcome value) and urgency (time-sensitivity).",
      "Identify dependencies: which goals block or enable others.",
      "Order goals by priority; resolve ties using dependency order (prerequisites first).",
      "Allocate execution capacity to the top-N goals; defer or drop lower-priority items.",
    ],
    ["Priority order is deterministic given same inputs", "Dependencies are respected in order"],
    ["All goals treated equally", "Circular dependency in priority graph"],
    ["Goals prioritized", "Dependency depth"]
  ),
  seed(
    "Dependency Resolution Method",
    "agent.planning",
    "Resolving dependencies before execution prevents deadlocks and ensures correct execution order.",
    "Build a dependency graph and produce a valid execution order (topological sort).",
    ["agent", "planning", "dependencies"],
    [
      "Collect all tasks and their declared dependencies (task A depends on task B).",
      "Build a directed graph: nodes = tasks, edges = dependencies.",
      "Detect cycles; if any exist, report and fail or break cycles by relaxing constraints.",
      "Compute a topological order (e.g. Kahn or DFS-based).",
      "Return the ordered list as the execution plan.",
    ],
    ["Output order respects all dependencies", "No cycles in the final graph"],
    ["Cycle in dependency graph left unresolved", "Order violates a declared dependency"],
    ["Task count", "Dependency count", "Cycle detection"]
  ),
  seed(
    "Constraint-Based Planning",
    "agent.planning",
    "Stating constraints explicitly allows the planner to satisfy them before committing to actions.",
    "List hard and soft constraints; filter or rank plans by constraint satisfaction.",
    ["agent", "planning", "constraints"],
    [
      "Enumerate hard constraints (must hold) and soft constraints (preferred).",
      "Generate or retrieve candidate plans or actions.",
      "Filter candidates by hard constraints; discard any that violate them.",
      "Rank remaining candidates by soft constraint satisfaction.",
      "Select the best candidate or return the ranked list for downstream choice.",
    ],
    ["All returned plans satisfy hard constraints", "Ranking is deterministic for same inputs"],
    ["Plan that violates a hard constraint is returned", "Soft constraints ignored in ranking"],
    ["Constraints satisfied", "Candidates filtered"]
  ),
  seed(
    "Iterative Refinement Strategy",
    "agent.planning",
    "Refining a plan in iterations allows early feedback and reduces risk of large-scale rework.",
    "Produce an initial plan, validate or execute a slice, then refine based on outcomes.",
    ["agent", "planning", "refinement"],
    [
      "Produce a first-pass plan (may be coarse or partial).",
      "Identify a minimal slice that can be executed or validated (e.g. one subtask or one phase).",
      "Execute or validate the slice; collect results or errors.",
      "If the slice fails, adjust the plan (fix assumptions, add steps, or reorder) and repeat.",
      "If the slice succeeds, extend the plan to the next slice and repeat until the goal is met.",
    ],
    ["Each iteration produces a concrete slice", "Refinements are based on slice outcomes"],
    ["No slice selected", "Plan never updated after failure"],
    ["Iteration count", "Slices completed", "Refinements applied"]
  ),
];

/** Execution strategies (agent.execution, agent.tool_selection) */
export const EXECUTION_SEEDS: KBv24Artifact[] = [
  seed(
    "API Interaction Pattern",
    "agent.execution",
    "Structured API calls with error handling and retries improve reliability of agent-driven integrations.",
    "Pattern for calling external APIs: validate input, call, handle errors, parse response.",
    ["agent", "execution", "api"],
    [
      "Validate request parameters (required fields, types, bounds).",
      "Construct the request (URL, method, headers, body) per API spec.",
      "Send the request with a timeout; retry with backoff on transient failures.",
      "Check HTTP status and response shape; map errors to actionable outcomes.",
      "Parse and return the response payload or a normalized result for downstream use.",
    ],
    ["All required parameters validated before call", "Errors mapped to retry vs fail"],
    ["Raw exception propagated without handling", "No timeout or retry policy"],
    ["Success rate", "Retry count", "Latency p99"]
  ),
  seed(
    "Command-Line Execution Pattern",
    "agent.execution",
    "Running CLI tools safely requires validating arguments, capturing output, and interpreting exit codes.",
    "Execute a CLI command with sanitized arguments and capture stdout, stderr, and exit code.",
    ["agent", "execution", "cli"],
    [
      "Validate and sanitize all arguments (no shell injection; use array-based invocation).",
      "Set a timeout and resource limits (memory, CPU) if supported.",
      "Execute the command in a subprocess; capture stdout, stderr, and exit code.",
      "Interpret exit code: 0 = success; non-zero = map to error type (e.g. validation, runtime).",
      "Return structured result: { success, stdout, stderr, exitCode, errorSummary }.",
    ],
    ["Arguments are not passed via a single shell string", "Exit code is always captured"],
    ["Unsanitized user input in command string", "No timeout on subprocess"],
    ["Exit code", "Output size", "Duration"]
  ),
  seed(
    "Tool Selection Strategy",
    "agent.tool_selection",
    "Selecting tools based on task requirements improves execution accuracy and reduces unnecessary calls.",
    "Match task description and constraints to available tools; pick the best fit before executing.",
    ["agent", "tool_selection"],
    [
      "Identify the task requirements (inputs, expected output, constraints).",
      "List available tools with their descriptions, inputs, and outputs.",
      "Score each tool by fit: input/output compatibility, constraint satisfaction, and relevance.",
      "Select the highest-scoring tool; if none fits, return a clear 'no match' and optional suggestions.",
      "Return the chosen tool id and suggested parameters for the executor.",
    ],
    ["Selected tool's interface matches task inputs/outputs", "No tool selected when no fit"],
    ["Tool chosen that cannot satisfy task", "All tools skipped without justification"],
    ["Tools considered", "Match score", "Selection latency"]
  ),
  seed(
    "Error Recovery Strategy",
    "agent.error_recovery",
    "Structured error recovery improves agent resilience and prevents silent failure or infinite retries.",
    "Detect failure, classify error, select recovery (retry, fallback, escalate), then re-execute or report.",
    ["agent", "execution", "error_recovery"],
    [
      "Detect failure (exception, error return, or timeout).",
      "Classify the error: transient (retry), input (validate/fix), or permanent (abort or escalate).",
      "For transient: apply retry with backoff and max attempts; then re-execute.",
      "For input: validate or transform input and retry once; if still failing, report to user.",
      "For permanent: log, report, and optionally trigger a fallback path or human escalation.",
    ],
    ["Every error is classified", "Retries are bounded and use backoff"],
    ["Infinite retry without backoff", "Permanent error treated as retriable"],
    ["Recovery attempts", "Classification accuracy", "Escalation rate"]
  ),
];

/** Validation & testing */
export const VALIDATION_SEEDS: KBv24Artifact[] = [
  seed(
    "Unit Test Generation Strategy",
    "software.testing",
    "Unit tests that target single units with clear inputs and expected outputs catch regressions early.",
    "Generate or structure unit tests: one unit under test, mocked dependencies, assert on outputs.",
    ["software", "testing", "unit-tests"],
    [
      "Identify the unit under test (function, class, or module) and its public interface.",
      "Define test cases: input values and expected outputs or side effects.",
      "Mock or stub dependencies so the unit is tested in isolation.",
      "Execute the unit with each test input; compare actual output to expected.",
      "Report pass/fail per case; aggregate into a test result (e.g. count passed, failed, errors).",
    ],
    ["Each test has a single unit under test", "Dependencies are isolated via mocks"],
    ["Tests depend on real external services", "No assertion on output"],
    ["Tests run", "Pass rate", "Coverage"]
  ),
  seed(
    "Output Consistency Check",
    "ai.output_validation",
    "Checking agent output against a schema or invariant before returning it reduces invalid downstream use.",
    "Validate structured output (e.g. JSON) against a schema; reject or fix before returning.",
    ["validation", "output", "schema"],
    [
      "Obtain the raw output from the agent or pipeline (e.g. JSON string or object).",
      "Load the expected schema (JSON Schema, Zod, or equivalent) for the output type.",
      "Parse and validate the output against the schema.",
      "If valid, return the parsed output; if invalid, either reject with errors or apply a repair (e.g. default values) if policy allows.",
      "Log validation failures for monitoring and tuning.",
    ],
    ["All returned output conforms to schema", "Validation errors are logged"],
    ["Invalid output returned without rejection", "Schema not applied"],
    ["Validation rate", "Repair rate", "Error rate"]
  ),
  seed(
    "Regression Testing Strategy",
    "software.testing",
    "Re-running a fixed set of tests after changes detects regressions before deployment.",
    "Maintain a regression suite; run it on every change and block release on failure.",
    ["software", "testing", "regression"],
    [
      "Define a set of tests that cover critical paths and previously fixed bugs.",
      "Run the full suite on the current codebase (or artifact) after each change.",
      "Compare results to the baseline (e.g. last green run); any new failure is a regression.",
      "Block release or merge if any regression test fails; fix or revert before proceeding.",
      "Add new tests for every bug fix to prevent reversion.",
    ],
    ["Suite runs on every change", "New failures block release"],
    ["Suite skipped for 'quick' changes", "No new test for bug fix"],
    ["Suite size", "Run time", "Failure count"]
  ),
];

/** Software engineering */
export const SOFTWARE_SEEDS: KBv24Artifact[] = [
  seed(
    "Dependency Injection Pattern",
    "software.design_patterns",
    "Injecting dependencies instead of constructing them inside a unit improves testability and flexibility.",
    "Define interfaces, implement them, and inject dependencies at construction or call time.",
    ["software", "design-patterns", "di"],
    [
      "Define interfaces (or abstract types) for each dependency used by the unit.",
      "Implement concrete classes that satisfy the interfaces.",
      "Construct the unit with dependencies passed in (constructor or setter), not created inside.",
      "In production, wire real implementations; in tests, inject mocks or stubs.",
      "Validate configuration and dependency graph at startup (e.g. no cycles, all required bound).",
    ],
    ["Unit does not construct its own dependencies", "Tests use injected mocks"],
    ["Unit instantiates concrete dependencies internally", "No interface abstraction"],
    ["Dependencies injected", "Testability"]
  ),
  seed(
    "Debugging Workflow",
    "software.debugging",
    "Systematic reproduction and isolation of failures reduces debugging time and improves fix quality.",
    "Reproduce the failure, isolate the cause (binary search, logging, or bisect), then fix and verify.",
    ["software", "debugging"],
    [
      "Reproduce the failure with a minimal input or scenario (reduce flakiness).",
      "Gather evidence: logs, stack trace, state at failure point.",
      "Form a hypothesis (e.g. wrong condition, bad input, race).",
      "Isolate: add checks, narrow the code path, or bisect history to find the introducing change.",
      "Apply a fix and re-run the reproduction case; add a regression test.",
    ],
    ["Failure is reproducible before fix", "Fix verified by test"],
    ["Fix without reproduction", "No regression test added"],
    ["Reproduction time", "Isolation precision"]
  ),
];

/** Data systems */
export const DATA_SEEDS: KBv24Artifact[] = [
  seed(
    "B-Tree Index Optimization",
    "database.indexing",
    "Indexes on filter and join columns reduce full table scans and improve query latency.",
    "Identify high-impact queries; add or tune B-tree indexes on predicate and join columns.",
    ["database", "indexing", "btree"],
    [
      "Identify slow or high-frequency queries and their predicate and join columns.",
      "Check existing indexes on those columns; avoid duplicate or redundant indexes.",
      "Add a B-tree index (or composite) that matches the query pattern (order, leading columns).",
      "Measure query plan (e.g. EXPLAIN) before and after; confirm index use.",
      "Monitor write cost; drop unused indexes to reduce write amplification.",
    ],
    ["Index matches query predicate/join", "Plan shows index use"],
    ["Index on every column", "No measurement of plan or latency"],
    ["Index count", "Query latency change", "Write cost"]
  ),
];

/** Knowledge infrastructure */
export const KNOWLEDGE_SEEDS: KBv24Artifact[] = [
  seed(
    "Semantic Tagging Method",
    "knowledge.graphs",
    "Tagging content with controlled vocabulary improves retrieval and graph consistency.",
    "Assign tags from a fixed or extensible vocabulary; use for filtering and traversal.",
    ["knowledge", "tagging", "semantic"],
    [
      "Define or adopt a controlled vocabulary (tags) for the domain.",
      "For each item (e.g. KB, document), select tags that describe its content and intent.",
      "Store tags with the item; index by tag for fast lookup.",
      "Prefer a small set of high-value tags over many ad-hoc labels.",
      "Review and normalize tags periodically to avoid synonym sprawl.",
    ],
    ["Tags come from vocabulary", "Items are indexable by tag"],
    ["Free-form tags only", "No vocabulary or index"],
    ["Tag coverage", "Retrieval precision"]
  ),
];

export const OPERATIONAL_SEED_TEMPLATES: KBv24Artifact[] = [
  ...PLANNING_SEEDS,
  ...EXECUTION_SEEDS,
  ...VALIDATION_SEEDS,
  ...SOFTWARE_SEEDS,
  ...DATA_SEEDS,
  ...KNOWLEDGE_SEEDS,
];
