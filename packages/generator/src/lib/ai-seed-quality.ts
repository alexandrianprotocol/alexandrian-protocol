/**
 * Deterministic AI-seed quality: title, tags, validation, step–interface consistency, quality score.
 * Raises AI-generated seeds toward super-seed quality without relying on the model.
 */

import type { KBv24Artifact, StructuredStep, StepItem } from "../types/artifact.js";

/** Domain-specific title templates: more precise than generic "{Concept} Strategy". */
const DOMAIN_TITLE_TEMPLATES: Record<string, string> = {
  "software.security":    "Security Invariant Enforcement",
  "software.architecture":"Architectural Boundary Contract",
  "software.testing":     "Test Verification Protocol",
  "software.performance": "Performance Threshold Validation",
  "evm.solidity":         "Solidity State Transition Validation",
  "evm.abi":              "ABI Encoding Contract",
  "evm.gas":              "Gas Optimization Invariant",
  "ai.prompting":         "Prompt Engineering Standard",
  "ai.agents":            "Agent Execution Protocol",
  "ai.evaluation":        "Model Evaluation Rubric",
  "web.api":              "API Contract Enforcement",
  "web.frontend":         "Frontend Rendering Invariant",
  "meta.protocol":        "Protocol Schema Contract",
  "sql.optimization":     "Query Optimization Procedure",
  "sql.schema":           "Schema Migration Protocol",
};

/** Generate a domain-specific title (more precise than the generic "X Strategy"). */
export function generateTitle(domain: string): string {
  // Exact match first
  if (DOMAIN_TITLE_TEMPLATES[domain]) return DOMAIN_TITLE_TEMPLATES[domain];
  // Prefix match (longest wins)
  const prefixMatch = Object.keys(DOMAIN_TITLE_TEMPLATES)
    .filter((k) => domain.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  if (prefixMatch) return DOMAIN_TITLE_TEMPLATES[prefixMatch];
  // Fallback: use second + last domain segment with specific suffix
  const parts = domain.split(".").filter(Boolean);
  const concept = (parts[parts.length - 1] ?? domain).replace(/_/g, " ");
  const capitalized = concept.replace(/\b\w/g, (c) => c.toUpperCase());
  if (/reasoning|deduction|induction|abduction/i.test(domain)) return capitalized + " Method";
  if (/evaluation|assessment|rubric/i.test(domain)) return capitalized + " Evaluation";
  if (/protocol|spec|schema/i.test(domain)) return capitalized + " Contract";
  return capitalized + " Procedure";
}

/** Generate tags from domain segments + concept parts (e.g. software.security.input_sanitization → ["software","security","input","sanitization"]). */
export function generateTags(domain: string): string[] {
  const parts = domain.split(".").filter(Boolean);
  const concept = parts[parts.length - 1] ?? "";
  const conceptParts = concept.split("_").filter(Boolean);
  return [...parts, ...conceptParts];
}

/** Domain-specific default metrics (more meaningful than generic ["execution_steps","completion_time","output_quality"]). */
const DOMAIN_METRICS: Record<string, string[]> = {
  "software.":  ["error_rate", "response_time_p95", "test_coverage"],
  "evm.":       ["gas_used", "revert_rate", "confirmation_latency_ms"],
  "ai.":        ["token_count", "coherence_score", "hallucination_rate"],
  "web.":       ["ttfb_ms", "cls_score", "http_error_rate"],
  "sql.":       ["query_latency_p95_ms", "index_hit_rate", "row_scan_ratio"],
  "meta.":      ["schema_validation_pass_rate", "hash_collision_rate", "artifact_integrity_score"],
};

/** Default fallback metrics. */
export const DEFAULT_METRICS = ["execution_steps", "success_rate", "latency_p95"];

/** Get domain-appropriate metrics. */
export function getDomainMetrics(domain: string): string[] {
  const key = Object.keys(DOMAIN_METRICS)
    .filter((k) => domain.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return key ? DOMAIN_METRICS[key] : DEFAULT_METRICS;
}

/** Map of step action verbs to meaningful success formulas. */
const VERB_FORMULA_MAP: Record<string, string> = {
  validate: "validation_pass_rate >= 0.99",
  verify:   "verification_pass_rate >= 0.99",
  detect:   "detection_latency_p95 < 500ms",
  enforce:  "enforcement_violations === 0",
  sanitize: "sanitized_output_ratio >= 0.99",
  extract:  "extraction_success_rate >= 0.95",
  invoke:   "invocation_error_rate < 0.01",
  emit:     "event_delivery_rate >= 0.999",
  measure:  "measurement_error < 0.05",
  compute:  "computation_error_rate < 0.001",
};

/** Build measurable validation block from structured steps and interface output names. */
export function generateValidationFromSteps(
  steps: StepItem[],
  outputNames: string[],
  domain?: string
): { success_conditions: string[]; failure_conditions: string[]; metrics: string[] } {
  const structured = steps.filter(
    (s): s is StructuredStep => typeof s === "object" && s !== null && "produces" in s
  );

  const success_conditions: string[] = [];
  const failure_conditions: string[] = [];

  // Try to derive formula-based conditions from step verbs
  const verbsUsed = structured
    .map((s) => s.action?.split("_")[0]?.toLowerCase() ?? "")
    .filter(Boolean);

  for (const verb of verbsUsed) {
    const formula = VERB_FORMULA_MAP[verb];
    if (formula && !success_conditions.includes(formula)) {
      const stepIndex = structured.findIndex((s) => s.action?.startsWith(verb)) + 1;
      success_conditions.push(formula);
      failure_conditions.push(
        `${formula.split(" ")[0]} below threshold because step ${stepIndex} did not complete`
      );
    }
  }

  // Fallback: output-name conditions when no verb map hit
  for (const out of outputNames) {
    if (!success_conditions.some((c) => c.includes(out))) {
      success_conditions.push(`${out}_produced === true`);
      failure_conditions.push(`${out}_produced === false because output not generated`);
    }
  }

  const lastProduces =
    structured.length > 0 && structured[structured.length - 1].produces
      ? structured[structured.length - 1].produces!
      : [];
  for (const p of lastProduces) {
    if (!outputNames.includes(p) && !success_conditions.some((c) => c.includes(p))) {
      success_conditions.push(`${p}_generated === true`);
    }
  }

  if (success_conditions.length === 0) {
    success_conditions.push("all_steps_completed === true");
    failure_conditions.push("completion_rate < 1.0 because one or more steps failed");
  }

  return {
    success_conditions,
    failure_conditions,
    metrics: getDomainMetrics(domain ?? ""),
  };
}

/** Check that every step input exists in interface.inputs or in a previous step's produces. */
export function validateStepInterfaceConsistency(artifact: KBv24Artifact): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const iface = artifact.payload?.interface;
  const steps = artifact.payload?.inline_artifact?.steps;
  if (!iface || !Array.isArray(steps)) return { valid: true, errors: [] };

  const inputNames = new Set(iface.inputs.map((i) => i.name));
  const available = new Set<string>(inputNames);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (typeof step !== "object" || step === null || !("inputs" in step)) continue;
    const inputs: string[] = Array.isArray(step.inputs) ? step.inputs : [];
    for (const inp of inputs) {
      if (!available.has(inp)) {
        errors.push(`step ${i + 1} (${(step as StructuredStep).id ?? "?"}): input "${inp}" not in interface or previous produces`);
      }
    }
    const produces: string[] = Array.isArray((step as StructuredStep).produces) ? (step as StructuredStep).produces! : [];
    for (const p of produces) available.add(p);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Unified step count ranges — single source of truth used by both seedQualityScore and seedQualityReasons.
 * Ensures no inconsistency between scoring and reason output.
 */
const STEP_COUNT_RANGES: Record<string, [number, number]> = {
  procedural:  [3, 9],
  evaluative:  [3, 7],
  declarative: [2, 7],
};

function isStepCountOk(epistemicType: string, stepCount: number): boolean {
  const range = STEP_COUNT_RANGES[epistemicType] ?? [3, 9];
  return stepCount >= range[0] && stepCount <= range[1];
}

/** Quality score 0–8: title(1), tags≥3(1), validation populated(2), step count ok(1), interface consistency(2), domain(1). Accept if ≥ 6. */
export const SEED_QUALITY_MIN_SCORE = 6;

export function seedQualityScore(artifact: KBv24Artifact): number {
  let score = 0;
  if (artifact.identity?.title?.trim() && artifact.identity.title !== "Untitled") score += 1;
  const tags = artifact.semantic?.tags ?? [];
  if (tags.length >= 3) score += 1;
  const v = artifact.validation;
  if (v && Array.isArray(v.success_conditions) && v.success_conditions.length > 0) score += 1;
  if (v && Array.isArray(v.failure_conditions) && v.failure_conditions.length > 0) score += 1;
  const steps = artifact.payload?.inline_artifact?.steps ?? [];
  const stepCount = steps.length;
  const ep = artifact.identity?.epistemic_type ?? "procedural";
  if (isStepCountOk(ep, stepCount)) score += 1;
  const consistency = validateStepInterfaceConsistency(artifact);
  if (consistency.valid) score += 2;
  if (artifact.semantic?.domain?.trim()) score += 1;
  return score;
}

/** Reason a seed lost points (for scan output). */
export function seedQualityReasons(artifact: KBv24Artifact): { score: number; missing: string[] } {
  const missing: string[] = [];
  let score = 0;

  if (artifact.identity?.title?.trim() && artifact.identity.title !== "Untitled") score += 1;
  else missing.push("title");

  const tags = artifact.semantic?.tags ?? [];
  if (tags.length >= 3) score += 1;
  else missing.push(`tags(${tags.length}/3)`);

  const v = artifact.validation;
  if (v && Array.isArray(v.success_conditions) && v.success_conditions.length > 0) score += 1;
  else missing.push("success_conditions");
  if (v && Array.isArray(v.failure_conditions) && v.failure_conditions.length > 0) score += 1;
  else missing.push("failure_conditions");

  const steps = artifact.payload?.inline_artifact?.steps ?? [];
  const stepCount = steps.length;
  const ep = artifact.identity?.epistemic_type ?? "procedural";
  if (isStepCountOk(ep, stepCount)) score += 1;
  else {
    const range = STEP_COUNT_RANGES[ep] ?? [3, 9];
    missing.push(`steps(${ep}:${stepCount}, expected ${range[0]}–${range[1]})`);
  }

  const consistency = validateStepInterfaceConsistency(artifact);
  if (consistency.valid) score += 2;
  else missing.push("interface/step_consistency");

  if (artifact.semantic?.domain?.trim()) score += 1;
  else missing.push("domain");

  return { score, missing };
}
