export type ProtocolInvariantInput = {
  artifactId: string;
  contentHash: string;
  address?: string;
  addresses?: string[];
  parents?: string[];
};

export function enforceProtocolInvariant(input: ProtocolInvariantInput): void {
  if (!input.artifactId || !input.contentHash) {
    throw new Error("Protocol invariant failed: missing fields");
  }
  assertHex32(input.artifactId, "artifactId");
  assertHex32(input.contentHash, "contentHash");
  if (input.address) assertAddress(input.address, "address");
  if (input.addresses) {
    assertUnique(input.addresses, "addresses");
    input.addresses.forEach((a, i) => assertAddress(a, `addresses[${i}]`));
  }
  if (input.parents) {
    assertUnique(input.parents, "parents");
    input.parents.forEach((p, i) => assertHex32(p, `parents[${i}]`));
  }
}

function assertHex32(value: string, label: string): void {
  if (!value.startsWith("0x")) {
    throw new Error(`Protocol invariant failed: ${label} must be 0x-prefixed`);
  }
  const hex = value.slice(2);
  if (hex.length !== 64) {
    throw new Error(`Protocol invariant failed: ${label} must be 32 bytes`);
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`Protocol invariant failed: ${label} must be hex`);
  }
}

function assertAddress(value: string, label: string): void {
  if (!value.startsWith("0x")) {
    throw new Error(`Protocol invariant failed: ${label} must be 0x-prefixed`);
  }
  const hex = value.slice(2);
  if (hex.length !== 40) {
    throw new Error(`Protocol invariant failed: ${label} must be 20 bytes`);
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`Protocol invariant failed: ${label} must be hex`);
  }
}

function assertUnique(values: string[], label: string): void {
  const normalized = values.map((v) => v.toLowerCase());
  const set = new Set(normalized);
  if (set.size !== normalized.length) {
    throw new Error(`Protocol invariant failed: ${label} must be unique`);
  }
}
