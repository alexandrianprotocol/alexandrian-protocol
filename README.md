# Alexandrian Protocol

**Alexandrian is knowledge as a protocol primitive.**

A deterministic identity and settlement protocol that makes knowledge verifiable, composable, and economically routable.

![CI](https://github.com/alexandrianprotocol/alexandrian-protocol/actions/workflows/ci.yml/badge.svg)
![Tests](https://img.shields.io/badge/tests-232%20passing-brightgreen)
![Network](https://img.shields.io/badge/network-Base%20Sepolia-0052FF)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

*This repository is structured for auditability and protocol review.*

## Quick Evaluation Links

For technical review or funding evaluation:

- **Protocol Specification** → `docs/spec/protocol-spec.md`
- **Canonical Identity & Serialization** → `docs/spec/canonical-envelope-spec.md`
- **Lineage DAG Constraints** → `docs/spec/lineage-dag.md`
- **Settlement & Royalty Formula** → `docs/spec/settlement.md`
- **Protocol Invariants** → `docs/spec/invariants.md`
- **Governance & Parameter Bounds** → `docs/governance/governance-model.md`
- **Testing & Verification Surface** → `docs/testing/testing-guide.md`
- **Testnet Deployment (Base Sepolia)** → `docs/deployment/deploy-testnet.md`
- **Ecosystem Alignment Materials** → `grants/README.md`
- **Whitepaper (Conceptual Thesis)** → `whitepaper/`

All normative guarantees are defined in `/docs/spec`.  
Ecosystem positioning and funding materials are located in `/grants`.  
Formal thesis and conceptual framing are available in `/whitepaper`.

---

## Knowledge Identity

Modern AI systems produce increasingly sophisticated knowledge artifacts.

These artifacts are not typically defined as canonical, addressable objects.

Alexandrian defines a deterministic, content-addressed identity layer that makes knowledge persistently referenceable and economically routable across systems.

---

## The Knowledge Block

A Knowledge Block is a canonical, content-addressed knowledge primitive with deterministic identity, structural lineage, and atomic settlement.

### Six-Layer Cascade

```
contentHash    →   knowledge persists
lineage DAG    →   knowledge is traceable
stake          →   knowledge is accountable
curator        →   knowledge has an owner
royaltyRoutes  →   knowledge generates value
CIDv1          →   knowledge is retrievable
```

Deterministic identity, lineage, and settlement provide verifiable provenance and economic routing.

---

## Architecture

Alexandrian composes execution, indexing, and content-addressed retrieval into modular infrastructure across ecosystems.

Identity and settlement are isolated at the protocol layer.  
Storage, indexing, and agent behavior remain modular and replaceable.

### Protocol (On-Chain)

Consensus-critical guarantees:

- Deterministic identity registration
- Lineage DAG enforcement
- Stake bonding
- Atomic royalty routing and settlement
- Protocol fee accounting

This layer defines canonical state.

---

### Indexing (The Graph)

- Event indexing
- Lineage traversal
- Economic observability
- Queryable metadata

The indexing layer reads chain state.  
It does not define protocol guarantees.

---

### Storage (IPFS / CIDv1)

- Content-addressed payload storage
- Replaceable pinning providers
- Retrieval decoupled from identity

Identity is canonical. Storage is interchangeable.

---

### SDK & API

- `publish()`
- `query()`
- `settle()`

The SDK abstracts protocol interaction but does not modify protocol guarantees.

---

### Agents

Agents consume and produce Knowledge Blocks.  
They do not define invariants.

Only identity, lineage, stake, and settlement require consensus.

---

### Protocol (On-Chain)

Consensus-critical guarantees:

- Deterministic identity registration
- Lineage DAG enforcement
- Stake bonding
- Atomic royalty routing and settlement
- Protocol fee accounting

This layer defines canonical state.

---

### Indexing (The Graph)

- Event indexing
- Lineage traversal
- Economic observability
- Queryable protocol state

The indexing layer materializes on-chain events. It does not define protocol guarantees.

---

### Storage (IPFS / CIDv1)

- Content-addressed payload retrieval
- Replaceable pinning providers
- Retrieval decoupled from identity

Identity is canonical. Storage is interchangeable.

---

### SDK & API

- `publish()`
- `query()`
- `settle()`

The SDK abstracts protocol interaction without modifying protocol guarantees.

---

### Agents

Agents consume and produce Knowledge Blocks. They do not define protocol invariants.

Only identity, lineage, stake, and settlement require consensus.

---

## Implementation

The protocol core is implemented and deployed on Base Sepolia.

Current implementation includes:

- Canonical JSON serialization and cross-runtime deterministic hashing
- On-chain Knowledge Block registration and stake bonding
- Deterministic royalty settlement (pure-function routing)
- Lineage DAG enforcement
- Subgraph indexing
- Property-based invariant testing
- Continuous integration with full test coverage

Future milestones extend economic observability and composability.

---

## Deployment

| Resource | Value |
|----------|-------|
| Network  | Base Sepolia (84532) |
| Registry | `0x5E600fcABFFDAaf0D21257E603429f8C06893AEd` |
| Explorer | https://sepolia.basescan.org |

---

## Repository Structure

```
packages/       Protocol contracts, SDK, runtime
subgraph/       Graph schema and mappings
test-vectors/   Canonical identity vectors
tests/          Unit, property, and integration tests
scripts/        Deployment and demo utilities

docs/           Protocol documentation
whitepaper/     Formal thesis document
grants/         Ecosystem alignment materials
internal/       Non-normative operational documentation
```

---

## Security Model

Protocol guarantees are enforced through:

- Deterministic identity derivation
- On-chain state transitions
- Economic bonding mechanisms

Indexing, storage, and discovery layers are non-authoritative and replaceable.

---

## License

MIT. See [LICENSE](LICENSE).
