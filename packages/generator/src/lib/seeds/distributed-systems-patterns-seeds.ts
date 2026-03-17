/**
 * Distributed Systems Patterns Seeds (~80 seed procedures).
 * CAP theorem, clock synchronization, partition handling,
 * consistency patterns, sagas, distributed transactions,
 * and fundamental distributed computing primitives.
 * Domain: distributed.*
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. CAP theorem and consistency models (10) */
const CAP: SeedSpec[] = [
  { domain: "distributed.cap.analysis", title: "Applying CAP theorem analysis to distributed system design decisions", concept: C("partition occurs → choose: CP (consistency, reject requests) or AP (availability, serve stale); match to business requirement") },
  { domain: "distributed.cap.pacelc", title: "Applying PACELC model for latency-consistency tradeoff analysis", concept: C("no partition: choose latency vs consistency; lower latency = weaker consistency; quantify tradeoff per operation type") },
  { domain: "distributed.cap.eventual_consistency", title: "Designing eventually consistent systems with convergence guarantees", concept: C("all nodes converge given no new updates; conflict resolution: LWW or CRDT; convergence time = propagation delay") },
  { domain: "distributed.cap.strong_consistency", title: "Implementing strong consistency in distributed systems", concept: C("linearizability: each op appears instantaneous; requires quorum or single leader; higher latency; use for critical data") },
  { domain: "distributed.cap.read_your_writes", title: "Implementing read-your-writes consistency guarantees", concept: C("route reads to primary after write; or wait for replica to catch up; or cache write result for same user") },
  { domain: "distributed.cap.monotonic_reads", title: "Implementing monotonic read consistency in distributed systems", concept: C("client always reads same or newer data; route same client to same replica; or track version vector") },
  { domain: "distributed.cap.session", title: "Implementing session consistency guarantees for user-facing systems", concept: C("within session: read-your-writes + monotonic reads; across sessions: eventual; sticky session to replica for window") },
  { domain: "distributed.cap.causal", title: "Implementing causal consistency in distributed systems", concept: C("causally related ops seen in order; unrelated ops may be seen out of order; vector clocks track causality") },
  { domain: "distributed.cap.conflict_resolution", title: "Designing conflict resolution strategies for concurrent distributed writes", concept: C("LWW: last write wins by timestamp; multi-version: return all versions; CRDT: automatic merge; application-level: domain logic") },
  { domain: "distributed.cap.tunable", title: "Designing tunable consistency systems for workload-specific guarantees", concept: C("per-request consistency level: ONE, QUORUM, ALL; stronger consistency = higher latency; match to operation criticality") },
];

/** 2. Clock synchronization (8) */
const CLOCKS: SeedSpec[] = [
  { domain: "distributed.clocks.ntp", title: "Implementing NTP clock synchronization for distributed systems", concept: C("NTP drift < 100ms typical; do not assume exact sync; bound uncertainty; use offset for ordering only with caution") },
  { domain: "distributed.clocks.logical", title: "Implementing Lamport logical clocks for event ordering", concept: C("increment on send; max(local, received)+1 on receive; total ordering with tie-break by node ID; not wall clock") },
  { domain: "distributed.clocks.vector", title: "Implementing vector clocks for causal event ordering", concept: C("N-element vector; increment own slot on event; merge by max per slot on receive; compare: dominates or concurrent") },
  { domain: "distributed.clocks.hybrid", title: "Implementing hybrid logical clocks combining physical and logical time", concept: C("HLC: max(NTP, logical)+1; tracks causality + approximate wall time; drift bounded; used in CockroachDB, YugabyteDB") },
  { domain: "distributed.clocks.truetime", title: "Designing timestamp systems with bounded clock uncertainty", concept: C("TrueTime: [earliest, latest] interval; wait out uncertainty before commit; linearizability with bounded wait (10ms)") },
  { domain: "distributed.clocks.monotonic", title: "Using monotonic clocks for duration measurement in distributed systems", concept: C("monotonic clock for intervals; never for wall time across processes; NTP adjustments do not affect monotonic clock") },
  { domain: "distributed.clocks.drift", title: "Designing clock drift compensation procedures for distributed telemetry", concept: C("measure drift vs NTP periodically; apply correction factor; alert on drift > threshold; use logical clocks for ordering") },
  { domain: "distributed.clocks.ordering", title: "Designing event ordering guarantees without synchronized clocks", concept: C("vector clocks for causal ordering; sequence numbers from single source; Raft log for total ordering; avoid wall clock ordering") },
];

/** 3. Partition handling (8) */
const PARTITIONS: SeedSpec[] = [
  { domain: "distributed.partition.detection", title: "Detecting network partitions in distributed systems", concept: C("heartbeat timeout; distinguish: slow vs partitioned; conservative timeout to avoid false positive; alert on detection") },
  { domain: "distributed.partition.cp_response", title: "Designing CP system responses to network partition events", concept: C("minority partition: stop accepting writes; majority continues; reject requests from minority; restore on heal") },
  { domain: "distributed.partition.ap_response", title: "Designing AP system responses to network partition events", concept: C("both sides accept writes; record concurrent mutations; resolve conflicts on partition heal; tombstones for deletes") },
  { domain: "distributed.partition.quorum", title: "Implementing quorum-based partition tolerance in distributed systems", concept: C("quorum = N/2+1; operations succeed only with quorum; minority partition cannot make progress; prevents split-brain") },
  { domain: "distributed.partition.fencing", title: "Implementing fencing tokens to prevent split-brain writes", concept: C("monotonically increasing token from lock service; resource rejects write with lower token than seen; prevents stale leader") },
  { domain: "distributed.partition.recovery", title: "Designing partition recovery and state reconciliation procedures", concept: C("detect heal; identify divergent state; merge or overwrite based on consistency policy; verify convergence post-heal") },
  { domain: "distributed.partition.testing", title: "Designing network partition testing procedures for distributed systems", concept: C("inject partition via iptables or tc; verify system behavior; test partition heal; chaos engineering integration") },
  { domain: "distributed.partition.observability", title: "Implementing partition event observability in distributed systems", concept: C("detect and log partition events; track duration; alert on partition; correlate with error rate and latency spikes") },
];

/** 4. Saga patterns (10) */
const SAGAS: SeedSpec[] = [
  { domain: "distributed.saga.design", title: "Designing saga patterns for distributed multi-step transactions", concept: C("saga = sequence of local transactions; compensating transaction per step; rollback in reverse order on failure") },
  { domain: "distributed.saga.choreography", title: "Implementing choreography-based saga coordination", concept: C("each service listens for event; publishes success or failure event; next step triggered by event; no central coordinator") },
  { domain: "distributed.saga.orchestration", title: "Implementing orchestration-based saga coordination", concept: C("orchestrator sends commands to services; receives events; tracks state; decides next step or compensation; single source of truth") },
  { domain: "distributed.saga.compensation", title: "Designing compensating transactions for saga rollback procedures", concept: C("compensation = semantic undo not DB rollback; idempotent; record compensation needed at each step; verify compensated") },
  { domain: "distributed.saga.idempotency", title: "Implementing idempotency in saga participant services", concept: C("each saga step idempotent; saga ID + step ID as idempotency key; duplicate command = return previous result") },
  { domain: "distributed.saga.state_machine", title: "Modeling saga execution as explicit state machines", concept: C("states: STARTED, STEP_N_COMPLETE, COMPENSATING, COMPENSATED, COMPLETED; transitions logged; queryable status") },
  { domain: "distributed.saga.timeout", title: "Implementing saga timeout and stuck transaction detection", concept: C("max saga duration; scanner finds stuck sagas; trigger compensation after timeout; alert on stuck sagas") },
  { domain: "distributed.saga.testing", title: "Testing saga workflows with failure injection at each step", concept: C("inject failure after each step; verify compensation executed in reverse; verify final state = compensated; all paths tested") },
  { domain: "distributed.saga.observability", title: "Implementing saga execution observability and tracing", concept: C("trace per saga execution; span per step; log state transitions; alert on compensation rate spike; dashboard per saga type") },
  { domain: "distributed.saga.vs_2pc", title: "Choosing between sagas and two-phase commit for distributed transactions", concept: C("2PC: strong consistency, blocking, single coordinator SPOF; saga: eventual, non-blocking, complex compensation; prefer saga for microservices") },
];

/** 5. Replication patterns (10) */
const REPLICATION: SeedSpec[] = [
  { domain: "distributed.replication.leader_follower", title: "Designing leader-follower replication architectures", concept: C("leader accepts writes; replicates to followers; followers serve reads; failover: elect new leader on leader failure") },
  { domain: "distributed.replication.multi_leader", title: "Designing multi-leader replication for geographic distribution", concept: C("each region has leader; async cross-region replication; conflict detection and resolution required; higher write availability") },
  { domain: "distributed.replication.leaderless", title: "Designing leaderless replication with quorum reads and writes", concept: C("write to W nodes; read from R nodes; W+R > N for consistency; repair stale replicas on read; anti-entropy background") },
  { domain: "distributed.replication.lag", title: "Handling replication lag in distributed database systems", concept: C("measure lag per replica; route sensitive reads to leader; tolerate lag for eventual consistency reads; alert on lag spike") },
  { domain: "distributed.replication.failover", title: "Designing automatic failover procedures for leader election", concept: C("detect leader failure; candidates check quorum; winner elected; update clients; prevent split-brain with fencing") },
  { domain: "distributed.replication.change_data_capture", title: "Implementing change data capture for event-driven replication", concept: C("CDC from WAL/binlog; Debezium; emit per-row change events; consumers build materialized views; exactly-once with offset") },
  { domain: "distributed.replication.read_replica", title: "Designing read replica routing for read-heavy workloads", concept: C("route read queries to replica pool; round-robin or least-connections; accept lag tolerance per query; failover to primary") },
  { domain: "distributed.replication.geo_replication", title: "Designing multi-region geo-replication for global systems", concept: C("active-active: writes in each region; async cross-region sync; conflict resolution; data residency compliance per region") },
  { domain: "distributed.replication.backfill", title: "Designing replica backfill and catch-up procedures", concept: C("snapshot from leader + WAL offset; apply snapshot to replica; replay WAL from offset; catch up before receiving live updates") },
  { domain: "distributed.replication.testing", title: "Testing replication consistency and failover procedures", concept: C("pause replication; write to leader; resume; verify replica converges; test failover time; chaos: kill leader mid-write") },
];

/** 6. Distributed coordination primitives (10) */
const COORDINATION: SeedSpec[] = [
  { domain: "distributed.coordination.service_discovery", title: "Implementing service discovery in distributed systems", concept: C("services register with discovery system; clients query by service name; health check removes unhealthy; DNS or API") },
  { domain: "distributed.coordination.config_propagation", title: "Designing configuration propagation in distributed systems", concept: C("config store → watch → push or poll → apply; version config; validate before push; rollback on error; etcd or consul") },
  { domain: "distributed.coordination.barrier", title: "Implementing distributed barriers for multi-process synchronization", concept: C("all workers register; coordinator waits for N registrations; releases all when N reached; ZooKeeper or custom with Redis") },
  { domain: "distributed.coordination.semaphore", title: "Implementing distributed semaphores for resource access control", concept: C("acquire: set key with TTL if available slot; release: delete key; count slots; heartbeat to extend TTL during use") },
  { domain: "distributed.coordination.work_queue", title: "Designing distributed work queue systems for task processing", concept: C("producer enqueues tasks; workers pull and lock tasks; ack on completion; retry on timeout; dead letter after max retries") },
  { domain: "distributed.coordination.scheduler", title: "Designing distributed task scheduling with leader election", concept: C("elected leader runs scheduler; followers standby; leader schedules tasks; failover: new leader picks up on crash") },
  { domain: "distributed.coordination.membership", title: "Implementing distributed group membership protocols", concept: C("SWIM protocol: ping + indirect ping; failure detection; join/leave/failed events; gossip membership list propagation") },
  { domain: "distributed.coordination.bulkhead", title: "Implementing bulkhead isolation patterns for distributed fault tolerance", concept: C("separate thread pools per downstream; independent semaphores; failure in one does not exhaust shared pool; Hystrix model") },
  { domain: "distributed.coordination.backoff", title: "Designing distributed retry backoff procedures to prevent overload", concept: C("exponential backoff with jitter: min(cap, base × 2^n) × random(0.5, 1.5); prevent thundering herd; max retries") },
  { domain: "distributed.coordination.circuit_breaker", title: "Implementing circuit breaker patterns for distributed service calls", concept: C("CLOSED: normal; OPEN: fast fail; HALF-OPEN: probe; open on N failures in window; close on probe success; bulkhead integration") },
];

/** 7. Distributed data patterns (10) */
const DATA_PATTERNS: SeedSpec[] = [
  { domain: "distributed.data.sharding", title: "Designing data sharding strategies for distributed databases", concept: C("hash shard: consistent hashing; range shard: by key range; directory shard: lookup table; choose by access pattern") },
  { domain: "distributed.data.consistent_hashing", title: "Implementing consistent hashing for distributed data routing", concept: C("ring of 2^32 positions; nodes on ring; key routes to next clockwise node; virtual nodes for load balance; rebalance on change") },
  { domain: "distributed.data.hot_spot", title: "Detecting and mitigating hot spot data access in distributed systems", concept: C("monitor per-shard load; detect hot keys; mitigate: split shard, add cache, randomize key suffix, micro-sharding") },
  { domain: "distributed.data.materialized_view", title: "Implementing materialized views for distributed query performance", concept: C("pre-compute aggregates; update from change events; stale tolerance per view; invalidate on source change; rebuild on schema change") },
  { domain: "distributed.data.event_sourcing", title: "Designing event sourcing patterns for distributed system state", concept: C("state = fold of events; append-only event log; rebuild from events; snapshot periodically for fast restore; event versioning") },
  { domain: "distributed.data.cqrs_distributed", title: "Implementing CQRS patterns in distributed microservice architectures", concept: C("command service writes to event log; query service consumes events; builds read-optimized models; eventual consistency") },
  { domain: "distributed.data.two_phase", title: "Implementing two-phase commit for distributed ACID transactions", concept: C("prepare phase: coordinator asks all to prepare; commit phase: all prepared → commit; abort if any fails; blocking on coordinator crash") },
  { domain: "distributed.data.outbox", title: "Implementing the transactional outbox pattern for reliable event publishing", concept: C("write event to outbox table in same DB transaction; relay polls and publishes; at-least-once; idempotent consumer") },
  { domain: "distributed.data.cross_shard", title: "Designing cross-shard query patterns in distributed databases", concept: C("scatter-gather: query all shards, merge results; aggregation in app layer; avoid if possible via denormalization") },
  { domain: "distributed.data.local_first", title: "Designing local-first data architectures for offline-capable distributed systems", concept: C("local store as primary; sync with remote on connect; CRDT for conflict-free merge; eventual consistency by design") },
];

export const DISTRIBUTED_SYSTEMS_PATTERNS_SEED_SPECS: SeedSpec[] = [
  ...CAP,
  ...CLOCKS,
  ...PARTITIONS,
  ...SAGAS,
  ...REPLICATION,
  ...COORDINATION,
  ...DATA_PATTERNS,
];
