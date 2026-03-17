/**
 * State ontology for Goal-Directed Knowledge Routing (GDKR).
 *
 * Agents query (current_state, desired_state); indexer returns shortest path of KBs.
 * Use these canonical state names so edges chain across artifacts.
 */

import type { StateTransition } from "../types/artifact.js";

/** Canonical states for the agent capability loop (goal → plan → execute → validate). */
export const GDKR_STATES = [
  "raw_goal",
  "goal_defined",
  "task_graph_created",
  "execution_plan_created",
  "task_executed",
  "result_validated",
  "failure_detected",
  "failure_recovered",
  "context_compressed",
  "query_optimized",
] as const;

export type GDKRState = (typeof GDKR_STATES)[number];

/**
 * Map seed domain + title pattern to state transition.
 * Indexer uses these to build the state graph for planning.
 */
export function getStateTransitionForSeed(domain: string, title: string): StateTransition | undefined {
  const d = domain.toLowerCase();
  const t = title.toLowerCase();

  // Goal definition: raw_goal → goal_defined
  if (d.includes("planning") && (t.includes("goal definition") || t.includes("goal_definition"))) {
    return { input_state: "raw_goal", output_state: "goal_defined" };
  }
  // Task decomposition: goal_defined → task_graph_created
  if (d.includes("planning") && (t.includes("task decomposition") || t.includes("decomposition"))) {
    return { input_state: "goal_defined", output_state: "task_graph_created" };
  }
  // Hierarchical / dependency / sequencing: task_graph → execution_plan
  if (
    d.includes("planning") &&
    (t.includes("hierarchical") || t.includes("dependency") || t.includes("sequencing") || t.includes("priority"))
  ) {
    return { input_state: "task_graph_created", output_state: "execution_plan_created" };
  }
  // Execution / fallback / contingency: execution_plan → task_executed
  if (d.includes("planning") && (t.includes("fallback") || t.includes("contingency") || t.includes("execution"))) {
    return { input_state: "execution_plan_created", output_state: "task_executed" };
  }
  // Validation / evaluation: task_executed → result_validated
  if (d.includes("validation") || d.includes("reasoning") && (t.includes("evidence") || t.includes("evaluation"))) {
    return { input_state: "task_executed", output_state: "result_validated" };
  }
  // Error recovery: failure_detected → failure_recovered
  if (d.includes("error") || d.includes("failure") || (d.includes("execution") && t.includes("recovery"))) {
    return { input_state: "failure_detected", output_state: "failure_recovered" };
  }
  // Context compression
  if (d.includes("memory") || d.includes("context") && t.includes("compress")) {
    return { input_state: "raw_goal", output_state: "context_compressed" };
  }
  // Query optimization (e.g. SQL)
  if (d.includes("sql") || d.includes("query") && t.includes("optim")) {
    return { input_state: "query_optimized", output_state: "query_optimized" };
  }

  return undefined;
}

/**
 * For derived KBs: infer state transition from transformation and parent domains.
 * Default: generic transition so the artifact still appears in the state graph.
 */
export function getStateTransitionForDerived(
  transformation: string,
  _parentDomains: string[]
): StateTransition {
  switch (transformation) {
    case "specialization":
      return { input_state: "goal_defined", output_state: "task_graph_created" };
    case "composition":
      return { input_state: "task_graph_created", output_state: "execution_plan_created" };
    case "optimization":
      return { input_state: "execution_plan_created", output_state: "task_executed" };
    case "failure_mode":
      return { input_state: "failure_detected", output_state: "failure_recovered" };
    case "evaluation":
      return { input_state: "task_executed", output_state: "result_validated" };
    default:
      return { input_state: "goal_defined", output_state: "execution_plan_created" };
  }
}
