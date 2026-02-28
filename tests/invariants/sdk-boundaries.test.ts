import { describe, expect, test } from "vitest";
import { spawnSync } from "child_process";
import { join } from "path";

describe("sdk boundary rules", () => {
  test("boundary script passes", () => {
    const scriptPath = join(process.cwd(), "scripts", "check-boundaries.mjs");
    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
  });
});
