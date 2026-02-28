/**
 * Stage-gated economics for adoption → depth → infrastructure.
 * Defaults are intentionally low for adoption and configurable via SDK.
 */
export type ProtocolStage = "adoption" | "depth" | "infrastructure";

export interface StageEconomics {
  stage: ProtocolStage;
  /** One-time pool creation fee (wei). */
  poolCreateFeeWei: bigint;
  /** Stake required to propose/finalize a version (wei). */
  proposalStakeWei: bigint;
  /** Minimum stake to be considered credible (wei). */
  minStakeWei: bigint;
  /** Finalize fee in basis points (0–10_000). */
  finalizeFeeBps: number;
  /** Dispute bond in wei (0 for optional/disabled). */
  disputeBondWei: bigint;
  /** Allow off-chain drafts (true in adoption). */
  allowOffchainDrafts: boolean;
}

const STAGE_DEFAULTS: Record<ProtocolStage, StageEconomics> = {
  adoption: {
    stage: "adoption",
    poolCreateFeeWei: 0n,
    proposalStakeWei: 0n,
    minStakeWei: 0n,
    finalizeFeeBps: 0,
    disputeBondWei: 0n,
    allowOffchainDrafts: true,
  },
  depth: {
    stage: "depth",
    poolCreateFeeWei: 10n ** 14n, // 0.0001 ETH
    proposalStakeWei: 5n * 10n ** 14n, // 0.0005 ETH
    minStakeWei: 10n ** 15n, // 0.001 ETH
    finalizeFeeBps: 50, // 0.50%
    disputeBondWei: 10n ** 15n, // 0.001 ETH
    allowOffchainDrafts: true,
  },
  infrastructure: {
    stage: "infrastructure",
    poolCreateFeeWei: 10n ** 16n, // 0.01 ETH
    proposalStakeWei: 5n * 10n ** 16n, // 0.05 ETH
    minStakeWei: 10n ** 17n, // 0.1 ETH
    finalizeFeeBps: 150, // 1.50%
    disputeBondWei: 10n ** 17n, // 0.1 ETH
    allowOffchainDrafts: false,
  },
};

export function getStageFromEnv(value?: string): ProtocolStage | undefined {
  const envStage =
    typeof process !== "undefined" ? (process.env.ALEXANDRIAN_STAGE ?? "") : "";
  const raw = (value ?? envStage).toLowerCase();
  if (raw === "adoption" || raw === "depth" || raw === "infrastructure") return raw;
  return undefined;
}

export function getStageEconomics(
  stage?: ProtocolStage,
  overrides?: Partial<StageEconomics>
): StageEconomics {
  const resolvedStage = stage ?? getStageFromEnv() ?? "adoption";
  const base = STAGE_DEFAULTS[resolvedStage];
  return {
    ...base,
    ...(overrides ?? {}),
    stage: resolvedStage,
  };
}
