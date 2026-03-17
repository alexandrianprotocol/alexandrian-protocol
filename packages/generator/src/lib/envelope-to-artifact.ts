/**
 * Derived envelope → KBv2.5 artifact adapter
 *
 * Converts the output of derived factories (synthesis/adaptation shape) into
 * a full KBv24Artifact (v2.5: structured steps + cost_estimate) so buildRecord() can hash and validate it.
 */

import type { KBv24Artifact, DerivationTransformation } from "../types/artifact.js";
import type { QueueRecord } from "./core/builder.js";
import { toStructuredSteps } from "./core/steps.js";
import { repairKBv24Dimensions } from "./repair/dimension-repair.js";

/** Shape returned by derived factory build() — synthesis or adaptation. */
export interface DerivedEnvelopeOutput {
  type: "synthesis" | "adaptation";
  domain: string;
  tier?: string;
  sources: string[];
  payload: SynthesisPayload | AdaptationPayload;
  derivation: {
    type: string;
    inputs: { kbId: string; selectors: string[] }[];
    recipe: Record<string, unknown>;
    /** The one reasoning transformation this derived KB applies (5 safe expansions). */
    transformation?: DerivationTransformation;
  };
}

const ALL_TRANSFORMATIONS = ["specialization", "generalization", "composition", "adaptation", "optimization", "failure_mode", "evaluation", "variant"] as const;

/** Map recipe strategy/type to one of the allowed derivation transformations. */
function inferTransformation(envelope: DerivedEnvelopeOutput): DerivationTransformation {
  const t = envelope.derivation.transformation;
  if (t && ALL_TRANSFORMATIONS.includes(t as DerivationTransformation)) {
    return t as DerivationTransformation;
  }
  const strategy = String(envelope.derivation.recipe?.strategy ?? envelope.derivation.type ?? "");
  if (/specializ|narrow|domain/.test(strategy)) return "specialization";
  if (/generaliz|broaden|abstract/.test(strategy)) return "generalization";
  if (/compos|combine|merge|synthesis|pattern/.test(strategy)) return "composition";
  if (/adapt|context|transfer/.test(strategy)) return "adaptation";
  if (/optimiz|improve|cost|performance/.test(strategy)) return "optimization";
  if (/failure|error|recovery|fallback/.test(strategy)) return "failure_mode";
  if (/eval|validat|measure|benchmark/.test(strategy)) return "evaluation";
  if (/variant|alternative/.test(strategy)) return "variant";
  return "composition";
}

interface SynthesisPayload {
  type: "synthesis";
  question?: string;
  answer?: string;
  citations?: Record<string, string>;
}

interface AdaptationPayload {
  type: "adaptation";
  targetDomain?: string;
  adaptedContent?: string;
  tradeoffs?: string[];
}

function stepsFromText(text: string, maxSteps = 8): string[] {
  if (!text || !text.trim()) return ["Apply the composed knowledge from parent KBs."];
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= maxSteps) return sentences;
  return sentences.slice(0, maxSteps);
}

/**
 * Convert derived factory output + parent records into a full KBv24Artifact.
 */
export function derivedEnvelopeToArtifact(
  envelope: DerivedEnvelopeOutput,
  parents: QueueRecord[]
): KBv24Artifact {
  const question =
    "payload" in envelope && envelope.payload && "question" in envelope.payload
      ? (envelope.payload as SynthesisPayload).question
      : "";
  const answer =
    "payload" in envelope && envelope.payload && "answer" in envelope.payload
      ? (envelope.payload as SynthesisPayload).answer
      : "payload" in envelope && envelope.payload && "adaptedContent" in envelope.payload
        ? (envelope.payload as AdaptationPayload).adaptedContent
        : "";
  const title =
    question && question.length <= 80
      ? question.replace(/\?+$/, "").trim()
      : envelope.domain + " derived KB";
  const summary = (answer || title).slice(0, 280);
  const stringSteps = stepsFromText(answer || "Apply the composed knowledge from parent KBs.");
  const steps = toStructuredSteps(stringSteps, "result");

  const used = parents.map((p) => ({
    kb_id: p.kbHash,
    role: "parent" as const,
  }));

  const transformation = inferTransformation(envelope);

  // Depth = 1 + max(parent depths); seeds have lineage.depth 0 or undefined.
  const parentDepths = parents.map((p) => (p.artifact?.provenance?.lineage?.depth ?? (p.isSeed ? 0 : 1)) as number);
  const depth = 1 + (parentDepths.length > 0 ? Math.max(...parentDepths) : 0);

  const artifact: KBv24Artifact = {
    identity: {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title,
      version: "1.0.0",
      status: "active",
      is_seed: false,
      schema: "alexandrian.kb.v2.5",
    },
    claim: {
      statement: question || summary,
      confidence: null,
      falsifiable: true,
    },
    semantic: {
      summary,
      tags: [envelope.domain.split(".")[0] ?? "kb", envelope.domain.replace(/\./g, "-")],
      domain: envelope.domain,
      difficulty: "intermediate",
    },
    knowledge_inputs: {
      minimum_required: 2,
      recommended: Math.min(3, parents.length),
      composition_type: "merge",
      used,
      transformation,
    },
    reasoning: {
      requires: parents.map((p) => p.kbHash),
      contradicts: [],
      related: [],
    },
    execution: {
      trust_tier: 1,
      execution_mode: "advisory",
      determinism: "deterministic",
      idempotent: true,
      cost_estimate: { resource_class: "moderate", expected_token_cost: 200, time_complexity: "O(n)" },
    },
    validation: {
      success_conditions: [
        "Output is consistent with the composed parent KBs",
        "Steps are applicable in the target domain",
      ],
      failure_conditions: [
        "Contradiction with any parent KB",
        "Output outside the intended domain",
      ],
      metrics: ["Relevance to question", "Coverage of parent content"],
    },
    payload: {
      artifact_type: "procedure",
      location: "inline",
      interface: {
        inputs: [{ name: "context", type: "task", description: "Problem or task context" }],
        outputs: [{ name: "result", type: "execution_strategy", description: "Derived guidance or procedure" }],
        parameters: [],
      },
      inline_artifact: { steps },
    },
    evidence: {
      sources: [],
      benchmarks: [],
      notes: "Derived from parent KBs via " + (envelope.derivation.recipe?.strategy ?? "synthesis"),
    },
    provenance: {
      author: { address: "" },
      royalty_bps: 250,
      lineage: {
        depth,
        parent_hash: parents[0]?.kbHash ?? null,
      },
    },
    // GDKR: leave state_transition unset for derived; keep state graph seed-centric.
  };

  // Quality gate: repair steps, failure_conditions, and success_conditions
  // so every derived KB meets the depth/executability/epistemicHonesty thresholds.
  return repairKBv24Dimensions(artifact);
}
