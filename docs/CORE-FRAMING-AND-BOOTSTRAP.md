# Core Framing + Boot Sequence

**Purpose:** The two pillars that define what Alexandrian is and how it gets off the ground: (1) **TCP/IP for cognition** — an interoperability layer, not a single app; (2) **First 10 KBs** — the boot sequence that makes the graph self-growing.

**Ref:** [EPISTEMIC-ECONOMY-VISION.md](EPISTEMIC-ECONOMY-VISION.md), [protocol/PROTOCOL-SPEC.md](protocol/PROTOCOL-SPEC.md). **Production primitives:** [kb-primitives/](kb-primitives/) — KB-000 through KB-019 (physics, selection, coordination, governance); [kb-primitives/IMPLEMENTATION-MAPPING.md](kb-primitives/IMPLEMENTATION-MAPPING.md) maps KB-000–004 to the normative M1 protocol.

---

## 1. Why This Is Closer to TCP/IP for Cognition Than a Blockchain App

A “blockchain app” usually means: one product, one UX, one use case.

What we’re building — when the KB is **canonical, immutable, addressable, and composable** — is an **interoperability layer** that many apps and agents can share **without coordinating with each other**.

### TCP/IP analogy (tight mapping)

| TCP/IP | Alexandrian |
|--------|-------------|
| Standardizes how **packets** are addressed, routed, and verified (checksums), regardless of application (email, web, video). | Standardizes how **knowledge units** are addressed (kbHash / contentHash), linked (parents / DAG), verified (canonical serialization + hash), and discovered (indexes / bundles), regardless of application (security playbooks, tutoring, codegen, scientific claims). |
| **Product** = the rules that let independent producers and consumers interoperate. | **Product** = the rules that let independent producers and consumers interoperate. |

So the “product” is not the app. The product is the **rules** that enable permissionless composition.

### Permissionless composition

**TCP/IP unlocked:**

- Anyone can publish a server.
- Anyone can build a browser.
- They still work together.

**The KB layer unlocks:**

- Anyone can publish a KB.
- Anyone can build agents that consume KBs.
- Derivations and refinements **compose without prior agreement**.

That is why **“epistemic economy”** is the right endgame: once interoperability exists, **markets form on top** — discovery, curation, evaluation, premium bundles, paid execution, etc.

---

## 2. The First 10 KBs: Bootstrap Evolution Correctly

The first KBs should do one job: **make the graph self-growing.**

Don’t publish “random patterns.” Publish KBs that become **foundations** agents will repeatedly depend on.

### Bucket A — The protocol’s “physics” (KBs that everything references)

| ID | Title | Role |
|----|-------|------|
| **KB-000** | Knowledge Block Envelope Spec (M1) | [kb-primitives/KB-000.md](kb-primitives/KB-000.md) — Fields, hash scope, invariants. |
| **KB-001** | Canonical Serialization Pipeline | [kb-primitives/KB-001.md](kb-primitives/KB-001.md) — Deterministic steps: normalize → canonical JSON → domain-separated hash. |
| **KB-002** | Domain-Separated Hashing Rules | [kb-primitives/KB-002.md](kb-primitives/KB-002.md) — Prefixes; prevents cross-type collisions. |
| **KB-003** | Lineage DAG Semantics | [kb-primitives/KB-003.md](kb-primitives/KB-003.md) — Parents, acyclicity, derivation meaning. |
| **KB-004** | Verification & Retrieval Procedure | [kb-primitives/KB-004.md](kb-primitives/KB-004.md) — Chain anchor + artifact + recomputation; no trusted authority. |

**Why these matter:** Every later KB can **cite** them instead of re-explaining “what is a KB.” Agents can automate publication and validation.

### Bucket B — Anti-noise + selection (KBs that keep the ecosystem sane)

| ID | Title | Role |
|----|-------|------|
| **KB-005** | Quality Signals + Ranking Heuristic (M1) | Reference count, successful derivations, curator inclusion, staleness, contradictions. |
| **KB-006** | Namespace & Domain Governance (Founder-curated M1) | Domain ownership rules, collision policy, reserved prefixes, deprecation semantics. |
| **KB-007** | Competing Claims & Contradiction Protocol | How to publish an alternative, how to link “disagreesWith,” how agents choose. |

**Why these matter:** You don’t “delete noise”; you **route attention** deterministically.

### Bucket C — Show it working (high-leverage patterns agents will reuse)

| ID | Title | Role |
|----|-------|------|
| **KB-008** | “Task → KB Gap → KB Submission” Pattern | How agents detect missing KBs from failures and generate new KBs. |
| **KB-009** | Bundle Construction + Merkle Root Pattern | Bundles as curated retrieval sets; Merkle root for integrity; enables “packaged knowledge.” |

**Why these matter:** They turn the system from a **registry** into a **living pipeline**.

### Coordination layer (KB-010 → KB-014)

Coordination, cooperation, and value flow. Independent agents stop being isolated publishers and start forming a **machine-native economy**. M1-compatible; no heavy staking required.

| ID | Title | Primitive |
|----|--------|-----------|
| **KB-010** | Task Object & Deterministic Intent | [kb-primitives/KB-010.md](kb-primitives/KB-010.md) — Work requests: intent + constraints; evaluatable. |
| **KB-011** | Capability Advertisement Protocol | [kb-primitives/KB-011.md](kb-primitives/KB-011.md) — Agents declare what they can do; specialization. |
| **KB-012** | Submission Settlement Protocol | [kb-primitives/KB-012.md](kb-primitives/KB-012.md) — Task resolved; winning KB; deterministic evaluation. |
| **KB-013** | Attribution & Royalty Graph | [kb-primitives/KB-013.md](kb-primitives/KB-013.md) — Value propagation along DAG; incentivizes composition. |
| **KB-014** | Reputation Accumulation Model | [kb-primitives/KB-014.md](kb-primitives/KB-014.md) — Trust from measurable performance; no voting. |

**Coordination loop:** Problem → Task → Capability match → KB submission → Deterministic settlement → Attribution propagation → Reputation update → Future task routing improves. This is a **self-improving agent economy**.

### Governance layer (KB-015 → KB-019)

How the system **changes without breaking trust** — without a voting DAO or centralized authority. Governance as **verifiable process**, not opinion.

| ID | Title | Primitive |
|----|--------|-----------|
| **KB-015** | Protocol Upgrade Proposal (PUP) | [kb-primitives/KB-015.md](kb-primitives/KB-015.md) — Upgrades as KB-like artifacts; adoption, not global switch. |
| **KB-016** | Resolver & Version Negotiation | [kb-primitives/KB-016.md](kb-primitives/KB-016.md) — Which ruleset interprets a KB; compatible subset. |
| **KB-017** | Forking & Parallel Epistemic Universes | [kb-primitives/KB-017.md](kb-primitives/KB-017.md) — Incompatible branches coexist; shared history until divergence. |
| **KB-018** | Governance Legitimacy Signals | [kb-primitives/KB-018.md](kb-primitives/KB-018.md) — Influence from adoption × productivity. |
| **KB-019** | Canonicality Emergence (Soft Consensus) | [kb-primitives/KB-019.md](kb-primitives/KB-019.md) — Default version emerges; not declared. |

**Outcome:** Evolve rules, survive disagreement, resist capture, upgrade safely, maintain historical truth — without admins or central control.

### Full stack

```
Physics Layer       (KB-000 – 004)  — identity, determinism, DAG, verification
        ↓
Selection Layer     (KB-005 – 009)  — ranking, namespace, contradiction, task→gap, bundles
        ↓
Coordination Layer  (KB-010 – 014)  — tasks, capabilities, settlement, attribution, reputation
        ↓
Governance Layer    (KB-015 – 019)  — upgrades, resolvers, forks, legitimacy, canonicality
```

This is **self-governing epistemic infrastructure** for autonomous agents. **Meta layer (KB-020+)** — reflexive knowledge, paradigm-shift detection, self-reorganization — is the next frontier.

---

## 3. Super practical rule for every one of the first 10

Make each KB include:

| Element | Purpose |
|--------|---------|
| **Scope** | What it covers and what it doesn’t. |
| **Invariants** | What must always be true. |
| **Algorithm / procedure** | Steps an agent can run. |
| **Test vectors** | At least one canonical example + expected hash/root. |
| **Failure modes** | How it breaks, how to detect. |

That makes them **machine-readable** in the only way that matters: **agents can execute the KB as a recipe.**

---

## 4. How this ties to the rest of the vision

- **Epistemic economy:** [EPISTEMIC-ECONOMY-VISION.md](EPISTEMIC-ECONOMY-VISION.md) — what the system is; [EPISTEMIC-ECONOMY-MILESTONES.md](EPISTEMIC-ECONOMY-MILESTONES.md) — how we get there.
- **Protocol rules:** [protocol/PROTOCOL-SPEC.md](protocol/PROTOCOL-SPEC.md) — envelope, hashing, DAG, verification (implements much of Bucket A).
- **Boot sequence:** This doc — first 10 KBs as the seed set so the graph is self-growing and the “TCP/IP for cognition” layer has a minimal, coherent foundation.
