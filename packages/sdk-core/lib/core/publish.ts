import type { CanonicalEnvelope } from "@alexandrian/protocol/schema";
import { artifactHashFromBytes } from "@alexandrian/protocol";

export async function publish(
  client: { publish: (envelope: CanonicalEnvelope, options: unknown) => Promise<unknown> },
  envelope: CanonicalEnvelope,
  payloadBytes: Uint8Array,
  options: unknown
): Promise<unknown> {
  const artifactHash = artifactHashFromBytes(payloadBytes);
  const withHash = { ...envelope, artifactHash };
  return client.publish(withHash, options);
}
