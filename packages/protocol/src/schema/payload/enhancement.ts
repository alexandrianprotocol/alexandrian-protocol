/**
 * Enhancement KB payload schema (minimal)
 */
import { z } from "zod";

export const enhancementPayloadSchema = z.object({
  type: z.literal("enhancement"),
  concern: z.enum(["observability", "security", "performance", "accessibility"]),
  enhancedContent: z.string(),
});

export type EnhancementPayload = z.infer<typeof enhancementPayloadSchema>;
