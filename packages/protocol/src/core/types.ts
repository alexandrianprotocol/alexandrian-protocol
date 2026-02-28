export type CanonicalEnvelopeCore = {
  kbId: string;
  versionId: string;
  contentHash: string;
  parentIds: string[];
  metadata: Record<string, unknown>;
};

export type AlexandrianProofCore = {
  poolId: string;
  versionId: string;
  contentHash: string;
  settlement: {
    chainId: string;
    txHash: string;
    blockNumber: number;
  };
  head: boolean;
};

export type CandidateVersion = {
  kbId: string;
  versionId: string;
  backingAmount: bigint;
  finalized: boolean;
  blockNumber: number;
};
