import { defineConfig } from "vitest/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@alexandrian/protocol": resolve(REPO_ROOT, "packages/protocol/src"),
      "@alexandrian/protocol/core": resolve(REPO_ROOT, "packages/protocol/src/core/index.ts"),
      "@alexandrian/protocol/schema": resolve(REPO_ROOT, "packages/protocol/src/schema/index.ts"),
      "@alexandrian/schema-v1": resolve(REPO_ROOT, "packages/schema-v1/src"),
    },
  },
});
