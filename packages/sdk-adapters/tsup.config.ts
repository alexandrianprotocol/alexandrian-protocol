import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  // Externalize workspace packages and heavy peer deps — never bundle them
  external: [
    "@alexandrian/protocol",
    "@alexandrian/sdk-core",
    "ethers",
    "zod",
  ],
  // Preserve pure annotations for tree-shaking
  treeshake: true,
  // Target Node 18+ and modern browsers
  target: "es2020",
});
