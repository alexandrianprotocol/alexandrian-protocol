import { readFileSync, rmSync, writeFileSync } from "node:fs";
import sha3 from "js-sha3";

const kbRecordPath = "ipfs/kb-d/kb-record.json";
const artifactPath = "ipfs/kb-d/artifact.json";

function printStep(title) {
  console.log(`\n${title}`);
}

function verifyFile(file, expectedHash) {
  const bytes = readFileSync(file);
  const { keccak256 } = sha3;
  const computed = `0x${keccak256(bytes)}`;
  const expected = expectedHash.toLowerCase();
  const match = computed.toLowerCase() === expected;
  return {
    source: { type: "file", file },
    hashAlgorithm: "keccak256",
    expectedArtifactHash: expected,
    computedArtifactHash: computed,
    bytes: bytes.length,
    match,
    verdict: match ? "verified" : "invalid",
  };
}

const kbRecord = JSON.parse(readFileSync(kbRecordPath, "utf8"));
const expectedHash = kbRecord.artifactHash;

printStep("Step 0 - KB Record");
console.log(JSON.stringify(kbRecord, null, 2));

printStep("Step 1 - Artifact Content");
console.log(readFileSync(artifactPath, "utf8"));

printStep("Step 2/3 - Compute + Compare");
const positive = verifyFile(artifactPath, expectedHash);
console.log(JSON.stringify(positive, null, 2));

printStep("Step 4 - Tamper Test (negative)");
const tamperedPath = "ipfs/kb-d/artifact.tampered.json";
const original = readFileSync(artifactPath, "utf8");
writeFileSync(tamperedPath, `${original}\nTAMPER_VECTOR\n`, "utf8");
const negative = verifyFile(tamperedPath, expectedHash);
console.log(JSON.stringify(negative, null, 2));
rmSync(tamperedPath, { force: true });
