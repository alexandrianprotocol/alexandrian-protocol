import { Contract, type Provider, type Signer, type InterfaceAbi } from "ethers";
import type { ChainAdapter } from "@alexandrian/sdk-core";

export class EthersChainAdapter implements ChainAdapter {
  constructor(public provider: Provider, public signer?: Signer) {}

  async getChainId(): Promise<string> {
    const network = await this.provider.getNetwork();
    return network.chainId.toString();
  }

  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  async getTransactionReceipt(txHash: string): Promise<{
    status: number;
    blockNumber: number;
    logs: unknown[];
  } | null> {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) return null;
    return {
      status: receipt.status ?? 0,
      blockNumber: receipt.blockNumber ?? 0,
      logs: [...(receipt.logs ?? [])] as unknown[],
    };
  }

  async callContract<T = unknown>(
    address: string,
    abi: unknown,
    method: string,
    args: unknown[]
  ): Promise<T> {
    const contract = new Contract(address, abi as InterfaceAbi, this.provider);
    const fn = (contract as Record<string, (...a: unknown[]) => Promise<unknown>>)[method];
    if (!fn) throw new Error(`Contract method not found: ${method}`);
    return (await fn(...args)) as T;
  }
}
