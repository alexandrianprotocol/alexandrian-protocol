/**
 * Step 5 — Agent Query + Payment (walkthrough demo).
 * Pay in ETH: deploy Registry only; curator publishes KB (stake + query fee in ETH);
 * agent pays query fee in ETH via registry.settleQuery → curator receives ETH.
 */
const hre = require("hardhat");
const { expect } = require("chai");

const STAKE = hre.ethers.parseEther("0.001");
const QUERY_FEE_ETH = hre.ethers.parseEther("0.0005");

function ethFmt(wei) {
  return hre.ethers.formatEther(wei) + " ETH";
}

describe("Agent Query + Payment", function () {
  it("Agent queries KB and pays in ETH; curator receives ETH", async function () {
    const [owner, curator, agent] = await hre.ethers.getSigners();
    const contentHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("walkthrough-demo-kb"));

    const Registry = await hre.ethers.getContractFactory("AlexandrianRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    await registry.connect(curator).publishKB(
      contentHash,
      curator.address,
      0, // KBType.Practice
      0, // TrustTier.HumanStaked
      "bafkreidemo",
      "",
      "demo",
      "attribution",
      QUERY_FEE_ETH,
      "0.1.0",
      [],
      { value: STAKE }
    );

    const kb = await registry.getKnowledgeBlock(contentHash);
    expect(kb.exists).to.be.true;
    expect(kb.curator).to.equal(curator.address);
    expect(kb.queryFee).to.equal(QUERY_FEE_ETH);

    const curatorEthBefore = await hre.ethers.provider.getBalance(curator.address);
    const agentEthBefore = await hre.ethers.provider.getBalance(agent.address);

    const tx = await registry.connect(agent).settleQuery(contentHash, agent.address, {
      value: QUERY_FEE_ETH,
    });
    const receipt = await tx.wait();
    const block = await hre.ethers.provider.getBlock(receipt.blockNumber);
    const gasCost = receipt.gasUsed * receipt.gasPrice;

    const querySettledLog = receipt.logs.find((log) => {
      try {
        const parsed = registry.interface.parseLog({ topics: log.topics, data: log.data });
        return parsed && parsed.name === "QuerySettled";
      } catch {
        return false;
      }
    });
    expect(querySettledLog).to.not.be.undefined;
    const parsed = registry.interface.parseLog({ topics: querySettledLog.topics, data: querySettledLog.data });
    expect(parsed.args[0]).to.equal(contentHash);
    expect(parsed.args[1]).to.equal(agent.address);
    expect(parsed.args[4]).to.equal(1n);

    const curatorEthAfter = await hre.ethers.provider.getBalance(curator.address);
    const agentEthAfter = await hre.ethers.provider.getBalance(agent.address);

    const protocolFeeBps = 200;
    const protocolFee = (QUERY_FEE_ETH * BigInt(protocolFeeBps)) / 10000n;
    const toCurator = QUERY_FEE_ETH - protocolFee;

    console.log("1. Registry deployed on local Hardhat (ETH for stake and query fee)");
    console.log("   Registry: ", await registry.getAddress());
    console.log("\n2. Curator published a Knowledge Block (stake in ETH)");
    console.log("   contentHash:", contentHash);
    console.log("   queryFee:  ", ethFmt(QUERY_FEE_ETH));
    console.log("\n3. Agent queried KB and paid in ETH (registry.settleQuery)");
    console.log("   Agent paid:       ", ethFmt(QUERY_FEE_ETH));
    console.log("   Curator received: ", ethFmt(toCurator));
    console.log("   Protocol fee:     ", ethFmt(protocolFee));
    console.log("   (98% curator / 2% protocol, enforced on-chain)");
    console.log("\n4. ETH balances after settlement");
    console.log("   Curator ETH: +" + ethFmt(curatorEthAfter - curatorEthBefore));
    console.log("   Agent ETH:  -" + ethFmt(agentEthBefore - agentEthAfter) + " (incl. gas)");
    const date = new Date(Number(block.timestamp) * 1000).toISOString();
    console.log("\n5. Settlement on-chain (provenance)");
    console.log("   block " + receipt.blockNumber + "  " + date);

    expect(curatorEthAfter - curatorEthBefore).to.equal(toCurator);
    expect(agentEthBefore - agentEthAfter).to.equal(QUERY_FEE_ETH + gasCost);
  });
});
