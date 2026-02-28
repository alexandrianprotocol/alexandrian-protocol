import { describe, it, expect } from "vitest";
import { IpfsHasher } from "@alexandrian/protocol/core";
const content = Buffer.from(`
  Alexandrian Protocol is a decentralized knowledge protocol.
  It enables AI agents to access curated information.
  Contributors are rewarded through a recursive royalty DAG.
`);

describe("Alexandrian Protocol Introduction (ingestion)", () => {
  describe("IpfsHasher and fingerprint", () => {
    it("fromBuffer produces a defined string CID", async () => {
      const cid = await IpfsHasher.fromBuffer(content);
      expect(cid).toBeDefined();
      expect(typeof cid).toBe("string");
    });

    it("verify returns true for content and its CID", async () => {
      const cid = await IpfsHasher.fromBuffer(content);
      expect(await IpfsHasher.verify(content, cid)).toBe(true);
    });

    it("verify returns false for wrong CID", async () => {
      const cid = await IpfsHasher.fromBuffer(content);
      expect(await IpfsHasher.verify(content, "bafybeiwrong12345")).toBe(false);
    });

    it("handles empty buffer", async () => {
      const cid = await IpfsHasher.fromBuffer(Buffer.alloc(0));
      expect(cid).toMatch(/^baf/);
    });

    it("produces identical CID for identical content", async () => {
      const a = await IpfsHasher.fromBuffer(content);
      const b = await IpfsHasher.fromBuffer(content);
      expect(a).toBe(b);
    });
  });

});
