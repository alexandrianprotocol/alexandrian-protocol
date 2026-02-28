/**
 * Feature KB payload schema (minimal)
 */
import { z } from "zod";

export const featurePayloadSchema = z.object({
  type: z.literal("feature"),
  interfaceContract: z.unknown(),
  testScaffold: z.unknown(),
});

export type FeaturePayload = z.infer<typeof featurePayloadSchema>;
