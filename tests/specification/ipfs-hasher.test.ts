/**
 * Unit tests: IpfsHasher
 */
import { describe, it, expect } from "vitest";
import { IpfsHasher } from "@alexandrian/protocol/core";

const SHORT_BUFFER = Buffer.from("Alexandrian Protocol");
const MULTI_PARA_BUFFER = Buffer.from("Paragraph one.\n\nParagraph two.");
const EMPTY_BUFFER = Buffer.alloc(0);

describe("IpfsHasher.fromBuffer()", () => {
  it("returns a string matching CIDv1 base32 pattern", async () => {
    const cid = await IpfsHasher.fromBuffer(SHORT_BUFFER);
    expect(cid).toMatch(/^ba[fky][a-z0-9]+$/);
  });

  it("produces identical CID for identical content", async () => {
    const a = await IpfsHasher.fromBuffer(SHORT_BUFFER);
    const b = await IpfsHasher.fromBuffer(SHORT_BUFFER);
    expect(a).toBe(b);
  });

  it("different content produces different CID", async () => {
    const a = await IpfsHasher.fromBuffer(SHORT_BUFFER);
    const b = await IpfsHasher.fromBuffer(MULTI_PARA_BUFFER);
    expect(a).not.toBe(b);
  });

  it("handles empty buffer", async () => {
    const cid = await IpfsHasher.fromBuffer(EMPTY_BUFFER);
    expect(cid).toMatch(/^baf/);
  });
});

describe("IpfsHasher.fromString()", () => {
  it("matches fromBuffer for same UTF-8 content", async () => {
    const str = "Hello world";
    const fromStr = await IpfsHasher.fromString(str);
    const fromBuf = await IpfsHasher.fromBuffer(Buffer.from(str, "utf-8"));
    expect(fromStr).toBe(fromBuf);
  });

  it("empty string matches empty buffer", async () => {
    const fromStr = await IpfsHasher.fromString("");
    const fromBuf = await IpfsHasher.fromBuffer(EMPTY_BUFFER);
    expect(fromStr).toBe(fromBuf);
  });
});

describe("IpfsHasher.verify()", () => {
  it("returns true when content matches CID", async () => {
    const cid = await IpfsHasher.fromBuffer(SHORT_BUFFER);
    expect(await IpfsHasher.verify(SHORT_BUFFER, cid)).toBe(true);
  });

  it("returns false when content does not match CID", async () => {
    const cid = await IpfsHasher.fromBuffer(SHORT_BUFFER);
    expect(await IpfsHasher.verify(MULTI_PARA_BUFFER, cid)).toBe(false);
  });

  it("returns false for wrong CID string", async () => {
    expect(await IpfsHasher.verify(SHORT_BUFFER, "bafybeiwrong12345")).toBe(false);
  });

  it("returns false for invalid CID format", async () => {
    expect(await IpfsHasher.verify(SHORT_BUFFER, "not-a-cid")).toBe(false);
  });
});

describe("IpfsHasher.merkleRoot()", () => {
  it("single CID returns valid root", async () => {
    const cid = await IpfsHasher.fromBuffer(SHORT_BUFFER);
    const root = await IpfsHasher.merkleRoot([cid]);
    expect(root).toMatch(/^baf/);
  });

  it("same CIDs in any order produce same root (implementation sorts)", async () => {
    const cidA = await IpfsHasher.fromBuffer(SHORT_BUFFER);
    const cidB = await IpfsHasher.fromBuffer(MULTI_PARA_BUFFER);
    const r1 = await IpfsHasher.merkleRoot([cidA, cidB]);
    const r2 = await IpfsHasher.merkleRoot([cidB, cidA]);
    expect(r1).toBe(r2);
  });
});
