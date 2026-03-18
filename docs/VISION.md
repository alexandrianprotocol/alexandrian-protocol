# Alexandrian Protocol — Product Vision

> *The canonical knowledge library for AI agents.*

---

## The Reframe That Changes Everything

Most AI infrastructure investment goes into model capacity — bigger weights, faster inference. The assumption is that the bottleneck is compute. It isn't.

The bottleneck is **knowledge quality and accountability**. As AI agents become autonomous economic actors — writing code, drafting contracts, making decisions — the knowledge they reason over needs to be as accountable as the agents themselves.

Alexandrian is not a knowledge registry. It is a **library** — the first structured, citable, economically-maintained library for AI agents. A persistent layer of verified standards, procedures, reference material, and historical precedent that agents consult before touching noisy external sources.

That sentence is legible to grant committees, enterprise developers, and framework maintainers equally. It's infrastructure language, not crypto-native jargon.

---

## The Library Analogy, Made Precise

| Library concept | Alexandrian equivalent |
|---|---|
| Book / reference entry | Knowledge Base (KB) artifact |
| Dewey Decimal / taxonomy | Epistemic type system (Practice, Feature, StateMachine, PromptEngineering, ComplianceChecklist, Rubric) |
| Edition / version history | Supersession chain (parent → child KB lineage, on-chain) |
| Citation / footnote | Attribution DAG edge (royalty bps, on-chain) |
| Card catalog | The Graph subgraph (collection-level queries, reputation-ranked) |
| Librarian / curation | Seed corpus curators + on-chain reputation signals |
| Acquisition policy | Stake requirement + trust tier (HumanStaked / AgentDerived / AgentDiscovered) |
| Endowment / sustainability | Per-query settlement → royalty flow back through attribution DAG |

---

## What This Means for Build Priorities

### 1. Epistemic Type System = The Taxonomy

The six KB types aren't just schema metadata — they're how agents browse and filter the library. The protocol needs to support queries like:

> *"Give me all current best-practice KBs for EVM contract security, filtered by ComplianceChecklist type, sorted by reputation score, published after block X."*

This requires the subgraph to expose `kbType` as a first-class filter, not an afterthought. **Next subgraph schema work: collection-level queries.**

### 2. Supersession Chains = Editions

When a standard is updated, the old KB doesn't disappear. The chain is the version history — more rigorous than most documentation systems humans use. An agent querying a KB always knows which edition it's reading, and can trace the full lineage back to the root seed.

This framing also strengthens the trust narrative: every entry in the library has an auditable edit history. That's a stronger guarantee than a Confluence page or a GitHub wiki.

### 3. The Subgraph = The Card Catalog

The Graph indexer is the discovery mechanism. Right now it supports individual KB lookups and settlement signals. What's missing is **collection-level queries**:
- All KBs in a named collection, ranked by reputation
- All KBs of a given type within a domain
- All KBs citing a given parent (edition tree traversal)
- Top-N KBs by query volume in the last N blocks

This is probably the next major infrastructure piece after the 10k KB bootstrap.

### 4. Curation Matters as Much as Creation

A real library has librarians. Early on, that's us. A small set of high-quality, well-typed seed KBs across each collection is worth more than thousands of low-quality auto-generated ones. The seed corpus quality defines the protocol's reputation.

The bootstrap phase should enforce a curator review step — even if informal — before the open-publish floodgate opens. Quality of the seed corpus is a one-time opportunity.

### 5. The Human Developer Role

Developers aren't just building agents that use Alexandrian — they're **contributing to a shared institutional knowledge base** that every agent in the ecosystem benefits from. That's a much stronger community story than "publish KBs and earn royalties."

Framing contribution as library authorship (not mining or staking) changes the type of person and organisation drawn to the protocol.

---

## Seed Corpus Taxonomy

Collections are organised around **agent task categories**, not technology stacks. The library's primary consumer is agents; the taxonomy should reflect how agents search, not how humans organise documentation.

### Proposed Collections (v1)

| Collection ID | Domain | Seed KB types | Root seed title |
|---|---|---|---|
| `KB-ENG` | API & Integration Patterns | Practice, Feature, ComplianceChecklist | Stable Production API Design |
| `KB-EVM` | Smart Contract Standards | Practice, ComplianceChecklist, Rubric | EVM Contract Security Baseline |
| `KB-DATA` | Data & Storage Patterns | Practice, StateMachine, Feature | Schema Design & Migration Patterns |
| `KB-AGENT` | Agent Behaviour & Prompting | PromptEngineering, Rubric, Practice | Agent Task Decomposition Patterns |
| `KB-COMPLY` | Compliance & Auditing | ComplianceChecklist, Rubric | OWASP API Top 10 Checklist |
| `KB-OPS` | DevOps & Reliability | Practice, StateMachine, ComplianceChecklist | Production Deployment Baseline |

### Seed KB Structure Per Collection

Each collection follows this branching pattern from a root seed:

```
[Root Seed] Practice — domain baseline
  ├─► Feature — specific capability spec
  ├─► Feature — alternative capability spec
  │     └─► StateMachine — lifecycle / state transitions
  ├─► ComplianceChecklist — security / correctness gates
  │     └─► ComplianceChecklist — domain-specific extension
  └─► Rubric — evaluation criteria for agent-generated output
        └─► PromptEngineering — agent prompt templates grounded in above
```

Root seeds are `HumanStaked` with `0 bps` royalty (origin). All children carry `500 bps` royalty back to their direct parent. Deep descendants compound attribution through the DAG automatically.

### Minimum Viable Seed Corpus (Phase 1 target: ~60 KBs)

| Collection | Root | Features | Checklists | Rubrics | Prompts | Total |
|---|---|---|---|---|---|---|
| `KB-ENG` | 1 | 3 | 2 | 1 | 1 | **8** |
| `KB-EVM` | 1 | 3 | 3 | 2 | 1 | **10** |
| `KB-DATA` | 1 | 3 | 1 | 1 | 1 | **7** |
| `KB-AGENT` | 1 | 2 | 1 | 2 | 3 | **9** |
| `KB-COMPLY` | 1 | 2 | 4 | 2 | 1 | **10** |
| `KB-OPS` | 1 | 3 | 2 | 1 | 1 | **8** |
| **Total** | **6** | **16** | **13** | **9** | **8** | **52** |

52 high-quality seed KBs across 6 collections establishes the library's founding reputation. After this corpus is in place, the open-publish floodgate opens and reputation scoring takes over as the quality signal.

---

## The Bigger Picture

If blockchains made financial transactions trustless and programmable, Alexandrian makes **knowledge trustless and programmable** — turning the raw material of AI reasoning into a verifiable, composable, economically-incentivised public good.

The analogy to the original Library of Alexandria is intentional: a centralised repository of all human knowledge, consulted by scholars before they wrote anything new. Alexandrian is the decentralised, agent-native successor — a library that pays its authors, never forgets an edition, and grows through open contribution rather than imperial acquisition.

---

*Last updated: 2026-03-17*
