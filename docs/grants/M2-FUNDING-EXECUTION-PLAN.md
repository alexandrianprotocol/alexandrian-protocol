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

## Funding Readiness Gate (M2)

Before grant submission, confirm:
- replay/reorg determinism proof published,
- artifact verification CLI released and documented,
- gas benchmark report with reproducible method,
- public GraphQL endpoint with reference query pack,
- at least two reference agent integrations demonstrated.
