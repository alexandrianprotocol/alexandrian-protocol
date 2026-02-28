/**
 * Compliance Checklist KB payload schema (minimal)
 */
import { z } from "zod";

export const complianceRequirementSchema = z.object({
  id: z.string(),
  description: z.string(),
  isMandatory: z.boolean(),
});

export const evidenceMappingSchema = z.object({
  type: z.enum(["log_entry", "audit_trail", "cryptographic_proof"]),
  validationLogic: z.string(),
});

export const complianceChecklistPayloadSchema = z.object({
  type: z.literal("complianceChecklist"),
  jurisdictionTags: z.array(z.string()),
  requirements: z.array(complianceRequirementSchema),
  evidenceMapping: evidenceMappingSchema,
});

export type ComplianceChecklistPayload = z.infer<typeof complianceChecklistPayloadSchema>;
