/**
 * export-abi.mjs
 *
 * Extracts the compiled ABI from Hardhat artifacts and writes it to the
 * versioned location consumed by the SDK and typechain.
 *
 * Run after `pnpm --filter @alexandrian/protocol run compile`:
 *   node packages/protocol/scripts/export-abi.mjs
 *
 * The CI pipeline runs this automatically between compile and build steps.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const CONTRACTS = [
  {
    artifact: join(
      root,
      "artifacts/contracts/AlexandrianRegistryV2.sol/AlexandrianRegistryV2.json"
    ),
    out: join(root, "src/abis/AlexandrianRegistryV2.json"),
  },
];

let ok = true;

for (const { artifact, out } of CONTRACTS) {
  try {
    const raw = JSON.parse(readFileSync(artifact, "utf8"));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(raw.abi, null, 2));
    console.log(`✓  ${artifact.split("/contracts/")[1]} → ${out.split("/src/")[1]}`);
    console.log(`   ${raw.abi.length} entries`);
  } catch (err) {
    console.error(`✗  Failed to export ABI from ${artifact}`);
    console.error(`   ${err.message}`);
    console.error(`   Did you run 'pnpm --filter @alexandrian/protocol run compile'?`);
    ok = false;
  }
}

if (!ok) process.exit(1);
