import { createHash } from "crypto";

export type ContentPointer = {
  content: unknown;
  uri?: string;
  mime?: string;
};

export type Receipt = {
  txHash: string;
  blockHeight: number;
  timestamp: number;
  chainId: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && value !== null && (value as Record<string, unknown>).constructor === Object;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    const entries = keys.map((k) => `"${k}":${stableStringify(value[k])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function canonicalizeContent(content: unknown): string {
  return stableStringify(content);
}

export function hashContent(content: unknown): string {
  const canonical = canonicalizeContent(content);
  const digest = createHash("sha256").update(canonical).digest("hex");
  return `0x${digest}`;
}

export function hashText(text: string): string {
  const digest = createHash("sha256").update(text).digest("hex");
  return `0x${digest}`;
}
