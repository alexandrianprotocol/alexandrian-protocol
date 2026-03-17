const { expect } = require("chai");
const hre = require("hardhat");

const QUERY_FEE = hre.ethers.parseEther("0.001");
const MIN_STAKE = hre.ethers.parseEther("0.001");
const RELATIONSHIP = "0x00000000";
const ARTIFACT_HASH_ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function deployV2() {
  const Factory = await hre.ethers.getContractFactory("AlexandrianRegistryV2");
  const registry = await Factory.deploy();
  await registry.waitForDeployment();
  return registry;
}

async function publishKB(registry, signer, contentHash, queryFee = QUERY_FEE, parents = []) {
  const isSeed = parents.length === 0;
  const minimumRequiredParents = isSeed ? 0 : 2;
  return registry.connect(signer).publishKB(
    contentHash,
    signer.address,
    0,
    0,
    "ipfs://cid",
    "",
    "cybersecurity",
    "MIT",
    queryFee,
    "1.0.0",
    parents,
    isSeed,
    minimumRequiredParents,
    ARTIFACT_HASH_ZERO,
    { value: MIN_STAKE }
  );
}

describe("V2 registry canonical", function () {
  let registry;
  let owner;
  let curator;
  let querier;
  let parentCurator;

  beforeEach(async function () {
    [owner, curator, querier, parentCurator] = await hre.ethers.getSigners();
    registry = await deployV2();
  });

  it("publishes KB and reads it back", async function () {
    const contentHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("kb-v2-a"));
    await publishKB(registry, curator, contentHash);
    const kb = await registry.getKnowledgeBlock(contentHash);
    expect(kb.exists).to.equal(true);
    expect(kb.curator).to.equal(curator.address);
    expect(kb.queryFee).to.equal(QUERY_FEE);
  });

  it("enforces max parents (8)", async function () {
    const contentHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("kb-v2-max-parents"));
    const manyParents = Array.from({ length: 9 }, (_, i) => ({
      parentHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`p-${i}`)),
      royaltyShareBps: 100,
      relationship: RELATIONSHIP,
    }));
    await expect(
      registry.connect(curator).publishKB(
        contentHash,
        curator.address,
        0,
        0,
        "ipfs://x",
        "",
        "test",
        "MIT",
        QUERY_FEE,
        "1.0.0",
        manyParents,
        false,
        2,
        ARTIFACT_HASH_ZERO,
        { value: MIN_STAKE }
      )
    ).to.be.revertedWithCustomError(registry, "TooManyParents");
  });

  it("accrues settlement to pendingWithdrawals and treasury", async function () {
    const contentHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("kb-v2-settle"));
    await publishKB(registry, curator, contentHash);

    const beforePending = await registry.pendingWithdrawals(curator.address);
    const beforeTreasury = await registry.treasuryBalance();

    await registry.connect(querier).settleQuery(contentHash, querier.address, { value: QUERY_FEE });

    const afterPending = await registry.pendingWithdrawals(curator.address);
    const afterTreasury = await registry.treasuryBalance();
    const protocolBps = await registry.protocolFeesBps();
    const expectedProtocol = (QUERY_FEE * protocolBps) / 10000n;
    const expectedCurator = QUERY_FEE - expectedProtocol;

    expect(afterPending - beforePending).to.equal(expectedCurator);
    expect(afterTreasury - beforeTreasury).to.equal(expectedProtocol);
  });

  it("withdraws earnings via pull payment", async function () {
    const contentHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("kb-v2-withdraw"));
    await publishKB(registry, curator, contentHash);
    await registry.connect(querier).settleQuery(contentHash, querier.address, { value: QUERY_FEE });

    const pending = await registry.pendingWithdrawals(curator.address);
    expect(pending).to.be.gt(0n);

    await registry.connect(curator).withdrawEarnings();
    expect(await registry.pendingWithdrawals(curator.address)).to.equal(0n);
  });

  it("routes parent royalty via DAG to parent pending balance", async function () {
    const parentHashA = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("kb-parent-a"));
    const parentHashB = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("kb-parent-b"));
    const childHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("kb-child"));
    await publishKB(registry, parentCurator, parentHashA);
    await publishKB(registry, parentCurator, parentHashB);

    await publishKB(registry, curator, childHash, QUERY_FEE, [
      { parentHash: parentHashA, royaltyShareBps: 1000, relationship: RELATIONSHIP },
      { parentHash: parentHashB, royaltyShareBps: 0, relationship: RELATIONSHIP },
    ]);

    await registry.connect(querier).settleQuery(childHash, querier.address, { value: QUERY_FEE });
    expect(await registry.pendingWithdrawals(parentCurator.address)).to.be.gt(0n);
    expect(await registry.pendingWithdrawals(curator.address)).to.be.gt(0n);
  });
});

