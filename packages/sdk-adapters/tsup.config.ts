import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  // Externalize heavy peer deps — never bundle them.
  external: [
    "@alexandrian/sdk-core",
    "ethers",
  ],
  // Force @alexandrian/protocol and its transitive deps to be bundled inline.
  // Required to avoid two Node.js v20 incompatibilities in the dist:
  //   1. JSON import assertion — Node.js v20 ESM requires `assert { type: "json" }` for
  //      JSON imports; tsup strips this when externalizing. Bundling inlines the ABI object.
  //   2. multiformats ESM-only — multiformats@12 dropped CJS; downgraded to v9 for CJS
  //      compatibility, and esbuild bundles its CJS output cleanly into the dist.
  //   3. Dynamic require() of externals — bundled CJS code (protocol dist) emits
  //      require("zod") and require("js-sha3"); these must be bundled inline so the
  //      ESM dist doesn't have unresolvable require() calls for external modules.
  noExternal: ["@alexandrian/protocol", "zod", "js-sha3"],
  // shims: true injects a proper createRequire-based __require shim in the ESM dist,
  // allowing the bundled CJS protocol code to require() Node.js built-ins (crypto, etc.).
  shims: true,
  platform: "node",
  target: "es2020",
  // Preserve pure annotations for tree-shaking
  treeshake: true,
});
