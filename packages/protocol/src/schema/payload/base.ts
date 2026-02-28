/**
 * Base Zod schema for canonical envelope
 */
import { z } from "zod";

export const sourcesSchema = z.array(z.string());

export const tierSchema = z.enum(["open", "verified", "premium", "restricted"]);

export const derivationInputSchema = z.object({
  kbId: z.string(),
  selectors: z.array(z.string()),
});

export const derivationSchema = z.object({
  type: z.enum(["compose", "transform", "extract", "summarize"]),
  inputs: z.array(derivationInputSchema),
  recipe: z.record(z.unknown()),
});
