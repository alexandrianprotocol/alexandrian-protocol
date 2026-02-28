# Canonical Test Vectors (Milestone 1)

Formal spec: [docs/protocol/PROTOCOL-SPEC.md](../../docs/protocol/PROTOCOL-SPEC.md) §2 (canonical serialization) and [docs/protocol/CONSENSUS-CRITICAL.md](../../docs/protocol/CONSENSUS-CRITICAL.md).

Content-addressed KBs: **no timestamp in the hash preimage**. Same content + same lineage → same `kbHash` / `kbId` regardless of curator or registration time.

## Layout

| Path | Purpose |
|------|---------|
| `types/practice-minimal` | Minimal Practice Block (zero sources); asserts stable kbHash. |
| `types/practice-with-parents` | Same content with two sources; asserts source sort order does not change hash. |
| `types/state-machine` | State Machine Block; asserts schema validation. |
| `types/prompt` | Prompt Engineering Block; asserts template + evalCriteria. |
| `types/compliance` | Compliance Checklist Block; asserts requirements + evidenceMapping. |
| `types/synthesis` | Synthesis Block; Tier 1 Q&A with citations. |
| `types/pattern` | Pattern Block; Tier 1 pattern, occurrences. |
| `types/adaptation` | Adaptation Block; Tier 1 target domain, tradeoffs. |
| `types/enhancement` | Enhancement Block; Tier 1 concern, enhanced content. |
| `derivation/single-parent` | Single-parent derivation; envelope with `derivation` and one parent. |
| `derivation/multi-parent` | Multi-source derivation; envelope with `derivation` and two sources. |
| `derivation/parent-sort` | Source order normalization; `envelope-unsorted.json` and `envelope-sorted.json` yield the same `kbHash`. |
| `derivation/cycle-rejection` | Invalid lineage; envelope whose source is unregistered (rejected by VirtualRegistry). |
| `edge-cases/empty-payload-fields` | Empty strings and arrays in payload. |
| `edge-cases/max-sources` | 20 sources; stress test source ordering. |
| `edge-cases/unicode-content` | Non-ASCII in rationale. |
| `edge-cases/large-payload` | Payload size boundary. |
| `edge-cases/duplicate-source-rejection` | Same source twice; VirtualRegistry rejects (negative test). |
| `edge-cases/zero-royalty-share` | Contract layer: 0 bps attribution (see README). |
| `edge-cases/full-royalty-share` | Contract layer: 10000 bps (see README). |
| `workflow/minimal` | Task + constraint + transition hashing; validates stateHash, transitionId, and log root. |

## Format

- **envelope.json** — CamelCase payload (JCS input). `sources` are sorted before hashing (deterministic lineage).
- **expected.json** — `kbHash` (keccak256 hex, 0x-prefixed) and `cidV1` (CIDv1 base32 when available).

## Usage

- **Ingestion / SDK:** Use `@alexandrian/protocol` `kbHashFromEnvelope(envelope)` and `cidV1FromEnvelope(envelope)` (envelope = camelCase; `sortSources()` applied internally).
- **Regression:** Load `envelope.json`, compute hash, assert `=== expected.kbHash`.
- **Spec conformance:** Run `pnpm test:spec` to execute canonical and invariant conformance tests (no API, blockchain, or LLM required).
- **Multi-language:** Implementations in Rust, Go, Python, etc. should load `envelope.json`, apply PROTOCOL-SPEC §2 (JCS canonicalization + keccak256 with domain tag), compute `kbHash`, and assert equality with `expected.kbHash`. This ensures standardization and avoids implementation drift.

## Metadata separation

- **Canonical envelope** (hashed) → kbHash / CIDv1. Stored on IPFS as the content-addressed object.
- **Signed metadata** (timestamp, signature, envelopeCid) → stored as a linked, distinct object; not in the hash preimage.

## Out of scope (M2+)

These vectors define M1 canonical behavior. Additional KB types, multi-chain vectors, or non-JCS hashing are out of scope for M1. **Full M2+ list:** [docs/M1-SCOPE-FREEZE.md](../../docs/M1-SCOPE-FREEZE.md).
