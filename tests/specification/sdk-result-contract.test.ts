import { describe, expect, it } from "vitest";
import { JsonRpcProvider } from "ethers";
import { AlexandrianSDK } from "../../packages/sdk-adapters/client/AlexandrianSDK.js";
import { AlexandrianClient } from "../../packages/sdk-adapters/client/AlexandrianClient.js";
import { AccessClient } from "../../packages/sdk-adapters/client/AccessClient.js";
import { DatasetClient } from "../../packages/sdk-adapters/client/DatasetClient.js";
import { RoyaltyClient } from "../../packages/sdk-adapters/client/RoyaltyClient.js";
import { ProofAdapterStub, HeadSourceStub } from "../../packages/sdk-adapters/lib/adapters/index.js";

describe("Result API contract", () => {
  it("lightweight clients expose success Result wrappers", () => {
    const root = "https://example.org";
    const a = new AlexandrianClient(root).pingResult();
    const b = new AccessClient(root).checkResult("alice");
    const c = new DatasetClient(root).listResult();
    const d = new RoyaltyClient(root).listResult();

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(c.ok).toBe(true);
    expect(d.ok).toBe(true);

    if (a.ok) expect(a.value).toBe(`ok:${root}`);
    if (b.ok) expect(b.value).toBe(`${root}:alice`);
    if (c.ok) expect(c.value).toEqual([root]);
    if (d.ok) expect(d.value).toEqual([root]);
  });

  it("sdk Result wrappers map signer-required failures to typed errors", async () => {
    const provider = new JsonRpcProvider("http://127.0.0.1:8545");
    const sdk = new AlexandrianSDK({
      chainAdapter: {
        provider,
        signer: undefined,
        getChainId: async () => "8453",
        getBlockNumber: async () => 0,
        getTransactionReceipt: async () => null,
        callContract: async () => {
          throw new Error("not implemented");
        },
      },
      proofAdapter: new ProofAdapterStub(),
      headSource: new HeadSourceStub(),
      txAdapter: {
        sendTransaction: async () => ({
          txHash: "0x" + "00".repeat(32),
          receipt: { status: 1, blockNumber: 1 },
        }),
      },
      registryAddress: "0x0000000000000000000000000000000000000001",
    });

    const addStake = await sdk.addStakeResult("0x" + "11".repeat(32), 1n);
    const settle = await sdk.settleCitationResult("0x" + "22".repeat(32), "0x0000000000000000000000000000000000000002");
    const withdraw = await sdk.withdrawEarningsResult();

    expect(addStake.ok).toBe(false);
    expect(settle.ok).toBe(false);
    expect(withdraw.ok).toBe(false);

    if (!addStake.ok) expect(addStake.error.code).toBe("SIGNER_REQUIRED");
    if (!settle.ok) expect(settle.error.code).toBe("SIGNER_REQUIRED");
    if (!withdraw.ok) expect(withdraw.error.code).toBe("SIGNER_REQUIRED");
  });

  it("sdk Result wrappers map address validation failures to typed errors", async () => {
    const provider = new JsonRpcProvider("http://127.0.0.1:8545");
    const sdk = new AlexandrianSDK({
      chainAdapter: {
        provider,
        signer: undefined,
        getChainId: async () => "8453",
        getBlockNumber: async () => 0,
        getTransactionReceipt: async () => null,
        callContract: async () => {
          throw new Error("not implemented");
        },
      },
      proofAdapter: new ProofAdapterStub(),
      headSource: new HeadSourceStub(),
      txAdapter: {
        sendTransaction: async () => ({
          txHash: "0x" + "00".repeat(32),
          receipt: { status: 1, blockNumber: 1 },
        }),
      },
      registryAddress: "0x0000000000000000000000000000000000000001",
    });

    const pending = await sdk.getPendingEarningsResult();
    expect(pending.ok).toBe(false);
    if (!pending.ok) expect(pending.error.code).toBe("INVALID_ADDRESS");
  });
});
