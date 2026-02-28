import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import sha3 from "js-sha3";

function parseArgs(argv) {
  const out = {
    cid: "",
    ipfsBin: "ipfs",
  };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--cid") out.cid = argv[++i];
    else if (token === "--ipfs-bin") out.ipfsBin = argv[++i];
    else throw new Error(`Unknown argument: ${token}`);
  }
  return out;
}

function bytesToHuman(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function dirSizeBytes(dir) {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) total += dirSizeBytes(p);
    else total += st.size;
  }
  return total;
}

function topLevelTree(dir) {
  return readdirSync(dir).map((entry) => {
    const p = join(dir, entry);
    const st = statSync(p);
    return st.isDirectory() ? `${entry}/` : entry;
  });
}

function verifyBytes(bytes, expectedHash) {
  const { keccak256 } = sha3;
  const computed = `0x${keccak256(bytes)}`.toLowerCase();
  const expected = expectedHash.toLowerCase();
  return {
    expectedArtifactHash: expected,
    computedArtifactHash: computed,
    match: computed === expected,
    verdict: computed === expected ? "verified" : "invalid",
  };
}

function runIpfs(ipfsBin, args) {
  const res = spawnSync(ipfsBin, args, {
    stdio: ["ignore", "pipe", "pipe"],
    cwd: process.cwd(),
    env: process.env,
  });
  if (res.status !== 0) {
    const stderr = (res.stderr || Buffer.from("")).toString("utf8").trim();
    throw new Error(`${ipfsBin} ${args.join(" ")} failed: ${stderr || "unknown error"}`);
  }
  return res.stdout;
}

const args = parseArgs(process.argv);
const kbRecordPath = resolve(process.cwd(), "ipfs/kb-d/kb-record.json");
const artifactPath = resolve(process.cwd(), "ipfs/kb-d/artifact.json");
const artifactDir = resolve(process.cwd(), "ipfs/kb-d");
const kbRecord = JSON.parse(readFileSync(kbRecordPath, "utf8"));

console.log("Proof 1 - Minimal KB commitment vs expressive artifact package");
const kbBytes = statSync(kbRecordPath).size;
const packageBytes = dirSizeBytes(artifactDir);
console.log(
  JSON.stringify(
    {
      kbRecord: {
        path: "ipfs/kb-d/kb-record.json",
        bytes: kbBytes,
        humanSize: bytesToHuman(kbBytes),
      },
      ipfsPackage: {
        path: "ipfs/kb-d/",
        bytes: packageBytes,
        humanSize: bytesToHuman(packageBytes),
      },
      ratio: Number((packageBytes / kbBytes).toFixed(2)),
    },
    null,
    2
  )
);

console.log("\nProof 2 - Rich structured content");
console.log(
  JSON.stringify(
    {
      topLevelEntries: topLevelTree(artifactDir),
      specificationPreview: readFileSync(resolve(process.cwd(), "ipfs/kb-d/docs/specification.md"), "utf8")
        .split("\n")
        .slice(0, 6)
        .join("\n"),
    },
    null,
    2
  )
);

console.log("\nProof 3 - Integrity enforcement (positive + negative)");
const artifactBytes = readFileSync(artifactPath);
const positive = verifyBytes(artifactBytes, kbRecord.artifactHash);
const tamperedPath = resolve(process.cwd(), "ipfs/kb-d/artifact.tampered.json");
writeFileSync(tamperedPath, `${artifactBytes.toString("utf8")}\nTAMPER_VECTOR\n`, "utf8");
const tamperedBytes = readFileSync(tamperedPath);
const negative = verifyBytes(tamperedBytes, kbRecord.artifactHash);
rmSync(tamperedPath, { force: true });
console.log(JSON.stringify({ positive, negative }, null, 2));

if (args.cid) {
  console.log("\nProof 4 - Content addressing and decentralized retrieval (CID)");
  const lsRaw = runIpfs(args.ipfsBin, ["ls", args.cid]).toString("utf8").trim();
  const cidArtifact = runIpfs(args.ipfsBin, ["cat", `${args.cid}/artifact.json`]);
  const cidVerify = verifyBytes(cidArtifact, kbRecord.artifactHash);
  console.log(
    JSON.stringify(
      {
        cid: args.cid,
        ipfsLs: lsRaw.split(/\r?\n/).filter(Boolean),
        cidArtifactBytes: cidArtifact.length,
        cidVerification: cidVerify,
      },
      null,
      2
    )
  );
}
