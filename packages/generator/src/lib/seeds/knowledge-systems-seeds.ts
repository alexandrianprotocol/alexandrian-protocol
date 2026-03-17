/**
 * Knowledge Systems Seeds (~80 seed procedures).
 * Artifact validation, derivation graphs, discovery, reputation scoring,
 * conflict resolution, knowledge economics, and protocol governance.
 * Domain: knowledge.systems — core domain of Alexandrian Protocol.
 *
 * Seeds are grounded in the Alexandrian Registry architecture:
 * - KB identity: JCS+keccak256 canonical hash
 * - Trust tiers: HumanStaked, AgentDerived, AgentDiscovered
 * - Reputation: min(1000, min(500, queryVolume*2) + min(100, endorsements*20))
 * - Royalty DAG: bps-weighted attribution across parent lineage
 * - Settlement: 2% protocol fee, remainder by attribution shares
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Artifact validation (10) */
const ARTIFACT_VALIDATION: SeedSpec[] = [
  { domain: "knowledge.artifact_validation", title: "Validating knowledge artifact identity via canonical hash", concept: C("JCS-canonicalize artifact JSON; keccak256 hash; compare to on-chain artifact_hash; reject on mismatch") },
  { domain: "knowledge.artifact_validation", title: "Validating knowledge artifact schema compliance before publication", concept: C("validate against kb-schema-v2-final.json; check required fields: claim, semantic, execution, interface, provenance") },
  { domain: "knowledge.artifact_validation", title: "Validating knowledge artifact IPFS content integrity", concept: C("fetch from IPFS CID; compute keccak256 of content; compare to on-chain artifact_hash; reject if hash mismatch") },
  { domain: "knowledge.artifact_validation", title: "Implementing artifact quality gate procedures for KB publication", concept: C("gate: schema valid + hash match + quality score ≥ threshold + no duplicate title in domain + parent cycle check") },
  { domain: "knowledge.artifact_validation", title: "Detecting duplicate knowledge artifacts before publication", concept: C("embed artifact claim; cosine similarity against index; threshold 0.95 = near-duplicate; reject or merge with existing") },
  { domain: "knowledge.artifact_validation", title: "Validating KB parent references in derivation graphs", concept: C("each parent KB ID must exist on-chain; MAX_PARENTS=8; no cycles; verify parent not deprecated; check lineage depth") },
  { domain: "knowledge.artifact_validation", title: "Validating royalty basis points in KB attribution declarations", concept: C("royalty_bps sum across all parents ≤ 10000; each bps ≥ 0; validate on-chain before publishKB; reject on overflow") },
  { domain: "knowledge.artifact_validation", title: "Implementing procedural specificity scoring for KB quality validation", concept: C("score: decision rules, example inputs/outputs, anti-examples, measurable outcomes; reject below min score threshold") },
  { domain: "knowledge.artifact_validation", title: "Validating KB trust tier assignment against evidence requirements", concept: C("HumanStaked: requires wallet stake; AgentDerived: requires generator agent ID; AgentDiscovered: requires source provenance") },
  { domain: "knowledge.artifact_validation", title: "Implementing batch artifact validation pipelines for KB generation runs", concept: C("validate in parallel; collect all errors per artifact; skip invalid; log rejection reasons; report batch quality rate") },
];

/** 2. Derivation graphs (10) */
const DERIVATION_GRAPHS: SeedSpec[] = [
  { domain: "knowledge.derivation_graphs", title: "Designing KB derivation graph construction procedures", concept: C("node = KB; edge = parent reference with royalty_bps weight; DAG only; detect cycles before adding edge; index edges") },
  { domain: "knowledge.derivation_graphs", title: "Computing attribution shares across KB derivation graphs", concept: C("traverse from leaf to roots; accumulate royalty_bps per ancestor; normalize to sum = 10000 bps at settlement") },
  { domain: "knowledge.derivation_graphs", title: "Detecting cycles in KB derivation graph lineage", concept: C("DFS from candidate KB; detect back edge; reject KB if any parent creates cycle; log cycle members") },
  { domain: "knowledge.derivation_graphs", title: "Computing derivation depth metrics for KB graph health", concept: C("BFS from root seeds; assign depth per KB; max depth = longest path; average depth = graph maturity signal") },
  { domain: "knowledge.derivation_graphs", title: "Implementing derivation graph traversal for royalty settlement", concept: C("query from settled KB; traverse parent edges; collect (wallet, bps) pairs; normalize; distribute settlement amount") },
  { domain: "knowledge.derivation_graphs", title: "Designing derivation graph indexing for efficient ancestor queries", concept: C("materialize ancestor set per KB; store in graph DB; update incrementally on new KB publication; BFS on subgraph") },
  { domain: "knowledge.derivation_graphs", title: "Detecting hub nodes in KB derivation graphs for dependency risk", concept: C("node with in-degree > threshold = hub; hub deletion impact = high; alert on over-concentration; encourage diversity") },
  { domain: "knowledge.derivation_graphs", title: "Validating KB lineage attribution constraints for fairness", concept: C("each parent bps ≥ min_bps; no single parent > max_bps; enforce fairness policy at publish time; log violations") },
  { domain: "knowledge.derivation_graphs", title: "Implementing derivation graph health metrics for protocol monitoring", concept: C("metrics: avg parents per KB, max depth, hub concentration, orphan rate, derivation density per domain") },
  { domain: "knowledge.derivation_graphs", title: "Designing seed KB identification and protection procedures", concept: C("is_seed flag: no parents, depth=0; roots of derivation DAG; higher protection from deprecation; bootstrap supply") },
];

/** 3. Knowledge discovery (8) */
const DISCOVERY: SeedSpec[] = [
  { domain: "knowledge.discovery", title: "Designing KB discovery procedures using semantic routing", concept: C("embed query; cosine search against KB embeddings index; filter by domain and trust tier; rank by reputation score") },
  { domain: "knowledge.discovery", title: "Implementing capability-based KB discovery for agent routing", concept: C("index KBs by capability cluster; route agent task to cluster; retrieve top-K within cluster; score by fit + reputation") },
  { domain: "knowledge.discovery", title: "Designing KB recommendation from derivation graph neighbors", concept: C("retrieve query KB's siblings and children; rank by reputation and relevance; recommend for related task discovery") },
  { domain: "knowledge.discovery", title: "Implementing domain-scoped KB search with trust tier filtering", concept: C("filter by domain prefix; filter by min trust tier; sort by reputation; paginate; expose via retrieval engine API") },
  { domain: "knowledge.discovery", title: "Designing KB freshness signals for time-sensitive discovery", concept: C("freshness = decay(last_queried) + recent_endorsements; combine with reputation; boost fresh KBs in ranking") },
  { domain: "knowledge.discovery", title: "Implementing KB cross-domain discovery for interdisciplinary tasks", concept: C("query across domain boundaries; detect when task requires multiple domains; retrieve from each; compose context") },
  { domain: "knowledge.discovery", title: "Designing KB discovery caching for high-frequency query patterns", concept: C("cache top-K results per frequent query signature; TTL = query volume decay; invalidate on new KB in domain") },
  { domain: "knowledge.discovery", title: "Implementing KB discovery latency optimization procedures", concept: C("pre-compute domain embeddings index; serve from memory; HNSW for sub-millisecond ANN; cache hot query results") },
];

/** 4. Reputation scoring (10) */
const REPUTATION: SeedSpec[] = [
  { domain: "knowledge.reputation_scoring", title: "Computing KB reputation scores from query volume and endorsements", concept: C("score = min(1000, min(500, queryVolume×2) + min(100, endorsements×20)); update on each query and endorsement event") },
  { domain: "knowledge.reputation_scoring", title: "Implementing query volume tracking for KB reputation scoring", concept: C("increment query counter on each settleQuery event; index by KB ID; use in reputation formula; never decrement") },
  { domain: "knowledge.reputation_scoring", title: "Implementing endorsement tracking for KB reputation scoring", concept: C("endorsement event: endorser wallet + KB ID + timestamp; require endorser has own KB; increment counter; log on-chain") },
  { domain: "knowledge.reputation_scoring", title: "Designing reputation score decay for stale KB detection", concept: C("time-decay factor on query volume component; KBs not queried decay toward endorsement-only score; surface stale KBs") },
  { domain: "knowledge.reputation_scoring", title: "Implementing wallet-level reputation aggregation from KB portfolio", concept: C("wallet reputation = f(owned KBs reputation scores); weighted by stake; used for trust tier and agent routing decisions") },
  { domain: "knowledge.reputation_scoring", title: "Designing reputation score Sybil resistance mechanisms", concept: C("endorsements require endorser to have on-chain KB; query volume requires stake; weight by endorser reputation") },
  { domain: "knowledge.reputation_scoring", title: "Implementing reputation score leaderboard and discovery ranking", concept: C("rank KBs by score within domain; leaderboard per KB type; expose via subgraph query; refresh on score update") },
  { domain: "knowledge.reputation_scoring", title: "Designing reputation score impact on agent routing priority", concept: C("agent retrieval engine weights by reputation; higher score = higher ranking in retrieval results; configurable weight") },
  { domain: "knowledge.reputation_scoring", title: "Implementing reputation score auditability and transparency", concept: C("reputation components queryable on-chain; queryVolume and endorsements in KB struct; formula published in spec") },
  { domain: "knowledge.reputation_scoring", title: "Designing reputation bootstrapping procedures for new KB publishers", concept: C("new KB starts at 0; first queries from trusted agents boost quickly; seed KBs get initial endorsements from protocol") },
];

/** 5. Knowledge conflict resolution (8) */
const CONFLICT_RESOLUTION: SeedSpec[] = [
  { domain: "knowledge.conflict_resolution", title: "Detecting conflicting claims between knowledge artifacts", concept: C("embed claims; high cosine similarity + different assertions = conflict candidate; surface for review; flag in catalog") },
  { domain: "knowledge.conflict_resolution", title: "Designing knowledge conflict resolution procedures for KB graphs", concept: C("conflict: two KBs assert contradictory procedures for same domain; resolution: reputation-weighted voting or deprecation") },
  { domain: "knowledge.conflict_resolution", title: "Implementing KB deprecation procedures for superseded knowledge", concept: C("deprecate: mark is_deprecated=true; point to superseding KB; stop routing to deprecated; maintain for lineage integrity") },
  { domain: "knowledge.conflict_resolution", title: "Designing KB versioning to handle knowledge updates without conflict", concept: C("new version = new KB with parent = old KB; derivation graph preserves history; deprecated old; version in title") },
  { domain: "knowledge.conflict_resolution", title: "Implementing KB dispute resolution procedures for contested claims", concept: C("dispute: any stakeholder flags KB; evidence submission period; reputation-weighted vote; outcome: retain, deprecate, fork") },
  { domain: "knowledge.conflict_resolution", title: "Designing consensus mechanisms for KB quality disputes", concept: C("validator quorum reviews disputed KB; weighted by validator reputation; supermajority to deprecate; on-chain outcome") },
  { domain: "knowledge.conflict_resolution", title: "Detecting contradictory invariants across KB knowledge base", concept: C("extract invariants from KBs in same domain; symbolic comparison for contradiction; flag conflicting invariant pairs") },
  { domain: "knowledge.conflict_resolution", title: "Designing KB fork procedures for legitimate domain divergence", concept: C("fork: create two child KBs from common ancestor; each fork has distinct claim; both valid; routing by context") },
];

/** 6. Knowledge economics (10) */
const KNOWLEDGE_ECONOMICS: SeedSpec[] = [
  { domain: "knowledge.knowledge_economics", title: "Designing KB staking economics for quality incentive alignment", concept: C("stake = skin in game; slashable on invalid KB; min stake = 0.001 ETH; higher stake = higher trust signal") },
  { domain: "knowledge.knowledge_economics", title: "Implementing settlement payment routing through royalty DAG", concept: C("settleQuery payment → 2% protocol fee → remainder distributed by royalty_bps through derivation graph to ancestors") },
  { domain: "knowledge.knowledge_economics", title: "Designing pending withdrawal pull payment procedures for KB earnings", concept: C("earnings accumulate in pendingWithdrawals[wallet]; publisher calls withdraw(); gas-efficient pull pattern; no push") },
  { domain: "knowledge.knowledge_economics", title: "Modeling KB monetization economics for publisher ROI analysis", concept: C("revenue = queryVolume × settlement_amount × royalty_share; cost = publishKB gas + stake; ROI by domain and KB type") },
  { domain: "knowledge.knowledge_economics", title: "Designing bootstrapping economics for zero-stake KB generation phase", concept: C("setMinStake(0) enables zero-cost publication; validator quality gate replaces economic gate; restore stake after density") },
  { domain: "knowledge.knowledge_economics", title: "Implementing query pricing models for KB consumption incentives", concept: C("price per query; higher reputation KBs may command higher prices; market discovery via usage signals; floor price") },
  { domain: "knowledge.knowledge_economics", title: "Designing protocol fee distribution for network sustainability", concept: C("2% protocol fee per settlement; accumulates in treasury; governance controls allocation; fund: development, security, grants") },
  { domain: "knowledge.knowledge_economics", title: "Modeling knowledge inflation risks in open KB publication systems", concept: C("risk: low-quality KB flood dilutes discovery; mitigation: quality gates, staking, reputation weighting, dedup detection") },
  { domain: "knowledge.knowledge_economics", title: "Designing KB slashing procedures for invalid or malicious knowledge", concept: C("slash: validator evidence → governance vote → slash stake → mark KB invalid; zero-stake KBs immune to slash") },
  { domain: "knowledge.knowledge_economics", title: "Implementing knowledge market analytics for protocol health monitoring", concept: C("metrics: total KBs, query volume trend, settlement volume, unique publishers, top domains, reputation distribution") },
];

/** 7. Protocol governance (8) */
const GOVERNANCE: SeedSpec[] = [
  { domain: "knowledge.governance", title: "Designing knowledge protocol parameter governance procedures", concept: C("parameters: minStake, protocol fee, MAX_PARENTS; governance proposal → vote → timelock → execute; on-chain") },
  { domain: "knowledge.governance", title: "Implementing KB schema upgrade governance procedures", concept: C("schema change proposal; backward compat analysis; migration path for existing KBs; vote; deploy; update validators") },
  { domain: "knowledge.governance", title: "Designing validator agent certification procedures for quality governance", concept: C("validator must prove quality gate correctness; stake to certify; slash for false validation; registry of certified validators") },
  { domain: "knowledge.governance", title: "Implementing emergency pause procedures for protocol security incidents", concept: C("pause: owner can halt publishKB and settleQuery; limited scope; governed unpause; postmortem before resume") },
  { domain: "knowledge.governance", title: "Designing protocol upgrade path procedures for registry contract evolution", concept: C("UUPS proxy; governance vote; timelock; test on fork; staged rollout; fallback plan; audit before upgrade") },
  { domain: "knowledge.governance", title: "Implementing knowledge protocol standard specification procedures", concept: C("spec document per schema version; changelog; conformance test suite; reference implementation; RFC-style process") },
  { domain: "knowledge.governance", title: "Designing domain registry governance for KB taxonomy management", concept: C("domain namespace allocation; governance controls new top-level domains; prevents squatting; open subdomains") },
  { domain: "knowledge.governance", title: "Implementing protocol transparency and auditability reporting procedures", concept: C("monthly: total KBs, query volume, settlement, slash events, protocol fee collected; public dashboard; on-chain verifiable") },
];

export const KNOWLEDGE_SYSTEMS_SEED_SPECS: SeedSpec[] = [
  ...ARTIFACT_VALIDATION,
  ...DERIVATION_GRAPHS,
  ...DISCOVERY,
  ...REPUTATION,
  ...CONFLICT_RESOLUTION,
  ...KNOWLEDGE_ECONOMICS,
  ...GOVERNANCE,
];
