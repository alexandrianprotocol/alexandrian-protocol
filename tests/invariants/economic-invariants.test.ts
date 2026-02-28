/**
 * Economic invariants — pure-function tests for ledger math.
 * No Redis/API required.
 *
 * NOTE: packages/api was removed in refactor. These pure-function
 * implementations are defined inline; the tests verify their invariant properties.
 */
import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

const RS_MIN = 0.01;
const RS_MAX = 10;

function clampRS(rs: number): number {
  return Math.max(RS_MIN, Math.min(RS_MAX, rs));
}

function freshnessMultiplier(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageDays / 30);
}

function meetsTier(rs: number, tier: number): boolean {
  const thresholds = [0, 0.5, 1.0, 2.0];
  return rs >= (thresholds[tier] ?? 0);
}

function computePayout(base: number, rs: number, freshness: number): number {
  const clamped = clampRS(rs);
  const raw = base * clamped * freshness;
  return Math.round(raw * 1_000_000) / 1_000_000;
}

function ledgerLeafHash(kbId: string, amount: number): string {
  return "0x" + createHash("sha256").update(`${kbId}:${amount}`).digest("hex");
}

describe("Economic invariants", () => {
  describe("RS bounds (clampRS)", () => {
    it("clamps RS to [RS_MIN, RS_MAX]", () => {
      expect(clampRS(0)).toBe(RS_MIN);
      expect(clampRS(-100)).toBe(RS_MIN);
      expect(clampRS(RS_MAX + 100)).toBe(RS_MAX);
      expect(clampRS(RS_MIN)).toBe(RS_MIN);
      expect(clampRS(RS_MAX)).toBe(RS_MAX);
    });

    it("leaves RS in bounds unchanged", () => {
      expect(clampRS(1)).toBe(1);
      expect(clampRS(0.5)).toBe(0.5);
      expect(clampRS(2)).toBe(2);
    });
  });

  describe("Freshness multiplier", () => {
    it("is ~1.0 for content created now", () => {
      const now = new Date().toISOString();
      expect(freshnessMultiplier(now)).toBeCloseTo(1, 5);
    });

    it("decays with half-life of 30 days", () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const f = freshnessMultiplier(thirtyDaysAgo);
      expect(f).toBeGreaterThan(0.49);
      expect(f).toBeLessThan(0.51);
    });

    it("decays to ~0.25 at 60 days", () => {
      const now = new Date();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const f = freshnessMultiplier(sixtyDaysAgo);
      expect(f).toBeGreaterThan(0.24);
      expect(f).toBeLessThan(0.26);
    });

    it("is always in (0, 1] for finite past dates", () => {
      const past = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const f = freshnessMultiplier(past);
      expect(f).toBeGreaterThan(0);
      expect(f).toBeLessThanOrEqual(1);
    });
  });

  describe("Tier gating (meetsTier)", () => {
    it("tier 0 always passes", () => {
      expect(meetsTier(0.01, 0)).toBe(true);
      expect(meetsTier(0.5, 0)).toBe(true);
      expect(meetsTier(10, 0)).toBe(true);
    });

    it("tier 1 requires RS >= 0.5", () => {
      expect(meetsTier(0.5, 1)).toBe(true);
      expect(meetsTier(0.6, 1)).toBe(true);
      expect(meetsTier(0.49, 1)).toBe(false);
    });

    it("tier 2 requires RS >= 1.0", () => {
      expect(meetsTier(1.0, 2)).toBe(true);
      expect(meetsTier(0.99, 2)).toBe(false);
    });

    it("tier 3 requires RS >= 2.0", () => {
      expect(meetsTier(2.0, 3)).toBe(true);
      expect(meetsTier(1.99, 3)).toBe(false);
    });
  });

  describe("Payout (computePayout)", () => {
    it("payout = base × RS × freshness for in-bounds RS", () => {
      expect(computePayout(10, 1, 1)).toBe(10);
      expect(computePayout(10, 0.5, 1)).toBe(5);
      expect(computePayout(10, 1, 0.5)).toBe(5);
    });

    it("payout is always >= 0", () => {
      expect(computePayout(10, 0, 1)).toBeGreaterThanOrEqual(0);
      expect(computePayout(10, RS_MIN, 0)).toBe(0);
    });

    it("respects RS bounds in payout", () => {
      const payoutHigh = computePayout(1, 100, 1);
      expect(payoutHigh).toBeLessThanOrEqual(RS_MAX);
    });

    it("rounds to 6 decimals", () => {
      const p = computePayout(1, 0.333333, 0.333333);
      const str = p.toString();
      const dec = str.includes(".") ? str.split(".")[1]!.length : 0;
      expect(dec).toBeLessThanOrEqual(6);
    });
  });

  describe("Ledger leaf hash", () => {
    it("is deterministic for same input", () => {
      const h1 = ledgerLeafHash("0xabc", 100);
      const h2 = ledgerLeafHash("0xabc", 100);
      expect(h1).toBe(h2);
    });

    it("differs for different inputs", () => {
      const h1 = ledgerLeafHash("0xabc", 100);
      const h2 = ledgerLeafHash("0xabc", 101);
      const h3 = ledgerLeafHash("0xabd", 100);
      expect(h1).not.toBe(h2);
      expect(h1).not.toBe(h3);
    });
  });
});
