# Milestone 1 — Scope Freeze

**Status:** Frozen
**Date:** 2026-02-25
**Verification:** `pnpm verify:m1` (see [VERIFY-M1.md](VERIFY-M1.md))

---

## What M1 Is

Milestone 1 delivers a **minimal, deterministic protocol** that is deployed on Base mainnet and verifiable from a clean clone with no external services.

The M1 claim is:

> We defined a deterministic content-addressed knowledge registry, deployed it to Base mainnet, implemented a conformance-tested SDK, and produced an ABI-snapshotted CI pipeline that verifies the full protocol stack in one command. No live chain, IPFS, or Redis is needed for verification.

---

## What Is In Scope

### Protocol core
- ✅ Deterministic identity: `kbId = keccak256("KB_V1" || JCS(normalize(envelope)))`
- ✅ Canonical serialization: RFC 8785 JCS, single implementation (`canonical.ts`)
- ✅ Invariant enforcement: uniqueness, no self-ref, DAG acyclicity, source ordering, hash stability, separation of concerns
- ✅ Proof spec v1: `alexandrian-proof/1`, deterministic, verifiable without live RPC
- ✅ 6 artifact types: `Practice`, `Feature`, `StateMachine`, `PromptEngineering`, `ComplianceChecklist`, `Rubric`

### Smart contract
- ✅ `AlexandrianRegistryV2.sol` deployed at `0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000` (Base mainnet, chainId 8453)
- ✅ Typed Knowledge Blocks with royalty DAG (max 8 parents)
- ✅ Atomic query fee settlement through DAG
- ✅ Pull payment model (`withdrawEarnings`)
- ✅ Stake / slash with 30-day lock
- ✅ Deterministic reputation scoring
- ✅ Pause / circuit breaker
- ✅ Agent identity chain (`linkIdentity`)
- ✅ Sourcify + Basescan verification
- ✅ 124-entry ABI snapshot, snapshot-gated in CI

### SDK
- ✅ `@alexandrian/sdk-adapters`: `createAlexandrianClient()` with chain ID validation, `publish`, `settleCitation`, `getKB`, `getStake`, `getReputation`, `verify`
- ✅ `@alexandrian/sdk-core`: error taxonomy (`AlexandrianError`, `ContractError`, `ValidationError`, `NetworkError`, `NotFoundError`), `Result<T,E>`, `ok`/`err`/`wrapError`
- ✅ Dual ESM + CJS output via tsup
- ✅ TypeScript strict mode

### Testing & conformance
- ✅ Conformance suite (`@alexandrian/conformance`): canonical vectors, v1 envelope vectors, proof conformance
- ✅ Specification tests: canonical-vectors, derived-vectors, invariant-pipeline, proof-vectors
- ✅ Invariant tests: formal invariants enforced and tested
- ✅ Determinism tests: cross-run, key-order independence
- ✅ M1 demonstration suite: canonical identity, VirtualRegistry, invariant enforcement, subgraph compatibility
- ✅ SDK primitives tests: hashContent, hashText, canonicalizeContent, buildProofSpecV1, error taxonomy

### CI / distribution
- ✅ GitHub Actions CI: security audit, typecheck, compile, ABI snapshot gate, ordered builds, full test suite
- ✅ TruffleHog secret scanning (parallel job)
- ✅ Changesets for version management
- ✅ Storage layout documentation (`packages/protocol/docs/STORAGE-LAYOUT.md`)
- ✅ NatSpec on all public contract functions

---

## What Is Explicitly Deferred (M2+)

The following are **not** part of M1 and are not claimed in this submission:

### M2 — Live infrastructure
- Live testnet / mainnet smoke tests via anvil fork
- IPFS content resolution and CID verification against live gateway
- Subgraph hosted service deployment and live indexing
- Bundlewatch / bundle-size tracking (requires published npm package)
- npm publishConfig / provenance attestation (requires org credentials)

### M2 — SDK hardening
- `Result<T,E>` wired through all public SDK methods (breaking API change)
- Full retry/backoff transport with configurable timeouts
- Browser bundle and dApp examples

### M2 — Features
- Mainnet fork tests (requires live RPC + private key in CI secrets)
- Cross-implementation conformance (Python, Rust)
- Pool and subscription clients (partially stubbed)
- Semantic indexing and embedding search

### M3+
- Fully decentralized governance
- Multi-chain deployment
- Agent-to-agent protocol and A2A proof verification (partially stubbed)

---

## Conventions for M1 Source Files

To make scope clear to reviewers:

- Production paths (`packages/*/src/`, `packages/*/lib/`, `packages/*/client/`) contain only M1 scope
- Experimental / M2 code lives in `experimental/` and is never imported from production paths
- Skipped tests in `tests/` use `describe.skip` or `it.skip` with a comment explaining deferral
- TODOs in production code that reference M2+ are labeled `TODO: M2` or `TODO: M5/M6`

---

*This document is the authoritative scope definition for Milestone 1. Any claim not listed in "In Scope" above is not part of the M1 submission.*
