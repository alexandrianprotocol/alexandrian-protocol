# M2 Funding-Optimized Execution Plan

Purpose: convert M2 from conceptual expansion to infrastructure-hardening deliverables that maximize grant confidence and funding probability.

## M2 — Live Economy and Discovery (Canonical Scope)

Goal: the same protocol, but live and discoverable. Agents can find KBs and use settlement in production.

Deliverables:
- Live infrastructure: mainnet fork tests, hosted subgraph, IPFS/content resolution where needed, npm publish + provenance.
- SDK hardening: result types through public API, retry/backoff, browser bundle, dApp examples.
- Discovery: subgraph-backed "discover KBs" API (domain, type, recent settlement) with basic listing and filters.
- Ranking signals (exposed): settlement count and lineage (parent/child counts) from subgraph/indexer.
- Artifact and expansion model: primary artifact (M1), optional bound artifacts (identity-bound), advisory expansion (non-identity), storage-agnostic discovery enrichment without changing `kbHash` or settlement.

Epistemic economy outcome:
- The economic loop becomes observable in production.
- Agents can discover and settle against live KBs.
- Usage signals accumulate and support minimal first-wave ranking (for example, "most recently settled" and "by domain").

## What Grant Funding Pays For (M2)

Funding is allocated to the following execution workstreams:
- Discovery infrastructure and public query surfaces over deterministic indexed topology.
- Subgraph hardening for replay/reorg determinism and derived economic signals.
- IPFS artifact binding and byte-level verification (`fetch -> hash -> compare -> verdict`).
- SDK and integrator hardening (typed results, reliability paths, browser packaging, examples).
- Reproducibility and certification artifacts for independent reviewer verification.

## Canonical Backbone
Alexandrian is a deterministic, content-addressed knowledge registry and settlement layer:
- identity anchored on Base,
- artifacts stored on IPFS,
- topology queryable via The Graph.

M2 priority is production hardening, not abstract scope expansion.

## Capability Stack (M2 Framing)

Task decomposition is **necessary** but not sufficient for agent capability. A complete system needs multiple, composable primitives:

1. **Decomposition** — break goal → tasks (TaskDecomposition)
2. **Planning** — order, dependencies, strategy (ExecutionPlan / OrchestrationPlan)
3. **Decision making** — tradeoffs and selection (DecisionFramework)
4. **Evaluation** — correctness checks (TestCase / Checklist / Rubric)
5. **Risk awareness** — detect hazards and failure modes (RiskModel / AntiPattern / SecurityRule)
6. **Iteration / repair** — detect failure → fix → retry (RepairLoop / DebugProcedure)
7. **Memory / learning** — reuse what worked before (Outcome / CaseStudy + retrieval signals)
8. **Role specialization** — responsibilities and handoffs (AgentRole)
9. **Orchestration** — coordinating all of the above into an execution loop (OrchestrationPlan)

M2 should explicitly position Alexandrian as moving from “better answers” to **structured execution** by composing these layers.

## Layered Architecture (Control Plane vs Knowledge)

As M2 expands into planning/orchestration, it is important to keep a clean split:

- **Knowledge layer (content KBs)**: the “what to do” primitives that get injected as executable context  
  - Examples: Practice, CodeTemplate, Checklist, DecisionFramework, AntiPattern, RiskModel
- **Reasoning / control-plane layer (routing + execution primitives)**: the “how the system runs” primitives  
  - Examples: TaskDecomposition, AgentRole, OrchestrationPlan, ExecutionPlan
- **Evaluation layer (verification primitives)**: the “is it correct/safe?” primitives  
  - Examples: TestCase, AuditChecklist, Rubric

Why this matters:
- Prevents everything from collapsing into “just KBs”
- Enables retrieval logic that is stage-aware (control plane first, then content, then verification)
- Keeps the protocol evolvable as the stack expands

## Cost & Performance: Stage the Pipeline

Multi-stage intelligence can get expensive if done naively; the cost is controllable with a strict staged pipeline:

- **Stage 1 (cheap):** intent detection + decomposition
- **Stage 2 (targeted):** per-task retrieval with caps (e.g. maxTasks = 5, maxKBsPerTask = 2–3)
- **Stage 3 (compose):** assemble a structured output with role handoffs
- **Stage 4 (verify):** evaluation KBs (checklists/rubrics/tests) only when needed

Critical controls:
- Aggressive caching of decomposition + retrieval results
- Early-exit: skip decomposition for simple queries
- Use smaller models for planning stages; reserve expensive models for final composition

## Premier M2 Implementations (Funding-Maximizing)

### 1. Deterministic Subgraph With Derived Economic Signals

Deliver:
- Materialized derived fields: `totalSettledValue`, `settlementCount`, `uniquePayerCount`, `childCount`, `lineageDepth`, `lastSettledAt`, `royaltyEarned`.
- Replay + reorg determinism harness:
  - full block replay test,
  - fork/reorg simulation,
  - deterministic entity hash verification,
  - `reindex-and-diff` script proving convergence.
- Public agent-grade query library:
  - most reused KBs,
  - most economically active KBs per domain,
  - highest derivation density,
  - cross-domain reuse leaders,
  - highest unique payer breadth.

Why it matters:
- Turns The Graph from indexing plumbing into protocol-critical discovery.
- Demonstrates operational determinism beyond happy-path indexing.

### 2. IPFS Artifact Binding + Verification CLI

Deliver:
- Mandatory CID binding policy for KB artifacts in M2 publishing flows.
- `verify-kb-artifact` CLI:
  1. fetch CID bytes,
  2. hash bytes,
  3. compare with committed artifact hash,
  4. output `verified` or `invalid`.
- Multi-pin redundancy policy:
  - primary provider,
  - backup provider,
  - local fallback,
  - size/fetch limits,
  - operational runbook.

Why it matters:
- Converts IPFS from “storage mention” to enforceable integrity layer.
- Reduces centralized data-availability trust assumptions.

### 3. Base Gas-Optimized Settlement Path

Deliver:
- Gas benchmark report with function-level breakdown:
  - `publishKB`,
  - `settleQuery`,
  - `withdraw`.
- Optimization pass and measurable before/after deltas.
- Optional batch-settlement path feasibility report/prototype.

Why it matters:
- Base reviewers heavily weight economic efficiency and practical transaction viability.

### 4. Minimal Economic Signal Explorer (Dev-Facing)

Deliver:
- lightweight explorer for:
  - KB lineage topology,
  - settlement activity,
  - payout routing.

Why it matters:
- Demonstrates topology and economics as operational surfaces, not theoretical claims.

### 5. Agent Reference Integrations

Deliver:
- 1–2 reference agents that:
  1. query subgraph,
  2. select KB by signal,
  3. fetch CID,
  4. verify artifact hash,
  5. consume artifact in workflow.

Why it matters:
- Closes the adoption loop with concrete consumer behavior.

## Minimum Non-Negotiable M2 Package

If only three M2 items can ship for maximum funding leverage:
1. deterministic replay-tested subgraph,
2. CID verification CLI + pinning policy,
3. gas benchmark + optimization report.

## Harsh Reviewer Critique Simulation (Design-Time Gate)

Use these as pre-submission questions and required response criteria.

### 1) “This is over-abstract.”
Required response:
- lead with mechanism, not vision language.
- use deterministic identity / settlement / verification phrasing.

### 2) “Where is real usage?”
Required response:
- show concrete agent integration and query-to-consume workflow.
- provide measurable usage signals beyond demo claims.

### 3) “Why blockchain at all?”
Required response:
- trustless atomic royalty routing,
- neutral settlement anchor,
- non-custodial attribution enforcement,
- auditable payment-state finality.

### 4) “Token speculation risk?”
Required response:
- ETH settlement first-class,
- no token dependency for M1/M2 correctness.

### 5) “Coordination layer overclaim?”
Required response:
- precise scope boundaries:
  - M1: identity + settlement,
  - M2: discovery + artifact binding,
  - coordination objects: future layer.

### 6) “Subgraph is just analytics?”
Required response:
- subgraph as discovery layer and protocol query plane,
- not a dashboard substitute.

### 7) “How do you resist KB spam/noise?”
Required response:
- stake and slashing primitives,
- economic relevance filtering via settlement signals,
- explicit future reputation weighting.

### 8) “What if IPFS availability fails?”
Required response:
- identity independent of location,
- CID/hash verification authoritative,
- mirrored pinning strategy.

## Weaknesses M2 Must Explicitly Close

Current strengths:
- deterministic identity,
- DAG lineage,
- settlement invariants,
- Base deployment evidence.

Current gaps to close in M2:
- adoption proof,
- reorg/replay evidence,
- operational maturity (pinning, monitoring, failover),
- production query usability.

## M2 Participation & Incentive Design

To maximize participation, you don’t need to change the core protocol — you need to **reduce friction**, **increase perceived upside**, and make contribution **legible and rewarding early**. The structural and economic model is already strong; M2 must focus on how easy it is to:

- start contributing  
- understand value  
- get rewarded quickly  
- build reputation  

### 1. Lower the Cost of First Contribution

**Problem.** Requiring stake, strict typing, and upfront citation thinking creates high cognitive and financial friction for the first KB.

**Improvement — progressive commitment model.**

- **Phase 1 (low friction):**
  - allow draft KBs and unstaked contributions,
  - clearly mark them as *Unstaked / Unverified*.
- **Phase 2 (commitment):**
  - publishers add stake to:
    - upgrade visibility,
    - enable royalties.

**Result.** More participation at the top of the funnel. Staking becomes an **upgrade**, not a barrier.

### 2. Make Value Legible Immediately

**Problem.** Contributors don’t intuitively know:

- “Will this make money?”  
- “Why would someone use my KB?”

**Improvement — expected value visibility.**

For each KB, surface:

- usage count,
- downstream citations,
- estimated earnings,
- “hot topics” / demand signals.

Add:

- “This topic is in demand” indicators,
- “Missing knowledge here” prompts.

**Result.** Contributors respond to visible demand instead of guessing what to publish.

### 3. Accelerate Time-to-Reward

**Problem.** If rewards are delayed or uncertain, participation drops.

**Improvement — early incentives.**

- **Query mining rewards:** early KBs in a topic get boosted payouts.  
- **Bootstrap pools:** protocol subsidizes early usage.  
- **Bounties:** “Create a KB for X → earn Y.”

**Result.** Early contributors feel immediate payoff and the cold-start problem is reduced.

### 4. Add Clear Roles (Not Just “Contributors”)

**Problem.** A flat “everyone is a contributor” model under-specifies how people participate.

**Improvement — distinct roles.**

- **Authors** → create KBs.  
- **Curators** → organize topics / bundles.  
- **Validators** → stake on quality.  
- **Consumers (agents/devs)** → drive usage and settlement.

**Result.** More entry points; participants plug in where they have comparative advantage.

### 5. Improve Discovery & Distribution

**Problem.** Even strong KBs won’t earn if they’re not discovered.

**Improvement — strong surfacing mechanisms.**

- Trending KBs, “Most cited”, “Used by top agents”.  
- Topic leaderboards.  
- Recommendation surfaces: “If you use X, you may need Y.”

**Result.** Usage and rewards increase together, spinning up the participation flywheel.

### 6. Reduce Structural Friction (Typing + Citations)

**Problem.** Requiring strict types and explicit citations up front slows contributors down.

**Improvement — assist instead of requiring perfection.**

- Auto-suggest KB type and related citations.  
- Allow “quick publish” → refine structure later.

**Result.** Contribution feels lightweight while structure quality improves over time.

### 7. Strengthen the Reputation Layer

**Problem.** Without visible reputation, contributors don’t build identity and trust is weak.

**Improvement — contributor profiles.**

Expose:

- total earnings,
- citation impact,
- “trusted in X domain” badges,
- stake + endorsement signals.

**Result.** Participation becomes reputational as well as financial.

### 8. Add Light, Credible Gamification

**Problem.** Purely technical systems struggle with engagement.

**Improvement — subtle gamification.**

- Leaderboards (by topic and globally).  
- Badges:
  - “Most cited in X,”
  - “Top contributor this week.”

**Important:** keep it subtle and credible — avoid “cheap gamification.”

### 9. Clarify “Why This Wins” for Each User Type

Participation increases when value is obvious.

- **For developers:** better agent outputs using structured, reliable knowledge.  
- **For contributors:** earn from knowledge that gets reused.  
- **For researchers:** build attributable, citable knowledge artifacts.

Make these value statements explicit across docs, UI copy, and grant materials.

### 10. Refine Core Positioning Around Participation

Current framing is strong; add a participation-oriented layer:

> **Alexandrian enables anyone to contribute knowledge that is immediately usable by AI systems, transparently attributed, and economically rewarded as it is reused.**

This shifts from a **system description** to a **user opportunity**.

### 11. The Participation Flywheel

The target loop:

```text
Contribute → Get Used → Earn → Gain Reputation → Contribute More
                    ↑
               Discovery Layer
```

Each change above strengthens one part of this loop.

### 12. Highest-Impact Changes to Ship First

If only three participation features make M2:

1. **Remove upfront friction** — unstaked → staked upgrade path.  
2. **Show demand and expected value clearly.**  
3. **Bootstrap rewards early** — bounties, query-mining, and subsidy pools.

These deliver the largest lift to real, on-chain participation for the least surface area.

## Codebase Audit Prompt (Reusable)

Use this prompt for internal reviews, external audits, and grant reviewer Q&A rehearsal.

```text
You are a senior systems architect and AI infrastructure expert.

I have built a system called Alexandrian, which:
- Uses structured knowledge blocks (KBs) with strict schemas
- Retrieves KBs to enhance LLM outputs
- Includes task decomposition and agent role primitives
- Uses modular, composable architecture (similar to DAG-based systems)
- Emphasizes separation of concerns, interfaces, and invariants

Your task is to audit my codebase rigorously.

Evaluate across the following dimensions:

Architecture
- Is separation of concerns correctly implemented?
- Are modules aligned with “reasons to change”?
- Are there any hidden couplings or leaky abstractions?

Modularity
- Are modules cohesive and independently testable?
- Are interfaces explicit and stable?
- Is there any shared mutable state or implicit dependency?

System Design Quality
- Does the system enforce invariants (schemas, contracts)?
- Are boundaries clearly defined (KB layer vs reasoning layer vs execution)?
- Is the DAG/composition model correctly implemented?

Scalability
- Will this system scale in number of KBs, number of queries, number of agents?
- Where are bottlenecks?

Performance & Cost
- Where are unnecessary LLM calls?
- Where can caching or batching be introduced?
- Is the pipeline over-engineered or under-optimized?

Developer Experience
- Is the API intuitive?
- Is integration truly “1-line”?
- Are there confusing abstractions?

Risks
- What are the top 5 architectural risks?
- What would break at scale?
- What would prevent adoption?

Strategic Gaps
- What is missing to make this a default layer in all AI workflows?
- What features are unnecessary or premature?

Output format:
- Strengths
- Critical flaws
- Hidden risks
- High-leverage improvements
- What would make this system “inevitable”
```

## Funding Readiness Gate (M2)

Before grant submission, confirm:
- replay/reorg determinism proof published,
- artifact verification CLI released and documented,
- gas benchmark report with reproducible method,
- public GraphQL endpoint with reference query pack,
- at least two reference agent integrations demonstrated.
