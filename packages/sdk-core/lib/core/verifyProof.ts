export async function verifyProof(
  client: { verifyProof: (proof: unknown) => Promise<unknown> },
  proof: unknown
): Promise<unknown> {
  return client.verifyProof(proof);
}
