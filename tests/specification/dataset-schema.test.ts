/**
 * Unit tests: DatasetSchema (Zod) — valid, missing fields, boundaries, wrong types
 */
import { describe, it, expect } from "vitest";
import { DatasetSchema } from "@alexandrian/protocol/schema";
import { buildDataset } from "../fixtures";

describe("DatasetSchema — valid input", () => {
  it("accepts minimal valid dataset", () => {
    expect(() => DatasetSchema.parse(buildDataset())).not.toThrow();
  });

  it("accepts qualityScore 0 and 100", () => {
    expect(() => DatasetSchema.parse(buildDataset({ qualityScore: 0 }))).not.toThrow();
    expect(() => DatasetSchema.parse(buildDataset({ qualityScore: 100 }))).not.toThrow();
  });

  it("accepts blocks array", () => {
    const d = buildDataset({ blocks: [{ id: "1" }, { id: "2" }] });
    expect(DatasetSchema.parse(d).blocks).toHaveLength(2);
  });

  it("accepts standard license types", () => {
    expect(() => DatasetSchema.parse(buildDataset({ license: { type: "MIT", terms: { commercialUse: true, attribution: true, shareAlike: false, derivatives: true } } }))).not.toThrow();
  });
});

describe("DatasetSchema — missing required fields", () => {
  it("rejects missing id", () => {
    const d = buildDataset();
    const { id: _, ...rest } = d as Record<string, unknown>;
    expect(() => DatasetSchema.parse(rest)).toThrow();
  });

  it("rejects missing license", () => {
    const d = buildDataset();
    const { license: _, ...rest } = d as Record<string, unknown>;
    expect(() => DatasetSchema.parse(rest)).toThrow();
  });
});

describe("DatasetSchema — value boundaries", () => {
  it("rejects qualityScore > 100", () => {
    expect(() => DatasetSchema.parse(buildDataset({ qualityScore: 101 }))).toThrow();
  });

  it("rejects qualityScore < 0", () => {
    expect(() => DatasetSchema.parse(buildDataset({ qualityScore: -1 }))).toThrow();
  });
});

describe("DatasetSchema — wrong field types", () => {
  it("rejects id as number", () => {
    expect(() => DatasetSchema.parse(buildDataset({ id: 42 }))).toThrow();
  });

  it("rejects qualityScore as string", () => {
    expect(() => DatasetSchema.parse(buildDataset({ qualityScore: "high" }))).toThrow();
  });

  it("rejects tags as string", () => {
    expect(() => DatasetSchema.parse(buildDataset({ tags: "ai,protocol" }))).toThrow();
  });
});

describe("DatasetSchema — license type", () => {
  it("rejects unknown license type", () => {
    expect(() =>
      DatasetSchema.parse(
        buildDataset({
          license: { type: "UNKNOWN" as never, terms: { commercialUse: false, attribution: false, shareAlike: false, derivatives: false } },
        })
      )
    ).toThrow();
  });
});
