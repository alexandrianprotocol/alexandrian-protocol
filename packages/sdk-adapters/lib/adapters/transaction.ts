import type { Signer } from "ethers";
import type { TransactionAdapter } from "@alexandrian/sdk-core";

export class EthersTransactionAdapter implements TransactionAdapter {
  constructor(private readonly signer: Signer) {}

  async sendTransaction(request: { to: string; data: string; value?: bigint }): Promise<{
    txHash: string;
    receipt: {
      status: number;
      blockNumber: number;
    };
  }> {
    const tx = await this.signer.sendTransaction(request);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error(`Transaction failed: ${tx.hash}`);
    }
    return {
      txHash: tx.hash,
      receipt: {
        status: receipt.status ?? 0,
        blockNumber: receipt.blockNumber ?? 0,
      },
    };
  }
}
