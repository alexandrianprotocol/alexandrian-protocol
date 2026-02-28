/**
 * Local deterministic helper for economic invariants.
 * Protocol core tests must not depend on the runtime API layer.
 * This module is pure (no Express, env, server, ports).
 */

export const RS_MIN = 0;
export const RS_MAX = 3;

export function clampRS(rs: number): number {
  return Math.max(RS_MIN, Math.min(RS_MAX, rs));
}

const HALF_LIFE_DAYS = 30;

export function freshnessMultiplier(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  const daysAgo = (now - then) / (24 * 60 * 60 * 1000);
  if (daysAgo <= 0) return 1;
  return Math.pow(0.5, daysAgo / HALF_LIFE_DAYS);
}

export function meetsTier(rs: number, tier: number): boolean {
  if (tier === 0) return true;
  if (tier === 1) return rs >= 0.5;
  if (tier === 2) return rs >= 1.0;
  if (tier === 3) return rs >= 2.0;
  return false;
}

export function computePayout(base: number, rs: number, freshness: number): number {
  const clamped = clampRS(rs);
  const raw = base * clamped * freshness;
  const rounded = Math.round(raw * 1e6) / 1e6;
  return Math.max(0, rounded);
}

export function ledgerLeafHash(contentHash: string, amount: number): string {
  const data = contentHash + ":" + amount;
  let h = 0;
  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & h;
  }
  return "0x" + (h >>> 0).toString(16);
}
