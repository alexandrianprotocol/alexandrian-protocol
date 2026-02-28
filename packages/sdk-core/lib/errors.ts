/**
 * Alexandrian SDK — typed error taxonomy.
 *
 * All public SDK methods return Result<T, AlexandrianError> rather than
 * throwing. Consumers can pattern-match on `error.code` without catching.
 *
 * Error codes map 1-to-1 with the contract's custom errors where applicable.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Error codes
// ─────────────────────────────────────────────────────────────────────────────

export type AlexandrianErrorCode =
  // Contract-level rejections (mirror custom errors in AlexandrianRegistryV2)
  | "ALREADY_PUBLISHED"
  | "INSUFFICIENT_STAKE"
  | "KB_NOT_REGISTERED"
  | "KB_IS_SLASHED"
  | "TOO_MANY_PARENTS"
  | "DUPLICATE_PARENT"
  | "NO_SELF_REFERENCE"
  | "PARENT_NOT_REGISTERED"
  | "SHARES_EXCEED_DISTRIBUTABLE"
  | "INCORRECT_FEE"
  | "PROTOCOL_PAUSED"
  | "IDENTITY_ALREADY_LINKED"
  | "NO_EARNINGS"
  // SDK-level validation (fails before any RPC call)
  | "INVALID_CONTENT_HASH"
  | "INVALID_ADDRESS"
  | "INVALID_CHAIN_ID"
  | "SIGNER_REQUIRED"
  | "MAX_PARENTS_EXCEEDED"
  // Transport / network
  | "NETWORK_ERROR"
  | "RPC_TIMEOUT"
  | "RECEIPT_NOT_FOUND"
  | "CHAIN_ID_MISMATCH"
  | "REGISTRY_ADDRESS_MISMATCH"
  // Resource
  | "NOT_FOUND"
  // Catch-all
  | "UNKNOWN";

// ─────────────────────────────────────────────────────────────────────────────
// Base error class
// ─────────────────────────────────────────────────────────────────────────────

export class AlexandrianError extends Error {
  readonly code: AlexandrianErrorCode;
  readonly cause: unknown;

  constructor(code: AlexandrianErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "AlexandrianError";
    this.code = code;
    this.cause = cause;
    // Maintain proper prototype chain in transpiled output
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Specialised subclasses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Contract reverted or returned an unexpected value.
 * `cause` is the raw error thrown by ethers/viem.
 */
export class ContractError extends AlexandrianError {
  constructor(code: AlexandrianErrorCode, message: string, cause?: unknown) {
    super(code, message, cause);
    this.name = "ContractError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * RPC call failed, timed out, or returned an unexpected HTTP status.
 */
export class NetworkError extends AlexandrianError {
  constructor(code: AlexandrianErrorCode, message: string, cause?: unknown) {
    super(code, message, cause);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Input failed validation before any RPC call was made.
 * Safe to surface directly to callers — no chain state was read.
 */
export class ValidationError extends AlexandrianError {
  constructor(code: AlexandrianErrorCode, message: string, cause?: unknown) {
    super(code, message, cause);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Requested KB or resource does not exist on-chain.
 */
export class NotFoundError extends AlexandrianError {
  constructor(message: string, cause?: unknown) {
    super("NOT_FOUND", message, cause);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Result<T, E> — explicit success/failure without throwing
// ─────────────────────────────────────────────────────────────────────────────

export type Ok<T> = { ok: true; value: T };
export type Err<E extends AlexandrianError = AlexandrianError> = { ok: false; error: E };
export type Result<T, E extends AlexandrianError = AlexandrianError> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E extends AlexandrianError>(error: E): Err<E> {
  return { ok: false, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for wrapping unknown thrown values
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps an unknown caught value as a typed AlexandrianError.
 * Attempts to map known contract custom error names to error codes.
 */
export function wrapError(caught: unknown): AlexandrianError {
  if (caught instanceof AlexandrianError) return caught;

  const message = caught instanceof Error ? caught.message : String(caught);

  // Map contract custom error names to SDK codes
  const CONTRACT_ERROR_MAP: Record<string, AlexandrianErrorCode> = {
    AlreadyPublished: "ALREADY_PUBLISHED",
    InsufficientStake: "INSUFFICIENT_STAKE",
    KBNotRegistered: "KB_NOT_REGISTERED",
    KBIsSlashed: "KB_IS_SLASHED",
    TooManyParents: "TOO_MANY_PARENTS",
    DuplicateParent: "DUPLICATE_PARENT",
    NoSelfReference: "NO_SELF_REFERENCE",
    ParentNotRegistered: "PARENT_NOT_REGISTERED",
    SharesExceedDistributable: "SHARES_EXCEED_DISTRIBUTABLE",
    IncorrectFee: "INCORRECT_FEE",
    ProtocolPaused: "PROTOCOL_PAUSED",
    IdentityAlreadyLinked: "IDENTITY_ALREADY_LINKED",
    NoEarnings: "NO_EARNINGS",
  };

  for (const [name, code] of Object.entries(CONTRACT_ERROR_MAP)) {
    if (message.includes(name)) {
      return new ContractError(code, message, caught);
    }
  }

  if (
    message.includes("timeout") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ECONNREFUSED")
  ) {
    return new NetworkError("NETWORK_ERROR", message, caught);
  }

  return new AlexandrianError("UNKNOWN", message, caught);
}
