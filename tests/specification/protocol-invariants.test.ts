/**
 * Protocol invariants — format validation for hashes, addresses, and parents.
 */
import { describe, it, expect } from "vitest";
import { enforceProtocolInvariant } from "@alexandrian/protocol/core";

const VALID_HASH = "0x" + "a".repeat(64);
const VALID_ADDR = "0x" + "b".repeat(40);

describe("Protocol Invariants", () => {
  it("accepts valid hashes and addresses", () => {
    expect(() =>
      enforceProtocolInvariant({
        artifactId: VALID_HASH,
        contentHash: VALID_HASH,
        address: VALID_ADDR,
        addresses: [VALID_ADDR],
        parents: [VALID_HASH],
      })
    ).not.toThrow();
  });

  it("rejects missing 0x prefix", () => {
    expect(() =>
      enforceProtocolInvariant({
        artifactId: "aa".repeat(32),
        contentHash: VALID_HASH,
      })
    ).toThrow(/0x-prefixed/);
  });

  it("rejects wrong length hashes and addresses", () => {
    expect(() =>
      enforceProtocolInvariant({
        artifactId: "0x" + "a".repeat(62),
        contentHash: VALID_HASH,
      })
    ).toThrow(/32 bytes/);

    expect(() =>
      enforceProtocolInvariant({
        artifactId: VALID_HASH,
        contentHash: VALID_HASH,
        address: "0x" + "b".repeat(38),
      })
    ).toThrow(/20 bytes/);
  });

  it("rejects non-hex input", () => {
    expect(() =>
      enforceProtocolInvariant({
        artifactId: "0x" + "g".repeat(64),
        contentHash: VALID_HASH,
      })
    ).toThrow(/must be hex/);
  });

  it("rejects duplicate parents and addresses", () => {
    expect(() =>
      enforceProtocolInvariant({
        artifactId: VALID_HASH,
        contentHash: VALID_HASH,
        parents: [VALID_HASH, VALID_HASH],
      })
    ).toThrow(/unique/);

    expect(() =>
      enforceProtocolInvariant({
        artifactId: VALID_HASH,
        contentHash: VALID_HASH,
        addresses: [VALID_ADDR, VALID_ADDR],
      })
    ).toThrow(/unique/);
  });
});
