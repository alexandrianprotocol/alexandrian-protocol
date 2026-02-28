export type ProofEvent = {
  type:
    | "proof.verification.started"
    | "proof.verification.succeeded"
    | "proof.verification.failed";
  payload: Record<string, unknown>;
};

export type CanonicalEvent = {
  type:
    | "canonical.head.requested"
    | "canonical.head.resolved"
    | "canonical.head.missing"
    | "canonical.head.mismatch";
  payload: Record<string, unknown>;
};

export type SettlementEvent = {
  type: "settlement.submitted" | "settlement.confirmed" | "settlement.failed";
  payload: Record<string, unknown>;
};

export type ObservabilityEvent = ProofEvent | CanonicalEvent | SettlementEvent;

export interface ObservabilityAdapter {
  emit(event: ObservabilityEvent): Promise<void>;
}

export class ObservabilityAdapterStub implements ObservabilityAdapter {
  async emit(_event: ObservabilityEvent): Promise<void> {}
}
