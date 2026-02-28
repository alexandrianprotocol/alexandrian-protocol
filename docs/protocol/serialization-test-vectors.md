# Serialization Test Vectors (Milestone 1)

**Normative spec:** [PROTOCOL-SPEC.md](PROTOCOL-SPEC.md) §7.1. This document describes test vector layout and usage.

Canonical test vectors that prove cross-environment determinism. Same envelope → same `kbHash` / `cidV1` across TypeScript, Python, Rust, or any implementation that follows this spec.

---

## 1. Purpose

- **Determinism:** Identical envelope JSON (after source sort) must produce identical kbHash in all environments.
- **Regression:** Committed `expected.json` prevents accidental divergence.
- **Cross-language:** Implementations in other stacks can validate against these vectors.

---

## 2. Test Vector Layout

```
test-vectors/canonical/
├── types/                    # Per-KB-type hash correctness
│   ├── practice-minimal/
│   │   ├── envelope.json     # Input envelope (camelCase)
│   │   └── expected.json     # { "kbHash": "0x...", "cidV1": "bafybei..." }
│   ├── practice-with-parents/
│   ├── state-machine/
│   ├── prompt/
│   ├── compliance/
│   ├── synthesis/
│   ├── pattern/
│   ├── adaptation/
│   └── enhancement/
└── derivation/               # DAG / lineage logic
    ├── single-parent/
    ├── multi-parent/
    ├── parent-sort/
    └── cycle-rejection/
└── workflow/                 # Task + transition hashing
    └── minimal/
```

---

## 3. Envelope Format

Each `envelope.json` is a JSON object with:

| Field | Type | Notes |
|-------|------|-------|
| `type` | string | One of the 10 artifact types (Tier 0 + Tier 1) |
| `domain` | string | Domain classification |
| `sources` | string[] | Sorted before hashing (enforcement in code) |
| `payload` | object | Type-specific, camelCase keys |

---

## 4. Expected Format

Each `expected.json` contains:

| Field | Type | Description |
|-------|------|-------------|
| `kbHash` | string | keccak256 hex, `0x` + 64 chars |
| `cidV1` | string | (Optional) CIDv1 base32 when available |

`kbHash` is the primary assertion; `cidV1` is derived from sha2-256 and may differ from `kbHash`.

---

## 5. Derivation Algorithm

1. Load `envelope.json`.
2. Sort `envelope.sources` lexicographically.
3. Canonicalize per RFC 8785 (JCS): sort all object keys recursively, minimal JSON.
4. `kbHash` = `0x` + keccak256("KB_V1" || canonical UTF-8).hex
5. `cidV1` = CIDv1(raw, sha2-256(canonical UTF-8)), base32-encoded.

---

## 6. Vectors

### 6.1 Types (KB type hash correctness)

| Path | Purpose |
|------|---------|
| `types/practice-minimal` | Minimal Practice Block (zero sources); asserts stable kbHash. |
| `types/practice-with-parents` | Two sources; asserts source sort order does not affect hash. |
| `types/state-machine` | State Machine Block; asserts schema validation and CIDv1. |
| `types/prompt` | Prompt Engineering Block; asserts template + evalCriteria. |
| `types/compliance` | Compliance Checklist Block; asserts requirements + evidenceMapping. |
| `types/synthesis` | Synthesis Block; Tier 1 Q&A with citations. |
| `types/pattern` | Pattern Block; Tier 1 pattern, occurrences. |
| `types/adaptation` | Adaptation Block; Tier 1 target domain, tradeoffs. |
| `types/enhancement` | Enhancement Block; Tier 1 concern, enhanced content. |

### 6.2 Derivation (DAG logic)

| Path | Purpose |
|------|---------|
| `derivation/single-parent` | Single-source derivation; envelope with `derivation` and one source. |
| `derivation/multi-parent` | Multi-source derivation; envelope with `derivation` and two sources. |
| `derivation/parent-sort` | Source order normalization; unsorted and sorted envelopes yield the same `kbHash`. |
| `derivation/cycle-rejection` | Invalid lineage; envelope whose source is unregistered (rejected by VirtualRegistry). |
| `edge-cases/empty-payload-fields` | Empty strings and arrays in payload. |
| `edge-cases/max-sources` | 20 sources; stress test. |
| `edge-cases/unicode-content` | Non-ASCII in rationale. |
| `edge-cases/large-payload` | Payload size boundary. |
| `edge-cases/duplicate-source-rejection` | Same source twice; VirtualRegistry rejects. |

### 6.3 Workflow (Task coordination)

| Path | Purpose |
|------|---------|
| `workflow/minimal` | Task + constraint + transition hashing; validates stateHash, transitionId, and log root. |

---

## 7. Usage

- **Ingestion / SDK:** Use `@alexandrian/protocol` `kbHashFromEnvelope(envelope)`.
- **Regression test:** Load envelope, compute hash, assert `=== expected.kbHash`.
- **Spec conformance:** Run `pnpm test:spec` to execute canonical and invariant conformance tests without API, blockchain, or LLM.
- **New implementation:** Implement JCS + parent sort, run against all vectors, commit if match.

---

## 8. Adding Vectors

1. Create `test-vectors/canonical/types/<description>/envelope.json` or `test-vectors/canonical/derivation/<description>/envelope.json`.
2. Run `node scripts/generate-test-vector-expected.mjs` (from repo root) or compute manually via the derivation algorithm.
3. For workflow vectors, run `node scripts/generate-workflow-vector-expected.mjs`.
4. Commit `expected.json`.
5. Add row to §6 (Vectors) above.
