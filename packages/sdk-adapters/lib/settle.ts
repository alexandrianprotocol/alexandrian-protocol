/**
 * settle.ts — On-chain citation settlement helper.
 *
 * Wraps `AlexandrianSDK.settleCitation()` to work directly with the results
 * returned by `alexandrian.enhance()`, `.review()`, `.audit()`, and `.compare()`.
 *
 * Settlement is always optional. The SDK never auto-settles — call this
 * explicitly after receiving KB-grounded LLM output.
 *
 * ── Quick usage ───────────────────────────────────────────────────────────────
 *
 * ```ts
 * import { alexandrian, settleCitation } from "@alexandrian/sdk-adapters";
 * import { AlexandrianSDK }             from "@alexandrian/sdk-adapters";
 * import { ethers }                      from "ethers";
 *
 * const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
 * const sdk    = new AlexandrianSDK({ signer });
 *
 * // 1. Get KB-grounded prompt
 * const result = await alexandrian.presets.security.audit(myCode);
 *
 * // 2. Pass result.evaluationPrompt to your LLM ...
 *
 * // 3. Settle citations (optional, silent on partial failure)
 * const { settled, skipped, totalEthSpent } = await settleCitation(result, sdk);
 * console.log(`Settled ${settled.length} KBs — ${totalEthSpent.toFixed(6)} ETH`);
 * ```
 *
 * ── Design decisions ──────────────────────────────────────────────────────────
 *
 * - Non-fatal by default: a failed per-KB settlement is collected in `skipped`,
 *   not re-thrown. Call `onError` to customise.
 * - Fallback KBs are skipped automatically (no on-chain record to settle).
 * - Agent address defaults to the signer's own address when not supplied.
 * - No wallet / signer is required to use the rest of the SDK — only this helper.
 */

import type { AlexandrianSDK } from "../client/AlexandrianSDK.js";
import type { SelectedKB }     from "./enhanceQuery.js";
import type { EnhancedQuery }  from "./enhanceQuery.js";
import type { EvaluationQuery } from "./evaluate.js";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Options for `settleCitation()`. All fields are optional. */
export interface SettleCitationOptions {
  /**
   * Address to attribute the query to (the calling agent or user wallet).
   * Defaults to the signer's own address when omitted.
   */
  agentAddress?: string;

  /**
   * Skip KBs from the fallback corpus (local stubs with no on-chain record).
   * @default true
   */
  skipFallback?: boolean;

  /**
   * Called after each successful per-KB settlement.
   * Useful for logging or updating UI.
   */
  onSettled?: (kb: SelectedKB, txHash: string) => void;

  /**
   * Called when a per-KB settlement fails.
   * When provided, the error is NOT re-thrown — the KB is added to `skipped`.
   * When omitted, failures are silently collected in `skipped`.
   */
  onError?: (kb: SelectedKB, error: Error) => void;
}

/** Return value from `settleCitation()`. */
export interface SettleCitationResult {
  /** KBs successfully settled on-chain. */
  settled: Array<{ contentHash: string; title: string; txHash: string; feeEth: number }>;
  /** KBs skipped or failed, with a reason. */
  skipped: Array<{ contentHash: string; title: string; reason: string }>;
  /** Total ETH spent across all settled KBs. */
  totalEthSpent: number;
}

// ── Internal type guard ───────────────────────────────────────────────────────

/** `SelectedKB` from the fallback corpus carries a `fallback: true` marker. */
type MaybeWithFallback = SelectedKB & { fallback?: boolean };

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Settle on-chain citations for all KBs used in an enhance or evaluation result.
 *
 * Iterates `result.kbsUsed` and calls `sdk.settleCitation()` for each eligible KB.
 * Eligible = non-fallback, valid `contentHash`, `queryFeeWei > 0`.
 *
 * Errors on individual KBs are non-fatal — they land in `result.skipped`.
 *
 * @param result    Return from `alexandrian.enhance()`, `.review()`, `.audit()`, or `.compare()`.
 * @param sdk       `AlexandrianSDK` instance initialised with a connected ethers `Signer`.
 * @param options   Optional: agentAddress, skipFallback, per-KB callbacks.
 *
 * @example
 * const result = await alexandrian.presets.security.audit(code);
 * // … call your LLM with result.evaluationPrompt …
 * const { settled, totalEthSpent } = await settleCitation(result, sdk);
 */
export async function settleCitation(
  result: EnhancedQuery | EvaluationQuery,
  sdk: AlexandrianSDK,
  options: SettleCitationOptions = {},
): Promise<SettleCitationResult> {
  const {
    skipFallback = true,
    agentAddress,
    onSettled,
    onError,
  } = options;

  const kbs: SelectedKB[] = result.kbsUsed ?? [];

  if (kbs.length === 0) {
    return { settled: [], skipped: [], totalEthSpent: 0 };
  }

  // Resolve agent address — fall back to signer address, then zero address
  let resolvedAgent = agentAddress;
  if (!resolvedAgent) {
    try {
      // AlexandrianSDK exposes the signer's address via the chain adapter
      resolvedAgent = await (sdk as unknown as { getSignerAddress?: () => Promise<string> })
        .getSignerAddress?.();
    } catch { /* ignore */ }
    resolvedAgent ??= "0x0000000000000000000000000000000000000000";
  }

  const settled: SettleCitationResult["settled"] = [];
  const skipped: SettleCitationResult["skipped"] = [];
  let totalEthSpent = 0;

  for (const kb of kbs) {
    const title = kb.title ?? kb.domain;

    // Skip fallback stubs
    if (skipFallback && (kb as MaybeWithFallback).fallback) {
      skipped.push({ contentHash: kb.contentHash, title, reason: "fallback KB — no on-chain record" });
      continue;
    }

    // Skip zero fees — nothing to settle
    if (!kb.queryFeeWei || kb.queryFeeWei === "0") {
      skipped.push({ contentHash: kb.contentHash, title, reason: "zero query fee" });
      continue;
    }

    // Basic contentHash guard
    if (!kb.contentHash || kb.contentHash.replace("0x", "").replace(/0/g, "").length === 0) {
      skipped.push({ contentHash: kb.contentHash, title, reason: "invalid contentHash" });
      continue;
    }

    try {
      const settle  = await sdk.settleCitation(kb.contentHash, resolvedAgent);
      const feeEth  = Number(kb.queryFeeWei) / 1e18;
      const txHash  = settle.value.txHash;

      settled.push({ contentHash: kb.contentHash, title, txHash, feeEth });
      totalEthSpent += feeEth;
      onSettled?.(kb, txHash);

    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      onError?.(kb, error);
      skipped.push({ contentHash: kb.contentHash, title, reason: error.message });
    }
  }

  return { settled, skipped, totalEthSpent };
}

// ── Convenience re-export for the `kbsUsed` shape ────────────────────────────

/**
 * Build a settlement summary without making any on-chain call.
 * Identical to `alexandrian.settlementSummary()` — provided here as a
 * standalone export so callers don't need the full client import.
 *
 * @example
 * const preview = settlementPreview(result.kbsUsed);
 * console.log(`Will spend ${preview.totalEthRequired} ETH across ${preview.kbs.length} KBs`);
 */
export function settlementPreview(kbsUsed: SelectedKB[]): {
  kbs:              Array<{ contentHash: string; title: string; domain: string; feeEth: number }>;
  totalEthRequired: number;
} {
  const WEI_PER_ETH = 1e18;
  const kbs = kbsUsed.map((kb) => ({
    contentHash: kb.contentHash,
    title:       kb.title ?? kb.domain,
    domain:      kb.domain,
    feeEth:      Number(kb.queryFeeWei ?? "0") / WEI_PER_ETH,
  }));
  return {
    kbs,
    totalEthRequired: kbs.reduce((sum, kb) => sum + kb.feeEth, 0),
  };
}
