/**
 * Pattern KB payload schema (minimal)
 */
import { z } from "zod";

export const patternOccurrenceSchema = z.object({
  /** Reference to another KB that exhibits this pattern (content hash). */
  kbHash: z.string().optional(),
  context: z.string(),
  offset: z.number().optional(),
});

export const patternPayloadSchema = z.object({
  type: z.literal("pattern"),
  pattern: z.string(),
  occurrences: z.array(patternOccurrenceSchema),
  applicability: z.string(),
});

export type PatternPayload = z.infer<typeof patternPayloadSchema>;
