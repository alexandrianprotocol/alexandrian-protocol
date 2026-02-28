import { describe, expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { keccak256, toUtf8Bytes } from "ethers";
import { canonicalize } from "../../packages/protocol/src/canonical.js";

describe("proof vectors (v1)", () => {
  test("canonical proof hash matches vector", () => {
    const proof = JSON.parse(
      readFileSync(join("test-vectors", "v1", "proof", "sample.json"), "utf8")
    );
    const expected = JSON.parse(
      readFileSync(join("test-vectors", "v1", "proof", "sample.expected.json"), "utf8")
    ).proofHash;
    const canonical = canonicalize(proof);
    const hash = keccak256(toUtf8Bytes(canonical));
    expect(hash).toEqual(expected);
  });
});
