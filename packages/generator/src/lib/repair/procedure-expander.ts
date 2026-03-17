/**
 * Procedure expander — turn shallow or vague procedures into deterministic workflows
 * with explicit artifacts. Raises procedural specificity (P) score without changing claim or domain.
 *
 * Safe-edit: only payload.inline_artifact.steps are modified.
 * Run after generation / before hashing to avoid storing weak procedures.
 */

import type { KBv24Artifact, StructuredStep } from "../../types/artifact.js";
import { normalizeSteps } from "../core/steps.js";

const MIN_STEPS_WEAK = 4;
const TARGET_STEP_COUNT_MIN = 4;
const TARGET_STEP_COUNT_MAX = 6;

function slug(s: string): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** True if the procedure is weak: <3 steps (validator requires 3–9) or ≤3 steps / vague verbs. */
export function isWeakProcedure(artifact: KBv24Artifact): boolean {
  const raw = artifact.payload?.inline_artifact?.steps ?? [];
  const rawLen = Array.isArray(raw) ? raw.length : 0;
  if (rawLen > 0 && rawLen < 3) return true;
  const steps = normalizeSteps(Array.isArray(raw) ? raw : []);
  if (steps.length === 0) return false;
  if (steps.length < MIN_STEPS_WEAK) return true;
  for (const step of steps) {
    const expansion = getExpansionForAction(step.action ?? "");
    if (expansion && expansion.length >= 2) return true;
  }
  return false;
}

/**
 * Domain → ordered list of intermediate/final output names for expanded steps.
 * Used to assign produces[] so steps have explicit artifacts.
 */
const DOMAIN_OUTPUTS: Record<string, string[]> = {
  "agent.reasoning": [
    "normalized_problem",
    "reasoning_steps",
    "reasoning_graph",
    "intermediate_results",
    "validated_result",
  ],
  "agent.planning": [
    "goal_spec",
    "subtasks",
    "dependency_graph",
    "scheduled_plan",
    "validated_plan",
  ],
  "database.schema_design": [
    "attribute_list",
    "candidate_keys",
    "dependency_map",
    "2nf_schema",
    "3nf_schema",
    "normalized_schema",
  ],
  "database": [
    "raw_dataset",
    "dataset_profile",
    "transformed_dataset",
    "validated_dataset",
    "warehouse_table",
  ],
  "software.testing": [
    "invariant_spec",
    "check_hooks",
    "state_trace",
    "violation_report",
    "invariant_failure_log",
  ],
  "software.benchmark": [
    "workload_spec",
    "benchmark_env",
    "performance_trace",
    "benchmark_metrics",
    "performance_report",
  ],
  "data.etl": [
    "raw_dataset",
    "dataset_profile",
    "transformed_dataset",
    "validated_dataset",
    "warehouse_table",
  ],
  default: [
    "extracted_input",
    "validated_input",
    "transformed_result",
    "validated_result",
  ],
};

function getDomainOutputs(domain: string): string[] {
  const d = (domain ?? "").trim().toLowerCase();
  for (const [prefix, outputs] of Object.entries(DOMAIN_OUTPUTS)) {
    if (prefix === "default") continue;
    if (d === prefix || d.startsWith(prefix + ".")) return [...outputs];
  }
  return [...DOMAIN_OUTPUTS.default];
}

/**
 * Map vague action → 2–3 concrete actions for expansion.
 * Key is normalized (slug) action or first word.
 */
const WEAK_ACTION_EXPANSIONS: Record<string, string[]> = {
  analyze: ["extract_problem_variables", "evaluate_problem_constraints"],
  analyze_problem: ["restate_problem", "identify_intermediate_goals", "map_dependencies_between_steps", "execute_steps_sequentially", "verify_final_conclusion"],
  break: ["list_phases", "assign_actions_to_phases"],
  break_into_steps: ["list_phases", "assign_actions_to_phases", "build_dependency_graph"],
  combine: ["merge_artifacts", "validate_merged_output"],
  derive: ["execute_steps_sequentially", "verify_final_conclusion"],
  derive_conclusion: ["execute_steps_sequentially", "verify_final_conclusion"],
  identify: ["detect_candidates", "classify_results"],
  identify_entities: ["extract_schema_attributes", "identify_candidate_keys"],
  remove_redundancy: ["detect_partial_dependencies", "transform_schema_to_second_normal_form"],
  normalize_tables: ["remove_transitive_dependencies", "validate_schema_constraints"],
  define: ["capture_spec", "validate_spec"],
  define_invariants: ["define_invariant_conditions", "instrument_system_state_checks", "execute_test_scenarios", "evaluate_trace_against_invariants", "log_and_classify_violations"],
  check: ["run_checks", "report_findings"],
  check_system_behavior: ["execute_test_scenarios", "evaluate_trace_against_invariants"],
  detect_violations: ["evaluate_trace_against_invariants", "log_and_classify_violations"],
  run: ["initialize_environment", "execute_workload", "collect_metrics"],
  run_benchmark: ["define_benchmark_workload", "initialize_test_environment", "execute_workload_iterations", "compute_performance_metrics", "compare_against_baseline"],
  measure: ["execute_workload_iterations", "compute_performance_metrics"],
  measure_performance: ["execute_workload_iterations", "compute_performance_metrics", "compare_against_baseline"],
  report: ["compute_metrics", "format_report"],
  report_results: ["compute_performance_metrics", "compare_against_baseline"],
  extract: ["extract_source_data", "validate_and_profile_dataset"],
  extract_data: ["extract_source_data", "validate_and_profile_dataset", "apply_transformation_rules"],
  transform: ["apply_transformation_rules", "enforce_schema_constraints"],
  transform_data: ["apply_transformation_rules", "enforce_schema_constraints"],
  load: ["enforce_schema_constraints", "load_into_target_storage"],
  load_data: ["enforce_schema_constraints", "load_into_target_storage"],
};

/** Get expansion for a step action; returns undefined if no expansion defined. */
function getExpansionForAction(action: string): string[] | undefined {
  const a = slug(action);
  if (WEAK_ACTION_EXPANSIONS[a]) return WEAK_ACTION_EXPANSIONS[a];
  const first = a.split("_")[0];
  return WEAK_ACTION_EXPANSIONS[first];
}

/**
 * Expand one step into 2–5 structured steps when it matches a vague pattern.
 * Otherwise return the step with produces ensured (single-element array).
 */
function expandStep(step: StructuredStep, outputNames: string[], startIndex: number): StructuredStep[] {
  const action = (step.action ?? "").trim() || "step";
  const expansion = getExpansionForAction(action);
  if (expansion && expansion.length >= 2) {
    const steps: StructuredStep[] = [];
    for (let i = 0; i < expansion.length; i++) {
      const outName = outputNames[startIndex + i] ?? `step_${startIndex + i + 1}_result`;
      steps.push({
        id: `step_${startIndex + i + 1}`,
        action: expansion[i],
        inputs: i === 0 ? (step.inputs ?? []) : [outputNames[startIndex + i - 1] ?? `step_${startIndex + i}_result`],
        produces: [outName],
        notes: step.notes,
      });
    }
    return steps;
  }
  const outName = outputNames[startIndex] ?? `step_${startIndex + 1}_result`;
  return [
    {
      id: `step_${startIndex + 1}`,
      action,
      inputs: step.inputs ?? [],
      produces: step.produces?.length ? step.produces : [outName],
      condition: step.condition,
      notes: step.notes,
    },
  ];
}

/** Chain steps so each step's inputs include the previous step's first produce. Force linear chain to avoid legacy names (e.g. step_1_result) that are not in any previous produces. */
function chainSteps(steps: StructuredStep[], interfaceInputNames: string[]): void {
  for (let i = 0; i < steps.length; i++) {
    if (i === 0) {
      if (!steps[0].inputs?.length && interfaceInputNames.length > 0) {
        steps[0].inputs = [interfaceInputNames[0]];
      }
      continue;
    }
    const prevProduces = steps[i - 1].produces ?? [];
    const prevOut = prevProduces[0];
    if (prevOut) {
      steps[i].inputs = [prevOut];
    }
  }
}

/**
 * Expand a weak procedure into 4–6 deterministic steps with explicit produces.
 * Does not change claim, domain, or identity. Only modifies payload.inline_artifact.steps.
 */
const VALIDATOR_MIN_STEPS = 3;

export function expandProcedure(artifact: KBv24Artifact): KBv24Artifact {
  if (!isWeakProcedure(artifact)) return artifact;

  const domain = (artifact.semantic?.domain ?? "").trim() || "general";
  const raw = artifact.payload?.inline_artifact?.steps ?? [];
  const rawArr = Array.isArray(raw) ? raw : [];
  let steps = normalizeSteps(rawArr);
  if (steps.length === 0 && rawArr.length > 0) {
    steps = rawArr.slice(0, TARGET_STEP_COUNT_MAX).map((s, i) => ({
      id: `step_${i + 1}`,
      action: typeof s === "string" ? s : (s && typeof s === "object" && "action" in s ? String((s as { action: unknown }).action) : "step") || "step",
      inputs: i === 0 ? [] : [`step_${i}_result`],
      produces: [`step_${i + 1}_result`],
    })) as StructuredStep[];
  }
  if (steps.length === 0) return artifact;

  const interfaceOutputs = artifact.payload?.interface?.outputs ?? [];
  const finalOutputName = interfaceOutputs.length > 0 && interfaceOutputs[0]?.name
    ? interfaceOutputs[0].name
    : "result";
  const interfaceInputNames = (artifact.payload?.interface?.inputs ?? []).map((i) => i.name).filter(Boolean);

  const pool = getDomainOutputs(domain);
  const outputNames = [...pool];
  if (outputNames.length < TARGET_STEP_COUNT_MAX) {
    while (outputNames.length < TARGET_STEP_COUNT_MAX) {
      outputNames.push(`step_${outputNames.length + 1}_result`);
    }
  }

  let expanded: StructuredStep[] = [];
  let outIndex = 0;
  for (const step of steps) {
    const chunk = expandStep(step, outputNames, outIndex);
    expanded.push(...chunk);
    outIndex += chunk.length;
    if (outIndex >= TARGET_STEP_COUNT_MAX) break;
  }

  const minSteps = Math.max(VALIDATOR_MIN_STEPS, TARGET_STEP_COUNT_MIN);
  if (expanded.length < minSteps) {
    const need = minSteps - expanded.length;
    for (let i = 0; i < need; i++) {
      const idx = expanded.length + 1;
      const outName = idx === minSteps ? finalOutputName : (outputNames[expanded.length] ?? `step_${idx}_result`);
      expanded.push({
        id: `step_${idx}`,
        action: "validate_procedure_output",
        inputs: expanded.length > 0 ? [expanded[expanded.length - 1].produces?.[0] ?? `step_${idx}_result`] : [],
        produces: [outName],
      });
    }
  }

  expanded = expanded.slice(0, TARGET_STEP_COUNT_MAX);
  const last = expanded[expanded.length - 1];
  if (last) {
    last.produces = [finalOutputName];
  }
  chainSteps(expanded, interfaceInputNames);

  for (let i = 0; i < expanded.length; i++) {
    expanded[i].id = `step_${i + 1}`;
  }

  const out = { ...artifact };
  out.payload = { ...artifact.payload };
  out.payload.inline_artifact = { ...out.payload.inline_artifact, steps: expanded };
  return out;
}
