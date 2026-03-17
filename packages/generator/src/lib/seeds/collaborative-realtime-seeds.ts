/**
 * Collaborative & Real-time Systems Seeds (~70 seed procedures).
 * CRDT design, WebSocket architecture, presence systems, operational transformation,
 * optimistic UI, real-time notifications, distributed locking, and sync protocols.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. CRDT design (10) */
const CRDT: SeedSpec[] = [
  { domain: "realtime.crdt.selection", title: "Selecting CRDT data types for collaborative document features", concept: C("text → RGA or Logoot; counter → G-Counter; set → OR-Set; map → LWW-Map; match by operation type") },
  { domain: "realtime.crdt.lww", title: "Implementing last-write-wins register CRDTs", concept: C("store (value, timestamp, nodeId); merge by max timestamp; tie-break by nodeId; clock sync required") },
  { domain: "realtime.crdt.orset", title: "Implementing observed-remove set CRDTs", concept: C("add: tag with unique ID; remove: remove all tags for element; merge: union add-sets minus remove-sets") },
  { domain: "realtime.crdt.rga", title: "Implementing replicated growable array for collaborative text", concept: C("each char has unique ID with position; insert after specific ID; tombstone deletes; merge by position order") },
  { domain: "realtime.crdt.counter", title: "Implementing distributed counter CRDTs", concept: C("G-Counter: vector of per-node counts; merge by max per index; total = sum; PN-Counter for decrement") },
  { domain: "realtime.crdt.convergence", title: "Validating CRDT convergence under concurrent operations", concept: C("apply same ops in any order; assert final state equal; fuzz with random operation interleavings") },
  { domain: "realtime.crdt.state_based", title: "Designing state-based CRDT synchronization protocols", concept: C("full state exchange; merge is join in semilattice; idempotent; send on interval or change") },
  { domain: "realtime.crdt.op_based", title: "Designing operation-based CRDT delivery guarantees", concept: C("exactly-once delivery required; causal order delivery; buffer until causal deps delivered") },
  { domain: "realtime.crdt.persistence", title: "Persisting CRDT state to durable storage", concept: C("snapshot CRDT state periodically; append ops log; reconstruct by snapshot + replay ops since snapshot") },
  { domain: "realtime.crdt.compaction", title: "Compacting CRDT operation logs for storage efficiency", concept: C("merge tombstones after all nodes acknowledge; compact op log to snapshot; GC below min vector clock") },
];

/** 2. WebSocket architecture (8) */
const WEBSOCKET: SeedSpec[] = [
  { domain: "realtime.websocket.lifecycle", title: "Designing WebSocket connection lifecycle management", concept: C("open → authenticate → subscribe → heartbeat → close; handle disconnect with reconnect backoff") },
  { domain: "realtime.websocket.auth", title: "Implementing WebSocket authentication and session binding", concept: C("JWT in first message or handshake header; validate on connect; close with 4001 on failure") },
  { domain: "realtime.websocket.heartbeat", title: "Implementing heartbeat and timeout detection for WebSockets", concept: C("server sends ping every N seconds; client sends pong; close if no pong in timeout window") },
  { domain: "realtime.websocket.reconnect", title: "Designing client-side WebSocket reconnection strategies", concept: C("exponential backoff with jitter; max retries; re-subscribe after reconnect; replay missed messages") },
  { domain: "realtime.websocket.fanout", title: "Designing WebSocket message fan-out architectures", concept: C("pub/sub by channel; Redis pub/sub across nodes; publish to channel; deliver to all subscribers") },
  { domain: "realtime.websocket.backpressure", title: "Implementing backpressure in WebSocket message delivery", concept: C("per-connection send buffer; close slow consumers; warn before close; use message priority queue") },
  { domain: "realtime.websocket.scaling", title: "Designing horizontally scalable WebSocket server architectures", concept: C("sticky sessions or shared pub/sub; Redis or Kafka for cross-node fan-out; track connections per node") },
  { domain: "realtime.websocket.protocol", title: "Designing binary protocol framing for WebSocket messages", concept: C("msgpack or protobuf; type field first; versioned frame header; fallback to JSON in dev") },
];

/** 3. Presence & awareness (8) */
const PRESENCE: SeedSpec[] = [
  { domain: "realtime.presence.tracking", title: "Designing user presence tracking systems", concept: C("register connect with userId + roomId; TTL-based expiry; broadcast join/leave; heartbeat extends TTL") },
  { domain: "realtime.presence.cursor", title: "Implementing real-time cursor position sharing", concept: C("client sends {x, y, userId} on mousemove throttled at 50ms; server fan-outs to room; client renders others") },
  { domain: "realtime.presence.awareness", title: "Designing awareness state propagation for collaboration", concept: C("each peer broadcasts awareness record {user, cursor, selection}; others render from received state") },
  { domain: "realtime.presence.throttling", title: "Throttling presence update frequency to reduce bandwidth", concept: C("debounce at 50–100ms; coalesce rapid updates; send only on meaningful change threshold") },
  { domain: "realtime.presence.offline", title: "Detecting offline and idle users in presence systems", concept: C("no heartbeat in N seconds → idle; no heartbeat in M seconds → offline; broadcast state change") },
  { domain: "realtime.presence.list", title: "Designing efficient room participant list management", concept: C("store in Redis sorted set by lastSeen; expire idle after TTL; SMEMBERS for current list") },
  { domain: "realtime.presence.ephemeral", title: "Distinguishing ephemeral presence from persistent user data", concept: C("presence in Redis/memory only; not written to DB; reconstruct from active connections on restart") },
  { domain: "realtime.presence.scalability", title: "Scaling presence systems to large room populations", concept: C("shard rooms across nodes; aggregate presence summary not individual states for > 1000 participants") },
];

/** 4. Operational transformation (8) */
const OT: SeedSpec[] = [
  { domain: "realtime.ot.transform", title: "Implementing operational transformation for concurrent edits", concept: C("transform(op1, op2) → op1'; apply op1' after op2 already applied; preserve intent of both") },
  { domain: "realtime.ot.server_authority", title: "Designing server-authoritative OT conflict resolution", concept: C("server serializes all ops; transforms incoming op against all committed ops; broadcasts canonical order") },
  { domain: "realtime.ot.client_buffering", title: "Buffering client operations during server round-trip", concept: C("client buffer: ops sent but not acked; compose new ops on top of buffer; transform on ack") },
  { domain: "realtime.ot.revision_tracking", title: "Tracking document revisions for OT operation alignment", concept: C("each op carries revision number; server transforms op from client revision to head; apply and increment") },
  { domain: "realtime.ot.undo", title: "Implementing undo in operational transformation systems", concept: C("inverse op for each op; transform inverse against subsequent ops before applying; bounded undo stack") },
  { domain: "realtime.ot.text_ops", title: "Designing text operation types for OT implementations", concept: C("retain N, insert string, delete N; compose two op sequences; transform two concurrent sequences") },
  { domain: "realtime.ot.testing", title: "Testing operational transformation correctness with diamond property", concept: C("op A and B concurrent; T(A,B) and T(B,A) applied from opposite orders must converge to same state") },
  { domain: "realtime.ot.vs_crdt", title: "Choosing between OT and CRDT for collaborative editing", concept: C("OT: server-coordinated, simpler for rich text; CRDT: peer-to-peer, offline-first; match to sync model") },
];

/** 5. Optimistic UI reconciliation (8) */
const OPTIMISTIC_UI: SeedSpec[] = [
  { domain: "realtime.optimistic.apply", title: "Implementing optimistic UI update patterns", concept: C("apply mutation locally immediately; send to server; on success confirm; on failure rollback and notify") },
  { domain: "realtime.optimistic.rollback", title: "Designing rollback mechanisms for rejected optimistic updates", concept: C("snapshot state before mutation; restore snapshot on error; show conflict message to user") },
  { domain: "realtime.optimistic.conflict", title: "Detecting and resolving optimistic update conflicts", concept: C("version check on server; if stale: reject or merge; client: retry with latest or show conflict UI") },
  { domain: "realtime.optimistic.idempotency", title: "Making optimistic updates idempotent for safe retries", concept: C("client-generated mutation ID; server deduplicates by ID; safe to retry on network failure") },
  { domain: "realtime.optimistic.queue", title: "Queuing optimistic mutations for ordered server application", concept: C("ordered queue of pending mutations; send one at a time or in order; block on unresolved conflict") },
  { domain: "realtime.optimistic.loading_states", title: "Designing loading state UX for optimistic updates", concept: C("show optimistic result immediately; subtle indicator for pending; replace with confirmed or error state") },
  { domain: "realtime.optimistic.cache", title: "Updating client cache optimistically before server confirmation", concept: C("write to cache immediately; invalidate on error; re-fetch on conflict; cache normalized by entity ID") },
  { domain: "realtime.optimistic.partial", title: "Handling partial failure in batched optimistic updates", concept: C("server returns per-item success/failure; rollback only failed items; surface per-item error to user") },
];

/** 6. Real-time notification fan-out (8) */
const NOTIFICATIONS: SeedSpec[] = [
  { domain: "realtime.notifications.fanout", title: "Designing scalable notification fan-out architectures", concept: C("write event to message bus; fan-out worker reads and delivers per-user; deduplication by event ID") },
  { domain: "realtime.notifications.delivery", title: "Implementing at-least-once notification delivery guarantees", concept: C("persist notification; mark delivered on ack; retry undelivered on reconnect; dedup by ID on client") },
  { domain: "realtime.notifications.channels", title: "Designing multi-channel notification delivery systems", concept: C("priority order: in-app → push → email → SMS; user channel preference; fallback on failure") },
  { domain: "realtime.notifications.batching", title: "Batching high-frequency notifications to reduce spam", concept: C("coalesce events in 5s window; send summary notification; individual if critical priority") },
  { domain: "realtime.notifications.read_tracking", title: "Implementing notification read tracking at scale", concept: C("mark read event in append log; aggregate unread count per user; denormalize badge count to cache") },
  { domain: "realtime.notifications.preference", title: "Designing user notification preference and mute systems", concept: C("per-user per-channel toggle; global mute override; respect at delivery time; store in user profile") },
  { domain: "realtime.notifications.push", title: "Integrating web push notifications for real-time delivery", concept: C("VAPID keys; service worker push event; notification.show(); handle click to navigate to context") },
  { domain: "realtime.notifications.rate_limiting", title: "Rate limiting notification delivery per user and channel", concept: C("token bucket per user per channel; cap at N per hour; queue excess; drop lowest priority on overflow") },
];

/** 7. Distributed locking (8) */
const DISTRIBUTED_LOCKING: SeedSpec[] = [
  { domain: "realtime.locking.redlock", title: "Implementing distributed locks with Redlock algorithm", concept: C("acquire on N/2+1 Redis nodes; total time < lock TTL; release on all nodes; retry with backoff") },
  { domain: "realtime.locking.fencing", title: "Using fencing tokens to prevent stale lock holder actions", concept: C("lock returns monotonic token; resource checks token > last seen; reject stale token operations") },
  { domain: "realtime.locking.ttl", title: "Designing lock TTL and extension strategies", concept: C("TTL > expected operation duration; heartbeat to extend; release on completion; TTL short to fail safe") },
  { domain: "realtime.locking.reentrant", title: "Implementing reentrant lock patterns for recursive operations", concept: C("store lock owner ID; check if same owner; increment reentrant count; release when count reaches 0") },
  { domain: "realtime.locking.advisory", title: "Using advisory locks for cooperative multi-process coordination", concept: C("Postgres pg_advisory_lock; session-scoped; acquire before critical section; release on commit or explicit") },
  { domain: "realtime.locking.optimistic", title: "Replacing pessimistic locks with optimistic concurrency control", concept: C("version column; compare-and-swap on write; retry on conflict; prefer for low-contention paths") },
  { domain: "realtime.locking.leader_election", title: "Implementing leader election with distributed locks", concept: C("all nodes attempt lock; winner is leader; heartbeat to maintain; followers retry on TTL expiry") },
  { domain: "realtime.locking.deadlock", title: "Detecting and preventing distributed deadlocks", concept: C("consistent lock ordering; timeout acquisition; detect wait-for cycle; break by aborting youngest holder") },
];

export const COLLABORATIVE_REALTIME_SEED_SPECS: SeedSpec[] = [
  ...CRDT,
  ...WEBSOCKET,
  ...PRESENCE,
  ...OT,
  ...OPTIMISTIC_UI,
  ...NOTIFICATIONS,
  ...DISTRIBUTED_LOCKING,
];
