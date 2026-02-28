/**
 * SDK Primitives — unit tests
 *
 * Tests the deterministic, network-free SDK primitives:
 *   - hashContent / hashText / canonicalizeContent
 *   - buildProofSpecV1 / computeProofHash
 *   - Error taxonomy (Result<T,E>, AlexandrianError subclasses)
 *
 * No contract mocking or RPC calls — these tests run in any environment.
 */

import { describe, expect, it } from "vitest";
import {
  canonicalizeContent,
  hashContent,
  hashText,
} from "../../packages/sdk-adapters/lib/utils.js";
import {
  buildProofSpecV1,
  computeProofHash,
  canonicalProofBytes,
  ALEXANDRIAN_PROOF_SPEC_VERSION,
} from "../../packages/sdk-adapters/lib/proof-spec.js";
import {
  AlexandrianError,
  ContractError,
  NetworkError,
  ValidationError,
  NotFoundError,
  ok,
  err,
  wrapError,
} from "../../packages/sdk-core/lib/errors.js";

// ─────────────────────────────────────────────────────────────────────────────
// hashContent — deterministic content hashing
// ─────────────────────────────────────────────────────────────────────────────

describe("hashContent", () => {
  it("returns 0x-prefixed 32-byte hex string", () => {
    expect(hashContent("hello")).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic — same input always produces same hash", () => {
    expect(hashContent({ a: 1, b: 2 })).toBe(hashContent({ a: 1, b: 2 }));
  });

  it("is canonical — object key order does not affect hash", () => {
    expect(hashContent({ a: 1, b: 2 })).toBe(hashContent({ b: 2, a: 1 }));
  });

  it("handles nested objects canonically", () => {
    const a = { x: { y: 1 }, z: [3, 1, 2] };
    const b = { z: [3, 1, 2], x: { y: 1 } };
    expect(hashContent(a)).toBe(hashContent(b));
  });

  it("produces different hashes for different content", () => {
    expect(hashContent("foo")).not.toBe(hashContent("bar"));
    expect(hashContent({ a: 1 })).not.toBe(hashContent({ a: 2 }));
  });

  it("handles null and empty string without throwing", () => {
    expect(() => hashContent(null)).not.toThrow();
    expect(() => hashContent("")).not.toThrow();
    expect(hashContent(null)).not.toBe(hashContent(""));
  });

  it("arrays are not key-sorted (order matters)", () => {
    expect(hashContent([1, 2, 3])).not.toBe(hashContent([3, 2, 1]));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hashText — raw string hashing
// ─────────────────────────────────────────────────────────────────────────────

describe("hashText", () => {
  it("returns 0x-prefixed 32-byte hex string", () => {
    expect(hashText("test input")).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(hashText("hello world")).toBe(hashText("hello world"));
  });

  it("differs from hashContent for same string", () => {
    // hashText uses raw UTF-8; hashContent JSON-encodes first
    expect(hashText("hello")).not.toBe(hashContent("hello"));
  });

  it("empty string produces consistent hash", () => {
    expect(hashText("")).toBe(hashText(""));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// canonicalizeContent — stable JSON serialization
// ─────────────────────────────────────────────────────────────────────────────

describe("canonicalizeContent", () => {
  it("sorts object keys alphabetically", () => {
    expect(canonicalizeContent({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it("does not sort array elements", () => {
    expect(canonicalizeContent([3, 1, 2])).toBe("[3,1,2]");
  });

  it("handles nested structures", () => {
    const result = canonicalizeContent({ z: { b: 2, a: 1 }, a: "x" });
    expect(result).toBe('{"a":"x","z":{"a":1,"b":2}}');
  });

  it("handles empty object", () => {
    expect(canonicalizeContent({})).toBe("{}");
  });

  it("handles empty array", () => {
    expect(canonicalizeContent([])).toBe("[]");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ProofSpec v1 — deterministic proof hashing
// ─────────────────────────────────────────────────────────────────────────────

describe("buildProofSpecV1 / computeProofHash", () => {
  const baseParams = {
    chainId: "8453",
    contract: "0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000",
    kbId: "0x" + "ab".repeat(32),
    blockNumber: "12345678",
    state: { totalFeesEarned: "1000000000000000", lastSettledAt: "1700000000" },
  };

  it("builds proof with correct version field", () => {
    const proof = buildProofSpecV1(baseParams);
    expect(proof.version).toBe(ALEXANDRIAN_PROOF_SPEC_VERSION);
    expect(proof.version).toBe("alexandrian-proof/1");
  });

  it("proof hash is 0x-prefixed hex string", () => {
    const proof = buildProofSpecV1(baseParams);
    expect(computeProofHash(proof)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("same params always produce same proof hash (deterministic)", () => {
    const h1 = computeProofHash(buildProofSpecV1(baseParams));
    const h2 = computeProofHash(buildProofSpecV1(baseParams));
    expect(h1).toBe(h2);
  });

  it("different kbId produces different proof hash", () => {
    const proof1 = buildProofSpecV1(baseParams);
    const proof2 = buildProofSpecV1({ ...baseParams, kbId: "0x" + "cd".repeat(32) });
    expect(computeProofHash(proof1)).not.toBe(computeProofHash(proof2));
  });

  it("canonicalProofBytes returns Uint8Array", () => {
    const proof = buildProofSpecV1(baseParams);
    const bytes = canonicalProofBytes(proof);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it("includes optional payload binding when provided", () => {
    const payloadHash = "0x" + "ff".repeat(32);
    const proof = buildProofSpecV1({ ...baseParams, payloadHash });
    expect(proof.payload).toBeDefined();
    expect(proof.payload?.hash).toBe(payloadHash);
    expect(proof.payload?.hashAlg).toBe("keccak256");
  });

  it("excludes payload field when not provided", () => {
    const proof = buildProofSpecV1(baseParams);
    expect(proof.payload).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Result<T, E> — error taxonomy
// ─────────────────────────────────────────────────────────────────────────────

describe("ok() / err() — Result helpers", () => {
  it("ok() creates a success result with correct shape", () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it("ok() works with complex objects", () => {
    const payload = { contentHash: "0xabc", registered: true };
    const r = ok(payload);
    if (r.ok) expect(r.value.contentHash).toBe("0xabc");
  });

  it("err() creates a failure result with correct shape", () => {
    const e = new ValidationError("INVALID_CONTENT_HASH", "bad hash");
    const r = err(e);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("INVALID_CONTENT_HASH");
      expect(r.error.message).toBe("bad hash");
    }
  });

  it("ok and err are discriminated by .ok field", () => {
    const success = ok("data");
    const failure = err(new NotFoundError("not found"));
    expect(success.ok).toBe(true);
    expect(failure.ok).toBe(false);
    // TypeScript discriminated union works — no narrowing needed in JS
  });
});

describe("AlexandrianError — base class", () => {
  it("has correct name, code, and message", () => {
    const e = new AlexandrianError("UNKNOWN", "something failed");
    expect(e.name).toBe("AlexandrianError");
    expect(e.code).toBe("UNKNOWN");
    expect(e.message).toBe("something failed");
    expect(e instanceof Error).toBe(true);
  });

  it("preserves cause", () => {
    const cause = new Error("original");
    const e = new AlexandrianError("NETWORK_ERROR", "rpc failed", cause);
    expect(e.cause).toBe(cause);
  });
});

describe("ContractError", () => {
  it("is instanceof AlexandrianError and Error", () => {
    const e = new ContractError("ALREADY_PUBLISHED", "already exists");
    expect(e instanceof AlexandrianError).toBe(true);
    expect(e instanceof Error).toBe(true);
    expect(e.name).toBe("ContractError");
  });

  it("carries the assigned error code", () => {
    const e = new ContractError("INSUFFICIENT_STAKE", "stake too low");
    expect(e.code).toBe("INSUFFICIENT_STAKE");
  });
});

describe("ValidationError", () => {
  it("is instanceof AlexandrianError", () => {
    const e = new ValidationError("INVALID_ADDRESS", "bad address");
    expect(e instanceof AlexandrianError).toBe(true);
    expect(e.name).toBe("ValidationError");
  });
});

describe("NotFoundError", () => {
  it("always uses NOT_FOUND code", () => {
    const e = new NotFoundError("KB does not exist");
    expect(e.code).toBe("NOT_FOUND");
    expect(e.name).toBe("NotFoundError");
  });
});

describe("NetworkError", () => {
  it("carries network-related codes", () => {
    const e = new NetworkError("RPC_TIMEOUT", "request timed out");
    expect(e.code).toBe("RPC_TIMEOUT");
    expect(e.name).toBe("NetworkError");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// wrapError — contract error name → SDK code mapping
// ─────────────────────────────────────────────────────────────────────────────

describe("wrapError — error mapping", () => {
  it("returns AlexandrianError instances unchanged", () => {
    const original = new ValidationError("SIGNER_REQUIRED", "signer required");
    expect(wrapError(original)).toBe(original);
  });

  it("maps contract custom error names to SDK codes", () => {
    const cases: Array<[string, string]> = [
      ["AlreadyPublished", "ALREADY_PUBLISHED"],
      ["InsufficientStake", "INSUFFICIENT_STAKE"],
      ["KBNotRegistered", "KB_NOT_REGISTERED"],
      ["KBIsSlashed", "KB_IS_SLASHED"],
      ["TooManyParents", "TOO_MANY_PARENTS"],
      ["DuplicateParent", "DUPLICATE_PARENT"],
      ["NoSelfReference", "NO_SELF_REFERENCE"],
      ["ParentNotRegistered", "PARENT_NOT_REGISTERED"],
      ["SharesExceedDistributable", "SHARES_EXCEED_DISTRIBUTABLE"],
      ["IncorrectFee", "INCORRECT_FEE"],
      ["ProtocolPaused", "PROTOCOL_PAUSED"],
      ["IdentityAlreadyLinked", "IDENTITY_ALREADY_LINKED"],
      ["NoEarnings", "NO_EARNINGS"],
    ];

    for (const [errorName, expectedCode] of cases) {
      const wrapped = wrapError(new Error(errorName));
      expect(wrapped.code).toBe(expectedCode);
      expect(wrapped instanceof ContractError).toBe(true);
    }
  });

  it("maps network error signatures to NetworkError", () => {
    for (const msg of ["ETIMEDOUT: failed", "timeout exceeded", "ECONNREFUSED"]) {
      const wrapped = wrapError(new Error(msg));
      expect(wrapped.code).toBe("NETWORK_ERROR");
      expect(wrapped instanceof NetworkError).toBe(true);
    }
  });

  it("falls back to UNKNOWN for unrecognized errors", () => {
    const wrapped = wrapError(new Error("something completely unexpected"));
    expect(wrapped.code).toBe("UNKNOWN");
    expect(wrapped instanceof AlexandrianError).toBe(true);
  });

  it("handles non-Error thrown values", () => {
    const wrapped = wrapError("string error");
    expect(wrapped instanceof AlexandrianError).toBe(true);
    expect(wrapped.message).toBe("string error");
  });

  it("handles plain objects", () => {
    const wrapped = wrapError({ message: "object error" });
    expect(wrapped instanceof AlexandrianError).toBe(true);
  });
});
