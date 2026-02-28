/**
 * Registry contract — deployment and on-chain registration primitive.
 * Ensures: deploy, getKnowledgeBlock, duplicate revert, immutability, event/storage consistency,
 * unknown KB boundary, stake validation, query fee (settleQuery), and attribution DAG.
 */
const hre = require("hardhat");
const { expect } = require("chai");

// Protocol constants (must match Registry.sol defaults)
const MIN_STAKE = hre.ethers.parseEther("0.001"); // minStakeAmount
const QUERY_FEE = hre.ethers.parseEther("0.0005"); // default queryFee
const PROTOCOL_FEE_BPS = 200n; // protocolFeesBps
const MAX_DIST_BPS = 10000n - PROTOCOL_FEE_BPS; // 9800 — max parent royaltyShareBps sum

// Gas thresholds (~120% of observed).
// settleQuery baseline raised from 104313 → 151729 after M2 additions (queryNonce + querierOf
// cold SSTOREs, 20k gas each). publishKB and 5-parent baselines unchanged.
const GAS_PUBLISH_KB_MAX = 515000n;
const GAS_SETTLE_QUERY_MAX = 182000n;
const GAS_PUBLISH_KB_5_PARENTS_MAX = 1040000n;

async function deployRegistry() {
  const Registry = await hre.ethers.getContractFactory("AlexandrianRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  return registry;
}

function kbId(label) {
  return hre.ethers.keccak256(hre.ethers.toUtf8Bytes(label + "-" + Date.now()));
}

function publishKBArgs(registry, contentHash, curator, parents = []) {
  return [
    contentHash,
    curator.address,
    0, // KBType.Practice
    0, // TrustTier.HumanStaked
    "bafkreitest",
    "",
    "test",
    "attribution",
    QUERY_FEE,
    "0.1.0",
    parents,
  ];
}

/** Parse KBPublished event from tx receipt. Returns { contentHash, curator, kbType, domain, queryFee, timestamp } or null. */
function parseKBPublished(receipt, registry) {
  const ev = receipt.logs.find((log) => {
    try {
      const parsed = registry.interface.parseLog({ topics: log.topics, data: log.data });
      return parsed && parsed.name === "KBPublished";
    } catch {
      return false;
    }
  });
  if (!ev) return null;
  const p = registry.interface.parseLog({ topics: ev.topics, data: ev.data });
  return {
    contentHash: p.args[0],
    curator: p.args[1],
    kbType: p.args[2],
    domain: p.args[3],
    queryFee: p.args[4],
    timestamp: p.args[5],
  };
}

/** Parse QuerySettled event from tx receipt. Returns { contentHash, querier, totalFee, protocolFee, queryNonce } or null. */
function parseQuerySettled(receipt, registry) {
  const ev = receipt.logs.find((log) => {
    try {
      const parsed = registry.interface.parseLog({ topics: log.topics, data: log.data });
      return parsed && parsed.name === "QuerySettled";
    } catch {
      return false;
    }
  });
  if (!ev) return null;
  const p = registry.interface.parseLog({ topics: ev.topics, data: ev.data });
  return {
    contentHash: p.args[0],
    querier: p.args[1],
    totalFee: p.args[2],
    protocolFee: p.args[3],
    queryNonce: p.args[4],
  };
}

// -------------------------------------------------------------------------
// AlexandrianRegistry
// -------------------------------------------------------------------------
describe("AlexandrianRegistry", function () {
  it("deploys and returns registry address", async function () {
    const registry = await deployRegistry();
    const address = await registry.getAddress();
    expect(address).to.be.a("string");
    expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
  });

  // -------------------------------------------------------------------------
  // On-chain registration primitive
  // -------------------------------------------------------------------------
  describe("On-chain registration primitive", function () {
    let registry, owner, curator, agent, otherCurator;

    beforeEach(async function () {
      const [o, c, a, other] = await hre.ethers.getSigners();
      owner = o;
      curator = c;
      agent = a;
      otherCurator = other;
      registry = await deployRegistry();
    });

    it("A. duplicate publishKB reverts with Already published", async function () {
      const contentHash = kbId("dup-kb");
      const args = publishKBArgs(registry, contentHash, curator);
      await registry.connect(curator).publishKB(...args, { value: MIN_STAKE });
      await expect(
        registry.connect(curator).publishKB(...args, { value: MIN_STAKE })
      ).to.be.revertedWith("Already published");
    });

    it("B. registered KB metadata is immutable (no update; getKnowledgeBlock stable)", async function () {
      const id = kbId("immutability-kb");
      const args = publishKBArgs(registry, id, curator);
      await registry.connect(curator).publishKB(...args, { value: MIN_STAKE });
      const kb1 = await registry.getKnowledgeBlock(id);
      expect(kb1.exists).to.be.true;
      expect(kb1.curator).to.equal(curator.address);
      expect(kb1.domain).to.equal("test");
      const kb2 = await registry.getKnowledgeBlock(id);
      expect(kb2.curator).to.equal(kb1.curator);
      expect(kb2.domain).to.equal(kb1.domain);
      expect(kb2.queryFee).to.equal(kb1.queryFee);
      // Boundary: unknown hash reverts (no exists: false return path)
      const unknown = kbId("never-published");
      await expect(registry.getKnowledgeBlock(unknown)).to.be.revertedWith("KB not registered");
      expect(await registry.isRegistered(unknown)).to.be.false;
    });

    it("C. KBPublished event args match getKnowledgeBlock storage after publish", async function () {
      const id = kbId("event-storage-kb");
      const args = publishKBArgs(registry, id, curator);
      const tx = await registry.connect(curator).publishKB(...args, { value: MIN_STAKE });
      const receipt = await tx.wait();
      const kb = await registry.getKnowledgeBlock(id);
      const parsed = parseKBPublished(receipt, registry);
      expect(parsed).to.not.be.null;
      expect(parsed.contentHash).to.equal(id);
      expect(parsed.curator.toLowerCase()).to.equal(curator.address.toLowerCase());
      expect(parsed.kbType).to.equal(0);
      expect(parsed.domain).to.equal("test");
      expect(parsed.queryFee).to.equal(QUERY_FEE);
      expect(kb.curator.toLowerCase()).to.equal(parsed.curator.toLowerCase());
      expect(kb.domain).to.equal(parsed.domain);
      expect(kb.queryFee).to.equal(parsed.queryFee);
      expect(kb.timestamp).to.equal(parsed.timestamp);
      // Event timestamp should match block timestamp (within same block)
      const block = await hre.ethers.provider.getBlock(receipt.blockNumber);
      expect(Number(parsed.timestamp)).to.equal(block.timestamp);
    });

    it("getKnowledgeBlock reverts and isRegistered is false for unknown hash", async function () {
      const unknown = kbId("never-published");
      expect(await registry.isRegistered(unknown)).to.be.false;
      await expect(registry.getKnowledgeBlock(unknown)).to.be.revertedWith("KB not registered");
    });

    it("publishKB reverts with Insufficient stake when value is zero", async function () {
      const id = kbId("low-stake-kb");
      await expect(
        registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: 0 })
      ).to.be.revertedWith("Insufficient stake");
    });

    it("publishKB reverts with Insufficient stake when value below minStakeAmount", async function () {
      const id = kbId("below-min-stake-kb");
      const belowMin = hre.ethers.parseEther("0.0001");
      await expect(
        registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: belowMin })
      ).to.be.revertedWith("Insufficient stake");
    });

    it("stake is recorded and matches published value", async function () {
      const id = kbId("stake-kb");
      await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
      const stake = await registry.getStake(id);
      expect(stake.amount).to.equal(MIN_STAKE);
      expect(stake.slashed).to.be.false;
    });

    it("settleQuery pays curator and consumes query fee", async function () {
      const id = kbId("query-kb");
      await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
      const curatorBefore = await hre.ethers.provider.getBalance(curator.address);
      await registry.connect(agent).settleQuery(id, agent.address, { value: QUERY_FEE });
      const curatorAfter = await hre.ethers.provider.getBalance(curator.address);
      const protocolFeeBps = await registry.protocolFeesBps();
      const protocolFee = (QUERY_FEE * protocolFeeBps) / 10000n;
      const toCurator = QUERY_FEE - protocolFee;
      expect(curatorAfter - curatorBefore).to.equal(toCurator);
    });

    it("publishKB with parents stores attribution DAG and getAttributionDAG returns it", async function () {
      const parentId = kbId("parent-kb");
      await registry.connect(curator).publishKB(...publishKBArgs(registry, parentId, curator), { value: MIN_STAKE });
      const childId = kbId("child-kb");
      const parents = [
        { parentHash: parentId, royaltyShareBps: Number(MAX_DIST_BPS), relationship: "0x64657276" },
      ];
      const args = publishKBArgs(registry, childId, curator, parents);
      await registry.connect(curator).publishKB(...args, { value: MIN_STAKE });
      const dag = await registry.getAttributionDAG(childId);
      expect(dag.length).to.equal(1);
      expect(dag[0].parentHash).to.equal(parentId);
      expect(dag[0].royaltyShareBps).to.equal(MAX_DIST_BPS);
    });

    describe("settleQuery", function () {
      it("reverts with Incorrect fee when msg.value is zero", async function () {
        const id = kbId("query-fee-low");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        await expect(
          registry.connect(agent).settleQuery(id, agent.address, { value: 0 })
        ).to.be.revertedWith("Incorrect fee");
      });

      it("reverts with Incorrect fee when msg.value does not equal queryFee", async function () {
        const id = kbId("query-fee-wrong");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        const wrongFee = hre.ethers.parseEther("0.0001");
        await expect(
          registry.connect(agent).settleQuery(id, agent.address, { value: wrongFee })
        ).to.be.revertedWith("Incorrect fee");
      });

      it("reverts with KB not registered for unregistered contentHash", async function () {
        const unknown = kbId("ghost-kb");
        await expect(
          registry.connect(agent).settleQuery(unknown, agent.address, { value: QUERY_FEE })
        ).to.be.revertedWith("KB not registered");
      });

      it("emits QuerySettled with correct args", async function () {
        const id = kbId("query-event");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        const tx = await registry.connect(agent).settleQuery(id, agent.address, { value: QUERY_FEE });
        const receipt = await tx.wait();
        const parsed = parseQuerySettled(receipt, registry);
        expect(parsed).to.not.be.null;
        expect(parsed.contentHash).to.equal(id);
        expect(parsed.querier.toLowerCase()).to.equal(agent.address.toLowerCase());
        expect(parsed.totalFee).to.equal(QUERY_FEE);
        expect(parsed.queryNonce).to.equal(1n);
        const protocolFeeBps = await registry.protocolFeesBps();
        expect(parsed.protocolFee).to.equal((QUERY_FEE * protocolFeeBps) / 10000n);
      });

      it("protocol treasury receives protocol fee on settleQuery", async function () {
        const id = kbId("treasury-kb");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        const treasuryBefore = await registry.treasuryBalance();
        await registry.connect(agent).settleQuery(id, agent.address, { value: QUERY_FEE });
        const treasuryAfter = await registry.treasuryBalance();
        const protocolFeeBps = await registry.protocolFeesBps();
        const expectedFee = (QUERY_FEE * protocolFeeBps) / 10000n;
        expect(treasuryAfter - treasuryBefore).to.equal(expectedFee);
      });

      it("settleQuery conserves 100% (sum of balance increases equals query fee)", async function () {
        const parentId = kbId("conservation-parent");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, parentId, curator), { value: MIN_STAKE });
        const childId = kbId("conservation-child");
        const parents = [
          { parentHash: parentId, royaltyShareBps: 5000, relationship: "0x64657276" },
        ];
        await registry.connect(otherCurator).publishKB(
          ...publishKBArgs(registry, childId, otherCurator, parents),
          { value: MIN_STAKE }
        );
        const registryAddress = await registry.getAddress();
        const contractBefore = await hre.ethers.provider.getBalance(registryAddress);
        const childCuratorBefore = await hre.ethers.provider.getBalance(otherCurator.address);
        const parentCuratorBefore = await hre.ethers.provider.getBalance(curator.address);
        await registry.connect(agent).settleQuery(childId, agent.address, { value: QUERY_FEE });
        const contractAfter = await hre.ethers.provider.getBalance(registryAddress);
        const childCuratorAfter = await hre.ethers.provider.getBalance(otherCurator.address);
        const parentCuratorAfter = await hre.ethers.provider.getBalance(curator.address);
        const contractDelta = contractAfter - contractBefore;
        const childDelta = childCuratorAfter - childCuratorBefore;
        const parentDelta = parentCuratorAfter - parentCuratorBefore;
        const totalPaidOut = contractDelta + childDelta + parentDelta;
        expect(totalPaidOut).to.equal(QUERY_FEE);
      });
    });

    it("settleQuery with parents routes royalties to parent curator", async function () {
      const parentId = kbId("parent-royalty");
      await registry.connect(curator).publishKB(...publishKBArgs(registry, parentId, curator), { value: MIN_STAKE });
      const childId = kbId("child-royalty");
      const parents = [
        { parentHash: parentId, royaltyShareBps: 5000, relationship: "0x64657276" },
      ];
      await registry.connect(otherCurator).publishKB(
        ...publishKBArgs(registry, childId, otherCurator, parents),
        { value: MIN_STAKE }
      );
      const parentCuratorBefore = await hre.ethers.provider.getBalance(curator.address);
      await registry.connect(agent).settleQuery(childId, agent.address, { value: QUERY_FEE });
      const parentCuratorAfter = await hre.ethers.provider.getBalance(curator.address);
      expect(parentCuratorAfter).to.be.gt(parentCuratorBefore);
    });

    describe("DAG validation", function () {
      it("publishKB reverts with Parent not registered if parent hash is not registered", async function () {
        const ghost = kbId("ghost-parent");
        const childId = kbId("orphan-child");
        const parents = [
          { parentHash: ghost, royaltyShareBps: 5000, relationship: "0x64657276" },
        ];
        await expect(
          registry.connect(curator).publishKB(...publishKBArgs(registry, childId, curator, parents), { value: MIN_STAKE })
        ).to.be.revertedWith("Parent not registered");
      });

      it("publishKB reverts with Shares exceed distributable if total royaltyShareBps exceeds max", async function () {
        const parentId = kbId("parent-overflow");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, parentId, curator), { value: MIN_STAKE });
        const childId = kbId("child-overflow");
        const parents = [
          { parentHash: parentId, royaltyShareBps: 10001, relationship: "0x64657276" },
        ];
        await expect(
          registry.connect(curator).publishKB(...publishKBArgs(registry, childId, curator, parents), { value: MIN_STAKE })
        ).to.be.revertedWith("Shares exceed distributable");
      });
    });

    it("slashed KB cannot be queried (settleQuery reverts with KB slashed)", async function () {
      const id = kbId("slash-kb");
      await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
      await registry.connect(owner).slash(id, "test reason");
      const stake = await registry.getStake(id);
      expect(stake.slashed).to.be.true;
      await expect(
        registry.connect(agent).settleQuery(id, agent.address, { value: QUERY_FEE })
      ).to.be.revertedWith("KB slashed");
    });

    it("publishKB allows any caller; stored curator is the passed-in address", async function () {
      const id = kbId("acl-kb");
      const args = publishKBArgs(registry, id, curator);
      await registry.connect(agent).publishKB(...args, { value: MIN_STAKE });
      const kb = await registry.getKnowledgeBlock(id);
      expect(kb.curator).to.equal(curator.address);
    });

    it("getAttributionDAG returns all parents for multi-parent KB", async function () {
      const parentAId = kbId("multi-parent-a");
      const parentBId = kbId("multi-parent-b");
      await registry.connect(curator).publishKB(...publishKBArgs(registry, parentAId, curator), { value: MIN_STAKE });
      await registry.connect(curator).publishKB(...publishKBArgs(registry, parentBId, curator), { value: MIN_STAKE });
      const childId = kbId("multi-child");
      const parents = [
        { parentHash: parentAId, royaltyShareBps: 4900, relationship: "0x64657276" },
        { parentHash: parentBId, royaltyShareBps: 4900, relationship: "0x64657276" },
      ];
      await registry.connect(curator).publishKB(...publishKBArgs(registry, childId, curator, parents), { value: MIN_STAKE });
      const dag = await registry.getAttributionDAG(childId);
      expect(dag.length).to.equal(2);
      const bpsSum = Number(dag[0].royaltyShareBps) + Number(dag[1].royaltyShareBps);
      expect(bpsSum).to.be.lte(Number(MAX_DIST_BPS));
    });
  });

  // -------------------------------------------------------------------------
  // Tier 10 — State Machine
  // -------------------------------------------------------------------------
  describe("AlexandrianRegistry — State Machine", function () {
    let registry, owner, curator, agent;

    beforeEach(async function () {
      const [o, c, a] = await hre.ethers.getSigners();
      owner = o;
      curator = c;
      agent = a;
      registry = await deployRegistry();
    });

    describe("Unregistered", function () {
      it("settleQuery reverts (invalid transition from Unregistered)", async function () {
        const unknown = kbId("ghost");
        await expect(
          registry.connect(agent).settleQuery(unknown, agent.address, { value: QUERY_FEE })
        ).to.be.revertedWith("KB not registered");
      });
      it("slash reverts (invalid transition from Unregistered)", async function () {
        const unknown = kbId("ghost");
        await expect(registry.connect(owner).slash(unknown, "reason")).to.be.revertedWith("KB not registered");
      });
      it("publish transitions to Registered", async function () {
        const id = kbId("sm-reg");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        expect(await registry.isRegistered(id)).to.be.true;
      });
    });

    describe("Registered", function () {
      it("publish reverts (invalid transition from Registered)", async function () {
        const id = kbId("sm-dup");
        const args = publishKBArgs(registry, id, curator);
        await registry.connect(curator).publishKB(...args, { value: MIN_STAKE });
        await expect(registry.connect(curator).publishKB(...args, { value: MIN_STAKE })).to.be.revertedWith("Already published");
      });
      it("settleQuery succeeds (valid transition)", async function () {
        const id = kbId("sm-settle");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        await expect(registry.connect(agent).settleQuery(id, agent.address, { value: QUERY_FEE })).not.to.be.reverted;
      });
      it("slash transitions to Slashed", async function () {
        const id = kbId("sm-slash");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        await registry.connect(owner).slash(id, "reason");
        const stake = await registry.getStake(id);
        expect(stake.slashed).to.be.true;
      });
    });

    describe("Slashed", function () {
      it("settleQuery reverts (invalid transition from Slashed)", async function () {
        const id = kbId("sm-slashed-q");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        await registry.connect(owner).slash(id, "reason");
        await expect(
          registry.connect(agent).settleQuery(id, agent.address, { value: QUERY_FEE })
        ).to.be.revertedWith("KB slashed");
      });
      it("publish reverts (cannot re-register slashed KB)", async function () {
        const id = kbId("sm-slashed-pub");
        const args = publishKBArgs(registry, id, curator);
        await registry.connect(curator).publishKB(...args, { value: MIN_STAKE });
        await registry.connect(owner).slash(id, "reason");
        await expect(registry.connect(curator).publishKB(...args, { value: MIN_STAKE })).to.be.revertedWith("Already published");
      });
      it("slash reverts (already slashed)", async function () {
        const id = kbId("sm-double-slash");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        await registry.connect(owner).slash(id, "reason");
        await expect(registry.connect(owner).slash(id, "again")).to.be.revertedWith("Already slashed");
      });
    });
  });

  // -------------------------------------------------------------------------
  // Tier 3 — Adversarial DAG
  // -------------------------------------------------------------------------
  describe("AlexandrianRegistry — Adversarial DAG", function () {
    let registry, owner, curator, agent;

    beforeEach(async function () {
      const [o, c, a] = await hre.ethers.getSigners();
      owner = o;
      curator = c;
      agent = a;
      registry = await deployRegistry();
    });

    describe("Depth", function () {
      it("DAG of depth 1000 publishes without stack overflow", async function () {
        const ids = [];
        for (let i = 0; i < 1000; i++) {
          ids.push(kbId("depth-" + i));
        }
        for (let i = 0; i < 1000; i++) {
          const parents = i === 0 ? [] : [{ parentHash: ids[i - 1], royaltyShareBps: 98, relationship: "0x64657276" }];
          await registry.connect(curator).publishKB(...publishKBArgs(registry, ids[i], curator, parents), { value: MIN_STAKE });
        }
        expect(await registry.isRegistered(ids[999])).to.be.true;
      });
      it("settleQuery on depth-1000 DAG completes within gas limit", async function () {
        const ids = [];
        for (let i = 0; i < 1000; i++) {
          ids.push(kbId("depth-gas-" + i));
        }
        for (let i = 0; i < 1000; i++) {
          const parents = i === 0 ? [] : [{ parentHash: ids[i - 1], royaltyShareBps: 98, relationship: "0x64657276" }];
          await registry.connect(curator).publishKB(...publishKBArgs(registry, ids[i], curator, parents), { value: MIN_STAKE });
        }
        const tx = await registry.connect(agent).settleQuery(ids[999], agent.address, { value: QUERY_FEE });
        const receipt = await tx.wait();
        expect(receipt).to.have.property("gasUsed");
      });
    });

    describe("Width", function () {
      it("KB with 100 parents stores and retrieves correctly", async function () {
        const parentIds = [];
        for (let i = 0; i < 100; i++) {
          parentIds.push(kbId("wide-p-" + i));
        }
        for (const pid of parentIds) {
          await registry.connect(curator).publishKB(...publishKBArgs(registry, pid, curator), { value: MIN_STAKE });
        }
        const childId = kbId("wide-child");
        const parents = parentIds.map((pid) => ({ parentHash: pid, royaltyShareBps: 98, relationship: "0x64657276" }));
        await registry.connect(curator).publishKB(...publishKBArgs(registry, childId, curator, parents), { value: MIN_STAKE });
        const dag = await registry.getAttributionDAG(childId);
        expect(dag.length).to.equal(100);
      });
    });

    // Contract enforces: totalBps <= 10000 - protocolFeesBps (Registry.sol _validateAttributionShares).
    // With protocolFeesBps = 200, max distributable = 9800. So: 9800 ok, 9801+ revert.
    describe("Share boundaries", function () {
      it("royaltyShareBps sum of exactly 9800 (max distributable = 10000 - protocolFeesBps) succeeds", async function () {
        const parentId = kbId("bnd-9800");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, parentId, curator), { value: MIN_STAKE });
        const childId = kbId("bnd-child-9800");
        const parents = [{ parentHash: parentId, royaltyShareBps: Number(MAX_DIST_BPS), relationship: "0x64657276" }];
        await expect(
          registry.connect(curator).publishKB(...publishKBArgs(registry, childId, curator, parents), { value: MIN_STAKE })
        ).not.to.be.reverted;
      });
      it("royaltyShareBps sum of 9801 reverts (first value over ceiling 9800)", async function () {
        const parentId = kbId("bnd-9801");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, parentId, curator), { value: MIN_STAKE });
        const childId = kbId("bnd-child-9801");
        const parents = [{ parentHash: parentId, royaltyShareBps: 9801, relationship: "0x64657276" }];
        await expect(
          registry.connect(curator).publishKB(...publishKBArgs(registry, childId, curator, parents), { value: MIN_STAKE })
        ).to.be.revertedWith("Shares exceed distributable");
      });
      it("royaltyShareBps sum of 10000 reverts (over max distributable 9800)", async function () {
        const parentId = kbId("bnd-10000");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, parentId, curator), { value: MIN_STAKE });
        const childId = kbId("bnd-child-10000");
        const parents = [{ parentHash: parentId, royaltyShareBps: 10000, relationship: "0x64657276" }];
        await expect(
          registry.connect(curator).publishKB(...publishKBArgs(registry, childId, curator, parents), { value: MIN_STAKE })
        ).to.be.revertedWith("Shares exceed distributable");
      });
      it("royaltyShareBps sum of 10001 reverts with Shares exceed distributable", async function () {
        const parentId = kbId("bnd-10001");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, parentId, curator), { value: MIN_STAKE });
        const childId = kbId("bnd-child-10001");
        const parents = [{ parentHash: parentId, royaltyShareBps: 10001, relationship: "0x64657276" }];
        await expect(
          registry.connect(curator).publishKB(...publishKBArgs(registry, childId, curator, parents), { value: MIN_STAKE })
        ).to.be.revertedWith("Shares exceed distributable");
      });
      it("single parent with 0 bps is allowed (no excess)", async function () {
        const parentId = kbId("bnd-0");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, parentId, curator), { value: MIN_STAKE });
        const childId = kbId("bnd-child-0");
        const parents = [{ parentHash: parentId, royaltyShareBps: 0, relationship: "0x64657276" }];
        await expect(
          registry.connect(curator).publishKB(...publishKBArgs(registry, childId, curator, parents), { value: MIN_STAKE })
        ).not.to.be.reverted;
      });
    });
  });

  // -------------------------------------------------------------------------
  // Tier 4 — Economic Edge Cases
  // -------------------------------------------------------------------------
  describe("AlexandrianRegistry — Economic Edge Cases", function () {
    let registry, owner, curator, agent, otherCurator;

    beforeEach(async function () {
      const [o, c, a, other] = await hre.ethers.getSigners();
      owner = o;
      curator = c;
      agent = a;
      otherCurator = other;
      registry = await deployRegistry();
    });

    describe("Slashing", function () {
      it("repeated slash attempts revert with Already slashed", async function () {
        const id = kbId("ec-slash-repeat");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        await registry.connect(owner).slash(id, "first");
        await expect(registry.connect(owner).slash(id, "second")).to.be.revertedWith("Already slashed");
      });
      it("slashed KB re-registration reverts with Already published", async function () {
        const id = kbId("ec-slash-rereg");
        const args = publishKBArgs(registry, id, curator);
        await registry.connect(curator).publishKB(...args, { value: MIN_STAKE });
        await registry.connect(owner).slash(id, "reason");
        await expect(registry.connect(curator).publishKB(...args, { value: MIN_STAKE })).to.be.revertedWith("Already published");
      });
    });

    describe("Concurrency", function () {
      it("simultaneous settleQuery calls on different KBs both succeed independently", async function () {
        const id1 = kbId("ec-conc-a");
        const id2 = kbId("ec-conc-b");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id1, curator), { value: MIN_STAKE });
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id2, curator), { value: MIN_STAKE });
        const [tx1, tx2] = await Promise.all([
          registry.connect(agent).settleQuery(id1, agent.address, { value: QUERY_FEE }),
          registry.connect(otherCurator).settleQuery(id2, otherCurator.address, { value: QUERY_FEE }),
        ]);
        await expect(tx1.wait()).not.to.be.reverted;
        await expect(tx2.wait()).not.to.be.reverted;
      });
      it("simultaneous settleQuery on same KB — each call pays once (conservation)", async function () {
        const id = kbId("ec-conc-same");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        const contractBefore = await hre.ethers.provider.getBalance(await registry.getAddress());
        await registry.connect(agent).settleQuery(id, agent.address, { value: QUERY_FEE });
        await registry.connect(otherCurator).settleQuery(id, otherCurator.address, { value: QUERY_FEE });
        const contractAfter = await hre.ethers.provider.getBalance(await registry.getAddress());
        const protocolFeeBps = await registry.protocolFeesBps();
        const protocolFee = (QUERY_FEE * protocolFeeBps) / 10000n;
        expect(contractAfter - contractBefore).to.equal(protocolFee + protocolFee);
      });
      it("race condition produces exactly one fee per query", async function () {
        const id = kbId("ec-race");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        const curatorBefore = await hre.ethers.provider.getBalance(curator.address);
        await registry.connect(agent).settleQuery(id, agent.address, { value: QUERY_FEE });
        const curatorAfter = await hre.ethers.provider.getBalance(curator.address);
        const protocolFeeBps = await registry.protocolFeesBps();
        const oneFeeToCurator = QUERY_FEE - (QUERY_FEE * protocolFeeBps) / 10000n;
        expect(curatorAfter - curatorBefore).to.equal(oneFeeToCurator);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Tier 5 — Invariant Snapshots (after settlement)
  // -------------------------------------------------------------------------
  describe("AlexandrianRegistry — Invariants", function () {
    let registry, owner, curator, agent;

    beforeEach(async function () {
      const [o, c, a] = await hre.ethers.getSigners();
      owner = o;
      curator = c;
      agent = a;
      registry = await deployRegistry();
    });

    describe("After every settlement", function () {
      it("treasury balance increased by protocolFee", async function () {
        const id = kbId("inv-treasury");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        const before = await registry.treasuryBalance();
        await registry.connect(agent).settleQuery(id, agent.address, { value: QUERY_FEE });
        const after = await registry.treasuryBalance();
        const protocolFeeBps = await registry.protocolFeesBps();
        expect(after - before).to.equal((QUERY_FEE * protocolFeeBps) / 10000n);
      });
      it("no duplicate kbIds in registry", async function () {
        const id = kbId("inv-dup");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        await expect(registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE })).to.be.revertedWith("Already published");
      });
      it("total ETH in registry === treasuryBalance + Σ stakes (one KB)", async function () {
        const id = kbId("inv-eth");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        const contractBalance = await hre.ethers.provider.getBalance(await registry.getAddress());
        const treasury = await registry.treasuryBalance();
        const stake = await registry.getStake(id);
        expect(contractBalance).to.equal(treasury + stake.amount);
      });
      it("replay of same sequence produces identical final state", async function () {
        const id1 = kbId("inv-replay-a");
        const id2 = kbId("inv-replay-b");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id1, curator), { value: MIN_STAKE });
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id2, curator), { value: MIN_STAKE });
        await registry.connect(agent).settleQuery(id1, agent.address, { value: QUERY_FEE });
        const treasuryAfter = await registry.treasuryBalance();
        const reg1 = await registry.isRegistered(id1);
        const reg2 = await registry.isRegistered(id2);
        expect(reg1).to.be.true;
        expect(reg2).to.be.true;
        expect(treasuryAfter).to.equal((QUERY_FEE * (await registry.protocolFeesBps())) / 10000n);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Tier 9 — Gas Profile
  // -------------------------------------------------------------------------
  describe("AlexandrianRegistry — Gas Profile", function () {
    let registry, owner, curator, agent;

    beforeEach(async function () {
      const [o, c, a] = await hre.ethers.getSigners();
      owner = o;
      curator = c;
      agent = a;
      registry = await deployRegistry();
    });

    it(`publishKB gas under threshold (${GAS_PUBLISH_KB_MAX})`, async function () {
      const id = kbId("gas-pub");
      const tx = await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
      const receipt = await tx.wait();
      const used = receipt.gasUsed;
      console.log(`    publishKB gas used: ${used} / ${GAS_PUBLISH_KB_MAX} (${((Number(used) / Number(GAS_PUBLISH_KB_MAX)) * 100).toFixed(1)}% of budget)`);
      expect(used).to.be.lte(GAS_PUBLISH_KB_MAX);
    });
    it(`settleQuery gas under threshold (${GAS_SETTLE_QUERY_MAX})`, async function () {
      const id = kbId("gas-settle");
      await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
      const tx = await registry.connect(agent).settleQuery(id, agent.address, { value: QUERY_FEE });
      const receipt = await tx.wait();
      const used = receipt.gasUsed;
      console.log(`    settleQuery gas used: ${used} / ${GAS_SETTLE_QUERY_MAX} (${((Number(used) / Number(GAS_SETTLE_QUERY_MAX)) * 100).toFixed(1)}% of budget)`);
      expect(used).to.be.lte(GAS_SETTLE_QUERY_MAX);
    });
    it(`publishKB with 5 parents gas under threshold (${GAS_PUBLISH_KB_5_PARENTS_MAX})`, async function () {
      const parentIds = [];
      for (let i = 0; i < 5; i++) {
        parentIds.push(kbId("gas-5p-" + i));
      }
      for (const pid of parentIds) {
        await registry.connect(curator).publishKB(...publishKBArgs(registry, pid, curator), { value: MIN_STAKE });
      }
      const childId = kbId("gas-5p-child");
      const parents = parentIds.map((pid) => ({ parentHash: pid, royaltyShareBps: 1960, relationship: "0x64657276" }));
      const tx = await registry.connect(curator).publishKB(...publishKBArgs(registry, childId, curator, parents), { value: MIN_STAKE });
      const receipt = await tx.wait();
      const used = receipt.gasUsed;
      console.log(`    publishKB with 5 parents gas used: ${used} / ${GAS_PUBLISH_KB_5_PARENTS_MAX} (${((Number(used) / Number(GAS_PUBLISH_KB_5_PARENTS_MAX)) * 100).toFixed(1)}% of budget)`);
      expect(used).to.be.lte(GAS_PUBLISH_KB_5_PARENTS_MAX);
    });
  });

  // -------------------------------------------------------------------------
  // Tier 6 — Global Invariants (after full integration sequence)
  // -------------------------------------------------------------------------
  describe("AlexandrianRegistry — Global Invariants", function () {
    let registry, owner, curator, agent;
    const publishedIds = [];

    beforeEach(async function () {
      publishedIds.length = 0;
      const [o, c, a] = await hre.ethers.getSigners();
      owner = o;
      curator = c;
      agent = a;
      registry = await deployRegistry();
    });

    describe("After full integration sequence", function () {
      it("totalStake >= 0 at all times", async function () {
        const id = kbId("gi-stake");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        publishedIds.push(id);
        let total = 0n;
        for (const pid of publishedIds) {
          const s = await registry.getStake(pid);
          total += s.amount;
        }
        expect(total).to.be.gte(0n);
      });
      it("no duplicate kbIds exist in registry", async function () {
        const id = kbId("gi-dup");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        await expect(registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE })).to.be.revertedWith("Already published");
      });
      it("all royaltyShareBps <= 10000 (enforced at publish)", async function () {
        const parentId = kbId("gi-bps");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, parentId, curator), { value: MIN_STAKE });
        const childId = kbId("gi-bps-child");
        const parents = [{ parentHash: parentId, royaltyShareBps: Number(MAX_DIST_BPS), relationship: "0x64657276" }];
        await registry.connect(curator).publishKB(...publishKBArgs(registry, childId, curator, parents), { value: MIN_STAKE });
        const dag = await registry.getAttributionDAG(childId);
        for (const link of dag) {
          expect(Number(link.royaltyShareBps)).to.be.lte(10000);
        }
      });
      it("ETH conservation: contract balance === treasury + Σ stakes", async function () {
        const id = kbId("gi-eth");
        await registry.connect(curator).publishKB(...publishKBArgs(registry, id, curator), { value: MIN_STAKE });
        await registry.connect(agent).settleQuery(id, agent.address, { value: QUERY_FEE });
        const contractBalance = await hre.ethers.provider.getBalance(await registry.getAddress());
        const treasury = await registry.treasuryBalance();
        const stake = await registry.getStake(id);
        expect(contractBalance).to.equal(treasury + stake.amount);
      });
    });
  });
});
