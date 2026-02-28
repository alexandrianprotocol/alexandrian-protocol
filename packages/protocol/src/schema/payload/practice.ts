/**
 * Practice KB payload schema
 */
import { z } from "zod";

export const practicePayloadSchema = z.object({
  type: z.literal("practice"),
  rationale: z.string(),
  contexts: z.array(z.unknown()),
  failureModes: z.array(z.unknown()),
});

export type PracticePayload = z.infer<typeof practicePayloadSchema>;
