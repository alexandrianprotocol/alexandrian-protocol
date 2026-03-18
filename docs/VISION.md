# Alexandrian Protocol — Product Vision

> *Anyone can contribute knowledge. High-quality knowledge becomes structured, trusted, and economically rewarded as it is used.*

---

## What Alexandrian Is

Alexandrian is a structured knowledge layer for AI agents — a continuously expanding library of useful information, including procedures, standards, reference materials, curated excerpts, practice examples, and state representations, all formatted for reliable machine consumption.

It is not a model. It is not a search engine. It is not a content platform.

It is **infrastructure** — the missing layer between raw information and AI reasoning. A shared, attributable, economically-maintained foundation that any agent, developer, or system can contribute to and build on.

The core insight is additive: Alexandrian does not replace existing knowledge sources. It introduces a complementary layer that organizes high-value information into structured, typed, versioned forms — preserving provenance, enabling reuse, and creating a system where useful knowledge compounds over time.

---

## The Knowledge Spectrum

Alexandrian supports the full range of knowledge useful to AI systems — not just procedures:

| Knowledge Type | What it contains | On-chain type |
|---|---|---|
| **Procedures and workflows** | Step-by-step task execution with assertions and verification criteria | `Feature` |
| **Verified practices and examples** | Annotated patterns, worked examples, failure modes, anti-patterns | `Practice` |
| **Standards and checklists** | Normative requirements, compliance gates, curated excerpts from NIST / OWASP / RFC | `ComplianceChecklist` |
| **State representations** | Structured logic, state machines, lifecycle transitions, invariants | `StateMachine` |
| **Evaluation frameworks** | Scoring rubrics, acceptance criteria, quality dimensions for agent output | `Rubric` |
| **Prompting patterns** | Tested prompt templates with model compatibility, failure modes, and evaluation | `PromptEngineering` |
| **Reference material** | Definitions, concepts, explanations — structured for lookup | Semantic subtype of `Practice` |
| **Curated excerpts** | High-signal passages from primary sources, formatted for machine consumption | Semantic subtype of `ComplianceChecklist` |

You are not limiting what knowledge is. You are expanding how knowledge is represented, organized, and made usable by AI systems.

---

## The Three-Layer Architecture

The system is designed as three composable layers, each serving a distinct purpose:

```
Layer 3 — Economic Layer
  Staked · On-chain identity · Royalty-earning · High-trust

Layer 2 — Structured Knowledge
  Typed · Versioned · Attributed · Discoverable

Layer 1 — Open Memory
  Free · Broad · Exploratory · No friction
```

**Layer 1 — Open Memory** is the top of the funnel. Anyone can submit knowledge — notes, snippets, excerpts, partial ideas — without a wallet, without formatting requirements, without staking. This layer functions as an AI memory layer: broad, exploratory, and low-friction. No earnings accrue here, but contributions are visible and attributed.

**Layer 2 — Structured Knowledge** is where raw contributions become useful. AI-assisted structuring suggests KB type, tags, and citations. Community curation organizes and validates. Knowledge becomes typed, versioned, and discoverable by agents via the subgraph. Discoverability increases; usage signals begin to accumulate.

**Layer 3 — Economic Layer** is where commitment meets incentive. Staking registers knowledge on-chain with a permanent identity and royalty routing. Every query against a staked KB flows value back through the attribution DAG — to the KB author, to every parent KB in the lineage. This layer is trusted by default; agents weight it higher. It is selective by design.

The key framing:

> **Free = contribution and visibility. Staked = commitment and monetization.**

---

## The Participation Funnel

Participation is designed to be incremental, natural, and rewarding at every stage:

```
Observe → Contribute → Improve → Commit → Earn → Build Reputation
```

| Stage | What happens | What's unlocked |
|---|---|---|
| **Observe** | Browse the KB registry, read artifacts, see usage signals | Understanding of the knowledge graph |
| **Contribute** | Submit knowledge in any form — no wallet required | Visibility, attribution, impact score |
| **Improve** | Structure, tag, extend, fork existing KBs | Higher discoverability, citation graph entry |
| **Commit** | Stake on-chain, register permanent identity | Royalty eligibility, HumanStaked trust tier |
| **Earn** | Queries settle value back through lineage | ETH royalties proportional to usage |
| **Build Reputation** | Usage, citations, endorsements compound on-chain score | Discovery ranking, trust tier elevation |

### KB Lifecycle

Every piece of knowledge follows a progression. Each stage unlocks additional benefits:

```
Draft → Structured → Verified → Staked → Earning
```

| Stage | Status | Benefit |
|---|---|---|
| **Draft** | Submitted, untyped | Visible in open memory layer |
| **Structured** | Typed, tagged, cited | More discoverable, subgraph indexed |
| **Verified** | Curator-reviewed, quality-gated | Higher trust weight for agents |
| **Staked** | On-chain identity, royalty-eligible | `HumanStaked` tier, economic activation |
| **Earning** | Queried and settled | Royalties flow through attribution DAG |

Before staking, contributors can preview estimated usage and projected earnings — making the staking decision rational rather than speculative.

---

## Roles

Not everyone writes. The system supports three distinct contribution roles:

**Authors** create knowledge — procedures, standards, examples, references. They are the primary content contributors. Their stake aligns their incentives with long-term quality and usage.

**Curators** organize knowledge — grouping, recommending, tagging, structuring raw contributions into usable artifacts. They do not need to write; they make what's written findable and trustworthy. Curation is reputation-building work.

**Validators** stake on correctness — endorsing KBs they have verified against their own expertise or testing. Validator endorsements increase reputation score and trust tier weight. Validators take on reputational risk proportional to their stake.

This division means quality does not require gatekeeping participation. The top of the funnel stays open. Quality is enforced by the economic layer, not the entry layer.

---

## Quality Architecture

Open contribution without quality protection produces noise. The system prevents degradation through four mechanisms:

**1. Trust Tiers.** Every KB carries a native trust classification — `HumanStaked`, `AgentDerived`, `AgentDiscovered`. Agents filter by tier. Unstaked contributions carry lower weight by default; staked contributions are trusted without additional verification.

**2. Reputation Scoring.** On-chain reputation is a function of query volume, endorsements, settlement count, and lineage depth. The formula is transparent and manipulation-resistant. High-reputation KBs surface first.

**3. Agent Filtering.** Agents prefer higher-quality entries by design. Usage creates signals. Settlement reinforces signals. Low-quality KBs that don't get used don't earn and don't rank. Quality emerges from selection pressure, not moderation.

**4. Supersession Chains.** When a KB is updated or improved, the new version carries the parent's lineage. The old version doesn't disappear — it remains in the history. An agent always knows which edition it is reading and can trace the full lineage to the root seed. This is a stronger version guarantee than any wiki or documentation system.

The correct version of the volume question:

> The more **useful, reusable, and structured** knowledge you accumulate, the better. Raw volume alone degrades quality. Structured volume compounds it.

---

## Demand Signals

Contribution increases when contributors know what is needed. The system surfaces demand explicitly:

- **Missing knowledge prompts** — "No high-quality entry exists for X. Agents frequently search for this."
- **Bounties** — "Write this KB, earn this reward." Structured demand from the community or protocol.
- **Trending topics** — real-time signals showing which domains and types are generating the most agent queries.
- **Gap analysis** — domains where query volume exists but staked KB coverage is thin.

This closes the loop: agents use the library → usage creates signals → signals guide contributors → contributors fill gaps → agents use better knowledge.

---

## Economic Model

The economic loop is pull-based and attribution-aware:

```
Agent queries KB
  → settleQuery(kbHash, value)
  → 2% protocol fee
  → royalties propagate through attribution DAG
  → each parent KB receives proportional share (royalty_bps)
  → contributors withdraw accumulated ETH
```

Key properties:

- **No subscription, no API key.** Settlement is per-query, paid by the agent or its operator.
- **Attribution is structural, not assumed.** Every derivation edge is immutable on-chain. Royalty routing cannot be altered after publication.
- **Economic conservation.** Zero wei created or destroyed per settlement. Every distribution is verifiable.
- **Compounding lineage value.** A root seed KB that spawns 50 derived KBs earns royalties from all 50 every time any of them is queried. Deep, useful knowledge compounds in value over time.

Stake is not a fee. It is a commitment — skin in the game that aligns the contributor's incentives with the long-term quality and usefulness of their KB.

---

## Earning Eligibility Rules

Every KB moves through explicit states. Only KBs that have demonstrated both commitment and usefulness can generate revenue.

```
DRAFT → STRUCTURED → VERIFIED → ELIGIBLE → EARNING → SUSPENDED
```

### Eligibility Gates (Must Pass All)

A KB becomes `ELIGIBLE` only when all of the following are true:

| Gate | Requirement | Rule |
|---|---|---|
| **Structural** | Content is canonicalized (JCS), type is assigned, author is set | `!contentHash \|\| !type \|\| !author → NOT ELIGIBLE` |
| **Retrievable** | CID resolves — `fetch(CID)` returns bytes, `keccak256(bytes) == contentHash` | `!cidResolvable \|\| !contentVerified → NOT ELIGIBLE` |
| **On-chain** | Registered via `publishKB` with contentHash, royaltyBps, author. No placeholder CID. | `!onChainRegistered → NOT ELIGIBLE` |
| **Staked** | Stake meets minimum for KB type | `stake < minStake[type] → NOT ELIGIBLE` |

Minimum stake by type (anti-spam gate — higher-trust types require more commitment):

| Type | Min Stake |
|---|---|
| `PromptEngineering` | 0.005 ETH |
| `Feature` | 0.01 ETH |
| `Rubric` | 0.01 ETH |
| `Practice` | 0.02 ETH |
| `StateMachine` | 0.03 ETH |
| `ComplianceChecklist` | 0.05 ETH |

### Earning Activation (Usage or Reuse)

`ELIGIBLE` alone does not earn. A KB becomes `EARNING` when it demonstrates real usefulness:

```
if (settlementCount >= 5 || downstreamCitations >= 1)
  → EARNING
else
  → ELIGIBLE (visible, non-earning)
```

This separates two distinct properties:

> **Eligibility = commitment. Earning = usefulness.**

A KB can be perfectly structured and staked but earn nothing if nobody uses it. A KB that gets cited by another earning KB immediately qualifies — reuse is proof of value.

### User-Facing Progression

Contributors see their KB's position in the lifecycle at every stage:

| State | Message shown |
|---|---|
| Not yet staked | *"This KB is visible but not earning. Stake X ETH to activate."* |
| ELIGIBLE | *"Earning activated. Used 2/5 times before royalties begin."* |
| EARNING | *"Earning. Royalties routing through attribution DAG."* |
| SUSPENDED | *"Content no longer resolves. Stake below minimum. Reinstate to re-activate."* |

### Suspension Rules

A KB is demoted to `SUSPENDED` if any of the following occur:

- CID no longer resolves
- `keccak256(fetched_bytes) ≠ contentHash` (content tampered or corrupted)
- Stake withdrawn below `minStake[type]`
- Flagged for spam by validator consensus

Suspended KBs are excluded from royalty distribution until reinstated.

### Trust Tier Earnings Multiplier

Trust tier applies a multiplier to royalty share weight:

| Trust Tier | Multiplier |
|---|---|
| `HumanStaked` | 1.0× |
| `AgentDerived` | 0.7× |
| `AgentDiscovered` | 0.5× |

This means human-verified knowledge earns proportionally more per query than agent-generated knowledge at equivalent usage levels — incentivizing higher-trust contributions over time.

---

## Technical Primitives

Three primitives underpin the entire system:

```
contentHash = keccak256("KB_V1" || JCS(normalize(envelope)))
artifactHash = keccak256(artifact_bytes)
entityId = contentHash.toLowerCase()
```

| Primitive | What it does |
|---|---|
| **Deterministic identity** | Same KB content always produces the same hash, across machines and environments. Identity is content-derived, not assigned. |
| **Immutable lineage DAG** | Derivation edges are written on-chain at publish time and cannot be altered. Attribution is structural. |
| **Settlement + royalty routing** | Every query call routes ETH atomically through the lineage graph. No trusted intermediary. |

These primitives compose three infrastructure layers:

| Layer | Responsibility |
|---|---|
| **Base** | Settlement rail + identity anchor. On-chain truth. |
| **IPFS** | Content vault. Artifact integrity by CID. Location-independent retrieval. |
| **The Graph** | Coordination surface. Settlement signals, reputation ranking, lineage queries. |

---

## The Library Analogy, Made Precise

| Library concept | Alexandrian equivalent |
|---|---|
| Book / reference entry | KB artifact — typed, versioned, IPFS-anchored |
| Dewey Decimal / taxonomy | Six on-chain KB types covering the full knowledge spectrum |
| Edition / version history | Supersession chain — parent → child lineage, immutable on-chain |
| Citation / footnote | Attribution DAG edge — royalty bps encoded at publish time |
| Card catalog | The Graph subgraph — collection queries, reputation-ranked |
| Librarian | Curators — organize, tag, structure, recommend |
| Peer review | Validators — stake on correctness, elevate trust tier |
| Endowment | Per-query settlement → royalty flow through attribution DAG |
| Open submissions | Layer 1 open memory — no wallet, no schema, no friction |
| Acquisition policy | Staking + trust tier (HumanStaked / AgentDerived / AgentDiscovered) |

---

## Seed Corpus Taxonomy

Collections are organized around **agent task categories**, not technology stacks. The library's primary consumer is agents; the taxonomy reflects how agents search, not how humans organize documentation.

### Collections (v1)

| Collection ID | Domain | Seed KB types | Root seed title |
|---|---|---|---|
| `KB-ENG` | API & Integration Patterns | Practice, Feature, ComplianceChecklist | Stable Production API Design |
| `KB-EVM` | Smart Contract Standards | Practice, ComplianceChecklist, Rubric | EVM Contract Security Baseline |
| `KB-DATA` | Data & Storage Patterns | Practice, StateMachine, Feature | Schema Design & Migration Patterns |
| `KB-AGENT` | Agent Behaviour & Prompting | PromptEngineering, Rubric, Practice | Agent Task Decomposition Patterns |
| `KB-COMPLY` | Compliance & Auditing | ComplianceChecklist, Rubric | OWASP API Top 10 Checklist |
| `KB-OPS` | DevOps & Reliability | Practice, StateMachine, ComplianceChecklist | Production Deployment Baseline |

### KB Structure Per Collection

Each collection branches from a root seed across the full knowledge spectrum:

```
[Root Seed] Practice — domain baseline / reference anchor
  ├─► Feature — specific procedure or workflow
  ├─► Feature — alternative procedure or workflow
  │     └─► StateMachine — state logic / lifecycle transitions
  ├─► Practice — worked examples and annotated case studies
  │     └─► Practice — failure modes and anti-pattern reference
  ├─► ComplianceChecklist — standards / correctness gates
  │     └─► ComplianceChecklist — curated standards excerpt (NIST, OWASP, RFC)
  └─► Rubric — evaluation criteria for agent-generated output
        └─► PromptEngineering — agent prompt templates grounded in above
```

Root seeds are `HumanStaked` with `0 bps` royalty (origin). All children carry `500 bps` royalty back to their direct parent. Deep descendants compound attribution automatically.

### Minimum Viable Seed Corpus (Phase 1: ~60 KBs)

| Collection | Root | Features | Examples/Ref | Checklists | Rubrics | Prompts | Total |
|---|---|---|---|---|---|---|---|
| `KB-ENG` | 1 | 3 | 2 | 2 | 1 | 1 | **10** |
| `KB-EVM` | 1 | 3 | 1 | 3 | 2 | 1 | **11** |
| `KB-DATA` | 1 | 3 | 1 | 1 | 1 | 1 | **8** |
| `KB-AGENT` | 1 | 2 | 1 | 1 | 2 | 3 | **10** |
| `KB-COMPLY` | 1 | 2 | 2 | 4 | 2 | 1 | **12** |
| `KB-OPS` | 1 | 3 | 1 | 2 | 1 | 1 | **9** |
| **Total** | **6** | **16** | **8** | **13** | **9** | **8** | **60** |

60 high-quality seed KBs across 6 collections establishes the library's founding reputation. After this corpus is in place, the open-publish floodgate opens and reputation scoring takes over as the quality signal.

---

## The Bigger Picture

If blockchains made financial transactions trustless and programmable, Alexandrian makes **knowledge trustless and programmable** — turning the raw material of AI reasoning into a verifiable, composable, economically-incentivised public good.

The analogy to the original Library of Alexandria is intentional: a centralized repository of all human knowledge — not limited to any single form, but spanning every useful type — consulted before scholars wrote anything new. Alexandrian is the decentralized, agent-native successor: a library that pays its authors, never forgets an edition, spans the full spectrum of useful knowledge, and grows through open contribution rather than acquisition.

The balance is permanent by design:

> **Open at the top. Selective at the bottom. Economically aligned at the core.**

You are not building a content platform. You are building the layer underneath — the shared foundation that makes AI knowledge attributable, reusable, and continuously improvable, for every system that needs it.

---

*Last updated: 2026-03-18*
