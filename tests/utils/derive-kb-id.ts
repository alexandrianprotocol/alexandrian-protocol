/**
 * Test helper: derive kbId (contentHash) from an envelope.
 * Matches claim wording "deriveKbId(a) === deriveKbId(b)" and normalizes sources before hashing.
 */
import { kbHashFromEnvelope, sortSources } from "@alexandrian/protocol/core";

export function deriveKbId(envelope: Record<string, unknown>): string {
  return kbHashFromEnvelope(sortSources(envelope as { sources?: string[] }) as unknown as Record<string, unknown>);
}
