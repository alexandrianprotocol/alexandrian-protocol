/**
 * KBv2.4 artifact validator
 *
 * Checks:
 *  - All required fields present and correctly typed
 *  - Seed rules: is_seed true ⇒ knowledge_inputs.used.length === 0
 *  - Super-seed procedural clarity: 3–7 steps for procedure/algorithm
 *  - No null in required string fields (except lineage.parent_hash)
 */

import type { KBv24Artifact, StructuredStep, DerivationTransformation } from "../../types/artifact.js";
import { validateArtifactRefs } from "../artifacts/artifact-registry.js";

const DERIVATION_TRANSFORMATIONS: DerivationTransformation[] = [
  "specialization",
  "generalization",
  "composition",
  "adaptation",
  "optimization",
  "failure_mode",
  "evaluation",
  "variant",
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Simplified epistemological dimension (3 values). */
const EPISTEMIC_TYPES = ["declarative", "procedural", "evaluative"] as const;
/** Functional KB types for execution routing and interface contract. */
const KB_TYPES = [
  "procedure", "pattern", "invariant", "constraint", "evaluation",
  "transformation", "protocol", "artifact_spec", "context", "anti_pattern", "heuristic",
] as const;
/** Invalid (epistemic_type, kb_type) pairs — rejected by validator. See EXECUTION-SEMANTICS.md. */
const INVALID_EPISTEMIC_KB_PAIRS: [string, string][] = [
  ["declarative", "transformation"],
  ["declarative", "procedure"],
  ["evaluative", "transformation"],
  ["evaluative", "protocol"],
  ["evaluative", "context"],
];
const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;
const COMPOSITION_TYPES = ["merge", "extend", "override", "specialize", "generalize"] as const;
/** automatic = safe for autonomous execution; advisory = requires human review. */
const EXECUTION_MODES = ["automatic", "advisory"] as const;
const DETERMINISM_TYPES = ["deterministic", "probabilistic", "non-deterministic"] as const;

function str(x: unknown): x is string {
  return typeof x === "string";
}

function num(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function arr(x: unknown): x is unknown[] {
  return Array.isArray(x);
}

export function validateArtifact(artifact: unknown): ValidationResult {
  const errors: string[] = [];

  if (!artifact || typeof artifact !== "object") {
    return { valid: false, errors: ["Artifact must be an object"] };
  }

  const a = artifact as Record<string, unknown>;

  // ── identity ─────────────────────────────────────────────────────────────
  const identity = a.identity as Record<string, unknown> | undefined;
  if (!identity || typeof identity !== "object") {
    errors.push("identity is required and must be an object");
  } else {
    if (!str(identity.title) || (identity.title as string).length === 0) errors.push("identity.title is required (non-empty string)");
    if (str(identity.title) && (identity.title as string).length > 80) errors.push("identity.title must be at most 80 characters");
    if (!EPISTEMIC_TYPES.includes(identity.epistemic_type as typeof EPISTEMIC_TYPES[number])) {
      errors.push("identity.epistemic_type must be one of: " + EPISTEMIC_TYPES.join(", "));
    }
    const kbType = identity.kb_type as string | undefined;
    if (!kbType || !KB_TYPES.includes(kbType as typeof KB_TYPES[number])) {
      errors.push("identity.kb_type is required and must be one of: " + KB_TYPES.join(", "));
    }
    if (kbType && EPISTEMIC_TYPES.includes(identity.epistemic_type as typeof EPISTEMIC_TYPES[number])) {
      const pair: [string, string] = [identity.epistemic_type as string, kbType];
      if (INVALID_EPISTEMIC_KB_PAIRS.some(([e, k]) => e === pair[0] && k === pair[1])) {
        errors.push(`EPISTEMIC_KB_TYPE: invalid pair (epistemic_type=${pair[0]}, kb_type=${pair[1]}). See EXECUTION-SEMANTICS.md.`);
      }
    }
    if (!str(identity.version)) errors.push("identity.version is required");
    if (identity.status !== "active" && identity.status !== "deprecated" && identity.status !== "draft") {
      errors.push("identity.status must be active | deprecated | draft");
    }
    if (typeof identity.is_seed !== "boolean") errors.push("identity.is_seed must be boolean");
    const schema = identity.schema as string;
    if (schema !== "alexandrian.kb.v2.4" && schema !== "alexandrian.kb.v2.5") {
      errors.push("identity.schema must be 'alexandrian.kb.v2.4' or 'alexandrian.kb.v2.5'");
    }
  }

  // ── claim ────────────────────────────────────────────────────────────────
  const claim = a.claim as Record<string, unknown> | undefined;
  if (!claim || typeof claim !== "object") {
    errors.push("claim is required and must be an object");
  } else {
    if (!str(claim.statement) || claim.statement.length === 0) errors.push("claim.statement is required");
    if (claim.confidence !== null && (!num(claim.confidence) || claim.confidence < 0 || claim.confidence > 1)) {
      errors.push("claim.confidence must be null (unassessed) or a number in [0, 1]");
    }
    if (typeof claim.falsifiable !== "boolean") errors.push("claim.falsifiable must be boolean");
  }

  // ── semantic ──────────────────────────────────────────────────────────────
  const semantic = a.semantic as Record<string, unknown> | undefined;
  if (!semantic || typeof semantic !== "object") {
    errors.push("semantic is required and must be an object");
  } else {
    if (!str(semantic.summary) || (semantic.summary as string).length === 0) errors.push("semantic.summary is required");
    if (str(semantic.summary) && (semantic.summary as string).length > 280) errors.push("semantic.summary must be at most 280 characters");
    if (!arr(semantic.tags)) errors.push("semantic.tags must be an array of strings");
    if (!str(semantic.domain) || semantic.domain.length === 0) errors.push("semantic.domain is required");
    if (!DIFFICULTY_LEVELS.includes(semantic.difficulty as typeof DIFFICULTY_LEVELS[number])) {
      errors.push("semantic.difficulty must be one of: " + DIFFICULTY_LEVELS.join(", "));
    }
    const caps = semantic.capabilities;
    if (caps !== undefined && caps !== null && !arr(caps)) errors.push("semantic.capabilities must be an array of strings");
    else if (Array.isArray(caps) && caps.some((x) => typeof x !== "string")) errors.push("semantic.capabilities must contain only strings");
    const execClass = semantic.execution_class;
    if (execClass !== undefined && execClass !== null) {
      if (!["reasoning", "transformation", "evaluation", "validation"].includes(execClass as string)) {
        errors.push("semantic.execution_class must be one of: reasoning, transformation, evaluation, validation");
      }
    }
    const concepts = semantic.concepts;
    if (concepts !== undefined && concepts !== null && !arr(concepts)) errors.push("semantic.concepts must be an array of strings");
    else if (Array.isArray(concepts) && concepts.some((x) => typeof x !== "string")) errors.push("semantic.concepts must contain only concept_id strings");
    const invariants = semantic.invariants;
    if (invariants !== undefined && invariants !== null && !arr(invariants)) errors.push("semantic.invariants must be an array of strings");
    else if (Array.isArray(invariants) && invariants.some((x) => typeof x !== "string")) errors.push("semantic.invariants must contain only invariant_id strings");
  }

  // ── knowledge_inputs ─────────────────────────────────────────────────────
  const ki = a.knowledge_inputs as Record<string, unknown> | undefined;
  if (!ki || typeof ki !== "object") {
    errors.push("knowledge_inputs is required and must be an object");
  } else {
    if (!num(ki.minimum_required) || ki.minimum_required < 0) errors.push("knowledge_inputs.minimum_required must be >= 0");
    if (!num(ki.recommended) || ki.recommended < 0) errors.push("knowledge_inputs.recommended must be >= 0");
    if (!COMPOSITION_TYPES.includes(ki.composition_type as typeof COMPOSITION_TYPES[number])) {
      errors.push("knowledge_inputs.composition_type must be one of: " + COMPOSITION_TYPES.join(", "));
    }
    if (!arr(ki.used)) errors.push("knowledge_inputs.used must be an array");
    else {
      (ki.used as unknown[]).forEach((u, i) => {
        if (!u || typeof u !== "object") errors.push(`knowledge_inputs.used[${i}] must be an object`);
        else {
          const o = u as Record<string, unknown>;
          if (!str(o.kb_id)) errors.push(`knowledge_inputs.used[${i}].kb_id is required`);
          if (!str(o.role)) errors.push(`knowledge_inputs.used[${i}].role is required`);
          if (o.contribution !== undefined && !str(o.contribution)) errors.push(`knowledge_inputs.used[${i}].contribution must be string if present`);
        }
      });
    }
    const isSeedLater = identity && (identity as Record<string, unknown>).is_seed === true;
    if (!isSeedLater && arr(ki.used)) {
      const usedLen = (ki.used as unknown[]).length;
      if (usedLen < 2) errors.push("REASONING_EDGE: derived KB must have at least 2 parents (used.length >= 2)");
      if (usedLen > 3) errors.push("REASONING_EDGE: derived KB must have at most 3 parents (used.length <= 3)");
    }
    const transformation = ki?.transformation;
    if (transformation !== undefined && transformation !== null) {
      if (!DERIVATION_TRANSFORMATIONS.includes(transformation as DerivationTransformation)) {
        errors.push("knowledge_inputs.transformation must be one of: " + DERIVATION_TRANSFORMATIONS.join(", "));
      }
    }
  }

  // ── Seed rules ───────────────────────────────────────────────────────────
  const isSeed = identity && identity.is_seed === true;
  const used = ki?.used as unknown[] | undefined;
  if (isSeed && arr(used) && used.length > 0) {
    errors.push("SEED_RULE: identity.is_seed is true but knowledge_inputs.used is not empty");
  }

  // ── reasoning ───────────────────────────────────────────────────────────
  const reasoning = a.reasoning as Record<string, unknown> | undefined;
  if (!reasoning || typeof reasoning !== "object") errors.push("reasoning is required");
  else {
    if (!arr(reasoning.requires)) errors.push("reasoning.requires must be an array");
    else {
      (reasoning.requires as unknown[]).forEach((r, i) => {
        if (typeof r === "string") return;
        if (!r || typeof r !== "object") errors.push(`reasoning.requires[${i}] must be string or { kb_id, reason? }`);
        else {
          const o = r as Record<string, unknown>;
          if (!str(o.kb_id)) errors.push(`reasoning.requires[${i}].kb_id is required`);
          if (o.reason !== undefined && !str(o.reason)) errors.push(`reasoning.requires[${i}].reason must be string if present`);
        }
      });
    }
    if (!arr(reasoning.contradicts)) errors.push("reasoning.contradicts must be an array");
    if (!arr(reasoning.related)) errors.push("reasoning.related must be an array");
  }

  // ── execution ────────────────────────────────────────────────────────────
  const execution = a.execution as Record<string, unknown> | undefined;
  if (!execution || typeof execution !== "object") errors.push("execution is required");
  else {
    if (!num(execution.trust_tier) || execution.trust_tier < 0 || execution.trust_tier > 5) {
      errors.push("execution.trust_tier must be 0–5");
    }
    if (!EXECUTION_MODES.includes(execution.execution_mode as typeof EXECUTION_MODES[number])) {
      errors.push("execution.execution_mode must be one of: " + EXECUTION_MODES.join(", "));
    }
    if (!DETERMINISM_TYPES.includes(execution.determinism as typeof DETERMINISM_TYPES[number])) {
      errors.push("execution.determinism must be one of: " + DETERMINISM_TYPES.join(", "));
    }
    if (typeof execution.idempotent !== "boolean") errors.push("execution.idempotent must be boolean");
    const preconditions = execution.preconditions;
    if (preconditions !== undefined && preconditions !== null) {
      if (!arr(preconditions)) errors.push("execution.preconditions must be an array of strings");
      else if ((preconditions as unknown[]).some((x) => typeof x !== "string")) {
        errors.push("execution.preconditions must contain only strings");
      }
    }
    const costEst = execution.cost_estimate;
    if (costEst !== undefined && costEst !== null) {
      if (typeof costEst !== "object") errors.push("execution.cost_estimate must be an object or omitted");
      else {
        const ce = costEst as Record<string, unknown>;
        if (ce.time_complexity !== undefined && !str(ce.time_complexity)) errors.push("execution.cost_estimate.time_complexity must be string");
        if (ce.expected_latency_ms !== undefined && !num(ce.expected_latency_ms)) errors.push("execution.cost_estimate.expected_latency_ms must be number");
        if (ce.expected_token_cost !== undefined && !num(ce.expected_token_cost)) errors.push("execution.cost_estimate.expected_token_cost must be number");
        if (ce.resource_class !== undefined && !["cheap", "moderate", "expensive"].includes(ce.resource_class as string)) {
          errors.push("execution.cost_estimate.resource_class must be cheap | moderate | expensive");
        }
      }
    }
  }

  // ── validation ───────────────────────────────────────────────────────────
  const validation = a.validation as Record<string, unknown> | undefined;
  if (!validation || typeof validation !== "object") errors.push("validation is required");
  else {
    const validateCondition = (arrName: string, items: unknown[]) => {
      items.forEach((c, i) => {
        if (typeof c === "string") return;
        if (!c || typeof c !== "object") errors.push(`validation.${arrName}[${i}] must be string or { id?, condition }`);
        else {
          const o = c as Record<string, unknown>;
          if (!str(o.condition)) errors.push(`validation.${arrName}[${i}].condition is required`);
          if (o.id !== undefined && !str(o.id)) errors.push(`validation.${arrName}[${i}].id must be string if present`);
        }
      });
    };
    if (!arr(validation.success_conditions)) errors.push("validation.success_conditions must be an array");
    else validateCondition("success_conditions", validation.success_conditions as unknown[]);
    if (!arr(validation.failure_conditions)) errors.push("validation.failure_conditions must be an array");
    else validateCondition("failure_conditions", validation.failure_conditions as unknown[]);
    if (!arr(validation.metrics)) errors.push("validation.metrics must be an array");
  }

  // ── payload ──────────────────────────────────────────────────────────────
  const payload = a.payload as Record<string, unknown> | undefined;
  if (!payload || typeof payload !== "object") {
    errors.push("payload is required and must be an object");
  } else {
    if (!str(payload.artifact_type)) errors.push("payload.artifact_type is required");
    const loc = payload.location as string | undefined;
    if (loc !== undefined && !["inline", "ipfs", "url", "hybrid"].includes(loc)) {
      errors.push("payload.location must be one of: inline, ipfs, url, hybrid");
    }
    if (!payload.interface || typeof payload.interface !== "object") errors.push("payload.interface is required");
    else {
      const iface = payload.interface as Record<string, unknown>;
      if (!arr(iface.inputs)) errors.push("payload.interface.inputs must be an array");
      if (!arr(iface.outputs)) errors.push("payload.interface.outputs must be an array");
      if (!arr(iface.parameters)) errors.push("payload.interface.parameters must be an array");
      const isSeedIface = identity && (identity as Record<string, unknown>).is_seed === true;
      if (isSeedIface && arr(iface.inputs) && (iface.inputs as unknown[]).length < 2) {
        errors.push("SEED_INTERFACE: seeds must have at least 2 interface inputs (got " + (iface.inputs as unknown[]).length + ")");
      }
      if (isSeedIface && arr(iface.outputs) && (iface.outputs as unknown[]).length < 1) {
        errors.push("SEED_INTERFACE: seeds must have at least 1 interface output");
      }
      /** Context KB: must have exactly one output with type "context_result" (EXECUTION-SEMANTICS). */
      const kbType = identity && (identity as Record<string, unknown>).kb_type as string | undefined;
      if (kbType && arr(iface.outputs)) {
        const outputs = iface.outputs as { type?: string; name?: string }[];
        // Context KB contract
        if (kbType === "context") {
          const contextResult = outputs.some(
            (o) => o && (o.type === "context_result" || o.name === "relevant_kb_set" || o.name === "kb_set")
          );
          if (!contextResult) {
            errors.push(
              "CONTEXT_KB_OUTPUT: kb_type context requires one output with type 'context_result' (or name relevant_kb_set/kb_set). See EXECUTION-SEMANTICS.md."
            );
          }
        }
        // kb_type-specific interface guardrails (light checks, not strict enums)
        if (kbType === "procedure") {
          if ((iface.inputs as unknown[]).length < 1) {
            errors.push("KB_TYPE_PROCEDURE: procedure must have at least 1 interface input");
          }
          if (outputs.length < 1) {
            errors.push("KB_TYPE_PROCEDURE: procedure must have at least 1 interface output");
          }
        } else if (kbType === "evaluation") {
          const evalOut = outputs.some((o) => {
            const t = (o.type ?? "").toString().toLowerCase();
            const n = (o.name ?? "").toString().toLowerCase();
            return t.includes("score") || t.includes("metric") || t.includes("pass_fail") || n.includes("score") || n.includes("metric") || n.includes("pass_fail");
          });
          if (!evalOut) {
            errors.push(
              "KB_TYPE_EVALUATION: evaluation KB should have an output whose type or name includes score/metric/pass_fail"
            );
          }
        } else if (kbType === "invariant") {
          const invOut = outputs.some((o) => {
            const t = (o.type ?? "").toString().toLowerCase();
            const n = (o.name ?? "").toString().toLowerCase();
            return t === "validation_result" || n.includes("valid") || n.includes("passes");
          });
          if (!invOut) {
            errors.push(
              "KB_TYPE_INVARIANT: invariant KB should have an output named/typed like validation_result / *valid* / *passes*"
            );
          }
        } else if (kbType === "transformation") {
          const inLen = (iface.inputs as unknown[]).length;
          if (inLen < 1) {
            errors.push("KB_TYPE_TRANSFORMATION: transformation must have at least 1 interface input");
          }
          if (outputs.length < 1) {
            errors.push("KB_TYPE_TRANSFORMATION: transformation must have at least 1 interface output");
          } else {
            const derivedOut = outputs.some((o) => {
              const t = (o.type ?? "").toString().toLowerCase();
              const n = (o.name ?? "").toString().toLowerCase();
              return t.includes("artifact") || t.includes("spec") || t.includes("schema") || n.includes("artifact") || n.includes("spec") || n.includes("schema");
            });
            if (!derivedOut) {
              errors.push(
                "KB_TYPE_TRANSFORMATION: transformation output type/name should clearly denote a derived artifact (artifact/spec/schema)"
              );
            }
          }
        }
      }
    }
    const inline = payload.inline_artifact as Record<string, unknown> | undefined;
    const stepsArr = inline?.steps;
    if (!inline || !arr(stepsArr)) errors.push("payload.inline_artifact.steps must be an array");
    else {
      const steps = stepsArr as unknown[];
      const isSeed = (a.identity as Record<string, unknown>)?.is_seed === true;
      const epistemicType = (a.identity as Record<string, unknown>)?.epistemic_type as string | undefined;
      const stepCount = steps.length;
      if (isSeed && epistemicType) {
        // Simplified epistemic_type: declarative | procedural | evaluative (EXECUTION-SEMANTICS).
        const ok =
          (epistemicType === "procedural" && stepCount >= 3 && stepCount <= 9) ||
          (epistemicType === "declarative" && stepCount >= 2 && stepCount <= 7) ||
          (epistemicType === "evaluative" && stepCount >= 3 && stepCount <= 7);
        if (!ok) {
          const ranges: Record<string, string> = {
            procedural: "3–9",
            declarative: "2–7",
            evaluative: "3–7",
          };
          const range = ranges[epistemicType] ?? "3–9";
          errors.push(`SUPER_SEED_RULE: steps for epistemic_type ${epistemicType} must be ${range} (got ${stepCount})`);
        }
      } else if (steps.length < 3 || steps.length > 9) {
        errors.push("payload.inline_artifact.steps must have 3–9 steps (got " + stepCount + ")");
      }
      const schema = (a.identity as Record<string, unknown>)?.schema as string | undefined;
      if (schema === "alexandrian.kb.v2.5" && steps.length > 0) {
        const seenIds = new Set<string>();
        const iface = payload.interface as { inputs?: { name: string }[]; outputs?: { name: string }[] } | undefined;
        const inputNames = new Set((iface?.inputs ?? []).map((i) => (i as { name?: string }).name).filter(Boolean) as string[]);
        /** Step graph guard: inputs must be interface inputs or previous step produces. */
        const available = new Set<string>(inputNames);
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          if (typeof s === "string") continue;
          if (!s || typeof s !== "object") {
            errors.push("payload.inline_artifact.steps[" + i + "]: structured step must be object with id, action");
            continue;
          }
          const step = s as Record<string, unknown>;
          if (!str(step.id)) errors.push("payload.inline_artifact.steps[" + i + "]: id is required");
          else if (seenIds.has(step.id as string)) errors.push("payload.inline_artifact.steps: duplicate step id " + step.id);
          else seenIds.add(step.id as string);
          if (!str(step.action)) errors.push("payload.inline_artifact.steps[" + i + "]: action is required");
          const inputs = step.inputs as unknown;
          if (inputs !== undefined && !arr(inputs)) errors.push("payload.inline_artifact.steps[" + i + "]: inputs must be string[]");
          else if (arr(inputs)) {
            for (const id of inputs as string[]) {
              if (id && typeof id === "string" && !available.has(id)) {
                errors.push(`STEP_GRAPH: step ${i} inputs reference "${id}" which is not in interface inputs or previous step produces`);
              }
            }
          }
          const produces = step.produces as unknown;
          if (produces !== undefined && !arr(produces)) errors.push("payload.inline_artifact.steps[" + i + "]: produces must be string[]");
          else if (arr(produces)) for (const p of produces as string[]) available.add(p);
        }
      }
    }
  }

  // ── evidence ────────────────────────────────────────────────────────────
  const evidence = a.evidence as Record<string, unknown> | undefined;
  if (!evidence || typeof evidence !== "object") errors.push("evidence is required");
  else {
    if (!arr(evidence.sources)) errors.push("evidence.sources must be an array");
    if (!arr(evidence.benchmarks)) errors.push("evidence.benchmarks must be an array");
    if (typeof evidence.notes !== "string") errors.push("evidence.notes must be a string");
  }

  // ── provenance ───────────────────────────────────────────────────────────
  const provenance = a.provenance as Record<string, unknown> | undefined;
  if (!provenance || typeof provenance !== "object") errors.push("provenance is required");
  else {
    if (!provenance.author || typeof provenance.author !== "object") errors.push("provenance.author is required");
    if (!num(provenance.royalty_bps) || provenance.royalty_bps < 0 || provenance.royalty_bps > 10000) {
      errors.push("provenance.royalty_bps must be 0–10000");
    }
    const lineage = provenance.lineage as Record<string, unknown> | undefined;
    if (!lineage || typeof lineage !== "object") errors.push("provenance.lineage is required");
    else {
      if (!num(lineage.depth) || lineage.depth < 0) errors.push("provenance.lineage.depth must be >= 0");
      if (lineage.parent_hash !== null && !str(lineage.parent_hash)) {
        errors.push("provenance.lineage.parent_hash must be string or null");
      }
    }
  }

  // ── state_transition (GDKR) ───────────────────────────────────────────────
  const st = a.state_transition as Record<string, unknown> | undefined;
  if (st !== undefined && st !== null) {
    if (typeof st !== "object") errors.push("state_transition must be an object");
    else {
      if (!str(st.input_state) || (st.input_state as string).length === 0) {
        errors.push("state_transition.input_state must be a non-empty string");
      }
      if (!str(st.output_state) || (st.output_state as string).length === 0) {
        errors.push("state_transition.output_state must be a non-empty string");
      }
    }
  }

  // ── artifact_refs (optional) ──────────────────────────────────────────────
  const refs = a.artifact_refs;
  if (refs !== undefined && refs !== null) {
    errors.push(...validateArtifactRefs(refs));
  }

  // ── narrative (optional) ──────────────────────────────────────────────────
  const narrative = a.narrative;
  if (narrative !== undefined && narrative !== null) {
    if (typeof narrative !== "object") errors.push("narrative must be an object");
    else {
      const n = narrative as Record<string, unknown>;
      if (n.purpose !== undefined && !str(n.purpose)) errors.push("narrative.purpose must be string if present");
      if (n.design_rationale !== undefined && !str(n.design_rationale)) errors.push("narrative.design_rationale must be string if present");
      if (n.context !== undefined && !str(n.context)) errors.push("narrative.context must be string if present");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/** Run validator and throw if invalid. */
export function assertValid(artifact: unknown): asserts artifact is KBv24Artifact {
  const result = validateArtifact(artifact);
  if (!result.valid) {
    throw new Error("Validation failed: " + result.errors.join("; "));
  }
}
