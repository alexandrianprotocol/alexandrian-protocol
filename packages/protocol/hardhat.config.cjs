require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const usingBaseMainnet = process.argv.includes("base-mainnet");
const isVerifyTask =
  process.argv.includes("verify") ||
  process.argv.includes("hardhat-verify");
if (usingBaseMainnet) {
  if (!isVerifyTask && process.env.ALLOW_MAINNET_DEPLOY !== "true") {
    throw new Error(
      "Set ALLOW_MAINNET_DEPLOY=true to deploy (or run write commands) on Base mainnet. Verification is allowed without this flag."
    );
  }
  if (!process.env.BASE_MAINNET_RPC_URL) {
    throw new Error("BASE_MAINNET_RPC_URL must be set in packages/protocol/.env for base-mainnet. No RPC fallback.");
  }
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error("DEPLOYER_PRIVATE_KEY must be set in packages/protocol/.env for base-mainnet. Empty accounts are not allowed.");
  }
  // Private key = 0x + 64 hex (66 chars). Address = 0x + 40 hex (42 chars). Catch the common mistake.
  const pk = process.env.DEPLOYER_PRIVATE_KEY.trim();
  if (pk.length === 42 && /^0x[0-9a-fA-F]{40}$/.test(pk)) {
    throw new Error(
      "DEPLOYER_PRIVATE_KEY looks like an Ethereum address (42 chars). You must use the account's private key (66 chars: 0x + 64 hex). " +
      "In MetaMask: Account menu → Account details → Export private key. In Coinbase Wallet: Settings → Security → Show private key. " +
      "Never commit or share the private key; the address is safe to share."
    );
  }
  if (pk.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    throw new Error("DEPLOYER_PRIVATE_KEY must be 66 characters (0x + 64 hex). Got length " + pk.length + ".");
  }
}

module.exports = {
  mocha: {
    exit: true,
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true"
  },

  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },

  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },

    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "",
      chainId: 84532,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },

    "base-mainnet": {
      url: process.env.BASE_MAINNET_RPC_URL || "",
      chainId: 8453,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasMultiplier: 1.1
    }
  },

  paths: {
    sources: "./contracts",
    // Hardhat globs test/**/*.{js,cjs,mjs,ts} recursively — test/v2/ is included.
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },

  etherscan: {
    apiKey: {
      "base-mainnet": process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base-mainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      }
    ]
  },

  // Sourcify — decentralised, permissionless contract verification.
  // Verified contracts appear on sourcify.dev and all Sourcify-aware block explorers.
  sourcify: {
    enabled: true,
  },

  // Typechain — generate TypeScript types from compiled ABIs.
  // Output lands in packages/sdk-adapters/src/typechain/ for consumption by the SDK.
  typechain: {
    outDir: "../sdk-adapters/src/typechain",
    target: "ethers-v6",
  },
};
