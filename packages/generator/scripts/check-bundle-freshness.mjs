/**
 * check-bundle-freshness.mjs
 *
 * Recomputes current artifact hashes from staging/refined and compares them against
 * staged bundle records in staging/bundled or staging/bundled-local.
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import { join, dirname, isAbsolute, resolve } from "path";
import { fileURLToPath } from "url";
import { buildBundle } from "./bundle-artifacts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  return {
    bundledDir: get("--bundled-dir"),
  };
}

function main() {
  const opts = parseArgs();
  const stagingDir = join(__dirname, "..", "staging");
  const refinedDir = join(stagingDir, "refined");
  const bundledDir = opts.bundledDir
    ? (isAbsolute(opts.bundledDir) ? opts.bundledDir : resolve(process.cwd(), opts.bundledDir))
    : join(stagingDir, "bundled");

  const files = readdirSync(refinedDir).filter((f) => f.endsWith(".json")).sort();
  let fresh = 0;
  let stale = 0;
  let missing = 0;
  const examples = [];

  for (const file of files) {
    const kbHash = file.replace(/\.json$/, "");
    const refined = JSON.parse(readFileSync(join(refinedDir, file), "utf8"));
    const { artifactHash } = buildBundle(kbHash, refined);
    const bundledPath = join(bundledDir, file);

    if (!existsSync(bundledPath)) {
      missing++;
      if (examples.length < 20) examples.push(`[missing] ${kbHash}`);
      continue;
    }

    const bundled = JSON.parse(readFileSync(bundledPath, "utf8"));
    if (bundled.artifactHash !== artifactHash) {
      stale++;
      if (examples.length < 20) {
        examples.push(
          `[stale] ${kbHash} expected=${artifactHash.slice(0, 14)}… actual=${String(bundled.artifactHash).slice(0, 14)}…`
        );
      }
      continue;
    }

    fresh++;
  }

  console.log(`\nAlexandrian Bundle Freshness Check`);
  console.log(`  Refined dir: ${refinedDir}`);
  console.log(`  Bundled dir: ${bundledDir}`);
  console.log(`  Fresh:       ${fresh}`);
  console.log(`  Stale:       ${stale}`);
  console.log(`  Missing:     ${missing}`);

  if (examples.length > 0) {
    console.log(`\nExamples:`);
    for (const example of examples) console.log(`  ${example}`);
  }

  if (stale > 0 || missing > 0) process.exit(1);
}

main();
