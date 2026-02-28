import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { ethers } from "ethers";
import sha3 from "js-sha3";

const DEFAULT_KB_D_PUBLISH_TX =
  "0x83233ec285d3dbd06b715aa34c5de3f500789f1e685e2c20f2fe1d3384a7050c";

function parseArgs(argv) {
  const out = {
    registryAddress: "",
    rpcUrl:
      process.env.BASE_RPC_URL ||
      process.env.BASE_MAINNET_RPC_URL ||
      process.env.CHAIN_RPC_URL ||
      "https://mainnet.base.org",
    gateway: process.env.IPFS_GATEWAY || "",
    cidOverride: "",
    kbHash: "",
    publishTx: DEFAULT_KB_D_PUBLISH_TX,
    expectedArtifactHash: "",
    ipfsBin: "ipfs",
    target: "artifact.json",
  };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--") continue;
    if (token === "--registry-address") out.registryAddress = argv[++i];
    else if (token === "--rpc-url") out.rpcUrl = argv[++i];
    else if (token === "--gateway") out.gateway = argv[++i];
    else if (token === "--cid-override") out.cidOverride = argv[++i];
    else if (token === "--kb-hash") out.kbHash = argv[++i];
    else if (token === "--publish-tx") out.publishTx = argv[++i];
    else if (token === "--expected-artifact-hash")
      out.expectedArtifactHash = argv[++i];
    else if (token === "--ipfs-bin") out.ipfsBin = argv[++i];
    else if (token === "--target") out.target = argv[++i];
    else throw new Error(`Unknown argument: ${token}`);
  }
  return out;
}

function loadDefaults() {
  const deploymentPath = resolve(
    process.cwd(),
    "packages/protocol/deployments/AlexandrianRegistryV2.json"
  );
  const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
  const kbRecordPath = resolve(process.cwd(), "ipfs/kb-d/kb-record.json");
  const kbRecord = JSON.parse(readFileSync(kbRecordPath, "utf8"));
  return {
    deployment,
    kbRecord,
  };
}

function normalizeHash(value) {
  if (!value) return "";
  const v = value.toLowerCase();
  return v.startsWith("0x") ? v : `0x${v}`;
}

function fetchFromIpfs(ipfsBin, cid, target) {
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

async function fetchFromGateway(gateway, cid, target) {
  const base = gateway.replace(/\/$/, "");
  const url = `${base}/ipfs/${cid}/${target}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gateway fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

function decodeKbHashFromTx(receipt, iface) {
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === "KBPublished") {
        return parsed.args.contentHash;
      }
    } catch {
      // ignore non-registry logs
    }
  }
  throw new Error("KBPublished event not found in publish transaction logs");
}

const args = parseArgs(process.argv);
const { deployment, kbRecord } = loadDefaults();
const registryAddress = args.registryAddress || deployment.address;
const expectedArtifactHash =
  normalizeHash(args.expectedArtifactHash) ||
  normalizeHash(kbRecord.artifactHash || "");

const abiArtifactPath = resolve(
  process.cwd(),
  "packages/protocol/artifacts/contracts/AlexandrianRegistryV2.sol/AlexandrianRegistryV2.json"
);
const abi = JSON.parse(readFileSync(abiArtifactPath, "utf8")).abi;
const iface = new ethers.Interface(abi);
const provider = new ethers.JsonRpcProvider(args.rpcUrl, {
  chainId: 8453,
  name: "base",
});
const contract = new ethers.Contract(registryAddress, abi, provider);

let network;
try {
  network = await provider.getNetwork();
} catch (error) {
  const msg =
    error instanceof Error ? error.message : "unknown provider/network error";
  throw new Error(
    `Unable to reach Base RPC (${args.rpcUrl}). ` +
      `Pass --rpc-url <provider> or set BASE_RPC_URL. Underlying error: ${msg}`
  );
}
if (Number(network.chainId) !== 8453) {
  throw new Error(`Expected chainId 8453 (Base), received ${network.chainId}`);
}

let kbHash = args.kbHash;
if (!kbHash) {
  const receipt = await provider.getTransactionReceipt(args.publishTx);
  if (!receipt) {
    throw new Error(`Publish transaction receipt not found: ${args.publishTx}`);
  }
  kbHash = decodeKbHashFromTx(receipt, iface);
}

const kb = await contract.getKnowledgeBlock(kbHash);
// --cid-override bypasses the on-chain CID pointer (useful when the on-chain value
// is a placeholder and the real CID is known from a separate pinning step)
const cid = args.cidOverride || kb.cid;

const output = {
  environment: {
    chainId: Number(network.chainId),
    registryAddress,
  },
  onChain: {
    kbHash,
    cid: kb.cid,
    ...(args.cidOverride ? { cidOverride: args.cidOverride } : {}),
    curator: kb.curator,
    domain: kb.domain,
    queryFeeWei: kb.queryFee.toString(),
    exists: kb.exists,
    note:
      "AlexandrianRegistryV2 stores kbHash(contentHash) and cid on-chain; artifactHash verification is off-chain against fetched bytes.",
  },
};

// CIDv0 (Qm...) or CIDv1 (bafy... / b...)
const IPFS_CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[a-z2-7]{58,}|B[A-Z2-7]{58,})/;
const cidLooksReal = cid && IPFS_CID_RE.test(cid);

if (expectedArtifactHash && cid) {
  if (!cidLooksReal) {
    output.integrity = {
      source: { type: "cid", cid, target: args.target },
      verdict: "skipped",
      reason: `CID "${cid}" does not match a known IPFS CID format — the on-chain value may be a placeholder. Pin a real artifact and update the registry to enable byte-level verification.`,
    };
  } else {
    try {
      // Prefer public gateway (no local IPFS required); fall back to ipfs CLI
      let bytes;
      let fetchMethod;
      if (args.gateway) {
        bytes = await fetchFromGateway(args.gateway, cid, args.target);
        fetchMethod = `gateway:${args.gateway}`;
      } else {
        bytes = fetchFromIpfs(args.ipfsBin, cid, args.target);
        fetchMethod = `cli:${args.ipfsBin}`;
      }
      const { keccak256 } = sha3;
      const computed = `0x${keccak256(bytes)}`.toLowerCase();
      const expected = expectedArtifactHash.toLowerCase();
      output.integrity = {
        source: { type: "cid", cid, target: args.target, via: fetchMethod },
        expectedArtifactHash: expected,
        computedArtifactHash: computed,
        bytes: bytes.length,
        match: computed === expected,
        verdict: computed === expected ? "verified" : "invalid",
      };
    } catch (err) {
      output.integrity = {
        source: { type: "cid", cid, target: args.target },
        verdict: "skipped",
        reason: err instanceof Error ? err.message : String(err),
        hint: args.gateway
          ? `Check that the gateway is reachable and the CID is pinned.`
          : `Pass --gateway https://ipfs.io (or set IPFS_GATEWAY) to verify without a local IPFS node.`,
      };
    }
  }
}

console.log(JSON.stringify(output, null, 2));
