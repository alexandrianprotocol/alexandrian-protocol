# KB Primitives — Foundational Epistemic Layer

**Purpose:** Production-grade, deterministic, executable definitions of KBs that bootstrap and extend the epistemic economy. These are **not** blog posts; they are **foundational epistemic primitives** for protocol reviewers and agent implementations.

---

## Full Stack

```
Physics Layer       (KB-000 – 004)  — identity, determinism, DAG, verification
        ↓
Selection Layer     (KB-005 – 009)  — ranking, namespace, contradiction, task→gap, bundles
        ↓
Coordination Layer  (KB-010 – 014)  — tasks, capabilities, settlement, attribution, reputation
        ↓
Governance Layer    (KB-015 – 019)  — upgrades, resolvers, forks, legitimacy, canonicality
```

This is **self-governing epistemic infrastructure** for autonomous agents. Everything after the physics layer builds on it without breaking immutability or trust-by-recomputation.

---

## Bucket A — Physics (KB-000 → KB-004)

| Doc | Title | Role |
|-----|--------|------|
| [KB-000.md](KB-000.md) | Knowledge Block Envelope Specification (M1) | Canonical structure; hash scope; invariants |
| [KB-001.md](KB-001.md) | Canonical Serialization Pipeline | Determinism engine; same KB → same bytes |
| [KB-002.md](KB-002.md) | Domain-Separated Hashing Rules | Cross-object hash namespaces; no collision |
| [KB-003.md](KB-003.md) | Lineage DAG Semantics | Parents, acyclicity, derivation meaning |
| [KB-004.md](KB-004.md) | Verification & Retrieval Procedure | Trust by recomputation; no central authority |

**Implementation:** [IMPLEMENTATION-MAPPING.md](IMPLEMENTATION-MAPPING.md) — how Alexandrian M1 implements these (field names, keccak256, `KB_V1`, MAX_PARENTS = 8).

**Real KBs:** Each primitive doc has a protocol-valid envelope under `seeds/kb-primitives/KB-XXX/envelope.json`. See **[LIST.md](LIST.md)** for the full mapping (doc → kbId). Regenerate with `node scripts/kb-primitives-to-envelopes.mjs` from repo root.

---

## Bucket B — Selection (KB-005 → KB-009)

| Doc | Title | Role |
|-----|--------|------|
| **KB-005** | Quality Signals + Ranking Heuristic | Reference count, derivations, curator inclusion, staleness, contradictions |
| **KB-006** | Namespace & Domain Governance | Domain ownership, collision policy, reserved prefixes, deprecation |
| **KB-007** | Competing Claims & Contradiction Protocol | Alternatives, “disagreesWith,” agent choice |
| **KB-008** | Task → KB Gap → KB Submission Pattern | Detect missing KBs from failures; generate new KBs |
| **KB-009** | Bundle Construction + Merkle Root | Curated retrieval sets; Merkle root; packaged knowledge |

---

## Coordination Layer (KB-010 → KB-014)

Independent agents stop being isolated publishers and start forming a **machine-native economy**. M1-compatible; no heavy staking required.

| Doc | Title | Role |
|-----|--------|------|
| [KB-010.md](KB-010.md) | Task Object & Deterministic Intent | Work requests: intent + constraints; machine-parseable, evaluatable |
| [KB-011.md](KB-011.md) | Capability Advertisement Protocol | Agents declare what they can do; market of specialization |
| [KB-012.md](KB-012.md) | Submission Settlement Protocol | Task resolved; winning KB; deterministic evaluation |
| [KB-013.md](KB-013.md) | Attribution & Royalty Graph | Value propagation along DAG; incentivizes composition |
| [KB-014.md](KB-014.md) | Reputation Accumulation Model | Trust from measurable performance; no voting |

**Coordination loop:** Problem → Task → Capability match → KB submission → Deterministic settlement → Attribution propagation → Reputation update → Future task routing improves.

---

## Governance Layer (KB-015 → KB-019)

How the system **changes without breaking trust** — without a voting DAO or centralized authority. Governance as **verifiable process**, not opinion.

| Doc | Title | Role |
|-----|--------|------|
| [KB-015.md](KB-015.md) | Protocol Upgrade Proposal (PUP) | Upgrades as KB-like artifacts; adoption, not global switch |
| [KB-016.md](KB-016.md) | Resolver & Version Negotiation | Which ruleset interprets a KB; compatible subset |
| [KB-017.md](KB-017.md) | Forking & Parallel Epistemic Universes | Incompatible branches coexist; shared history until divergence |
| [KB-018.md](KB-018.md) | Governance Legitimacy Signals | Influence from adoption × productivity; no privileged voters |
| [KB-019.md](KB-019.md) | Canonicality Emergence (Soft Consensus) | Default version emerges from coordination; not declared |

**Outcome:** Evolve rules, survive disagreement, resist capture, upgrade safely, maintain historical truth — without admins or central control.

---

## What KB-000 → KB-019 Define

- **Identity** — canonical envelope and hash  
- **Evolution** — lineage DAG  
- **Selection** — ranking, contradiction, bundles  
- **Coordination** — tasks, capabilities, settlement, attribution, reputation  
- **Economic interaction** — value flow along the graph  
- **Governance** — upgrade, resolve, fork, legitimacy, canonicality  

**Meta layer (KB-020+)** — Reflexive knowledge: reasoning about knowledge quality, paradigm shifts, self-reorganization — is the next frontier.
