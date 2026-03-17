/**
 * KB Repair Module — fix summary length, clean metadata, normalize semantic structure
 * so candidates pass schema validation and the pipeline can process thousands of KBs per run.
 *
 * Pipeline: Generate → repairKB → validate → write to staging.
 */

import type { KBv24Artifact, KBSemantic, KBIdentity, KBValidation } from "../../types/artifact.js";

const MAX_SUMMARY = 280;
const MAX_TAGS = 10;
const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;
const EXECUTION_CLASSES = ["reasoning", "transformation", "evaluation", "validation"] as const;

/**
 * Truncate summaries exceeding schema limit. Optionally compress whitespace.
 */
export function repairSummary(summary?: string | null): string {
  if (summary == null) return "";
  const clean = String(summary).trim().replace(/\s+/g, " ");
  if (clean.length <= MAX_SUMMARY) return clean;
  return clean.slice(0, MAX_SUMMARY - 3) + "...";
}

/**
 * Clean a string field: trim, empty → default.
 */
function cleanStr(value: unknown, defaultVal: string): string {
  if (value == null) return defaultVal;
  const s = String(value).trim();
  return s || defaultVal;
}

/**
 * Clean an array of strings: filter to strings, trim, cap length.
 */
function cleanStrArray(value: unknown, maxLen: number = 10): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => typeof x === "string")
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, maxLen);
}

/** Normalize validation condition (string or { id?, condition }) to string for repair output. */
function conditionToStr(c: unknown): string {
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "condition" in c && typeof (c as { condition: unknown }).condition === "string") {
    return (c as { condition: string }).condition;
  }
  return "";
}

/**
 * Remove invalid metadata values from identity: trim strings, ensure required shape.
 */
export function repairMetadata(identity?: KBIdentity | null): KBIdentity {
  if (!identity || typeof identity !== "object") {
    return {
      kb_id: "",
      epistemic_type: "procedural",
      kb_type: "procedure",
      title: "",
      version: "1.0.0",
      status: "active",
      is_seed: false,
      schema: "alexandrian.kb.v2.5",
    };
  }
  const ep = ["declarative", "procedural", "evaluative"].includes(identity.epistemic_type as string)
    ? (identity.epistemic_type as "declarative" | "procedural" | "evaluative")
    : "procedural";
  const status = ["active", "deprecated", "draft"].includes(identity.status as string)
    ? identity.status
    : "active";
  const schema =
    identity.schema === "alexandrian.kb.v2.4" || identity.schema === "alexandrian.kb.v2.5"
      ? identity.schema
      : "alexandrian.kb.v2.5";
  return {
    ...identity,
    kb_id: cleanStr(identity.kb_id, ""),
    epistemic_type: ep,
    kb_type: (identity.kb_type as KBIdentity["kb_type"]) ?? "procedure",
    title: cleanStr(identity.title, ""),
    version: cleanStr(identity.version, "1.0.0"),
    status,
    is_seed: Boolean(identity.is_seed),
    schema,
  };
}

/**
 * Normalize semantic structure: summary (repaired length), tags (array, capped), domain, difficulty.
 */
export function normalizeSemantic(semantic?: Partial<KBSemantic> | null): KBSemantic {
  if (!semantic || typeof semantic !== "object") {
    return {
      summary: "",
      tags: [],
      domain: "general",
      difficulty: "intermediate",
    };
  }
  const summary = repairSummary(semantic.summary);
  const tags = cleanStrArray(semantic.tags, MAX_TAGS);
  const domain = cleanStr(semantic.domain, "general");
  const difficulty = DIFFICULTY_LEVELS.includes(semantic.difficulty as (typeof DIFFICULTY_LEVELS)[number])
    ? (semantic.difficulty as (typeof DIFFICULTY_LEVELS)[number])
    : "intermediate";
  const out: KBSemantic = {
    summary: summary || "No summary.",
    tags,
    domain: domain || "general",
    difficulty,
  };
  if (Array.isArray(semantic.capabilities) && semantic.capabilities.length > 0) {
    out.capabilities = cleanStrArray(semantic.capabilities, 20);
  }
  if (
    semantic.execution_class &&
    EXECUTION_CLASSES.includes(semantic.execution_class as (typeof EXECUTION_CLASSES)[number])
  ) {
    out.execution_class = semantic.execution_class as (typeof EXECUTION_CLASSES)[number];
  }
  return out;
}

/**
 * Repair validation block: ensure success_conditions, failure_conditions, metrics are string arrays.
 * Accepts string | { id?, condition } for conditions; repair output is string[].
 */
export function repairValidation(validation?: Partial<KBValidation> | null): KBValidation {
  if (!validation || typeof validation !== "object") {
    return {
      success_conditions: [],
      failure_conditions: [],
      metrics: [],
    };
  }
  const norm = (arr: unknown[] | undefined) =>
    cleanStrArray(
      (arr ?? []).map(conditionToStr).filter(Boolean),
      20
    );
  return {
    success_conditions: norm(validation.success_conditions as unknown[] | undefined),
    failure_conditions: norm(validation.failure_conditions as unknown[] | undefined),
    metrics: cleanStrArray(validation.metrics, 20),
  };
}

/**
 * Apply all repairs to a KB artifact. Does not change claim content, payload steps, or provenance.
 * Use before schema validation to fix summary length, metadata, and semantic fields.
 */
export function repairKB(artifact: KBv24Artifact): KBv24Artifact {
  const out = { ...artifact };
  out.identity = repairMetadata(artifact.identity);
  out.semantic = normalizeSemantic(artifact.semantic);
  out.validation = repairValidation(artifact.validation);
  if (out.claim && typeof out.claim === "object") {
    out.claim = {
      ...out.claim,
      statement: cleanStr(out.claim.statement, "No claim."),
    };
  }
  return out;
}
