# @alexandrian/protocol

**Implements**: [PROTOCOL-SPEC v2.0.0](../../docs/protocol/PROTOCOL-SPEC.md)

## Structure

```
packages/protocol/
├── src/
│   ├── index.ts           # Main exports
│   ├── types.ts           # KB types (Practice, Feature, etc.)
│   ├── canonical.ts       # JCS + derived envelope builder
│   ├── schemas/           # Zod schemas per KB type
│   ├── core/              # VirtualRegistry, fingerprint, invariants
│   ├── schema/            # CanonicalEnvelope, KnowledgeBlock, etc.
│   └── validation/        # invariants, conformance
├── contracts/             # Solidity
├── dist/                  # Build output
└── docs/API.md
```

Canonical Knowledge Block types, schemas, and validation logic.

This spec work positions you well for grants because it shows:

- Formal invariants documented
- Test coverage for edge cases (cycles, duplicates, self-reference)
- Canonical serialization defined (critical for content hash verification)
- Implementation-agnostic spec (anyone can build a compliant client)

---

Core primitives: Solidity contracts (AlexandrianRegistryV2), canonical envelope serialization (JCS/CIDv1), VirtualRegistry (Protocol Sandbox), and shared schemas.
