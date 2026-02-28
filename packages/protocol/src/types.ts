/**
 * Alexandrian Protocol — Shared KB types
 *
 * Re-exports from schema for convenience.
 */

export type {
  CanonicalKBType,
  CanonicalEnvelope,
  CanonicalPayload,
  CanonicalDerivation,
  CanonicalDerivationInput,
  DerivationType,
} from "./schema/canonicalEnvelope.js";

export { KBType, TrustTier } from "./schema/legacy/knowledgeBlock-v1.js";
