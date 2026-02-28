import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: [
    "@alexandrian/protocol",
    "ethers",
  ],
  treeshake: true,
  target: "es2020",
});
