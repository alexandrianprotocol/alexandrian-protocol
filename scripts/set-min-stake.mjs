/**
 * set-min-stake.mjs
 * Sets minStakeAmount on the AlexandrianRegistry (owner only).
 * Usage:
 *   node scripts/set-min-stake.mjs 0           # bootstrap mode
 *   node scripts/set-min-stake.mjs 1000000000000000  # restore 0.001 ETH
 */

import { ethers }        from "ethers";
import { createRequire } from "module";
import { resolve, dirname } from "path";
import { fileURLToPath }   from "url";

const require    = createRequire(import.meta.url);
const { config } = require("dotenv");
const __dirname  = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const REGISTRY_ADDRESS = "0xD1F216E872a9ed4b90E364825869c2F377155B29";
const ABI = ["function setMinStake(uint256 amount) external", "function minStakeAmount() external view returns (uint256)"];

async function main() {
  const newStake   = process.argv[2];
  if (newStake === undefined) {
    console.error("Usage: node scripts/set-min-stake.mjs <weiAmount>");
    console.error("  Examples:");
    console.error("    node scripts/set-min-stake.mjs 0");
    console.error("    node scripts/set-min-stake.mjs 1000000000000000");
    process.exit(1);
  }

  const privateKey = process.env.OWNER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) { console.error("OWNER_PRIVATE_KEY required"); process.exit(1); }

  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL ?? "https://mainnet.base.org");
  const signer   = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(REGISTRY_ADDRESS, ABI, signer);

  const before = await contract.minStakeAmount();
  console.log(`current minStakeAmount: ${ethers.formatEther(before)} ETH`);

  const tx = await contract.setMinStake(BigInt(newStake));
  process.stdout.write(`sending tx ${tx.hash} …`);
  await tx.wait(1);
  console.log(" confirmed");

  const after = await contract.minStakeAmount();
  console.log(`new     minStakeAmount: ${ethers.formatEther(after)} ETH`);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
