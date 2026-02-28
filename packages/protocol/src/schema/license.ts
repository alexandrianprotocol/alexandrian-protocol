import { z } from 'zod';

export const LicenseTermsSchema = z.object({
  commercialUse: z.boolean(),
  attribution: z.boolean(),
  shareAlike: z.boolean(),
  derivatives: z.boolean()
});

export const LicenseSchema = z.object({
  type: z.enum(["CC-BY-4.0", "CC-BY-SA-4.0", "CC-BY-NC-4.0", "CC0-1.0", "MIT", "GPL-3.0", "PROPRIETARY"]),
  terms: LicenseTermsSchema
});

export type LicenseTerms = z.infer<typeof LicenseTermsSchema>;
export type License = z.infer<typeof LicenseSchema>;
