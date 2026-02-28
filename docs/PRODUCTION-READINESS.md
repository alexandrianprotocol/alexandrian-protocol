# Alexandrian Protocol — Production Readiness Checklist

```yaml
document:
  id: PROD-READY-001
  version: 1.0.0
  owner: protocol-team
  status: stable
  classification: public
  last_reviewed: "2026-02-25"
  schema_version: "1.0"
  depends_on:
    - PROTO-STD-001
    - SEC-CHK-001
    - SEC-001
    - PROTO-001
```

> **System:** Alexandrian Protocol — M1
> **Version:** 1.0.0
> **Date:** 2026-02-25
> **Owner:** protocol-team
>
> **Reviewer summary:** see [AUDIT-SUMMARY.md](AUDIT-SUMMARY.md).
>
> This checklist is the production sign-off gate for M1. It covers the full
> protocol stack: smart contracts, canonical pipeline, VirtualRegistry,
> SDK-core, subgraph, and CI.
>
> Legend: ✅ Pass · ⚠ Partial · ❌ Not done · 🔄 M2+

---

## 0. Executive Readiness Summary

| Category | Status | Notes |
|----------|--------|-------|
| Correctness | ✅ Ready | Determinism proven; 10,000-run property tests pass; test vectors committed |
| Security | ✅ Ready | No high/critical CVEs; threat model complete; SECURITY-CHECKLIST.md all CRITICAL items pass |
| Failure Handling | ✅ Ready | Typed errors across all layers; subgraph idempotency confirmed; pull payments only |
| Observability | ⚠ Partial | Events complete; Grafana/alerting deferred to M2+ |
| Abuse Resistance | ⚠ Partial | Protocol-layer invariants enforced; reputation hardening deferred to M2+ |
| Governance / Permissions | ⚠ Partial | AccessControl roles correct; multisig + timelock deferred to M2+ |
| Documentation | ✅ Ready | STANDARDS.md, CONFORMANCE.md, SECURITY-CHECKLIST.md, threat model, error model, ADRs, test vectors |
| Upgrade Policy | ✅ Ready | No upgrade proxy; contract is immutable; semver policy documented |

---

## 1. Determinism and Correctness

### Identity and Hashing

- [x] Identity derivation is deterministic: `kbHash = keccak256("KB_V1" || JCS(envelopeNormalized))` — [ADR-0002](adr/0002-keccak256-content-hash.md)
- [x] No hidden randomness in core logic. No `Math.random()`, `Date.now()`, or nonce in canonical pipeline.
- [x] Canonicalization rules are defined: RFC 8785 JCS — [ADR-0001](adr/0001-jcs-canonicalization.md)
- [x] Same input → same output across environments: proven by `tests/determinism/` and `tests/property/`
- [x] Hash inputs are explicitly defined and versioned: STANDARDS.md §5, PROTOCOL-SPEC.md §2
- [x] No timestamps or nonces in `kbHash` preimage: `curator`, `timestamp`, `signature` excluded per STANDARDS.md §5.1

**Evidence:** `pnpm test:property` — 10,000 random key permutations, 10,000 whitespace variants, 10,000 source-order variants → identical hash every run.

### Invariants

- [x] INV-001: No duplicate sources — VirtualRegistry enforces; `INVALID_ENVELOPE`
- [x] INV-002: No self-reference — VirtualRegistry + contract enforces; `CYCLE_DETECTED` / `NoSelfReference`
- [x] INV-003: DAG acyclicity — VirtualRegistry depth-first cycle check; `CYCLE_DETECTED`
- [x] INV-004: All sources registered before derived KB — VirtualRegistry + contract; `CYCLE_DETECTED` / `ParentNotRegistered`
- [x] INV-005: Sources sorted lexicographically — VirtualRegistry enforces; `SOURCES_NOT_SORTED`
- [x] INV-006: Deterministic identity — property tests (10,000 runs)
- [x] INV-007: artifactHash binding — schema validation
- [x] INV-008: Royalty conservation — `SharesExceedDistributable` contract enforcement
- [x] INV-009: Separation of concerns — `lint:boundaries` CI gate

**Evidence:** `tests/invariants/protocol-invariants.test.ts`, `pnpm test:invariants`.

### State Machine

- [x] KB states are documented: unregistered → registered → [slashed] (INVARIANTS.md)
- [x] Transitions are documented: `publishKB()` (unregistered → registered), `slash()` (registered → slashed)
- [x] Illegal transitions revert: `AlreadyPublished`, `KBIsSlashed` Solidity custom errors
- [x] Terminal states are defined: slashed is terminal — no un-slash function
- [x] No implicit state transitions: all state changes gated by explicit function calls with event emission

---

## 2. Security Posture

### Threat Model

- [x] Explicit attacker model defined: [security/threat-model.yaml](security/threat-model.yaml) — 9 STRIDE threats
- [x] Trusted vs untrusted inputs documented: TRUST-MODEL-AND-STRATEGY.md §1; STANDARDS.md §8
- [x] Trust boundaries declared: TB-001 through TB-004 in threat model
- [x] Off-chain vs on-chain responsibilities clarified: STANDARDS.md §8, IMPLEMENTATION-NOTES.md §1

### Input Validation

- [x] All external inputs validated: VirtualRegistry validates schema, invariants, sorting before any RPC call
- [x] Schema validation enforced at boundaries: VirtualRegistry + contract — `SCHEMA_INVALID`, `INVALID_ENVELOPE`
- [x] No reliance on client-only validation: contract enforces `AlreadyPublished`, `NoSelfReference`, `ParentNotRegistered`, `SharesExceedDistributable` independently

### Economic Safety

- [x] No reentrancy: Checks-Effects-Interactions pattern; pull payments eliminate external calls in hot path
- [x] Pull payments only: fees/royalties accumulated in claimable balances; no `transfer()` on settlement
- [x] Bounded royalty logic: `SharesExceedDistributable` — sum(shares) ≤ 10000 − protocolFeeBps
- [x] No unintended value minting: contract only routes ETH received as `msg.value`; no new ETH created
- [x] `IncorrectFee`: payable functions require exact fee; no over/underpayment silently accepted

**Evidence:** Hardhat test suite — `pnpm --filter @alexandrian/protocol test`.

### Secrets and Keys

- [x] No private keys transmitted over API: SDK uses injected `ethers.Signer` / viem WalletClient only
- [x] No secrets committed in repo: TruffleHog secret scan in CI (`.github/workflows/ci.yml`)
- [x] `.env` excluded: `docs/.gitignore` and root `.gitignore` exclude `.env*`
- [ ] 🔄 Rotation policy: key rotation procedures deferred to M2+ ops runbook

---

## 3. Abuse and Incentive Resistance

- [x] **Sybil attack considered**: documented in threat model (TM-004, TM-005); admin AccessControl prevents unauthorized role grants
- [x] **Wash trading considered**: documented in TRUST-MODEL-AND-STRATEGY.md §6; unique payer tracking planned
- [x] **Spam limits — MAX_PARENTS**: `TooManyParents` enforced; bounds gas cost for parent traversal
- [ ] ⚠ **Spam limits — domain registration**: no per-domain rate limit in M1; deferred to M2+
- [ ] ⚠ **Reputation inflation**: min rep fee threshold not yet implemented; planned M2+ (see NICE-TO-HAVE.md §B)
- [x] **Royalty collusion**: `SharesExceedDistributable` prevents royalty drain; pull payments prevent reentrancy exploit
- [x] **Minimum stake**: `InsufficientStake` enforced on-chain before publish

---

## 4. Failure Handling and Resilience

### Network and RPC

- [x] Timeouts defined: `RPC_TIMEOUT` error code (E-0302) in error model
- [x] Retry policy: documented in error taxonomy; SDK surfaces `NETWORK_ERROR` for transient failures
- [x] Graceful degradation: subgraph unavailability falls back to direct RPC (on-chain data always queryable)
- [x] Typed errors: all failure modes return `Result<T, AlexandrianError>` — no untyped throws

### Idempotency

- [x] Event reprocessing safe: `handleQuerySettled` and `handleRoyaltyPaid` load by deterministic ID and skip if exists
- [x] Duplicate submissions handled: `AlreadyPublished` on-chain revert; SDK surfaces as `ALREADY_PUBLISHED`
- [x] Unique identifiers for side effects: settlement entity ID = `txHash-logIndex`; royalty ID = `txHash-logIndex`

### Reorg Safety

- [x] Reorg posture defined: SUBGRAPH-BUILD-RUN-RESULTS.md; idempotent handlers confirmed in `mapping.ts`
- [x] Idempotent indexing: load-before-update + skip-if-exists pattern in all handlers
- [x] Deterministic entity IDs: KB = `contentHash.toLowerCase()` (value = kbHash); settlement = `txHash-logIndex`
- [x] Duplicate event protection: P0 audit finding resolved — confirmed in code review and documented in M1-SUBGRAPH-SEEDS-AND-GAPS.md

---

## 5. Observability and Operability

- [x] **Structured events**: `KnowledgeBlockPublished`, `QuerySettled`, `RoyaltyPaid`, `StakeDeposited`, `KBSlashed` — sufficient to reconstruct all state from logs
- [x] **Deterministic identifiers logged**: `contentHash` is the primary log key (value = kbHash) — searchable across subgraph + explorer
- [x] **Error codes standardized**: 25 typed codes across all layers — [api/error-model.yaml](api/error-model.yaml)
- [x] **Block explorer attestation**: Basescan — `0x5D6dee4BB3E70f3e8118223Bf297B2eEdBC5B000`
- [x] **Certification artifact**: `pnpm certify:m1` produces `certification/m1-report.json` and `m1-badge.svg`
- [ ] ⚠ **Metrics / Grafana dashboard**: deferred to M2+ (see NICE-TO-HAVE.md §F)
- [ ] ⚠ **Alerting on subgraph lag**: deferred to M2+
- [ ] ⚠ **Audit logs for privileged actions**: `KBSlashed` event exists; structured slash reason deferred to M2+

---

## 6. Governance and Permissions

- [x] **Admin roles documented**: OpenZeppelin AccessControl — ADMIN_ROLE held by deployer; documented in contract spec
- [x] **Permission scope minimal**: admin can pause, slash, update fee — cannot alter KB identity or royalty routing
- [x] **Emergency pause**: `ProtocolPaused` custom error; state-mutating functions gated; documented in SECURITY-CHECKLIST.md B-7
- [x] **Upgrade authority**: NONE — contract has no proxy, no upgrade mechanism; immutable post-deploy
- [ ] ⚠ **protocolFeeBps hard cap**: enforced by admin discipline only in M1; cap in contract planned M2+
- [ ] ⚠ **Timelock on fee changes**: deferred to M2+
- [ ] ⚠ **Multisig for admin**: deferred to M2+; currently single deployer key

---

## 7. Versioning and Upgrade Policy

- [x] **Semantic versioning**: documented in STANDARDS.md §10 — MAJOR for consensus-critical changes, MINOR for additive, PATCH for clarification
- [x] **Breaking changes identified**: any change to hashing, canonicalization, or required envelope fields = MAJOR
- [x] **Consensus-critical rules frozen per version**: STANDARDS.md §2 defines the frozen surface
- [x] **ABI changes documented**: ABI snapshot CI gate (`export-abi.mjs` + `git diff`) — breaks CI on any change
- [x] **No upgrade path needed**: contract is immutable; identity migration requires a new contract (documented in MAINNET-ADDRESSES.md)
- [x] **Backward compatibility**: existing KBs with registered contentHash (kbHash) are permanently valid; new invariants cannot invalidate old registrations

---

## 8. Documentation Quality

- [x] **Normative spec**: [STANDARDS.md](STANDARDS.md) + [protocol/PROTOCOL-SPEC.md](protocol/PROTOCOL-SPEC.md)
- [x] **Conformance definition**: [CONFORMANCE.md](CONFORMANCE.md) — MUST/SHOULD/MAY language, test vectors, proof verification
- [x] **Security checklist**: [SECURITY-CHECKLIST.md](SECURITY-CHECKLIST.md) — 40 items, all CRITICAL items verified
- [x] **Threat model**: [security/threat-model.yaml](security/threat-model.yaml) — 9 STRIDE threats with mitigations
- [x] **Trust model**: [TRUST-MODEL-AND-STRATEGY.md](TRUST-MODEL-AND-STRATEGY.md)
- [x] **Error taxonomy**: [api/error-model.yaml](api/error-model.yaml) — 25 typed codes
- [x] **ADRs**: [ADR-0001](adr/0001-jcs-canonicalization.md) (JCS), [ADR-0002](adr/0002-keccak256-content-hash.md) (keccak256)
- [x] **Deterministic test vectors**: `test-vectors/canonical/` and `test-vectors/derived/` — committed, CI-validated
- [x] **Example usage**: `pnpm demo:m1` / `pnpm demo:m1:live` — documented in M1-DEMO.md
- [x] **Reviewer guide**: [VERIFY-M1.md](VERIFY-M1.md) — clean-clone to full verification in one command
- [x] **README does not contradict spec**: docs/README.md references PROTOCOL-SPEC.md as authoritative

---

## 9. Testing Architecture

### Unit Tests

- [x] Core invariants covered: INV-001 … INV-009 — `tests/invariants/protocol-invariants.test.ts`
- [x] Edge cases covered: duplicate sources, self-reference, cycles, unsorted sources, missing fields, unknown types
- [x] Failure paths tested: all VirtualRegistryError codes verified with `expect(err.code).toBe(...)`
- [x] Boundary values tested: empty sources, single source, MAX_PARENTS limit

### Integration Tests

- [x] End-to-end flow tested: `tests/demonstration/m1-demo.test.ts` — publish root, derive, settle, reject adversarial
- [x] Multi-actor interactions: Hardhat tests — multiple signers for curator, querier, payer roles
- [x] Economic flows validated: settlement conservation, royalty routing, stake/slash

### Determinism Tests

- [x] Hash reproduction tests: `test-vectors/canonical/` — committed expected hashes, CI-validated
- [x] Cross-run determinism: `tests/determinism/` — independent runs of same input → identical output
- [x] Whitespace/order permutations: `tests/property/` — 10,000 runs each for key-order, whitespace, source-order independence

### CI Discipline

- [x] No network required for core tests: `CONTRACT_MODE=mock` for spec/invariant/demo/property tests
- [x] Deterministic builds: `pnpm install --frozen-lockfile`; single `pnpm-lock.yaml`
- [x] CI fails on lint/type errors: `pnpm run lint:boundaries`; TypeScript strict mode
- [x] ABI drift detection: `export-abi.mjs` + `git diff` — breaks CI on any ABI change

**Full CI pipeline:** `pnpm verify:m1` → build → boundaries → audit → test:m1 (protocol + conformance + spec + invariants + demonstration + determinism + property)

---

## 10. Performance and Scalability

- [x] **Gas analyzed**: publishKB, settleQuery, stake measured in Hardhat gas reporter (see contract spec)
- [x] **Bounded loops**: `MAX_PARENTS` enforced — prevents unbounded parent traversal on-chain
- [x] **No unbounded iteration in contract hot path**: royalty routing uses fixed-size arrays bounded by `MAX_PARENTS`
- [ ] ⚠ **Formal gas ceiling**: no hard gas budget documented per function; planned for audit prep
- [ ] ⚠ **Pagination**: subgraph query pagination not yet enforced at SDK level; deferred to M2+

---

## 11. Surface Area Discipline

- [x] **Protocol-core separated from infrastructure**: `lint:boundaries` CI gate — `packages/protocol/src/canonical/` cannot import from runtime or services
- [x] **VirtualRegistry is pure in-memory**: no network calls, no chain dependency in protocol invariant enforcement
- [x] **No monolithic god file**: canonical pipeline, VirtualRegistry, error taxonomy each in separate modules
- [x] **Mockable interfaces**: `CONTRACT_MODE=mock` env var switches to VirtualRegistry for all spec/invariant tests
- [x] **INV-009 separation of concerns**: protocol-core does not import SDK, subgraph, or infrastructure — proven by `lint:boundaries`

---

## 12. Production UX

- [x] **Clear error messages**: all 25 error codes have descriptions and recovery guidance in `api/error-model.yaml`
- [x] **No silent failures**: SDK returns `Result<T, AlexandrianError>` — callers must handle errors explicitly
- [x] **Preview vs commit distinction**: preview (off-chain, free) vs settlement (on-chain, paid, produces proof) — IMPLEMENTATION-NOTES.md §3
- [x] **Safe defaults**: `CONTRACT_MODE=mock` for offline/test; live mode requires explicit RPC config
- [x] **One-command verification**: `pnpm verify:m1` — build + test in one reproducible command; documented for reviewers

---

## 13. Release Hygiene

- [x] `.env` not committed: `.gitignore` excludes `.env*`; TruffleHog in CI
- [x] `.env.example` / environment documented: `docs/VERIFY-M1.md` — no private keys, no RPC required for M1 verification
- [x] Lockfiles consistent: single `pnpm-lock.yaml`; CI uses `--frozen-lockfile`
- [x] ABI snapshot committed and frozen: `packages/protocol/src/abis/` — CI gate enforced
- [x] Test vectors committed: `test-vectors/` — CI-validated on every run
- [x] Known risks documented: threat model (9 threats), SECURITY-CHECKLIST.md, accepted risks in TRUST-MODEL-AND-STRATEGY.md §8
- [x] Certification artifact: `pnpm certify:m1` produces structured JSON report + SVG badge

---

## 14. Final Go / No-Go Gate

| Question | Answer |
|----------|--------|
| **What cannot happen?** | A registered `contentHash` (value = kbHash) can never be overwritten. A slashed KB can never be un-slashed. Protocol-core cannot import runtime/infrastructure. |
| **What must always happen?** | Same envelope → same `kbHash`. Sources must be sorted. Royalties must sum ≤ distributable. Pull payments only. |
| **What happens if every dependency fails?** | On-chain data is always queryable via RPC. VirtualRegistry runs offline. Core tests require no network. |
| **Who is trusted and why?** | The contract (immutable, auditable). JCS (RFC 8785, IETF-specified). keccak256 (EVM-native, collision-resistant). Admin role (bounded scope, no KB identity access). |
| **Can an independent third party verify correctness?** | Yes — `pnpm verify:m1` from a clean clone. See VERIFY-M1.md. Committed test vectors. |
| **Can the system survive adversarial behavior?** | Contract-layer: yes (AccessControl, invariant enforcement, no upgrade proxy). Protocol-layer: yes (VirtualRegistry rejects all invalid envelopes). Reputation gaming: partial (M2+ hardening planned). |
| **Can a new engineer understand the trust model in 30 minutes?** | Yes — read TRUST-MODEL-AND-STRATEGY.md §1–§4 (4 pages). |

---

## 15. Production Readiness Score — M1

| Category | Weight | Score (1–10) | Weighted |
|----------|--------|-------------|---------|
| Correctness | 20% | 10 | 2.0 |
| Security | 20% | 9 | 1.8 |
| Abuse Resistance | 15% | 7 | 1.05 |
| Resilience | 15% | 9 | 1.35 |
| Observability | 10% | 6 | 0.6 |
| Governance | 10% | 7 | 0.7 |
| Documentation | 10% | 10 | 1.0 |

**Total Score: 8.5 / 10**

*Deductions: Reputation hardening (-1.5), observability (-1.5), governance multisig/timelock (-1.5) — all tracked in NICE-TO-HAVE.md and M1-SCOPE-FREEZE.md as M2+ items.*

---

## Audit Entry Points

For auditors beginning a review, in priority order:

1. **Protocol hashing pipeline:** `packages/protocol/src/canonical/canonicalize.ts`
2. **Invariant enforcement:** `packages/protocol/src/core/virtualRegistry/VirtualRegistry.ts`
3. **Smart contract:** `packages/protocol/contracts/AlexandrianRegistryV2.sol`
4. **Subgraph mappings:** `subgraph/src/mapping.ts`
5. **Error taxonomy:** `packages/sdk-core/lib/errors.ts` + `docs/api/error-model.yaml`
6. **Security checklist:** `docs/SECURITY-CHECKLIST.md`
7. **Threat model:** `docs/security/threat-model.yaml`
8. **One-command verification:** `pnpm verify:m1` (build → boundaries → audit → test:m1)

---

## References

- [STANDARDS.md](STANDARDS.md) — Normative protocol rules
- [CONFORMANCE.md](CONFORMANCE.md) — Conformance specification
- [SECURITY-CHECKLIST.md](SECURITY-CHECKLIST.md) — Security audit checklist
- [TRUST-MODEL-AND-STRATEGY.md](TRUST-MODEL-AND-STRATEGY.md) — Trust boundaries
- [security/threat-model.yaml](security/threat-model.yaml) — STRIDE threat model
- [api/error-model.yaml](api/error-model.yaml) — Error code registry
- [VERIFY-M1.md](VERIFY-M1.md) — Reviewer verification guide
- [M1-SCOPE-FREEZE.md](M1-SCOPE-FREEZE.md) — M2+ deferred items
- [NICE-TO-HAVE.md](NICE-TO-HAVE.md) — Non-normative roadmap

---

## Out of scope

This checklist does not cover:
- L1/L2 consensus security (assumed — ASSM-001 in threat model)
- Key management / wallet security (caller responsibility)
- Web API or hosted infrastructure (M2+ scope)
- Agent runtime security (application-layer concern)
- Multi-language conformance testing (M2+ scope)
