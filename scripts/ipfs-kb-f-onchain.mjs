/**
 * ipfs-kb-f-onchain.mjs
 *
 * Verifies KB-F end-to-end:
 *   1. Connects to Base mainnet and reads KB-F from the registry
 *   2. Optionally fetches artifact.json from IPFS and verifies:
 *      keccak256(fetched_bytes) == kb-record.json.artifactHash
 *
 * Unlike ipfs-kb-d-onchain.mjs, KB-F has a real CID stored on-chain.
 * The full verification chain works without --cid-override.
 *
 * Usage:
 *   # Verify with public gateway (recommended):
 *   node scripts/ipfs-kb-f-onchain.mjs --gateway https://ipfs.io
 *
 *   # Verify with fallback gateways (comma-separated):
 *   node scripts/ipfs-kb-f-onchain.mjs --gateway https://ipfs.io,https://dweb.link,https://cloudflare-ipfs.com
 *
 *   # Using kb-record.json kbHash (after publish):
 *   node scripts/ipfs-kb-f-onchain.mjs --gateway https://ipfs.io
 *
 *   # Override kbHash manually:
 *   node scripts/ipfs-kb-f-onchain.mjs --kb-hash <hash> --gateway https://ipfs.io
 *
 *   # Using publish tx to look up kbHash:
 *   node scripts/ipfs-kb-f-onchain.mjs --publish-tx <tx> --gateway https://ipfs.io
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { ethers } from "ethers";
import sha3 from "js-sha3";

function parseArgs(argv) {
  const out = {
    registryAddress: "",
    rpcUrl:
      process.env.BASE_RPC_URL ||
      process.env.BASE_MAINNET_RPC_URL ||
      process.env.CHAIN_RPC_URL ||
      "https://mainnet.base.org",
    gateway: process.env.IPFS_GATEWAY || "",
    kbHash: "",
    publishTx: "",
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
    else if (token === "--kb-hash") out.kbHash = argv[++i];
    else if (token === "--publish-tx") out.publishTx = argv[++i];
    else if (token === "--expected-artifact-hash") out.expectedArtifactHash = argv[++i];
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
  const kbRecordPath = resolve(process.cwd(), "ipfs/kb-f/kb-record.json");
  const kbRecord = JSON.parse(readFileSync(kbRecordPath, "utf8"));
  return { deployment, kbRecord };
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
  const parsed = new URL(base);
  const pathStyleUrl = `${base}/ipfs/${cid}/${target}`;
  const subdomainUrl = `${parsed.protocol}//${cid}.ipfs.${parsed.host}/${target}`;
  const urls = Array.from(new Set([pathStyleUrl, subdomainUrl]));
  const failures = [];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) {
        failures.push(`HTTP ${res.status} ${res.statusText} (${url})`);
        continue;
      }
      const buf = await res.arrayBuffer();
      return { bytes: Buffer.from(buf), url };
    } catch (err) {
      const baseMsg = err instanceof Error ? err.message : String(err);
      const causeMsg =
        err && typeof err === "object" && "cause" in err && err.cause
          ? `; cause=${String(err.cause)}`
          : "";
      failures.push(`${baseMsg}${causeMsg} (${url})`);
    }
  }

  throw new Error(`Gateway fetch failed for all attempts: ${failures.join(" | ")}`);
}

function parseGatewayList(gatewayArg) {
  if (!gatewayArg) return [];
  return gatewayArg
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function withDefaultGatewayFallbacks(gateways) {
  const defaults = ["https://ipfs.io", "https://dweb.link", "https://cloudflare-ipfs.com"];
  const seen = new Set();
  const out = [];
  for (const gateway of [...gateways, ...defaults]) {
    if (!gateway || seen.has(gateway)) continue;
    seen.add(gateway);
    out.push(gateway);
  }
  return out;
}

function withDefaultRpcFallbacks(rpcUrl) {
  const defaults = [
    "https://mainnet.base.org",
    "https://base.llamarpc.com",
    "https://base-rpc.publicnode.com",
  ];
  const seen = new Set();
  const out = [];
  for (const url of [rpcUrl, ...defaults]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

async function fetchFromGatewayList(gateways, cid, target) {
  const failures = [];
  for (const gateway of gateways) {
    try {
      const fetched = await fetchFromGateway(gateway, cid, target);
      return { ...fetched, gateway };
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(`All gateways failed: ${failures.join(" || ")}`);
}

async function connectProviderWithFallback(rpcUrls) {
  const failures = [];
  for (const rpcUrl of rpcUrls) {
    const provider = new ethers.JsonRpcProvider(rpcUrl, {
      chainId: 8453,
      name: "base",
    });
    try {
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 8453) {
        failures.push(`wrong chainId ${network.chainId} (${rpcUrl})`);
        continue;
      }
      return { provider, network, rpcUrl };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "unknown provider/network error";
      failures.push(`${msg} (${rpcUrl})`);
    }
  }
  throw new Error(`Unable to reach Base RPC from all attempts: ${failures.join(" | ")}`);
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
const rpcUrls = withDefaultRpcFallbacks(args.rpcUrl);
const { provider, network, rpcUrl: activeRpcUrl } = await connectProviderWithFallback(rpcUrls);
const contract = new ethers.Contract(registryAddress, abi, provider);

// Resolve kbHash — in order of preference:
//   1. --kb-hash flag
//   2. --publish-tx flag (decode from KBPublished event)
//   3. kb-record.json.kbHash (written by publish-kb-f.mjs)
let kbHash = args.kbHash;
if (!kbHash && args.publishTx) {
  const receipt = await provider.getTransactionReceipt(args.publishTx);
  if (!receipt) {
    throw new Error(`Publish transaction receipt not found: ${args.publishTx}`);
  }
  kbHash = decodeKbHashFromTx(receipt, iface);
} else if (!kbHash) {
  if (!kbRecord.kbHash || kbRecord.kbHash === "") {
    throw new Error(
      "kbHash not available. Pass --kb-hash <hash> or --publish-tx <tx>, " +
      "or run 'pnpm run ipfs:kb-f:publish' first to populate kb-record.json."
    );
  }
  kbHash = kbRecord.kbHash;
}

const kb = await contract.getKnowledgeBlock(kbHash);

const output = {
  environment: {
    chainId: Number(network.chainId),
    registryAddress,
    rpcUrl: activeRpcUrl,
  },
  onChain: {
    kbHash,
    cid: kb.cid,
    curator: kb.curator,
    domain: kb.domain,
    queryFeeWei: kb.queryFee.toString(),
    exists: kb.exists,
    note: "KB-F stores a real IPFS CIDv1 on-chain (not a placeholder). Full byte-level verification is available via --gateway.",
  },
};

// CIDv0 (Qm...) or CIDv1 (bafy... / b...)
const IPFS_CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[a-z2-7]{58,}|B[A-Z2-7]{58,})/;
const cid = kb.cid;
const cidLooksReal = cid && IPFS_CID_RE.test(cid);
const gatewayList = withDefaultGatewayFallbacks(parseGatewayList(args.gateway));

if (expectedArtifactHash && cid) {
  if (!cidLooksReal) {
    // This should not happen for KB-F — it means KB-F was published with a placeholder CID
    output.integrity = {
      source: { type: "cid", cid, target: args.target },
      verdict: "skipped",
      reason: `CID "${cid}" does not match a known IPFS CID format. KB-F should have been published with a real CID from pnpm run ipfs:kb-f:pin.`,
    };
  } else {
    try {
      let bytes;
      let fetchMethod;
      if (gatewayList.length > 0) {
        const fetched = await fetchFromGatewayList(gatewayList, cid, args.target);
        bytes = fetched.bytes;
        fetchMethod = `gateway:${fetched.gateway};url:${fetched.url}`;
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
        hint: gatewayList.length > 0
          ? `Check that at least one gateway is reachable and the CID is pinned.`
          : `Pass --gateway https://ipfs.io (or set IPFS_GATEWAY) to verify without a local IPFS node.`,
      };
    }
  }
}

console.log(JSON.stringify(output, null, 2));
