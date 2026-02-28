# Canonical Envelope Spec (Milestone 1)

**Normative spec:** [PROTOCOL-SPEC.md](PROTOCOL-SPEC.md) §2–3. This document is descriptive and expands on envelope structure and JCS.

The canonical envelope is the **hash preimage** for Knowledge Blocks. It ensures content-addressed identity: same content + same lineage → same `kbId` / `kbHash`, regardless of curator or registration time.

---

## 1. Principles

- **No timestamp** in the hash preimage.
- **No signature** in the hash preimage.
- **No curator address** in the hash preimage (for the envelope; metadata stores it separately).
- **Deterministic serialization** via RFC 8785 (JCS)–style canonical JSON.
- **Deterministic lineage** via sorted `sources` array before hashing.

---

## 2. Envelope Structure

The envelope is a JSON object with camelCase keys:

```json
{
  "type": "practice",
  "domain": "software.security",
  "sources": [],
  "payload": { ... }
}
```

| Field   | Type   | Description                                                                 |
|---------|--------|-----------------------------------------------------------------------------|
| `type`  | string | One of: `practice`, `feature`, `stateMachine`, `promptEngineering`, `complianceChecklist`, `rubric` |
| `domain`| string | Domain classification (e.g. `software.security`, `software.patterns`)       |
| `sources` | string[] | Source kbIds (kbHash). **Must be sorted** before hashing.        |
| `payload` | object | Type-specific payload; see [Artifact Type Registry](artifact-type-registry.md) |

---

## 3. JCS (RFC 8785) Canonicalization

1. **Key sort:** Recursively sort all object keys lexicographically.
2. **Arrays:** Preserve element order (only object keys are sorted).
3. **Encoding:** UTF-8, no extra whitespace, minimal JSON.
4. **Primitives:** Numbers as JSON (integer when exact), strings escaped per JSON.
5. **Types:** Non-JSON types (including BigInt) are invalid and MUST be rejected.

**Implementation:** `@alexandrian/protocol` `core/canonical/jcs.ts` — `canonicalize(value)`.

---

## 4. Deterministic Lineage

Before canonicalization, sort the `sources` array:

```ts
sources.sort()
```

Same set of sources in any order → same sorted array → same hash.

**Implementation:** `sortSources(envelope)` in `canonical.ts`; applied automatically by `kbHashFromEnvelope()` and `cidV1FromEnvelope()`.

---

## 5. Content Hash & CIDv1

| Output       | Derivation                                              | Format              |
|-------------|----------------------------------------------------------|---------------------|
| `kbHash` | keccak256("KB_V1" || canonical UTF-8)                             | `0x` + 64 hex chars |
| `cidV1`       | CIDv1, codec raw (0x55), multihash sha2-256             | Base32 (e.g. `bafybei...`) |

**Implementation:**
- `kbHashFromEnvelope(envelope)` → `0x` + 64 hex
- `cidV1FromEnvelope(envelope)` → CIDv1 base32 string

---

## 6. Metadata Separation

The **Canonical Envelope** (hashed) and **Signed Metadata** (not hashed) are stored as **linked but distinct** objects:

| Object           | Contents                    | Stored on IPFS      |
|------------------|-----------------------------|----------------------|
| Canonical Envelope | `type`, `domain`, `sources`, `payload` | Content-addressed (CID = hash) |
| Signed Metadata  | `envelopeCid`, `curator`, `timestamp`, `signature` | Referenced by envelopeCid |

The signature covers the envelope (or envelopeCid); it is **not** part of the hash preimage.

---

## 7. References

- Implementation: `packages/protocol/core/canonical/jcs.ts`
- Schema: `packages/protocol/schema/canonicalEnvelope.ts`
- Test vectors: `test-vectors/canonical/`
