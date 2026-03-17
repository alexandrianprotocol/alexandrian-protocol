/**
 * Failure Mode & Debugging Knowledge Layer (~800 seeds).
 * Improves real-world performance for debugging and troubleshooting across
 * software, distributed systems, performance, frontend, and DevOps.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** Software debugging */
const SOFTWARE_DEBUG: SeedSpec[] = [
  { domain: "failure_debug.software", title: "Diagnosing memory leaks", concept: C("profile heap; identify retainers; fix or isolate") },
  { domain: "failure_debug.software", title: "Analyzing stack traces", concept: C("parse trace; map to source; identify root frame") },
  { domain: "failure_debug.software", title: "Identifying race conditions", concept: C("instrument sync points; reproduce; fix ordering or locks") },
  { domain: "failure_debug.software", title: "Debugging dependency conflicts", concept: C("resolve tree; pin versions; isolate conflict") },
  { domain: "failure_debug.software", title: "Analyzing concurrency bugs", concept: C("reproduce; trace; add synchronization or immutable design") },
  { domain: "failure_debug.software", title: "Diagnosing deadlocks", concept: C("capture stack; detect cycle; break with ordering or timeout") },
  { domain: "failure_debug.software", title: "Debugging null pointer exceptions", concept: C("trace origin; add guards; use optional types") },
  { domain: "failure_debug.software", title: "Identifying resource exhaustion", concept: C("measure usage; cap or pool; release correctly") },
];

/** Distributed system failures */
const DISTRIBUTED_FAILURES: SeedSpec[] = [
  { domain: "failure_debug.distributed", title: "Diagnosing network partitions", concept: C("detect partition; identify split; restore connectivity or failover") },
  { domain: "failure_debug.distributed", title: "Debugging distributed consensus failures", concept: C("inspect quorum; check timeouts; fix config or leader") },
  { domain: "failure_debug.distributed", title: "Analyzing message queue backlogs", concept: C("measure depth; find slow consumer; scale or backpressure") },
  { domain: "failure_debug.distributed", title: "Diagnosing service discovery failures", concept: C("check registry; health; network; fix registration or TTL") },
  { domain: "failure_debug.distributed", title: "Debugging distributed transaction failures", concept: C("trace participants; check timeouts; design saga or 2PC") },
  { domain: "failure_debug.distributed", title: "Diagnosing replication lag", concept: C("measure lag; find bottleneck; tune or scale replicas") },
];

/** Performance failures */
const PERFORMANCE_FAILURES: SeedSpec[] = [
  { domain: "failure_debug.performance", title: "Diagnosing latency spikes", concept: C("measure p99; correlate; fix hotspot or dependency") },
  { domain: "failure_debug.performance", title: "Analyzing CPU bottlenecks", concept: C("profile CPU; find hot path; optimize or scale") },
  { domain: "failure_debug.performance", title: "Identifying cache inefficiencies", concept: C("measure hit rate; tune size/TTL; fix invalidation") },
  { domain: "failure_debug.performance", title: "Diagnosing slow database queries", concept: C("explain plan; add index; reduce N+1 or batch") },
  { domain: "failure_debug.performance", title: "Debugging high memory usage", concept: C("profile heap; find leak or size; cap or optimize") },
  { domain: "failure_debug.performance", title: "Identifying I/O bottlenecks", concept: C("measure IOPS; tune batch or async; scale storage") },
];

/** Frontend failures */
const FRONTEND_FAILURES: SeedSpec[] = [
  { domain: "failure_debug.frontend", title: "Debugging rendering issues", concept: C("inspect DOM; check state; fix render path or keys") },
  { domain: "failure_debug.frontend", title: "Diagnosing layout inconsistencies", concept: C("compare viewport; check CSS; fix breakpoints or containment") },
  { domain: "failure_debug.frontend", title: "Debugging browser compatibility issues", concept: C("reproduce in target; polyfill or feature-detect; test matrix") },
  { domain: "failure_debug.frontend", title: "Diagnosing UI state synchronization bugs", concept: C("trace state flow; fix race or single source of truth") },
  { domain: "failure_debug.frontend", title: "Debugging hydration mismatches", concept: C("compare server/client output; fix conditional or env-dependent render") },
];

/** DevOps failures */
const DEVOPS_FAILURES: SeedSpec[] = [
  { domain: "failure_debug.devops", title: "Debugging deployment failures", concept: C("check logs; verify artifact and env; fix config or rollback") },
  { domain: "failure_debug.devops", title: "Diagnosing CI/CD pipeline errors", concept: C("inspect failed step; fix script or dependency; re-run") },
  { domain: "failure_debug.devops", title: "Debugging container orchestration failures", concept: C("check pod events; resource limits; fix spec or node") },
  { domain: "failure_debug.devops", title: "Diagnosing infrastructure provisioning failures", concept: C("check IaC state; fix template or provider; retry") },
  { domain: "failure_debug.devops", title: "Debugging rollback failures", concept: C("verify previous artifact; fix rollback path; document") },
];

export const FAILURE_DEBUG_SEED_SPECS: SeedSpec[] = [
  ...SOFTWARE_DEBUG,
  ...DISTRIBUTED_FAILURES,
  ...PERFORMANCE_FAILURES,
  ...FRONTEND_FAILURES,
  ...DEVOPS_FAILURES,
];
