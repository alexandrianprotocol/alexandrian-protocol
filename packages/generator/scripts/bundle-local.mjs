/**
 * bundle-local.mjs
 *
 * Writes full local bundle directories for every refined KB without posting to IPFS.
 * Output:
 *   staging/bundles-local/{kbHash}/artifact.json
 *   staging/bundles-local/{kbHash}/manifest.json
 *   staging/bundles-local/{kbHash}/meta.json
 *   staging/bundled-local/{kbHash}.json
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { buildBundle } from "./bundle-artifacts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  const has = (flag) => args.includes(flag);
  return {
    clean: has("--clean"),
  };
}

function main() {
  const opts = parseArgs();
  const stagingDir = join(__dirname, "..", "staging");
  const refinedDir = join(stagingDir, "refined");
  const localBundlesDir = join(stagingDir, "bundles-local");
  const localIndexDir = join(stagingDir, "bundled-local");
  const logPath = join(stagingDir, "bundle-local-log.jsonl");

  if (opts.clean) {
    rmSync(localBundlesDir, { recursive: true, force: true });
    rmSync(localIndexDir, { recursive: true, force: true });
  }

  mkdirSync(localBundlesDir, { recursive: true });
  mkdirSync(localIndexDir, { recursive: true });

  const files = readdirSync(refinedDir).filter((f) => f.endsWith(".json")).sort();

  console.log(`\nAlexandrian Local Bundler`);
  console.log(`  Refined dir: ${refinedDir}`);
  console.log(`  Bundle dir:  ${localBundlesDir}`);
  console.log(`  Index dir:   ${localIndexDir}`);
  console.log(`  KBs:         ${files.length}\n`);

  let written = 0;
  for (const file of files) {
    const kbHash = file.replace(/\.json$/, "");
    const entry = JSON.parse(readFileSync(join(refinedDir, file), "utf8"));
    const { artifact, artifactHash, manifest, meta } = buildBundle(kbHash, entry);
    const outDir = join(localBundlesDir, kbHash);
    const record = {
      artifactHash,
      bundledAt: new Date().toISOString(),
      domain: artifact.domain,
      rootCid: null,
      title: artifact.title,
      localBundlePath: outDir,
    };

    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "artifact.json"), JSON.stringify(artifact, null, 2) + "\n");
    writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    writeFileSync(join(outDir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
    writeFileSync(join(localIndexDir, `${kbHash}.json`), JSON.stringify(record, null, 2) + "\n");
    writeFileSync(logPath, JSON.stringify({ kbHash, ...record }) + "\n", { flag: "a" });
    written++;
  }

  console.log(`Wrote ${written} local bundle(s).`);
  console.log(`Log: ${logPath}`);
}

main();
