/**
 * Adaptation KB payload schema (minimal)
 */
import { z } from "zod";

export const adaptationPayloadSchema = z.object({
  type: z.literal("adaptation"),
  targetDomain: z.string(),
  adaptedContent: z.string(),
  tradeoffs: z.array(z.string()),
});

export type AdaptationPayload = z.infer<typeof adaptationPayloadSchema>;
