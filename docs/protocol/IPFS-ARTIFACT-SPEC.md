# IPFS Artifact Specification

**Status:** Design
**Version:** 0.1
**Date:** 2026-03-08
**Relates to:** `CANONICAL-ENVELOPE-SPEC.md`, `PROTOCOL-SPEC.md`

---

## Purpose

This document specifies the structure, schema, and pipeline for IPFS artifact bundles in the Alexandrian Protocol. Every Knowledge Block (KB) published to Base has a corresponding IPFS artifact bundle. The bundle is the off-chain complement to the minimal on-chain commitment.

On-chain, a KB stores three fields that relate to IPFS:

```
artifactHash  — keccak256 of artifact.json bytes
rootCid       — IPFS CIDv1 of the bundle root directory
```

The integrity invariant is:

```
keccak256(fetch(rootCid + "/artifact.json")) == KB.artifactHash
```

Any byte-level change to `artifact.json` invalidates verification. Storage location (`rootCid`) is replaceable without changing KB identity (`kbHash`).

---

## Two Artifact Types

The protocol defines two distinct IPFS artifact types with different roles:

### Type A — KB Bundle (one per published KB)

A folder pinned to IPFS that contains the canonical content of a single Knowledge Block. The `rootCid` stored on-chain points to this folder.

### Type B — Reference Artifact (shared, cited by many KBs)

A single JSON file pinned to IPFS representing a shared knowledge reference — patterns, standards, checklists, invariant catalogs. Many KBs can cite the same reference artifact by its CID. Reference artifacts are not hash-committed per-KB; they are linked by URI in the `artifactRefs` field of `artifact.json`.

---

## Type A: KB Bundle

### File Structure

Every KB bundle has exactly three files. No exceptions.

```
{rootCid}/
├── artifact.json     REQUIRED. Canonical hash target.
├── manifest.json     REQUIRED. File listing and bundle metadata.
└── meta.json         REQUIRED. Lightweight indexer sidecar.
```

No `docs/`, `evidence/`, or `refs/` directories are included in generated KB bundles. The hand-crafted demo bundles (`ipfs/kb-d/`, `ipfs/kb-f/`) pre-date this spec and are not the canonical pattern for production KBs.

### artifact.json

The canonical hash target. `keccak256` of these bytes must equal `KB.artifactHash` on-chain. This file contains the complete, normalized KB content. Pipeline-internal fields (`_quality`, `repairAttempts`, `scoredAt`) are excluded.

Field order is canonical and alphabetical within each object. Any reordering changes the hash.

**Schema:**

```typescript
interface KBArtifact {
  // Identity
  schemaVersion:  "2.5";
  kbHash:         string;           // "0x{64 hex}" — matches on-chain kbHash

  // Classification
  kbType:         KBType;           // "Practice" | "Feature" | "StateMachine" |
                                    // "PromptEngineering" | "ComplianceChecklist" | "Rubric"
  epistemicType:  EpistemicType;    // "procedural" | "declarative" | "heuristic" |
                                    // "invariant" | "empirical"
  domain:         string;           // e.g. "web3.security", "sysarch.kubernetes"

  // Content
  title:          string;
  summary:        string;           // ≤ 280 characters
  tags:           string[];
  capabilities:   string[];
  confidence:     number | null;    // 0.0–1.0 or null

  // Typed payload — exactly one of these four fields is present
  payloadType:    "procedure" | "checklist" | "reference" | "specification";
  procedure?:     ProcedureStep[];
  checklist?:     ChecklistItem[];
  reference?:     ReferenceContent;
  specification?: SpecificationContent;

  // Verification
  verification: {
    successConditions: string[];
    failureConditions: string[];
    metrics:           string[];    // must contain ≥ 1 formula (e.g. "p99 < 200ms")
  };

  // Interface
  interface: {
    inputs:  IOField[];
    outputs: IOField[];
  };

  // References to shared Type B artifacts (URI only, no inline copy)
  artifactRefs: ArtifactRef[];

  // Lineage
  parentHashes: string[];           // up to MAX_PARENTS (8)
  royaltyBps:   number;            // 0–10000
  isSeed:       boolean;

  // Provenance
  publishedAt:  string;            // ISO 8601
}
```

**Supporting types:**

```typescript
interface ProcedureStep {
  step:      number;
  action:    string;
  inputs?:   string[];
  produces?: string[];
  condition?: string;
}

interface ChecklistItem {
  item:      string;
  rationale?: string;
  produces?: string;
}

interface ReferenceContent {
  invariants:    string[];
  patterns?:     { name: string; description: string }[];
  examples?:     { title: string; code?: string; description: string }[];
}

interface SpecificationContent {
  formalDefinition: string;
  invariants:       string[];
  proofSketch?:     string;
  complexityBounds?: { time?: string; space?: string };
}

interface IOField {
  name:        string;
  type:        string;
  description: string;
}

interface ArtifactRef {
  uri:   string;    // "ipfs://{CIDv1}"
  name:  string;    // e.g. "kubernetes_deployment_patterns"
  type:  string;    // matches UniversalArtifactType in artifact-registry.ts
}
```

**Payload type selection guide:**

| `payloadType`   | Use when                                                   | Examples                             |
|-----------------|------------------------------------------------------------|--------------------------------------|
| `procedure`     | KB is an ordered sequence of executable steps             | Ops runbooks, config recipes, deploys|
| `checklist`     | KB is a set of verifiable pass/fail items                  | Audits, pre-deploy gates, compliance |
| `reference`     | KB is a catalog of invariants, patterns, or examples       | API standards, pattern libraries     |
| `specification` | KB is a formal definition with invariants or proofs        | Algorithms, consensus protocols, ZKP |

### manifest.json

```json
{
  "manifestVersion": "1",
  "kbHash": "0x...",
  "rootCid": "bafybei...",
  "generatedAt": "2026-03-08T00:00:00Z",
  "files": [
    { "path": "artifact.json", "role": "canonical_hash_target" },
    { "path": "manifest.json", "role": "manifest"              },
    { "path": "meta.json",     "role": "indexer_sidecar"       }
  ]
}
```

`rootCid` is written by the bundle pipeline after pinning. Before pinning it is `"PENDING"`.

### meta.json

A lightweight sidecar for indexers and The Graph. This file has no verification role — it is not part of the hash computation and may be updated without invalidating `artifactHash`. Its purpose is to make discovery fast without fetching and parsing `artifact.json`.

```json
{
  "kbHash":      "0x...",
  "title":       "...",
  "domain":      "web3.security",
  "kbType":      "ComplianceChecklist",
  "payloadType": "checklist",
  "tags":        ["solidity", "security", "audit"],
  "isSeed":      true,
  "score": {
    "classification": "anchor",
    "weighted": 2.8
  },
  "publishedAt": "2026-03-08T00:00:00Z"
}
```

---

## Type B: Reference Artifact

A single JSON file pinned to IPFS. Many KB bundles can reference the same CID. Reference artifacts are versioned independently of any KB.

### File Structure

```
{CIDv1}          (single file, no directory)
└── artifact.json
```

### Schema

Reference artifacts follow the existing `UniversalArtifact` schema defined in `packages/generator/src/lib/artifacts/universal-artifact-schema.ts`.

```json
{
  "schemaVersion": "alexandrian.artifact.v1",
  "name":          "smart_contract_security_patterns",
  "type":          "patterns_reference",
  "domain":        "web3.security",
  "title":         "Smart Contract Security Patterns",
  "version":       "1.0",

  "invariants":    ["..."],
  "procedures":    [{ "name": "...", "steps": ["..."] }],
  "checklists":    [{ "name": "...", "items": ["..."] }],
  "patterns":      [{ "name": "...", "description": "..." }],
  "tradeoffs":     [{ "option": "...", "pros": [], "cons": [] }],
  "anti_patterns": ["..."],
  "references":    ["https://..."]
}
```

### Citing a Reference Artifact from a KB Bundle

In `artifact.json`, list reference artifacts by CID in `artifactRefs`. No inline copy:

```json
"artifactRefs": [
  {
    "uri":  "ipfs://bafybei...",
    "name": "smart_contract_security_patterns",
    "type": "patterns_reference"
  }
]
```

Rationale: IPFS is content-addressed. The CID is the snapshot. Copying the file into every KB bundle that cites it would bloat storage and fragment the reference. One CID, cited by N KBs.

---

## Attribution and Lineage in artifact.json

`parentHashes` in `artifact.json` mirrors the on-chain attribution DAG. A derived KB lists the `kbHash` values of its parents:

```json
"parentHashes": [
  "0x{kb-sec-1-hash}",
  "0x{kb-sec-2-hash}",
  "0x{kb-sec-3-hash}"
],
"royaltyBps": 300,
"isSeed": false
```

When a consumer settles the derived KB on-chain, the `settleQuery` contract function distributes ETH through the attribution DAG proportional to each ancestor's `royaltyBps`. The `artifact.json` content makes the lineage independently verifiable: any party can inspect the file without trusting the on-chain state, and then verify the on-chain state matches.

---

## Pipeline Integration

### New step: `bundle-artifacts`

Sits between `upgrade-seeds` (which produces `staging/refined/`) and `publish.mjs` (which publishes to Base).

```
staging/refined/{kbHash}.json          UpgradedKBEntry + _quality
        │
        ▼  --mode bundle-artifacts  (new)
        │  reads UpgradedKBEntry
        │  writes canonical artifact.json  (strips _quality, normalizes fields)
        │  writes manifest.json            (rootCid = "PENDING")
        │  writes meta.json
        │  pins folder to IPFS via Pinata  → real rootCid
        │  computes keccak256(artifact.json bytes)  → artifactHash
        │  writes staging/bundled/{kbHash}.json     { rootCid, artifactHash }
        │
        ▼
staging/bundled/{kbHash}.json
        │
        ▼  publish.mjs  (existing, updated to read bundled/)
        │  publishKB(kbHash, artifactHash, rootCid) on Base mainnet
        │
        ▼
staging/published/{kbHash}.json        { tx, blockNumber, gas }
```

### Verification CLI

```bash
# Positive vector (should return "verified")
node scripts/verify-kb-artifact.mjs \
  --cid bafybei... \
  --expected-hash 0xabc...

# Negative vector (should return "invalid")
node scripts/verify-kb-artifact.mjs \
  --cid bafybei... \
  --expected-hash 0xabc... \
  --tamper  # appends one byte before hashing
```

Output is machine-readable JSON:

```json
{ "result": "verified", "cid": "bafybei...", "computedHash": "0xabc...", "expectedHash": "0xabc..." }
{ "result": "invalid",  "cid": "bafybei...", "computedHash": "0xdef...", "expectedHash": "0xabc..." }
```

---

## What is Not Included in KB Bundles

| Item | Location | Reason excluded from bundle |
|---|---|---|
| `_quality` scores | `staging/refined/` only | Pipeline-internal, not consumer-facing |
| `repairAttempts` | `staging/refined/` only | Pipeline-internal |
| `docs/specification.md` | kb-d / kb-f demo only | `artifact.json` is the spec for generated KBs |
| `evidence/` | kb-d / kb-f demo only | Not generated for pipeline KBs |
| Reference artifact content | Separate IPFS object | Referenced by CID, not copied inline |

---

## Priority Reference Artifacts (P1)

Six reference artifacts to generate and pin first, in priority order. These unlock the reference field for the demo KB set.

| Name | Type | Unlocks |
|---|---|---|
| `smart_contract_security_patterns` | patterns_reference | KB-SEC-1, 2, 3, 4 |
| `kubernetes_deployment_patterns` | patterns_reference | Kubernetes procedure KBs |
| `database_patterns` | procedures_reference | PostgreSQL KBs |
| `ml_training_patterns` | patterns_reference | ML training KBs |
| `ci_cd_pipeline_patterns` | patterns_reference | CI/CD KBs |
| `incident_response_runbooks` | procedures_reference | Postmortem KBs |

`secure_coding_guidelines` and `api_design_standards` already exist in `packages/generator/artifacts/` and need only IPFS pinning.
