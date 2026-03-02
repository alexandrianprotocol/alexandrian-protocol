```yaml
document:
  id: PROTO-001
  version: 2.0.0
  owner: protocol-team
  status: stable
  classification: public
  last_reviewed: "2026-02-27"
  schema_version: "1.0"
  depends_on: []
```

# Alexandrian Protocol — Protocol Spec

**Status:** Normative  
**Version:** 2.0.0 *(Breaking: v1 used `parents`; v2 uses `sources` for canonical envelope. All kb hashes change.)*  

This document is the single source of truth for the Alexandrian Protocol. It defines **behavior and rules** only. Implementations in any language or stack are compliant if they satisfy these requirements.

Alexandrian Core is **open, permissionless knowledge provenance infrastructure**. The **economic layer is opt‑in** for projects that want attribution markets.

This protocol is designed to compose with existing blockchain, storage, and indexing infrastructure. It does not replace these layers; it defines deterministic behavior at the knowledge identity boundary.

---

## 1. Scope

### 1.0 Knowledge Block — Definition (Final Design)

A **Knowledge Block** is:

> *An immutable registry entry that commits to a specific snapshot of a structured knowledge repository, including its schema, interface, and integrity root.*

The KB does **not** hold the full corpus. It holds a **cryptographic commitment** to it. This gives the protocol a clean, protocol-grade separation between mutable knowledge and immutable anchors.

### Two-Layer Architecture (Final Design)

**Layer A — Knowledge Repository (mutable, off-chain)**  
Where AI contributes, data grows, artifacts accumulate, edits happen, and aggregation occurs. This layer is:

- **Versioned** — history and snapshots
- **Structured** — schema and interface
- **Merkle-tree backed** — content-addressed internally
- **Mutable over time** — the corpus evolves off-chain

**Layer B — Knowledge Block (immutable, on-chain anchor)**  
The KB is the on-chain anchor. It contains:

- Namespace / canonical identifier (e.g. `kbId` / `kbHash`; on-chain field name `contentHash`)
- Schema (artifact type and payload shape)
- Interface definition (envelope shape and semantics)
- Version (committed in identity)
- **Merkle root of the repository snapshot** (integrity root; see §2 for `artifactHash` and envelope binding)
- Provenance commitments (e.g. `sources`, lineage)
- Optional previous snapshot reference (e.g. lineage / `sources`)

It does **not** contain the full corpus. It contains a **cryptographic commitment** to a specific snapshot. Normative hashing and envelope rules are defined in §2 and §3; the above is the conceptual model that this spec implements.

### Core Invariant: KB Hash Never Changes

A KB hash must **never** change.

- If it changes, it is not immutable.
- If it is mutable, it is not content-addressed.
- If it is not content-addressed, anchoring is meaningless.

Therefore: **A KB hash cannot represent a live, evolving thing.** Updates cannot modify a KB; they must **create new KBs**.

### Clean Design Pattern

Separate:

1. **Identity (namespace)** — canonical naming for a lineage or logical resource.
2. **Snapshot (versioned immutable state)** — each KB is one immutable snapshot; one hash = one snapshot.
3. **Latest pointer (optional convenience layer)** — an optional, non-consensus pointer to “current” or “latest” snapshot for UX; not part of KB identity.

This yields: immutable history, deterministic replay, explicit version selection, auditability, optional convenience pointer, no mutation of identity, clean separation of concerns.

### Repository as DAG

When AI (or any actor) contributes new content:

- They do **not** modify an existing KB.
- They **create a new KB snapshot** that: commits to a new Merkle root (e.g. via `artifactHash`), references the prior KB in `sources`, has a new `kbHash`, and is registered on-chain.
- The repository **grows as a DAG** (directed acyclic graph) of snapshots. Not a mutable blob. Lineage acyclicity is enforced per §6 (Cycle Exclusion).

---

The Alexandrian Protocol specifies:

- **Content-addressed identity** for Knowledge Blocks (KB): deterministic `kbId` / `kbHash` from canonical content and lineage.
- **Canonical serialization** and hashing rules so that the same logical envelope always yields the same identifier.
- **Lineage and royalty** rules: acyclic provenance graph and attribution-based fee distribution.
- **Slashing and reputation** invariants for staked knowledge.

Implementations MUST satisfy the normative sections below. Descriptive architecture (e.g. runtime design, API shape) is out of scope for this spec.

### 1.1 Non-Goals

This spec does **not** define:

- Runtime architecture (API shape, deployment topology)
- Blockchain-specific contract interfaces
- Exact royalty split algorithms
- UI or client UX
- Off-chain storage, indexing, or search implementation

### Out of scope (M2+)

The following are **deferred to M2+** and not part of this spec’s current scope:

- Additional canonical artifact types beyond the six defined; ZK or attestation in identity; multi-chain identity.
- REST/API layer design; hosted subgraph deployment; rate limiting, auth, API versioning.
- Governance extensions (timelock, multisig, reasonCode enums); mainnet fork tests.
- SDK policy (e.g. “only accept settled proofs”); browser bundle; dApp examples.

**Full M2+ list:** [M1-SCOPE-FREEZE.md](../M1-SCOPE-FREEZE.md) — “What Is Explicitly Deferred (M2+)”.

### 1.2 Terminology (Normative)

**`kbId` and `kbHash` are the same value.**  
In this spec:

- **`kbId`** is the *external* name for the KB identifier.
- **`kbHash`** is the *internal* name for the same bytes (domain‑separated hash of canonical envelope).
- **`contentHash`** is a legacy on‑chain field name; its value MUST be the `kbHash`.

Implementations MAY use either `kbId` or `kbHash` in code, but MUST treat them as identical.  
All external interfaces and documentation SHOULD refer to **`kbId`** to avoid ambiguity.

### 1.2 Implementation-Agnostic Statement

This specification is **implementation-agnostic**. Compliant implementations may be written in any language or stack. The normative behavior (canonicalization, hashing, lineage rules) is defined in terms of inputs and outputs only, with no reference to file paths, package names, or implementation-specific constructs.

### 1.3 Two Layers: Registry vs Artifact Storage (Implementation)

The conceptual Layer A (Knowledge Repository) and Layer B (Knowledge Block) above map to implementation as follows:

- **Layer 1 — On-chain registry (Knowledge Block anchor):** Stores `kbHash` (field name `contentHash`), `artifactHash`, lineage, and economics. The registry does not store artifact bytes. This is the immutable Layer B anchor.
- **Layer 2 — Off-chain artifact storage (Knowledge Repository backing store):** The artifact may live in the repo (e.g. test vectors), on IPFS, Filecoin, S3, or anywhere else. The protocol does **not** require a specific storage backend. This is where the mutable Layer A corpus lives; the KB commits to a snapshot via `artifactHash` (and optional future Merkle root).

### 1.4 Three-Layer Architecture (Design Goal)

**Design goal:** Allow humans and agents to reference a logical name (e.g. `"RiskModel"`) while preserving: immutable KB hashes, deterministic replay, no hidden mutation, and clear authority boundaries.

We separate three layers:

**1️⃣ Immutable Snapshot Layer (Protocol Core)**  
Each Knowledge Block is an immutable registry entry. Conceptually it commits to:

- **Namespace** (logical name; may be expressed in payload or domain)
- **Version** (e.g. semantic version in payload; advisory — hash is final authority)
- **Integrity root** (Merkle root of repository snapshot — in this spec, `artifactHash` binds envelope to artifact bytes)
- **Previous snapshot** (prior KB in the version chain — in this spec, `sources`; for a linear version chain, the single previous KB is in `sources`)

Hash defines identity. Immutable forever. Anchored on-chain. References previous snapshot. **No mutation ever.** This is protocol-critical. The normative envelope shape is in §3; the above is the conceptual model.

**2️⃣ Namespace Resolver Layer (Non-Consensus)**  
A resolver maps **namespace → latest KB hash** (e.g. `RiskModel` → `0xAAA111`). It is a **convenience index** for discovery and “what is latest.” The resolver is **NOT** part of consensus-critical validation. For M1, **Option A — Off-Chain Resolver** (e.g. gateway database, public API, queryable, cached) is recommended. Option B (on-chain resolver contract) introduces governance and update authority and is **not** recommended for M1.

**3️⃣ Coordination Layer**  
Tasks and coordination objects must reference **explicit KB hashes** (e.g. `0xAAA111`). **Never** symbolic names like `"RiskModel"` or `"RiskModel@latest"` in any consensus-critical or replay-critical path. This preserves replay determinism: someone replaying a task years later uses the exact KB hash referenced; history remains reproducible even if the namespace resolver now points to a newer version.

**Update flow (clean):** (1) New snapshot created → (2) New KB with new hash, prior KB in `sources` → (3) Register new KB on-chain → (4) Update resolver pointer (off-chain). Old KB remains immutable and valid forever.

**Version strategy:** Major = breaking, minor = additive, patch = correction. Version string is advisory; **hash is final authority.**

**Forbidden:** Task or coordination references to symbolic namespace or `"Namespace@latest"` in any context that affects stateHash, proof, or replay. Never compute stateHash (or any consensus-critical hash) using a symbolic namespace; always use explicit KB hash.

**Graph topology: DAG, not tree.**  
The KB system is content-addressed, snapshot-based, version-chained, and provenance-linked. That produces a **DAG (Directed Acyclic Graph)**, not a tree. Multiple KBs can derive from the same parent; improvements can fork; competing versions can coexist; different agents may extend differently. A tree enforces single lineage; a DAG allows **plurality**. Plurality is important in open systems. When one agent contributes a “messy” structure and another prefers a cleaner one, you get a **fork** — that is healthy, not a bug. The protocol must: **allow forks**; preserve immutability and lineage edges; **not** enforce a single “correct” structure; **not** rewrite history. The graph remains **neutral**; the protocol does not decide which branch is “better.”

**Clean structure emerges from policy, not protocol.**  
Clean structure (e.g. a preferred tree-like view per namespace) should emerge from: **resolver policies**, lifecycle states, adoption, coordination usage, and economic incentives — **not** from protocol enforcement. The protocol enforces **validity** (well-formed envelope, acyclic lineage, deterministic hash). It does **not** enforce taste or organization. If agents want a single-lineage “tree” per namespace, that is a **resolver policy** (e.g. select branch by: highest adoption, active lifecycle, most recent timestamp, governance approval, or most references in coordination tasks). That is a resolver decision, not a protocol mutation.

**Structural edges (optional semantic richness).**  
For richer semantics without changing normative topology, implementations may introduce **explicit edge types** (e.g. `derived_from`, `supersedes`, `restructures`, `normalizes`, `competes_with`, `corrects`, `fork_of`), e.g. in payload or derivation metadata. The graph remains a DAG; agents can **construct trees within the DAG** for their own views. This is optional and does not alter consensus-critical lineage (which is defined by `sources` and acyclicity).

**Design pattern summary.**  
- **Protocol layer:** DAG of immutable KB snapshots; neutral; allows forks.  
- **Resolver layer:** Defines preferred tree projection (which branch is “latest” or “canonical” per namespace).  
- **Coordination layer:** Pins explicit KB hashes.  
- **Agents:** Choose which branch to use.  

This preserves: determinism, neutrality, competition, evolution, and replay.

### 1.5 Permanent History (Never Delete)

**You must always keep old versions.** Not optionally. Not conditionally.

If you remove old KB versions, you stop being a protocol: replay breaks, auditability breaks, historical verification breaks, reproducibility breaks, anchoring weakens.

- **Coordination requires historical pinning:** Tasks reference specific KB hashes. If a task references `0xAAA111`, that hash must remain resolvable forever so replay and stateHash verification succeed.
- **Protocols accumulate history; applications overwrite history.** This protocol is append-only: after a KB is anchored, it is **permanent**.
- **Deprecation** is metadata only (e.g. `status: deprecated` in resolver or payload). Never delete the KB snapshot itself.
- **Deletion** is only acceptable if the KB was invalid, violated protocol invariants, or was never finalized (rejected before anchoring). After anchoring → permanent.
- **Storage:** Keep on-chain storage minimal (hash + metadata). Store large corpus in content-addressed off-chain storage. Garbage collection of off-chain blobs is optional and does not affect protocol retention of KB identity and lineage.

See [INVARIANTS.md](INVARIANTS.md) §1.6 (Permanent Retention).

### 1.6 Architecture (Data Flow)

Identity and settlement flow in one direction:

**Offline math → On-chain anchor → Subgraph reflection → Economic settlement → Verifiable proof.**

1. **Offline math:** Canonicalize envelope (JCS), compute `kbHash` and `artifactHash` per §2. No blockchain required.
2. **On-chain anchor:** `publishKB(kbHash, …)` registers the KB; the contract uses the `contentHash` field name but the value is `kbHash`, and it does not recompute it.
3. **Subgraph reflection:** The indexer (e.g. The Graph) does **not** compute identity. It only reflects event data (e.g. `contentHash` from `KBPublished`, which equals `kbHash`). Same deterministic ID logic → indexer is a pure reflection layer.
4. **Economic settlement:** `settleQuery(kbHash, …)` and pull withdrawals.
5. **Verifiable proof:** Proof-from-logs; proof hash is deterministic per proof spec.

### 1.7 On-Chain Trust Model (Normative)

The registry contract **accepts a precomputed kbHash** (field name `contentHash`) and **does not recompute** it from envelope fields. There is no internal canonicalization or hashing of envelope data on-chain.

- **Implication:** The caller (SDK, client, or indexer pipeline) is responsible for computing `kbHash` per §2 before calling `publishKB(kbHash, …)`. The contract uses the `contentHash` field solely as the key for storage and lookup.
- **Verification:** Any party that needs to verify identity must recompute `kbHash` off-chain from the canonical envelope and compare; the contract does not perform this check. This keeps the contract simple and gas-efficient and places consensus-critical hash rules in the spec and reference implementation (§7), not in the contract bytecode.

- This design keeps contracts minimal and gas-efficient while allowing any implementation to independently verify identity correctness off-chain.

### 1.8 Indexing and Authority

If ID logic is deterministic and stable, the subgraph is a pure indexing layer. If ID logic were opaque or mutable, the indexer would become a mirror of SDK authority. This spec freezes §2 so that any compliant implementation (Rust, Go, Python, TypeScript) produces the same `kbHash`; indexers then reflect that single source of truth.

---

## 2. Canonical Serialization

**Consensus-critical / Frozen:** The rules in §2 (canonicalization and hashing) are **consensus-critical**. Changing them would change `kbHash` for existing envelopes and break cross-implementation agreement (silent fork risk). Therefore:

- §2 is **frozen** for this major version. Any change that alters the canonical hash for existing envelopes requires a **major spec version bump** and MUST be declared in the changelog.
- Reference implementation and scripts that compute `kbHash` or `artifactHash` MUST be versioned with the spec and MUST NOT change hash behavior without a major release.
- See [CONSENSUS-CRITICAL.md](CONSENSUS-CRITICAL.md) for the full consensus-critical surface.

### 2.0 Deterministic Formula (Normative)

The identity of a Knowledge Block is computed as follows. Implementations MUST derive `kbId` / `kbHash` in this way and no other.

1. **Envelope:** JSON object with `type`, `domain`, `sources`, `payload` (and optionally `derivation`). All keys camelCase.
2. **Sort sources:** Replace `sources` with its lexicographically sorted copy (same set of source kbIds, deterministic order).
3. **Canonical string:** Apply JCS (RFC 8785) to the envelope → single UTF-8 string (object keys sorted recursively; no whitespace).
4. **kbHash:** `0x` concatenated with the 64-character hexadecimal encoding of keccak256(`"KB_V1"` || canonical string).
5. **cidV1 (optional):** CIDv1, codec raw (0x55), multihash sha2-256 of the canonical UTF-8 bytes, Base32-encoded.

In notation:

```
canonical_string = JCS( envelope with sources sorted lexicographically )
kbHash          = "0x" || hex( keccak256( "KB_V1" || canonical_string ) )
```

Same envelope (after source sort) → same canonical string → same kbHash. No other inputs (no timestamp, curator, or signature).

### 2.1 Hash Preimage

The identity of a Knowledge Block is derived exclusively from a **canonical envelope**. The hash preimage MUST NOT include:

- Timestamp
- Curator address or signature
- Any non-deterministic or environment-specific data

Same envelope (after normalization) MUST produce the same `kbId` / `kbHash` in every implementation.

### 2.2 Canonicalization (JCS)

An implementation MUST canonicalize the envelope using **RFC 8785 (JCS)**-style rules:

- **Object keys:** Recursively sort all object keys **lexicographically**.
- **Arrays:** Preserve element order (only object keys are sorted).
- **Encoding:** UTF-8, minimal JSON (no unnecessary whitespace).
- **Primitives:** Numbers as JSON (integer when exact, otherwise JSON number); strings escaped per JSON; booleans as `true`/`false`; `null` as `null`.

The result is a single deterministic UTF-8 string. Any implementation that produces a different string for the same logical envelope is non-compliant.

**Formal Canonical Serialization Format (Normative):**

- **Format:** JSON (RFC 8259) encoding.
- **Key ordering:** All object keys sorted lexicographically (Unicode code point order), applied recursively to nested objects.
- **Encoding:** UTF-8. No Unicode normalization (NFD/NFKC) is applied beyond what JSON encoding implies.
- **Whitespace:** None. No non-significant spaces, newlines, or indentation.
- **Arrays:** Element order preserved; only object keys are reordered.
- **Types:** Non-JSON types (including BigInt) are invalid and MUST be rejected.

### 2.3 Source Ordering (Source Ordering Normalization Rule)

**Rule:** The `sources` array MUST be normalized before inclusion in the hash preimage. Normalization consists of lexicographic (string) sort. The same set of source kbIds in any input order MUST yield the same ordered array; implementations MUST apply this normalization before canonicalization.

The envelope contains a `sources` array (list of source kbIds). Before canonicalization, an implementation MUST:

- Sort `sources` **lexicographically**. The same set of sources in any input order MUST yield the same sorted array and thus the same hash.
- Ensure sources are **unique**: no duplicate kbIds in the array.
- Ensure **no self-reference**: a KB MUST NOT include its own kbId in `sources` (a KB cannot be its own source).

### 2.4 Content Hash

Alexandrian Core uses a **dual‑hash strategy**:

- **artifactHash:** `keccak256(payload_bytes)` — binds the envelope to the actual artifact bytes.
- **kbHash:** `keccak256("KB_V1" || JCS(envelope))` — canonical identity for the KB (kbId). The on-chain field name is `contentHash`, but its value MUST be the `kbHash`.
- **cidV1:** CIDv1 with codec **raw** (0x55) and multihash **sha2‑256** of the canonical UTF‑8 bytes. Base32‑encoded. This may differ from kbHash (keccak256). CID exists for IPFS compatibility only.

Implementations MUST compute kbHash from the canonical envelope string only. The envelope MUST include `artifactHash` so the identity commits to both lineage and content integrity.

---

## 3. Envelope Structure

The envelope is a JSON object. All keys in the serialized form MUST use **camelCase**.

### 3.1 Required Top-Level Fields

| Field     | Type     | Requirement |
|-----------|----------|-------------|
| `type`        | string   | Schema identifier (schemaId): one of the canonical artifact types (see §4). |
| `domain`      | string   | Domain classification (e.g. `software.security`). |
| `sources`     | string[] | Zero or more source kbIds (kbHashes). MUST be sorted lexicographically before hashing. |
| `artifactHash`| string   | `keccak256(payload_bytes)` — binds the envelope to the artifact bytes. |
| `tier`        | string   | Access tier: `open` \| `verified` \| `premium` \| `restricted` (committed in identity hash). |
| `payload`     | object   | Type-specific payload; MUST conform to the schema for `type`. |

**Tier semantics (normative):**

- **open**: free settlement permitted; no gating.
- **verified**: querier must satisfy minimum trust requirements (off-chain policy); settlement may be nominal.
- **premium**: paid settlement, full economic routing.
- **restricted**: curator/allowlist enforcement; settlement requires authorization.

Tier is committed into `kbHash` and therefore immutable after publication.

### 3.2 Optional: Derivation

If the KB is produced by deterministic synthesis from other KBs, the envelope MAY include:

| Field        | Type   | Requirement |
|--------------|--------|-------------|
| `derivation` | object | `type` (compose | transform | extract | summarize), `inputs` (array of `{ kbId, selectors }`), `recipe` (object). Every `inputs[].kbId` MUST appear in `sources`. |

When `derivation` is present, `payload` MUST still conform to one of the artifact types (strict schema-preserving composition).

### 3.3 Metadata Separation

**Canonical envelope** (hashed) and **signed metadata** (curator, timestamp, signature) are separate. The signature and timestamp MUST NOT be part of the hash preimage. They may be stored or transmitted alongside the envelope but do not affect kbId.

---

## 4. Payload Schemas (Tier 0 + Tier 1 Artifact Types)

Every envelope `payload` MUST conform to exactly one of the following types. The envelope field `type` MUST match `payload.type`.

Additional canonical types supported by Core 1.0:
`factual`, `derived`, `procedure`, `toolDefinition`, `codebank`, `researchArtifact`, `knowledgeGraph`, `agentMemory`,
`evaluation`, `capability`, `agentIdentity`, `demandBeacon`.

### Tier 0: Curator-Published Foundational KBs

| type                | Required payload fields (camelCase) |
|---------------------|-------------------------------------|
| `practice`          | `rationale` (string), `contexts` (array), `failureModes` (array) |
| `feature`           | `interfaceContract` (object), `testScaffold` (object) |
| `stateMachine`      | `states` (array), `transitions` (array), `invariants` (array) |
| `promptEngineering` | `template` (string), `modelVersion` (string), `evalCriteria` (array) |
| `complianceChecklist` | `jurisdictionTags` (string[]), `requirements` (array of `{ id, description, isMandatory }`), `evidenceMapping` (object with `type`, `validationLogic`) |
| `rubric`            | `dimensions` (array of `{ criterion, weight }`), `scoringLogic` (string), `thresholds` (object with `pass`, `escalate`) |

### Tier 1: Archivist-Derived KBs

| type          | Required payload fields (camelCase) |
|---------------|-------------------------------------|
| `synthesis`   | `question` (string), `answer` (string), `citations` (object: sourceKbId → excerpt) |
| `pattern`     | `pattern` (string), `occurrences` (array of `{ kbHash, context }`), `applicability` (string) |
| `adaptation`  | `targetDomain` (string), `adaptedContent` (string), `tradeoffs` (string[]) |
| `enhancement` | `concern` ("observability" \| "security" \| "performance" \| "accessibility"), `enhancedContent` (string) |

An implementation MUST reject envelopes whose `payload` does not match the schema for the declared `type`. Detailed field semantics are specified in the Artifact Type Registry; this spec defines the minimal required shape for hashing and validation.

---

## 5. Lineage and Royalty DAG

### 5.1 Provenance Graph

- Each KB has a set of **sources** (kbIds). The relationship is directional: this KB is derived from (or attributes) those sources.
- **Sources MUST be unique:** No duplicate kbIds in the `sources` array.
- **No self-reference:** A KB MUST NOT reference itself; its own kbId MUST NOT appear in `sources`. Because kbId is content-addressed (derived from the envelope including sources), a valid envelope cannot contain its own kbId in `sources`—self-reference is excluded by construction.
- The graph formed by edges from each kbId to its sources MUST be **acyclic**. Registration of a KB whose source set would introduce a cycle MUST be **rejected**.

### 5.2 Attribution

- Fee distribution (royalty) is defined over this DAG: query fees paid for a KB may be split among its sources according to implementation- or contract-defined rules.
- The spec does not prescribe the exact split algorithm; it requires that lineage is acyclic so that distribution is well-defined.

### 5.3 Derived Blocks

For envelopes with `derivation`:

- Every entry in `derivation.inputs` MUST reference a kbId that appears in `sources`. Implementations MUST reject envelopes where any `inputs[].kbId` is not in `sources`.

### 5.4 Security Model of Derivation

Derived Blocks (KB with `derivation`) are secured by the following model:

1. **Provenance binding:** Every `derivation.inputs[].kbId` MUST appear in `sources`. This binds the derivation to explicit, content-addressed sources. Implementations MUST reject envelopes where an input references a kbId not in `sources`.
2. **Schema-preserving composition:** The derived `payload` MUST conform to one of the six artifact types. Derivation does not introduce new payload shapes; composition is strictly type-preserving.
3. **Deterministic identity:** The derived KB's `kbId` is computed identically to any other envelope—canonical serialization of (type, domain, sources, payload, derivation). No special-case hashing for derived blocks.
4. **Lineage integrity:** The derivation graph is subject to the same acyclicity and source-uniqueness rules as the provenance DAG. Cycles and duplicate sources are rejected.

### 5.5 Agent Identity Continuity

Agent identities can be represented as `agentIdentity` KBs. Continuity across key rotation is expressed via:

- `sources[]` linking to the prior identity KB, and
- on‑chain `identityChain[previous] = newIdentity` linkage.

Verification of recovery proofs is performed off‑chain using the identity payload (recoveryCommitment / recoveryProof).

This model ensures that derived KBs are verifiable, reproducible, and attribution-preserving.

---

## 6. Invariants (Normative)

The following invariants are the **law** of the protocol. Implementations (contracts, runtimes, conformance mocks) MUST uphold them. Violation means non-compliance.

| Invariant | Summary |
|-----------|---------|
| **KB immutability (no in-place update)** | A KB hash must never change; updates create new KBs; repository grows as a DAG. See §1 (Core Invariant). |
| **Permanent retention** | Old KB versions must always be kept; after anchoring, permanent; no deletion of anchored KBs. Deprecation = metadata only. See §1.5, [INVARIANTS.md](INVARIANTS.md) §1.6. |
| **Coordination: explicit hash only** | Tasks/coordination MUST reference explicit KB hashes; never symbolic namespace or `Namespace@latest` in consensus- or replay-critical paths. See §1.4. |
| **Graph topology: DAG, fork-neutral** | Provenance graph is a DAG; multiple KBs may derive from same parent; forks allowed; protocol does not enforce single “correct” structure or which branch is “better.” Clean structure = resolver policy. See §1.4. |
| **Lineage acyclicity** | Provenance graph has no cycles; registration that would create a cycle is rejected. |
| **Content-addressed identity** | kbId is derived only from canonical envelope; no timestamp, curator, or signature in preimage. |
| **Slashing (when applicable)** | Collateral ceiling per KB; no guilt-by-association; slash only on Rubric or Security Review proof. |
| **Separation of concerns** | Registry = existence and lineage; Royalty = fee distribution; Stake = collateral and slashing. |

These invariants constrain structure and determinism only. They do not prescribe governance, ranking, or truth semantics.

The subsections below are normative.

### 6.0 KB Immutability (No In-Place Update)

A KB hash must **never** change. Updates cannot modify a KB; they must **create new KBs**. Evolution is by creating new KBs that reference prior KBs in `sources`; the repository grows as a **DAG** of snapshots. Implementations MUST NOT allow mutation of an existing KB’s identity (kbHash). See §1 (Core Invariant, Clean Design Pattern, Repository as DAG) and [INVARIANTS.md](INVARIANTS.md) §1.5.

### 6.1 Lineage Acyclicity

The provenance graph MUST remain acyclic. Registration that would create a cycle MUST be rejected.

### 6.2 Content-Addressed Identity

The kbId MUST be derived solely from the canonical envelope (content + lineage). No timestamp, curator, or signature in the preimage.

### 6.3 Slashing (When Applicable)

If the implementation includes slashing:

- **Collateral ceiling:** A slash for a single KB MUST NOT exceed the amount allocated to that KB’s safety buffer.
- **Attribution persistence:** Slashing a descendant KB does not by itself imply slashing a source; sources are slashed only on independent proof of failure.
- **Deterministic triggering:** A slash MUST only be executed when authorized by a Rubric Block evaluation (automated, verifiable proof) or a Security Review (signed by a sufficient number of high-reputation auditors as defined by the implementation).

### 6.4 Separation of Concerns

- **Registry:** Existence and lineage only (“what” is registered). No royalty or stake logic in the registry identity layer.
- **Royalty / Settlement:** Fee routing and distribution.
- **Stake / Collateral:** Allocation and slashing.

These concerns MAY be implemented in separate interfaces or modules. Mixing registry identity with royalty BPS or stake in the same logical layer violates the intended separation.

### 6.5 Formal Invariants (Academically Defensible)

The following invariants are stated formally for auditability and academic defense:

| Invariant | Formal Statement |
|-----------|------------------|
| **Deterministic Identity** | For any canonical envelope E, `kbId(E)` is a pure function of E. No external inputs (timestamp, curator, nonce) affect the result. `kbId(E) = kbHash(JCS(normalize(E)))`. |
| **Source Uniqueness** | The `sources` array MUST contain no duplicate kbIds. For envelope E, `|sources(E)| = |unique(sources(E))|`. |
| **Cycle Exclusion** | The provenance graph G = (V, E) with vertices V = registered kbIds and edges (v, u) when u ∈ sources(v) MUST be acyclic. Registration that would create a cycle MUST be rejected. |
| **KB Immutability (No In-Place Update)** | A KB hash must never change. Updates cannot modify a KB; they must create new KBs. Evolution is by creating new KBs that reference prior KBs in `sources`; the repository grows as a DAG. See §1 (Core Invariant) and [INVARIANTS.md](INVARIANTS.md) §1.5. |
| **Permanent Retention** | Anchored KBs must not be deleted. Old versions kept forever; deprecation is metadata only. Deletion only if KB was invalid or never finalized. See §1.5, [INVARIANTS.md](INVARIANTS.md) §1.6. |
| **Coordination: Explicit Hash Only** | Tasks and coordination objects must reference explicit KB hashes. Never symbolic namespace or `Namespace@latest` in stateHash, proof, or replay. See §1.4. |
| **Hash Stability** | Given envelopes E₁ and E₂ such that `normalize(E₁) = normalize(E₂)` (same logical content after source sort and canonicalization), then `kbId(E₁) = kbId(E₂)` in all implementations. |
| **Envelope Serialization** | The canonical form of an envelope is a single UTF-8 string produced by JCS (RFC 8785): lexicographic key ordering, no whitespace, deterministic number encoding. Arrays preserve element order; object keys are sorted recursively. |

---

## 7. Conformance

### 7.0 Reference Implementation (Normative)

The TypeScript package **`@alexandrian/protocol`** provides the normative reference for §2:

- **`canonicalize(envelope)`** — JCS-style canonical string (key sort, no whitespace).
- **`contentHashFromCanonical(canonicalString)`** — `0x` + hex(keccak256(canonicalString)).
- **`kbHashFromEnvelope(envelope)`** — normalize sources, then canonicalize + keccak256(`"KB_V1"` || canonical string).

Equivalent in pseudocode: `computeKbHash(envelope) = keccak256("KB_V1" || jcsCanonicalize(normalize(envelope)))`. Anyone may reimplement this in Rust, Go, Python, or any language; same inputs MUST yield the same `kbHash`. Scripts such as **`scripts/compute-root-artifact-hash.mjs`** are reference consumers (they use the protocol package or the same algorithm). They are versioned with the spec and treated as consensus-critical: do not change hash behavior without a major spec version bump.

### 7.1 Test Vectors

A set of **test vectors** is provided: for each vector, an envelope (JSON) and the expected `kbHash` (and optionally `cidV1`) are given. An implementation that claims compliance MUST:

1. Load each envelope.
2. Sort `sources` lexicographically.
3. Canonicalize per §2.2.
4. Compute kbHash per §2.4.
5. Assert the result equals the expected value for that vector.

The location and format of the test vectors are defined in the repository (e.g. `test-vectors/canonical/` with `envelope.json` and `expected.json` per vector). Adding or changing vectors MUST preserve backward compatibility for existing vector IDs or version the spec.

**Multi-language conformance:** Recomputing `kbHash` from each vector in multiple languages (e.g. Rust, Go, Python) and asserting equality with `expected.kbHash` is recommended for standardization and to avoid implementation drift. The test vectors are the normative input/output pairs; the reference implementation is one compliant implementation.

### 7.2 Conformance Mock

A **conformance mock** (or “strict mock”) may enforce, without a blockchain:

- Source array sorted lexicographically; reject otherwise.
- Source array free of duplicates; reject duplicate sources (error: INVALID_ENVELOPE or equivalent).
- No self-reference; reject envelopes where sources contain the envelope's own kbId.
- No cyclic lineage; reject registration that would create a cycle.
- Payload schema validity for the declared type.
- For derived envelopes: every `derivation.inputs[].kbId` in `sources`.

Such a mock provides a way to test compliance with this spec without running a full chain. Implementations may use it as a reference for “stricter than mainnet” validation.

---

Run `pnpm test:spec` to execute canonical and invariant conformance tests without starting the API, blockchain, or LLM.

---

## 8. Proof format (normative)

Settlement-backed proofs for agent responses and MCP headers are defined by a separate normative spec so that proof hashes are deterministic and cross-language reproducible.

- **Spec:** [docs/proof-spec-v1.md](proof-spec-v1.md) — version `alexandrian-proof/1`, JCS canonicalization, proof hash = keccak256(UTF8(JCS(proof))), optional payload binding.
- **Implementations** that produce or verify proofs MUST conform to that document for the proof object schema, canonical serialization, and hash algorithm.

## 9. References

- **Coordination Object (design):** [COORDINATION-OBJECT-SPEC.md](COORDINATION-OBJECT-SPEC.md) — CO schema, constraint DSL, task state machine; next-layer primitive; not M1.
- **Consensus-critical surface:** [CONSENSUS-CRITICAL.md](CONSENSUS-CRITICAL.md) — frozen hash rules, reference implementation, script, test vectors.
- **RFC 8785:** JSON Canonicalization Scheme (JCS).
- **CID:** Content Identifier (multiformats). CIDv1, codec raw (0x55), multihash sha2-256.
- **Proof format:** [proof-spec-v1.md](proof-spec-v1.md) — canonical proof object, JCS, proof hash.
- **Artifact modes:** [ARTIFACT-MODES.md](ARTIFACT-MODES.md) — public/encrypted artifact binding.
- **KB commitment:** [KB-COMMITMENT.md](KB-COMMITMENT.md) — KBs as commitments to artifact bytes.
- **Core 1.0 completion:** [CORE-1.0.md](CORE-1.0.md) — frozen consensus surface and completion criteria.
- **Mainnet verification:** [MAINNET-VERIFICATION.md](MAINNET-VERIFICATION.md) — Base mainnet reproducibility report.
- **Artifact Type Registry:** Detailed payload semantics per type (see repository docs).
- **Test vectors:** See repository `test-vectors/canonical/` and serialization test vector documentation.

---

## 10. Versioning

This spec is versioned (e.g. 1.0.0). Implementations may state which spec version they target. Changes that alter the canonical hash for existing envelopes or that add mandatory fields to the envelope are breaking and require a major version bump.
