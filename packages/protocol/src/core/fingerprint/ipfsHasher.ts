import { CID } from 'multiformats';
import * as sha256 from 'multiformats/hashes/sha2';

export class IpfsHasher {
  /**
   * Generate a deterministic CID from content
   * Same input = Same CID (critical for identity)
   */
  static async fromBuffer(content: Buffer): Promise<string> {
    // Create IPFS CID v1
    const multihash = await sha256.sha256.digest(content);
    const cid = CID.createV1(0x55, multihash); // 0x55 = raw binary

    return cid.toString();
  }

  /**
   * Generate CID from string content
   */
  static async fromString(content: string): Promise<string> {
    return this.fromBuffer(Buffer.from(content, 'utf-8'));
  }

  /**
   * Verify content matches a claimed CID
   */
  static async verify(content: Buffer, claimedCid: string): Promise<boolean> {
    try {
      const actualCid = await this.fromBuffer(content);
      return actualCid === claimedCid;
    } catch {
      return false;
    }
  }

  /**
   * Generate a Merkle root from multiple CIDs
   */
  static async merkleRoot(cids: string[]): Promise<string> {
    const sorted = [...cids].sort();
    const combined = sorted.join('');
    return this.fromString(combined);
  }
}
