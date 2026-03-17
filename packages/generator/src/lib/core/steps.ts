/**
 * Step helpers for v2.5 — convert string steps to structured steps and build dataflow.
 */

import type { StructuredStep, StepItem } from "../../types/artifact.js";

/** Slugify first few words of a step string for use as action id. */
function slugify(s: string, maxWords = 3): string {
  const words = s
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .slice(0, maxWords);
  return words.join("_").replace(/_+/g, "_") || "step";
}

/**
 * Convert legacy string steps to minimal StructuredStep[] (v2.5).
 * Each step gets id step_1..step_n, action from slug of the string, no inputs/produces.
 * Use this to upgrade existing seeds to v2.5 without rewriting all rows.
 */
/**
 * Default output name for the last step so it binds to interface.outputs[0].name.
 */
const DEFAULT_OUTPUT_NAME = "result";

export function toStructuredSteps(stringSteps: string[], outputName: string = DEFAULT_OUTPUT_NAME): StructuredStep[] {
  return stringSteps.map((s, i) => {
    const isLast = i === stringSteps.length - 1;
    return {
      id: `step_${i + 1}`,
      action: slugify(s),
      inputs: i === 0 ? [] : [`step_${i}_result`],
      produces: isLast ? [outputName] : [`step_${i + 1}_result`],
      notes: s,
    };
  });
}

/**
 * Check if a step item is a StructuredStep (object with id and action).
 */
export function isStructuredStep(item: StepItem): item is StructuredStep {
  return typeof item === "object" && item !== null && "id" in item && "action" in item;
}

/**
 * Normalize steps to StructuredStep[]: pass through structured steps, convert strings via toStructuredSteps.
 */
export function normalizeSteps(steps: StepItem[]): StructuredStep[] {
  if (steps.length === 0) return [];
  if (isStructuredStep(steps[0])) return steps as StructuredStep[];
  return toStructuredSteps(steps as string[]);
}
