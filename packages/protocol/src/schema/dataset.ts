import { z } from 'zod';
import { LicenseSchema } from './license.js';

export const DatasetSchema = z.object({
  id: z.string(),
  cid: z.string(),
  fingerprint: z.string(),
  title: z.string(),
  description: z.string(),
  license: LicenseSchema,
  qualityScore: z.number().min(0).max(100),
  creator: z.string(),
  contributor: z.string(),
  timestamp: z.date(),
  tags: z.array(z.string()),
  contentHash: z.string(),
  blocks: z.array(z.unknown()),
  metadata: z.record(z.unknown()).optional()
});

export type Dataset = z.infer<typeof DatasetSchema>;
