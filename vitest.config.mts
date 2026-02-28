import { defineConfig } from "vitest/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/m2/**"],
    environment: "node",
    env: { NODE_ENV: "test" },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["packages/protocol/src/**"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.ts", "**/*.d.ts"],
      // Thresholds: run `pnpm test:coverage` locally to establish baseline,
      // then uncomment and set to ~5% below measured values.
      // thresholds: { lines: 70, functions: 75, branches: 60, statements: 70 },
    },
  },
  resolve: {
    alias: {
      // Use source so vitest transforms TS (avoids multiformats CJS resolution in protocol deps)
      "@alexandrian/protocol": resolve(__dirname, "packages/protocol/src"),
      "@alexandrian/protocol/core": resolve(__dirname, "packages/protocol/src/core/index.ts"),
      "@alexandrian/protocol/schema": resolve(__dirname, "packages/protocol/src/schema/index.ts"),
    },
  },
});
