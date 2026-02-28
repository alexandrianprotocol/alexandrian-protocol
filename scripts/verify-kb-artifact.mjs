import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import sha3 from "js-sha3";

function parseArgs(argv) {
  const out = {
    file: "",
    cid: "",
    expectedHash: "",
    target: "artifact.json",
    ipfsBin: "ipfs",
  };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--file") out.file = argv[++i];
    else if (token === "--cid") out.cid = argv[++i];
    else if (token === "--expected-hash") out.expectedHash = argv[++i];
    else if (token === "--target") out.target = argv[++i];
    else if (token === "--ipfs-bin") out.ipfsBin = argv[++i];
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!out.expectedHash) {
    throw new Error("--expected-hash is required");
  }
  if ((out.file ? 1 : 0) + (out.cid ? 1 : 0) !== 1) {
    throw new Error("Provide exactly one source: --file or --cid");
  }
  return out;
}

function fromFile(file) {
  const abs = resolve(process.cwd(), file);
  return readFileSync(abs);
}

function fromCid(ipfsBin, cid, target) {
  const path = `${cid}/${target}`.replace(/\\/g, "/");
  const res = spawnSync(ipfsBin, ["cat", path], {
    stdio: ["ignore", "pipe", "pipe"],
    cwd: process.cwd(),
    env: process.env,
  });
  if (res.status !== 0) {
    const stderr = (res.stderr || Buffer.from("")).toString("utf8").trim();
    throw new Error(`ipfs cat failed for ${path}: ${stderr || "unknown error"}`);
  }
  return res.stdout;
}

function parseJsonOrNull(bytes) {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch {
    return null;
  }
}

function ensurePayloadPointerIntegrity(artifactObj, readRelative) {
  const payloadPath = artifactObj?.components?.payload;
  if (payloadPath === undefined) return null;
  if (typeof payloadPath !== "string" || payloadPath.trim().length === 0) {
    throw new Error(
      "Pointer integrity failed: artifact.components.payload must be a non-empty string"
    );
  }
  if (typeof artifactObj.payloadHash !== "string" || !artifactObj.payloadHash) {
    throw new Error(
      "Pointer integrity failed: artifact.payloadHash is required when components.payload is present"
    );
  }

  const manifest = parseJsonOrNull(readRelative("manifest.json"));
  if (!manifest || !Array.isArray(manifest.files)) {
    throw new Error(
      "Pointer integrity failed: manifest.json missing or invalid (expected files array)"
    );
  }
  const listed = manifest.files.some(
    (entry) => entry && typeof entry.path === "string" && entry.path === payloadPath
  );
  if (!listed) {
    throw new Error(
      `Pointer integrity failed: payload path "${payloadPath}" is not listed in manifest.json`
    );
  }

  const payloadBytes = readRelative(payloadPath);
  const { keccak256 } = sha3;
  const expectedPayloadHash = artifactObj.payloadHash.toLowerCase();
  const computedPayloadHash = `0x${keccak256(payloadBytes)}`.toLowerCase();
  const payloadHashMatch = computedPayloadHash === expectedPayloadHash;
  if (!payloadHashMatch) {
    throw new Error(
      `Pointer integrity failed: payloadHash mismatch (${expectedPayloadHash} != ${computedPayloadHash})`
    );
  }
  return {
    payloadPath,
    expectedPayloadHash,
    computedPayloadHash,
    payloadBytes: payloadBytes.length,
    manifestListed: true,
    payloadHashMatch: true,
  };
}

const args = parseArgs(process.argv);
const expected = args.expectedHash.toLowerCase();
const { keccak256 } = sha3;
const isFile = Boolean(args.file);
const bytes = isFile
  ? fromFile(args.file)
  : fromCid(args.ipfsBin, args.cid, args.target);
const readRelative = isFile
  ? (relPath) => {
      const baseDir = dirname(resolve(process.cwd(), args.file));
      return readFileSync(resolve(baseDir, relPath));
    }
  : (relPath) => fromCid(args.ipfsBin, args.cid, relPath);

const computed = `0x${keccak256(bytes)}`;
const match = computed.toLowerCase() === expected;
const artifactObj = parseJsonOrNull(bytes);
const pointerIntegrity = artifactObj
  ? ensurePayloadPointerIntegrity(artifactObj, readRelative)
  : null;

console.log(
  JSON.stringify(
    {
      source: args.file
        ? { type: "file", file: args.file }
        : { type: "cid", cid: args.cid, target: args.target },
      hashAlgorithm: "keccak256",
      expectedArtifactHash: expected,
      computedArtifactHash: computed,
      bytes: bytes.length,
      pointerIntegrity,
      match,
      verdict: match ? "verified" : "invalid",
    },
    null,
    2
  )
);

process.exit(match ? 0 : 1);
