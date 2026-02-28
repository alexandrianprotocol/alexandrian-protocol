# ADR-0002 — keccak256 for kbHash Derivation

```yaml
document:
  id: ADR-0002
  version: 1.0.0
  owner: protocol-team
  status: accepted
  classification: internal
  last_reviewed: "2026-02-25"
  schema_version: "1.0"
  depends_on:
    - ADR-0001
    - PROTO-001
```

---

## Status

**Accepted** — 2025-01-01 *(decision pre-dates formal ADR registry; retroactively documented)*

---

## Context

The Alexandrian Protocol requires a **content hash** (`kbHash`, on-chain field name `contentHash`) for every Knowledge Block. This hash serves as:

1. **The canonical `kbId`** — the globally unique, on-chain identity of the KB (`kbId = kbHash`).
2. **The on-chain registration key** — the smart contract registers and looks up KBs by `contentHash` (field name; value is kbHash).
3. **The subgraph index key** — The Graph indexes `KnowledgeBlockPublished` events by `contentHash` (lowercased; value is kbHash).
4. **The integrity anchor** — anyone with the envelope can recompute the hash and verify authenticity.

Once a KB is registered on-chain, its `kbHash` is permanent. The choice of hashing algorithm is therefore a **hard, irreversible decision** — changing it later would require a new contract, a migration strategy, and would sever the identity link for all existing KBs.

The canonical byte preimage is already determined by [ADR-0001](0001-jcs-canonicalization.md) (JCS/RFC 8785). This ADR decides what hash function is applied to those bytes.

---

## Decision

> **Normative:** The `kbHash` of a Knowledge Block MUST be computed as:
>
> ```
> kbHash = keccak256("KB_V1" || JCS(envelope))
> ```
>
> where `JCS(envelope)` is the JCS-canonical UTF-8 byte sequence defined in [ADR-0001](0001-jcs-canonicalization.md), and `keccak256` is the Keccak-256 hash function (as used in Ethereum/EVM, equivalent to SHA-3 with different padding — FIPS 202 SHA-3 is NOT the same).

> **Normative:** The `kbHash` is represented as a 32-byte value (`bytes32` in Solidity; hex string with `0x` prefix in TypeScript/JSON).

> **Normative:** The smart contract stores and emits `contentHash` exactly as produced by the off-chain computation. The contract does NOT recompute `kbHash` from envelope data — it trusts the submitted value and registers it. Integrity verification is the responsibility of off-chain tooling and the conformance suite.

The implementation lives in:
- Off-chain: `packages/protocol/src/canonical/canonicalize.ts` (uses `@noble/hashes` or equivalent)
- On-chain: `packages/protocol/contracts/AlexandrianRegistry.sol` (accepts `bytes32 contentHash` parameter, value is kbHash)

---

## Rationale

**keccak256 was chosen because:**

1. **EVM-native** — keccak256 is a first-class opcode (`KECCAK256`) in the EVM. On-chain verification, if ever needed, costs minimal gas (~30 gas for the opcode + input data).
2. **No external library required on-chain** — Solidity provides `keccak256()` natively; no dependency risk.
3. **Ecosystem standard** — keccak256 is already used for address derivation, event topics, storage slot computation, and EIP-712 typed data hashing. Developers and security auditors are familiar with it.
4. **Off-chain well-supported** — `@noble/hashes` (TypeScript), `ethers.keccak256` (ethers.js), and numerous other libraries provide audited, battle-tested implementations.
5. **32-byte output fits `bytes32`** — Solidity's native `bytes32` type holds the 256-bit digest without packing/unpacking.
6. **Pre-image resistance** — no practical pre-image or collision attacks known.
7. **Subgraph compatibility** — The Graph's AssemblyScript mapping receives `bytes32` event params directly; lowercasing and hex-encoding for IDs is a one-liner.

---

## Alternatives Considered

### Alternative A — SHA-256 (FIPS 180-4)

The most widely deployed cryptographic hash function:

- **Not EVM-native** — Solidity has `sha256()` as a precompile (address `0x02`), which costs ~72 gas base + 12 gas/word — significantly more than `KECCAK256`.
- **Familiar outside blockchain** — IPFS CIDv1 uses SHA-256 for the multihash; could simplify CID derivation.
- **Not the standard** for EVM-native data hashing — would create a split between our hash and every other EVM hash identifier.
- **FIPS 202 SHA-3 ≠ keccak256** — SHA-3 uses different padding; keccak256 is the pre-FIPS version. Using SHA-256 avoids this confusion but loses EVM-nativity.

**Rejected:** higher on-chain gas cost; misaligned with EVM ecosystem conventions; no meaningful security advantage over keccak256 for this use case.

### Alternative B — SHA-3 (FIPS 202)

Post-standardization Keccak with NIST padding:

- **Standardized by NIST** — considered more conservative from a standards perspective.
- **NOT the same as Ethereum's keccak256** — critical pitfall; `sha3_256` in most libraries produces a different digest than Ethereum's `keccak256`. This has been the source of multiple bugs in Ethereum tooling.
- **Not a Solidity builtin** — would require an external library or custom assembly.

**Rejected:** risk of confusion with keccak256 is too high; no Solidity native support.

### Alternative C — BLAKE2b

A fast, modern hash function with a strong security margin:

- **Faster than SHA-256 in software** — attractive for off-chain computation.
- **No EVM precompile** — not natively supported; would require a Solidity library (~1,000+ gas).
- **Less familiar to EVM security auditors** — increases audit surface.
- **Not used elsewhere in the EVM ecosystem** — creates an island.

**Rejected:** gas cost and ecosystem isolation outweigh performance advantages.

### Alternative D — CIDv1 multihash (SHA-256)

Use the IPFS CIDv1 hash directly as the kbHash:

- **IPFS interoperability** — the CID directly encodes the IPFS address of the content.
- **52+ byte output** — CIDv1 with SHA-256 multihash is longer than 32 bytes; does not fit `bytes32`.
- **Would require truncation or custom encoding** — lossy and non-standard.
- **Conflates storage identity with protocol identity** — IPFS CID encodes where the content is stored; `kbId` encodes what the content is (content-addressed by value, not by location).

**Rejected:** does not fit `bytes32`; conflates storage and identity concerns.

---

## Consequences

### Positive

- `kbHash` is computable entirely off-chain with zero RPC calls.
- On-chain verification (if added in M2+) would use the native `KECCAK256` opcode at minimal cost.
- The 32-byte hash maps directly to Solidity `bytes32`, Ethereum event topics, and subgraph entity IDs.
- Security auditors reviewing the contract see a familiar primitive with a well-understood security model.
- IPFS CIDv1 can still be derived separately (`sha2-256` multihash of the raw payload) for storage addressing — it is independent of `kbHash`.

### Negative / Trade-offs

- keccak256 is not FIPS-approved — irrelevant for current use cases but worth noting for any future regulated deployment.
  - The contract trusts the submitted `contentHash` (kbHash) without recomputing it. This is acceptable because:
  - The submitter bears the cost of a wrong hash (they register a KB that no one can verify).
  - The conformance suite provides off-chain verification.
  - Adding on-chain recomputation would require passing the full envelope in calldata, which is impractical for variable-length payloads.

### Required follow-up

- [x] `packages/protocol/src/canonical/canonicalize.ts` — implements keccak256 after JCS
- [x] `packages/protocol/contracts/AlexandrianRegistry.sol` — accepts `bytes32 contentHash`
- [x] `test-vectors/canonical/` — committed expected `kbHash` values for all vectors
- [x] `tests/specification/canonical-vectors.test.ts` — validates against committed vectors
- [x] `docs/protocol/PROTOCOL-SPEC.md §2` — normative reference to keccak256
- [ ] M2+: consider whether on-chain recomputation (with calldata envelope) is desirable for trustless verification

---

## Normative References

- [ADR-0001](0001-jcs-canonicalization.md) — JCS canonicalization (preimage definition)
- [PROTOCOL-SPEC-001](../protocol/PROTOCOL-SPEC.md) §2 — Canonical serialization and hash derivation
- [Ethereum Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf) — keccak256 specification
- [EIP-712](https://eips.ethereum.org/EIPS/eip-712) — Typed structured data hashing (related EVM convention)

---

## Out of scope

This ADR does not decide:

- The serialization format of the bytes being hashed (see [ADR-0001](0001-jcs-canonicalization.md)).
- How `kbHash` is stored or indexed off-chain (subgraph schema is covered in the subgraph docs).
- Whether future versions of the protocol might support multiple hash algorithms (hash agility is deferred to M2+).
- IPFS CID derivation for storage — this is independent of `kbHash`.
