/**
 * Rubric KB payload schema (minimal)
 */
import { z } from "zod";

export const rubricDimensionSchema = z.object({
  criterion: z.string(),
  weight: z.number(),
});

export const rubricThresholdsSchema = z.object({
  pass: z.number(),
  escalate: z.number(),
});

export const rubricPayloadSchema = z.object({
  type: z.literal("rubric"),
  dimensions: z.array(rubricDimensionSchema),
  scoringLogic: z.string(),
  thresholds: rubricThresholdsSchema,
});

export type RubricPayload = z.infer<typeof rubricPayloadSchema>;
