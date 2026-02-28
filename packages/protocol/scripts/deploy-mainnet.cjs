require("dotenv").config();
const hre = require("hardhat");

// Mainnet guard: hardhat.config.cjs requires ALLOW_MAINNET_DEPLOY=true for --network base-mainnet.

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const feeData = await hre.ethers.provider.getFeeData();

  console.log("====================================================");
  console.log("  Alexandrian Protocol — Registry V2 Deployment");
  console.log("====================================================");
  console.log(`  Network:        ${hre.network.name}`);
  console.log(`  Chain ID:       ${network.chainId}`);
  console.log(`  Deployer:       ${deployer.address}`);
  console.log(`  Balance:        ${hre.ethers.formatEther(balance)} ETH`);
  console.log(
    `  Gas Price:      ${
      feeData.gasPrice
        ? hre.ethers.formatUnits(feeData.gasPrice, "gwei") + " gwei"
        : "EIP-1559"
    }`
  );
  console.log("----------------------------------------------------");

  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.warn("WARNING: Deploying to a local network.");
  }

  console.log("Deploying AlexandrianRegistryV2...\n");

  const Registry = await hre.ethers.getContractFactory("AlexandrianRegistryV2");
  const registry = await Registry.deploy();

  console.log("Waiting for confirmation...");
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const deploymentTx = registry.deploymentTransaction();
  const receipt = await deploymentTx.wait();

  const runtimeBytecode = await hre.ethers.provider.getCode(address);
  const bytecodeHash = hre.ethers.keccak256(runtimeBytecode);

  console.log("\n====================================================");
  console.log("  Deployment Complete");
  console.log("====================================================");
  console.log(`  Contract:       ${address}`);
  console.log(`  Tx Hash:        ${receipt.hash}`);
  console.log(`  Block Number:   ${receipt.blockNumber}`);
  console.log(`  Gas Used:       ${receipt.gasUsed.toString()}`);
  console.log("====================================================");

  console.log("\n----------------------------------------------------");
  console.log("  Post-Deploy Integrity (trust narrative)");
  console.log("----------------------------------------------------");
  console.log(`  Contract Address:  ${address}`);
  console.log(`  Deployment Tx:    ${receipt.hash}`);
  console.log(`  Chain ID:         ${Number(network.chainId)}`);
  console.log(`  Block Number:     ${receipt.blockNumber}`);
  console.log(`  Bytecode Hash:    ${bytecodeHash}`);
  console.log("----------------------------------------------------");

  console.log("\nSave these values:");
  console.log(`REGISTRY_ADDRESS=${address}`);
  console.log(`REGISTRY_V2_ADDRESS=${address}`);
  console.log(`DEPLOY_TX=${receipt.hash}`);
  console.log(`DEPLOY_BLOCK=${receipt.blockNumber}`);
}

main().catch((err) => {
  console.error("\nDeployment failed:");
  console.error(err);
  process.exit(1);
});
