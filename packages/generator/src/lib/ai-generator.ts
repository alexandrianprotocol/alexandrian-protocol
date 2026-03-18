/**
 * AI-powered KB generator — OpenAI → KBv2.6 artifact
 *
 * Uses GPT-4 to generate one super-seed artifact from a short spec.
 * Emits v2.6 with structured steps and cost_estimate for machine executability.
 * API key: OPENAI_API_KEY from environment (.env).
 * No publishing; output is passed to builder for staging only.
 */

import OpenAI from "openai";
import type { KBv24Artifact, StructuredStep, EpistemicType, KBType } from "../types/artifact.js";
import { validateArtifact } from "./core/validator.js";
import { toStructuredSteps } from "./core/steps.js";
import {
  generateTitle,
  generateTags,
  generateValidationFromSteps,
  validateStepInterfaceConsistency,
  seedQualityScore,
  SEED_QUALITY_MIN_SCORE,
  getDomainMetrics,
} from "./ai-seed-quality.js";
import {
  isProcedurallySpecific,
  proceduralSpecificityScore,
  PROCEDURAL_SPECIFICITY_MIN_SCORE,
} from "./procedural-specificity.js";

export interface SeedSpec {
  /** Domain, e.g. agent.planning, software.testing */
  domain: string;
  /** One-line concept, e.g. "Task Decomposition Strategy" */
  title: string;
  /** Optional hint for the claim and steps */
  concept?: string;
  /** Optional; if omitted, caller can pass epistemicType in options for randomization */
  epistemic_type?: EpistemicType;
}

/** Default distribution for epistemic_type randomization (seeds): procedural 60%, evaluative 40%. */
export const EPISTEMIC_TYPE_DISTRIBUTION: { type: EpistemicType; weight: number }[] = [
  { type: "procedural", weight: 60 },
  { type: "evaluative", weight: 40 },
];

export function sampleEpistemicType(): EpistemicType {
  const r = Math.random() * 100;
  let acc = 0;
  for (const { type, weight } of EPISTEMIC_TYPE_DISTRIBUTION) {
    acc += weight;
    if (r < acc) return type;
  }
  return "procedural";
}

const SYSTEM_PROMPT = `You are a knowledge engineer for the Alexandrian Protocol. You produce exactly one KB artifact in JSON format that follows the KBv2.6 schema (structured steps + cost_estimate).

Before generating, reason briefly (do not output this): (1) What single concept does this artifact encode? (2) What would an agent need (inputs, tools, prior steps) to execute it? (3) What makes it distinct from any parent or related artifacts? Then fill the schema so the artifact is specific and non-generic.

Rules for super-seeds:
1. One fundamental concept per artifact (concept atomicity). Reusable across domains.
2. identity.is_seed must be true. knowledge_inputs.used must be [].
3. identity.kb_id must be "". provenance.author.address must be "".
4. identity.schema must be "alexandrian.kb.v2.6".
4a. identity.epistemic_type must be one of: "declarative", "procedural", "evaluative". For super-seeds default to "procedural" or "evaluative" (not "declarative").
4b. identity.kb_type must be one of: "procedure", "pattern", "invariant", "constraint", "evaluation", "transformation", "protocol", "artifact_spec", "context", "anti_pattern", "heuristic".
4c. Invalid pairs (epistemic_type, kb_type) are forbidden: ("declarative","transformation"), ("declarative","procedure"), ("evaluative","transformation"), ("evaluative","protocol"), ("evaluative","context").
4d. REQUIRED non-empty: claim.statement (one sentence), semantic.summary (short description, max 280 chars), semantic.domain (must match the domain from the user message).
5. identity.title must be a clear, specific title (not "Untitled"). semantic.tags must be at least 3 strings (e.g. from domain segments). validation must include success_conditions, failure_conditions, and metrics arrays (non-empty).
6. Use SPECIFIC action verbs for each step—e.g. extract, validate, apply, detect, invoke, generate, sanitize, emit, enforce, implement, map, construct—NOT vague verbs like combine, merge, analyze, identify_insights, derive_guidance. Step actions should be verb_noun (e.g. validate_input, apply_constraint, emit_event).
7. Use domain-specific names for interface.inputs and interface.outputs (e.g. for software.security: sanitized_input, validation_result; for evm.solidity: contract_state, event_payload; for agent.planning: goal_spec, task_graph). Avoid generic names like context, data, information, result alone.
8. payload.inline_artifact.steps: for seed procedures, aim for 4–7 steps; each step: id, action, inputs (names from interface or previous produces), produces (last step should produce interface.outputs[0].name).
9. Every step input must exist in payload.interface.inputs or in a previous step's produces (dataflow consistency).
10. execution must include cost_estimate: { "resource_class": "cheap"|"moderate"|"expensive", "expected_token_cost": number, "time_complexity": "O(...)" }. Also include execution.preconditions: an array of 1–5 plain-language statements that state what the artifact assumes about the environment (e.g. "tool X available", "prior step Y has run", "input is in format Z"). This makes execution reliable for agents.
11. interface.inputs and interface.outputs use typed names. claim.confidence use null. provenance.royalty_bps 250. lineage: { "depth": 0, "parent_hash": null }.
12. ARTIFACT_REFS: Do NOT embed long enumerations (e.g. >10 items) inside the KB. For standards, UI patterns, design tokens, API rules, or large reference lists, reference an IPFS artifact via artifact_refs. Use an array of { "type": "<category>", "uri": "ipfs://..." or registry name }. Allowed types include: ui_components, ui_copywriting, layout_patterns, design_tokens, accessibility_rules, api_design_standards, distributed_system_patterns, ux_usability_principles, observability_patterns, error_handling_patterns. When the KB describes a standard or UI/API design procedure, include artifact_refs pointing to the relevant reference artifact so agents can fetch the full list from IPFS.

12b. When payload.artifact_type is "checklist", inline_artifact MUST use checklist items, NOT procedure steps. Use this format:
"inline_artifact": {
  "steps": [
    { "id": "item_1", "action": "verify_<specific_condition>", "notes": "Acceptance criterion: <concrete measurable test>" },
    { "id": "item_2", "action": "confirm_<specific_condition>", "notes": "Acceptance criterion: <concrete measurable test>" }
  ]
}
Each action must be a specific check verb (verify_, confirm_, assert_, validate_) followed by the condition name. Each notes field must state the measurable acceptance criterion. Do NOT include inputs/produces chains in checklist items.

Output only valid JSON for a single artifact. Use structured steps like:
"inline_artifact": {
  "steps": [
    { "id": "define_goal", "action": "define_goal", "inputs": ["goal"], "produces": ["goal_spec"] },
    { "id": "identify_subtasks", "action": "identify_subtasks", "inputs": ["goal_spec"], "produces": ["subtasks"] },
    { "id": "map_dependencies", "action": "map_dependencies", "inputs": ["subtasks"], "produces": ["result"] }
  ]
}
Last step's produces must match payload.interface.outputs[0].name (e.g. "result").`;

function str(x: unknown): x is string {
  return typeof x === "string";
}
function num(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function defaults(parsed: Record<string, unknown>): KBv24Artifact {
  const identity = (parsed.identity as Record<string, unknown>) ?? {};
  const claim = (parsed.claim as Record<string, unknown>) ?? {};
  const semantic = (parsed.semantic as Record<string, unknown>) ?? {};
  const knowledge_inputs = (parsed.knowledge_inputs as Record<string, unknown>) ?? {};
  const reasoning = (parsed.reasoning as Record<string, unknown>) ?? {};
  const execution = (parsed.execution as Record<string, unknown>) ?? {};
  const validation = (parsed.validation as Record<string, unknown>) ?? {};
  const payload = (parsed.payload as Record<string, unknown>) ?? {};
  const evidence = (parsed.evidence as Record<string, unknown>) ?? {};
  const provenance = (parsed.provenance as Record<string, unknown>) ?? {};

  const inline = (payload.inline_artifact as Record<string, unknown>) ?? {};
  const iface = (payload.interface as Record<string, unknown>) ?? {};

  return {
    identity: {
      kb_id: "",
      epistemic_type: (identity.epistemic_type as KBv24Artifact["identity"]["epistemic_type"]) ?? "procedural",
      kb_type: (identity.kb_type as KBType) ?? "procedure",
      title: String(identity.title ?? "Untitled"),
      version: String(identity.version ?? "1.0.0"),
      status: (identity.status as KBv24Artifact["identity"]["status"]) ?? "active",
      is_seed: true,
      schema: "alexandrian.kb.v2.6",
    },
    claim: {
      statement: String(claim.statement ?? ""),
      confidence: claim.confidence != null && Number.isFinite(Number(claim.confidence)) ? Number(claim.confidence) : null,
      falsifiable: claim.falsifiable !== false,
    },
    semantic: {
      summary: String(semantic.summary ?? "").slice(0, 280),
      tags: Array.isArray(semantic.tags) ? (semantic.tags as string[]) : [],
      domain: String(semantic.domain ?? ""),
      difficulty: (semantic.difficulty as KBv24Artifact["semantic"]["difficulty"]) ?? "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 0,
      recommended: 0,
      composition_type: (knowledge_inputs.composition_type as KBv24Artifact["knowledge_inputs"]["composition_type"]) ?? "merge",
      used: [],
    },
    reasoning: {
      requires: Array.isArray(reasoning.requires) ? (reasoning.requires as (string | KBv24Artifact["reasoning"]["requires"][0])[]) : [],
      contradicts: Array.isArray(reasoning.contradicts) ? (reasoning.contradicts as string[]) : [],
      related: Array.isArray(reasoning.related) ? (reasoning.related as string[]) : [],
    },
    execution: {
      trust_tier: Number(execution.trust_tier) || 1,
      execution_mode: (execution.execution_mode as KBv24Artifact["execution"]["execution_mode"]) ?? "advisory",
      determinism: (execution.determinism as KBv24Artifact["execution"]["determinism"]) ?? "deterministic",
      idempotent: execution.idempotent !== false,
      cost_estimate:
        execution.cost_estimate && typeof execution.cost_estimate === "object"
          ? {
              time_complexity: str((execution.cost_estimate as Record<string, unknown>).time_complexity) ? String((execution.cost_estimate as Record<string, unknown>).time_complexity) : undefined,
              expected_latency_ms: num((execution.cost_estimate as Record<string, unknown>).expected_latency_ms) ? Number((execution.cost_estimate as Record<string, unknown>).expected_latency_ms) : undefined,
              expected_token_cost: num((execution.cost_estimate as Record<string, unknown>).expected_token_cost) ? Number((execution.cost_estimate as Record<string, unknown>).expected_token_cost) : undefined,
              resource_class: ["cheap", "moderate", "expensive"].includes(String((execution.cost_estimate as Record<string, unknown>).resource_class)) ? (execution.cost_estimate as Record<string, unknown>).resource_class as "cheap" | "moderate" | "expensive" : "cheap",
            }
          : { resource_class: "cheap" as const, expected_token_cost: 150, time_complexity: "O(n)" },
    },
    validation: {
      success_conditions: Array.isArray(validation.success_conditions) ? (validation.success_conditions as (string | KBv24Artifact["validation"]["success_conditions"][0])[]) : [],
      failure_conditions: Array.isArray(validation.failure_conditions) ? (validation.failure_conditions as (string | KBv24Artifact["validation"]["failure_conditions"][0])[]) : [],
      metrics: Array.isArray(validation.metrics) ? (validation.metrics as string[]) : [],
    },
    payload: {
      artifact_type: (payload.artifact_type as KBv24Artifact["payload"]["artifact_type"]) ?? "procedure",
      location: (() => {
        const loc = payload.location as KBv24Artifact["payload"]["location"];
        const hasRefs = Array.isArray(parsed.artifact_refs) && (parsed.artifact_refs as unknown[]).length > 0;
        if (hasRefs && (loc === "inline" || !loc)) return "hybrid";
        return loc ?? "inline";
      })(),
      interface: {
        inputs: (Array.isArray(iface.inputs) && iface.inputs.length > 0) ? (iface.inputs as KBv24Artifact["payload"]["interface"]["inputs"]) : [{ name: "goal", type: "string", description: "Input goal or context" }],
        outputs: Array.isArray(iface.outputs) ? (iface.outputs as KBv24Artifact["payload"]["interface"]["outputs"]) : [{ name: "result", type: "string", description: "Output or plan" }],
        parameters: Array.isArray(iface.parameters) ? (iface.parameters as KBv24Artifact["payload"]["interface"]["parameters"]) : [],
      },
      inline_artifact: (() => {
        const rawSteps = inline.steps;
        if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
          return { steps: toStructuredSteps(["Define the objective.", "Apply the procedure.", "Verify the result."]) };
        }
        const first = rawSteps[0];
        if (typeof first === "object" && first !== null && "id" in first && "action" in first) {
          return { steps: rawSteps as StructuredStep[] };
        }
        return { steps: toStructuredSteps(rawSteps as string[]) };
      })(),
    },
    evidence: {
      sources: Array.isArray(evidence.sources) ? (evidence.sources as string[]) : [],
      benchmarks: Array.isArray(evidence.benchmarks) ? (evidence.benchmarks as string[]) : [],
      notes: String(evidence.notes ?? ""),
    },
    provenance: {
      author: { address: "" },
      royalty_bps: Number((provenance as Record<string, unknown>).royalty_bps) || 250,
      lineage: {
        depth: 0,
        parent_hash: null,
      },
    },
    ...(Array.isArray(parsed.artifact_refs) && parsed.artifact_refs.length > 0
      ? {
          artifact_refs: (parsed.artifact_refs as { type: string; uri: string; label?: string }[]).filter(
            (r) => typeof r.type === "string" && typeof r.uri === "string"
          ),
        }
      : {}),
  } as KBv24Artifact;
}

export interface GenerateSeedOptions {
  /** Override epistemic_type (e.g. from random distribution so AI doesn't produce only procedures). */
  epistemicType?: EpistemicType;
  /** Optional override for kb_type; defaults to "procedure" for super-seeds. */
  kbType?: KBType;
}

/**
 * Retry wrapper: 3 attempts on primary model with exponential backoff, then one attempt on fallback.
 * Non-retryable: HTTP 400 (bad request) and JSON parse errors — propagated immediately.
 */
async function withRetry<T>(
  fn: (model: string) => Promise<T>,
  primaryModel: string,
  fallbackModel: string = "gpt-4o-mini",
  maxRetries: number = 3
): Promise<T> {
  const baseDelay = 1000;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = delay * 0.2 * (Math.random() - 0.5);
        await new Promise((r) => setTimeout(r, Math.round(delay + jitter)));
      }
      return await fn(primaryModel);
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number }).status;
      if (status === 400 || err instanceof SyntaxError) throw err;
      console.error(`[ai-generator] attempt ${attempt + 1}/${maxRetries} failed (status=${status ?? "?"}) — will retry`);
    }
  }
  if (primaryModel !== fallbackModel) {
    console.error(`[ai-generator] primary model exhausted retries; trying fallback ${fallbackModel}`);
    try {
      return await fn(fallbackModel);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Generate one KBv24Artifact from a seed spec using OpenAI.
 * Uses OPENAI_API_KEY from process.env. Validates result and applies defaults for missing fields.
 * Pass epistemicType in options to diversify (e.g. procedural vs evaluative). kb_type defaults to "procedure" for seeds.
 */
export async function generateSeedFromSpec(
  spec: SeedSpec,
  options?: GenerateSeedOptions
): Promise<KBv24Artifact> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env in the project root (or set the env var).");
  }

  const epistemicType = spec.epistemic_type ?? options?.epistemicType ?? sampleEpistemicType();
  const kbType: KBType = options?.kbType ?? "procedure";

  const client = new OpenAI({ apiKey });

  const userContent =
    `Generate a single super-seed KB artifact for:\n` +
    `- domain: ${spec.domain}\n` +
    `- title: ${spec.title}\n` +
    `- identity.epistemic_type must be: ${epistemicType}\n` +
    `- identity.kb_type must be: ${kbType}\n` +
    (spec.concept ? `- concept: ${spec.concept}\n` : "") +
    `\nOutput only the JSON object, no markdown or explanation.`;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const response = await withRetry(
    (m) =>
      client.chat.completions.create({
        model: m,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    model,
    "gpt-4o-mini"
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no content");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("OpenAI response was not valid JSON");
  }

  const artifact = defaults(parsed);
  // Ensure seed rules and apply requested epistemic type
  artifact.identity.is_seed = true;
  artifact.identity.kb_id = "";
  artifact.identity.epistemic_type = epistemicType;
  artifact.identity.kb_type = kbType;
  artifact.knowledge_inputs.used = [];
  artifact.provenance.author.address = "";
  artifact.provenance.lineage = { depth: 0, parent_hash: null };

  // Fallbacks when the model omits or misnames required fields (claim.statement, semantic.summary, semantic.domain)
  if (!artifact.claim.statement?.trim()) {
    artifact.claim.statement = spec.concept || spec.title || `Seed knowledge for ${spec.domain}`;
  }
  if (!artifact.semantic.summary?.trim()) {
    artifact.semantic.summary = artifact.claim.statement.slice(0, 280);
  }
  if (!artifact.semantic.domain?.trim()) {
    artifact.semantic.domain = spec.domain;
  }
  if (!artifact.identity.title?.trim() || artifact.identity.title === "Untitled") {
    artifact.identity.title = (spec.title?.trim() || generateTitle(spec.domain));
  } else {
    artifact.identity.title = artifact.identity.title.trim();
  }

  if (!artifact.semantic.tags?.length || artifact.semantic.tags.length < 3) {
    artifact.semantic.tags = generateTags(spec.domain);
  }

  const outputNames = (artifact.payload?.interface?.outputs ?? []).map((o) => o.name);
  const steps = artifact.payload?.inline_artifact?.steps ?? [];
  const hasValidation =
    (artifact.validation?.success_conditions?.length ?? 0) > 0 &&
    (artifact.validation?.failure_conditions?.length ?? 0) > 0;
  if (!hasValidation) {
    const gen = generateValidationFromSteps(steps, outputNames, spec.domain);
    artifact.validation.success_conditions = gen.success_conditions;
    artifact.validation.failure_conditions = gen.failure_conditions;
  }
  if (!artifact.validation?.metrics?.length) {
    artifact.validation.metrics = getDomainMetrics(spec.domain);
  }

  // Ensure interface.inputs includes any input names referenced by steps (model may use goal, goal_description, etc.)
  const iface = artifact.payload?.interface;
  if (iface && Array.isArray(artifact.payload?.inline_artifact?.steps)) {
    const inputNamesFromSteps = new Set<string>();
    for (const s of artifact.payload.inline_artifact.steps) {
      if (typeof s === "object" && s !== null && Array.isArray((s as { inputs?: string[] }).inputs)) {
        for (const name of (s as { inputs: string[] }).inputs) inputNamesFromSteps.add(name);
      }
    }
    const existingNames = new Set((iface.inputs ?? []).map((i) => i.name));
    for (const name of inputNamesFromSteps) {
      if (!existingNames.has(name)) {
        iface.inputs = iface.inputs ?? [];
        iface.inputs.push({
          name,
          type: name === "goal" ? "task" : "string",
          description: name === "goal" ? "Input goal or context" : `Input: ${name}`,
        });
        existingNames.add(name);
      }
    }
  }

  const consistency = validateStepInterfaceConsistency(artifact);
  if (!consistency.valid) {
    throw new Error("Generated artifact failed step–interface consistency: " + consistency.errors.join("; "));
  }

  const quality = seedQualityScore(artifact);
  if (quality < SEED_QUALITY_MIN_SCORE) {
    throw new Error(`Generated artifact seed quality score too low: ${quality}/8 (minimum ${SEED_QUALITY_MIN_SCORE})`);
  }

  const result = validateArtifact(artifact);
  if (!result.valid) {
    throw new Error("Generated artifact failed validation: " + result.errors.join("; "));
  }

  if (!isProcedurallySpecific(artifact, PROCEDURAL_SPECIFICITY_MIN_SCORE)) {
    const { score } = proceduralSpecificityScore(artifact);
    throw new Error(`Generated artifact failed procedural specificity: score ${score}/8 (minimum ${PROCEDURAL_SPECIFICITY_MIN_SCORE}); use concrete steps and domain-specific inputs.`);
  }

  if (artifact.claim.confidence == null) {
    artifact.claim.confidence = 0.75;
  }

  return artifact;
}
