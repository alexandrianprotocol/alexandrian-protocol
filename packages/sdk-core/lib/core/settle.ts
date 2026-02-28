export async function settle(
  client: { settleCitation: (contentHash: string, agentAddress: string) => Promise<unknown> },
  contentHash: string,
  agentAddress: string
): Promise<unknown> {
  return client.settleCitation(contentHash, agentAddress);
}
