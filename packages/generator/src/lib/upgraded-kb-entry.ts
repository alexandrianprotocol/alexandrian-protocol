/**
 * Schema for upgraded (high-value) KB entries produced by the seed upgrade pipeline.
 * Used when writing to staging/refined after AI normalization.
 */

export interface UpgradedKBEntry {
  title: string;
  summary: string;
  standard: string;
  procedure: string[];
  references: string[];
  failure_modes: string[];
  verification: string[];
  tags: string[];
}

export const UPGRADED_SUMMARY_MAX = 280;
export const UPGRADED_PROCEDURE_MIN = 3;
export const UPGRADED_PROCEDURE_MAX = 6;
export const UPGRADED_TAGS_MAX = 10;

export interface UpgradedKBValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate an upgraded KB entry. Returns errors list; valid iff errors.length === 0.
 */
export function validateUpgradedEntry(entry: unknown): UpgradedKBValidationResult {
  const errors: string[] = [];
  if (!entry || typeof entry !== "object") {
    return { valid: false, errors: ["Entry must be an object"] };
  }
  const e = entry as Record<string, unknown>;

  if (typeof e.title !== "string" || !e.title.trim()) errors.push("title is required and non-empty");
  if (typeof e.summary !== "string") errors.push("summary is required");
  else if (e.summary.length > UPGRADED_SUMMARY_MAX) errors.push(`summary must be ≤${UPGRADED_SUMMARY_MAX} characters`);
  if (typeof e.standard !== "string" || !e.standard.trim()) errors.push("standard is required and non-empty");
  if (!Array.isArray(e.procedure)) errors.push("procedure must be an array");
  else {
    if (e.procedure.length < UPGRADED_PROCEDURE_MIN) errors.push(`procedure must have at least ${UPGRADED_PROCEDURE_MIN} steps`);
    if (e.procedure.length > UPGRADED_PROCEDURE_MAX) errors.push(`procedure must have at most ${UPGRADED_PROCEDURE_MAX} steps`);
    if (e.procedure.some((s: unknown) => typeof s !== "string" || !(s as string).trim())) errors.push("procedure steps must be non-empty strings");
  }
  if (!Array.isArray(e.references)) errors.push("references must be an array");
  else if (e.references.some((r: unknown) => typeof r !== "string")) errors.push("references must be strings");
  if (!Array.isArray(e.failure_modes)) errors.push("failure_modes must be an array");
  else if (e.failure_modes.some((f: unknown) => typeof f !== "string")) errors.push("failure_modes must be strings");
  if (!Array.isArray(e.verification)) errors.push("verification must be an array");
  else if (e.verification.some((v: unknown) => typeof v !== "string")) errors.push("verification must be strings");
  if (!Array.isArray(e.tags)) errors.push("tags must be an array");
  else {
    if (e.tags.length > UPGRADED_TAGS_MAX) errors.push(`tags must be ≤${UPGRADED_TAGS_MAX}`);
    if (e.tags.some((t: unknown) => typeof t !== "string")) errors.push("tags must be strings");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Repair an upgraded entry: truncate summary, trim tags to max, ensure procedure length in range.
 */
export function repairUpgradedEntry(entry: UpgradedKBEntry): UpgradedKBEntry {
  const out = { ...entry };
  if (out.summary.length > UPGRADED_SUMMARY_MAX) {
    out.summary = out.summary.slice(0, UPGRADED_SUMMARY_MAX - 3) + "...";
  }
  if (out.tags.length > UPGRADED_TAGS_MAX) {
    out.tags = out.tags.slice(0, UPGRADED_TAGS_MAX);
  }
  out.tags = out.tags.map((t) => String(t).trim()).filter(Boolean);
  out.procedure = out.procedure.map((p) => String(p).trim()).filter(Boolean);
  if (out.procedure.length < UPGRADED_PROCEDURE_MIN && out.procedure.length > 0) {
    while (out.procedure.length < UPGRADED_PROCEDURE_MIN) {
      out.procedure.push("Verify outcome meets acceptance criteria.");
    }
  }
  if (out.procedure.length > UPGRADED_PROCEDURE_MAX) {
    out.procedure = out.procedure.slice(0, UPGRADED_PROCEDURE_MAX);
  }
  return out;
}
