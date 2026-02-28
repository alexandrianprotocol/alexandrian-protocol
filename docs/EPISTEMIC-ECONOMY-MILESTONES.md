# Milestones: From Protocol to Machine-Readable Epistemic Economy

**Purpose:** Break the **final goal** (a machine-readable epistemic economy — coordination protocol for machine knowledge markets) into concrete milestones. Each milestone adds a layer of capability without changing the core invariants (KB hash never changes; updates create new KBs; DAG).

**Reference:** [EPISTEMIC-ECONOMY-VISION.md](EPISTEMIC-ECONOMY-VISION.md) — what the system is; [M1-SCOPE-FREEZE.md](M1-SCOPE-FREEZE.md) — M1 scope.

---

## Overview

| Milestone | Theme | Outcome |
|-----------|--------|---------|
| **M1** | Core primitive + transaction layer | Done. Deterministic KB identity, publish, lineage DAG, settle, withdraw, proof. |
| **M2** | Live economy + discovery | Hosted subgraph, discovery APIs, ranking signals, SDK hardening. |
| **M3** | Market topology + roles | Curator/evaluator tooling, bundles/domains, reputation-weighted discovery. |
| **M4** | Epistemic signals + filtering | Reference count, derivation success, “economy ranks it” in product. |
| **M5** | Coordination layer (optional) | Task-level semantics, VCOs, multi-agent “continue without ambiguity” on top of KBs. |
| **M6** | Scale + governance | Multi-chain, decentralized governance, A2A verification. |

---

## M1 — Core Primitive and Transaction Layer ✅

**Goal:** A deterministic, content-addressed knowledge registry with settlement and proof. The **transaction layer for knowledge** between agents.

**Delivered:**

- KB = immutable snapshot; hash never changes; updates = new KBs; DAG.
- Identity: `contentHash` = kbId from canonical envelope (JCS, source sort).
- Registry: publishKB, lineage, royalty DAG, stake, slash.
- Settlement: settleQuery, withdrawEarnings, proof spec v1.
- SDK: publish, settle, verify; conformance tests; Base mainnet.

**Epistemic economy:** Creators publish; consumers settle; refiners create new KBs with prior in `sources`. Value flows along the DAG. **No discovery/ranking yet** — just the primitive and on-chain truth.

**Ref:** [M1-SCOPE-FREEZE.md](M1-SCOPE-FREEZE.md).

---

## M2 — Live Economy and Discovery

**Goal:** The same protocol, but **live** and **discoverable**. Agents can find KBs and use settlement in production.

**Deliverables:**

- **Live infrastructure:** Mainnet fork tests; hosted subgraph; IPFS/content resolution where needed; npm publish + provenance.
- **SDK hardening:** Result types through public API; retry/backoff; browser bundle; dApp examples.
- **Discovery:** Subgraph-backed “discover KBs” API (by domain, type, recent settlement); basic listing and filters.
- **Ranking signals (exposed):** Settlement count, lineage (parent/child counts) available from subgraph/indexer — not yet “ranking algorithm,” but data for it.
- **Artifact & expansion model:** [ARTIFACT-AND-EXPANSION-MODEL.md](ARTIFACT-AND-EXPANSION-MODEL.md) — primary artifact (M1), optional bound artifacts (identity-bound), advisory expansion (non-identity); storage-agnostic; discovery enrichment without changing kbHash or settlement.

**Epistemic economy:** Economic loop is **observable** in production. Agents can discover and settle; “usage signals accumulate” in data. Ranking is still minimal (e.g. “most recently settled” or “by domain”).

---

## M3 — Market Topology and Roles

**Goal:** The DAG is explicitly a **market topology**. Curators and evaluators are first-class; domains and bundles are usable.

**Deliverables:**

- **Curator/evaluator tooling:** Publish flows for “bundle” or “domain” views; optional attestations (e.g. Rubric blocks) linked to KBs.
- **Bundles/domains:** Organize KBs by domain or logical bundle; subgraph or indexer supports “list by domain,” “list by bundle.”
- **Reputation-weighted discovery:** KYA reputation influences “trending” or “recommended” (e.g. weight by curator reputation, settlement volume).
- **Cross-implementation conformance:** At least one other language (e.g. Rust, Python) passes same test vectors for contentHash/envelope.

**Epistemic economy:** “Agents choose which branch to build on” is supported by **discovery and reputation**. Roles (creators, curators, refiners, evaluators, consumers) are all representable; refiners still “create new KB, reference prior.”

---

## M4 — Epistemic Signals and Filtering

**Goal:** **Noise is naturally filtered by the economy.** Bad KBs become economically irrelevant; good KBs surface via signals.

**Deliverables:**

- **Reference count and derivation success:** Indexer exposes “how many KBs cite this KB,” “how many settlements to this KB,” “number of successful derivations (children).”
- **Discovery/ranking product:** APIs or UX that rank by: reference count, settlement count, derivation count, reputation weight, domain trust. No deletion of “bad” KBs — they just rank low.
- **Semantic indexing (optional):** Embedding search or semantic filters for “find KBs similar to X” without changing protocol identity.

**Epistemic economy:** “Higher-quality KBs dominate discovery” is **implemented**. The economy rewards useful knowledge; unused or low-value KBs remain on-chain but don’t surface.

---

## M5 — Coordination Layer 

**Goal:** Optional **task-level coordination** on top of KBs: shared task state, constraints, multi-agent “continue without ambiguity.” KB remains the epistemic primitive; coordination is an additional layer.

**Deliverables:**

- **Coordination objects (VCO-style):** Schema for “task step” or “coordination object” that references KBs (by contentHash), has objective/constraints/inputs/outputs/state transition type. Stored off-chain or in a separate layer; KBs still anchor evidence and identity.
- **Task state machine:** Defined states and transitions for “task” or “objective”; agents agree on “step 2” by referencing the same KBs and coordination objects.
- **Constraint language (minimal):** Machine-checkable constraints for “this step is valid iff …” without changing KB hashing.

**Epistemic economy:** “Multi-agent coordination around knowledge” — agents share structured claims, verify prior work, continue tasks without ambiguity. **KB = unit of contribution/attribution/settlement** unchanged; coordination is an optional protocol layer that uses KBs.

**Ref:** [COORDINATION-VISION-ALIGNMENT.md](COORDINATION-VISION-ALIGNMENT.md), [protocol/COORDINATION-OBJECT-SPEC.md](protocol/COORDINATION-OBJECT-SPEC.md).

---

## M6 — Scale and Governance

**Goal:** Production-scale epistemic economy: multiple chains, decentralized governance, agent-to-agent verification.

**Deliverables:**

- **Multi-chain deployment:** Same protocol (contentHash, envelope) on additional chains; cross-chain identity or bridge strategy.
- **Decentralized governance:** Fee parameters, slashing thresholds, or upgrade paths governed by token/stake (timelock, multisig, or DAO).
- **A2A protocol:** Agent-to-agent proof verification; standardized “request proof / verify proof” so agents can trust settlements across implementations.

**Epistemic economy:** The **transaction layer for knowledge** is global and governance-hardened. “Collective machine cognition” and “open research markets” can run on a decentralized, multi-chain substrate.

---

## Dependency Summary

```
M1 (done) → M2 (live + discovery)
          → M3 (market topology + roles)
          → M4 (signals + filtering)
          → M5 (coordination, optional)
          → M6 (scale + governance)
```

M2–M4 can be parallelized in parts (e.g. SDK hardening vs discovery). M5 builds on stable M2–M4 discovery and identity. M6 assumes a healthy single-chain economy (M2–M4) before scaling out.

---

## What Stays Invariant Across All Milestones

- **KB hash never changes.** Updates create new KBs.
- **Repository = DAG.** Lineage acyclic; no in-place mutation.
- **KB = immutable registry entry** committing to a snapshot (schema, interface, integrity root).
- **Settlement and attribution** flow along the DAG; value is per epistemic contribution (per KB).

The epistemic economy **is** this protocol, extended by discovery, roles, ranking, optional coordination, and scale — not a different product.
