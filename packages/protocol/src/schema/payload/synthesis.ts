/**
 * Synthesis KB payload schema (minimal)
 */
import { z } from "zod";

export const synthesisPayloadSchema = z.object({
  type: z.literal("synthesis"),
  question: z.string(),
  answer: z.string(),
  citations: z.record(z.unknown()),
});

export type SynthesisPayload = z.infer<typeof synthesisPayloadSchema>;
