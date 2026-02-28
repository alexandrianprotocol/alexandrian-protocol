/**
 * V2 registry — minimal canonical suite.
 *
 * Covers: publish, settle, withdrawEarnings (pull payments), royalty DAG, slashing.
 * AlexandrianRegistryV2 is the canonical mainnet registry (DESIGN-CHOICES.md).
 *
 * Uses revertedWithCustomError() — V2 uses custom errors, not require() strings.
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const CONTENT_HASH_A = ethers.keccak256(ethers.toUtf8Bytes("kb-v2-a"));
const CONTENT_HASH_CHILD = ethers.keccak256(ethers.toUtf8Bytes("kb-v2-child"));
const QUERY_FEE = ethers.parseEther("0.001");
const MIN_STAKE = ethers.parseEther("0.001");
const ROYALTY_BPS = 1000; // 10% to parent
const RELATIONSHIP = "0x00000000"; // bytes4

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randWei(rng: () => number, min: bigint, max: bigint) {
  const span = max - min + 1n;
  const r = BigInt(Math.floor(rng() * 1_000_000_000));
  return min + (r % span);
}

async function deployV2() {
  const Factory = await ethers.getContractFactory("AlexandrianRegistryV2");
  const registry = await Factory.deploy();
  await registry.waitForDeployment();
  return registry;
}

async function publishKB(
  registry: any,
  signer: SignerWithAddress,
  contentHash: string,
  queryFee: bigint = QUERY_FEE,
  parents: { parentHash: string; royaltyShareBps: number; relationship: string }[] = []
) {
  return registry.connect(signer).publishKB(
    contentHash,
    signer.address,
    0, // KBType.Practice
    0, // TrustTier.HumanStaked
    "ipfs://cid",
    "",
    "cybersecurity",
    "MIT",
    queryFee,
    "1.0.0",
    parents.map((p) => ({
      parentHash: p.parentHash,
      royaltyShareBps: p.royaltyShareBps,
      relationship: p.relationship,
    })),
    { value: MIN_STAKE }
  );
}

describe("V2 — canonical registry", () => {
  let registry: any;
  let owner: SignerWithAddress;
  let curator: SignerWithAddress;
  let querier: SignerWithAddress;
  let parentCurator: SignerWithAddress;
  let extraSigners: SignerWithAddress[];

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    [owner, curator, querier, parentCurator] = signers;
    extraSigners = signers.slice(4);
    registry = await deployV2();
  });

  describe("publish", () => {
    it("publishes KB and exposes getKnowledgeBlock", async () => {
      await publishKB(registry, curator, CONTENT_HASH_A);
      const kb = await registry.getKnowledgeBlock(CONTENT_HASH_A);
      expect(kb.exists).to.equal(true);
      expect(kb.curator).to.equal(curator.address);
      expect(kb.domain).to.equal("cybersecurity");
      expect(kb.queryFee).to.equal(QUERY_FEE);
    });

    it("enforces MAX_PARENTS (8)", async () => {
      const manyParents = Array.from({ length: 9 }, (_, i) => ({
        parentHash: ethers.keccak256(ethers.toUtf8Bytes(`parent-${i}`)),
        royaltyShareBps: 100,
        relationship: "0x00000000",
      }));
      await expect(
        registry.connect(curator).publishKB(
          CONTENT_HASH_A,
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
          { value: MIN_STAKE }
        )
      ).to.be.revertedWithCustomError(registry, "TooManyParents");
    });

    it("rejects duplicate parents", async () => {
      await publishKB(registry, parentCurator, CONTENT_HASH_A);
      const dupParents = [
        { parentHash: CONTENT_HASH_A, royaltyShareBps: 500, relationship: RELATIONSHIP },
        { parentHash: CONTENT_HASH_A, royaltyShareBps: 500, relationship: RELATIONSHIP },
      ];
      await expect(
        publishKB(registry, curator, CONTENT_HASH_CHILD, QUERY_FEE, dupParents)
      ).to.be.revertedWithCustomError(registry, "DuplicateParent");
    });

    it("allows parent shares to total 10000 bps", async () => {
      await publishKB(registry, parentCurator, CONTENT_HASH_A);
      await expect(
        publishKB(registry, curator, CONTENT_HASH_CHILD, QUERY_FEE, [
          { parentHash: CONTENT_HASH_A, royaltyShareBps: 10000, relationship: RELATIONSHIP },
        ])
      ).to.not.be.reverted;
    });
  });

  describe("settle", () => {
    beforeEach(async () => {
      await publishKB(registry, curator, CONTENT_HASH_A);
    });

    it("settles query and accrues to pendingWithdrawals (no push)", async () => {
      const before = await registry.pendingWithdrawals(curator.address);
      expect(before).to.equal(0n);

      await registry.connect(querier).settleQuery(CONTENT_HASH_A, querier.address, { value: QUERY_FEE });

      const after_ = await registry.pendingWithdrawals(curator.address);
      expect(after_).to.be.gt(0n);
      const protocolBps = await registry.protocolFeesBps();
      const expectedCurator = (QUERY_FEE * (10000n - protocolBps)) / 10000n;
      expect(after_).to.equal(expectedCurator);
    });
  });

  describe("withdrawEarnings", () => {
    beforeEach(async () => {
      await publishKB(registry, curator, CONTENT_HASH_A);
      await registry.connect(querier).settleQuery(CONTENT_HASH_A, querier.address, { value: QUERY_FEE });
    });

    it("curator can withdraw accrued earnings and emits EarningsWithdrawn", async () => {
      const pending = await registry.pendingWithdrawals(curator.address);
      expect(pending).to.be.gt(0n);

      const balBefore = await ethers.provider.getBalance(curator.address);
      const tx = await registry.connect(curator).withdrawEarnings();
      const receipt = await tx.wait();
      const balAfter = await ethers.provider.getBalance(curator.address);

      expect(await registry.pendingWithdrawals(curator.address)).to.equal(0n);
      expect(balAfter).to.equal(balBefore + pending - (receipt!.gasUsed * receipt!.gasPrice));

      const ev = receipt!.logs.find((log: any) => {
        try {
          const parsed = registry.interface.parseLog({ topics: log.topics, data: log.data });
          return parsed && parsed.name === "EarningsWithdrawn";
        } catch {
          return false;
        }
      });
      expect(ev).to.not.be.undefined;
      const parsed = registry.interface.parseLog({ topics: ev!.topics, data: ev!.data });
      expect(parsed.args.recipient).to.equal(curator.address);
      expect(parsed.args.amount).to.equal(pending);
    });

    it("reverts with NoEarnings when nothing to withdraw", async () => {
      await registry.connect(curator).withdrawEarnings();
      await expect(
        registry.connect(curator).withdrawEarnings()
      ).to.be.revertedWithCustomError(registry, "NoEarnings");
    });
  });

  describe("royalty DAG", () => {
    it("parent curator receives royalty in pendingWithdrawals when child is queried", async () => {
      await publishKB(registry, parentCurator, CONTENT_HASH_A);
      await publishKB(registry, curator, CONTENT_HASH_CHILD, QUERY_FEE, [
        { parentHash: CONTENT_HASH_A, royaltyShareBps: ROYALTY_BPS, relationship: RELATIONSHIP },
      ]);

      await registry.connect(querier).settleQuery(CONTENT_HASH_CHILD, querier.address, { value: QUERY_FEE });

      const parentPending = await registry.pendingWithdrawals(parentCurator.address);
      const childPending = await registry.pendingWithdrawals(curator.address);
      expect(parentPending).to.be.gt(0n);
      expect(childPending).to.be.gt(0n);
      const protocolBps = await registry.protocolFeesBps();
      const afterProtocol = (QUERY_FEE * (10000n - protocolBps)) / 10000n;
      const expectedParent = (afterProtocol * BigInt(ROYALTY_BPS)) / 10000n;
      expect(parentPending).to.equal(expectedParent);
    });
  });

  describe("share split", () => {
    it("does not underflow when protocol fee changes after publish", async () => {
      await publishKB(registry, parentCurator, CONTENT_HASH_A);
      await publishKB(registry, curator, CONTENT_HASH_CHILD, QUERY_FEE, [
        { parentHash: CONTENT_HASH_A, royaltyShareBps: 10000, relationship: RELATIONSHIP },
      ]);
      await registry.connect(owner).setProtocolFee(1000); // 10%
      const split = await registry.getShareSplit(CONTENT_HASH_CHILD);
      expect(split.curatorBps).to.equal(0);
      expect(split.parentBps).to.equal(10000);
    });
  });

  describe("high-frequency settlement", () => {
    it("100 settlements on the same KB accrue exactly 100x (no overflow, no loss)", async () => {
      await publishKB(registry, curator, CONTENT_HASH_A);

      const protocolBps = await registry.protocolFeesBps();
      const perSettlement = (QUERY_FEE * (10000n - protocolBps)) / 10000n;
      const expectedTotal = perSettlement * 100n;

      for (let i = 0; i < 100; i++) {
        const signer = extraSigners[i % extraSigners.length] ?? querier;
        await registry.connect(signer).settleQuery(CONTENT_HASH_A, signer.address, { value: QUERY_FEE });
      }

      const pending = await registry.pendingWithdrawals(curator.address);
      expect(pending).to.equal(expectedTotal);
    });
  });

  describe("protocol fee elasticity", () => {
    const feeLevels = [0, 50, 100, 200]; // bps

    for (const bps of feeLevels) {
      it(`conserves value at ${bps} bps`, async () => {
        registry = await deployV2();
        await registry.connect(owner).setProtocolFee(bps);
        await publishKB(registry, curator, CONTENT_HASH_A);

        const treasuryBefore = await registry.treasuryBalance();
        await registry.connect(querier).settleQuery(CONTENT_HASH_A, querier.address, { value: QUERY_FEE });
        const treasuryAfter = await registry.treasuryBalance();

        const expectedProtocol = (QUERY_FEE * BigInt(bps)) / 10000n;
        const expectedCurator = QUERY_FEE - expectedProtocol;

        const pending = await registry.pendingWithdrawals(curator.address);
        expect(pending).to.equal(expectedCurator);
        expect(treasuryAfter - treasuryBefore).to.equal(expectedProtocol);
      });
    }
  });

  describe("property stress — randomized fees, bps, deep DAG", () => {
    it("conserves value for randomized settlement amounts and royalty splits", async () => {
      const rng = mulberry32(1337);
      const feeLevels = [0, 50, 100, 200];

      for (let i = 0; i < 20; i++) {
        registry = await deployV2();
        const bps = feeLevels[i % feeLevels.length];
        await registry.connect(owner).setProtocolFee(bps);

        const queryFee = randWei(
          rng,
          ethers.parseEther("0.0001"),
          ethers.parseEther("0.005")
        );

        const depth = 6;
        const ids: string[] = [];
        const curators: SignerWithAddress[] = [];
        for (let d = 0; d < depth; d++) {
          const id = ethers.keccak256(
            ethers.toUtf8Bytes(`kb-fuzz-${i}-${d}`)
          );
          ids.push(id);
          curators.push([curator, parentCurator, querier, owner][d % 4]);
        }

        for (let d = 0; d < depth; d++) {
          const parents =
            d === 0
              ? []
              : [
                  {
                    parentHash: ids[d - 1],
                    royaltyShareBps: randInt(rng, 100, 2000),
                    relationship: RELATIONSHIP,
                  },
                ];
          const fee = d === depth - 1 ? queryFee : QUERY_FEE;
          await publishKB(
            registry,
            curators[d],
            ids[d],
            fee,
            parents
          );
        }

        const uniqueCurators = Array.from(new Set(curators.map((c) => c.address)));
        const pendingBefore = new Map<string, bigint>();
        for (const addr of uniqueCurators) {
          pendingBefore.set(addr, await registry.pendingWithdrawals(addr));
        }
        const treasuryBefore = await registry.treasuryBalance();

        await registry
          .connect(extraSigners[i % extraSigners.length] ?? querier)
          .settleQuery(ids[depth - 1], querier.address, { value: queryFee });

        const treasuryAfter = await registry.treasuryBalance();
        let pendingDelta = 0n;
        for (const addr of uniqueCurators) {
          const after = await registry.pendingWithdrawals(addr);
          const before = pendingBefore.get(addr) ?? 0n;
          pendingDelta += after - before;
        }

        const treasuryDelta = treasuryAfter - treasuryBefore;
        expect(treasuryDelta + pendingDelta).to.equal(queryFee);
      }
    });

    it("deep DAG settlement propagates and conserves exactly", async () => {
      const rng = mulberry32(4242);
      await registry.connect(owner).setProtocolFee(100); // 1%

      const depth = 10;
      const ids: string[] = [];
      const curators: SignerWithAddress[] = [];
      for (let d = 0; d < depth; d++) {
        ids.push(ethers.keccak256(ethers.toUtf8Bytes(`kb-deep-${d}`)));
        curators.push([curator, parentCurator, querier, owner][d % 4]);
      }

      for (let d = 0; d < depth; d++) {
        const parents =
          d === 0
            ? []
            : [
                {
                  parentHash: ids[d - 1],
                  royaltyShareBps: randInt(rng, 200, 1500),
                  relationship: RELATIONSHIP,
                },
              ];
        await publishKB(registry, curators[d], ids[d], QUERY_FEE, parents);
      }

      const uniqueCurators = Array.from(new Set(curators.map((c) => c.address)));
      const pendingBefore = new Map<string, bigint>();
      for (const addr of uniqueCurators) {
        pendingBefore.set(addr, await registry.pendingWithdrawals(addr));
      }
      const treasuryBefore = await registry.treasuryBalance();

      await registry
        .connect(extraSigners[0] ?? querier)
        .settleQuery(ids[depth - 1], querier.address, { value: QUERY_FEE });

      const treasuryAfter = await registry.treasuryBalance();
      let pendingDelta = 0n;
      let nonZeroRecipients = 0;
      for (const addr of uniqueCurators) {
        const after = await registry.pendingWithdrawals(addr);
        const before = pendingBefore.get(addr) ?? 0n;
        const delta = after - before;
        pendingDelta += delta;
        if (delta > 0n) nonZeroRecipients++;
      }

      const treasuryDelta = treasuryAfter - treasuryBefore;
      expect(treasuryDelta + pendingDelta).to.equal(QUERY_FEE);
      expect(nonZeroRecipients).to.be.gte(2);
    });
  });

  describe("slashing", () => {
    beforeEach(async () => {
      await publishKB(registry, curator, CONTENT_HASH_A);
    });

    it("owner can slash and stake is marked slashed", async () => {
      await registry.connect(owner).slash(CONTENT_HASH_A, "test reason");
      const stake = await registry.getStake(CONTENT_HASH_A);
      expect(stake.slashed).to.equal(true);
    });
  });

  describe("pause / unpause", () => {
    beforeEach(async () => {
      await publishKB(registry, curator, CONTENT_HASH_A);
    });

    it("pause blocks publish and settle; unpause restores", async () => {
      await registry.connect(owner).pause();

      await expect(
        publishKB(registry, curator, ethers.keccak256(ethers.toUtf8Bytes("kb-paused")))
      ).to.be.revertedWithCustomError(registry, "ProtocolPaused");

      await expect(
        registry.connect(querier).settleQuery(CONTENT_HASH_A, querier.address, { value: QUERY_FEE })
      ).to.be.revertedWithCustomError(registry, "ProtocolPaused");

      await registry.connect(owner).unpause();
      await expect(
        registry.connect(querier).settleQuery(CONTENT_HASH_A, querier.address, { value: QUERY_FEE })
      ).to.not.be.reverted;
    });
  });

  describe("free settlement reputation", () => {
    it("free settleQuery increments queryVolume and score", async () => {
      const ZERO_FEE = 0n;
      await publishKB(registry, curator, CONTENT_HASH_A, ZERO_FEE);

      const before = await registry.reputation(CONTENT_HASH_A);
      await registry.connect(querier).settleQuery(CONTENT_HASH_A, querier.address, { value: ZERO_FEE });
      const after_ = await registry.reputation(CONTENT_HASH_A);

      expect(after_.queryVolume).to.equal(before.queryVolume + 1n);
      expect(after_.score).to.be.gte(before.score);
      const pending = await registry.pendingWithdrawals(curator.address);
      expect(pending).to.equal(0n);
    });
  });
});
