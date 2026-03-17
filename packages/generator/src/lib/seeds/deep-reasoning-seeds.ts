/**
 * Deep Engineering Reasoning Layer (~1200 seed procedures).
 * Reasoning frameworks for complex technical reasoning: tradeoffs, uncertainty, causal relationships,
 * system complexity, adversarial conditions, long-term evolution.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Systems thinking (10) */
const SYSTEMS_THINKING: SeedSpec[] = [
  { domain: "deep.systems_thinking", title: "Identifying system boundaries in complex architectures", concept: C("define in/out; scope and interfaces") },
  { domain: "deep.systems_thinking", title: "Mapping interactions between system components", concept: C("data and control flow; dependencies") },
  { domain: "deep.systems_thinking", title: "Modeling feedback loops in engineering systems", concept: C("identify loops; stability") },
  { domain: "deep.systems_thinking", title: "Identifying emergent behavior in complex systems", concept: C("observe; model; predict") },
  { domain: "deep.systems_thinking", title: "Performing system dependency analysis", concept: C("graph; critical path; impact") },
  { domain: "deep.systems_thinking", title: "Identifying bottlenecks in large-scale systems", concept: C("measure; locate; prioritize") },
  { domain: "deep.systems_thinking", title: "Modeling cascading failures in distributed systems", concept: C("failure modes; propagation") },
  { domain: "deep.systems_thinking", title: "Designing systems with minimal coupling", concept: C("interfaces; cohesion") },
  { domain: "deep.systems_thinking", title: "Evaluating system stability under load", concept: C("load test; stability criteria") },
  { domain: "deep.systems_thinking", title: "Identifying system control points", concept: C("levers; observability") },
];

/** 2. Engineering tradeoff analysis (10) */
const TRADEOFF_ANALYSIS: SeedSpec[] = [
  { domain: "deep.tradeoff_analysis", title: "Evaluating performance vs maintainability tradeoffs", concept: C("criteria; weights; decision") },
  { domain: "deep.tradeoff_analysis", title: "Analyzing scalability vs complexity tradeoffs", concept: C("scale targets; complexity cost") },
  { domain: "deep.tradeoff_analysis", title: "Evaluating consistency vs availability tradeoffs", concept: C("CAP; requirements") },
  { domain: "deep.tradeoff_analysis", title: "Comparing synchronous vs asynchronous architectures", concept: C("latency; complexity; failure") },
  { domain: "deep.tradeoff_analysis", title: "Analyzing compute vs memory tradeoffs", concept: C("resource profile; constraints") },
  { domain: "deep.tradeoff_analysis", title: "Evaluating cost vs reliability tradeoffs", concept: C("SLA; cost model") },
  { domain: "deep.tradeoff_analysis", title: "Comparing centralized vs decentralized systems", concept: C("control; resilience; ops") },
  { domain: "deep.tradeoff_analysis", title: "Evaluating latency vs throughput tradeoffs", concept: C("batching; pipelining") },
  { domain: "deep.tradeoff_analysis", title: "Comparing vertical vs horizontal scaling", concept: C("limits; cost curve") },
  { domain: "deep.tradeoff_analysis", title: "Evaluating abstraction depth vs system performance", concept: C("layers; overhead") },
];

/** 3. Causal reasoning (10) */
const CAUSAL_REASONING: SeedSpec[] = [
  { domain: "deep.causal_reasoning", title: "Identifying root causes of system failures", concept: C("5 whys; evidence chain") },
  { domain: "deep.causal_reasoning", title: "Modeling causal relationships in system behavior", concept: C("cause-effect; graph") },
  { domain: "deep.causal_reasoning", title: "Analyzing causal chains in distributed failures", concept: C("propagation; root cause") },
  { domain: "deep.causal_reasoning", title: "Identifying indirect system dependencies", concept: C("transitive deps; impact") },
  { domain: "deep.causal_reasoning", title: "Performing counterfactual analysis", concept: C("what if; intervention") },
  { domain: "deep.causal_reasoning", title: "Modeling causal graphs for system interactions", concept: C("DAG; confounders") },
  { domain: "deep.causal_reasoning", title: "Identifying causal bottlenecks in pipelines", concept: C("upstream; bottleneck") },
  { domain: "deep.causal_reasoning", title: "Analyzing feedback loops causing instability", concept: C("loop; gain; damp") },
  { domain: "deep.causal_reasoning", title: "Modeling causal relationships in performance degradation", concept: C("factor; contribution") },
  { domain: "deep.causal_reasoning", title: "Identifying hidden causal dependencies", concept: C("trace; infer") },
];

/** 4. Decision theory (10) */
const DECISION_THEORY: SeedSpec[] = [
  { domain: "deep.decision_theory", title: "Designing decision trees for engineering choices", concept: C("branches; criteria; leaf") },
  { domain: "deep.decision_theory", title: "Evaluating expected value of architecture options", concept: C("outcomes; probability; EV") },
  { domain: "deep.decision_theory", title: "Modeling probabilistic outcomes of engineering decisions", concept: C("distributions; scenarios") },
  { domain: "deep.decision_theory", title: "Performing multi-criteria decision analysis", concept: C("criteria; weights; score") },
  { domain: "deep.decision_theory", title: "Designing decision scoring frameworks", concept: C("factors; normalize; aggregate") },
  { domain: "deep.decision_theory", title: "Evaluating decision uncertainty", concept: C("sensitivity; bounds") },
  { domain: "deep.decision_theory", title: "Performing sensitivity analysis on engineering decisions", concept: C("vary inputs; impact") },
  { domain: "deep.decision_theory", title: "Modeling decision risk scenarios", concept: C("downside; probability") },
  { domain: "deep.decision_theory", title: "Designing optimal decision policies", concept: C("policy; constraints; optimize") },
  { domain: "deep.decision_theory", title: "Implementing cost-benefit analysis frameworks", concept: C("costs; benefits; NPV") },
];

/** 5. Optimization reasoning (10) */
const OPTIMIZATION: SeedSpec[] = [
  { domain: "deep.optimization", title: "Identifying optimization objectives in systems", concept: C("objective; constraints") },
  { domain: "deep.optimization", title: "Designing constrained optimization models", concept: C("objective; constraints; vars") },
  { domain: "deep.optimization", title: "Implementing gradient optimization strategies", concept: C("gradient; step; converge") },
  { domain: "deep.optimization", title: "Designing heuristic optimization methods", concept: C("heuristic; local search") },
  { domain: "deep.optimization", title: "Modeling multi-objective optimization problems", concept: C("Pareto; tradeoff") },
  { domain: "deep.optimization", title: "Identifying optimization bottlenecks", concept: C("profile; bottleneck") },
  { domain: "deep.optimization", title: "Designing optimization convergence checks", concept: C("tolerance; max iter") },
  { domain: "deep.optimization", title: "Evaluating optimization stability", concept: C("sensitivity; robustness") },
  { domain: "deep.optimization", title: "Designing optimization search strategies", concept: C("search space; strategy") },
  { domain: "deep.optimization", title: "Implementing resource allocation optimization", concept: C("allocate; objective") },
];

/** 6. Reliability engineering (10) */
const RELIABILITY: SeedSpec[] = [
  { domain: "deep.reliability", title: "Modeling system reliability metrics", concept: C("MTTF; MTTR; availability") },
  { domain: "deep.reliability", title: "Identifying single points of failure", concept: C("SPOF; mitigate") },
  { domain: "deep.reliability", title: "Designing redundancy strategies", concept: C("N+1; active/passive") },
  { domain: "deep.reliability", title: "Evaluating failure probability models", concept: C("failure rate; model") },
  { domain: "deep.reliability", title: "Implementing fault tolerance architectures", concept: C("detect; isolate; recover") },
  { domain: "deep.reliability", title: "Modeling system uptime guarantees", concept: C("SLA; SLO") },
  { domain: "deep.reliability", title: "Designing failure recovery mechanisms", concept: C("recovery procedure; RTO") },
  { domain: "deep.reliability", title: "Evaluating reliability tradeoffs", concept: C("cost vs availability") },
  { domain: "deep.reliability", title: "Designing reliability testing procedures", concept: C("chaos; failover test") },
  { domain: "deep.reliability", title: "Modeling cascading failure probabilities", concept: C("propagation; probability") },
];

/** 7. Risk analysis (10) */
const RISK_ANALYSIS: SeedSpec[] = [
  { domain: "deep.risk_analysis", title: "Identifying technical risk factors", concept: C("risk register; likelihood; impact") },
  { domain: "deep.risk_analysis", title: "Designing engineering risk assessment models", concept: C("model; score; prioritize") },
  { domain: "deep.risk_analysis", title: "Evaluating operational risk scenarios", concept: C("scenarios; mitigation") },
  { domain: "deep.risk_analysis", title: "Modeling risk probability distributions", concept: C("distributions; Monte Carlo") },
  { domain: "deep.risk_analysis", title: "Designing mitigation strategies for engineering risks", concept: C("avoid; reduce; transfer") },
  { domain: "deep.risk_analysis", title: "Evaluating infrastructure risk exposure", concept: C("exposure; controls") },
  { domain: "deep.risk_analysis", title: "Modeling project risk dependencies", concept: C("dependency; cascade") },
  { domain: "deep.risk_analysis", title: "Designing risk monitoring systems", concept: C("indicators; alert") },
  { domain: "deep.risk_analysis", title: "Evaluating technology adoption risks", concept: C("adoption; lock-in; obsolescence") },
  { domain: "deep.risk_analysis", title: "Modeling risk impact severity", concept: C("impact scale; criteria") },
];

/** 8. Adversarial reasoning (10) */
const ADVERSARIAL: SeedSpec[] = [
  { domain: "deep.adversarial", title: "Modeling adversarial attack strategies", concept: C("threat model; attack tree") },
  { domain: "deep.adversarial", title: "Identifying attack surfaces in system architectures", concept: C("surface; entry points") },
  { domain: "deep.adversarial", title: "Designing adversarial defense strategies", concept: C("defense in depth; detect") },
  { domain: "deep.adversarial", title: "Modeling worst-case system scenarios", concept: C("worst case; bounds") },
  { domain: "deep.adversarial", title: "Designing systems resilient to malicious inputs", concept: C("validate; sanitize; limit") },
  { domain: "deep.adversarial", title: "Evaluating adversarial AI attack vectors", concept: C("evasion; poisoning; extraction") },
  { domain: "deep.adversarial", title: "Designing system defenses against denial-of-service attacks", concept: C("rate limit; absorb; scale") },
  { domain: "deep.adversarial", title: "Modeling adversarial manipulation of system states", concept: C("state; integrity") },
  { domain: "deep.adversarial", title: "Designing attack detection mechanisms", concept: C("anomaly; signature") },
  { domain: "deep.adversarial", title: "Evaluating adversarial system vulnerabilities", concept: C("vuln; exploitability") },
];

/** 9. Scientific reasoning (10) */
const SCIENTIFIC: SeedSpec[] = [
  { domain: "deep.scientific", title: "Designing hypothesis testing workflows", concept: C("hypothesis; test; reject/accept") },
  { domain: "deep.scientific", title: "Evaluating experimental evidence strength", concept: C("evidence; confidence") },
  { domain: "deep.scientific", title: "Modeling experimental uncertainty", concept: C("uncertainty; intervals") },
  { domain: "deep.scientific", title: "Designing controlled experiments", concept: C("control; treatment; randomize") },
  { domain: "deep.scientific", title: "Identifying confounding variables", concept: C("confounders; control") },
  { domain: "deep.scientific", title: "Performing statistical significance analysis", concept: C("p-value; power") },
  { domain: "deep.scientific", title: "Designing replication experiments", concept: C("replicate; compare") },
  { domain: "deep.scientific", title: "Evaluating experiment validity", concept: C("internal; external validity") },
  { domain: "deep.scientific", title: "Modeling scientific causal relationships", concept: C("causal; confounders") },
  { domain: "deep.scientific", title: "Designing experiment validation pipelines", concept: C("validate; reproduce") },
];

/** 10. Algorithmic reasoning (10) */
const ALGORITHMIC: SeedSpec[] = [
  { domain: "deep.algorithmic", title: "Decomposing complex algorithmic problems", concept: C("subproblems; combine") },
  { domain: "deep.algorithmic", title: "Designing recursive problem-solving strategies", concept: C("base case; recurrence") },
  { domain: "deep.algorithmic", title: "Identifying algorithmic invariants", concept: C("invariant; prove") },
  { domain: "deep.algorithmic", title: "Modeling algorithm correctness proofs", concept: C("pre; post; loop inv") },
  { domain: "deep.algorithmic", title: "Designing complexity reduction strategies", concept: C("reduce; simplify") },
  { domain: "deep.algorithmic", title: "Identifying algorithmic optimization opportunities", concept: C("bottleneck; improve") },
  { domain: "deep.algorithmic", title: "Modeling algorithm performance bounds", concept: C("big-O; worst/average") },
  { domain: "deep.algorithmic", title: "Designing approximate algorithms", concept: C("approximation; guarantee") },
  { domain: "deep.algorithmic", title: "Evaluating algorithm scalability", concept: C("scale; limits") },
  { domain: "deep.algorithmic", title: "Designing algorithm testing strategies", concept: C("unit; property; stress") },
];

/** 11. Complex system modeling (10) */
const COMPLEX_MODELING: SeedSpec[] = [
  { domain: "deep.complex_modeling", title: "Modeling large-scale system interactions", concept: C("agents; interactions") },
  { domain: "deep.complex_modeling", title: "Designing simulation models for distributed systems", concept: C("model; parameters; run") },
  { domain: "deep.complex_modeling", title: "Modeling emergent behavior in complex networks", concept: C("network; emergence") },
  { domain: "deep.complex_modeling", title: "Designing system interaction graphs", concept: C("graph; dynamics") },
  { domain: "deep.complex_modeling", title: "Modeling system state transitions", concept: C("states; transitions") },
  { domain: "deep.complex_modeling", title: "Designing simulation experiments", concept: C("experiment; metrics") },
  { domain: "deep.complex_modeling", title: "Modeling resource allocation dynamics", concept: C("allocation; over time") },
  { domain: "deep.complex_modeling", title: "Designing network flow simulations", concept: C("flow; capacity") },
  { domain: "deep.complex_modeling", title: "Modeling system equilibrium states", concept: C("equilibrium; stability") },
  { domain: "deep.complex_modeling", title: "Designing agent-based simulation models", concept: C("agents; rules; env") },
];

/** 12. Architecture evolution reasoning (10) */
const ARCH_EVOLUTION: SeedSpec[] = [
  { domain: "deep.arch_evolution", title: "Modeling long-term architecture evolution", concept: C("evolution path; milestones") },
  { domain: "deep.arch_evolution", title: "Designing migration strategies for legacy systems", concept: C("strangler; parallel; cutover") },
  { domain: "deep.arch_evolution", title: "Evaluating technology replacement risks", concept: C("risk; benefit; plan") },
  { domain: "deep.arch_evolution", title: "Designing incremental architecture transitions", concept: C("incremental; reversible") },
  { domain: "deep.arch_evolution", title: "Modeling backward compatibility strategies", concept: C("compat; deprecation") },
  { domain: "deep.arch_evolution", title: "Designing system refactoring plans", concept: C("steps; order; test") },
  { domain: "deep.arch_evolution", title: "Evaluating architecture technical debt", concept: C("debt; cost; payoff") },
  { domain: "deep.arch_evolution", title: "Designing architecture upgrade paths", concept: C("path; gates") },
  { domain: "deep.arch_evolution", title: "Modeling ecosystem evolution", concept: C("deps; ecosystem") },
  { domain: "deep.arch_evolution", title: "Designing platform modernization strategies", concept: C("modernize; migrate") },
];

export const DEEP_REASONING_SEED_SPECS: SeedSpec[] = [
  ...SYSTEMS_THINKING,
  ...TRADEOFF_ANALYSIS,
  ...CAUSAL_REASONING,
  ...DECISION_THEORY,
  ...OPTIMIZATION,
  ...RELIABILITY,
  ...RISK_ANALYSIS,
  ...ADVERSARIAL,
  ...SCIENTIFIC,
  ...ALGORITHMIC,
  ...COMPLEX_MODELING,
  ...ARCH_EVOLUTION,
];
