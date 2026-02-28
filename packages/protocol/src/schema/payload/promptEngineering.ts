/**
 * Prompt Engineering KB payload schema (minimal)
 */
import { z } from "zod";

export const promptEngineeringPayloadSchema = z.object({
  type: z.literal("promptEngineering"),
  template: z.string(),
  modelVersion: z.string(),
  evalCriteria: z.array(z.unknown()),
});

export type PromptEngineeringPayload = z.infer<typeof promptEngineeringPayloadSchema>;
