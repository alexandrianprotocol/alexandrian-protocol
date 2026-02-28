import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sha3 from "js-sha3";

function parseArgs(argv) {
  const args = { file: "ipfs/kb-d/artifact.json", json: true };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--file") {
      args.file = argv[++i];
    } else if (token === "--plain") {
      args.json = false;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

const { file, json } = parseArgs(process.argv);
const abs = resolve(process.cwd(), file);
const bytes = readFileSync(abs);
const { keccak256 } = sha3;
const hash = `0x${keccak256(bytes)}`;

if (!json) {
  console.log(hash);
  process.exit(0);
}

console.log(
  JSON.stringify(
    {
      file,
      bytes: bytes.length,
      hashAlgorithm: "keccak256",
      computedArtifactHash: hash,
    },
    null,
    2
  )
);
